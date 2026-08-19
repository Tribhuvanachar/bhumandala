#!/usr/bin/env python3
"""
build_search_index.py — offline global-search index generator for DGE.

Fits the existing `veda_toolkit` pattern: a standalone Python script run locally
(or in Colab), NOT part of the live static app. It walks `dge/data/`, reads each
grantha's `data.json`, and emits a compact STATIC index the browser loads on
demand. No backend — this is what makes corpus-wide fuzzy search possible on a
GitHub Pages site.

It reuses DGE's own conventions:
  * `schemas.json :: <schema>.primaryTextField` tells us which field holds the
    main searchable text (null => text lives in a nested array, which we flatten).
  * handles BOTH data shapes: new `{schema, items:[...]}` and legacy
    `{metadata, shlokas:{n:{...}}}`.
  * prefers an unaccented `*_plain` field when present (e.g. samhita_patha_plain).
  * cross-references come from each item's `references:[{target,unit_id,note}]`;
    we invert them into a global backlinks index ("what cites this verse").

Sanskrit-aware matching: every unit's text is canonicalized to SLP1 and folded
into a phonetic key (pkey) and coarse key (ckey) by the shared normalizer
(search_toolkit_pkg/, the tested reference core). The SAME fold runs in the
browser at query time (js/dge-normalize.js), so index and query always agree.

Emitted artifacts (all under --out):
  manifest.json                catalog: granthas, categories, unit counts, per-trigram
                                document frequency (manifest.df)
  units/<slug>.json            per-grantha units: {u, pk, ck, s(nippet)}
  postings/<trigram>.json      one file per trigram: [ [granthaIdx, unitIdx], ... ]
                                (filename is the trigram, percent-encoded --
                                see safe_trigram_filename())
  backlinks.json               target#unit_id -> [ {from, note}, ... ]

Usage:  python3 build_search_index.py --data dge/data --out dge/search_index
"""
from __future__ import annotations
import argparse, json, os, re, sys, unicodedata
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from search_toolkit_pkg.translit import to_slp1
from search_toolkit_pkg.normalize import phonetic_key, coarse_key, trigrams

# Vedic accent marks + nasal sign: strip/normalize before transliteration,
# mirroring the app's own dgePrepareForScript() so keys match display text.
_VEDIC_MARKS = re.compile(r"[॒॑᳐-᳿]")
_HTML_TAG = re.compile(r"<[^>]+>")
_ZERO_WIDTH = re.compile(r"[​-‍﻿]")


_DEVANAGARI = re.compile(r"[ऀ-ॿ]")   # this corpus stores text in Devanagari


def has_devanagari(text: str) -> bool:
    """True only for real Devanagari content — excludes template stubs like
    'Sanskrit text goes here...' and non-Devanagari-script text (e.g. Kannada
    dāsa-sāhitya, which needs a Sanscript pass in the real toolkit)."""
    return bool(_DEVANAGARI.search(text or ""))


def clean_devanagari(text: str) -> str:
    if not text:
        return ""
    t = unicodedata.normalize("NFC", text)
    t = _HTML_TAG.sub(" ", t)          # legacy shlokas embed <br> etc.
    t = t.replace("ꣳ", "ं")  # ꣳ -> anusvara
    t = _VEDIC_MARKS.sub("", t)        # drop udatta/anudatta/svarita
    t = _ZERO_WIDTH.sub("", t)
    t = re.sub(r"[।॥\|]+", " ", t)     # dandas -> space
    return re.sub(r"\s+", " ", t).strip()


def snippet(text: str, n: int = 140) -> str:
    t = clean_devanagari(text)
    return t[:n]


def load_schemas(data_dir: str) -> dict:
    with open(os.path.join(data_dir, "schemas.json"), encoding="utf-8") as f:
        return json.load(f)


def primary_field(schemas: dict, schema_name: str):
    s = schemas.get(schema_name, {})
    return s.get("primaryTextField")


