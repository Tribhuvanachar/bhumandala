# DGE Project Status
_Last updated: 8 Aug 2026 (Claude Code session) — folded in five feature drops built by a parallel Cowork session (Tirtha, Guru Parampara, Kosha, Ashtadhyayi, and a not-yet-merged Sarvamoola+Search branch), fixed a real regression where one zip-sync had silently deleted another's script tag, cleaned up duplicate/stale artifacts, and reorganized docs. This file should be re-saved every time a significant phase completes — don't let it drift again. If starting a fresh Claude conversation, paste this whole file as the first message for full context recovery._

## What this is
**Digital Grantha Engine (DGE)** — a Sanskrit digital library reader app. Part of the Sarvamoola Digitisation & Educational Project. Static site on GitHub Pages, no backend, no build step (one deliberate, isolated exception: Firebase for optional user accounts, see below).

- **Repo:** `github.com/Tribhuvanachar/bhumandala`
- **Live site:** `tribhuvanachar.github.io/bhumandala` (app at `/dge/`)
- **Owner/admin:** goes by "3BU1" / "Daasoham" in on-site credit text and commits
- **Current app version:** check `?v=` on script tags in `dge/index.html` (bump on every deploy — currently v4.58.0 as of this writing, but treat the live file as ground truth, not this number)

