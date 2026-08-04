# DGE Project Status
_Last updated: this file should be re-saved via the admin editor every time a significant phase completes. If starting a fresh Claude conversation, paste this whole file as the first message for full context recovery._

## What this is
**Digital Grantha Engine (DGE)** — a Sanskrit digital library reader app, currently hosting the *Prahlādakṛta Nṛsiṁha Stotra*. Part of the Sarvamoola Digitisation & Educational Project. Static site on GitHub Pages, no backend, no build step — plain HTML/CSS/JS only.

- **Repo:** `github.com/Tribhuvanachar/bhumandala`
- **Live site:** `tribhuvanachar.github.io` (app lives at `/dge/`)
- **Owner/admin:** goes by "3BU1" in on-site credit text
- **Current app version:** see `?v=` query string in `dge/index.html` script tags (bump on every deploy)

## Non-negotiable conventions
1. **Cache-busting:** every `<script src="js/X.js?v=VERSION">` and `<link href="css/main.css?v=VERSION">` in `index.html` — bump VERSION on every single deploy that touches any file. `index.html` itself is NOT cache-busted (browsers/CDN can cache it) — if a fix "isn't showing up," suspect a stale `index.html` before suspecting the code.
2. **Zip delivery:** only changed/new files, inside a `dge/` folder structure, filename `dge.zip` (lowercase). Never the whole project unless explicitly asked.
3. **Before every delivery:** JS syntax check every file (`node -c`), check for duplicate top-level `const`/`let`/`class` across files (shared global scope, no modules), HTML `<div>` open/close balance, CSS `{`/`}` balance, dangling function-reference check.
4. **BYOK pattern everywhere:** AI provider keys (Gemini/OpenAI/Claude), the admin's GitHub PAT, and the Vision/Gemini keys in the Convert tool are all stored in the *user's own* `localStorage`, used only in fetches from *their own* browser. This is why it's safe despite being "client-side secrets" — nobody else's browser ever has them.
5. **Privacy/security block on child safety, weapons, etc.** — standard Claude guardrails apply throughout; nothing in this project has touched those areas.

## Architecture — main reader app (`dge/`)
Modular classic scripts (no bundler), shared global scope, loaded in order via `<script>` tags in `index.html`. Key modules and what they own:

| File | Owns |
|---|---|
| `config.js` | All app-wide config: `appConfig`, `ACHARYA_QUERY_TYPES`, `AI_PROVIDERS`, `FEATURE_FLAGS`, `SHARE_IMAGE_TEMPLATES` (now live-discovered, see below), `SHLOKA_EXTRA_FIELDS`, `SPONSOR_CONFIG`, `CONTRIBUTORS_CONFIG`, `ADMIN_ACCESS_LEVELS`, `GITHUB_REPO_CONFIG` |
| `state.js` | `nsKey()` namespacing, `marks`/`notes`/`snippets` persistence + migration logic |
| `core.js` | `initApp()`, chrome rendering, resume-last-verse hook |
| `render.js` | Card rendering, search (native-script + diacritic + phonetic-tolerant), commentary view |
| `audio.js` | Playback, speed memory, swipe nav, long-press word lookup, sync highlight |
| `ai.js` | Ask Acharya (multi-provider, checkbox-preset settings, nested follow-up), Settings modal orchestration |
| `admin-editor.js` | Full GitHub file manager (see below) |
| `screenshot.js` | Share-as-image, gold embossed text, template-aware |
| `history.js` | Reading history + quick-jump TOC |
| `char-palette.js` | Long-press diacritic keyboard |
| `modals.js`, `notes.js`, `snippets.js`, `actions.js`, `filter.js`, `search.js`, `voice.js`, `markers.js`, `transliteration.js`, `utils.js`, `dev.js` | As named |

