# DGE Round 3 · Stream 1 — Global UX delivery notes

Scope: the "Global UX" brief in `dge/COWORK_TASKS_ROUND3.md` (navigation,
close controls, styling consistency, Kosha/toolbar overlap, native-select
restyle). Ten files changed, listed at the end. No files outside Stream 1's
declared scope were touched.

## 1. Breadcrumbs / cross-page navigation
Added a consistent `⌂ DGE › <Section>` strip to every standalone page, with
`⌂ DGE` linking back to the main library (`index.html`). Each strip uses the
host page's own design tokens (`--accent`, `--muted`, `--ink`) so it looks
native to that page rather than introducing a new look.

- `ashtadhyayi.html` — brand turned into `⌂ DGE › अष्टाध्यायी` (home link added; there was none before).
- `tirtha/index.html` — new breadcrumb above the H1 (page had no home nav).
- `library-admin.html` — the loose `॥ Home ॥` icon folded into a proper `⌂ DGE › 🗂️ Library Manager` breadcrumb (removed the now-redundant duplicate home icon).
- `guru-parampara/index.html` — the old `← Back to DGE library` link standardised to the same `⌂ DGE › Guru Parampara` format.
- `guru-parampara/lineage-2d.html`, `lineage-3d.html`, `tracker.html` — these three had **no** way home at all; each now shows `⌂ DGE › Guru Parampara › <Page>` (two links: DGE home + the Guru Parampara hub).

## 2. Missing close / minimize controls (audit)
Audited every modal, popup and floating panel:

- All static modals in `index.html` already carry the `✖ Close` pattern (the "What's New" modal pattern) — no change needed.
- Top-bar and bottom-toolbar popups dismiss on outside-tap / re-tap (existing pattern) — acceptable, left as is.
- Kosha overlay already had a working `✕` — left as is.
- **Gap found & fixed:** the global-search overlay could only be closed by tapping the dim backdrop or pressing Esc — no visible control, and mobile users have no Esc key. Added a visible `✕` button to the panel header, styled to match, wired to the existing `close()`.

## 3. Kosha button + global search overlapping the bottom toolbar
Root cause: both floating buttons sat at `z-index:9998`, **below** the bottom
toolbar's `z-index:9999`, and low enough (`bottom:16px` / `84px`) to fall
inside the toolbar's band — so they rendered behind Filter/Tools.

Fix (in `js/kosha.js` and `js/global-search.js`):
- Both FABs raised to `z-index:10000` (above the toolbar, below modals at 11000).
- Both repositioned **above** the toolbar using the same 126px the body already reserves for it: search 🔎 at `bottom: calc(134px + safe-area)`, Kosha कोश stacked just above it at `bottom: calc(192px + safe-area)`.
- Both overlays raised to `z-index:11000` (modal level) so they sit above the toolbar when open.

**Verified in a real browser (Chromium)** at 393px and 1100px: the search FAB
overlapped the toolbar *before* the fix (`overlaps = true`) and no longer does
*after* (`false`); both FABs now float clear of the toolbar and stack without
overlapping each other, at both widths. Before/after geometry + screenshots on file.

## 4. Native, unstyled `<select>` restyle
Audited every `<select>` in the app:

- `js/global-search.js` script picker (auto / देव / IAST / HK / SLP1) — **this was the bare one.** Restyled to the app look: `appearance:none`, themed `--card-bg` background, `--card-border`, a custom SVG chevron, focus-ring in `--accent-red`.
- Already-themed (left as is): `tirtha/index.html` (type/state/conf/sort), `guru-parampara/tracker.html` (`#fmatha`), `ashtadhyayi.html` (`#dge-modelSel`), `js/user-roles.js`, `js/ai.js` (`.modal-input`).
- **Flagged, intentionally not changed:** `convert/index.html` (`#targetSlugSelect`) is a bare admin utility page with *no* stylesheet at all and its own back-nav; restyling it would mean pulling in `css/main.css` for a super-admin-only tool. Left for a decision rather than guessing — noted here per the brief's "flag, don't guess" instruction.

## 5. Project-wide styling consistency
Both self-injecting overlays (Kosha, global search) previously hard-coded their
colours via CSS-variable fallbacks whose names **didn't exist** in the app
(`--accent`, `--bg`, `--border`, `--card`, `--muted`, `--hover`, `--chip`,
`--text`), so they never followed the theme. Remapped every one to the app's
real tokens (`--accent-red`, `--bg-main`, `--card-border`, `--card-bg`,
`--muted-text`, `--card-active`, `--text-primary`). Both overlays now theme
correctly across Traditional / Minimal / Vibrant / Dark Glass. No new design
tokens were introduced.

## Cache-busting
Because `js/kosha.js` and `js/global-search.js` changed, the `?v=` query on
every script/style tag in `index.html` was bumped `4.59.1 → 4.60.0` (per the
in-file instruction). That is the *only* change to `index.html`.

## Files changed (10)
```
dge/index.html                       (cache-bust bump only)
dge/js/kosha.js                      (overlap fix + theme tokens)
dge/js/global-search.js              (overlap fix + select restyle + close button + theme tokens)
dge/ashtadhyayi.html                 (breadcrumb)
dge/tirtha/index.html                (breadcrumb)
dge/library-admin.html               (breadcrumb)
dge/guru-parampara/index.html        (breadcrumb)
dge/guru-parampara/lineage-2d.html   (breadcrumb)
dge/guru-parampara/lineage-3d.html   (breadcrumb)
dge/guru-parampara/tracker.html      (breadcrumb)
```

Delivery convention: zip → upload via GitHub web UI (this session's git proxy
can't push to the repo). Start from a fresh `git pull origin main` before
applying, per the Round 3 header.
