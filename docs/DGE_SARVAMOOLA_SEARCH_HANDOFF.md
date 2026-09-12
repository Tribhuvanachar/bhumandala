# DGE — Sarvamoola Grantha import + Global Search: full handoff

_Prepared at the end of the build session. This documents everything that was
done to (a) import Madhva's Sarvamoola Grantha into DGE and (b) add corpus-wide,
Sanskrit-aware fuzzy search — what ran, where it ran, what landed in the repo,
how it works, its footprint, what's still open, and how to operate it._

Branch delivered: **`cowork/sarvamoola-and-search`** (off `main` @ `b6d2a14`).
Merge it via the Pull Request to go live. Nothing was pushed to `main`.

---

## 1. What was achieved (headline)

1. **Namesake corpus, from 0% to populated.** Imported **38 works** of Madhva's
   Sarvamoola Grantha (Gītā/Sūtra/Upaniṣad/Śruti/Itihāsa/Purāṇa prasthānas, the
   10 Prakaraṇas, stotras, ācāra works) **plus Nyāyasudhā**, into
   `data/sarvamoola_grantha/`. Faithful import: **47 layers, 19,275 items**;
   after the reading-structure enhancement: **14,331 units**.
2. **Made visible.** Flipped `library.json` `populated` flags for the 47 new
   layers (43 → **90** populated granthas).
3. **Global search.** Added corpus-wide, sandhi/spelling-tolerant search across
   the whole library (Vedas + Sarvamoola), reachable by a 🔎 button / Ctrl-Cmd-K,
   with a prebuilt static index of **90 granthas / 37,818 units**.
4. **Non-destructive.** Nothing touches `data/vedas/**` or existing `js/*.js`;
   the only edits to existing files are 3 `<script>` tags in `index.html` and 47
   flag flips in `library.json`.

---

## 2. Sources & resources used

| Resource | Role |
|---|---|
| **anandamakaranda.in** (MediaWiki 1.44.5) | Primary source of the Sarvamoola text (structured `/JSON` pages + Nyāyasudhā per-pāda pages). Non-commercial use. |
| **github.com/Tribhuvanachar/bhumandala** | Your repo — cloned read-only to learn structure and to build the branch. |
| WebSearch / WebFetch | Enumerating works, diagnosing page formats, and researching the two missing texts + licensing. |
| Cologne CDSL, Wikisource, GRETIL, Muktabodha, sanskritdocuments | Researched for future Kosha/Ashtadhyayi/Purāṇa sourcing (see licensing notes) — not used in this import. |
| Google Colab (your side) | Ran the Python importers and the final `git push` (my sandbox is blocked from writing to your repo). |
| Python 3 (my sandbox + your Colab) | All importers, the refiner, the index generator, QA. |
| Node.js (my sandbox) | Syntax-checked the JS and ran the search functional tests. |

**Licensing posture:** DGE is non-commercial (dharma-pracāra / education /
research). anandamakaranda.in content is used on that basis; every imported
`data.json` records its `source_url` for attribution.

---

## 3. Scripts that ran, and where

Two environments were involved: **my sandbox** (a private scratch copy — never
your repo) and **your Colab** (which has open network, so it did the web-fetching
and the push).

| Script | Where | What it did |
|---|---|---|
| `build_search_index.py` + `search_toolkit_pkg/` (translit.py, normalize.py) | my sandbox | Offline generator: walks `data/**`, canonicalizes to SLP1, builds the static index. |
| `sarvamoola_import` (Colab notebook) | **your Colab** | Fetched each work's `/JSON` from anandamakaranda.in, unwrapped the `__NOINDEX__/<pre>` JSON, mapped blocks → DGE `data.json`. → 19,113 items. |
| `nyayasudha_import` (Colab notebook) | **your Colab** | Nyāyasudhā's combined `/JSON` overflowed the wiki's 5 MB unstrip limit, so this pulled its per-pāda pages (`C1P1…C4P4`), parsed the `gr-teeka-entry` blocks. → 162 items. |
| `refine_bhashya.py` | my sandbox | Paired each root mantra/verse with the bhāṣya that follows it into one reading unit; auto-kept prose treatises faithful. → enhanced variant. |
| `update_library_populated.py` | my sandbox | Flipped `populated:true` for exactly the 47 Sarvamoola layers that have data. |
| `push_branch.ipynb` | **your Colab** | Pushed the finished git branch (from `dge_branch.bundle`) to your repo. |

Data flow: **anandamakaranda.in → (your Colab importers) → data.json zips →
(my sandbox) validate + enhance + build index + commit to a branch → git bundle →
(your Colab) push → your repo (branch) → your Merge.**

---

## 4. What landed in the repo (branch `cowork/sarvamoola-and-search`)

`1390` files changed in one commit (`1332` of them are search-index shards).

### 4.1 New / changed files