## Major features shipped (don't rebuild these)
- Native-script + diacritic-tolerant + **casual-romanization-tolerant** search (handles "uvacha"/"krishna" typing, not just strict IAST)
- 4 themes, dev logger (`?dev=true`)
- Ask Acharya: Shloka (always full verse) / Word (needs real selection) / Bhashya (per-commentary or general) / Custom (open-ended), checkbox-preset settings UI, nested "Ask Further" inside AI's own output
- Share as Image: **live-discovered** templates from `images/template*.png|jpg` via GitHub API (no hardcoded list — admin just uploads a file named `template-whatever.png`), visual thumbnail picker in Settings, gold-gradient embossed text rendering
- Reading history, swipe next/prev, long-press-word→Word-analysis, quick-jump TOC, floating diacritic keyboard (long-press base letters for variants)
- Configurable extra Shloka Fields schema (Padaccheda/Anvaya/Pratipadartha/Tatparya/Vyakarana/Vrutta/Alankara/CrossReferences) — renders only when both enabled AND present in data
- Sponsor/Expenses section (💝 button under title) + Contributors section — both admin-config-driven, not end-user-editable
- Settings: all sections collapsed by default with a 📌 per-section pin to keep one expanded
- **Admin GitHub File Manager** (🗂️, gated behind `?superadmin=2` in URL, persists via localStorage): browse/upload/rename/move/delete/inline-edit any file, drag-and-drop with auto-scroll, New File (curated extensions), New Folder, Add Image from URL (CORS-limited, honest about it), Upload Folder (preserves structure), **Download folder as .zip** (via JSZip + Git Blobs API for large files)
  - **Access is root-path-restricted per code** via `ADMIN_ACCESS_LEVELS` in config.js — code `2` is locked to `dge/`, cannot reach the repo root, by design

## Known-fixed bugs (do not reintroduce)
- `nsKey()` was missing → marks/notes/snippets never persisted (root cause, fixed early)
- Search compared query against raw Devanagari regardless of active script (fixed — compares against displayed script)
- GitHub Contents API silently omits `content` for files >~1MB (no error!) — any code reading file content must check `file.size === 0` before treating empty content as a failure, and fall back to the Git Blobs API for large files. This caused two separate real bugs before being understood (a data-loss bug in rename, and a false-positive blocking `.gitkeep`/empty files)
- Deleting the file currently open in the admin editor left stale state → later Save could resurrect a deleted file or throw a sha-mismatch error. Fixed: delete now closes the editor if it's the open file.
- Drag-dropping onto the general list background (not a specific folder) constructed a path with a leading slash when at repo root → 422 error. Fixed: background drops only handle OS file uploads now, never internal moves.
- GitHub API listing/tree responses need explicit cache-busting (`no-store` + timestamp param) or the admin panel shows stale folder contents after an edit.
- `.chip-toggle:active { transform: scale() }` was plausibly interfering with native text-selection handle tracking on mobile (geometry shifting mid-touch) — replaced with a background-only active state.

## Convert tool (`dge/convert/`) — separate sub-project, own `window.DGE` namespace
Goal: client-side PDF → page images → Google Vision OCR → Gemini proofreading → DGE-schema JSON, no backend, ever.

- **CORS validated:** confirmed via a real test that Vision API accepts direct browser calls (no backend needed for OCR). A 403 "API not enabled" response proved this — CORS blocks throw before any response is readable at all; getting a real error body back means CORS isn't the obstacle.
- **Status as of this file:** admin has now enabled the Cloud Vision API + billing on their Google Cloud project. Pipeline implementation is in progress — check `dge/convert/CHANGELOG.md` for the latest state, since this file may be written before the pipeline is fully done.
- Design intent: output should map toward the *actual* DGE shloka schema (see Shloka Fields above) wherever the source material supports it, not a generic flat shloka/commentary pair — so output can be dropped into the main app with minimal reformatting.
- GitHub integration is deliberately NOT built into Convert yet — when it is, it should reuse the Contents/Blobs API helpers already in `admin-editor.js` rather than reimplementing them.

## Open backlog (not started, not forgotten)
- Single-shloka "one at a time" view mode with dedicated prev/next
- Share-as-video (template + text + embedded audio) — genuinely complex, needs its own dedicated pass
- Config UI (form-based editing of config.js instead of raw code) — deliberately deferred, real risk of corrupting the file if rushed
- Guru Parampara section — waiting on real lineage content from the admin, won't be invented
- True XML sitemap — waiting on an actual multi-page site structure to justify it
- IndexedDB migration, transliteration engine full rework, waveform visualization, gapless audio, Google Sign-In, sponsor payment processing — all Phase 3/4 items from the original roadmap, untouched

## If you're a fresh Claude instance reading this
Read this whole file before touching anything. Ask the admin which specific item they want worked on next rather than assuming. Preserve every convention above — they exist because of real bugs that already happened once.
