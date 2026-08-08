# DGE Kosha — Technical Report

*Multilingual dictionary (kosha) section for the Digital Grantha Engine.*
Prepared for the `bhumandala` / `dge/` project. Everything below is a record of
what was built, how, from where, and how it plugs in.

---

## 1. Goal

Add a genuinely multilingual Kosha (dictionary) section to DGE that supports
cross-language lookup: type a Sanskrit word in any script and see its meanings
from many dictionaries at once — Kannada, English, and Sanskrit-to-Sanskrit
koshas together — with a translate affordance to bridge a gloss written in a
language you don't read into your own (Kannada) or English. The section had to
fit DGE's constraints: a **static GitHub Pages site, no backend, no build step**,
content in Devanagari, transliterated on the fly by Sanscript.

---

## 2. What was done (in order)

1. **Studied the live repo.** Cloned `github.com/Tribhuvanachar/bhumandala` and
   read `dge/PROJECT_STATUS.md`, `dge/data/schemas.json`, `dge/data/taxonomy.json`,
   the transliteration layer (`js/transliteration.js`), the script-load order in
   `index.html`, and the existing BYOK-Gemini tool in `dge/convert/` to match
   conventions.
2. **Found the sources.** Identified the `indic-dict` ecosystem on GitHub as the
   home of the dictionaries (your uploaded `.ifo` fingerprinted it), and
   confirmed the Cologne dictionaries are the licence-cleared set.
3. **Wrote and proved a parser** on your actual `shabdArtha_kaustubha` and on
   Apte, straight from the repo's `.babylon` sources — no upload needed.
4. **Generalised the parser** to also read compiled StarDict binaries
   (`.ifo/.idx/.dict.dz/.syn`) for your local `dict.zip`; round-trip tested it.
5. **Designed the data model** (`kosha_entry`) and a **two-tier sharded layout**
   after discovering a single per-dictionary file is ~70 MB (unusable on mobile).
6. **Generated the full dataset** for 10 dictionaries and built the
   cross-language index; verified the pivot works (e.g. गज returns Kannada +
   English + three Sanskrit koshas at once).
7. **Built the lookup UI** (`kosha.js`), self-injecting and additive, plus a
   one-line `index.html` include.
8. **Validated end-to-end in a real browser** (headless Chromium): searched a
   word, expanded it, confirmed multi-language cards + translate buttons render.
9. **Wrote the Colab importer**, the licence report, and integration docs.

Nothing was ever pushed to GitHub from my side; all outputs were handed over as
files. You have now uploaded them yourself.

---

## 3. Resources used

- **Dictionary data:** `github.com/indic-dict/stardict-sanskrit` (cloned,
  sparse-checkout of the folders needed). Its dictionaries originate from the
  **Cologne Digital Sanskrit Dictionaries** (`sanskrit-lexicon.uni-koeln.de`,
  CC-BY-SA 4.0) and community contributions.
- **Transliteration:** `@indic-transliteration/sanscript` — already loaded by
  DGE; the importer re-implements Devanagari→SLP1 in pure Python so it needs no
  dependencies.
- **Tooling (my cloud scratch box only):** `git`, Python 3 standard library
  (`re, json, struct, gzip, zipfile, collections`), and headless Chromium via
  Playwright for the UI test.
- **No paid services.** No API was called during the build. The only optional
  paid element is the *runtime* translate button, which uses **your own** Gemini
  key (BYOK) and only when you click it.

---

## 4. Scripts that were run

| Script | Purpose |
|---|---|
| `DGE_Kosha_00_recon.ipynb` | (Delivered) lists a `dict.zip` and extracts a tiny sample without unpacking 2.3 GB. |
| `dge_kosha_parse.py` | First proof: parse `.babylon` → `kosha_entry`; validated fidelity + homonym splitting. |
| `dge_kosha_import.py` | The real library: parses both input kinds, builds items, writes the two-tier tree. |
| `DGE_Kosha_import.ipynb` | (Delivered) Colab wrapper: clones the repo, auto-discovers local `.ifo`, runs the import, zips output. |
| *reshard experiments* | Internal iterations to tune shard sizes (single-char → 2-char → two-tier). |
| `roundtrip.py` | Synthesised a StarDict set and read it back to validate the binary reader + `.syn`. |
| `pw.py` (Playwright) | Loaded `kosha.js` on the sample in headless Chromium; asserted hits/cards/languages; screenshot. |
| `pack_sample.py` | Cut the 11.5 MB loadable sample slice. |

---

## 5. Where everything lives

