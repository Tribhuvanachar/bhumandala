# Guru Parampara — Build Report (what was done, how, and where)

*A plain-language account of the entire task, for the maintainer of the DGE project
(`github.com/Tribhuvanachar/bhumandala`). Companion to `guruparampara.md`, which is the
technical schema/integration reference. This file is the narrative: what happened, what was used,
and what remains.*

- **Deliverable:** a Guru Parampara section for DGE — the Madhva (Dvaita Vedanta) guru lineage.
- **Scale:** **210 figures**, 19 lineages, from Narayana → Madhvacharya → every major matha to the present incumbents.
- **Status:** fully built and staged as `dge/guru-parampara/`. **Nothing was auto-committed to the repo.**
  Delivered to you as a drop-in zip + a git patch to apply yourself (see §8).

---

## 1. What was done — phase by phase

1. **Scoping.** Confirmed the target (DGE's Guru Parampara section), chose depth ("deep core + branch
   skeletons") and the primary view (a collapsible 2D tree). Later added a 3D showcase and a data tracker.
2. **Research (parallel).** Ran multiple research sub-agents, each covering a lineage cluster —
   (a) mula parampara + Madhva + direct disciples, (b) Uttaradi Matha, (c) Vyasaraja / Sripadaraja /
   Raghavendra, (d) the Udupi Ashta Mathas, (e) GSB + peripheral + pre-Madhva mathas. Each returned
   structured notes with per-figure fields and source URLs (saved under `research/`).
3. **Consolidation.** Hand-encoded all figures into one generator script and produced a single
   machine-readable dataset (`data/parampara.json`), with a normalized schema and **auto-computed
   contemporaries** (who overlapped whom, by lifespan/pontificate).
4. **Visual build.** Built three self-contained views (2D tree, 3D showcase, completeness tracker),
   each reading the same JSON, each verified by rendering in a headless browser and screenshotting.
5. **Enrichment pass.** Ran a second round of sub-agents to fill gaps — Brindavana locations,
   purvashrama names, works, death-years, per-figure sources — returned as structured JSON overlays
   and merged deterministically (fill-if-empty, never overwriting curated text). Overall field
   completeness rose to ~61%.
6. **Tracker + docs.** Built the completeness dashboard, a human-readable reference, a Brindavana
   image-sourcing manifest, and the developer handoff notes.
7. **Integration.** Cloned the DGE repo (read-only), placed the section at `dge/guru-parampara/`,
   added one public nav button to `dge/index.html`, committed to a branch, and packaged it for you.

---

## 2. Resources & sources used

**Primary scholarly source:** B.N.K. Sharma, *History of the Dvaita School of Vedanta and Its
Literature* (the standard academic history), plus Narayana Panditacharya's *Sumadhva Vijaya* (the
traditional biography of Madhva).

