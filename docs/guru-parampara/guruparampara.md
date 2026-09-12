# guruparampara.md — Handoff notes for the DGE Guru Parampara section

**Purpose of this file:** to tell the DGE developer / coding agent (Claude Code working on
`github.com/Tribhuvanachar/bhumandala`) exactly what was built here, how it is structured, and
how to merge it into the site under `/dge/` **if and when the maintainer decides to**. Nothing in
this bundle has been committed to the repository. Treat everything as a staged proposal.

- **Compiled:** 2026-08-08 · **Scope:** Madhva (Dvaita Vedanta) guru parampara — **210 figures**
- **Nature:** static, self-contained HTML + one JSON dataset. No backend, no build step required to
  *run* it (build steps are only for *regenerating* it). Fits the existing static GitHub-Pages model.
- **Licence / stance:** non-commercial, dharma-prachara/education/research. Every figure carries
  `sources`. Brindavana **photographs are NOT included** (copyright) — see the image manifest.

---

## 1. What "the script" is, and what you should do

`data/build_data.py` is the **single source of truth generator**. It is a plain Python script that
hand-encodes all 210 figures (their guru links, dates, places, works, etc.), applies the enrichment
overlays, computes each saint's contemporaries, and writes `data/parampara.json`. **You do not have to
run anything to use the deliverables** — `parampara.json` and all the HTML files are already generated
and included. You only run the scripts if you want to *change or extend* the data (see §5).

**Recommended integration path (my suggestion, maintainer decides):**
1. Copy the `data/parampara.json` + the HTML view(s) you want into the repo under, e.g.,
   `dge/guru-parampara/` (proposed folder).
2. Add a nav link from the DGE app to `guru-parampara/index.html` (pick one view as the landing page —
   the 2D tree is the most practical default; link the 3D and tracker as secondary views).
3. Keep `build_data.py` + the `enrich_*.json` overlays in the repo (e.g. `dge/guru-parampara/_source/`)
   so the dataset can be regenerated/extended later. They are dev-time only and never served.
4. Before public launch, resolve Brindavana image licensing via the manifest (see §6).

The views are **framework-free** and collision-free with the rest of DGE: the 2D tree inlines D3
locally (no CDN), and the 3D + tracker use **zero external libraries** (pure canvas / vanilla JS). They
can live in an `<iframe>` or be embedded directly; all CSS is scoped inside each file.

---

## 2. File inventory

| File | What it is | Serve to users? |
|---|---|---|
| `data/parampara.json` | **The dataset** — 210 nodes + metadata. Single source everything reads. | Yes (data) |
| `site/guru_parampara.html` | **2D collapsible lineage tree** (D3 inlined). Click to expand, tap label for detail card, search reveals collapsed matches. Recommended landing view. | Yes |
| `site/guru_parampara_3d.html` | **3D rotating showcase** (pure canvas, no libs). Drag-rotate, pinch-zoom, click node, search-to-fly. | Yes |
| `site/guru_parampara_tracker.html` | **Data completeness tracker** — per-field/per-matha/per-saint fill %, missing-field lists. Recomputes live from the JSON. | Optional (maintainer/dev tool; can also be public) |
| `guru_parampara_reference.md` | Human-readable reference: per-lineage tables, works, corrections/caveats. | As content |
| `brindavana_image_manifest.md` | 68 shrines → Wikimedia Commons search links (decorated + plain). | Dev/curation |
| `data/build_data.py` | Source-of-truth generator (see §1, §5). | No (dev only) |
| `data/enrich_*.json` | 4 enrichment overlays merged by build_data.py (keyed by node id). | No (dev only) |
| `build_html.py` | Re-embeds D3 + JSON into the 2D/3D HTML. | No (dev only) |
| `gen_docs.py` | Regenerates the reference + image manifest from the JSON. | No (dev only) |
| `research/01..09_*.md` | Raw per-figure research notes with source URLs (provenance). | No (archive) |
| `README.md` | Quick bundle orientation. | No |

---

## 3. Data model (`parampara.json`)

