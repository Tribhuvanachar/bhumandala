#!/usr/bin/env python3
"""Sumadhva Vijaya: pull the three commentaries from dvaitavedanta.in and
attach them to the mula verses already in dge/data/kavya_alankara.

Why this grantha needs its own importer
---------------------------------------
import_dvaitavedanta.py assumes "one leaf carries exactly one mula verse"
(_layers_from_article's docstring) and looks for the mula only in the
PREAMBLE -- everything before a page's first <h3>. Sumadhva Vijaya breaks
that assumption: one leaf is a whole sarga, 41-141 verses, each verse an
<h1> pair followed by its <h3> commentaries, cycling dozens of times down
the page. Only verse 1 could ever land in the preamble; verses 2..n sit
after the first <h3> and were swept into whichever commentary body was open
at the time. That is why the extracted tree under
darshana/.../later_acharyas/sumadhva_vijaya has six tika folders, no mula,
and 16 "items" that are really 16 walls of interleaved sarga text.

Rather than bend the general extractor's closed-vocabulary preamble rule
(the corpus's own heading-as-layer bug is what that rule exists to prevent),
this reads the same pages with a parser that follows the actual repeating
shape, and writes the commentaries onto the mula that kavya_alankara already
holds in better form -- that copy keeps the compound hyphenation
("कल्याण-गुणैक-धाम्ने") the site drops, so the site is used for the
commentaries and OUR text stays the mula of record.

Licensing: same permission and source_note as the rest of this directory --
see tools/dvaitavedanta/README.md.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from html.parser import HTMLParser

BOOK_ID = "10497"
SEED = "https://dvaitavedanta.in/category-details/10498/10497/samath/samath/parath"
CATEGORY_URL = "https://dvaitavedanta.in/category-details/{cid}/" + BOOK_ID + "/x/x/x"
LOAD_URL = "https://dvaitavedanta.in/load-data?book_id=" + BOOK_ID + "&id={uid}&search="
DEST = "dge/data/kavya_alankara/sumadhva_vijaya/sarga_{n}/data.json"

SOURCE_NOTE = ("No published licence. Used with case-by-case permission granted by "
               "the project lead on 2026-08-15 for non-commercial, educational "
               "dharma-prachara use. Every record retains its source URL.")

# The three commentaries the site actually carries for this work, in the order
# it prints them. Keyed by a stable ascii slug because that is what
# metadata.availableCommentaries and the reader's selection state use.
COMMENTARY_SLUGS = {
    "भावप्रकाशिका": "bhavaprakashika",
    "पदार्थदीपिकोद्बोधिका": "padarthadipikodbodhika",
    "मन्दोपाकारिणी": "mandopakarini",
}


def commentary_slug(heading):
    """Map an <h3>'s text onto one of the three commentaries, or None.

    The site does not always print a bare name: sarga 9 opens with
    "श्रीछलारिशेषाचार्यविरचिता मन्दोपाकारिणी" (attribution + name) and sarga 2
    closes a run with the भावप्रकाशिका colophon. Matching on containment keeps
    those runs instead of dropping them on the floor, while still refusing any
    heading that names none of the three.
    """
    text = heading or ""
    for name, slug in COMMENTARY_SLUGS.items():
        if name in text:
            return name, slug
    return None, None

DEVA_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
# The verse number the site prints at the end of a mula line: ।। १ ।। or ।।३।।
VERSE_NUM_RE = re.compile(r"।\s*।\s*([०-९\d]+)\s*।\s*।\s*$")


class Blocks(HTMLParser):
    """Flatten a fragment into ordered (tag, text) pairs for h1/h2/h3/p.

    Nesting is real here -- the site wraps <p> inside <p> -- so a start tag
    for a kept element flushes whatever was open rather than assuming
    well-formed markup.
    """

    KEEP = {"h1", "h2", "h3", "p"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[tuple[str, str]] = []
        self.stack: list[str] = []
        self.buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self.KEEP:
            self._flush()
            self.stack.append(tag)
            self.buf = []
        elif tag == "br" and self.stack:
            self.buf.append("\n")

    def handle_endtag(self, tag):
        if tag in self.KEEP and self.stack and self.stack[-1] == tag:
            self._flush()

    def handle_data(self, data):
        if self.stack:
            self.buf.append(data)

    def _flush(self):
        if not self.stack:
            return
        text = re.sub(r"[ \t\xa0]+", " ", "".join(self.buf)).strip()
        if text:
            self.out.append((self.stack[-1], text))
        self.stack.pop()
        self.buf = []


def parse_sarga(fragment):
    """{verse_number: {'mula': str, 'commentaries': {deva_name: str}}} plus the
    page's own header lines.

    <h1> is a mula line; the one carrying ।। N ।। closes verse N. <h3> opens a
    commentary on the verse that is currently open, and the <p>s after it are
    that commentary's body until the next <h3> or <h1>. A <p> sitting between
    a verse and its first <h3> is the site's attribution line for the
    commentary about to start ("श्रीनारायणपण्डिताचार्यविरचिता"), not content.
    """
    parser = Blocks()
    parser.feed(fragment)
    parser.close()

    verses: dict[int, dict] = {}
    order: list[int] = []
    preamble: list[str] = []
    pending_mula: list[str] = []
    current = None
    current_com = None

    for tag, text in parser.out:
        if tag in ("h1", "h2"):
            pending_mula.append(text)
            match = VERSE_NUM_RE.search(text)
            if match:
                number = int(match.group(1).translate(DEVA_DIGITS))
                verses[number] = {"mula": "\n".join(pending_mula), "commentaries": {}}
                order.append(number)
                pending_mula = []
                current = number
                current_com = None
        elif tag == "h3":
            current_com = text
            if current is not None:
                verses[current]["commentaries"].setdefault(current_com, [])
        elif tag == "p":
            if current is None:
                preamble.append(text)
            elif current_com is not None:
                verses[current]["commentaries"][current_com].append(text)

    for verse in verses.values():
        verse["commentaries"] = {
            name: "\n".join(body).strip()
            for name, body in verse["commentaries"].items()
            if "\n".join(body).strip()
        }
    return preamble, verses, order, pending_mula


def discover_sargas(fetch):
    """[(category_id, sarga_name)] in site order, from the seed page's sidebar."""
    import html as html_mod

    page = fetch(SEED)
    pattern = re.compile(
        r'<a href="https://dvaitavedanta\.in/category-details/(\d+)/' + BOOK_ID +
        r'/[^"]*"[^>]*class="[^"]*chapter-label[^"]*"[^>]*>\s*([^<]+?)\s*</a>', re.S)
    seen, out = set(), []
    for match in pattern.finditer(page):
        cid, name = match.group(1), html_mod.unescape(match.group(2)).strip()
        if "सर्ग" in name and cid not in seen:
            seen.add(cid)
            out.append((cid, name))
    return out


