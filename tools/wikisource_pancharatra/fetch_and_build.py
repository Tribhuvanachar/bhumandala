#!/usr/bin/env python3
"""
fetch_and_build.py -- fetches every chapter subpage of a Sanskrit Wikisource
Pancharatra Samhita via the MediaWiki API, parses the wikitext, and writes
a data.json matching the existing pancharatra_samhitas on-disk shape
(schema: generic, items: [{id, reference, shlokas: [{number, sanskrit_text}]}]).

Parsing quirks this handles, found and fixed by testing against real pages
before trusting it at scale (see dge/PENDING.md, 23 Aug entry):
- Critical-apparatus footnote blocks, bounded by dash-lines, removed via a
  line-based state machine (a monolithic regex mis-paired dash-lines on
  real data and silently ate 62 real verses in testing -- caught by
  counting verse-ref markers before/after, not assumed correct).
- Inline footnote-marker digits (e.g. "13parapara..."), stripped after
  protecting the "|| N.M ||"-style verse-ref markers with a NON-numeric
  placeholder (a numeric placeholder had its own digits eaten by the same
  strip step it was meant to survive -- also caught by testing, not assumed).
- Editorial subheading lines (tab-indented, no danda punctuation at all)
  removed -- but ONLY lines with no danda, since indented VERSE lines
  (padas continuing a speaker's dialogue) are also tab-indented in this
  source and must not be dropped; caught because an early version used
  "no || anywhere on this line" as the test, which wrongly ate a verse's
  first pada whenever its own closing || fell on the next line instead.
- Chapter-title line(s) at the front extracted via a no-danda/no-trailing-
  dash heuristic (title lines are the only front-matter lines with neither),
  rather than a fixed line count -- chapter 1 has 2 title lines, chapter 2
  has 1, so a fixed count silently swallowed chapter 2's own subheading
  into a phantom "chapter_title" on first attempt.
- The generic "shuklambaradharam..." Ganesha-dhyana verse, a printer's-
  convention invocation with no verse-ref marker of its own, stripped by
  EXACT text match (not a heuristic) so it can't accidentally eat real
  content in a chapter that happens to lack it.
"""
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from skrutable.transliteration import Transliterator

_translit = Transliterator(from_scheme="IAST", to_scheme="DEV")

API = "https://sa.wikisource.org/w/api.php"
UA = "bhumandala-sanskrit-library/1.0 (research/import; nonprofit Sanskrit digital library)"

# Two verse-ref conventions found in the SAME work (Ahirbudhnyasamhita
# switches conventions repeatedly, apparently different Wikisource
# contributors transcribing different chapter ranges of the same work, each
# with their own habits: Devanagari danda + period ("।। 1.1 ।।") for most
# chapters, ASCII pipe + hyphen ("|| 43-1 ||") from chapter 43 on, and a
# THIRD variant found checking why chapter 45 also produced zero verses --
# danda and pipe used interchangeably within the SAME closing pair
# ("।| ४५-१।|", not a consistent "।।" or "||"). Rather than keep
# special-casing new pairings as they turn up, danda and pipe are treated
# as interchangeable: any 2 characters drawn from {।, |} bracket the
# ref, in any combination.
REF_RX = re.compile(r"[।|]{2}\s*([\d०-९]+)[.\-]([\d०-९]+)\s*[।|]{2}")
# The parishishtam appendix numbers verses with a single sequential number
# instead of a chapter.verse pair -- see parse_chapter's is_appendix path.
APPENDIX_REF_RX = re.compile(r"[।|]{2}\s*([\d०-९]+)\s*[।|]{2}")
DEVA_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
DASH_LINE = re.compile(r"[-_]{3,}[ \t]*$")
PAGE_MARKER_RX = re.compile(r"प[्ृु]?\.\s*[\d०-९]*\)")
SENTINEL = "@@DGEREFMARKER@@"
MANGALA_TEXT = "शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम्।\nप्रसन्नवदनं ध्यायेत् सर्वविघ्रोपशान्तये।।"


def to_int(s):
    return int(s.translate(DEVA_DIGITS))


