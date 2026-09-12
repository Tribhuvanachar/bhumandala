# DGE · Ashtadhyayi Corpus + UI — Full Build Documentation

_Everything that was done to add the Aṣṭādhyāyī (Pāṇinian grammar) section to the
DGE project: what was built, what sources and scripts were used, where the files
went, the structure, the functionality, what is still pending, and how it
integrates with DGE._

Generated: 8 Aug 2026. Session: Cowork (cloud). Repo: `github.com/Tribhuvanachar/bhumandala`.

---

## 1. Goal

Build an ashtadhyayi.com-style resource — but with a better, custom UI — as a
**section inside the existing DGE static site** (`/dge/`), covering Pāṇini's
sutrapāṭha and its classical commentaries (Kāśikā, Nyāsa, Bālamanoramā,
Tattvabodhinī, and later Siddhānta-Kaumudī / Mahābhāṣya / Vasu's English), with
**selectable, hideable, comparable commentary layers** and an **AI tutor** to
help learners. Strictly non-commercial (dharma-prachāra / education / research).

---

## 2. What was done — chronological

1. **Source & licence research (Phase A).** Surveyed the open Ashtadhyayi data
   ecosystem and verified licences. Key findings:
   - `ashtadhyayi-com/data` — richest collection, but **no LICENSE file =
     all-rights-reserved** (not cleared).
   - `ambuda-org/vidyut` (Vidyut/Ambuda) — **MIT**; ships a Pāṇinian *prakriyā*
     (derivation) engine + Dhātupāṭha (granted under MIT). Cleared.
   - **S. C. Vasu** English translations of the Aṣṭādhyāyī (1891–98) and Siddhānta-
     Kaumudī (1905) — **public domain**. Cleared.
   - GRETIL / sanskritdocuments.org / Wikisource — attribution / CC-BY-SA, patchy.
   - Output: `dge_ashtadhyayi_sources.md` (the licence report).

2. **UI exploration.** Built three interactive HTML mockups on real sample data —
   "Reading View" (mobile-first stacked cards), "Workbench" (side-by-side
   columns), and a **Blended** design. You chose the Blended direction.

3. **Data ingestion.** You provided four commentaries as **StarDict
   dictionaries** (`.idx/.dict/.ifo/.syn`), each keyed by sutra reference
   (`1.1.001 वृद्धिरादैच्`). A Python importer parsed them, reconstructed the
   sutrapāṭha from the keys, aligned every commentary to its sutra, and emitted
   DGE-format `data.json`.

4. **UI build.** Produced `ashtadhyayi.html` + `js/ashtadhyayi.js` — the blended,
   responsive reading/compare interface — plus a self-contained preview.

5. **AI wiring.** Connected a real **Gemini (bring-your-own-key)** tutor,
   grounded on whichever commentaries are open.

6. **Packaging & install.** Merged the `taxonomy.json` change, packaged a
   drop-in zip, and **you uploaded it to `main`** via the GitHub web UI. (I could
   not push directly — this cloud session's git proxy only permits writes to a
   pre-authorised repo set, which yours was not in. Nothing was ever pushed
   automatically from my side.)

---

## 3. Resources & sources used

| Resource | Role | Licence status |
|---|---|---|
| **Your 4 StarDict dictionaries** (kashika, balamanorama, tattvabodhini, nyasa) | The actual commentary text ingested | Uploaded by you; tagged `verify` in data — confirm before publishing |
| Sutrapāṭha (the ~4000 sutras) | Reconstructed from the dictionary **keys** (no external fetch) | Mūla text is public domain |
| Vidyut / Ambuda (MIT) | Recommended future source for prakriyā engine + Dhātupāṭha | Open (MIT) — not yet ingested |
| S. C. Vasu (public domain) | Recommended future English layer | Public domain — not yet ingested |
| `@indic-transliteration/sanscript` (CDN) | On-the-fly transliteration in the UI (same lib DGE already loads) | Open source |
| Google Gemini API | The AI tutor (your key, called from the browser) | BYOK — you supply the key |

No web scraping was used. All bulk data came from your uploads; research used
only the WebSearch/WebFetch tools (which summarise, not scrape).

---

## 4. Scripts that were run

All scripts ran in the **cloud sandbox**, not on your machine or repo.

| Script | What it did |
|---|---|
| **`import_ashtadhyayi.py`** (delivered to you) | The core importer. Parses each StarDict `.idx`+`.dict`, extracts `(sutra_id, sutra_text)` from every key via regex, concatenates duplicate Nyāsa entries, reconstructs the 3,962-sutra sutrapāṭha, and writes 5 DGE `data.json` files + a `taxonomy` snippet + a `_PROPOSED` README. Validates every JSON and NFC-normalises Devanagari. Standard-library only. |
| StarDict parser (inside the importer) | Reads the binary `.idx` format: `word\0` + 4-byte big-endian offset + 4-byte size, indexing into the `.dict` blob. |
| Taxonomy-merge script (one-off) | Loaded your live `taxonomy.json`, inserted the `vyakarana` node after `sutras`, preserved key order, re-validated. Produced the drop-in `taxonomy.json`. |
| Browser smoke-tests (Playwright/Chromium) | Loaded `ashtadhyayi.html` from a local server and verified: 3,962 sutras load, commentaries render with real text, Nyāsa lazy-loads on toggle, Read⇄Compare works, script switch, font sizing, collapse/expand, settings modal + key save, sutra-jump datalist, keyboard nav, and that the Gemini fetch actually fires. |
| Colab notebook generator | Wrapped the importer into `DGE_Ashtadhyayi_importer.ipynb` so you can re-run/extend it on Android. |

---

## 5. Where everything went

**On your GitHub repo (`main` branch), under `dge/`:**

```
dge/
├── ashtadhyayi.html                     ← the new section page
├── js/
│   └── ashtadhyayi.js                    ← its logic module
└── data/
    ├── taxonomy.json                     ← updated: new "vyakarana" node added
    └── vyakarana/
        └── ashtadhyayi/
            ├── sutrapatha/data.json      ← 3,962 mula sutras   (~0.8 MB)
            ├── kashika/data.json         ← 3,962 items          (~5 MB)
            ├── balamanorama/data.json    ← 2,944 items          (~8 MB)
            ├── tattvabodhini/data.json   ← 2,450 items          (~5.5 MB)
            └── nyasa/data.json           ← 3,831 items          (~21 MB)
```

Commit on `main`: _"Sync from zip DGE_ashtadhyayi_DROP_IN.zip — 10 file(s)"_.
**Live URL (after Pages rebuild):** `https://tribhuvanachar.github.io/bhumandala/dge/ashtadhyayi.html`

**Files you also have as downloads (not in the repo):** the importer
(`import_ashtadhyayi.py`), the Colab notebook, the licence report, the
self-contained preview, and this document. The scratch `_PROPOSED/` folder was
deliberately **not** included in the upload.

---

## 6. Data model / how it maps to DGE

The section **reuses DGE's existing schemas** — no change to `schemas.json` was
needed, because Pāṇini's mūla → ṭīkā → ṭippaṇī layering matches the schemas DGE
already uses for Sarvamoola:

| Folder | DGE schema | Notes |
|---|---|---|
| `sutrapatha` | `grantha_mula_text` | `sanskrit_text` = the sutra; `id`/`reference` = `a.p.s` (e.g. `1.1.1`) |
| `kashika` | `grantha_tika_text` | `tika_title` = "Kāśikā-vṛtti" |
| `balamanorama` | `grantha_tippani_text` | `author` = Vāsudeva Dīkṣita |
| `tattvabodhini` | `grantha_tippani_text` | `author` = Jñānendra Sarasvatī |
| `nyasa` | `grantha_tippani_text` | `author` = Jinendrabuddhi (deepest layer) |

Every commentary item carries a back-reference to its sutra:

```json
"references": [{ "target": "vedanga/vyakarana/ashtadhyayi/sutrapatha",
                 "unit_id": "1.1.1", "note": "comments_on" }]
```

so DGE's library-wide backlink/search spine can answer "what explains this
sutra" without special-casing. Each `data.json` also carries `source` and
`licence` fields for provenance auditing.

---

## 7. Functionality (what the page does)

- **Blended, responsive layout.** "☰ Read" mode stacks the commentaries as
  collapsible cards (mobile-first); "▥ Compare" mode puts them in side-by-side
  columns for cross-commentary study. One tap switches between them.
- **Selectable / hideable / portable layers.** Chips toggle each commentary on or
  off. Green-dot chips = loaded from your data; dashed chips (Siddhānta-Kaumudī,
  Mahābhāṣya, Vasu, Prakriyā) = sources not yet ingested.
- **Lazy loading.** Sutrapāṭha loads on open; each commentary's `data.json` is
  fetched only the first time you enable it (Nyāsa is ~21 MB, so this matters).
- **6-script transliteration.** Devanāgarī / IAST / Kannada / Telugu / Tamil /
  Malayalam, applied live to sutra + commentary via Sanscript.
- **Reading aids.** Font size A−/A+, light/dark theme, expand/collapse all,
  per-card copy button, prev/next, ←/→ keyboard nav, and a jump-to-sutra box with
  autocomplete over all 3,962 sutras. All preferences persist (localStorage).
- **AI tutor (BYOK Gemini).** The ✦ button opens a tutor grounded **only** on the
  commentaries you have open — it's instructed to quote the Sanskrit it relies on
  and not invent. Presets (Explain simply / Compare commentaries / Example word /
  Improve-paraphrase), free-text questions, and reply language EN / ಕನ್ನಡ /
  संस्कृत. The key is stored only in your browser and sent directly to Google.

---

## 8. What is still pending

1. **Licence clearance — the important one.** The commentary text is tagged
   `licence: verify` in every `data.json`. The files are now on your **public**
   repo and `main`, so they are publicly served. Resolve the licences (e.g. your
   email to the ashtadhyayi.com curator) — and if any source turns out to be
   restricted, remove or replace that layer. The sutra mūla itself is public
   domain and safe.
2. **Missing layers.** Siddhānta-Kaumudī (mūla), Mahābhāṣya (+ Kaiyaṭa, Nāgeśa),
   and Vasu's English aren't ingested yet — their chips are already in the UI,
   waiting. Add them via the Colab notebook (one `SOURCES` entry each).
3. **Padaccheda / anvaya / per-sutra English gloss.** Not present in your dicts.
   Good candidates for a Gemini batch pass or the Vasu import.
4. **Prakriyā (derivation) engine.** Vidyut (MIT) can generate step-by-step
   derivations; a future integration.
5. **Nav link.** The page exists but isn't yet linked from DGE's main menu (see §9).

---

## 9. How it integrates with the DGE project

The section was built to be **additive and non-destructive** — it reuses DGE's
conventions and touches no existing logic. To finish wiring it into the app:

- **Add a menu link (the one edit intentionally left to you).** In
  `dge/index.html` (or wherever your nav lives), add a link to
  `ashtadhyayi.html`, alongside the existing `gita.html` / `audio.html` links,
  e.g. `<a href="ashtadhyayi.html">अष्टाध्यायी</a>`. This is the only change
  needed to surface it in the site.
- **Search index.** Because the `data.json` follow the standard schema with
  `primaryTextField` set, DGE's search-index generator will include the
  sutrapāṭha and commentaries automatically when it walks `taxonomy.json` — no
  special handling. (Re-run whatever generates your search index if it's a build
  step.)
- **Transliteration.** The page loads the same `sanscript` library as
  `index.html`; if you later fold it into the shared shell, it can use DGE's
  global `window.setScript` instead of its own control.
- **AI key.** The tutor currently uses its own key store
  (`localStorage["dge.ash.gkey"]`). The code already checks for a shared
  `window.dgeGetGeminiKey()` / `window.DGE_CONFIG.geminiKey` first, so if you
  expose DGE's existing BYOK key that way, the section will use it and the user
  won't need to enter a key twice.
- **Library browser (optional).** If you want it to appear in the main library
  card grid, add an entry to `library.json` / `config-overrides.json` pointing at
  `vedanga/vyakarana/ashtadhyayi` — optional, since the dedicated page already covers it.

---

## 10. How to re-run or extend

Use `DGE_Ashtadhyayi_importer.ipynb` in Google Colab (Android-friendly):
Runtime ▸ Run all → upload dict `.tar.gz`s → download the `dge/`-rooted zip →
upload to GitHub the same way you just did. To add a new commentary, add one
entry to the `SOURCES` dict in the importer (schema = `grantha_tika_text` for a
direct sutra-commentary or `grantha_tippani_text` for a sub-commentary, plus the
author) and re-run.

---

## 11. Cost / "spend" note

Nothing in this build incurs a running cost: the site is static (free on GitHub
Pages), the data is stored as flat JSON in your repo, and the only paid element
is the **Gemini AI tutor, which runs on your own API key** — you pay Google only
for what you use, and only when you (or a visitor with their own key) actually
ask the tutor a question. There is no server, database, or subscription.

---

### Quick reference

- **Live page:** `…/dge/ashtadhyayi.html`
- **Data root:** `dge/data/vyakarana/ashtadhyayi/`
- **Total imported:** 3,962 sutras + 13,187 commentary units across 4 works
- **Re-run tool:** `DGE_Ashtadhyayi_importer.ipynb`
- **Biggest open item:** licence verification before treating this as public