**Official & community web sources** (per-figure, cited in each node's `sources`):
uttaradimath.org · srsmatha.org / gururaghavendra (Mantralaya) · vyasarajamatha / madhwayati.blogspot.com ·
madhwasakha.com (per-guru pages) · kashimath.org · partagalimath.org (Gokarna) · pejavaramatha.in ·
adamarumatha.com · sriputhige.org · kaniyoormatha.org · shivallibrahmins.com · sumadhwaseva.com ·
hindu-blog.com · and the relevant Wikipedia articles (which themselves largely cite B.N.K. Sharma).

**Tooling:** Python 3 (data build + doc generation), D3 v7 (2D tree, **inlined** into the file — no CDN),
a hand-written canvas 3D renderer (no three.js, no libraries), Playwright + headless Chromium (render
verification & screenshots), and git (clone + branch + patch).

**No third-party photographs were downloaded or embedded** (copyright). Instead, a manifest of 68
shrines with Wikimedia Commons search links is provided for you to source freely-licensed images.

---

## 3. Scripts that were run

| Script | What it does |
|---|---|
| `data/build_data.py` | **Source of truth.** Encodes all 210 figures + guru links, applies the enrichment overlays, computes contemporaries, and writes `data/parampara.json`. Prints a validation line (roots / orphans / counts). |
| `data/enrich_*.json` (×4) | Structured enrichment overlays (Raghavendra, Uttaradi, Vyasaraja+Sripadaraja, Ashta Matha+GSB+peripheral), keyed by node id, merged by `build_data.py`. |
| `build_html.py` | Re-embeds D3 + the JSON into the 2D/3D HTML files (makes them self-contained/offline). |
| `gen_docs.py` | Regenerates `reference.md` + the Brindavana image manifest from the JSON. |
| headless verify scripts | Rendered each view in Chromium, checked for JS errors, and captured desktop + mobile screenshots. |
| git (clone / format-patch / zip) | Cloned the DGE repo read-only, staged the section on a branch, exported the patch + drop-in zip. |

**Regeneration order** (after editing data): `build_data.py` → `build_html.py` → `gen_docs.py`.

---

## 4. Where everything went

- **All work was done in an isolated cloud scratch space** (a temporary sandbox for this session),
  then copied into a **local read-only clone** of your repo to form the section folder.
- **Nothing was pushed to GitHub.** An attempt to push was blocked by the sandbox's git proxy, which
  refuses to push to any repository not explicitly attached to the session as a source (a pasted
  personal-access-token cannot override this — the proxy strips it). So the finished branch was
  exported for you to apply (§8).
- **Target location in the repo:** everything lives under **`dge/guru-parampara/`**, plus a single
  1-line addition to `dge/index.html` (a nav button). No other file in the app is touched.

---

## 5. Structural hierarchy (what the section contains)

```
dge/
├─ index.html                     ← +1 line: a public 🪷 nav button linking the section
└─ guru-parampara/
   ├─ index.html                  ← landing page (three cards linking the views)
   ├─ lineage-2d.html             ← interactive collapsible 2D tree (D3 inlined, offline)
   ├─ lineage-3d.html             ← rotating 3D showcase (pure canvas, no libraries)
   ├─ tracker.html                ← data-completeness dashboard (live from the JSON)
   ├─ reference.md                ← consolidated reference: per-lineage tables, works, caveats
   ├─ brindavana_image_manifest.md← 68 shrines → Wikimedia Commons image search links
   ├─ guruparampara.md            ← technical handoff: schema, functionality, regeneration
   ├─ BUILD_REPORT.md             ← this file
   └─ data/
      └─ parampara.json           ← the 210-figure dataset (single source of truth)
```

**Data model (summary).** One JSON with `meta`, `matha_labels`, and `nodes[]`. Each node:
`id`, `name`, `guru` (= id of predecessor / tree parent), `matha`, `tag`, `role`, `purva`, `titles`,
`period`, `b`/`d` (numeric years), `brindavana`, `place`, `works[]`, `contrib`, `contemporaries[]`
(auto-computed), `confidence` (high/medium/traditional), `sources[]`, `note`. The whole set forms one
tree rooted at `narayana`; shared early ancestors appear once and the mathas branch at the two
historical split points (Vidyadhiraja → Vyasaraja; Ramachandra → Raghavendra). Full field docs are in
`guruparampara.md` §3.

---

## 6. Functionality

- **2D tree (`lineage-2d.html`)** — collapsible guru→disciple tree; click to expand a branch, tap a
  name for a detail card (dates, Brindavana, works, contribution, contemporaries), search reveals and
  flies to matches inside collapsed branches, per-matha legend filter, zoom/pan, mobile-friendly.
  Gold ring = present incumbent; dashed ring = traditional/legendary confidence.
- **3D showcase (`lineage-3d.html`)** — rotating 3D radial tree where each matha radiates as its own
  coloured tendril; auto-spin, drag-rotate, pinch/scroll zoom, labels toggle, search "flies" the
  camera to a saint, same detail card. Pure canvas — no external libraries, fully offline.
- **Tracker (`tracker.html`)** — recomputes completeness live from the JSON: overall %, coverage per
  field, per-matha bars colour-graded green/amber/red, and a sortable/filterable field-by-field table
  with a "missing fields" list per saint. It's the live to-do list for extending the data.

---

## 7. Data completeness & what's pending

**Overall field completeness ≈ 61%** (841 / 1,377 applicable data points).

- **Well covered:** core peetha (94%), Uttaradi (86%), Raghavendra/Mantralaya (81%), Palimaru, Sode,
  Pejawara. Dates 94%, Sources 100%.
- **Genuinely thin (flagged red in the tracker):** Sripadaraja middle chain (~34%), Vyasaraja-Sosale
  middle chain (~42%), Kashi middle heads (~46%). These are **not published** in accessible sources —
  closing them needs the mathas' printed succession records or B.N.K. Sharma's book. Lowest-covered
  fields overall: Works (24%), Purvashrama (42%).

**Open items (all optional, none blocking):**
1. **Brindavana photographs** — source decorated + plain images via `brindavana_image_manifest.md`
   (Wikimedia Commons / matha permission), store under `data/images/<id>/`, and add an `image` field
   per node so the detail cards can show them (a clean additive change).
2. **Deepen the thin lineages** — add fields via the `enrich_*.json` overlays (see `guruparampara.md` §5).
3. **Deeper app integration (optional)** — right now the section is a standalone page reached by the
   nav button. If you want it inside the DGE library's own navigation/search model, that's a follow-up.

---

## 8. How to integrate with the DGE project

The section is a **static, self-contained** add-on — it fits DGE's existing static-GitHub-Pages model
with no backend and no build step to *run* it.

**Apply it (Option A — what you chose):**
1. Unzip `dge_guru-parampara_dropin.zip` at the **root of your `bhumandala` checkout**. It writes
   `dge/guru-parampara/` and updates `dge/index.html` (the one nav-button line).
2. Commit & push:
   ```
   git add dge/guru-parampara dge/index.html
   git commit -m "Add Guru Parampara section (Madhva/Dvaita lineage)"
   git push
   ```
   *(Equivalently: `git am < guru-parampara.patch`.)*
3. On your Pages site the section is then live at `…/dge/guru-parampara/`, reachable from the 🪷 button
   on the DGE home toolbar.

**To change or extend the data later:** edit `data/build_data.py` (add an `N(...)` entry or a new
`enrich_*.json` field), then run `build_data.py` → `build_html.py` → `gen_docs.py` to regenerate. The
tracker will immediately reflect the new completeness.

**Editorial decisions baked in (please don't silently revert):** Chitrapur Math is Advaita/Smarta and
is *excluded* from this Dvaita tree; Bhimanakatte/Bhandarkere antiquity claims are flagged as legend;
both of Madhva's date-schemes are recorded; the Mathatraya seniority dispute is shown neutrally.

---

## 9. A note on effort & the GitHub credential

This ran across several research + enrichment sub-agents and multiple render-verification passes; the
token cost lands in the standard Cowork session usage (viewable via the app's usage view). **Security:**
a GitHub personal-access-token was pasted into the chat during the session; it could not be used here
(the proxy blocks it) and should be **revoked** on GitHub — it's exposed in the conversation history.
