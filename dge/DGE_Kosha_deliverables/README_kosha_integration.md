# DGE Kosha — integration guide (non-destructive)

Everything here is **additive**. No existing file or JS logic is modified. You
merge two small JSON snippets, drop in the generated data, add one JS file, and
add one `<script>` line.

## What's in this bundle
- `DGE_Kosha_import.ipynb` — Colab importer. Self-sources the GitHub dictionaries
  and auto-ingests your local `dict.zip`; downloads a `dge/`-rooted `dge_koshas.zip`.
- `dge_kosha_import.py` — the importer library (also embedded in the notebook).
- `kosha.js` — the self-injecting lookup UI.
- `kosha_schema_ADDITION.json` — the `kosha_entry` schema to merge.
- `kosha_taxonomy_ADDITION.json` — the `koshas` taxonomy block to merge.
- `kosha_sample_data.zip` — a real, small slice (10 dicts, common-word buckets)
  so you can see it working immediately.
- `Kosha_source_license_report.md` — per-source licence verdicts + sourcing plan.

## Step 1 — data
Generate the full dataset with the notebook (or use `kosha_sample_data.zip` to
test). Unzip so the tree lands at:
```
dge/data/koshas/_index/manifest.json
dge/data/koshas/_index/<2char>.json
dge/data/koshas/<category>/<slug>/meta.json
dge/data/koshas/<category>/<slug>/e/<3char>.json
```

## Step 2 — schema (merge, don't overwrite)
Open `data/schemas.json` and add the single `kosha_entry` key from
`kosha_schema_ADDITION.json` alongside the existing schemas.

## Step 3 — taxonomy (merge)
Add the `koshas` block from `kosha_taxonomy_ADDITION.json` into
`data/taxonomy.json` **and** `data/_taxonomy.json`. The importer also writes the
exact folder list it produced to `data/koshas/_taxonomy_koshas.json` — paste that
generated list in place of the illustrative folders.

## Step 4 — UI
Copy `kosha.js` into `js/`. Then add ONE line to `index.html`, after
`transliteration.js` (it reads `window.Sanscript` / `window.applyTransliteration`)
and near the other `js/*.js` includes:
```html
<script src="js/kosha.js?v=1.0"></script>
```
That's it. A floating **कोश** button appears; it opens a search overlay with
fuzzy SLP1 lookup, per-dictionary result cards, per-language grouping, and the
cross-language translate pivot.

## Cross-language pivot (BYOK Gemini)
The **→ ಕನ್ನಡ / → English** button on any gloss calls Gemini with the key you
already store for the Convert tool (`localStorage['gemini_api_key']`, model
`gemini_model`, default `gemini-3.6-flash`). No new key, no backend. Machine
translations are labelled with `*` and a "verify against the original" footnote.
If no key is set, the button explains where to add one. (Aggregation of every
available gloss per headword is always on and needs no key — the Gemini call is
only for on-the-fly rendering of a gloss into a language you don't read.)

## Notes / knobs
- Lookup accepts Devanagari, IAST, Harvard-Kyoto, ITRANS, or Kannada input;
  matching is on the SLP1 phonetic **fold** (anusvara/nasal, s/ś/ṣ, vowel
  length, avagraha, gemination), consistent with the app's global search spine.
- Your language is set to Kannada (`localStorage['app_kosha_pref_lang']='kn'`).
- Shard sizes are tuned for mobile (index shards median ~7 KB; entry shards
  median ~2 KB, loaded only when you expand a word). Tunable via
  `index_shard_len` / `entry_shard_len` in `run_import`.
- Strictly non-destructive: nothing writes outside `data/koshas/**`, `js/kosha.js`,
  and the two merged snippets. Do not commit until you've reviewed.
