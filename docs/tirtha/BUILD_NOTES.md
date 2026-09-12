# Tīrtha Prabandha Holy-Places Database — Build & Integration Notes

*A complete record of how this dataset and app were produced, what they contain, where
they live, and how to grow them into the DGE / Bhūmaṇḍala project and the future
pilgrimage app.*

Author of the source text: **Śrī Vādirāja Tīrtha** (16th c. Mādhwa saint).
Commentary: **Guru-Bhāva-Prakāśikā** by Nārāyaṇācārya.
Deliverable version: **v2 · 95 places · verse-referenced.**

---

## 1. Goal

Compile **every holy place (tīrtha / kṣetra) named in the Tīrtha Prabandha**, arranged by
direction (the text's own four sections), and turn it into a **searchable, sortable,
filterable** database — with the modern place name, state, presiding deity, the
explanation from the text and its commentary, verse reference, and practical "how to
reach" guidance. This is the **data backbone** for a larger pilgrimage app whose later
phases add geolocation, a nearest-maṭha finder, and an ācārya/purohita directory.

---

## 2. What was done (phase by phase)

1. **Structure research.** Confirmed the text is 235 ślokas in four directional
   sections, arranged as a clockwise pradakṣiṇā: **Paścima (West) → Uttara (North) →
   Pūrva (East) → Dakṣiṇa (South)**, with per-section verse numbering that restarts at 1
   in each section.
2. **Place compilation.** Four research passes (one per section) mined the primary
   translation + commentary site and cross-checked secondary sources, producing a
   structured record per place (name, deity, significance, modern location, confidence,
   sources).
3. **Modern mapping + travel.** Added modern name, state, nearest railhead, and an
   indicative "how to reach" note for each place.
4. **Assembly.** A Python script assembled everything into a single normalized
   `data.json`.
5. **App build.** Generated a self-contained interactive HTML app with the data embedded.
6. **Verification.** Validated the JSON, render-tested the app in a headless browser,
   and confirmed search/filter/sort work.
7. **Enrichment pass (v2).** Extracted **verse numbers** for every place from the full
   English-translation PDF, completed and corrected the West section (added the missing
   *Kumāradhāra* river; identified "Sankaranarayana" as the text's *Kroḍa*), upgraded all
   West entries to high confidence, and re-verified.
8. **Coverage audit.** Programmatically confirmed **no gaps** — every place-describing
   verse in all four sections maps to a place (only the invocation and closing
   benediction verses are unmapped, as they are not places).
9. **Packaging & publish.** Packaged the files in the exact `dge/tirtha/` repo structure;
   they were uploaded to the `bhumandala` repository.

---

## 3. Resources & sources used

**Primary (text + commentary):**

- `tirthaprabandha.wordpress.com` — per-verse English translation and *Guru-Bhāva-
  Prakāśikā* commentary; per-place posts for North, East, South.
- `tirthaprabandha.wordpress.com/.../tirthaprabandha-english-translation-full.pdf` —
  full English translation; primary source for **verse numbers** and the West section.

**Secondary / corroboration:**

- `madhwafestivals.com/2017/02/09/theertha-prabandha/` — enumerated summary; primary
  source for the West list before the PDF pass.
- `sumadhwaseva.com`, `en.wikipedia.org/wiki/Tirtha_Prabandha`,
  `grokipedia.com/page/tirtha_prabandha` — structure and cross-checks.
- `gyanasampat.ecwid.com` (publisher table of contents) — section boundaries.
- Scribd "…107 Holy Kshetras" and ExoticIndia listings — the traditional "107 kṣetras"
  framing.

**Tooling (in the cloud work session):**

- Web research: `WebSearch`, `WebFetch`.
- Five research sub-agents: four for section compilation (W/N/E/S) and one for
  verse-number extraction from the PDF.
- Python 3 for data assembly, CSV export, JSON validation, and the verse-coverage audit.
- Node + Playwright (headless Chromium) for render-testing the app.

> Note: the verse data comes from the translator's posts and the English PDF, **not** from
> collating the original Sanskrit critical edition. High-confidence and internally
> consistent, but not an edition-accurate scholarly collation.

---

## 4. Scripts that were run

All scripts ran in an **ephemeral cloud workspace** (wiped when the session ends). The
*outputs* are what persist — in this chat and now in your repo. The scripts themselves can
be regenerated on request (say the word and I'll commit them under `dge/tirtha/build/`).

| Script | Purpose |
|---|---|
| `build_data.py` | Assembles all 95 place records + verse numbers + corrections into normalized `data.json`; prints counts by direction/type/state. |
| *(inline HTML generator)* | Reads `data.json`, embeds it into a single self-contained `index.html`, and regenerates the CSV. |
| *(JSON validator)* | Confirms the embedded JSON parses and every row has the required keys. |
| *(verse-coverage audit)* | Parses each section's verse ranges and checks for any gap between mapped verses. Result: **no gaps.** |
| `shot.cjs` (Playwright) | Loads the app in headless Chromium, checks card count, runs a sample search + a direction-tab filter, and asserts zero console errors. |

**To regenerate everything** (if you keep the build scripts): run `build_data.py` →
run the HTML generator → open `index.html`. Editing data means editing the record list in
`build_data.py` (or editing `data.json` directly and re-embedding).

---

## 5. Where everything went

- **During the build:** a temporary cloud workspace (not your machine, not your repo).
- **Delivered to you:** `index.html`, `data.json`, `tirtha_prabandha_places.csv`, and a
  ready-to-commit `dge-tirtha.zip`.
- **Now in the repo:** committed under **`dge/tirtha/`** in `github.com/Tribhuvanachar/bhumandala`.
- **Live URL** (GitHub Pages): **`https://tribhuvanachar.github.io/bhumandala/dge/tirtha/`**

Nothing was ever pushed automatically — the cloud session cannot write to GitHub; you
uploaded the files yourself.

---

## 6. File / structural hierarchy

```
bhumandala/
└── dge/
    └── tirtha/
        ├── index.html                    # the app (self-contained; data embedded inline)
        ├── data.json                     # the dataset (backbone; 95 records)
        ├── tirtha_prabandha_places.csv   # same data as a spreadsheet (BOM-UTF8)
        └── README.md                     # short in-folder readme
```

`index.html` is **fully self-contained**: the dataset is embedded inside it, so it works
offline and needs no server or build step. `data.json` is the same data as a standalone
file so other parts of DGE (or the future app) can consume it without scraping the HTML.

### Data schema (each record in `data.json`)

| Field | Meaning |
|---|---|
| `id` | Stable sequential id (1–95). |
| `direction` | `West` / `North` / `East` / `South`. |
| `section` | Full section name, e.g. `Paschima Prabandha (West)`. |
| `verse` | Verse reference within the section, e.g. `V.8-15` (numbering restarts per section). |
| `type` | `Kshetra` / `River` / `Mountain` / `Tirtha` / `Region`. |
| `name_in_text` | Name as in the text (transliteration). |
| `also_known_as` | Other names / spellings. |
| `modern_name` | Current common name. |
| `state` | Modern Indian state. |
| `deity` | Presiding deity / form. |
| `significance` | 1–3 sentence explanation from the text and commentary. |
| `nearest_railway_station` | Nearest verified railhead. |
| `how_to_reach` | Indicative travel note (not live train/bus numbers). |
| `confidence` | `high` / `medium` / `low` — how firmly attested in a Tīrtha Prabandha source. |
| `sources` | List of source URLs for that record. |

### Coverage snapshot

- **95 places** — West 43, North 18, East 18, South 16.
- **Verse-complete:** no gaps in any section; only the West invocation (v1–5) and the
  South benediction (v46–47) are unmapped (they are not places).
- **Confidence:** West all `high` (verse-attested); North/East/South almost all `high`;
  one `medium` (Srikālahasti, mentioned inside another verse). Types: 60 kṣetras, 20
  rivers, 12 tīrthas, 2 mountains, 1 region.

---

## 7. Functionality of the app

- **Free-text search** across name, alternate names, modern name, state, deity,
  significance, section, and **verse number**.
- **Direction tabs** — All / West · Paścima / North · Uttara / East · Pūrva / South · Dakṣiṇa,
  colour-coded.
- **Filters** — by type, by state, by confidence.
- **Sort** — text (pilgrimage) order, name A–Z, state, or type.
- **Cards** show: verse chip, type, confidence, modern name + state, deity, the
  significance passage, a "How to reach" panel (nearest railhead + route), and source
  links.
- **Responsive** (single column on phones), **dark theme**, **works offline** (no network
  or backend needed).

---

## 8. Pending / roadmap

**Data completeness**

- **Sub-tīrtha granularity.** A few verses name clustered sub-tīrthas currently folded
  into their parent (e.g. the four tīrthas at Pajaka — Paraśu/Dhanus/Gadā/Bāṇa; the
  Sāvitrī/Gāyatrī/Sarasvatī/Pāpanāśinī tīrthas at Kanyākumārī; the Navavṛndāvana at
  Anegondi). Splitting these into their own rows would make it place-by-place exhaustive
  and push the count toward/past the traditional **107**.
- **Srikālahasti** has no standalone verse (mentioned within the Suvarṇamukhī verse) —
  left blank rather than fabricated.
- **Scholarly collation.** For edition-accurate śloka text and numbering, cross-check
  against a printed Sanskrit critical edition.

**Geo / travel**

- Add **latitude/longitude** to each record — unlocks maps and the "nearest kṣetra to me"
  feature.
- Replace indicative travel notes with a **live train/bus lookup** integration.

**Future app phases (as originally scoped)**

- **Geolocation** to guide a user from where they are.
- **Nearest maṭha finder** — Mādhwa / Uttarādi / Vyāsarāja / Rāghavendra Swāmi maṭhas.
- **Ācārya & purohita directory** — contacts, addresses, services offered, charges,
  reviews. (Best backed by a database, not static JSON — see integration note below.)

**UI**

- Add a **link/card from the DGE homepage** (`dge/index.html`) to `/dge/tirtha/`.
- Optionally restyle the app to match DGE's existing theme tokens.

---

## 9. How to integrate with the DGE project

DGE is a **static GitHub Pages site** (no backend), so the design here matches that: the
data is plain JSON and the app is a single static HTML file. Concretely:

1. **Link it in.** Add an entry to the DGE homepage (`dge/index.html`) pointing to
   `dge/tirtha/`. This is the one manual UI stitch; I can prepare that edit once you tell
   me where in the homepage the link/card should sit (it's a sophisticated single-page app,
   so I didn't want to edit it blind).
2. **Shared data layer.** `data.json` is the contract. Any other DGE view can `fetch()`
   it; keep the schema in §6 stable and additive (add fields, don't rename) so consumers
   don't break.
3. **Match the theme.** DGE uses CSS custom properties (e.g. `--card-bg`, `--card-border`,
   `--accent-red`). The Tīrtha app uses its own variables; to make it feel native, map its
   colours onto DGE's tokens. I can do this restyle on request.
4. **Multilingual (Kosha alignment).** DGE's Kosha work is multilingual (Sanskrit ⇄
   Kannada/English/…). To align, add language fields to each record (e.g. `name_kn`,
   `significance_kn`) and a language toggle in the app. The schema is ready for this — it's
   purely additive.
5. **Geo + maps.** Once lat/long is added, a lightweight map (e.g. Leaflet from a CDN) can
   plot the kṣetras and support geolocation — still fully static.
6. **Dynamic data (later phases).** The ācārya/purohita directory and reviews need
   create/update, so they belong in a datastore rather than static JSON. DGE already has a
   **Firebase** setup (`dge/FIREBASE_SETUP.md`); that is the natural home for the directory
   and review data, with the static app reading from it.

### Keeping it updated

- **Small edits:** edit `data.json` directly and re-embed it into `index.html` (or ask me
  to regenerate both from the build script).
- **Structural changes:** edit the record list in `build_data.py` and re-run the build.
- Commit changes under `dge/tirtha/`; GitHub Pages redeploys automatically.

---

*Prepared as a project record for the DGE / Bhūmaṇḍala pilgrimage-app effort.*