- **Your side (the only place data persists):** the `data/koshas/**` tree, plus
  `js/kosha.js` and the `index.html` line — now in your repo because you uploaded
  them.
- **My cloud scratch box (ephemeral, discarded when the session ends):** the
  clones, the full 436 MB generated dataset, and all scripts. Nothing here is
  permanent and nothing here is your repo.
- **GitHub:** unchanged by me. Every commit is yours.

---

## 6. Structural hierarchy

```
dge/
├── index.html                      # + one line:  <script src="js/kosha.js?v=1.0"></script>
├── js/
│   └── kosha.js                    # the entire Kosha UI (self-injecting, additive)
└── data/
    └── koshas/
        ├── _index/
        │   ├── manifest.json        # buckets + dictionary registry (name, langs, licence, counts)
        │   └── <2-char>.json        # headword lookup shards: { fold: [ {d,h,s,hl,l} ] }   (571 files)
        ├── sanskrit_english/
        │   ├── mw-cologne/
        │   │   ├── meta.json         # source_meta + list of entry buckets
        │   │   └── e/<3-char>.json   # full entries: { fold: [ item ] }
        │   ├── apte-1957/ …
        │   ├── benfey/ …  macdonell/ …
        ├── sanskrit_kannada/
        │   └── shabdArtha_kaustubha/ …
        ├── sanskrit_sanskrit/
        │   ├── amarakosha/ …  shabdakalpadruma/ …  vachaspatyam/ …  abhidhanachintamani/ …
        ├── reverse/
        │   └── mw-english-sanskrit/ …
        └── _taxonomy_koshas.json     # optional: the folder list, if you wire koshas into the library browser
```

**Why two tiers.** A search only needs headwords, so the `_index` shards are
tiny (median ~7 KB) and one is loaded as you type. The full entry text
(etymology, citations, notes) lives in the per-dictionary `e/` shards (median
~2 KB) and is fetched **only when you tap a word**. This is what keeps the
section fast on a phone despite half a million entries.

---

## 7. Data model — `kosha_entry`

Each item:

```json
{
  "id": "aMSu",                       // SLP1 headword (homonyms get ~2, ~3 …)
  "headword": "अंशु",                  // Devanagari (the primary text)
  "headword_slp1": "aMSu",            // exact SLP1
  "fold": "ansu",                     // fuzzy key: anusvara/nasal, s/ś/ṣ, vowel length, avagraha, gemination collapsed
  "headword_language": "sa",
  "source": "mw-cologne",
  "synonyms": ["…"], "synonyms_slp1": ["…"],
  "senses": [
    { "gloss": "…", "gloss_language": "kn",
      "pos": "पुल्लिङ्गः", "etymology": "…", "note": "…",
      "citations": [ { "text": "…" } ] }
  ]
}
```

The `fold` is the same idea as DGE's global fuzzy search spine, so Kosha lookup
behaves consistently with the rest of the app. Cross-language aggregation falls
out naturally: two headwords with the same `fold` from different dictionaries
land under one query, each sense tagged with its own `gloss_language`.

---

## 8. Functionality

- **Fuzzy headword search** accepting Devanagari, IAST, Harvard-Kyoto, ITRANS,
  or Kannada input — all normalised to the SLP1 fold.
- **Result list** grouped by headword, showing how many dictionaries carry it
  and language chips (संस्कृतम् / ಕನ್ನಡ / English …).
- **Per-dictionary result cards** on expand, each sense showing gloss, part of
  speech, etymology (vyutpatti/nishpatti), elaboration (vistara), and citations
  (prayoga/ullekha).
- **Cross-language pivot:** every available gloss per headword, in every
  language, side by side.
- **Translate affordance:** a → ಕನ್ನಡ / → English button on any gloss, using
  your existing BYOK Gemini key; results are labelled `*` as machine translation.
- **Licence badges** per source (green for CC-BY-SA, neutral for "Unclear").
- **Script-aware:** headwords/citations follow the app's active script via
  Sanscript; mobile-responsive (list → detail).

---

## 9. "Spending" — cost, footprint, bandwidth

- **Money:** ₹0 / $0 to build and to run. All data is open; all build tooling is
  free/stdlib; hosting is your existing free GitHub Pages. The **only** possible
  charge is the optional translate button, billed to **your** Gemini key per
  click (typically a fraction of a cent), and only when you press it.