```
dge/index.html                     + 3 <script> tags after js/library.js (?v=4.57.7)
dge/data/library.json              47 sarvamoola layers flipped to populated:true
dge/data/sarvamoola_grantha/**     47 data.json populated (enhanced reading units)
dge/js/dge-normalize.js            NEW  query → SLP1 + phonetic fold
dge/js/dge-search.js               NEW  static-index loader + ranker
dge/js/global-search.js            NEW  self-injecting 🔎 search UI
dge/build_search_index.py          NEW  offline index generator
dge/search_toolkit_pkg/**          NEW  normalizer used by the generator
dge/search_index/**                NEW  prebuilt static index (see §6)
```

### 4.2 Content hierarchy (`data/sarvamoola_grantha/`)

Every leaf grantha has up to three layers, each its own `data.json`:
`mula/` (Madhva's text), `tika_jayatirtha/` (commentary), `tippani/` (sub-comm.).

```
sarvamoola_grantha/
  gita_prasthana/            gita_bhashya, gita_tatparya_nirnaya
  sutra_prasthana/           brahma_sutra_bhashya, anuvyakhyana(+Nyayasudha tika),
                             nyaya_vivarana, anubhashya
  upanishad_prasthana/       10 upaniṣad-bhāṣyas (isha, katha, kena, …, chandogya)
  rig_bhashya/
  itihasa_purana_tatparya_nirnaya/  mahabharata_…, bhagavata_…
  dasha_prakarana_granthas/  10 prakaraṇas (tattva_sankhyana, tattvodyota, …)
  dvadasha_stotra/
  achara_and_ancillary_granthas/  nakha_stuti, kanduka_stuti, sadachara_smriti,
                             tantrasara_sangraha, krishnamrita_maharnava,
                             yamaka_bharata, jayanti_nirnaya, yati_pranava_kalpa
                             (nyasa_paddhati, tithi_nirnaya = still empty, see §8)
```

### 4.3 Item shape (per `data.json`)

```json
{ "schema": "grantha_mula_text", "default_author": "Sri Madhvacharya",
  "source_url": "https://anandamakaranda.in/index.php?title=…",
  "items": [
    { "id": "AV_C01_S01_I01", "reference": "1.1",
      "section": "प्रथमोऽध्यायः", "mula": "…root mantra/sutra…",
      "sanskrit_text": "…mantra + Madhva's bhashya (enhanced)…",
      "tags": ["mantra+bhashya"], "references": [ {"target":"…","unit_id":"…","type":"comments_on"} ],
      "notes":"", "audio":[], "source": { "site":"anandamakaranda.in", … } }
  ] }
```

Tīkā/tippaṇī layers use `grantha_tika_text` / `grantha_tippani_text`, and each
Nyāyasudhā entry carries a `comments_on` reference back to the exact Anuvyākhyāna
sūtra it glosses.

---

## 5. Data model & schemas (unchanged conventions)

The import uses your existing schemas from `data/schemas.json` — no schema
changes were needed:

- `grantha_mula_text` (primaryTextField `sanskrit_text`) for the mūla layers.
- `grantha_tika_text` / `grantha_tippani_text` for commentary layers.
- The cross-reference "spine" you'd already designed — item-level `references:
  [{target, unit_id, note, type}]` and `tags[]` — is populated where the source
  gave linkage (Nyāyasudhā → Anuvyākhyāna).

The **enhanced** variant adds two convenience fields (`mula`, `section`) that the
existing reader ignores if unknown; the searchable text lives in `sanskrit_text`.

---

## 6. Search: architecture & functionality

**Principle:** do all the Sanskrit-specific work at index time; keep the runtime
simple. Everything canonicalizes to **SLP1** (1 ASCII byte = 1 phoneme), then
folds into keys that make matching sandhi/spelling-tolerant.

### 6.1 Three keys per unit
- `slp1` — exact canonical.
- `pkey` (phonetic key) — folds anusvāra↔nasal, ś/ṣ/s, vowel length, avagraha,
  gemination, visarga, vocalic ṛ/ḷ→r/l. Safe fuzzy.
- `ckey` (coarse key) — adds retroflex→dental, de-aspiration, de-voicing. Loose
  fallback.

### 6.2 Static index artifacts (`dge/search_index/`)
```
manifest.json          catalog: granthas, categories, unit counts, shard paths
units/<slug>.json       per-grantha units: {u:id, pk, ck, s:snippet}
postings/<bucket>.json  trigram → [[granthaIdx, unitIdx], …]  (candidate lookup)
backlinks.json          "target#unit_id" → [{from, note, type}]  (what-cites-this)
```

### 6.3 Runtime files (in `js/`)
- `dge-normalize.js` — the query-side twin of the indexer's fold (verified to
  produce byte-identical keys). Uses your on-page Sanscript for non-Devanagari
  input.
- `dge-search.js` — loads the manifest, then only the postings buckets and unit
  shards a query actually touches; scores by exact→pkey→ckey + trigram overlap +
  Damerau-Levenshtein.
- `global-search.js` — self-injecting UI: a 🔎 button (bottom-right) and
  **Ctrl/Cmd-K** open an overlay; a script selector (auto / देव / IAST / HK /
  SLP1); results show grantha, unit, category, score, snippet; clicking a result
  deep-links via your existing `?path=…&jumpShloka=…` route.

### 6.4 What it can do (verified)
- Same verse found whether typed in **Devanagari, IAST, HK, or SLP1**.
- Tolerant of **anusvāra vs nasal, ś/ṣ/s, vowel length, ṛ→r, jñ→jn, avagraha,
  gemination** — e.g. `अग्निमीळे` / `agnimILe` all hit the same mantra.
- **Cross-corpus**: one query spans Vedas + Sarvamoola; e.g. `दर्शनभेदाधिकरणम्`
  returns the Anuvyākhyāna sūtra **and** the Nyāyasudhā ṭīkā on it.

---

## 7. Footprint & performance ("spending")

| Item | Size / count |
|---|---|
| Sarvamoola text added | 47 layers, ~5.65 M Devanagari chars |
| Search index (`search_index/`) | **~59 MB** on disk (postings ~36 MB, unit shards ~23 MB, ~1090 buckets) |
| Files added to repo | 1,390 (1,332 index shards) |
| The git bundle you pushed | ~19 MB (git-compressed) |
| Per query (client) | Downloads only the few posting buckets + shards a query needs; GitHub Pages gzips transfer (JSON compresses ~5–10×) |

The index is the only heavy artifact, and it's a **build product** — regenerate
it; don't hand-edit it. Shrinking it (word-level postings and/or a gzip-aware
loader, ~5–10× smaller) is the main optimization left (see §8).

---

## 8. What's still open (pending)

1. **Index size optimization** — switch postings from char-trigrams to word-level
   pkey tokens and/or add a gzip loader. Functional now; just large.
2. **Two texts still empty** — `nyasa_paddhati`, `tithi_nirnaya`: not available as
   clean digital text (only Bannanje PDFs on srimadhvyasa.wordpress.com /
   archive.org). Route: your `dge/convert/` PDF → OCR tool, or send the PDF and I
   extract it if it has real text.
3. **Nyāyasudhā 4.3** (Brahmasūtra adhyāya 4 pāda 3) — not published on the source
   site; 4.1 / 4.2 / 4.4 are in.
4. **Cross-references** — currently only Nyāyasudhā→Anuvyākhyāna. The fold can be
   run text-to-text to auto-discover more parallels/`comments_on` edges later.
5. **Kosha** and **Ashtadhyayi** — being built as separate parallel tasks (their
   own prompts). When they return zips, they fold into the same index.
6. **Reader styling** of the enhanced `mula` vs `bhashya` fields — optional polish
   once integrated into the larger DG project.

---

## 9. How to operate & integrate with DGE

### 9.1 Going live
Merge the `cowork/sarvamoola-and-search` PR. That's it — the 🔎 search and the
Sarvamoola library entries become live on `tribhuvanachar.github.io/bhumandala/dge/`.

### 9.2 When you add or change content later
1. Add/edit `data/**` as usual.
2. If a new grantha becomes populated, run `python3 update_library_populated.py .`
   (or set its `library.json` `populated` flag).
3. Regenerate the index: `cd dge && python3 build_search_index.py --data data --out search_index`
   (or run the `build_search_index.ipynb` Colab notebook).
4. Commit `search_index/` + the data. Bump `?v=` per your cache-busting convention.

### 9.3 Conventions honored
- `?v=` cache-busting on the 3 new script tags (`4.57.7`).
- `dge/`-rooted change set; only new/changed files.
- `node --check` passes on all three JS files.
- BYOK/access untouched (search is read-only static data + client code).

### 9.4 Turn search off / roll back
Remove the 3 `<script>` tags from `index.html` (search UI disappears; nothing
else depends on it), or revert the merge commit. The data and library flags are
independent of the search feature.

---

## 10. Quick file manifest

```
dge/
  index.html                      (+3 script tags)
  js/dge-normalize.js             query normalizer (SLP1 fold)
  js/dge-search.js                index loader + ranker
  js/global-search.js             search UI (🔎 / Ctrl-Cmd-K)
  build_search_index.py           index generator (offline)
  search_toolkit_pkg/             translit.py, normalize.py, …
  search_index/                   manifest.json, units/, postings/, backlinks.json
  data/library.json               47 populated flags flipped
  data/sarvamoola_grantha/**      47 populated data.json (enhanced)
```

Helper scripts kept for you (not required at runtime): `update_library_populated.py`,
`refine_bhashya.py`, and the Colab importers (`sarvamoola_import.ipynb`,
`nyayasudha_import.ipynb`, `build_search_index.ipynb`).