## ⚠️ Immediate action item — exposed credential
A GitHub personal-access-token was pasted into the chat during the Guru Parampara Cowork build session (per that session's own `BUILD_REPORT.md` §9). It was not usable from that sandbox, but it is sitting exposed in that session's conversation history. **Revoke it on GitHub now** if this hasn't been done yet, regardless of everything else in this document.

## Non-negotiable conventions (unchanged from project start)
1. Cache-busting via `?v=VERSION` on every script/link tag, bumped on every delivery that touches any file. `index.html` itself is not cache-busted — but it stamps its own version (`<meta name="dge-html-version">`) which `core.js`'s `DGE_EXPECTED_HTML_VERSION` checks against; **bump both together** on any change to `index.html`'s structure, or a stale-cached tab will show a "cached page, tap to reload" banner (or worse, silently misbehave if it predates that mechanism).
2. Zip delivery: only changed/new files, inside a `dge/` folder structure. **Known failure mode, now observed for real (see below): a zip built from a stale local checkout silently reverts whatever changed since that checkout was made, even in files it didn't mean to touch.** Always diff a synced zip against what was live immediately before syncing it, not just against what the zip's author intended.
3. Pre-delivery checks: `node -c` syntax, duplicate top-level identifier scan, HTML div balance, CSS brace balance, dangling reference check.
4. BYOK everywhere: GitHub PAT, Vision/Gemini keys all live in the user's own `localStorage`, never hardcoded, never sent anywhere but directly to the relevant API from the user's own browser.
5. **Licensing: absence of a licence is not permission** — copyright is automatic in essentially every country; an explicit grant is what makes reuse allowed. This project layers one additional rule on top: **the project lead can authorize a specific source for a specific, narrow use on a case-by-case basis**, given DGE's non-commercial/educational nature — this has actually happened (sri-aurobindo.co.in, numeric Ashtaka-mapping data only; several "Unclear"-licensed Kosha dictionaries and Ashtadhyayi commentaries, see their own sections below). What this project does **not** do: treat "no licence" as blanket permission, or treat non-commercial purpose as void-ing an explicit licence's stated terms, as a *general, standing* rule — every use of an unlicensed/ambiguous source is a specific, logged decision, not a default.

## Content currently live (main reader app)
_Ground truth as of this update — checked directly against `library.json` and sample `data.json` files, not assumed:_ **43 of 599** catalog entries are actually populated (`populated: true`); the other 556 are correctly-hidden empty taxonomy stubs. (A pending branch would raise this to 90 — see "Sarvamoola + Global Search" below.)

- **Prahlādakṛta Nṛsiṁha Stotra** (`stotras/pns`) — 43 shlokas, 5 commentaries. Fully populated, the original reference text for the whole project.
- **All four Vedas — 42 populated granthas total**, all carrying accented `samhita_patha`/`pada_patha`, `chandas`, `svara`, `rishi`, `devata`, plus (Ṛgveda) six European-language commentaries. Full detail in `veda_toolkit/README.md`.
  - **Ṛgveda** (Śākala) — all 10 maṇḍalas, 10,552 mantras — **now also carries the traditional Aṣṭaka.Adhyāya.Varga.Ṛcā reference** (`ashtaka_ref` in the data, exposed as `ashtakaId` on each shloka) alongside the standard Maṇḍala.Sūkta.Ṛk addressing. Regenerated from `deeplearningforsanskrit/rigveda-samhita`'s data and independently cross-checked (10,552 total riks, 64 adhyayas, 2,024 vargas — all matched). No UI surfaces this yet (no quick-jump-by-Ashtaka, no display in the reader) — it's data only, waiting on a follow-up feature.
  - **Atharvaveda, Śukla Yajurveda, Sāmaveda, Taittirīya** — see previous entries, unchanged this update.
- **Full taxonomy scaffold** exists for the rest of the planned corpus, `populated: false` gated. **This is still the actual bulk of the project.** The namesake corpus — Madhvācārya's own Sarvamoola Grantha — has an import ready to merge (see below) but nothing on `main` yet.

## New: five feature drops from a parallel Cowork session (8 Aug 2026)

A separate Cowork session built five substantial additions in parallel, delivered as zips synced directly onto `main` via the admin panel (plus one branch, not yet merged). This session reviewed, integrated, fixed a real regression, and cleaned up all five. Status of each:

### 1. Guru Parampara (`dge/guru-parampara/`) — ✅ live
210 figures across 19 Madhva/Dvaita lineages, three self-contained views (2D collapsible tree, 3D radial showcase, a live data-completeness tracker), single source of truth `data/parampara.json`. Reachable from the toolbar's new 🧭 **Explore** popup. Field completeness ~61% overall — thinner in Śrīpādarāja/Vyāsarāja-Sosale/Kāśī middle chains (not published in accessible sources; would need a maṭha's own printed succession records or B.N.K. Sharma's book to close). Docs: `guru-parampara/BUILD_REPORT.md`, `guruparampara.md`, `reference.md`, `brindavana_image_manifest.md` (68 shrines → Wikimedia Commons search links, for sourcing freely-licensed photos — none were embedded, by design).

### 2. Tīrtha Prabandha (`dge/tirtha/`) — ✅ live
95 holy places from Śrī Vādirāja Tīrtha's pilgrimage compendium, verse-referenced, searchable/filterable/sortable, self-contained (data embedded + standalone `data.json`). Reachable from the same 🧭 **Explore** popup. Pending: sub-tīrtha granularity (a few verses name clusters of 2-4 places folded into one row today), lat/long for maps, and eventually a dynamic ācārya/purohita directory (would use the existing Firebase setup, not static JSON). Docs: `tirtha/README.md`, `tirtha/BUILD_NOTES.md`.

### 3. Aṣṭādhyāyī (`dge/ashtadhyayi.html` + `dge/js/ashtadhyayi.js`) — ✅ live
Pāṇini's sūtrapāṭha (3,962 sūtras) with four classical commentary layers (Kāśikā, Nyāsa, Bālamanoramā, Tattvabodhinī) — toggle/compare view, 6-script transliteration, BYOK Gemini tutor grounded on whichever commentaries are open. Reachable from the 🧭 **Explore** popup. **Licence status: the four commentaries are tagged `licence: verify` in their own data** — they came from the project lead's own StarDict dictionaries, not yet confirmed against a public source; resolve before treating this as fully cleared (email the curator, or replace/remove a layer if it turns out restricted). Missing layers (Siddhānta-Kaumudī, Mahābhāṣya, Vasu's English) have UI chips already waiting; add via `DGE_Ashtadhyayi_importer.ipynb`. Doc: `DGE_Ashtadhyayi_FULL_DOCUMENTATION.md`.

### 4. Kosha (`dge/js/kosha.js` + `dge/kosha_toolkit/`) — ⚠️ live, sample data only
Multilingual dictionary lookup — floating **कोश** button, fuzzy SLP1 headword search across Devanagari/IAST/HK/ITRANS/Kannada input, cross-language translate pivot (BYOK Gemini). **Found and fixed a real regression during integration: a later zip sync (Guru Parampara's) had silently deleted the `<script src="js/kosha.js">` tag a prior sync had just added — Kosha was completely non-functional on the live site until this was caught.** Currently running on the **loadable sample** (10 dictionaries, common-word buckets, ~63 MB unpacked) rather than the full dataset — see "Kosha full-scale ingestion" below for the path to the real ~436 MB / 503K-headword set from the project lead's local 2.3 GB dictionary collection. Licensing: Cologne-sourced dictionaries (MW, Apte, Benfey, Macdonell, MW reverse) are CC-BY-SA 4.0, cleared with attribution; several Sanskrit–Sanskrit koshas and the Kannada bridge dictionary (`shabdArtha_kaustubha`) have **no explicit licence** — included per the case-by-case authorization above, with full provenance/attribution stamped into every entry and an "Unclear" badge shown in the UI (nothing is presented as cleared). Docs: `kosha_toolkit/README.md`, `kosha_toolkit/LICENSING.md`, `kosha_toolkit/TECHNICAL_REPORT.md`.

### 5. Sarvamoola Grantha import + global corpus search — ⏳ NOT merged, separate branch
Branch `cowork/sarvamoola-and-search` (off `main` @ `b6d2a14`, before the other four drops). Imports 38 works + Nyāyasudhā of Madhva's Sarvamoola Grantha (47 layers, 14,331 reading units after a mūla+bhāṣya pairing pass) from anandamakaranda.in, would raise populated catalog entries from 43 to 90, and adds a corpus-wide, sandhi/spelling-tolerant search (🔎 / Ctrl-Cmd-K) with a prebuilt static index (~59 MB, 1,332 shard files). **Needs a dedicated review pass before merging** — 1,390 changed files in one commit is too large to fold in casually alongside everything else in this update. Doc: `DGE_SARVAMOOLA_SEARCH_HANDOFF.md`. Its own licensing note: anandamakaranda.in content used under the same non-commercial/educational basis, with `source_url` recorded per import.

### Cleanup done during integration (this session)
- Removed two stale, unpopulated placeholder catalog entries (`ancillary/vyakarana/paniniya_vyakarana/{ashtadhyayi,kashika_vritti}`) now superseded by the real, populated `vyakarana/ashtadhyayi/*` data.
- Removed `dge/_PROPOSED/` (a scratch taxonomy proposal already fully applied to the real `taxonomy.json`).
- Removed duplicate copies: `dge/BUILD_REPORT.md` (kept the one in `guru-parampara/`), `DGE_Kosha_deliverables/kosha.js` (kept the one in `js/`).
- Moved feature-specific docs to live with their feature (`BUILD_NOTES.md` → `tirtha/`) or into a new `kosha_toolkit/` folder mirroring the existing `veda_toolkit/` convention (README + importers + licensing doc, rather than a loose `DGE_Kosha_deliverables/` grab-bag).
- Consolidated three separate toolbar icons (Guru Parampara's existing 🪷, plus what Tirtha/Ashtadhyayi each needed) into one **🧭 Explore** popup — same reasoning as the existing Display-popup consolidation: several raw icons in a row overflow a phone screen.
- Bumped `index.html`'s version (both the `?v=` script params and the `dge-html-version`/`DGE_EXPECTED_HTML_VERSION` pair) to 4.58.0.

## Kosha full-scale ingestion (project lead's ~2.3 GB dictionary collection)
The import pipeline already exists and is proven (`kosha_toolkit/importers/`) — it produced the current sample from the same kind of source. What's needed to go from sample to full dataset:
1. Run `kosha_toolkit/importers/DGE_Kosha_import.ipynb` in Google Colab, pointed at the extracted 2.3 GB `dict.zip`.
2. It auto-discovers every dictionary (`.ifo`-based), clones the public Cologne-licensed set, and downloads a `dge/`-rooted output zip.
3. Unzip over `dge/data/koshas/`, replacing the sample; commit; bump `js/kosha.js`'s `<script>` tag version in `index.html`.

Expected result per the original build: **10 dictionaries, 503,171 headwords, 655,206 senses, ~436 MB across ~24,600 files.** This can't be run from this session directly — it needs the actual 2.3 GB file, which isn't reachable from this sandbox (no access to the project lead's Google Drive, and 2.3 GB is impractical to move through this environment's network restrictions regardless). **This is a task for the project lead to run in Colab** (or hand to a fresh Cowork session with the `dict.zip` attached), then upload the output the same way the sample arrived.

## Repo size / restructuring proposal
GitHub's practical ceiling is roughly ~1 GB before a repo becomes unwieldy (clone time, CI, the web UI), with a hard 100 MB per-file limit without Git LFS. Current state and trajectory:

| Component | Size | Repo today |
|---|---|---|
| Everything currently on `main` (`dge/`) | ~115 MB on disk | ✅ in |
| Kosha, full dataset (once ingested) | ~436 MB | not yet — sample (~63 MB) is in |
| Sarvamoola + search index (pending branch) | ~59 MB (search index alone) | not yet — separate branch |
| **Projected total once everything lands** | **~610 MB** | — |

Still under 1 GB, but growing, and every one of these large pieces is **explicitly flagged by its own build docs as a regenerable build product**, not hand-maintained source — the Kosha dataset is generated from `dict.zip`, and the search index is generated from `build_search_index.py`. That's exactly the kind of content that benefits from living separately from the code + curated text that actually needs day-to-day editing.

**Proposal:** keep `bhumandala` focused on app code + curated grantha text (Vedas, Sarvamoola, Ashtadhyayi, Tirtha, Guru Parampara — all comfortably small, tens of MB at most). Move the two large, regenerable datasets — the full Kosha dataset and the search index shards — into a **separate data repo** (e.g. `bhumandala-data` or similar), fetched by the main site's JS via a plain cross-origin `fetch()` (GitHub Pages serves any public repo's raw files with CORS-friendly headers) or `raw.githubusercontent.com`. This keeps the main repo's clone/CI/history fast indefinitely, and either dataset can independently grow toward its own multi-GB ceiling without threatening the other. **This needs the project lead's decision before executing** — creating a new repo and moving data across is a real structural change, not something to do silently.

## Architecture — main reader app (`dge/`)
Modular classic scripts, shared global scope, loaded in order via `<script>` tags. Key modules:

| File | Owns |
|---|---|
| `config.js` | `appConfig`, `SHLOKA_EXTRA_FIELDS`, `SPONSOR_CONFIG`, `KEY_SPONSORS_CONFIG`, `CONTRIBUTORS_CONFIG`, `ADMIN_ACCESS_LEVELS`, `GITHUB_REPO_CONFIG`, `AUTH_CONFIG`, `WHATS_NEW_CONFIG`, `QUICK_SEARCH_ABBREVIATIONS` |
| `core.js` | `initApp()`, chrome rendering, grantha fetch + `dgeNormalizeGranthaData()` (multi-schema adapter), access prompts, force-refresh, quick-jump resolution |
| `render.js` | Card rendering, search, single-view mode, Prev/Next nav |
| `library.js` | Library browser modal, `dgeGoToGrantha()`, quick-jump entry point |
| `admin-editor.js` | GitHub file manager, batch commits, Recent Activity/Undo |
| `user-auth.js`, `user-roles.js` | Firebase auth (Google Sign-In + optional Phone OTP) and superadmin role management — **inert by default**, see `FIREBASE_SETUP.md` |
| `utils.js` | Dev logger (floating/draggable panel), reading-card minimize |
| `kosha.js`, `ashtadhyayi.js` | Standalone, self-injecting/additive feature modules (see above) |
| `audio.js`, `ai.js`, `notes.js`, `snippets.js`, `markers.js`, `search.js`, `filter.js`, `modals.js`, `screenshot.js`, `history.js`, `char-palette.js`, `transliteration.js`, `voice.js`, `state.js`, `dev.js`, `config-editor.js` | As named |

## Major features shipped, in rough chronological order

_(Convert tool, Veda ingestion toolkit, Admin GitHub File Manager, Access control, Data architecture, Rendering/multi-schema support, notable bug fixes, UI/UX, Config Editor, and repo hygiene sections are unchanged from the previous version of this document — see git history for the full text if needed. Newer additions below.)_

### Convert tool (`dge/convert/`, now v0.14.0)
PDF/page-images/URL → Vision OCR → Gemini proofread → Schema Mapper → GitHub push, all resumable via IndexedDB. Recent additions:
- Super-admin-only page selection (`1-10, 15, 20-25`) scoping both OCR and Proofread to the same pages, defaulting to all.
- Gemini model override (fixes hitting a rate-limited default model).
- Missing-page tracking with a "risky, proceed anyway?" confirmation before building a schema with gaps.
- Copy-log button.
- Auto-retry with backoff (3 extra attempts, 5s/15s/45s) on transient OCR/Proofread failures before requiring manual intervention.
- Screen Wake Lock during active runs (stops the phone screen auto-locking mid-run — the most common everyday cause of a run getting backgrounded; switching apps entirely is a hard mobile-browser platform limit no page code can override).
- `navigator.storage.persist()` requested on load, to reduce the chance of the browser silently evicting saved progress under storage pressure.
- A "files with saved progress on this device" hint panel.
- **OCR accuracy tooling**: switched Vision's feature type from `TEXT_DETECTION` to `DOCUMENT_TEXT_DETECTION` (Google's own recommendation for dense document/book pages, not sparse scene text — was using the wrong one); added an optional language-hints field (e.g. `kn` or `kn,sa` for Sanskrit-in-Kannada-script pages, which auto-detect can otherwise misjudge); the raw OCR preview now shows Vision's own per-word confidence per page and highlights specific low-confidence words, so a human review pass can target exactly what's worth checking instead of re-reading every page. This is a real signal, not a substitute for verification against the source — there's still no way to check OCR against ground truth with zero human involvement, since none exists for an unseen scan.
- **Free independent second-opinion OCR** (opt-in checkbox): Tesseract.js (WASM, runs entirely in-browser, no new API key) runs alongside Vision on request, and the preview shows a character-level similarity score plus a word-level diff between the two engines' output. Agreement between two independent engines is a stronger signal than either one's own confidence score. Off by default — roughly doubles per-page OCR time and downloads a language model on first use. Verified with a real (not mocked) Tesseract.js run: real WASM engine, real language data, correctly read a test image and correctly flagged a deliberate mismatch at the right similarity score.

### User accounts (Firebase) — inert by default
`AUTH_CONFIG.enabled: false` in `config.js`. Google Sign-In + optional Phone OTP (flag-gated), Firestore-backed roles, sized for ~1 lakh accounts on Firebase's free/low-cost tier. Nothing user-visible until a superadmin flips the flag and fills in real project credentials — see `FIREBASE_SETUP.md` for cost tables and setup steps.

### Smaller shipped items
What's New / Coming Soon modal, configurable audio source base URL (three-tier override), Quick Search abbreviations (`rv1.1.3`, `pns5` style cross-library jump) — all documented in git history, no open issues.

## Open / pending work

**Pending on the project lead:**
- Revoke the exposed GitHub PAT (see top of this document).
- Decide on the repo-splitting proposal above.
- Run the full Kosha import (Colab notebook + the 2.3 GB `dict.zip`) and upload the result.
- Resolve Ashtadhyayi commentary licensing (`licence: verify` — confirm with the source curator or replace/remove).
- Decide how far to take the Kosha "Unclear"-licensed dictionaries (currently included per case-by-case authorization with attribution — confirm this stands, or narrow to the cleared Cologne core).
- Review and decide on the `cowork/sarvamoola-and-search` branch merge (after this session's own review pass).
- **The biggest gap — content, not code:** 556 of 599 catalog entries are still empty, including the entire namesake Sarvamoola corpus (pending merge above), Purāṇas (102), Itihāsas (56), Sūtras (42), Dāsakūṭa (42), Vyāsakūṭa (18), Smṛtis (18), Pañcarātra Āgama (17), Dharmaśāstra (7).

**Pending on this session / next Claude session:**
- Review `cowork/sarvamoola-and-search` (1,390 files) and prepare it as a proper PR.
- Once Sarvamoola/search merges: re-run/extend `build_search_index.py` to include Ashtadhyayi (should be automatic, standard schema) — Kosha stays separate (bespoke data shape) unless someone designs a unifying pass.
- Optional: merge `kosha_schema_ADDITION.json`/`kosha_taxonomy_ADDITION.json` into `data/schemas.json`/`data/taxonomy.json` if koshas should appear in the normal library browser, not just the floating button.
- A full-corpus indexing pass once Kosha's real dataset and Sarvamoola both exist, matching the original ask: search everything in DGE in seconds. The Sarvamoola branch's `build_search_index.py` is most of this already — extending it is more tractable than starting over.

**Vedic-specific, still genuinely open** (full detail in `veda_toolkit/README.md` §7):
- Accented padapāṭha, ṛṣi/devatā/chandas for Taittirīya — not present in its ITRANS source
- Sāmaveda gāna (melodic notation) — deferred, needs its own accent handling
- Missing śākhās (Rāṇāyanīya flagged as easiest — already numbered in the FourVedas source sheet)
- Audio (recitation) — not sourced for any Veda yet

**Known unresolved bug:**
- `index.html` caching — a stale cached app shell can persist through what most users think of as a hard refresh. The version-check banner (`DGE_EXPECTED_HTML_VERSION`) detects it but can't rescue a tab stuck on a snapshot from before that mechanism existed. No fix implemented.

**Longstanding backlog, still not started:**
- True XML sitemap, IndexedDB migration for the main app, transliteration engine rework, waveform visualization, gapless audio, sponsor payment processing.

## If you're a fresh Claude instance reading this
Read this whole file, `veda_toolkit/README.md` for anything Vedic-content-related, `kosha_toolkit/README.md` for anything Kosha-related. Ask the project lead which specific item they want worked on next rather than assuming — the content gap above is large enough that "next" is a real choice. Verify before proposing, especially for anything involving Unicode/font rendering, external data sources, or licensing — this project has a specific, deliberate rule about unlicensed sources (see "Non-negotiable conventions" above); don't relax it without the project lead's explicit, case-by-case say-so, and don't assume a prior case-by-case authorization for one source extends to a different one.
