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

REF_RX = re.compile(r"।।\s*([\d०-९]+)\.([\d०-९]+)\s*।।")
DEVA_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
DASH_LINE = re.compile(r"-{3,}[ \t]*$")
SENTINEL = "@@DGEREFMARKER@@"
MANGALA_TEXT = "शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम्।\nप्रसन्नवदनं ध्यायेत् सर्वविघ्रोपशान्तये।।"


def to_int(s):
    return int(s.translate(DEVA_DIGITS))


def wikitext(page_title, retries=6):
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
                wait = min(5 * (2 ** attempt), 60)
                print(f"    429, retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        if "error" in data:
            return None
        return data["parse"]["wikitext"]["*"]
    return None


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


def parse_chapter(page_title, is_first_chapter=False):
    wt = wikitext(page_title)
    if wt is None:
        return None, []
    m = re.search(r"<poem>(.*?)</poem>", wt, re.S)
    if not m:
        return None, []
    poem = m.group(1)

    if is_first_chapter:
        poem = poem.replace(MANGALA_TEXT, "")

    # 1. Strip footnote apparatus blocks (line-based state machine).
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

    # 2. Strip editorial subheadings: tab-indented, no danda anywhere.
    lines = poem.split("\n")
    kept = []
    for line in lines:
        s = line.strip("\t ")
        if line.startswith("\t") and "।" not in line and s:
            continue
        kept.append(line)
    poem = "\n".join(kept)

    # 3. Extract front-matter title line(s): no danda, no trailing dashes.
    lines = poem.split("\n")
    title_parts, rest_lines, in_title_zone = [], [], True
    for line in lines:
        s = line.strip()
        if in_title_zone and not s:
            if title_parts:
                in_title_zone = False
            continue
        if in_title_zone and s and "।" not in s and not re.search(r"-{2,}\s*$", s):
            title_parts.append(s)
            continue
        in_title_zone = False
        rest_lines.append(line)
    chapter_title = " ".join(title_parts)
    poem = "\n".join(rest_lines)

    # 4. Protect verse-ref markers, strip remaining bare digits (footnote
    # markers), restore in document order.
    refs = []
    def protect(mm):
        refs.append(mm.group(0))
        return SENTINEL
    poem = re.sub(REF_RX, protect, poem)
    poem = re.sub(r"\d+", "", poem)
    for r in refs:
        poem = poem.replace(SENTINEL, r, 1)

    # 5. Split into (chapter, verse, body) units.
    units = []
    prev_end = 0
    for mm in REF_RX.finditer(poem):
        body = poem[prev_end:mm.start()]
        prev_end = mm.end()
        ch, vs = to_int(mm.group(1)), to_int(mm.group(2))
        body = re.sub(r"\d+", "", body)
        body = re.sub(r"\s+", " ", body).strip(" \n\t।")
        if body:
            units.append((ch, vs, body))
    return chapter_title, units


def build(work_title_devanagari, index_page_devanagari, out_rel_path, source_url,
          repo_root, note_extra=""):
    print(f"fetching index: {index_page_devanagari}")
    pages = subpage_list(index_page_devanagari)
    print(f"  {len(pages)} subpages found")

    all_units = []
    chapter_titles = {}
    for i, page in enumerate(pages):
        m = re.search(r"[\d०-९]+\s*$", page)
        is_first = (i == 0)
        title, units = parse_chapter(page, is_first_chapter=is_first)
        if not units:
            print(f"  SKIP {page}: no parseable verse content")
            continue
        chapters_seen = sorted(set(u[0] for u in units))
        for c in chapters_seen:
            if c not in chapter_titles and title:
                chapter_titles[c] = title
        all_units.extend(units)
        print(f"  {page}: {len(units)} verses")
        time.sleep(1.0)

    by_chapter = {}
    for ch, vs, body in all_units:
        by_chapter.setdefault(ch, []).append((vs, body))

    items = []
    for ch in sorted(by_chapter):
        shlokas = []
        for vs, iast_or_deva in sorted(by_chapter[ch]):
            # Wikisource content here is ALREADY Devanagari (unlike GRETIL's
            # IAST) -- no transliteration needed.
            shlokas.append({"number": vs, "sanskrit_text": iast_or_deva})
        ref = chapter_titles.get(ch, f"Adhyaya {ch}")
        items.append({
            "id": "adhyaya%02d" % ch,
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
    out_path = repo_root + "/" + out_rel_path
    import os
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
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
