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

**The live corpus is not in this repo.** `js/kosha.js` and
`admin/kosha.html` read it from the `dist` branch of the separate
[`Tribhuvanachar/bhumandala-kosha-data`](https://github.com/Tribhuvanachar/bhumandala-kosha-data)
repo over jsDelivr (`appConfig.koshaDataBase`), because at **93 dictionaries /
2,094,525 headwords / 2,436,991 senses / ~1.8 GB** it is well over this repo's
budget. `dge/data/koshas/` here still holds the original 10-dictionary sample,
which is what a local checkout falls back to when `KOSHA_DATA_BASE` is unset.

The build pipeline lives in that data repo (`kosha_core.py`,
`dicts_config.json`, `build_koshas.py`, and a `Build Kosha corpus` Action);
`importers/` here is the original standalone/Colab version it grew out of.

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
  and its siblings `-kAvya` (Purāṇic/epic encyclopaedias and indices) and
  `-vyAkaraNa` (Aṣṭādhyāyī and dhātu literature), cloned automatically, and
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

Last full run: **93 dictionaries, 2,094,525 headwords, 2,436,991 senses,
~1.8 GB across ~132,000 files**, ~10 minutes — which is why it lives in the
separate data repo and is served over jsDelivr rather than committed here.
(The original in-repo build was 10 dictionaries / 503,171 headwords / ~436 MB.)

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

- Bengali and other languages (`sa↔bn`, etc.) still aren't in the corpus; add
  via the sibling `indic-dict/stardict-bengali`/`-hindi` repos or the local
  `dict.zip`. Note those repos key on a *non-Sanskrit* headword, so taking them
  is a corpus decision, not a gap in the Sanskrit koshas.
- The machine-generated `vidyut/**` inflection tables in
  `stardict-sanskrit-vyAkaraNa` are deliberately excluded — millions of derived
  word-forms would bury real headwords in the lookup index. See
  `LICENSING.md`.
- Autocomplete on 1-character queries loads several shards — fine in
  practice, shardable further if it's ever felt to be too eager.
- Translations are machine-generated (BYOK Gemini) and marked `*` — a bridge,
  not an authority.
