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

## Awaiting a decision or action from the project lead

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