- **Repo storage:** full dataset ≈ **436 MB across ~24,600 files** (571 index
  shards + 24,041 entry shards). The 3 largest dictionaries dominate:
  MW ≈ 81 MB, Vacaspatyam ≈ 77 MB, Shabdakalpadruma ≈ 68 MB. The loadable sample
  is 11.5 MB. (GitHub's soft repo limit is ~1 GB; you're comfortably under.)
- **Per-lookup bandwidth (mobile):** one index shard (median ~7 KB, worst-case
  `sa` ≈ 3.7 MB) + one entry shard per expanded word (median ~2 KB). GitHub Pages
  serves these gzip-compressed, so real transfer is far smaller.
- **Build time:** parsing all 10 dictionaries took roughly 2 minutes of CPU.

---

## 10. Dictionaries included (this build)

| Dictionary | Category | Dir | Head→Gloss | Headwords | Senses | Licence |
|---|---|---|---|---:|---:|---|
| Monier-Williams (Cologne) | sanskrit_english | mw-cologne | sa→en | 194,083 | 286,514 | CC-BY-SA 4.0 |
| V. S. Apte (1957) | sanskrit_english | apte-1957 | sa→en | 88,872 | 90,847 | CC-BY-SA 4.0 |
| Vacaspatyam | sanskrit_sanskrit | vachaspatyam | sa→sa | 48,636 | 50,135 | Unclear |
| Shabdartha-Kaustubha | sanskrit_kannada | shabdArtha_kaustubha | sa→kn | 46,816 | 93,227 | Unclear |
| Shabdakalpadruma | sanskrit_sanskrit | shabdakalpadruma | sa→sa | 40,817 | 42,533 | Unclear |
| MW English–Sanskrit | reverse | mw-english-sanskrit | en→sa | 28,238 | 32,378 | CC-BY-SA 4.0 |
| Benfey Sanskrit–English | sanskrit_english | benfey | sa→en | 24,657 | 25,062 | CC-BY-SA 4.0 |
| Macdonell | sanskrit_english | macdonell | sa→en | 20,103 | 20,749 | CC-BY-SA 4.0 |
| Amarakosha | sanskrit_sanskrit | amarakosha | sa→sa | 9,030 | 11,796 | Unclear |
| Abhidhanachintamani | sanskrit_sanskrit | abhidhanachintamani | sa→sa | 1,919 | 1,965 | Unclear |
| **Total** | | | | **503,171** | **655,206** | |

"Unclear" = no explicit licence in the source repo; included with full
attribution stamped into `source_meta`, per your non-commercial call. The
Cologne set is cleared for use with attribution + ShareAlike.

---

## 11. How it integrates with DGE

**It is additive and self-contained.** `kosha.js` reads
`data/koshas/_index/manifest.json` on its own and injects a floating **कोश**
button; it does **not** modify or depend on any existing JS, and it does **not**
require editing `schemas.json` or `taxonomy.json` to work. The only wiring is:

1. `js/kosha.js` present, and
2. one line in `index.html` after `transliteration.js`:
   `<script src="js/kosha.js?v=1.0"></script>`
   (kosha.js uses `window.Sanscript` and `window.applyTransliteration`, so it
   must load after those.)

**Optional deeper integration (only if you want koshas in the normal library
browser too):** merge the `kosha_entry` schema into `data/schemas.json` and the
`koshas` block into `data/taxonomy.json` / `_taxonomy.json` (snippets provided:
`kosha_schema_ADDITION.json`, `kosha_taxonomy_ADDITION.json`, and the generated
`_taxonomy_koshas.json`). This is not needed for the lookup feature itself.

**Translate pivot:** reuses `localStorage['gemini_api_key']` and
`localStorage['gemini_model']` — the same keys your Convert tool already sets, so
no new configuration. If no key is present, the button explains where to add one.

---

## 12. Known limits & suggested next steps

- **Bengali and other languages** (`sa↔bn`, etc.) aren't in this build; they can
  be pulled from the sibling `indic-dict/stardict-bengali` / `-hindi` repos or
  your local `dict.zip` by adding entries to the importer config.
- **Licence resolution before any public/commercial use:** the "Unclear"
  dictionaries (including `shabdArtha_kaustubha`) need provenance confirmed; the
  digitisations are what's unlicensed, even where the underlying texts are old.
- **Your local `dict.zip`:** any dictionary in it that isn't in the public repos
  can be ingested by pointing the Colab importer's `LOCAL_ROOT` at the extracted
  folder — every `.ifo` is auto-discovered.
- **Autocomplete on 1-character queries** loads several shards; fine in practice,
  but shardable further if you ever want it tighter.
- **Translations are machine-generated** and marked `*` — treat as a bridge, not
  an authority.
```