def unit_ids(page):
    """The .explanation-text unit ids a category page lists, in order."""
    return re.findall(r'<p class="explanation-text[^"]*"[^>]*id="(\d+)"', page)


def make_fetcher(cache_dir, delay):
    import requests

    os.makedirs(cache_dir, exist_ok=True)

    def fetch(url):
        key = re.sub(r"[^A-Za-z0-9]+", "_", url)[-120:] + ".cache"
        path = os.path.join(cache_dir, key)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as handle:
                return handle.read()
        response = requests.get(url, timeout=120,
                                headers={"User-Agent": "bhumandala-dge/1.0"})
        response.raise_for_status()
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(response.text)
        time.sleep(delay)
        return response.text

    return fetch


def collect(fetch, verbose=True):
    """{sarga_number: {'name', 'url', 'verses', 'order'}} for all 16 sargas."""
    sargas = discover_sargas(fetch)
    if len(sargas) != 16:
        raise SystemExit(f"expected 16 sargas in the sidebar, found {len(sargas)}")
    out = {}
    for index, (cid, name) in enumerate(sargas, start=1):
        url = CATEGORY_URL.format(cid=cid)
        page = fetch(url)
        ids = unit_ids(page)
        merged: dict[int, dict] = {}
        order: list[int] = []
        for uid in ids:
            payload = json.loads(fetch(LOAD_URL.format(uid=uid)))
            _, verses, verse_order, _ = parse_sarga(payload.get("html") or "")
            for number in verse_order:
                if number not in merged:
                    merged[number] = verses[number]
                    order.append(number)
        out[index] = {"name": name, "url": url, "verses": merged, "order": order,
                      "unit_ids": ids}
        if verbose:
            counts = {}
            for verse in merged.values():
                for com in verse["commentaries"]:
                    counts[com] = counts.get(com, 0) + 1
            print(f"  sarga {index:2d} {name:20s} {len(merged):4d} verses  "
                  + "  ".join(f"{COMMENTARY_SLUGS.get(k, k)}={v}" for k, v in counts.items()))
    return out


# Our mula and the site's are different editions: ours keeps the compound
# hyphenation, and their verse NUMBERING drifts apart in places -- in sarga 11
# the site runs two verses ahead of us from verse 38, so our 77 is their 79.
# Attaching by number alone would bind a verse's commentary to the wrong verse,
# which is the one error that must not reach a reader. So every attachment is
# checked against the verse text itself, and a near neighbour is preferred over
# a same-numbered stranger.
MATCH_WINDOW = 4
MATCH_FLOOR = 0.75
_SQUASH_RE = re.compile(r"[\s\-।॥.ऽॐ\u200c\u200d]|[०-९0-9]")


def squash(text):
    """Comparable form: no whitespace, hyphens, dandas, numbers or joiners."""
    return _SQUASH_RE.sub("", re.sub(r"<[^>]*>", "", text or ""))


