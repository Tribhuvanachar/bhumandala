# DGE Project Status
_Last updated: 7 Aug 2026 (Claude Code session), correcting several sections that had gone stale since 6 Aug ~11:30am — a lot of real progress (all four Vedas, chandas, accented padapatha, translations) happened after that and was never written back here. This file should be re-saved every time a significant phase completes — don't let it drift again. If starting a fresh Claude conversation, paste this whole file as the first message for full context recovery._

## What this is
**Digital Grantha Engine (DGE)** — a Sanskrit digital library reader app. Part of the Sarvamoola Digitisation & Educational Project. Static site on GitHub Pages, no backend, no build step.

- **Repo:** `github.com/Tribhuvanachar/bhumandala`
- **Live site:** `tribhuvanachar.github.io/bhumandala` (app at `/dge/`)
- **Owner/admin:** goes by "3BU1" in on-site credit text
- **Current app version:** check `?v=` on script tags in `dge/index.html` (bump on every deploy — currently v4.57.2 as of this writing, but treat the live file as ground truth, not this number)

## Non-negotiable conventions (unchanged from project start)
1. Cache-busting via `?v=VERSION` on every script/link tag, bumped on every delivery that touches any file. `index.html` itself is not cache-busted.
2. Zip delivery: only changed/new files, inside a `dge/` folder structure.
3. Pre-delivery checks: `node -c` syntax, duplicate top-level identifier scan, HTML div balance, CSS brace balance, dangling reference check.
4. BYOK everywhere: GitHub PAT, Vision/Gemini keys all live in the user's own `localStorage`, never hardcoded, never sent anywhere but directly to the relevant API from the user's own browser.
5. Standard safety guardrails apply; nothing in this project has touched sensitive areas. One live, explicit exception worth noting: Wisdom Lib, a Sri Aurobindo–affiliated Rigveda aggregator, and a Hindi Ved portal were all considered as sources for chandas/accented-padapatha/commentary and set aside — none had explicit reuse terms. "Not explicit" was treated as "not cleared," consistently.

## Content currently live
_Ground truth as of this update — checked directly against `library.json` and sample `data.json` files, not assumed:_ **43 of 601** catalog entries are actually populated (`populated: true`); the other 558 are correctly-hidden empty taxonomy stubs.

- **Prahlādakṛta Nṛsiṁha Stotra** (`stotras/pns`) — 43 shlokas, 5 commentaries (padaratnavali, satyadharmiya, mandanandini, tatparyam, footnotes). Fully populated, the original reference text for the whole project.
- **All four Vedas — 42 populated granthas total.** This grew a lot past what `VEDAWEB_IMPORT_STATUS.md` describes (that doc now only covers the *first* Rigveda-only pass and is stale on the "open items" front — see the correction note at its top). Live now:
  - **Ṛgveda** (Śākala) — all 10 maṇḍalas, 10,552 mantras
  - **Atharvaveda** (Śaunaka) — all 20 kāṇḍas, 5,977 mantras
  - **Śukla Yajurveda** (Vājasaneyi Mādhyandina) — full saṃhitā, 1,975 mantras
  - **Sāmaveda** (Kauthuma) — pūrvārcika + uttarārcika, 1,875 mantras
  - **Taittirīya** (Kṛṣṇa Yajurveda) — all 7 kāṇḍas of saṃhitā + Brāhmaṇa + Āraṇyaka
  - Every populated Vedic mantra now actually carries **accented `samhita_patha` AND accented `pada_patha`, `chandas`, `svara`, `rishi`, `devata`**, plus (Ṛgveda) six European-language `commentaries` (Griffith/Macdonell/Oldenberg/Geldner/Grassmann/Elizarenkova) — confirmed by reading real `data.json` records, not the metadata claims. The "chandas unsolved" / "accented padapatha unsolved" / "translation not yet built" items in `VEDAWEB_IMPORT_STATUS.md` are **no longer true** — see `veda_toolkit/README.md` §1–4 for how they actually got solved (a cross-validated spreadsheet source, 96.61% match against the original VedaWeb text).