```
{
  "meta": { title, subtitle, compiled, node_count, conventions, note, primary_reference },
  "matha_labels": { "<matha-key>": "Display label", ... },
  "nodes": [ Node, ... ]
}
```

**Node** (one object per figure):

| field | type | notes |
|---|---|---|
| `id` | string | stable unique key (used for links & guru references) |
| `name` | string | display name |
| `guru` | string\|null | **id of predecessor = tree parent.** `null` only for the root (`narayana`). |
| `matha` | string | lineage key → colour + label (see `matha_labels`) |
| `tag` | string | one of: `deity`,`sage`,`guru`,`acharya`,`dasa`,`matha`,`scholar` — controls node size & which fields apply |
| `role` | string\|null | e.g. "present incumbent (Uttaradi Matha)" — rendered with a gold ring |
| `purva` | string\|null | purvashrama (pre-monastic) name |
| `titles` | string[] | birudas / alternate names |
| `period` | string\|null | dates as sourced (keeps both variants when they conflict) |
| `b`,`d` | int\|null | numeric birth / death CE (used for the contemporaries overlap calc) |
| `brindavana` | string\|null | resting place / samadhi |
| `place` | string\|null | town/district/state of the brindavana |
| `works` | string[] | principal works |
| `contrib` | string\|null | contribution summary |
| `contemporaries` | string[] | **auto-computed** from lifespan/pontificate overlap — do not hand-edit |
| `confidence` | string | `high` \| `medium` \| `traditional` |
| `sources` | string[] | references |
| `note` | string\|null | caveats (disputed dates, legend flags, etc.) |