def extract_text(item: dict, pfield, schema_name: str, commentaries=False) -> str:
    """Return the best searchable Devanagari text for one unit.

    `commentaries` also folds in what each shloka's bhashya[] carries. Off by
    default: that is where the Sanjivini, Sayana and Medhatithi live, so it is
    the difference between finding a verse and finding what was said about it,
    and it costs index size in proportion.
    """
    # prefer an explicit unaccented *_plain variant of the primary field
    if pfield:
        plain = f"{pfield}_plain"
        if item.get(plain):
            return item[plain]
        if item.get(pfield):
            return item[pfield]
    # primaryTextField is null -> nested-array schemas; try common holders
    bhashya = []
    if commentaries:
        for e in item.get("shlokas") or []:
            if not isinstance(e, dict):
                continue
            for b in e.get("bhashya") or []:
                if isinstance(b, dict) and b.get("text"):
                    bhashya.append(b["text"])
            if e.get("artha"):
                bhashya.append(e["artha"])

    for key in ("shlokas", "verses", "lines", "text", "sanskrit_text",
                "mula_text", "samhita_patha", "sa"):
        v = item.get(key)
        if isinstance(v, str) and v.strip():
            return v
        if isinstance(v, list) and v:
            parts = []
            for e in v:
                if isinstance(e, str):
                    parts.append(e)
                elif isinstance(e, dict):
                    # sanskrit_text and sa are what DGE's own granthas use --
                    # every shloka of every itihasa, purana, kavya and stotra.
                    # Without them this returned "" for each one, so a chapter
                    # of the Ramayana indexed as an empty stub and corpus
                    # search could never have found a verse in it. The two
                    # names above stay first so nothing that works today
                    # changes.
                    parts.append(e.get("text") or e.get("sanskrit")
                                 or e.get("sanskrit_text") or e.get("sa") or "")
            if any(parts) or bhashya:
                return " ".join(parts + bhashya)
    return " ".join(bhashya)


def iter_units(data: dict, pfield, schema_name: str, commentaries=False):
    """Yield (unit_id, devanagari_text, references) for BOTH data shapes."""
    if isinstance(data.get("items"), list):                 # new shape
        for it in data["items"]:
            if not isinstance(it, dict):
                continue
            uid = str(it.get("id", ""))
            txt = extract_text(it, pfield, schema_name, commentaries)
            yield uid, txt, it.get("references") or []
    elif isinstance(data.get("shlokas"), dict):             # legacy shape
        for uid, it in data["shlokas"].items():
            if not isinstance(it, dict):
                continue
            txt = it.get("sa") or it.get("sanskrit_text") or it.get("text") or ""
            yield str(uid), txt, it.get("references") or []


def grantha_slug(data_dir: str, path: str) -> str:
    rel = os.path.relpath(os.path.dirname(path), data_dir)
    return rel.replace(os.sep, "/")


def category_of(slug: str) -> str:
    return slug.split("/", 1)[0] if slug else "unknown"


_SAFE_TG_CHARS = re.compile(r"[^0-9A-Za-z_]")


def safe_trigram_filename(tg: str) -> str:
    """Percent-encode a trigram into a filesystem/URL-safe filename (mirrors
    kosha.js's safeBucket()). One file per TRIGRAM, not per 2-char prefix --
    see the "one file per trigram" note in dge/SEARCH_ARCHITECTURE.md: filing
    by the first two characters put every "ram"/"ran"/"raj"/... trigram in one
    multi-MB file that a query for any of them had to download whole (16 MB
    for a राम search, 40 MB for a rarer word with a common prefix). A query
    now fetches exactly the trigram files it needs."""
    return _SAFE_TG_CHARS.sub(lambda m: "%%%02x" % ord(m.group(0)), tg) or "_"