- **Full taxonomy scaffold, 601 entries total** exists for the rest of the planned corpus — correctly hidden from the Library browser until real content lands (`populated: false` gate). **This is the actual bulk of the project and is still 0% populated**: `sarvamoola_grantha` (120), `puranas` (102), `itihasas` (56), `ancillary` (55), `sutras` (42), `dasakuta` (42), `vyasakuta` (18), `smritis` (18), `pancharatra_agama` (17), `dharmashastra` (7). Worth being explicit about: the project's namesake corpus — Madhvācārya's own Sarvamoola Grantha — hasn't had a single text populated yet.

## Architecture — main reader app (`dge/`)
Modular classic scripts, shared global scope, loaded in order via `<script>` tags. Key modules:

| File | Owns |
|---|---|
| `config.js` | `appConfig`, `SHLOKA_EXTRA_FIELDS`, `SPONSOR_CONFIG`, `KEY_SPONSORS_CONFIG`, `CONTRIBUTORS_CONFIG`, `ADMIN_ACCESS_LEVELS`, `GITHUB_REPO_CONFIG` |
| `core.js` | `initApp()`, chrome rendering, grantha fetch + `dgeNormalizeGranthaData()` (multi-schema adapter), access prompts, force-refresh |
| `render.js` | Card rendering, search, single-view mode, Prev/Next nav |
| `library.js` | Library browser modal, `dgeGoToGrantha()` |
| `admin-editor.js` | GitHub file manager, batch commits, Recent Activity/Undo |
| `utils.js` | Dev logger (floating/draggable panel), reading-card minimize |
| `audio.js`, `ai.js`, `notes.js`, `snippets.js`, `markers.js`, `search.js`, `filter.js`, `modals.js`, `screenshot.js`, `history.js`, `char-palette.js`, `transliteration.js`, `voice.js`, `state.js`, `dev.js` | As named, unchanged in scope from original build |

## Major features shipped, in rough chronological order

