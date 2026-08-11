# DGE — Pending Items, Open Issues, and Possible Improvements

Single running backlog for the DGE project. Anything not fully finished —
a real bug, a feature only partly built, a decision waiting on the
project lead, an idea worth doing later — goes here, not just in a
commit message or a chat reply. Update this file in the same commit as
the work that surfaces or resolves an item; don't let it drift from
`PROJECT_STATUS.md`'s narrative history, which stays a log of what
happened, not a todo list.

Conventions: newest items at the top of each section. Strike through
(`~~like this~~`) rather than delete when something's resolved, and
leave one line noting the resolving commit — that way the file stays a
complete record, not just a live queue.

---

## Future feature ideas — designed but not yet greenlit

- **"Intelligence" mode — an opt-in, per-source-toggleable reading overlay
  that auto-detects cross-references live in the text being read, marks
  them with a subtle blinking underline, and shows the reference(s) on
  hover (tap on mobile) in a popup (minimize/maximize/close/copy/share) —
  same UI shell as Ask Acharya, but backed by DGE's own precomputed
  cross-references instead of a live Gemini call.** (Refines and replaces
  the earlier "DGE Interlink" note below with the fuller spec given in a
  follow-up message — kept the investigation, expanded the design.)
  **UX spec as described:** a top-level "Intelligence" toggle, off by
  default; once on, the end user activates individual source toggles
  (Ashtadhyayi Sūtras, Dhātus, Kosha, "Dasara Pada" — *unconfirmed
  transcription, possibly ದಾಸರ ಪದ / Haridāsa devotional compositions
  given the project's Madhva/Sarvamoola context, needs confirming, not
  guessed into code*, Sarvamoola, presumably more sources over time).
  Whatever combination is active, every open page (grantha verses,
  commentaries, Kosha entries alike) gets scanned for matches against
  only the active sources; matched words/phrases get a blinking-underline
  span; hovering (or tapping) shows the matched reference(s) with a link.
  Two concrete examples given, and they are two genuinely different
  detection mechanisms, not one:
  1. **Word/headword matching** (Kosha, Dhātus, presumably Sarvamoola) —
     a displayed word IS a known headword/dhātu; tokenize the rendered
     text, SLP1-fold each token (same technique `kosha.js` already uses
     for search), look it up against the relevant index, mark exact hits.
     Cheap and low-risk (few false positives) since it's exact lookup
     against a known set, not pattern inference.
  2. **Citation detection in running prose** (Sūtras) — a commentator's
     own words *reference* a sūtra, either by explicit number ("१.४.१",
     or spelled out "adhyāya 1 pāda 4 sūtra 1") or, harder, by naming/
     quoting the sūtra itself (e.g. citing "वृद्धिरादैच्" rather than its
     number). Numeric-citation detection is a regex problem against known
     adhyāya.pāda.sūtra patterns, feasible now since (per the investigation
     below) every sūtra already has that exact ID in
     `data/vyakarana/ashtadhyayi/sutrapatha/data.json`. Name/quote-citation
     detection is substring/fuzzy matching of commentary text against the
     3962 sūtras' own `sanskrit_text`, which is real but meaningfully
     harder and needs real precision tuning — a wrong auto-link in the
     middle of someone's commentary is worse than no link, so this piece
     specifically should ship conservative (exact/near-exact matches only)
     rather than aggressive.
  **Performance note (my own addition, not yet discussed with the project
  lead):** doing (1) and (2) as a live, in-browser, full-corpus scan on
  every page render will not scale once Kosha (1.65M headwords) and the
  full sūtra/commentary corpus are all in scope — likely needs the
  per-text annotation computed *once*, offline/at data-build time, and
  shipped as a small per-grantha index (which spans get which links),
  with the live browser doing cheap index lookups rather than corpus-wide
  matching on every view. Worth confirming before committing to an
  architecture.
  Investigated before any of the above was written (grounded, not
  speculative):
  - Ashtadhyayi sūtras already carry a clean, stable, addressable ID
    (`"id": "1.2.27"`, standard adhyāya.pāda.sūtra form, 3962 sūtras) —
    deep-linking straight TO a specific sūtra is feasible today, but
    nothing exposes it yet: `ashtadhyayi.html` has no hash/query-based
    "jump to sūtra by ID" at all. Small, real, immediately useful on its
    own (shareable direct links to one sūtra), and it's the landing side
    of every link this feature would ever produce — natural Stage 1.
  - Kosha entries carry etymology as **unstructured prose**
    (`sense.etymology`, rendered under "व्युत्पत्तिः:" in `kosha.js`'s
    `openEntry()`), not a structured `{sutra_id: ...}` field, which is
    exactly why word->sūtra needs either citation-parsing or (for the
    general case, not just cited-in-etymology cases) a real Pāṇinian
    generative-grammar derivation engine — essentially what ashtadhyayi.com
    itself runs. Existing open-source engines (e.g. the
    sanskrit-coders/sanskrit_parser ecosystem) are worth evaluating to
    wrap rather than building one from scratch.
  **Proposed staged plan, not started:** Stage 1 — sūtra deep-link target.
  Stage 2 — the reusable hover/tap popup component (minimize/maximize/
  close/copy/share, likely sharing code with Ask Acharya's shell) plus
  word/headword-match detection (mechanism 1 above) for Kosha and Dhātus,
  the cheap and low-risk half. Stage 3 — numeric sūtra-citation detection
  in commentary prose (mechanism 2, numeric case). Stage 4 — named/quoted
  sūtra-citation detection (mechanism 2, hard case) and/or a real
  derivation engine, scoped separately once Stages 1-3 prove the UI is
  worth it. Not started — explicitly asked twice now to design and log
  this, not build it, until told to proceed.

- **Batch Gemini-generated padaccheda ("word split") for every library
  text that doesn't have one yet, rate-limited so it doesn't hit API
  limits.** Once library content fills out further, run this as a batch
  job over whatever granthas are missing padaccheda, using the project's
  existing BYOK Gemini pattern (same `user_gemini_key`/model localStorage
  keys already used by Ask Acharya, the Kosha translate pivot, and the
  Convert tool). Needs, not yet designed in detail: (1) a scan step to
  find which granthas/verses actually lack padaccheda already (don't
  regenerate what exists); (2) a batched runner with real rate-limiting/
  backoff — this project already has that exact pattern built twice
  (Convert tool's OCR-page and Proofread-chunk auto-retry-with-backoff;
  VedaVaNi's extraction script's retry/backoff) so it's a known shape, not
  a new problem; (3) a decision on where this runs — a browser admin tool
  where the project lead pastes their own key and reviews output before
  pushing (matches Convert/Audio Admin's existing self-service pattern)
  vs. a GitHub Action (matches VedaVaNi's scheduled/dispatched pattern) —
  each has tradeoffs (browser tool = easier human review before commit,
  more manual; Action = scales unattended, harder to eyeball each result
  before it lands). Not started — noted for future discussion.

## Awaiting a decision or action from the project lead

- **Convert tool: real Gemini 429 bug hunt + fixes, from a real failed run
  (SumadhvaVijayaMoola.pdf resumed, then GitaVivrti.pdf hit "quota
  exceeded" on Proofread after only ~80 pages despite a newly-funded
  prepaid billing account).** Root-caused and fixed several real, distinct
  issues found while investigating, not just the one reported:
  - **`convert/gemini.js` had its own hardcoded `'gemini-3.6-flash'`
    fallback, inconsistent with the shared `js/gemini.js` client's own
    real default (`gemini-2.5-flash`)** — two different hardcoded model
    names for the same purpose in the same app is a bug regardless of
    which (if either) is currently valid. Removed the duplicate; Convert
    now defers entirely to the shared client's default when no model is
    picked.
  - **Model picker is now a real dropdown backed by Gemini's own
    `models.list` API**, not a hardcoded/free-text guess — tap "Load
    available models" (needs the Gemini key filled in first) to fetch the
    live list for that exact key, cached locally so a reload doesn't
    always refetch. An "Other (type below)…" option still allows a raw
    custom name. Directly fixes "must be latest, not old ones" — it now
    always reflects reality for that key rather than a name baked into
    the code.
  - **429 (RESOURCE_EXHAUSTED) is a per-minute/per-day rate window on the
    key, not the prepaid balance** — confirmed this is really how Gemini's
    API works (billing lifts the free-tier cap but doesn't remove
    time-based rate limits). Added: (a) a proactive, configurable delay
    between Proofread chunks (default 3s) so a sequence of successful
    requests doesn't itself burst past a per-minute cap; (b) the retry
    backoff now recognizes a quota-kind failure specifically and waits
    65-120s instead of the 5-45s used for a plain network blip, since a
    short retry on a per-minute cap almost always just hits the same
    window again.
  - **Added an optional "context anchor" field to Proofread** (e.g. "Bhagavad
    Gita Chapter 1, Bhavadipa commentary by Raghavendra Yati") — per the
    project lead's Gemini consultation's second suggestion, passed into
    the prompt to help Gemini resolve ambiguous OCR errors using real
    context. Blank = unchanged behavior. (Vision's `languageHints` via
    `imageContext`, the consultation's other suggestion, was already
    implemented earlier — verified nothing needed changing there.)
  - **Language-hint quick-pick chips** (Sanskrit/Kannada/Telugu/Tamil/
    Malayalam/Bengali/Hindi/English) added beside the language-hints field
    — tap to toggle a code in/out instead of having to know/look up BCP-47
    codes.
  - **The "Files with saved progress" list is now actually clickable** —
    it was pure informational text before (confirmed: the project lead
    expected clicking a filename there to resume it, it did nothing).
    Since OCR/proofread progress is looked up purely by filename+size (not
    the actual File object) and Proofread only ever reads the saved OCR
    text, tapping an entry now resumes Proofread/Review/Push directly
    without re-uploading — re-selecting the real file is only still needed
    to OCR genuinely new pages.
  All verified in a real headless browser (mocked models.list + a seeded
  IndexedDB resume scenario, since neither needs a live Gemini key to
  exercise the actual code paths): model dropdown populates and filters
  out non-generateContent models correctly, custom-model field toggles,
  language chips toggle bidirectionally with the text field, and clicking
  a saved-file entry loads its OCR data and enables Proofread with zero
  file re-selection. Convert tool version 0.16.0 → 0.17.0.

- **`dge/audio-admin.html` built (passkey `AUDIOADMIN`, own session flag,
  deliberately NOT SSO'd with the site's other admin pages) — client-side
  Web Audio port of the `Gita_Studio_Colab.ipynb` shloka-boundary
  detector, plus the vṛtta-based floors requested afterwards. Upload an
  audio file, it decodes in-browser, auto-detects boundaries from silence
  gaps (Otsu-thresholded, same algorithm as the notebook), and now
  additionally: (1) a user-adjustable **minimum shloka length** floor
  (default 10s — below this a "segment" is dropped as noise, not kept, since
  a real chanted verse's vṛtta gives it a physical minimum duration), (2) a
  user-adjustable **minimum gap** floor (default 1.5s — a detected silence
  shorter than this is treated as an in-verse breath and bridged, not kept
  as a real boundary), (3) an optional manual **dB threshold override**
  usable even with auto-detect on, since the auto-computed threshold can be
  too permissive on real (non-studio) recordings. All three are exposed
  directly in the Options section so the project lead can retune and
  re-run without needing another Claude session. Verified against a
  synthetic file with known boundaries (a 0.8s gap correctly bridged, a
  0.5s "blip" correctly dropped, two real ≥10s segments correctly kept).
  **Also verified against the real sample provided (`mangalacharana.mp3`,
  359s)** — finding to flag for the project lead: sweeping the manual dB
  override from -30 to -50 dB, and separately inspecting the raw gap
  lengths at six different thresholds (-18 to -32 dB) directly, found that
  outside the ~5s leading pre-roll before chanting starts, **no gap in this
  recording exceeds ~1.25 seconds even at a lenient -18dB threshold** — this
  particular recording has no real inter-verse silence to detect at all
  (continuous/fluent chanting style, and/or room tone or normalization
  filling any brief pause). This isn't a bug or a tuning gap in the tool —
  no silence-based threshold can split audio that doesn't contain real
  silences. Options if per-shloka splitting of this specific file is still
  wanted: re-record with brief deliberate pauses between verses, or use a
  different technique entirely (e.g. forced alignment against the known
  verse text, or manual boundary marking in the Review table — not yet
  built). ~~Still blocked on pushing anywhere: `Tribhuvanachar/bhumandala-audio-data`
  doesn't exist yet — repo creation is blocked by the same GitHub App
  permission restriction hit earlier for `bhumandala-kosha-data`
  (`403 Resource not accessible by integration`); the project lead needs to
  create it manually (empty repo is fine).~~ Resolved: the project lead
  created the repo. Ready for the project lead to actually test the page
  end-to-end against the real repo now (upload → process → review → push);
  not yet done from this side since it needs the project lead's own scoped
  GitHub token, not something to test with a shared/synthetic one.
  **Follow-up round, answering "where does the audio go / can I download it /
  why does GitHub reject files over 25MB":** (1) added a destination-folder
  default, auto-filled from the uploaded filename (slugified) the first time
  a file is picked, still freely editable — GitHub has no separate
  "create folder" step, any new path just gets created on push; (2) added
  Download for every clip (per-row ⬇), plus "Download all (.zip)" (a small
  hand-rolled store-only ZIP writer, no external library) and
  "Download JSON only" — all work with no GitHub token/repo involved, so
  they're also the fallback when a file is too big to push; (3) switched the
  GitHub push from the Contents API (one small base64 PUT per file — this
  is what was hitting the 25MB-ish ceiling) to the Git Data API
  (blob → tree → commit → ref, all files in one atomic commit), which
  reliably handles files close to GitHub's real ~100MB per-file limit and
  isn't affected by the website's drag-and-drop uploader's separate 25MB
  cap at all. Verified: the whole blob/tree/commit/ref sequence (including
  the empty-repo bootstrap path, since `bhumandala-audio-data` doesn't
  exist yet) against a local mock of the GitHub API — correct call
  sequence, correct fallback to creating the ref when none exists yet.
  **Still an open question, not yet built:** Google Drive as a storage
  target was asked about — a static page can't act as a bridge to the
  project lead's personal Drive without a Google Cloud OAuth client set up
  on their end first (one-time task only they can do); not built until
  they decide if that's worth it over Download + manual placement.

- **`Gita_Studio_Colab.ipynb` uploaded — a genuinely new tool, nothing to
  reconcile against.** Checked: no prior notebook, script, or doc anywhere
  in the repo does anything like this (only existing `.ipynb` is the Kosha
  importer) — unlike the Tīrtha/Ashtadhyayi zips, this isn't a duplicate of
  already-live work. What it does: BS-Roformer vocal separation (optional
  2nd pass) on an uploaded chanting recording, then auto-detects each
  shloka's boundary from the silence gaps (Otsu-thresholded per-recording,
  no manual tuning needed), and exports **either or both** of (a) a
  `shlokas.json` timestamp map (`{id, start, end}` in both seconds and ms)
  against the *whole, uncut* audio file, or (b) individual per-shloka
  clips — the project lead's stated target being the "Bhagwadgeeta/
  Vachanamrut" seek-based playback architecture (single audio file + JSON
  map, player does `audio.currentTime = start`) rather than one-file-per-verse.
  **Directly relevant to an existing open item above**: this is exactly the
  kind of tool that could resolve the VedaVaNi Rigveda per-Sukta-not-per-Rik
  gap, IF real per-rik silence gaps exist in the downloaded Sukta audio
  (untested — the notebook was verified by its author only on a synthetic
  file with known boundaries, not on real VedaVaNi audio). Not yet run
  against anything in this repo. Decide: (1) where this notebook should
  live in the repo (`veda_toolkit/`? a new `audio_toolkit/`?), (2) whether
  to actually try it against a real downloaded VedaVaNi Sukta file to see
  if it can deliver real per-Rik boundaries.

- **Two more delegated coworker deliverables uploaded, not yet checked
  against the live repo** (same pattern as Tīrtha Prabandha below —
  verification requested, in progress):
  - `dge_stream5_ashtadhyayi1.zip` — claims 3 new layers (Siddhānta-Kaumudī,
    Mahābhāṣya, Vasu), a pada-cheda/anvaya panel, and a new
    `ashtadhyayi-admin.html`. **Spot-checked already: all 7 layers' `data.json`
    files (kashika, siddhanta_kaumudi, mahabhashya_patanjali, balamanorama,
    tattvabodhini, nyasa, vasu — 3.4 to 21.6 MB each, real content) and
    `dge/ashtadhyayi-admin.html` already exist live on `main`** — this looks
    like the SAME situation as Tīrtha Prabandha: the delegated session's work
    (or equivalent) is already merged, and this zip may be entirely
    redundant. NOT yet verified: the pada-cheda/anvaya reader panel itself,
    and whether the live admin page's layer count/licence badges actually
    match the zip's claims exactly.
  - `dge_stream3_guruparampara_dropin1.zip` — claims a 10-figure Dāsa
    Paramparā lineage (210→215 nodes), a Brindavana-image curation registry
    (no images embedded, by the delegated session's own admission — couldn't
    reach Wikimedia from its sandbox), and `holy-places-admin.html` seeding
    135 places with a documented export shape for the Tīrtha nearest-finder.
    **Not checked at all yet** — node count, whether `holy-places-admin.html`
    already differs from what's live, whether 135 places overlaps/conflicts
    with Tīrtha Prabandha's 95.
  - **The `?` big picture**: at least 2 of 3 delegated-session deliverables
    checked so far turned out to be full or partial duplicates of work
    already live, because those sessions didn't have the live repo mounted.
    Worth deciding whether future delegated tasks should require pulling
    `main` first (Stream 3's own task update says it did this — "I pulled
    your live `bhumandala` repo to match its exact conventions" — and its
    findings are correspondingly more likely to be genuinely additive).

- **Tīrtha Prabandha — likely duplicate build, needs reconciliation.** A
  separate delegated coworker session (task update pasted 2026-08-10)
  built a *second*, self-contained Tīrtha Prabandha bundle
  (`dge_tirtha_prabandha_bundle1.zip` — `tirtha.html`, `dge/js/geo-finder.js`,
  `dge/tirtha_admin.html`, 39 kshetras, Wikipedia thumbnails, nearest-holy-place
  finder, admin completeness tracker) — built *without* that session having
  the repo mounted, so it doesn't know that `dge/tirtha/` **already exists
  live** with 95 holy places (see PROJECT_STATUS.md "Tīrtha Prabandha —
  ✅ live"). Before merging anything from the new bundle: compare the two,
  decide what (if anything) from the new bundle is genuinely additive
  (the nearest-holy-place finder and the Wikipedia-thumbnail fetch look
  like real net-new features; the 39-kshetra dataset itself is very
  likely a smaller duplicate of the existing 95-place one). Verification
  requested by the project lead, in progress as of this entry — see
  chat for the specific check-list once it's sent.
- Revoke the exposed GitHub PAT (flagged at the top of PROJECT_STATUS.md).
- Decide on the repo-splitting proposal (PROJECT_STATUS.md, "Repo size /
  restructuring proposal").
- Run the full Kosha import (Colab notebook + the 2.3 GB `dict.zip`) and
  upload the result — full corpus build already exists in
  `bhumandala-kosha-data` and has been run once; this item is about the
  *original* local dictionary collection being fully accounted for.
- Resolve Ashtadhyayi commentary licensing (`licence: verify` — confirm
  with the source curator or replace/remove).
- Decide how far to take the Kosha "Unclear"-licensed dictionaries
  (currently included per case-by-case authorization with attribution —
  confirm this stands, or narrow to the cleared Cologne core).
- **VedaVaNi audio — final storage decision.** Currently only exists as
  GitHub Actions workflow artifacts (14-day expiry) — Rigveda (both
  pāṭhas, all 10 maṇḍalas, 947 MB) and Yajurveda Aranyaka (8 tracks,
  399 MB) have been pulled and verified against the live server, but
  nothing has a permanent home yet. Stated plan is to move this to
  archive.org rather than commit it into `bhumandala` directly — needs
  the project lead to actually do that upload (or say if the plan's
  changed) before these artifacts expire.
- **SuMadhva Vijaya text** — still not found despite two upload attempts
  (`smv-assets-text.zip`, `smvassetstext2.zip` — neither contained the
  actual verse text; audio is fully done and correctly renamed). Waiting
  on the project lead for a proper source, or confirmation to keep this
  paused indefinitely.
- **Convert tool — OCR degrading on later pages of a source PDF**
  ("legacy font/legacy encoding" per the project lead's own Gemini app).
  The 9-page sample already sent (SMV pages 101–109) all OCR'd fine —
  can't reproduce the reported degradation without the actual later
  pages that failed. Needs those specific pages (or the full PDF).

## Pending on this session / next Claude session

- **VedaVaNi Rigveda text/audio pairing not implemented.** Per-Sukta
  audio is fully downloaded (Kāñchī 1028/1028, Śṛṅgerī ~354/1028 — see
  below), but `rig_veda_multiscript.json`'s "sukta" field is actually a
  flat per-adhyaya *rik* list, not sukta-grouped — mapping rik ranges to
  individual suktas needs the Anukramani verse-count field
  (`Anukramani/Mandala_N.txt`) as a cross-reference, not yet built or
  verified. Currently shipping audio-only rather than risk a wrong
  pairing (see `tools/vedavani/extract_audio.py` module docstring).
- **VedaVaNi Rigveda is per-Sukta, not per-Rik.** The original ask was
  "one audio file per rik" — no per-word/per-rik timestamp data exists
  anywhere in the app (the `word_timestamps` Room table exists in schema
  but nothing in the decompiled playback path reads or writes it).
  Either find real per-rik boundary data somewhere else, or accept
  per-Sukta as the final granularity and say so explicitly.
- **VedaVaNi Śṛṅgerī pāṭha only has Maṇḍalas 1–4.** Confirmed via real
  HTTP 404s (not a bug in the URL scheme — the same construction
  succeeds for all 1028 Kāñchī suktas and for Śṛṅgerī 1–4). Possible
  there's a second, undiscovered URL pattern for Śṛṅgerī 5–10; not
  ruled out, just not found.
- **VedaVaNi Yajurveda not yet run at full scale.** Only small test
  scopes done so far: Samhita Kanda 1 (dry-run only), Aranyaka full (8/8
  tracks, real run). Samhita/Brahmanam haven't been run for real across
  all kandas/ashtakas.
- **Convert tool schema-picker — only partially addressed.** Shipped: a
  searchable target-grantha picker (replacing the flat 465-entry
  dropdown). NOT shipped, still open from the original ask: a "preview
  the schema skeleton" view and a "create a new schema type" flow —
  the picker only searches existing catalog *paths*, it doesn't show or
  let you define the underlying JSON schema shape.
- **Convert tool — Vision multi-page batching investigated, not built.**
  Conclusion: batching wouldn't save cost (Vision bills per-image
  regardless of HTTP-call grouping) and the time savings are marginal
  next to the risk of breaking the tool's per-page crash-safety design.
  Revisit only if that cost/benefit changes (e.g. if per-request latency
  becomes the actual bottleneck at scale).
- `cowork/sarvamoola-and-search` is merged; `build_search_index.py`
  still needs re-running/extending to cover everything ingested since
  (Rāmāyaṇa/Mahābhārata/Bhāgavata/smṛti/kāvya/Ashtadhyayi/Mahabharata
  Kannada/Yukti Mallika/Svapna-Vrindavanakhyana/Harikathamrutasara).
  Kosha stays separate (bespoke data shape) unless someone designs a
  unifying pass.
- Optional: merge `kosha_schema_ADDITION.json`/`kosha_taxonomy_ADDITION.json`
  into `data/schemas.json`/`data/taxonomy.json` if koshas should appear
  in the normal library browser, not just the floating button.
- A full-corpus indexing pass once Kosha's real dataset and Sarvamoola
  both exist.
- Coordinate with parallel Sarvamoola/search work — avoid conflicts
  (standing item, session task list #39).

## Vedic-specific, still genuinely open

(Full detail in `veda_toolkit/README.md` §7.)
- Accented padapāṭha, ṛṣi/devatā/chandas for Taittirīya — not present in
  its ITRANS source.
- Sāmaveda gāna (melodic notation) — deferred, needs its own accent
  handling.
- Missing śākhās (Rāṇāyanīya flagged as easiest).
- ~~Audio (recitation) — not sourced for any Veda yet~~ — partially
  resolved: VedaVaNi Rigveda + Yajurveda-Aranyaka audio sourced and
  verified (see above); Yajurveda Samhita/Brahmanam and full
  text/audio pairing still open.

## Known unresolved bugs

- `index.html` caching — a stale cached app shell can persist through
  what most users think of as a hard refresh. The version-check banner
  (`DGE_EXPECTED_HTML_VERSION`) detects it but can't rescue a tab stuck
  on a snapshot from before that mechanism existed. No fix implemented.

## Longstanding backlog, still not started

- True XML sitemap, IndexedDB migration for the main app, transliteration
  engine rework, waveform visualization, gapless audio, sponsor payment
  processing.
- **The biggest gap — content, not code:** most of the catalog is still
  empty — remaining Mahāpurāṇas, Itihāsas beyond Rāmāyaṇa/Mahābhārata/
  Harivaṃśa, most of Dāsakūṭa/Vyāsakūṭa/Sūtras/Pañcarātra Āgama/
  Dharmaśāstra/Smṛtis, plus "OCR tier" texts needing explicit sourcing
  authorization first.
- Sanskrit TTS/chanting: architecture doc only (`dge/tts/ARCHITECTURE.md`
  v1.1), no implementation started.
- Optional: Harivaṃśa's ~20-verse unmarked invocatory block could be
  split into individual verses with a verified daṇḍa-splitting heuristic
  (the text is already correct as one merged entry — this is a nicety,
  not a fix).