def build(data_dir: str, out_dir: str, extra_dirs=(), commentaries=False) -> dict:
    schemas = load_schemas(data_dir)
    os.makedirs(os.path.join(out_dir, "units"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "postings"), exist_ok=True)

    granthas = []                       # manifest rows
    postings = defaultdict(list)        # trigram -> [[gi,ui], ...]
    backlinks = defaultdict(list)       # "target#unit_id" -> [{from, note}]
    stats = {"granthas": 0, "populated": 0, "units": 0, "unit_chars": 0,
             "refs": 0, "skipped_stub_units": 0, "skipped_stub_granthas": 0,
             "distinct_trigrams": 0}

    # (root, path) pairs: the slug is relative to the root the file came from,
    # so a corpus indexed from elsewhere still slugs as though it sat in
    # dge/data. That is what lets the Kavya corpus be searchable while its 50 MB
    # stays on the kavya-dist branch: pass the checkout with --extra-data, and
    # core.js resolves a kavya_alankara/ grantha to the CDN when the hit is
    # opened.
    data_files = []
    for base in [data_dir, *extra_dirs]:
        found = []
        for root, _dirs, files in os.walk(base):
            if "data.json" in files:
                found.append((base, os.path.join(root, "data.json")))
        found.sort()
        if base is not data_dir:
            print(f"  + {len(found)} granthas from {base}")
        data_files.extend(found)

    for base, path in data_files:
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"  ! skip {path}: {e}", file=sys.stderr)
            continue
        slug = grantha_slug(base, path)
        schema_name = data.get("schema") or (
            "stotra_text" if "shlokas" in data else "generic")
        pfield = primary_field(schemas, schema_name)

        units = list(iter_units(data, pfield, schema_name, commentaries))
        if not units:
            continue
        gi = len(granthas)
        title = (data.get("metadata", {}) or {}).get("title") or slug.split("/")[-1]
        unit_rows = []
        for uid, dev_text, refs in units:
            clean = clean_devanagari(dev_text)
            # skip template stubs / non-Devanagari placeholder text
            if not has_devanagari(clean):
                stats["skipped_stub_units"] += 1
                continue
            slp1 = to_slp1(clean, "devanagari")
            # cap indexed key length: enough to locate a passage, and it stops a
            # few very large merged/prose blocks from bloating the static index.
            MAX_KEY = 2500
            pk = phonetic_key(slp1)[:MAX_KEY]
            ck = coarse_key(slp1)[:MAX_KEY]
            ui = len(unit_rows)
            unit_rows.append({"u": uid, "pk": pk, "ck": ck, "s": snippet(dev_text)})
            stats["unit_chars"] += len(pk)
            # global postings on pkey trigrams (candidate generation)
            for tg in trigrams(pk):
                postings[tg].append([gi, ui])
            # cross-references -> backlinks
            for r in refs:
                if isinstance(r, dict) and r.get("target"):
                    key = f"{r['target']}#{r.get('unit_id','')}"
                    backlinks[key].append(
                        {"from": f"{slug}#{uid}", "note": r.get("note", ""),
                         "type": r.get("type", "reference")})
                    stats["refs"] += 1

        # a grantha with no real Devanagari units is an empty taxonomy stub — skip it
        if not unit_rows:
            stats["skipped_stub_granthas"] += 1
            continue

        # write per-grantha unit shard
        shard_name = slug.replace("/", "__") + ".json"
        with open(os.path.join(out_dir, "units", shard_name),
                  "w", encoding="utf-8") as f:
            json.dump(unit_rows, f, ensure_ascii=False, separators=(",", ":"))

        granthas.append({
            "gi": gi, "slug": slug, "title": title, "schema": schema_name,
            "category": category_of(slug), "units": len(unit_rows),
            "populated": True, "shard": f"units/{shard_name}",
        })
        stats["granthas"] += 1
        stats["units"] += len(unit_rows)
        stats["populated"] += 1

    # write one postings file PER TRIGRAM (not per 2-char bucket) -- see
    # safe_trigram_filename(). Each file is just the [[gi,ui],...] list; the
    # filename already identifies the trigram, so there is no wrapping dict.
    df = {}   # trigram -> posting count, i.e. document frequency
    for tg, rows in postings.items():
        fname = safe_trigram_filename(tg)
        with open(os.path.join(out_dir, "postings", f"{fname}.json"),
                  "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        df[tg] = len(rows)
    stats["distinct_trigrams"] = len(df)

    # df lets the client pick the RAREST trigrams of a query instead of
    # fetching all of them -- a common trigram like the "na" class matches
    # half the corpus and is expensive to fetch for what it discriminates;
    # a rare one narrows the candidate set just as correctly for a fraction
    # of the bytes. See SEARCH_ARCHITECTURE.md "What does fix it".
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"granthas": granthas, "df": df, "stats": stats},
                   f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out_dir, "backlinks.json"), "w", encoding="utf-8") as f:
        json.dump(backlinks, f, ensure_ascii=False, separators=(",", ":"))

    return stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="bhumandala/dge/data")
    ap.add_argument("--out", default="search_index_out")
    ap.add_argument("--commentaries", action="store_true",
                    help="also index each shloka's bhashya[] and artha -- the "
                         "commentaries themselves, at a size cost")
    ap.add_argument("--extra-data", action="append", default=[],
                    metavar="DIR",
                    help="another data root to index, slugged relative to "
                         "itself (e.g. a kavya-dist checkout)")
    args = ap.parse_args()
    stats = build(args.data, args.out, args.extra_data, args.commentaries)
    print("Index built. Stats:")
    for k, v in stats.items():
        print(f"  {k:18} {v}")


if __name__ == "__main__":
    main()
