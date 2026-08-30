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
  manifest.json                catalog: granthas, categories, unit counts, the
                                section list (manifest.sections), and per-trigram
                                GLOBAL document frequency (manifest.df)
  units/<slug>.json            per-grantha units: {u, pk, ck, s(nippet)}
  postings/<trigram>/<section>.json
                                one file per (trigram, section) pair:
                                [ [granthaIdx, unitIdx], ... ], holding only
                                that trigram's postings within that section.
                                An unscoped query fans out across every
                                section's file for a trigram in parallel; a
                                scoped query reads only its own section.
                                (trigram directory name is percent-safe --
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


def snippet(text: str, n: int = 2000) -> str:
    """Stored verbatim (Devanagari, not the pk/ck folded keys) so the CLIENT
    can locate the actual match and center a short excerpt on it at render
    time — impossible to do here, since the query hasn't been typed yet. A
    fixed-position prefix (this used to be text[:140]) only ever highlighted
    a match that happened to fall in a unit's first 140 characters; most
    units are short verses where that was true by luck, but any longer
    commentary/tika paragraph with its match further in silently showed an
    unrelated, unhighlighted prefix instead — confirmed directly: a real,
    exact match at character 758 of a 797-character unit. n=2000 is a
    generous cap against the rare pathologically long unit, not a normal
    ceiling — the overwhelming majority of units are far shorter and are
    now stored in full.
    """
    t = clean_devanagari(text)
    return t[:n]


def load_schemas(data_dir: str) -> dict:
    with open(os.path.join(data_dir, "schemas.json"), encoding="utf-8") as f:
        return json.load(f)


def primary_field(schemas: dict, schema_name: str):
    s = schemas.get(schema_name, {})
    return s.get("primaryTextField")


def _flatten_text_field(v, _depth=0):
    """Coerce a schema's primaryTextField value into one plain string.

    Normally already a string -- but dāsa-sāhitya's `dasa_pada_text` schema
    turned out to store its `text` field as {script: [[line, ...], ...]}
    instead (most padas have no "devanagari" variant at all, only
    "kannada"). Passing that dict straight to clean_devanagari() crashed
    unicodedata.normalize() on the FIRST such grantha the walk met, which
    took build()'s single pass down for every grantha still to come, not
    just this one -- silently leaving the corpus-wide search index every
    reader's search depends on built from before whatever last change
    introduced this shape, with no error visible anywhere a reader would
    see it. Flattening here instead lets has_devanagari()'s existing
    stub-skip rule decide per unit as it always has: a pure-Kannada string
    still isn't Devanagari, so it's still correctly skipped as a stub --
    this fixes the crash, not the Kannada-script indexing gap itself,
    which is a separate, larger problem (dāsa-sāhitya needs a transliteration
    pass, not just a bugfix, to become searchable in its own script).
    """
    if _depth > 4:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        for key in ("devanagari", "sa", "sanskrit"):
            flat = _flatten_text_field(v.get(key), _depth + 1)
            if flat:
                return flat
        for val in v.values():
            flat = _flatten_text_field(val, _depth + 1)
            if flat:
                return flat
        return ""
    if isinstance(v, list):
        parts = [p for p in (_flatten_text_field(e, _depth + 1) for e in v) if p]
        return "\n".join(parts)
    return ""


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
        flat = _flatten_text_field(item.get(plain))
        if flat:
            return flat
        flat = _flatten_text_field(item.get(pfield))
        if flat:
            return flat
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


_WORD_SPLIT = re.compile(r"[\s-]+")


def word_tokens(pk: str):
    """Split a unit's (or a query's) phonetic key into whole-word tokens for
    the EXACT word-level index -- a second, separate index alongside the
    trigram one, built to answer a different question. Trigram postings
    answer "which units share this 3-letter fragment", which is what makes
    fuzzy/typo-tolerant matching possible but is fundamentally imprecise at
    corpus scale: a common query's fragments (e.g. "kan"/"nta"/"tay" for
    kAntAya) are each shared by tens of thousands of units, so an exact
    query drowns in ties the trigram system alone can never fully resolve
    without either opening most of the corpus or arbitrarily capping how
    much it looks at (see SEARCH_ARCHITECTURE.md's postscript on this).
    A word index instead answers "which units contain this EXACT token",
    which is a MUCH more selective question -- a real word occurs in a
    bounded, usually small number of units, so there is no tie to break and
    no shard-open budget needed to find it.

    Splits on BOTH whitespace and hyphen: this corpus's own poetic/verse
    source formatting joins compound members with a literal "-"
    (kalyana-gunEka-Dane), which a plain whitespace split would keep as one
    token no ordinary reader would ever type as a query. This is
    deliberately NOT how phonetic_key()'s own pk field is tokenized
    elsewhere (dge-normalize.js's normalizeQuery().words splits on
    whitespace only) -- changing that would ripple into the existing
    trigram/fuzzy scoring and its parity test, which this only-additive
    index doesn't need to touch."""
    return [t for t in _WORD_SPLIT.split(pk) if t]


def word_bucket(word: str) -> str:
    """The literal on-disk directory a word's posting lives under: its own
    first two characters, made filesystem/URL-safe the same way
    safe_trigram_filename() already does for trigrams (same reasoning,
    same fallback to '_' for anything unexpected) -- keeps file COUNT
    bounded (roughly (distinct 2-char prefixes) x (sections), the same
    order of magnitude as today's trigram file count) while keeping each
    file's own byte size well short of a single huge per-section blob."""
    return _UNSAFE_TG_CHARS.sub("_", word[:2]) or "_"


_UNSAFE_TG_CHARS = re.compile(r"[^0-9A-Za-z^$]")


def safe_trigram_filename(tg: str) -> str:
    """The literal on-disk/in-git filename for one trigram's postings file.
    One file per TRIGRAM, not per 2-char prefix -- see the "one file per
    trigram" note in dge/SEARCH_ARCHITECTURE.md: filing by the first two
    characters put every "ram"/"ran"/"raj"/... trigram in one multi-MB file
    that a query for any of them had to download whole (16 MB for a राम
    search). A query now fetches exactly the trigram files it needs.

    Real trigrams are always drawn from {A-Za-z^$} (search_toolkit_pkg
    .normalize.trigrams pads with ^/$ at word boundaries) -- every one of
    those is already a safe literal filename on any filesystem/git, so they
    are used as-is, NOT percent-encoded here. The client (dge-search.js
    safeTrigram()) percent-encodes ^ and $ only when building the fetch URL,
    the same way any URL references a file whose name contains characters
    special to URLs but not to filesystems; the CDN decodes that back to
    this exact literal name. Baking a custom "%XX" escape into the filename
    ITSELF, instead, was tried first and was a real bug: a browser's fetch()
    percent-DEcodes "%XX" sequences in a URL before requesting it, so a
    filename already containing a literal "%" was requested as something
    else entirely and 404'd. Only a genuinely unexpected character (none
    should occur) falls back to '_', same spirit as the old bucket_of()."""
    return _UNSAFE_TG_CHARS.sub("_", tg) or "_"


def build(data_dir: str, out_dir: str, extra_dirs=(), commentaries=False) -> dict:
    schemas = load_schemas(data_dir)
    os.makedirs(os.path.join(out_dir, "units"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "postings"), exist_ok=True)

    granthas = []                       # manifest rows
    postings = defaultdict(lambda: defaultdict(list))  # trigram -> section -> [[gi,ui], ...]
    # word -> section -> [[gi,ui], ...] -- the EXACT index (see word_tokens()'s
    # own docstring for why this exists alongside, not instead of, postings).
    word_postings = defaultdict(lambda: defaultdict(list))
    backlinks = defaultdict(list)       # "target#unit_id" -> [{from, note}]
    stats = {"granthas": 0, "populated": 0, "units": 0, "unit_chars": 0,
             "refs": 0, "skipped_stub_units": 0, "skipped_stub_granthas": 0,
             "distinct_trigrams": 0, "distinct_words": 0}

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
        category = category_of(slug)
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
            # postings on pkey trigrams (candidate generation), partitioned
            # by section (see the "Partition the postings tree" note in
            # dge/SEARCH_ARCHITECTURE.md): an unscoped/global query fans out
            # across every section's file for a trigram in parallel, and a
            # section-scoped query reads only its own partition -- neither
            # has to download postings for sections it doesn't care about.
            for tg in trigrams(pk):
                postings[tg][category].append([gi, ui])
            # Exact word-level postings (see word_tokens()'s own docstring).
            # Deduplicated per unit first -- a word repeated within one verse
            # (rare, but real) would otherwise post the same [gi,ui] pair
            # more than once for no benefit, just a bigger file.
            for w in set(word_tokens(pk)):
                word_postings[w][category].append([gi, ui])
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

    # write one postings file per (TRIGRAM, SECTION) pair -- see
    # safe_trigram_filename() for the trigram-as-filename half, and the
    # "Partition the postings tree" comment above for the section half. Each
    # file is just the [[gi,ui],...] list for that trigram within that one
    # section; the path already identifies both, so there is no wrapping dict.
    df = {}       # trigram -> GLOBAL posting count (all sections), i.e. document frequency
    sections = set()
    for tg, by_section in postings.items():
        tg_dir = os.path.join(out_dir, "postings", safe_trigram_filename(tg))
        os.makedirs(tg_dir, exist_ok=True)
        total = 0
        for section, rows in by_section.items():
            sections.add(section)
            with open(os.path.join(tg_dir, f"{section}.json"),
                      "w", encoding="utf-8") as f:
                json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
            total += len(rows)
        df[tg] = total
    stats["distinct_trigrams"] = len(df)

    # write one file per (2-char BUCKET, SECTION) pair for the exact word
    # index -- unlike trigram postings (one file per trigram, since there
    # are few enough that a real query only ever needs its rarest 2-3), an
    # exact query looks up EVERY one of its own words directly, so the file
    # has to be found by a cheap, deterministic function of the word alone
    # (word_bucket()) rather than by picking among many small files. Each
    # file holds every word sharing that bucket+section as one dict, so a
    # query fetches exactly one file per (distinct bucket, section) its
    # words touch -- for an unscoped multi-word query, still just a handful
    # of small fetches, never a per-word full-corpus fan-out.
    word_buckets = defaultdict(lambda: defaultdict(dict))  # bucket -> section -> {word: rows}
    for w, by_section in word_postings.items():
        b = word_bucket(w)
        for section, rows in by_section.items():
            word_buckets[b][section][w] = rows
    os.makedirs(os.path.join(out_dir, "words"), exist_ok=True)
    for b, by_section in word_buckets.items():
        b_dir = os.path.join(out_dir, "words", b)
        os.makedirs(b_dir, exist_ok=True)
        for section, word_map in by_section.items():
            with open(os.path.join(b_dir, f"{section}.json"),
                      "w", encoding="utf-8") as f:
                json.dump(word_map, f, ensure_ascii=False, separators=(",", ":"))
    stats["distinct_words"] = len(word_postings)

    # df is the GLOBAL (cross-section) posting count -- still what decides
    # which trigrams are rarest and therefore worth fetching (see
    # SEARCH_ARCHITECTURE.md "What does fix it"); the section partition only
    # changes WHICH FILES answer a chosen trigram, not which trigrams get
    # chosen, so an unscoped search still needs just the df table, and a
    # scoped one already knows its one section without ranking across them.
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"granthas": granthas, "df": df,
                   "sections": sorted(sections), "stats": stats},
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
