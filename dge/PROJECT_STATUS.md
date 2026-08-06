# DGE Project Status
_Last updated: this file should be re-saved via the admin editor every time a significant phase completes. If starting a fresh Claude conversation, paste this whole file as the first message for full context recovery._

## What this is
**Digital Grantha Engine (DGE)** — a Sanskrit digital library reader app. Part of the Sarvamoola Digitisation & Educational Project. Static site on GitHub Pages, no backend, no build step.

- **Repo:** `github.com/Tribhuvanachar/bhumandala`
- **Live site:** `tribhuvanachar.github.io/bhumandala` (app at `/dge/`)
- **Owner/admin:** goes by "3BU1" in on-site credit text
- **Current app version:** check `?v=` on script tags in `dge/index.html` (bump on every deploy — currently v4.50.0 as of this writing, but treat the live file as ground truth, not this number)

## Non-negotiable conventions (unchanged from project start)
1. Cache-busting via `?v=VERSION` on every script/link tag, bumped on every delivery that touches any file. `index.html` itself is not cache-busted.
2. Zip delivery: only changed/new files, inside a `dge/` folder structure.
3. Pre-delivery checks: `node -c` syntax, duplicate top-level identifier scan, HTML div balance, CSS brace balance, dangling reference check.
4. BYOK everywhere: GitHub PAT, Vision/Gemini keys all live in the user's own `localStorage`, never hardcoded, never sent anywhere but directly to the relevant API from the user's own browser.
5. Standard safety guardrails apply; nothing in this project has touched sensitive areas. One live, explicit exception worth noting: Wisdom Lib, a Sri Aurobindo–affiliated Rigveda aggregator, and a Hindi Ved portal were all considered as sources for chandas/accented-padapatha/commentary and set aside — none had explicit reuse terms. "Not explicit" was treated as "not cleared," consistently.

## Content currently live
- **Prahlādakṛta Nṛsiṁha Stotra** (`stotras/pns`) — 43 shlokas, 5 commentaries (padaratnavali, satyadharmiya, mandanandini, tatparyam, footnotes). Fully populated, the original reference text for the whole project.
- **Rigveda, all 10 maṇḍalas** (`vedas/rigveda/shakala_shakha/samhita/mandala_01`–`10`) — 10,552 mantras, imported from VedaWeb's TEI dataset. See "VedaWeb Rigveda import" below for full detail; a separate, more detailed doc (`VEDAWEB_IMPORT_STATUS.md`) covers this specifically and should be treated as the authoritative source for anything Rigveda-specific.
- Full taxonomy scaffold (~700 placeholder entries) exists for the rest of the planned corpus — empty stubs, not yet populated, correctly hidden from the Library browser until real content lands (`populated: false` gate).

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
- **VedaWeb Rigveda import**: standalone Python script (not part of the live app), run in Colab. Full detail in `VEDAWEB_IMPORT_STATUS.md`. Headline: uses the `eichler` witness for main text (correct sandhi + spelling + standard accent marks, confirmed against real diagnostic output after two wrong guesses — `zurich` and `aufrecht` were both tried and rejected based on evidence). Chandas and accented padapatha remain open/unsolved — see that doc.

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
- Dev logger: now a small floating panel, draggable via a dedicated handle (not the whole header — that caused a tap-vs-drag ambiguity bug that took two attempts to fix properly), has a fullscreen toggle, starts fully closed by default (just a small reopen pill)
- Dropdown clipping: several popups (Access, Commentary/Ask Acharya, font size) were rendering off the left edge of the screen — root cause was reusing right-aligned positioning meant for buttons near the right side of the bar; fixed with a left-aligned variant for early-positioned buttons
- Sponsor section: each item individually toggleable (`enabled: true/false`), new Key Sponsors section (name + contribution note, empty by default, real entries added as confirmed — nothing invented)
- Designed-by credit line: fully configurable and hideable (`showDesignedBy`)
- Force Refresh Content button in the About modal

## Open / pending work

**Rigveda-specific** (full detail in `VEDAWEB_IMPORT_STATUS.md`):
- Chandas (metre) — no licensed/reliable source found yet; computational detection tested and confirmed unreliable
- Accented padapatha — VedaWeb's own padapatha witness has no accents; would need either a better source or a computational sandhi-derivation approach, neither built yet
- English translation/commentary — clean path identified (Griffith/Macdonell/Oldenberg, already in the same licensed VedaWeb data) but not yet built
- Audio — not sourced at all, separate research problem
- Progress-tracking UI (visual grid, per-unit status) — designed conceptually, not built; makes most sense to build alongside the next actual fill operation (e.g. the translation import) rather than retroactively

**Longstanding backlog, untouched since early in the project** (still valid, still not started):
- Config UI (form-based editing instead of raw code) — deliberately deferred, real risk of corrupting config.js if rushed
- Guru Parampara section — waiting on real lineage content from the admin
- True XML sitemap — waiting on real multi-page structure to justify it
- IndexedDB migration for the main app (Convert already uses it), transliteration engine rework, waveform visualization, gapless audio, Google Sign-In, sponsor payment processing

## If you're a fresh Claude instance reading this
Read this whole file, and `VEDAWEB_IMPORT_STATUS.md` if the task is Rigveda-related, before touching anything. Ask the admin which specific item they want worked on next rather than assuming. The conventions and fixed-bugs sections above exist because of real issues that already happened once — some of them twice, from guessing at a fix instead of verifying against real output first. Verify before proposing, especially for anything involving Unicode/font rendering or external data sources.