class RateLimited(Exception):
    """Raised when the API stays 429 past every retry -- deliberately NOT
    the same outcome as PageMissing. An earlier version of this script
    returned None for both a real 429-after-retries failure and a
    genuinely-missing page, so the caller's "no parseable content" SKIP
    silently covered both -- 23 real chapters were marked skipped during
    a sustained rate-limit window and would have been imported as if the
    text just ended at chapter 37, caught only because 23 consecutive
    skips in a row was implausible enough to go check by hand. A
    real fetch failure now stops the run instead of being swallowed."""


def wikitext(page_title, retries=8):
    url = API + "?" + urllib.parse.urlencode({
        "action": "parse", "page": page_title, "prop": "wikitext", "format": "json",
    })
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = min(8 * (2 ** attempt), 120)
                print(f"    429, retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            if e.code == 429:
                raise RateLimited(f"{page_title!r} still 429 after {retries} attempts")
            raise
        if "error" in data:
            return None  # a real "page does not exist" from the API itself
        return data["parse"]["wikitext"]["*"]
    raise RateLimited(f"{page_title!r}: exhausted retries")


def subpage_list(index_title):
    """Parse the index page's wikitext for [[Title/Subpage|label]] links,
    in document order (this is the chapter ordering, not alphabetical)."""
    wt = wikitext(index_title)
    if wt is None:
        raise RuntimeError(f"could not fetch index page {index_title!r}")
    links = re.findall(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", wt)
    seen = set()
    out = []
    for link in links:
        link = link.strip()
        if link.startswith(index_title + "/") and link not in seen:
            seen.add(link)
            out.append(link)
    return out


def parse_chapter(page_title, is_first_chapter=False, is_appendix=False):
    wt = wikitext(page_title)
    if wt is None:
        return None, []
    # Chapter 59's own page is missing its closing "</poem>" tag entirely
    # (checked directly against the raw wikitext, not assumed) -- the whole
    # chapter sits between the first "<poem>" and a second, empty, stray
    # "<poem>" tag right at the end of the page instead. A plain
    # "<poem>(.*?)</poem>" match returns nothing for a page shaped like
    # this. Handled generally: the verse content ends at whichever comes
    # first, an actual "</poem>", another "<poem>", or the end of the page.
    open_m = re.search(r"<poem>", wt)
    if not open_m:
        return None, []
    start = open_m.end()
    close_m = re.search(r"</poem>", wt[start:])
    next_open_m = re.search(r"<poem>", wt[start:])
    if close_m and (not next_open_m or close_m.start() < next_open_m.start()):
        end = start + close_m.start()
    elif next_open_m:
        end = start + next_open_m.start()
    else:
        end = len(wt)
    poem = wt[start:end]

    # Normalize the precomposed double-danda character (U+0965 "॥") to two
    # single-dandas (U+0964 "।।") up front -- some chapters' transcribers
    # typed the single Unicode codepoint, others typed the single danda
    # twice, both rendering identically but only the latter matched every
    # downstream danda-counting rule until this was found (chapter 50 came
    # back with real content but zero verses -- checked directly rather
    # than assumed to be yet another punctuation-pairing variant).
    poem = poem.replace("॥", "।।")

    if is_first_chapter:
        poem = poem.replace(MANGALA_TEXT, "")

    # 0. Strip print-edition page-number markers ("प्. ४१४)" = "p. 414)"),
    # present only in the later, ASCII-pipe-convention chapters.
    poem = PAGE_MARKER_RX.sub("", poem)

    # 1. Strip footnote apparatus blocks (line-based state machine). Most
    # chapters delimit these with a dash-line ("---------"); chapter 59
    # instead uses an underscore-line ("__________________") -- checked
    # directly against its raw wikitext, not assumed -- so both characters
    # are accepted as the same paired open/close delimiter.
    lines = poem.split("\n")
    out_lines = []
    in_footnote = False
    for line in lines:
        if DASH_LINE.fullmatch(line.strip("\n")):
            in_footnote = not in_footnote
            continue
        if not in_footnote:
            out_lines.append(line)
    poem = "\n".join(out_lines)

    # 2. Strip editorial subheadings. The two conventions in this work
    # format them differently -- tab-indented in chapters 1-42 (not always
    # isolated by blank lines on both sides, so an isolation-only check
    # regressed and let subheading text leak into verse 2.61's body when
    # tried), plain isolated paragraphs with no indentation from chapter 43
    # on. Kept as two separate rules, either one sufficient, rather than
    # one replacing the other.
    lines = poem.split("\n")
    kept = []
    for i, line in enumerate(lines):
        s = line.strip("\t ")
        has_punct = ("।" in line) or ("|" in line)
        if not s or has_punct:
            kept.append(line)
            continue
        tab_indented_subheading = line.startswith("\t")
        prev_blank = (i == 0) or not lines[i - 1].strip()
        next_blank = (i == len(lines) - 1) or not lines[i + 1].strip()
        isolated_subheading = prev_blank and next_blank
        if tab_indented_subheading or isolated_subheading:
            continue
        kept.append(line)
    poem = "\n".join(kept)

    # 3. Extract front-matter title line(s): no danda/pipe, no trailing dashes.
    lines = poem.split("\n")
    title_parts, rest_lines, in_title_zone = [], [], True
    for line in lines:
        s = line.strip()
        if in_title_zone and not s:
            if title_parts:
                in_title_zone = False
            continue
        no_punct = "।" not in s and "|" not in s
        if in_title_zone and s and no_punct and not re.search(r"-{2,}\s*$", s):
            title_parts.append(s)
            continue
        in_title_zone = False
        rest_lines.append(line)
    chapter_title = " ".join(title_parts)
    poem = "\n".join(rest_lines)

    # The parishishtam (appendix) page -- a sudarshana-sahasranama-stotra,
    # confirmed by reading its own raw wikitext -- numbers its verses with a
    # single sequential number ("।। ११९ ।।"), not the chapter.verse pairs
    # every regular adhyaya uses ("।। ५९-१ ।।"). It isn't itself part of any
    # numbered adhyaya, so it gets its own ref pattern and its own
    # (string-keyed) unit shape rather than being forced into REF_RX.
    ref_rx = APPENDIX_REF_RX if is_appendix else REF_RX

    # 4. Protect verse-ref markers, strip remaining bare digits (footnote
    # markers), restore in document order.
    refs = []
    def protect(mm):
        refs.append(mm.group(0))
        return SENTINEL
    poem = re.sub(ref_rx, protect, poem)
    poem = re.sub(r"\d+", "", poem)
    for r in refs:
        poem = poem.replace(SENTINEL, r, 1)

    # 5. Split into (chapter, verse, body) units.
    units = []
    prev_end = 0
    appendix_series = 1
    appendix_last_vs = 0
    for mm in ref_rx.finditer(poem):
        body = poem[prev_end:mm.start()]
        prev_end = mm.end()
        body = re.sub(r"\d+", "", body)
        body = re.sub(r"\s+", " ", body).strip(" \n\t।|")
        if body:
            if is_appendix:
                # The parishishtam turns out to hold two independently-
                # numbered sub-poems back to back on the same page (checked
                # directly: a 21-verse dhyana/nyasa preamble, then the
                # sahasranama proper, whose own numbering restarts at 1) --
                # a numbering *decrease* marks that boundary, so each
                # restart starts a fresh sub-item rather than colliding
                # verse numbers into one.
                vs = to_int(mm.group(1))
                if vs <= appendix_last_vs:
                    appendix_series += 1
                appendix_last_vs = vs
                units.append((("parishishtam", appendix_series), vs, body))
            else:
                ch, vs = to_int(mm.group(1)), to_int(mm.group(2))
                units.append((ch, vs, body))
    return chapter_title, units


def build(work_title_devanagari, index_page_devanagari, out_rel_path, source_url,
          repo_root, note_extra="", request_delay=2.0):
    """Resumable: progress is cached in a sidecar `.progress.json` next to
    the output file (per source page, not per chapter, since one page can
    be re-fetched idempotently). A RateLimited failure mid-run saves what's
    done and stops cleanly -- re-running the same command later picks up
    only the remaining pages rather than re-fetching everything, and never
    silently ships a partial text as if it were the whole one (the run
    only writes the final data.json once every page has been fetched)."""
    import os

    out_path = repo_root + "/" + out_rel_path
    cache_path = out_path + ".progress.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            cache = json.load(f)
        print(f"resuming from cache: {len(cache)} pages already fetched")

    print(f"fetching index: {index_page_devanagari}")
    pages = subpage_list(index_page_devanagari)
    print(f"  {len(pages)} subpages found")

    try:
        for i, page in enumerate(pages):
            if page in cache:
                continue
            is_first = (i == 0)
            is_appendix = page.endswith("परिशिष्टम्")
            title, units = parse_chapter(page, is_first_chapter=is_first, is_appendix=is_appendix)
            cache[page] = {"title": title, "units": units}
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False)
            if not units:
                print(f"  SKIP {page}: page exists but carries no parseable verse content")
            else:
                print(f"  {page}: {len(units)} verses")
            time.sleep(request_delay)
    except RateLimited as e:
        done = sum(1 for p in pages if p in cache)
        print(f"\nRATE LIMITED after {done}/{len(pages)} pages: {e}")
        print(f"Progress saved to {cache_path} -- re-run this command later to resume.")
        return None, None

    missing = [p for p in pages if p not in cache]
    if missing:
        print(f"\nWARNING: {len(missing)} pages never fetched (not rate-limited, "
              f"just not yet attempted): {missing}")
        return None, None

    all_units = []
    chapter_titles = {}
    for page in pages:
        title, units = cache[page]["title"], cache[page]["units"]
        if not units:
            continue
        chapters_seen = sorted(set(u[0] for u in units))
        for c in chapters_seen:
            if c not in chapter_titles and title:
                chapter_titles[c] = title
        all_units.extend(units)

    # An appendix chapter key is ("parishishtam", series) -- a tuple, not a
    # bare int adhyaya number. If this run resumed from an on-disk
    # `.progress.json` cache, that tuple round-tripped through JSON as a
    # 2-element list, so it's normalized back to a tuple here too (fresh
    # runs already have real tuples; this is a no-op for those).
    def is_appendix_key(ch):
        return isinstance(ch, (list, tuple)) and len(ch) == 2 and ch[0] == "parishishtam"

    by_chapter = {}
    for ch, vs, body in all_units:
        if is_appendix_key(ch):
            ch = ("parishishtam", ch[1])
        by_chapter.setdefault(ch, []).append((vs, body))

    # Regular adhyayas sort numerically and come first; the appendix (a
    # tuple key, not an adhyaya number) always sorts last, in series order,
    # whatever its magnitude would otherwise suggest.
    def chapter_sort_key(ch):
        return (1, ch[1]) if is_appendix_key(ch) else (0, ch)

    items = []
    for ch in sorted(by_chapter, key=chapter_sort_key):
        shlokas = []
        for vs, iast_or_deva in sorted(by_chapter[ch]):
            # Wikisource content here is ALREADY Devanagari (unlike GRETIL's
            # IAST) -- no transliteration needed.
            shlokas.append({"number": vs, "sanskrit_text": iast_or_deva})
        if is_appendix_key(ch):
            default_ref = "Parishishtam (Appendix)" if ch[1] == 1 else f"Parishishtam (Appendix), Part {ch[1]}"
            ref = chapter_titles.get(ch, default_ref)
        else:
            ref = chapter_titles.get(ch, f"Adhyaya {ch}")
        items.append({
            "id": ("parishishtam" if ch[1] == 1 else "parishishtam%d" % ch[1]) if is_appendix_key(ch) else "adhyaya%02d" % ch,
            "reference": f"{work_title_devanagari}, {ref}",
            "shlokas": shlokas,
        })

    total_verses = sum(len(it["shlokas"]) for it in items)
    out = {
        "schema": "generic",
        "default_author": "Traditionally revealed (Pancharatra Agama)",
        "source": f"Sanskrit Wikisource, {source_url}",
        "licence": "CC BY-SA 4.0",
        "note": (f"{len(items)} adhyayas, {total_verses} shlokas total, transcribed "
                 f"by Sanskrit Wikisource contributors."
                 + (" " + note_extra if note_extra else "")),
        "items": items,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.remove(cache_path)
    print(f"WROTE {out_rel_path}: {len(items)} adhyayas, {total_verses} verses")
    return items, total_verses


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("work_title")
    ap.add_argument("index_page")
    ap.add_argument("out_rel_path")
    ap.add_argument("source_url")
    ap.add_argument("--repo-root", default="/home/user/bhumandala")
    ap.add_argument("--note-extra", default="")
    args = ap.parse_args()
    build(args.work_title, args.index_page, args.out_rel_path, args.source_url,
          args.repo_root, args.note_extra)