### Content pipeline
- **Convert tool** (`dge/convert/`, v0.9.0): PDF → Vision OCR → Gemini proofread (chunked, resumable via IndexedDB) → Schema Mapper → GitHub push. Also supports **URL import** (MediaWiki raw-text fetch, e.g. anandamakaranda.in) which skips OCR entirely. Access-gated behind super admin at the page level (not just a hidden icon — closes a real gap where the tool was reachable by direct URL regardless).
- **Veda ingestion toolkit** (`dge/veda_toolkit/`, standalone Python, run in Colab — not part of the live app). Full detail in `veda_toolkit/README.md`, which is now the authoritative doc for this pipeline (supersedes `VEDAWEB_IMPORT_STATUS.md`'s "open items" section — that doc covers only the earliest Rigveda-only pass). In order:
  1. First pass imported just the Ṛgveda from VedaWeb's TEI dataset, using the `eichler` witness for main text (correct sandhi + spelling + standard accent marks, confirmed against real diagnostic output after two wrong guesses — `zurich` and `aufrecht` were both tried and rejected based on evidence).
  2. A second, independent source (`FourVedas.xlsx`, the VedaKosh digitisation spreadsheet, 8+ years of volunteer effort) was cross-validated against that live VedaWeb text — 96.61% exact match across all 10,552 Ṛgveda mantras, every sampled mismatch a known edition variant, not an error — and then trusted to import **chandas, accented padapatha, and all four Vedas** (previously listed as open/unsolved; they aren't anymore).
  3. Taittirīya (Kṛṣṇa Yajurveda) imported separately from ITRANS `.itx` files with a different admin's permission-cleared transliteration work.
  - Traps worth knowing exist if this pipeline is ever re-run: VedaWeb's hymn `ana` attribute is a global 1–1028 counter, not a sūkta number (caused silent wrong verse IDs past maṇḍala 1); `indic_transliteration`'s Vedic-Extensions codepoints need remapping to core Devanagari (same underlying bug as the app-side fix below); ITRANS files repeat the whole text twice (accented, then stripped) after a marker. Full list in `veda_toolkit/README.md` §5.

### Admin GitHub File Manager
- Batch commits (diff-based; unchanged files skipped via local blob SHA computation)
- Multi-select + batch delete, single commit either way
- **Upload Zip now shows a real preview** (file list, count, size) with explicit Confirm/Cancel before anything commits — was a blind "just uploads" flow before
- Fast whole-repo zipball option (GitHub-generated, single request) offered automatically for large folder downloads, plus parallel (12-way) blob fetching for the existing per-file zip method
- Toolbar reduced from 9 always-visible buttons to 5 + a "More" overflow
- Selection-mode-aware row taps: once one item is selected, tapping anywhere on other rows toggles selection instead of navigating into folders — fixes accidental navigation while multi-selecting
- **Recent Activity panel with one-step Undo** — shows last 5 commits, reverts the most recent one via a new commit (proper git revert semantics, nothing force-deleted from history)

### Access control
- **UI-discoverable 🔑 Access menu** in the main toolbar — Admin Access and Super Admin Access both now work via a tap + prompt(), not just manual URL parameter editing (`?pass=`/`?superadmin=` still work too, unchanged)
- Confirmed and documented: super admin only unlocks the *icons* (🗂️ Admin, 🔄 Convert) — actually doing anything still requires the user's own GitHub token, enforced at the API-call level regardless of admin tier

### Data architecture
- Full taxonomy scaffold generated and deployed, then **cleaned of a significant set of orphaned duplicate categories** that predated the taxonomy work: `dharmashastras`/`pancharatra`/`sarvamoola` (old, unsuffixed) alongside their taxonomy-correct replacements (`dharmashastra`/`pancharatra_agama`/`sarvamoola_grantha`), plus a duplicate flat `vedas/rigveda/mandala_XX` structure alongside the correct nested one. All confirmed as pure empty stubs before deletion — verified programmatically, not assumed.
- `library.json` cleaned to 635 entries, zero duplicates, correct `populated` flags throughout

### Rendering / multi-schema support
- `dgeNormalizeGranthaData()` in `core.js` — adapts the newer `{schema, items:[...]}` shape (used by Rigveda and any future non-stotra content) into the same legacy `{metadata, shlokas:{n:{...}}}` shape every other module already understands, rather than teaching every module a second data shape. This is what actually fixed the "Cannot read properties of undefined (reading 'totalShlokas')" crash.
- Large-grantha auto-single-view: any grantha over 150 shlokas now opens in single-view mode automatically regardless of saved preference (full-list mode was building 2000+ DOM cards synchronously and freezing the page for Rigveda maṇḍalas) — the saved preference itself isn't touched, so small texts opened afterward still honor it
- Vedic content (detected via a `vedicId` field) breaks padas onto separate lines and shows rishi/devata/chandas/padapatha/reference via the existing `SHLOKA_EXTRA_FIELDS` mechanism — no new UI needed, reused what Padaccheda/Anvaya already had

### Bug fixes of note (the kind worth knowing exist, not just "fixed")
- **`appConfig` was never attached to `window`** — a genuine, longstanding, silent bug. Every `window.appConfig.X` read across the whole app was always `undefined`, always falling back to hardcoded defaults regardless of what was actually configured. Only became *visible* when a configured value (designedBy) diverged from its fallback. One-line fix, but retroactively explains why several config changes appeared not to take effect earlier in the project.
- **bfcache**: the app now explicitly opts out of the browser's back-forward cache (empty `pagehide` listener) — without this, navigating between granthas could restore a frozen snapshot of the previous page instead of actually re-running the load script, which looked like stale/wrong content persisting after updates.
- **Cache-busting gaps**: neither the `library.json` fetch nor the grantha content fetch had any cache-busting at all originally. Fixed with timestamp query params; the large-file fetch specifically avoids the stricter `cache: 'no-store'` in favor of just the timestamp, since that combination was making large fetches (2MB+ maṇḍala files) more failure-prone on mobile connections for no added benefit.
- **Scroll jank on Prev/Next** (single-view mode) had three compounding causes, fixed together: (1) the scroll-margin CSS was on the wrong element, (2) Chrome's automatic scroll anchoring was fighting the deliberate scroll call (now disabled via `overflow-anchor: none`), (3) smooth-scroll animation itself was being perceived as reload-like jank on a quick tap (switched to instant).
- **Vedic accent marks rendering as quote-mark-like artifacts**: root cause was the transliteration library using obscure Vedic Extensions Unicode codepoints (`U+1CD3`, `U+1CD9`) that almost no font supports, instead of the standard core-Devanagari-block marks (`U+0951`/`U+0952`) every font has had since Unicode 1.1. Not a font problem — a codepoint problem. Fixed via `dgeSanitizeVedicAccents()`.

### UI/UX
- Dev logger: now a small floating panel, draggable via a dedicated handle (not the whole header — that caused a tap-vs-drag ambiguity bug that took two attempts to fix properly), has a fullscreen toggle, starts fully closed by default (just a small reopen pill). **Update:** the pill now defaults to top-center and re-centers itself every time any popup/modal opens, instead of sitting wherever it was last dragged and covering whatever was just opened.
- Dropdown clipping: several popups (Access, Commentary/Ask Acharya, font size) were rendering off the left edge of the screen — root cause was reusing right-aligned positioning meant for buttons near the right side of the bar; fixed with a left-aligned variant for early-positioned buttons. **This bug class recurred** (Search Scope popup overflowed left, Commentary/Display popups overflowed right after later toolbar changes) — re-fixed 7 Aug; audited all five toolbar popups against real viewport widths this time rather than fixing on inspection alone.
- Sponsor section: each item individually toggleable (`enabled: true/false`), new Key Sponsors section (name + contribution note, empty by default, real entries added as confirmed — nothing invented)
- Designed-by credit line: fully configurable and hideable (`showDesignedBy`)
- Force Refresh Content button in the About modal. Note: this only re-fetches grantha/library *data* (a cache-busting query param), not `index.html`/JS/CSS — it will not fix a stale-cached app shell (see the caching bug below).
- Admin/Super Admin access state is now visible: the 🔑 icon flips to 🔓 and an "ACTIVE" badge marks whichever tier is granted, plus a "Log Out" action to clear it. Previously granted access persisted invisibly in `localStorage` with no on-screen sign beyond other icons quietly appearing.

### Config Editor (form-based settings, `config-editor.js`)
- **This existed already** — the "Config UI" item that used to sit in this doc's backlog as "deliberately deferred" is done and has been for a while; that backlog entry was stale and has been removed.
- Contributors and Key Sponsors sections now have ▲▼ reorder buttons per row.
- Fixed: adding/removing/reordering a row used to silently collapse whichever accordion section was open (open/closed state was hardcoded per section on every re-render instead of tracked) — looked like the whole editor had reset.

### Repo hygiene
- Found and removed a stale duplicate `dge/css/dge/` tree (a full second copy of the whole app, frozen at an old version) — created when a delivery zip (always wrapped in a top-level `dge/` folder, by convention #2 above) was synced while the admin was browsing `dge/css/` in the file manager rather than `dge/` itself. `dgeStripRedundantFolderPrefix` only stripped a leading path segment matching the *currently browsed* folder, not the admin's actual root-locked folder — hardened to check both, so this can't recur regardless of which subfolder a zip gets synced from.
- **Real, unresolved caching issue found**, not yet fixed: `index.html` is deliberately never cache-busted (see convention #1), which means a browser (or GitHub Pages' CDN) can serve a stale cached copy of the entire app shell — including old footer version text — for a long time, survives what most people think of as a mobile "hard refresh" (only a true cache-clear or incognito tab reliably shows the current file). `DGE_EXPECTED_HTML_VERSION` (in `core.js`, checked against a `<meta name="dge-html-version">` tag) was added specifically to detect this and shows a "cached page, tap to reload" banner — but only once a browser has already loaded the current pairing at least once, so it can't rescue a tab that's been stuck on a much older snapshot since before that mechanism existed. No fix implemented yet; flagged as open work below.

## Open / pending work
_Rewritten 7 Aug 2026 against actual repo/data state — the previous version of this section listed several Rigveda items as unsolved that had already been solved, and one UI item as not-started that had already shipped. Verify against real files before trusting any status doc again, this one included._

**By far the biggest gap — content, not code:** the taxonomy scaffold has **558 of 601** catalog entries still fully empty, including the entire namesake corpus. Zero Sarvamoola Grantha (120 entries), Purana (102, including Bhāgavata), Itihāsa (56, Rāmāyaṇa/Mahābhārata), Sūtra (42), Dāsakūṭa (42), Vyāsakūṭa (18), Smṛti (18), Pañcarātra Āgama (17), or Dharmaśāstra (7) texts are populated. Everything shipped recently (Vedic import, UI fixes) has been infrastructure and a side corpus — worth naming plainly so it doesn't stay invisible under a stream of smaller completed tasks.

**Vedic-specific, still genuinely open** (full detail in `veda_toolkit/README.md` §7 — more current than `VEDAWEB_IMPORT_STATUS.md`):
- Accented padapāṭha for Taittirīya — its ITRANS source has none
- Ṛṣi/devatā/chandas for Taittirīya — not present in the ITRANS files either
- Sāmaveda gāna (melodic notation) — deliberately deferred, needs its own numeric-accent handling distinct from ṛk-style accents
- Missing śākhās — most of the traditional 1,131 are genuinely lost, ~12 survive; still absent from DGE: Rāṇāyanīya and Jaiminīya (Sāma), Kāṇva (Śukla YV), Maitrāyaṇī and Kaṭha (Kṛṣṇa YV), Paippalāda (AV), Bāṣkala (RV, fragmentary). **Rāṇāyanīya flagged as easiest** — the FourVedas Sāmaveda sheet already carries its numbering alongside Kauthuma.
- Audio (recitation) — not sourced at all for any Veda, separate research problem
- Progress-tracking UI (visual grid, per-unit status) — designed conceptually, not built; makes most sense alongside the next real fill operation rather than retroactively

**Known unresolved bug:**
- `index.html` caching (see "Repo hygiene" above) — a stale cached app shell can persist through what most users think of as a hard refresh. No fix implemented; would need either a real cache-busting scheme for `index.html` itself or a more aggressive staleness check that doesn't depend on the stale page already having today's detection code.

**Longstanding backlog, still not started:**
- Guru Parampara section — waiting on real lineage content from the admin
- True XML sitemap — waiting on real multi-page structure to justify it
- IndexedDB migration for the main app (Convert already uses it), transliteration engine rework, waveform visualization, gapless audio, Google Sign-In, sponsor payment processing

## If you're a fresh Claude instance reading this
Read this whole file, `veda_toolkit/README.md` if the task is Vedic-content-related (more current than `VEDAWEB_IMPORT_STATUS.md` — see the correction note at that file's top), or `VEDAWEB_IMPORT_STATUS.md` only for its historical witness-selection reasoning. Ask the admin which specific item they want worked on next rather than assuming — the content gap above is large enough that "next" is a real choice, not an obvious default. The conventions and fixed-bugs sections above exist because of real issues that already happened once — some of them twice, from guessing at a fix instead of verifying against real output first. Verify before proposing, especially for anything involving Unicode/font rendering, external data sources, or — as of this update — trusting this file's own "pending work" list without spot-checking `library.json` and a sample `data.json` first.