**Tree shape:** it is a single rooted tree at `narayana`. Shared early ancestors (whom Uttaradi /
Vyasaraja / Raghavendra each count as their own #1–#7) appear **once**, on the `core` trunk; the
mathas branch at the two historical split points — **Vidyadhiraja Tirtha** (→ Vyasaraja) and
**Ramachandra Tirtha** (→ Raghavendra). To render as a hierarchy, group children by `guru`.

**matha keys:** `mula, core, lay, uttaradi, raghavendra, vyasaraja, sripadaraja, kashi, gokarna,
palimaru, adamaru, krishnapura, puttige, shirur, sode, kaniyooru, pejawara, peripheral, haridasa`.
Colours are defined in the `COLORS` map inside each HTML file — keep them in sync if you re-theme.

---

## 4. Functionality included in each view

**2D tree (`guru_parampara.html`)** — D3 collapsible tidy-tree, horizontal. Initial camera focuses on
Madhva + his fan-out; the legendary mula chain is pannable to the left. Features: expand/collapse,
zoom/pan (mouse + touch), per-matha legend filter, search (reveals & flies to matches inside collapsed
branches), detail side-panel (bottom-sheet on mobile) showing every field incl. computed contemporaries.
Gold ring = present incumbent; dashed node ring = `confidence: traditional`; hollow node = collapsed
(with a hidden-descendant count badge).

**3D showcase (`guru_parampara_3d.html`)** — deterministic 3D radial cone-tree drawn on `<canvas>` with
a hand-rolled perspective projection (NO three.js / no CDN). Each matha radiates as its own coloured
tendril; long single-child chains gently spiral. Features: auto-spin toggle, drag-rotate, wheel/pinch
zoom, labels toggle, matha legend filter, click-for-detail (same card as 2D), search "flies" the camera
to a saint. Fully offline.

**Tracker (`guru_parampara_tracker.html`)** — recomputes completeness live from the JSON, so it never
drifts from the data. Shows: overall % + hero tiles; coverage per field (Dates, Brindavana, Place,
Purvashrama, Works, Contribution, Sources); per-matha bars colour-graded (green ≥80 / amber 50–79 /
red <50, always with numeric labels); and a sortable/filterable **field-by-field table** of all figures
with ✓/✗/– cells and a per-saint "Missing" chip list. Applicability rules are built in (present
incumbents aren't expected to have a Brindavana; deities/mula sages are excluded from tracking).

---

## 5. How to extend or correct the data (regeneration workflow)

Everything flows from `build_data.py` → `parampara.json` → the HTML/docs. Two ways to add data:

- **Add/enrich a figure that already exists:** drop fields into one of the `data/enrich_*.json`
  overlays keyed by node `id` (`{"<id>": {"brindavana": "...", "place": "...", "purva": "...",
  "works": [...], "b": 1650, "d": 1710, "contrib": "...", "sources": ["..."]}}`). The overlay merge is
  **fill-if-empty** (won't clobber curated text) and **unions** sources. Then run the pipeline below.
- **Add a brand-new figure / pontiff:** add an `N("id", "Name", guru="<parent-id>", matha="...",
  tag="acharya", period=..., brindavana=..., ...)` call in `build_data.py` at the right place in the
  chain (set `guru` to its predecessor's id; if inserting mid-chain, also repoint the next node's guru).

Then regenerate (from the bundle root):

```bash
python3 data/build_data.py     # rebuild parampara.json (validates tree: prints roots/orphans/counts)
python3 build_html.py          # re-embed D3 + JSON into site/guru_parampara.html and _3d.html
python3 gen_docs.py            # rebuild reference + image manifest
# the tracker reads the JSON at runtime — just re-embed it the same way build_html does, or
# open site/template_tracker.html and inject data/parampara.json in place of /*DATA*/.
```

`build_data.py` prints a validation line (`roots`, `orphans (bad guru ref)`, `by matha`). **`orphans`
must be empty and there must be exactly one root (`narayana`)** — that guarantees the tree is intact.

---

## 6. Brindavana photos

The maintainer asked for decorated + plain photos of each Brindavana. These are **not bundled**
(third-party copyright). `brindavana_image_manifest.md` lists 68 shrines, each with a Wikimedia Commons
search link (freely-licensed, attributable). Suggested pipeline: pull CC-licensed images from those
links; for shrines with no Commons coverage, request photos from the matha/devotee groups (many permit
non-commercial dharma use on request); store two variants per shrine — `decorated/` and `plain/` — keyed
by the saint's node `id`, and add an `image` / `image_plain` field per node so the detail cards can show
them. (No `image` field exists yet — it's a clean additive extension.)

---

## 7. Completeness status & known gaps (as of this handoff)

Overall field completeness ≈ **61%**. Well-covered: core (94%), Uttaradi (86%), Raghavendra (81%),
Palimaru, Sode, Pejawara. **Genuinely undocumented in public sources** (hence low, and honestly flagged
in the tracker): **Sripadaraja middle chain (~34%)**, **Vyasaraja Sosale middle chain (~42%)**, **Kashi
middle heads (~46%)**. Filling these further needs the mathas' printed succession records or B.N.K.
Sharma, *History of the Dvaita School of Vedanta and Its Literature*. The tracker page is the live
to-do list — sort by % ascending or filter "only incomplete".

## 8. Editorial corrections baked in (do not silently "fix" back)

- **Chitrapur Math is Advaita/Smarta, not Dvaita** — the popular "Vijayadhwaja lineage" link is not
  attested (only shared Saraswat caste ancestry). It is **intentionally excluded** from this Dvaita tree.
- **Bhimanakatte's ~5,000-year and Bhandarkere's antiquity claims are matha legend**, flagged as such.
- **Madhva's dates**: both 1238–1317 (mainstream, used here) and 1199–1278 (older scholarly) are recorded.
- **Mathatraya seniority** (Uttaradi/Vyasaraja/Raghavendra) is shown neutrally, unadjudicated.
- **Akshobhya's brindavana** (Malkhed vs Kudli) and **Vijayadhwaja's dates** are noted as contested.

---

*Questions this doc anticipates from a merging agent: the dataset is one JSON; the views are
self-contained and dependency-free; regeneration is `build_data.py` → `build_html.py` → `gen_docs.py`;
extend via the `enrich_*.json` overlays or new `N(...)` calls; nothing is committed — review before merge.*