def best_match(our_text, site_verses, number):
    """(site_number, ratio) for the site verse that really is this verse."""
    import difflib
    ours = squash(our_text)
    best_n, best_r = None, 0.0
    for offset in range(-MATCH_WINDOW, MATCH_WINDOW + 1):
        candidate = number + offset
        verse = site_verses.get(candidate)
        if not verse:
            continue
        ratio = difflib.SequenceMatcher(None, ours, squash(verse["mula"])).ratio()
        if ratio > best_r:
            best_n, best_r = candidate, ratio
    return best_n, best_r


def merge_into_repo(collected, apply_it, verbose=True):
    """Attach the commentaries to the kavya_alankara mula. Returns a report."""
    report = []
    for sarga_no, sarga in sorted(collected.items()):
        path = DEST.format(n=sarga_no)
        if not os.path.exists(path):
            report.append({"sarga": sarga_no, "error": "missing " + path})
            continue
        with open(path, encoding="utf-8") as handle:
            doc = json.load(handle)
        shlokas = doc.get("shlokas") or {}
        available = {}
        attached = matched = 0
        unmatched = []
        shifted = []
        for key in sorted(shlokas, key=lambda k: int(k) if str(k).isdigit() else 0):
            if not str(key).isdigit():
                continue
            number = int(key)
            site_number, ratio = best_match(shlokas[key].get("sa", ""),
                                            sarga["verses"], number)
            if site_number is None or ratio < MATCH_FLOOR:
                unmatched.append(number)
                continue
            if site_number != number:
                shifted.append((number, site_number, round(ratio, 2)))
            matched += 1
            # Rebuilt from scratch every run: appending below is for a
            # commentary the site splits across several <h3> passes over one
            # verse, and without this reset a second run would double it.
            bucket = {}
            shlokas[key]["commentaries"] = bucket
            for deva_name, text in sarga["verses"][site_number]["commentaries"].items():
                name, slug = commentary_slug(deva_name)
                if not slug:
                    continue
                # A run already present wins nothing by being overwritten with a
                # later pass over the same verse; append instead so a commentary
                # split across several <h3> passes keeps all of it.
                bucket[slug] = (bucket[slug] + "\n" + text) if bucket.get(slug) else text
                available[slug] = name
                attached += 1
        # Keep the site's own printing order rather than whatever dict order
        # the loop happened to produce.
        ordered = {COMMENTARY_SLUGS[name]: name
                   for name in COMMENTARY_SLUGS if COMMENTARY_SLUGS[name] in available}
        meta = doc.setdefault("metadata", {})
        meta["availableCommentaries"] = ordered
        meta["commentarySource"] = {
            "site": "dvaitavedanta.in", "url": sarga["url"],
            "note": SOURCE_NOTE,
        }
        report.append({"sarga": sarga_no, "shlokas": len(shlokas), "matched": matched,
                       "unmatched": unmatched, "attached": attached,
                       "shifted": shifted, "commentaries": list(ordered)})
        if apply_it:
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(doc, handle, ensure_ascii=False, indent=1)
                handle.write("\n")
        if verbose:
            row = report[-1]
            note = ""
            if row["shifted"]:
                note += f"  [{len(row['shifted'])} renumbered]"
            if row["unmatched"]:
                note += f"  [no match: {row['unmatched']}]"
            print(f"  sarga {sarga_no:2d}: {row['matched']}/{row['shlokas']} verses matched, "
                  f"{row['attached']} commentary blocks{note}")
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the data.json files")
    parser.add_argument("--cache-dir", default=".cache/sumadhva_vijaya")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="seconds between live requests (cached ones are free)")
    parser.add_argument("--staged", default="",
                        help="write the parsed commentaries here as JSON too")
    args = parser.parse_args(argv)

    fetch = make_fetcher(args.cache_dir, args.delay)
    print("fetching and parsing 16 sargas from dvaitavedanta.in")
    collected = collect(fetch)
    total = sum(len(s["verses"]) for s in collected.values())
    print(f"\n{total} verses parsed across {len(collected)} sargas")

    if args.staged:
        os.makedirs(os.path.dirname(args.staged) or ".", exist_ok=True)
        with open(args.staged, "w", encoding="utf-8") as handle:
            json.dump({str(k): v for k, v in collected.items()}, handle,
                      ensure_ascii=False, indent=1)
        print("staged ->", args.staged)

    print("\nmerging into dge/data/kavya_alankara/sumadhva_vijaya")
    report = merge_into_repo(collected, args.apply)
    bad = [r for r in report if r.get("error") or r.get("unmatched")]
    if bad:
        print("\nneeds a look:")
        for row in bad:
            print("  ", row)
    if not args.apply:
        print("\ndry run — pass --apply to write")
    return 0


if __name__ == "__main__":
    sys.exit(main())
