#!/usr/bin/env python3
"""
import_smriti.py — populate DGE's Smṛti / Dharmaśāstra section: mūla text where
it is currently a stub, and the classical commentaries on top of it.

STATE THIS FIXES (measured against the repo on 17 Aug 2026)

    manu_smriti          12 items, 0 commentaries   (should be ~2,685 verses)
    parashara_smriti     12 items, 0 commentaries
    yajnavalkya_smriti    3 items, 0 commentaries
    vishnu_smriti        97 items, 0 commentaries
    narada_smriti        19 items, 0 commentaries
    …every other smṛti and every dharmaśāstra nibandha: 0 items.

OUTPUT SHAPE — the existing `smriti_dharmashastra_text` schema, unchanged:

    items: [ { id: "adhyaya_01",
               reference: "Manu Smṛti, Adhyāya 1",
               shlokas: [ { number: 1,
                            sanskrit_text: "…",
                            artha: "…",                     # English translation
                            bhashya: [ { commentator, text, language, source } ]
                          } ] } ]

`shlokas[].bhashya[]` and `shlokas[].artha` are already in schemas.json, so no
schema edit is needed. The app's core.js currently DROPS them when it flattens
a nested-shlokas grantha — see patches/core-js-labels.md for the four-line fix.

USAGE
    python import_smriti.py --dge-root ../bhumandala/dge                 # everything clean-PD
    python import_smriti.py --dge-root ../bhumandala/dge --only manu_smriti
    python import_smriti.py --dge-root ../bhumandala/dge --include-encumbered
    python import_smriti.py --dge-root ../bhumandala/dge --discover-gdocs --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

from common import Fetcher, clean, load_json, save_json
from parsers import gdocs, gretil, sacredtexts
from wisdomlib import parse_page, parse_reference, split_sanskrit_block, toc_links

WISDOMLIB = "https://www.wisdomlib.org"

# wisdomlib heading key -> (commentator label, language)
WL_BHASHYA_KEYS = {
    "medhatithi":    ("Medhātithi (Manubhāṣya), tr. Ganganath Jha", "en"),
    "mitakshara":    ("Mitākṣarā of Vijñāneśvara, tr. Gharpure", "en"),
    "viramitrodaya": ("Vīramitrodaya of Mitramiśra, tr. Gharpure", "en"),
    "kulluka":       ("Kullūka", "en"),
    "notes_jha":     ("Explanatory notes — Ganganath Jha", "en"),
    "notes_comp":    ("Comparative notes", "en"),
}


class Grantha:
    """Accumulator: (chapter, verse) -> fields, assembled into items at the end."""

    def __init__(self, cfg):
        self.cfg = cfg
        self.verses = defaultdict(lambda: {"sanskrit_text": "", "artha": "", "bhashya": []})
        self.chapter_titles = {}
        self.sources = OrderedDict()
        self.layer_counts = defaultdict(int)

    def set_mula(self, ch, v, text):
        if text and not self.verses[(ch, v)]["sanskrit_text"]:
            self.verses[(ch, v)]["sanskrit_text"] = text

    def set_artha(self, ch, v, text):
        if text and not self.verses[(ch, v)]["artha"]:
            self.verses[(ch, v)]["artha"] = text

    def add_bhashya(self, ch, v, commentator, text, lang, source):
        if not text:
            return
        row = self.verses[(ch, v)]["bhashya"]
        if any(b["commentator"] == commentator for b in row):
            return
        row.append({"commentator": commentator, "text": text,
                    "language": lang, "source": source})

    def to_data(self):
        by_ch = defaultdict(list)
        for (ch, v), fields in self.verses.items():
            by_ch[ch].append((v, fields))
        items = []
        for ch in sorted(by_ch):
            shlokas = []
            for v, f in sorted(by_ch[ch]):
                s = {"number": v}
                if f["sanskrit_text"]:
                    s["sanskrit_text"] = f["sanskrit_text"]
                if f["artha"]:
                    s["artha"] = f["artha"]
                if f["bhashya"]:
                    s["bhashya"] = f["bhashya"]
                shlokas.append(s)
            label = self.chapter_titles.get(ch, "")
            items.append({
                "id": f"adhyaya_{ch:02d}",
                "reference": f"{self.cfg['title']}, Adhyāya {ch}" + (f" — {label}" if label else ""),
                "shlokas": shlokas,
            })
        return {
            "schema": self.cfg.get("schema", "smriti_dharmashastra_text"),
            "default_author": self.cfg.get("default_author", ""),
            "commentary_sources": self.sources,
            "items": items,
        }


# ---------------------------------------------------------------- layer types

def do_gretil(g: Grantha, layer, fetch: Fetcher):
    body = fetch.get(layer["url"], allow_missing=True)
    if not body:
        print(f"   !! GRETIL fetch failed: {layer['url']}", file=sys.stderr)
        return
    rows = gretil.parse(body)
    for r in rows:
        g.set_mula(r["chapter"], r["verse"], r["text"])
    g.layer_counts[layer["key"]] = len(rows)
    print(f"   gretil {layer['key']}: {len(rows)} verses")


def do_sacred_texts(g: Grantha, layer, fetch: Fetcher):
    lo, hi = layer["range"]
    n_ch = 0
    for n in range(lo, hi + 1):
        url = layer["pattern"].format(n=n)
        html = fetch.get(url, allow_missing=True)
        if not html:
            continue
        page = sacredtexts.parse_chapter(html, fallback_chapter=n_ch + 1)
        if not page["verses"]:
            continue
        n_ch += 1
        ch = page["chapter"] or n_ch
        for v in page["verses"]:
            g.set_artha(ch, v["number"], v["text"])
            g.layer_counts[layer["key"]] += 1
    print(f"   sacred-texts {layer['key']}: {n_ch} chapters, "
          f"{g.layer_counts[layer['key']]} verses")


def wisdomlib_verse_pages(book_slug, fetch: Fetcher, max_pages=0):
    """Walk a wisdomlib book: index -> section pages -> verse pages.
    Returns [(url, html)] for pages whose title parses as a verse reference."""
    index_url = f"{WISDOMLIB}/hinduism/book/{book_slug}"
    index = fetch.get(index_url, allow_missing=True)
    if not index:
        print(f"   !! wisdomlib index unreachable: {index_url}", file=sys.stderr)
        return []
    frontier = [l["url"] for l in toc_links(index)]
    seen, out = set(), []
    while frontier:
        url = frontier.pop(0)
        if url in seen:
            continue
        seen.add(url)
        html = fetch.get(url, allow_missing=True)
        if not html:
            continue
        p = parse_page(html)
        if parse_reference(p["title"]):
            out.append((url, html))
            if max_pages and len(out) >= max_pages:
                break
        else:
            # a section/discourse page — queue its children
            for l in toc_links(html):
                if l["url"] not in seen:
                    frontier.append(l["url"])
    return out


def do_wisdomlib(g: Grantha, layer, fetch: Fetcher, max_pages=0):
    pages = wisdomlib_verse_pages(layer["book"], fetch, max_pages=max_pages)
    n = 0
    for url, html in pages:
        p = parse_page(html)
        ref = parse_reference(p["title"])
        if not ref or ref[0] != "verse":
            continue
        _, ch, v = ref
        sec = p["sections"]

        _acc, plain, _iast = split_sanskrit_block(sec.get("sanskrit", ""))
        if plain:
            g.set_mula(ch, v, plain)
        # In the Jha/Medhatithi book the Sanskrit block carries the English
        # translation on its trailing line; keep it only if it is not Devanagari.
        if sec.get("translation"):
            g.set_artha(ch, v, sec["translation"])

        for key, (label, lang) in WL_BHASHYA_KEYS.items():
            if sec.get(key):
                g.add_bhashya(ch, v, label, sec[key], lang, url)
        n += 1
    g.layer_counts[layer["key"]] = n
    print(f"   wisdomlib {layer['key']}: {n} verse pages")


def discover_gdoc_ids(hub_html, keyword):
    """Match Google-Doc links on the UT hub page by link text rather than
    hard-coding ids that may be re-issued."""
    soup = BeautifulSoup(hub_html or "", "html.parser")
    out = []
    kw = keyword.replace("-", " ").lower()
    for a in soup.find_all("a", href=True):
        m = re.search(r"docs\.google\.com/document/d/([A-Za-z0-9_-]{20,})", a["href"])
        if not m:
            continue
        text = clean(a.get_text(" ", strip=True)).lower()
        ctx = clean((a.find_parent(["li", "p", "td", "div"]) or a).get_text(" ", strip=True)).lower()
        hay = (text + " " + ctx).replace("-", " ").replace("ā", "a").replace("ṛ", "r") \
            .replace("ś", "s").replace("ṣ", "s").replace("ṭ", "t").replace("ḍ", "d") \
            .replace("ñ", "n").replace("ṇ", "n").replace("ī", "i").replace("ū", "u")
        if all(tok in hay for tok in kw.split()):
            out.append({"doc_id": m.group(1), "label": text})
    return out


def do_gdoc(g: Grantha, layer, fetch: Fetcher, hub_html=None):
    ids = list((layer.get("doc_ids") or {}).values())
    if hub_html and layer.get("discover"):
        for found in discover_gdoc_ids(hub_html, layer["discover"]):
            if found["doc_id"] not in ids:
                ids.append(found["doc_id"])
    if not ids:
        print(f"   -- gdoc {layer['key']}: no doc id (run with --discover-gdocs)")
        return
    total = 0
    for doc_id in ids:
        txt = fetch.get(gdocs.export_url(doc_id), allow_missing=True)
        if not txt:
            continue
        for r in gdocs.parse(txt):
            mula, comm = gdocs.split_mula_and_commentary(r["text"])
            if layer["role"] == "mula":
                g.set_mula(r["chapter"], r["verse"], mula or r["text"])
            else:
                g.set_mula(r["chapter"], r["verse"], mula)
                g.add_bhashya(r["chapter"], r["verse"], layer["commentator"],
                              comm or r["text"], layer.get("lang", "sa"),
                              gdocs.export_url(doc_id))
            total += 1
    g.layer_counts[layer["key"]] = total
    print(f"   gdoc {layer['key']}: {total} verse blocks from {len(ids)} doc(s)")


def do_archive_djvu(g: Grantha, layer, fetch: Fetcher):
    ident = layer["identifier"]
    url = f"https://archive.org/download/{ident}/{ident}_djvu.txt"
    txt = fetch.get(url, allow_missing=True)
    if not txt:
        print(f"   !! archive.org OCR unreachable: {url}", file=sys.stderr)
        return
    g.sources[layer["key"]] = {"commentator": layer["commentator"], "url": url,
                               "licence": layer["rights"], "raw_chars": len(txt)}
    g.layer_counts[layer["key"]] = len(txt)
    print(f"   archive.org {layer['key']}: {len(txt):,} chars of OCR "
          f"(stored as a raw source; needs a per-work splitter before ingest)")


DISPATCH = {"gretil": do_gretil, "sacred_texts": do_sacred_texts,
            "wisdomlib": do_wisdomlib, "gdoc": do_gdoc, "archive_djvu": do_archive_djvu}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dge-root", required=True)
    ap.add_argument("--sources", default=str(Path(__file__).parent / "sources.json"))
    ap.add_argument("--out-dir", default="dump")
    ap.add_argument("--cache-dir", default=".httpcache")
    ap.add_argument("--only", action="append", help="slug substring filter (repeatable)")
    ap.add_argument("--include-encumbered", action="store_true")
    ap.add_argument("--discover-gdocs", action="store_true")
    ap.add_argument("--max-pages", type=int, default=0, help="cap wisdomlib pages per layer (smoke test)")
    ap.add_argument("--delay", type=float, default=1.5)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    dge = Path(args.dge_root)
    cfg = load_json(args.sources)
    fetch = Fetcher(cache_dir=args.cache_dir, delay=args.delay, offline=args.offline)
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    hub_html = None
    if args.discover_gdocs:
        hub_html = fetch.get(cfg["gdoc_hub"], allow_missing=True)

    report = []
    for gcfg in cfg["granthas"]:
        if args.only and not any(o in gcfg["slug"] for o in args.only):
            continue
        print(f"\n== {gcfg['title']}  ({gcfg['slug']})")
        g = Grantha(gcfg)
        for layer in gcfg["layers"]:
            if layer.get("rights") == "encumbered" and not args.include_encumbered:
                print(f"   -- skipping {layer['key']} (rights: encumbered) — "
                      f"{layer.get('note','')}")
                continue
            fn = DISPATCH.get(layer["type"])
            if not fn:
                print(f"   !! unknown layer type {layer['type']}", file=sys.stderr)
                continue
            g.sources.setdefault(layer["key"], {
                "commentator": layer.get("commentator", layer["key"]),
                "role": layer["role"], "language": layer.get("lang", ""),
                "url": layer.get("url") or layer.get("index") or layer.get("book", ""),
                "rights": layer["rights"], "note": layer.get("note", ""),
            })
            if layer["type"] == "gdoc":
                fn(g, layer, fetch, hub_html=hub_html)
            elif layer["type"] == "wisdomlib":
                fn(g, layer, fetch, max_pages=args.max_pages)
            else:
                fn(g, layer, fetch)

        data = g.to_data()
        n_verses = sum(len(i["shlokas"]) for i in data["items"])
        n_bhashya = sum(len(s.get("bhashya", []))
                        for i in data["items"] for s in i["shlokas"])
        report.append({"slug": gcfg["slug"], "title": gcfg["title"],
                       "chapters": len(data["items"]), "verses": n_verses,
                       "bhashya_entries": n_bhashya,
                       "layers": dict(g.layer_counts),
                       "missing": gcfg.get("missing", [])})
        print(f"   => {len(data['items'])} chapters · {n_verses} verses · "
              f"{n_bhashya} commentary entries")

        stem = gcfg["slug"].replace("/", "__")
        save_json(out / f"{stem}.json", data)
        if not args.dry_run and n_verses:
            target = dge / "data" / gcfg["slug"] / "data.json"
            if target.exists() or gcfg.get("create_if_missing"):
                save_json(target, data)
                print(f"   -> wrote {target}")
            else:
                print(f"   -- {target} does not exist and create_if_missing is false; dump only")

    save_json(out / "COUNTS_smriti.json",
              {"granthas": report, "http": fetch.stats,
               "no_etext_anywhere": cfg["no_etext_anywhere"]}, indent=2)
    print("\n" + json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
