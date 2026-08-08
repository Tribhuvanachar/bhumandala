# DGE Kosha Toolkit

Everything needed to build and re-run the multilingual Kosha (dictionary)
section of the Digital Grantha Engine. Mirrors the `veda_toolkit/` layout:
this `README.md` is the overview, `LICENSING.md` covers per-dictionary
sourcing/licence status, and `importers/` holds the actual pipeline.

---

## 1. What is currently live

`js/kosha.js` (self-injecting **कोश** lookup button, wired into `index.html`)
reads a two-tier sharded dataset from `dge/data/koshas/`:

```
dge/data/koshas/
  _index/manifest.json          buckets + dictionary registry
  _index/<2-char>.json          headword lookup shards
  <category>/<slug>/meta.json   per-dictionary source metadata
  <category>/<slug>/e/<3-char>.json   full entries (etymology, citations)
```

**Right now `dge/data/koshas/` holds only the loadable sample** (10
dictionaries, common-word buckets, ~63 MB unpacked) that shipped with the
original build — real, working, but a small slice, not the full lexicon. The
importer that produced it (and that can produce the full ~436 MB / 503K-headword
dataset) is in `importers/`, proven and ready to re-run — see §3.

---

## 2. Data model — `kosha_entry`

```json
{
  "id": "aMSu", "headword": "अंशु", "headword_slp1": "aMSu",
  "fold": "ansu", "headword_language": "sa", "source": "mw-cologne",
  "synonyms": ["…"], "synonyms_slp1": ["…"],
  "senses": [
    { "gloss": "…", "gloss_language": "kn", "pos": "पुल्लिङ्गः",
      "etymology": "…", "note": "…", "citations": [{ "text": "…" }] }
  ]
}
```

`fold` is the same fuzzy-matching idea as DGE's global search spine (anusvāra/
nasal, ś/ṣ/s, vowel length, avagraha, gemination all collapsed), so Kosha
lookup and full-text search behave consistently.

See `kosha_schema_ADDITION.json` / `kosha_taxonomy_ADDITION.json` for the
`data/schemas.json` / `data/taxonomy.json` snippets that would register this
formally in the library browser. **Not yet merged** — `kosha.js` works
standalone without it (see §5).

---

## 3. Running the full import (the 2.3 GB dictionary set)

`importers/dge_kosha_import.py` (also embedded in
`importers/DGE_Kosha_import.ipynb` for Google Colab) parses:

- `.babylon` source dictionaries from `github.com/indic-dict/stardict-sanskrit`
  (cloned automatically — no upload needed for the cleared Cologne set), and
- compiled StarDict binaries (`.ifo`/`.idx`/`.dict.dz`/`.syn`) from a local
  `dict.zip` — this is how the ~2.3 GB personal dictionary collection gets in.

**To regenerate the full dataset:**
1. Open `importers/DGE_Kosha_import.ipynb` in Google Colab.
2. Upload (or point `LOCAL_ROOT` at) the extracted `dict.zip`.
3. Runtime ▸ Run all. It clones the public dictionary sources, auto-discovers
   every local `.ifo`, builds the two-tier sharded tree, and downloads a
   `dge/`-rooted zip.
4. Unzip so the tree lands at `dge/data/koshas/**`, replacing the sample.
5. Commit. Bump the `?v=` on `js/kosha.js`'s `<script>` tag in `index.html`
   per the site's cache-busting convention.

Last full run (per the original build): **10 dictionaries, 503,171 headwords,
655,206 senses, ~436 MB across ~24,600 files** — comfortably under GitHub's
~1 GB soft repo limit on its own, but see `PROJECT_STATUS.md` for the
repo-size call once combined with everything else.

To add a dictionary from the local `dict.zip` that isn't already in the
public repos: add one entry pointing `LOCAL_ROOT` at its extracted `.ifo`
folder — every StarDict set is auto-discovered.

---

## 4. Licensing

See `LICENSING.md` for the full per-dictionary table. Summary: the Cologne
re-distributions (Monier-Williams, Apte, Benfey, Macdonell, MW English–
Sanskrit reverse) carry `LICENSE.xml` — CC-BY-SA 4.0, cleared with
attribution. Everything else in the `indic-dict` mirror has **no explicit
licence** — included per the project lead's case-by-case non-commercial/
educational authorization, with full provenance and a licence badge
(`Unclear`) stamped into every entry so nothing is presented as cleared.
This is a live decision point, not a settled one — see `PROJECT_STATUS.md`.

---

## 5. Integration status

- **Done:** `js/kosha.js` loads on every page (script tag in `index.html`,
  after `transliteration.js` since it needs `window.Sanscript`); floating
  **कोश** button; fuzzy lookup across all shipped dictionaries; cross-language
  translate pivot via the existing BYOK Gemini key
  (`localStorage['gemini_api_key']`/`'gemini_model'`).
- **Not done (optional, not blocking the lookup feature):** merging
  `kosha_entry` into `data/schemas.json` and the `koshas` taxonomy block into
  `data/taxonomy.json`/`data/_taxonomy.json`, which would surface koshas in
  the normal library browser/card grid alongside granthas. Snippets are ready
  in this folder whenever that's wanted.
- **Not done:** folding Kosha into the corpus-wide search index
  (`build_search_index.py` from the Sarvamoola/search branch) — Kosha has its
  own bespoke lookup UI and data shape, so unifying the two is separate work,
  not automatic.

---

## 6. Known limits

- Bengali and other languages (`sa↔bn`, etc.) aren't in the sample build; add
  via the sibling `indic-dict/stardict-bengali`/`-hindi` repos or the local
  `dict.zip`.
- Autocomplete on 1-character queries loads several shards — fine in
  practice, shardable further if it's ever felt to be too eager.
- Translations are machine-generated (BYOK Gemini) and marked `*` — a bridge,
  not an authority.
