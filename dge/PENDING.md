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

- **Two delivered drop-in patches confirmed NOT yet implemented/merged — checked file-by-file against the live repo, not guessed from filenames.** `dgecommentaryimport.zip`: 4 new GitHub-Actions-driven importers (Ramayana word-gloss commentary from valmikiramayan.net, Mahabharata Ganguli PD English translation, a new standalone Bhagavad Gita section under Itihasas with the `gita/gita` open dataset + optional GitaSupersite classical bhashyas, a new top-level Shankaracharya bhashya section from the Zenodo GRETIL CC-BY dump) plus `ingest-commentaries.yml`/`validate_data.py`/`register_layers.py` — none of the 5 new importer files, 3 new tooling/workflow files, or `taxonomy.json` nodes (`bhagavad_gita`, `shankara_bhashya`) exist in this repo.
  **Update — deployed and Bhagavad Gita ingested (verified, merged); the other 3 queued for their own Actions smoke tests (all 4 sources are blocked from this sandbox directly, confirmed by curl — same block pattern as GRETIL/Dasa Sahitya).** Before shipping `bhagavadgita.py`, ran its real logic locally against the live `github.com/gita/gita` dataset (the one source of these four actually reachable here): all 18 chapters matched their standard verse counts exactly (701/701 total), and the base dataset already carries real classical bhashyas per verse -- including **Sri Madhavacharya's own Gita Bhashya at 700/701** -- so GitaSupersite's optional, slow (Wayback-Machine-dependent, thousands of individual fetches, one shloka+flag combination at a time) enrichment wasn't needed for a useful first pass and wasn't enabled. Added a 0.5s request delay to `mahabharata_ganguli.py` (the delivered version had none at all across what could be thousands of fetches over 18 books) to match this project's own established crawler politeness convention. Fixed `tools/register_layers.py`'s own indent (1→2) before it ever ran for real -- the delivered version would have reformatted all of `library.json` on its first run, the exact json.dump mistake already caught and fixed once this session on this same file.
  **Real regression caught and fixed in `taxonomy.json` before it shipped:** naively adding the new `saartha`/`translation_ganguli` layers as a bare new child key under each Ramayana kanda/Mahabharata parva would have turned that node from a taxonomy LEAF into an internal node, silently dropping its EXISTING `/mula` content from `gen_library_status.py`'s leaf-counting (which only counts leaves with no children). Fixed by adding an explicit `"mula": {}` sibling alongside each new layer at all 24 affected nodes; verified with a real before/after run that `loaded`/`items` totals were byte-identical (177 / 307,731) except the expected +54 new not-yet-populated leaves.
  **Bhagavad Gita ingested and merged**: 18 adhyayas, 701/701 verses, real per-verse `bhashya[]` from ~20 translators/commentators. One side-effect caught and fixed before merging its PR: `register_layers.py` correctly finds every *unregistered* `data.json` on disk, which also picked up 7 pre-existing files (`vyakarana/ashtadhyayi/*`, `vyakarana/dhatupatha`) that were never added to `library.json` — separately confirmed via `gen_library_status.py`'s own comment that Ashtadhyayi is deliberately excluded from the main library.json-driven reader (its own standalone feature/page). Stripped those 7 out of the Gita PR before merging rather than silently folding an unrelated feature's exposure decision into this one.
  **New, real, standalone finding needing the project lead's own call:** should `vyakarana/ashtadhyayi/{balamanorama,kashika,nyasa,sutrapatha,tattvabodhini,vasu}/data.json` and `vyakarana/dhatupatha/data.json` (7 files, all real content, currently reachable only via the dedicated Ashtadhyayi/Dhātupāṭha pages) also be exposed through the MAIN site's Library browser modal (by adding them to `library.json`)? Nothing was changed either way — `register_layers.py` will keep re-surfacing these 7 as "new" on every future run of ANY importer until this is decided one way or the other.
  Remaining 3 (`ramayana_saartha`, `mahabharata_ganguli`, `shankara_bhashya`) triggered on Actions; not yet inspected/merged.
  ~~`dge_library_curation.zip`: a rewritten Library Manager...~~ **Done — merged.** `dge/js/library.js` v3.0 now reads an optional `dge/data/library-overrides.json` (hide/pin/reorder/rename/move, non-destructive — `taxonomy.json`/`library.json` and the real fetch path are never touched; navigation still resolves to the true slug even after a display-only move) as a superset of the old hide-only `library-visibility.json`, which is still honored as a fallback. `dge/library-admin.html` rewritten to match (previously hide-only). Added `.github/workflows/reindex.yml` (the admin page's "↻ Re-index search" button deep-links to it) and wired `dge/build_search_index.py` into `ingest.yml` so new content is searchable in the same PR that adds it. Ran both generators once by hand while at it — `dge/search_index/**` and `library_status.json` were genuinely stale (missing Sumadhva Vijaya, the Ashtadhyayi commentary layers, Vyasakuta), not just untested; now current (177/601 folders loaded, 307,731 items). Verified in a real browser: the seed (empty) overrides file renders byte-for-byte identical to the pre-change tree; a test file exercising all four override types (hide/pin/rename/move) produced exactly the right DOM change each time with zero regressions to the other 181 entries; the admin UI's hide/pin toggles and Export button work and produce the documented JSON shape. Not carried over from the admin tool's design: pin/reorder apply *within* the existing folders-then-leaves render grouping rather than one fully-merged sibling list across both — a deliberate smaller scope to avoid restructuring how the tree renders folders vs. leaves; noting here rather than silently diverging from the delivered spec.

- **Dasa Sahitya importer deployed (Haridasa padas/suladis/ugabhogas), triggered on GitHub Actions since it needs network the sandbox lacks — but flagging one real architectural overlap before it's merged.** Another Cowork session built a 7-source crawler (madhwafestivals.com, dasasahitya.net recursive, meerasubbarao, dasasahithyamahithi.com, lyricsraaga.com, kannada.dasasahitya.net stub, Raghavendra Vijaya) with cross-source dedup and count reporting, but couldn't fetch from its own sandbox (same block confirmed directly from here too — all 5 host domains returned a 403 policy denial, same as GRETIL/the CDNs). Deployed as designed: `tools/dasa_sahitya/` (importer + config), `.github/workflows/import-dasa-sahitya.yml` (workflow_dispatch → opens a PR, same pattern as `ingest.yml` — never pushes directly), `dge/dasa_sahitya.html` (browser page, smoke-tested against the delivered sample fixture in a real headless browser — renders, filters, script-switches correctly, no console errors; the fixture itself was removed before committing, not shipped as if real), new `dasa_pada_text` schema in `schemas.json` and a `dasa_sahitya` taxonomy node (both reformatted to match this repo's actual existing conventions, not pasted verbatim from the delivered patch, which used a different shape).
  **Real overlap, not yet reconciled:** this repo already has a `dasakuta` taxonomy node + matching `dge/data/dasakuta/<composer>/<form>/` folder scaffold (Purandaradasa, Kanakadasa, Vijayadasa, Gopaladasa, Jagannathadasa, Prasannavenkatadasa, Mahipatidasa — pada_kirtane/suladi/ugabhoga/mundige/dandaka/other_compositions each) — built earlier, still entirely empty, and covering the exact same subject as this new corpus. The new importer's own output shape (composer-file JSON with dedup/`also_at`, IAST/Devanagari auto-transliteration, source attribution) doesn't match `dasakuta`'s per-form-folder convention (matching every other grantha in the library), so this ships as a second, separate representation rather than filling in `dasakuta` directly. Whether to (a) keep both, (b) migrate the crawler's output into `dasakuta`'s existing folder shape once real data exists, or (c) retire `dasakuta` in favor of this corpus is a real catalog-organization call for the project lead, not something to decide unilaterally — flagged here rather than guessed. The PR the workflow opens is the natural checkpoint to make that call before merging.
  **Update — smoke test (limit=2/index) ran clean, real numbers inspected, full crawl then triggered.** PR #24 (`import/dasa-sahitya`) opened by the workflow: 136 unique compositions (0 cross-source dups reported), 94 pada / 16 suladi / 5 ugabhoga / rest smaller forms, from madhwafestivals.wordpress.com (105) + madhwafestivals.com (19) + dasasahitya.net (10) + meerasubbarao.wordpress.com (2) — `dasasahithyamahithi.com`/`lyricsraaga.com`/the kannada.dasasahitya.net stub yielded 0 in the smoke test, worth checking once the full run's own step logs are in. 77/136 (57%) came back with `composer: ""` ("untitled" bucket) — traced this to the importer's own code (`import_dasa_sahitya.py`, generic-source crawl path, `page_links[:limit_per_index]`): composer attribution comes from *which category/index page a song's link was first discovered under*, and `limit_per_index=2` caps how many links get kept per index page — with a cap that low, most songs get discovered via a deity/theme listing before their own composer listing is ever reached, so they never pick up a composer tag. This reads as a smoke-test artifact of the artificially low cap, not a structural bug — confirmed by re-reading the crawl logic directly rather than guessing. Also spotted one garbled composer slug (a raw percent-encoded Kannada title leaking into the `composer` field for one Vyasaraja-related entry) worth a follow-up look once real full-crawl data is in front of us. Given the artifact explanation held up on inspection, triggered the FULL crawl (no `limit_per_index`, `delay=1.0`) rather than stopping at the smoke test — same workflow, will force-update `import/dasa-sahitya`/PR #24 in place with real production data once it completes. Still not merged; still needs the project lead's `dasakuta` call above before it lands.
  **Update — full crawl landed, PR #24 merged, `dasakuta` question asked and answered ("keep both for now").** Real full-crawl numbers: 1,414 fetched → **1,396 unique** compositions (18 cross-source dups merged), 1,246 with actual verse text. By form: 1,189 pada / 75 suladi / 33 sampradaya / 27 mangala / 18 aarati / 16 laali / 11 kavya / 8 ugabhoga / 7 shobhane / 6 dashavatara / 5 kolu / 1 mixed — still nothing under mundige/dandaka (neither source site appears to index those separately; see the capture tool below for tagging them by hand). Composer attribution improved from 57% "untitled" (smoke test) to 32% (453/1,396) on the full run — confirms the earlier read that this was mostly a `limit_per_index` artifact, not a structural bug, though 453 unattributed compositions is still a real, non-trivial gap. `dasasahithyamahithi.com` (blocked from this sandbox, reachable from the Actions runner) came through with 97 on the full run; `lyricsraaga.com` and the `kannada.dasasahitya.net` stub still yielded 0 — worth checking those two sources' config entries specifically. Asked the project lead directly (they were live in-session) whether to keep the crawler's own `composers/<slug>.json` (all-forms-per-file) shape or migrate to the pre-existing empty `dasakuta/<composer>/<form>/` scaffold matching every other grantha — answer: **"keep both for now"**, i.e. merge PR #24 as-is and defer the folder-shape unification to a later cleanup pass. Merged (`30c8b7a`). `dasakuta` scaffold stays empty until that pass.
  **New: progress tracker + manual capture tool, per the project lead's direct request.** They asked for (a) a live count of how many padas/suladis/ugabhogas/mundiges/dandakas etc. are filled, (b) visibility into which source links didn't come out well so they can click through them by hand (up to 100-200/day, by their own estimate), and (c) a way to select lyrics text in their own browser on a source site and get it saved into the right composer's file without going through the crawler. Built `dge/dasa_capture.html` (superadmin-gated, same pattern as Convert): a stats/form-count dashboard read straight from `index.json`; a review queue of `no_text`/`failed_fetch` URLs (now written by the importer itself — see below — instead of only going to stderr) with one-click "Capture this" prefill; a bookmarklet (drag to bookmarks bar, no install) that copies a selected page's lyrics + URL + title to the clipboard from *any* site, including the ones blocked from this sandbox, since it runs in the project lead's own real browser; a paste-and-parse capture form (composer/form/deity/raga/tala/tags/meaning + a live JSON preview in the exact `dasa_pada_text` shape); and a Save button that pushes the new record straight to GitHub — the target composer file, `index.json`'s counts, and a new `_dump/manual_captures.json` ledger (so a captured URL drops out of the review queue and a later re-crawl won't re-flag it) — all in one commit via the existing `convert/github.js`. Added `mundige`/`dandaka`/`other` to the form vocabulary (`dasa_sahitya.html`, `schemas.json`) so manual captures can tag those even though the crawler hasn't surfaced any yet. `import_dasa_sahitya.py` now collects fetch failures (`Fetcher.failed`) and no-verse-text pages into `_dump/pending_review.json` with reasons, plus a `pending` summary block in `index.json`, instead of only printing to stderr — the PR #24 run predates this, so the review queue will be empty until the next crawl (triggered again after this change, to populate it for real). Verified the whole tool end-to-end in a real headless browser against the real merged 1,396-record `index.json`: stats/form-table render correctly, queue tabs and "Capture this" prefill work, the bookmarklet's `javascript:` href is correctly constructed, the paste-parser correctly splits a bookmarklet-format block into stanzas, the live preview renders the exact target schema, and a full save (GitHub calls mocked to avoid pushing test data) produced the correct 3-file commit (composer file + `index.json` + ledger) with the right commit message. Not built: live IAST/Devanagari auto-transliteration for manually captured titles (crawler entries mostly lack it too — flagged, not solved); a true "expected total" completion percentage (unknowable — no source publishes an authoritative total count of all Haridasa compositions, so the tracker shows "found so far," not "% complete").

- **Vyākaraṇa module, "stage 15 vṛttis" handoff — built the missing foundation it depended on, shipped and browser-tested; scope narrower than the full master handoff doc.** The project lead's `DGE_Vyakarana_CLAUDE_CODE_HANDOFF.md` describes stages 0-15 as "already built and shipped" in a prior Cowork session, but this repo (checked directly, all branches/history) only ever had the base sūtra reader (the one `DGE_ashtadhyayi_DROP_IN.zip` sync from 8 Aug) — stages 1-14 (Dhātupāṭha, Gaṇapāṭha, Prakriyā/Śabda/Kṛdanta/Taddhitānta viewers, Uṇādi/Phiṭ/Liṅgānuśāsana/Vārttika, Pratyaya catalog, Paribhāṣā) were never actually delivered here, only described in the doc. The one zip actually supplied this session (`DGE_stage15_vrittis_DROP_IN.zip`) ships `dhatu.html`/`js/dhatu.js` + 1380 `vritti/<code>.json` files, but those depend entirely on `dhatupatha/data.json` (stage 1) existing, which it didn't.
  **What was actually built to make this real, not just dropped in inert:** confirmed GitHub is reachable from this environment (unlike gretil.sub.uni-goettingen.de and the CDN domains, both blocked by the proxy policy) and `pip install vidyut` works — used vidyut's own Python bindings (MIT) to build `dge/tools/build_dhatupatha.py`, producing a real 2229-root `dge/data/vyakarana/dhatupatha/data.json` (code, Devanagari root with its traditional it-markers, artha, gaṇa — all directly from vidyut's authoritative data, gaṇa distribution matches the doc's own stated totals). `pada` (parasmaipada/ātmanepada) required real caution: a first attempt derived it from the wrong it-marker and called "paṭh" (पठ्, "to read" — genuinely parasmaipada, everyone's first-year Sanskrit) ātmanepada, with an implausible 181:2048 P:A split — caught by spot-checking before shipping, not after. The corrected rule (the OTHER it-marker) was cross-checked against 4 known roots before shipping, with an honest caveat in the data's own `note` field; ubhayapada roots aren't distinguished from parasmaipada, and seT/aniṭ was left out entirely rather than risk a second wrong guess (documented in the build script's own comment, including the exact wrong hypothesis and why it was wrong).
  Wired `dhatu.html`/`js/dhatu.js` in, added an Explore-menu link (`index.html`), and verified in a real headless browser: all 2229 roots load, search finds specific roots correctly, the pada field displays correctly for spot-checked roots (भू→Parasmaipada, एध्→Ātmanepada), and the वृत्तयः panel loads real GPL-licensed Mādhavīya commentary text (सायणः's actual gloss on एध्, with real derived forms) across all three vṛtti tabs with no console errors.
  **Not done, and explicitly out of scope for what was verifiable here:** T1 (Prakriyā/Śabda/Kṛdanta/Taddhitānta derivation viewers) — vidyut's `Vyakarana.derive()` Python API does work (tested directly: correctly derived "Bavati" for BU), but the site's `prakriya.js`/etc. expect a specific JSON shape from Rust generator scripts (`gen_prakriya_json.rs` etc.) that weren't in this handoff's zips, and guessing that shape without the reference scripts risked shipping JSON those pages can't actually render — safer to leave for whoever has the real generators. Ganapāṭha, Uṇādi/Phiṭ/Liṅgānuśāsana/Vārttika, Pratyaya catalog, Paribhāṣā (stages 6-12) are all still genuinely missing — vidyut's own downloaded data package (`prakriya/unadipatha.tsv`, `varttikas.tsv`, `kaumudi.tsv`, etc.) turned out to bundle several of these directly and could unblock T5 (authoritative Kaumudī order) too, a real, promising follow-up not pursued further given the time already spent getting stage 15 itself working end-to-end.

- **Prakasa Samhita (Pancharatra) ingested — first populated samhita in `pancharatra_agama/pancharatra_samhitas/` (the other 14 are still empty stubs).** Source: GRETIL corpustei TEI (`sa_prakAzasaMhitA.xml`), CC BY-NC-SA 4.0, project lead supplied it already converted IAST→Devanagari this session (matches `GRETIL_source_catalog.csv`'s own note: 1623 verses, `DONE_devanagari`). Parsed by marker `// ps_<paricchheda>,<adhyaya>.<verse> //`: 2 paricchhedas (15 + 6 adhyayas), 21 units total, 1623 shlokas — the parsed count matches the catalog's stated count exactly, and spot-checked first/last verses of both paricchhedas against the source text directly. Wired into `taxonomy.json` (new `prakasha_samhita` leaf) and `library.json` (new populated entry, positioned among its `pancharatra_samhitas` siblings, not appended out of place). Editorial/structural lines (colophons, "अथ...अध्यायः" chapter openers, "...उवाच" speaker tags) dropped, matching this corpus's own stated "mula only" convention and the same stray-line-drop approach `importers/gretil.py` already uses elsewhere.
  **Not done, and flagged rather than guessed:** no live-fetch importer was added to `importers/` for this text. GRETIL's own domain (`gretil.sub.uni-goettingen.de`) is blocked by this environment's outbound proxy policy (confirmed via a direct request — 403 policy denial, same block as the CDN domains noted elsewhere in this doc), and the corpustei source is TEI-XML (a different structure than the plain-HTML/plaintext GRETIL pages `gretil.py` already parses) — building a live importer for an XML format I can't fetch to actually test against would mean shipping unverified parsing logic, so it wasn't done. The pre-converted Devanagari text (this session's upload) is the actual, verified source of the committed data; a live-fetch importer for future re-runs is a real follow-up task if wanted, ideally built/tested on a machine that can reach GRETIL directly (matches this repo's own existing pattern of running such importers via GitHub Actions, not this sandbox).
  Remaining `pancharatra_samhitas` stubs (Sattvata, Paushkara, Jayakhya, Ahirbudhnya, Ishvara, Parama, Padma, Vishnu, Naradiya, Lakshmi Tantra, Hayagriva, Parashara, Vasishtha, Vishvaksena) are still empty — `GRETIL_source_catalog.csv` shows most as `confirmed_on_gretil` (findable, not yet transliterated) or `gap_scanned` (only on archive.org as scans, needs OCR) — a real next task once sourced the same way Prakasa Samhita was.

- **Update (fresh Proofread run of sargas 10-13, using the just-fixed pipeline): confirmed clean and matches the source's own printed counts exactly — 10=56, 11=77 (78 per the project lead's reference, one verse still to insert), 12=54, 13=69 (matches the project lead's own "13.69" reference). No duplicate text, no missing pages.** One genuine content finding, not a bug: indices 57-58 (pages 122-123, between sarga 10 and 11) are a real editorial appendix — the book shows verses 10.48 and 10.54 rearranged into their *sarvatobhadra* (palindrome) and *chakrabandha* (wheel-pattern) citrakavya forms, not new narrative verses. Awaiting the project lead's call on how to fold this into `sarga_10`'s schema (extra commentary on shlokas 48/54, or set aside separately) before pushing sarga_10; sargas 11-13 have no open questions and are ready to push once asked.
- **Convert tool (v0.30.1): Proofread prompt now explicitly handles a real, observed OCR artifact — verse-number markers ("॥ N ॥") landing after the wrong shloka.** Root cause: when verse numbers print in their own visual column/margin, Vision can read that whole column as one layout block and splice it back in slightly offset from the actual verse it belongs to (seen directly on page 110 of this same source — confirmed via Tesseract's cleaner line-by-line reading of the same page for comparison). The existing OCR-side "reading order reconstruction" checkbox is a partial, opt-in, per-run answer to this; added a stronger, always-on complement instead: `PROOFREAD_PROMPT` in `gemini.js` now explicitly tells Gemini this failure mode exists and to use the markers' own strict +1 sequence plus where each verse's sense/grammar/metre naturally completes to reattach a misplaced marker to its real shloka boundary — using semantic understanding (which Gemini has and pure OCR word-geometry doesn't) rather than trusting exact OCR line order for markers specifically. Existing "review"/"unresolved" classification safety net is explicitly told to flag any marker reattachment it does, so a human still gets a chance to check it. Verified the new instruction text is actually included in the request Gemini receives (a real-browser test intercepting the outgoing prompt); verifying whether Gemini's real output actually improves on this specific failure mode needs the project lead's next live run to observe.

- **Update (fresh OCR of pages 101-220 supplied by the project lead, with exact per-sarga boundary shlokas from their reference edition): the raw OCR itself is clean and complete for sargas 9-16 — the corruption is downstream of OCR, not in it, and the source book hands us an independent ground truth for free.** Every page in this range carries a running header ("अथ &lt;ordinal&gt; सर्गः" on the first page of a sarga, the bare ordinal+सर्गः on every page after, a full "इति श्रीमत्-कवि-कुल-...-विरचिते ... आनन्दाङ्किते &lt;ordinal&gt; सर्गः" colophon on the last) — confirmed by scanning all 120 pages' OCR text directly, not inferred. Better still, the colophon block on each sarga's last page is followed by a printed running cumulative shloka count — "[आदितः श्लोकाः - &lt;previous total&gt;+&lt;this sarga's count&gt;=&lt;new total&gt;]" — e.g. page 109 reads "४४१+५५=४९६" (sarga 9 = 55 shlokas), page 121 reads "४९६+५६=५५२" (sarga 10 = 56), page 139 reads "५५२+७७=६२९" (sarga 11 = 77, as actually printed in this edition — the project lead's reference separately shows a 78th verse this print omits, to be inserted manually with a cascading renumber). This is an authoritative, independent per-sarga shloka count straight from the source, not a guess. Page ranges found: sarga 9 = pages 101-109 (55 shlokas, already pushed correctly), sarga 10 = 110-121 (56), sarga 11 = 124-139 (77 printed / 78 per reference), sarga 12 = 140-151, sarga 13 = 152-166, sarga 14 = 167-178, sarga 15 = 179-207, sarga 16 = 208-219+. Conclusion: since OCR captured all of this cleanly, the "sarga_10 became 513 shlokas spanning 5 sargas" corruption happened during Proofread (Gemini) or the merge step, not OCR — most likely candidate now built and shipped below (chunk-boundary alignment), but not proven against this exact run since the corrupted Proofread JSON itself wasn't available to diff (the project lead hit the "no proofread JSON" bug, also fixed below, while trying to retrieve it). Re-running Proofread on this same OCR data through the now-fixed pipeline (auto-split + chunk alignment) is the recommended next step — still needs the project lead's own re-run since the raw OCR lives in their upload, not this repo.
- **⚠ FLAGGED, NOT FIXED — the just-pushed "sarga_10" (513 shlokas, commit `608d0aa`) is not actually one sarga.** Found while renaming its catalog title for consistency (that rename IS done — cosmetic only, content untouched). Two pieces of hard evidence: (1) its own text contains a colophon reading "...आनन्दाङ्कित <strong>एकादशः सर्गः</strong>" (11th sarga) partway through, at shloka key 135, and a chapter-opening "अथ <strong>पञ्चदशः सर्गः</strong>" (15th sarga begins) later, at key 315 — meaning this one file spans at least sargas 10 through 15, concatenated, not a real "sarga 10"; (2) the actual `smv10.*.mp3` audio files only go up to `smv10.56.mp3` (~56-58 tracks, consistent with a single real sarga's length, matching sargas 1-8's actual 52-59 range) — nowhere near 513, confirming the audio side never expected a sarga this long either. Checked further: no colophon/chapter-marker was found anywhere between keys 136-314 (where sargas 12, 13, and 14's own boundaries should be) — meaning even the INTERNAL markers needed to reliably split this file don't fully survive in the pushed text, so this isn't a simple "just split at the colophons" fix; some boundaries may have been lost during OCR/Proofread itself (e.g. a colophon landing right at a chunk boundary). Not touched beyond the title — splitting this correctly needs either the project lead's guidance on where the real sarga boundaries are, or (following the same reliable path used for sargas 1-8) the raw source text for sargas 9-16 supplied directly for a clean re-ingestion that bypasses this pipeline's apparent boundary-loss issue entirely.
  Update: the auto-split detector below (`sarga-detect.js`) reproduces this exact analysis automatically — run against this file's own text it independently confirms the same three segments (keys 1–135 → ambiguous "10_to_11", 136–314 → ambiguous "12_to_14", 315–513 → confident sarga 15). It does NOT retroactively fix this already-pushed file by itself (it only runs at a fresh Push time, and the middle segment's exact boundary is still genuinely unrecoverable from this text alone) — still needs the project lead's call on sargas 9-16's real boundaries, or the raw source text re-run through Convert, either of which the tool will now split correctly going forward.

- **Convert tool (v0.28.0): auto-detect + auto-split sarga boundaries — per the project lead's explicit choice ("Detect + auto-split silently"), no confirm screen.** Directly fixes the class of mistake that produced the "sarga_10" entry flagged above. New `sarga-detect.js` (`window.DGE.SargaDetect`) scans a completed Proofread run's merged text for two real printed-kavya conventions — chapter-opening "अथ &lt;ordinal&gt; सर्गः" and closing colophon "इति ... &lt;ordinal&gt; सर्गः" (Sanskrit ordinal words 1–30) — and classifies each stretch between markers as either a *confident* single sarga number (both surrounding markers agree, or a trailing stretch with nothing to contradict the running number) or an honest, unconfirmed *range* label like `12_to_14` when they don't — deliberately conservative, since the whole point is to stop producing confidently-wrong labels, not swap in a different kind. Wired into `buildSchemaPreview()`/`pushToGithub()` in `app.js`: the ordinary single-sarga case (no markers, or one clean match) is completely unchanged; a multi-sarga batch instead renders one independently-editable schema block per detected segment (auto-derived slug/title per segment, e.g. `sarga_10` → `sarga_10_to_11` + `sarga_12`), logs exactly what was detected/split (visible in the Log panel, not literally silent — just not a blocking screen), and Push sends every segment's file plus one `library.json` update together as a single commit. Verified with a 5-case unit-test suite (including the real pushed `sarga_10` data, which reproduces the exact three-segment breakdown documented in the flagged entry above) and a full real-browser Playwright run driving the actual Upload→OCR→Proofread→Build Schema→Push flow with Vision/Gemini/GitHub mocked: confirmed 2 editable blocks render for a 2-marker batch, a per-segment text edit survives into the pushed blob content, the commit contains exactly N grantha files + library.json, and — regression check — a clean no-marker batch still renders exactly 1 block and pushes exactly 1 grantha file, byte-for-byte the old behavior.

- **Convert tool (v0.29.0): three fixes from a direct project-lead report of the Sumadhva Vijaya sargas 10-16 run — a real data-loss-shaped bug, a durability gap, and a boundary-hallucination mitigation.**
  1. *Fixed a real bug: Proofread's merged result looked lost after a tab reload even though nothing actually was.* `runProofread()` only ever built the in-memory `finalJson` at the END of a fresh run — the per-chunk data was safely saved to IndexedDB the whole time, but the merge step itself was never redone until the Proofread button was clicked again. A reload (the same tab-eviction behavior documented above) wiped `finalJson` but not the saved chunks, so the status bar correctly showed "19/19 chunks" while Download/View/Push all threw "No proofread JSON yet — run Proofread first" — exactly the error the project lead hit and asked "was it stored in cache ever?" about. It was, in full. Fix: pulled the merge logic into a shared `mergeSavedProofreadChunks()` and call it automatically the moment a file with a fully-saved proofread result is reselected — no click needed, no network call, pure free recomputation from already-saved data. Verified in a real browser: run OCR+Proofread to completion, reload the page, reselect the same file, confirm `finalJson` is restored and the exact "run Proofread first" error no longer appears, with zero clicks on Proofread.
  2. *New: raw OCR/Proofread backup to GitHub, per the project lead's direct ask ("there should be some foolproof way to capture this data... else we risk running OCR and proofread all again").* Until a finished grantha is pushed, OCR pages and Proofread chunks live only in the browser's IndexedDB — a cleared cache, a new device, or storage eviction before that point genuinely does lose them (unlike case 1 above, which was recoverable; this covers the cases that aren't). New `backupRawDataToGithub()` pushes the raw, unprocessed data for the current file to `dge/convert/backups/<sanitized file key>/{ocr,proofread}.json` in one commit — deliberately outside the Library catalog, never read by the reader app, a pure safety copy. Fires automatically (silently) after every OCR pass and every completed/paused Proofread run whenever a GitHub token is already pasted; also a manual "☁ Backup this file's raw data now" button in the Upload tab for backing up sooner or after adding a token later. Verified in a real browser: auto-backup fires after OCR (ocr.json only) and again after Proofread (adds proofread.json, containing the real chunk data), and the manual button produces the identical commit content on demand.
  3. *New: chunk boundaries can no longer straddle a chapter marker, default on.* Investigated whether Proofread's fixed-size chunking (default 8 pages/request) could be handing Gemini a chunk containing BOTH the tail of one sarga and the head of the next — a real, generic risk for cross-boundary confusion in any chaptered text, and a plausible (not confirmed — the actual corrupted Proofread JSON for the reported sarga_10 run wasn't recoverable to diff against) contributor to that corruption. New `buildAlignedChunks()` reuses `sarga-detect.js`'s own marker-detection against raw OCR page text and forces an early chunk cut whenever a page opens a new chapter, capped at the configured chunk size — a chunk can only end up SMALLER at a boundary, never larger, and a run with no detected markers produces byte-for-byte the same chunks as before. New "Align chunk boundaries to chapter markers" checkbox in the Proofread tab, default checked. Verified in a real browser with a 10-page run (chunk size 3, a marker planted at page 5): with the option off, the chunk covering pages 4-6 straddled the boundary as expected (the bug this fixes); with it on, page 4 became its own forced 1-page chunk and page 5 started a fresh one — confirmed via the actual Gemini request bodies sent, not just internal state.
  All three verified together with the full existing test suite (auto-split, reload-recovery, backup, chunk-alignment) — no regressions.

- **Confirmed clean from a fresh OCR upload, cross-checked against the project lead's own reference-edition boundary shlokas: raw OCR is NOT the source of the sarga_10-16 corruption.** See the "Update" note attached to the FLAGGED sarga_10 entry above for the full per-sarga page ranges and the source's own printed running-cumulative-shloka-count discovery (an independent ground truth for exact per-sarga shloka counts, straight from the book). Still needs: the project lead to re-run Proofread on this same OCR data through the now-fixed pipeline (items 1-3 directly above), and a decision on how to handle sarga 11's one verse (59) that this print physically omits but the reference edition includes.

- **Convert tool (v0.26.0–0.27.0): root-caused and fixed the "OCR says choose a file again after backgrounding the tab" report, plus batched Vision OCR calls (real speedup, project lead's own suggestion).**
  1. *Root cause, explained to the project lead and now explained in-app*: nothing was actually lost. Two SEPARATE browser behaviors were conflated in the report — (a) a backgrounded tab's JS pauses immediately (recoverable, just wait); (b) after several minutes away, mobile browsers can go further and evict the whole tab's memory, wiping the live PDF file object (not recoverable — no web page can prevent this, it's the same security boundary that stops any site reading files without the user re-picking them each time). OCR needs the live file to render more page images and hits this; Proofread doesn't (it only reads already-saved OCR text from IndexedDB), which is exactly why the project lead's own account showed Proofread's "resume from where you left off" working smoothly while OCR's did not. The old error, "Load a PDF or image(s) first," was technically correct but read like data loss. Replaced with `describeFileReselectNeeded()` in `app.js`: names the specific file and exact page progress when there's exactly one candidate (from `currentFileDisplayName` or the single entry in the known-files list), stays generically reassuring rather than guessing when there are multiple known files and no resume click yet (verified this exact ambiguous case with a real test — my first attempt at the fix wrongly named one of several candidates, caught and fixed before shipping). Also rewrote the Upload tab's warning hint to explain both mechanisms explicitly. This is the real, permanent fix available within a pure client-side tool — the underlying tab-eviction behavior itself cannot be prevented from a web page, full stop; only the confusion around recovering from it could be fixed, and now is.
  2. *Batched Vision OCR calls — the project lead's own suggestion ("more than one page at once, like 5, instead of one after another") — implemented for the "Vision AI only" engine.* Added `ocrImagesBatch()` in `vision.js`: Vision's `images:annotate` endpoint already accepts multiple images in one HTTP call, each returning its own independent result, so this is a real cut in network round-trips over a large book (not a change to Vision's own per-image OCR speed or cost). New "Pages per Vision API call" field in the OCR tab, default 5, persisted like every other option; set to 1 to fall back to the original one-call-per-page behavior. Deliberately conservative on failure: one bad page fails the WHOLE batch as a unit (same halt-and-resume-after semantics the tool already relied on, just a coarser unit) rather than trying to salvage partial results — kept it simple and safe rather than clever. Not applied to "Tesseract.js only" (no network call to batch — it's local WASM work) or "Both" (the per-page Vision+Tesseract cross-check would only get more complicated for no matching benefit) — confirmed via diff that neither of those code paths was touched at all, purely additive. Verified thoroughly in a real browser with a mocked Vision endpoint: a 12-page run at batch size 4 made exactly 3 HTTP calls (not 12) with correct per-page results; a simulated batch-2 failure correctly halted after exhausting retries, kept pages 1–4 saved, and reported the right page range; reloading the page (simulating the real tab-eviction scenario) and re-selecting the file correctly showed "Resume OCR from page 5?" — exactly the batch boundary — and resuming completed cleanly with no duplicates.

  **(a) Decided, not yet built — GitHub Actions unattended-processing pipeline.** Project lead's answer: "Both, as a choice in Convert" — a hardened client-side path AND a GitHub Actions path, selectable within Convert, not one instead of the other. Explicitly paused mid-build ("wait") before implementation started; the decision stands, just deferred. Planned approach so far, matching this repo's existing conventions (`.github/workflows/ingest.yml`, `importers/`): Python, `workflow_dispatch` inputs mirroring Convert's own fields, PR-based via `peter-evans/create-pull-request` (not a direct push — same as `ingest.yml`), `VISION_API_KEY`/`GEMINI_API_KEY` as GitHub Secrets (confirmed safe — this repo is public, workflow would be owner-triggered, Secrets are masked in logs and withheld from fork PRs), Vision-only for v1 (Tesseract stays browser-only), a Convert-UI trigger button as a deferred follow-up phase. Not started — resume once the project lead says to continue.
  **(b) Still open, not yet decided:** whether to build automatic OCR→Proofread pipeline overlap (Proofread currently CAN be run manually while OCR is still going — nothing blocks clicking both buttons — but it only proofreads whatever's in the in-memory OCR list at the moment it's clicked, not automatically as new pages keep finishing).
  **(c) From the same follow-up message, still open (not yet built):** cancel/pause and live-vs-snapshot config-read behavior during a run were explained to the project lead, not code changes (Cancel already IS pause — nothing destructive, everything saved incrementally; model/context-anchor/max-tokens fields already apply live to the next chunk; chunk-size/OCR-batch-size need Cancel→change→Resume, which already works). Actual open builds: (1) show Gemini's real per-model max output token limit next to the model picker (`listModels()` in `gemini.js` already fetches `outputTokenLimit` from `models.list` but discards it); (2) adaptive/recommended chunk-size or page-count suggestions before/during a run; (3) auto-populate grantha title/author when the chosen target slug is a sibling of an already-populated multi-part work; (4) folder-naming-convention audit/enforcement for new targets; (5) "Accept all" bulk action in the Review tab (only per-shloka Accept/Edit/Mark-unresolved exist today); (6) scroll-to-top/scroll-to-bottom quick-nav for long Review/Push previews; (7) make the Log panel persistently visible/pinned/floatable/minimizable instead of only reachable via its own tab. Schema-preview textareas being editable before push was confirmed already true, no change needed.

- **Sumadhva Vijaya: Sargas 1–8 ingested (441 shlokas), following the project lead's own ingestion spec — direct raw-text upload, not through Convert.** The project lead supplied a full raw Sanskrit transcript (`sumadhva_vijaya_sargas_18_full.txt`) plus a companion spec document describing the target schema and requested a validation report. Parsed programmatically (not by hand, to make the reported counts trustworthy) — split on the `## अथ ... सर्गः` headings, separated each sarga's colophon (kept, not counted as a shloka, stored as `metadata.colophon`) from its verse blocks, matched each block's trailing danda-delimited number marker, normalized digits (including a few genuinely mixed-script markers in the source itself, e.g. "३0", "२8", "५0" — Devanagari digit + ASCII digit in the same marker — handled correctly, not misread). Result exactly matches the spec's own index table and the cumulative totals baked into the source's own colophons (e.g. "आदितः श्लोकाः-१०९+५६=१६५" after sarga 3): **55+54+56+54+52+57+59+54 = 441**, zero duplicate keys, zero missing numbers, zero malformed blocks. 4 records flagged with `[ ]` (uncertain/missing source characters, sarga 6 key 34; sarga 8 keys 19/27/33) — preserved exactly as supplied per the spec's own instruction ("keep uncertain/missing characters... exactly as supplied... flag them for a later editorial-review layer"), not silently fixed or guessed at. Pushed as `kavya/sumadhva_vijaya/sarga_1` through `sarga_8` (same flat-shlokas-dict schema as the existing sarga_9, LOCAL per-sarga numbering matching the printed marker, `commentaries: {}` since this source has none). Verified in a real browser: every sarga fetches with the right shloka count and number range, the actual reader renders sarga 3's text correctly (spot-checked against the source verbatim), and the Library tree now shows all 9 sargas as distinct clickable entries.

  **Along the way, also renamed all 9 catalog titles for consistency** (`Sumadhva Vijaya सर्गः 1` … `सर्गः 9`, matching the exact `"<work> स्कन्धः N"` pattern already used by Bhagavata Purana's skandhas) — the pre-existing sarga_9 entry's title was just bare "Sumadhva Vijaya" with no sarga number, which would have shown as 9 identical, indistinguishable leaf labels in the Library tree once sargas 1–8 were added alongside it (confirmed this was a real risk by reading `library.js`'s tree-render code — leaf labels come straight from the catalog `title` field with no other disambiguator). Only `library.json`'s title and `sarga_9/data.json`'s own `metadata.title` were touched — its shlokas/numbering were left exactly as they already were.

  **Retracts part of an earlier flag in this file**: previously guessed that the pre-existing sarga_9 (verses 15–55, from an earlier separate Convert/OCR job, source unknown) might actually be mislabeled Sarga 1 content, since 15–55 exactly matches the tail of Sarga 1's real range. Now that the real Sarga 1 text is available, checked directly — sarga_9's actual text ("प्राज्ञ-वित्तमयमाप्तुमागतैः...", about a scholarly assembly/debate) does **not** match Sarga 1 verse 15 at all ("गोभिः समानन्दित-रूपसीतः...", about Hanuman crossing the ocean). That hypothesis is disproven. What sarga_9 actually is remains unconfirmed either way — it doesn't match anything now supplied (only sargas 1–8), so it can't be checked against the real Sarga 9 until that text is supplied too. Left as-is; not blocking anything.

  **Also wired up audio for all 9 sargas** (the other half of the project lead's ask, "map audios"). Confirmed the existing `smv<sarga>.<verse_no>.mp3` filenames in `assets/` already use the exact same per-sarga LOCAL verse numbering as the shloka keys just ingested — spot-checked `smv1.1.mp3`, `smv1.30.mp3`, `smv1.55.mp3`, `smv3.1.mp3`, `smv3.56.mp3`, `smv8.1.mp3`, `smv8.54.mp3` all actually exist, a direct 1:1 match with no renaming or re-mapping needed. Set each sarga's `metadata.archiveBaseUrl` = `"data/kavya/sumadhva_vijaya/assets/"` (relative, same-origin — the files are already committed straight into this repo, not a separate CDN/repo, so this matches how every other same-repo asset is already fetched), `filePrefix` = `"smv<N>."`, `fileExtension` = `".mp3"` — the app's existing `resolveAudioSrc()` (`js/audio.js`) already builds a URL as `base + filePrefix + id + extension` for whichever shloka's playing, so no new code was needed, only the 3 metadata fields per sarga. Verified in a real browser: every constructed URL fetches with HTTP 200 and `audio/mpeg` content-type across multiple sargas and edge verses (first/last/mixed-digit-marker verses), the on-page track counter correctly reads e.g. "2/55" after selecting a shloka in sarga 1 (not the 43 left over from the default stotra — that "0/43" seen before any shloka is clicked is a pre-existing static placeholder baked into `index.html` itself, present for every grantha until the first click, unrelated to this change). Sarga 9's audio was already correctly wired from the earlier push and was left untouched. Not covered: the sarga-opening announcement clips (`smv<n>.0.mp3`), Sarga 1's four intro tracks (`smv1.0a`–`0d.mp3`), and closing colophon clips (`smv<n>.end.mp3`, `end2.mp3` for sarga 16) — the app has no per-sarga "intro/outro audio" slot today, so these aren't reachable through the per-shloka player; logging as a possible future feature, not fixing now.

- **Convert tool: two more requested improvements built (v0.25.0) — auto-detected starting shloka number, and an always-visible file status dashboard.** Both direct follow-ups from the project lead's feedback on the numbering fix:
  1. *Auto-detect the starting number instead of always defaulting to 1 or requiring manual entry.* The project lead's exact ask: "why should shloka number always be hardcoded to fifteen... you should be looking at the shloka numbers found in that particular page... or you can optionally ask where should the number begin from, default is one." Added `U().detectVerseNumber(text)` in `utils.js` — scans the first merged shloka's own OCR'd text for the LAST danda-delimited marker (॥, | or ‖ on both sides) whose inner content is digits-only in one script, converts Devanagari/Kannada/Telugu/Tamil/Malayalam/Bengali/ASCII digits to a plain integer, and rejects compound markers like "१.४४" (contains a non-digit '.') rather than guessing at a chapter.verse split. Wired into `runProofread()`'s completion: if a marker is found, the "Starting shloka/unit number" field is auto-filled with a visible hint explaining where the number came from; a value the admin already typed is never silently overwritten (tracked via `lastAutoFilledStartingNumber`, cleared whenever a different file loads or its proofread data is cleared). Verified with real Devanagari/Kannada/ASCII text and a battery of tricky cases (no marker, compound rejected, last-of-multiple-markers, user-override survives) in a real browser — all correct.
  2. *Always-visible file status: pages loaded/OCR'd/proofread/pending, sarga/target, without having to hunt through tabs or re-select the file.* The project lead's exact ask: "how do I know how many pages... are loaded, how many proofread, how many OCRed... it must all be very clear on top of the convert tool page itself... if I again pick up the same file, it should show me that sarga name, shloka numbers which are loaded, etc." Added `#fileStatusBar` — same "outside every tab, never hidden" placement as the error box (so status is visible no matter which tab is open) — showing the filename, `OCR: X/Y page(s) — N pending`, `Proofread: X/Y chunk(s) — N pending — M shloka(s), numbered A–B` (upgrading to the actually-built schema's real numbered range once "Build Schema Preview" has run, since that reflects any starting-number offset), and the chosen target grantha path. Wired into `renderFileStatusBar()`, called after every OCR page, every Proofread chunk, schema build, push, and — critically for the "re-picking the same file" case — at the end of `onFileSelected`/`resumeFromKnownFile`/`handleUrlImport`. Found and fixed a real bug of my own while building this: `currentMappedJson` (the built schema) was never reset when switching files or clearing progress, which would have shown a previous file's stale numbered range in the new status bar — added the reset alongside every existing `finalJson = null` site. Verified in a real browser: hidden with no file loaded, populates correctly on resume with the exact pending counts, updates live through a full OCR→Proofread→Build flow, and correctly resets to a clean state when switching to a different file (no leftover numbers from the previous one).

- **Logged for "next round" (explicitly not being built now — the project lead's own framing): a Grantha content editor.** View/edit/save any already-pushed grantha's shlokas (and commentaries, sutras, Vedic mantras — anywhere the same shape applies) directly, without going through Convert's OCR/Proofread pipeline again. Requested shape: view/edit buttons per grantha, inline editing with a save button; OR the entire shloka set loaded into one big text box for bulk editing; pagination for anything with more than ~10 units, with an adjustable per-page count; and/or a toggle to edit the whole set at once instead of paginated. The project lead's framing: "think in ways that could make content editor's life easy as well as safe for the content" — safety matters here specifically because `github.js`'s push is a straight overwrite (confirmed earlier this session), so an editor that can push back to GitHub needs the same "build a preview, let a human check/edit it, only push what's confirmed" discipline Convert's schema-map step already has, not a live-autosave-on-every-keystroke design. No code written for this — flagged here so it isn't lost, to be scoped properly when it's actually greenlit.

- **RESOLVED — taxonomy decision: `guru_charitre` category is retired;
  all "Vijaya" hagiography/mahakavya works fold into `kavya/` alongside
  Raghuvamsha/Kumarasambhava/etc.** The project lead's call, in response
  to the mis-filed Sumadhva Vijaya push flagged below: these are all
  kavyas/mahakavyas, so a separate biography-vs-composed-by-an-acharya
  category isn't wanted — one `kavya/` category for all of them. Carried
  out: `dge/data/guru_charitre/sumadhva_vijaya/` (1,041 audio files +
  README + rename_manifest.json + source_audio_mapping.json) moved whole
  to `dge/data/kavya/sumadhva_vijaya/` via `git mv` (renames, not
  delete+recreate, so history is preserved); the mis-filed
  `kavya/raghavendra_vijaya/sarga_9/data.json` moved to
  `kavya/sumadhva_vijaya/sarga_9/data.json` (see below); `library.json`'s
  catalog entry path updated to match; `taxonomy.json`'s `guru_charitre`
  block removed and `sumadhva_vijaya` added as a sibling of
  raghuvamsha/kumarasambhava/etc. under `kavya` instead. Checked
  `library.json` and every JS file under `js/`/`convert/` for other
  `guru_charitre`/`raghavendra_vijaya` references first — none exist (the
  audio was never wired into the live app yet, and no other catalog entry
  used either path), so this was a pure rename with nothing else to
  update. `taxonomy.json` isn't fetched by the live app or Convert at
  runtime (confirmed by grep) — it's a reference/planning document only,
  so this edit is documentation-accuracy, not a functional change.
  `PROJECT_STATUS.md`'s original entry documenting the now-superseded
  `guru_charitre` decision was left as-is (it's a dated historical record
  of what was decided at the time, not a live spec) — this note is the
  correction.

- **RESOLVED — the mis-filed "Sumadhva Vijaya" push (commit `0ad82fd`,
  originally at `kavya/raghavendra_vijaya/sarga_9`) is now at
  `kavya/sumadhva_vijaya/sarga_9/data.json`, alongside its own audio.**
  Was flagged, not yet fixed, as of the previous note in this file;
  folded into the taxonomy move above once the project lead confirmed
  `kavya/` as the destination. Also fixed the numbering bug (see the
  Convert fix below) IN this already-pushed file, not just prospectively
  for future pushes: checked every one of its 41 shlokas' own embedded
  verse marker (॥१५॥ … ॥५५॥) against its stored dict key — all 41 were
  consistently exactly +14 off, zero anomalies — so this wasn't a guess,
  the file's own content proved the correct offset. Re-keyed "1"–"41" to
  "15"–"55" directly (`metadata.totalShlokas` unaffected, still 41).
  Verified with a fresh fetch in a real browser after the fix. One thing
  still NOT independently verified (the project lead didn't address this
  part, and I have no way to check it myself): whether "sarga 9" is
  actually the correct sarga number for these verses against Sumadhva
  Vijaya's real 16-sarga structure — that number was carried over as-is
  from what was typed during the original push. Low risk to fix later if
  wrong (a plain rename), but worth a glance before pushing sarga 8 or 10
  alongside it.

- **Convert tool: schema-build numbering now has a "Starting shloka/unit
  number" field (v0.23.0) — fixes exactly the bug that produced the
  mislabeled push above.** Real bug, confirmed and reproduced: OCR/Proofread
  scoped to a page selection starting partway through a work (e.g. the
  "SumadhvaVijayaMoola.pdf" run that started at the page printed with
  ॥१५॥) always got keyed 1, 2, 3… in the pushed schema regardless of
  which real verse the batch actually started at — `runProofread()`'s
  merge step (`let seq = 1`) assigns a fresh 1-based sequential `index`
  to every run, with no way to tell it "this run continues from unit 15,
  not unit 1." Root-caused by reading `mapper.js` (keys shlokas by
  `s.index`) and `app.js`'s merge loop directly — the embedded canonical
  verse numbers (॥१५॥, ॥१६॥…) inside the OCR'd `sa` text were correct all
  along; only the dictionary KEY used to store each shloka was wrong.
  Added a plain numeric field on the Push tab, next to Grantha
  title/author: leave it blank (default 1) for a batch that starts at the
  work's first unit, or set it to the real starting number for a partial
  batch — "Build Schema Preview" then keys the shlokas starting from that
  number instead of always restarting at 1. Reproduced the exact reported
  bug and verified the fix in a real browser (seeded a synthetic partial
  proofread run starting at page 15 — without the field, the preview
  showed "Shloka 1"/"Shloka 2"; with it set to 15, it correctly showed
  "Shloka 15"/"Shloka 16"). Also added a line to the push-success message
  explaining that GitHub Pages can take a minute or two to redeploy, since
  the project lead asked "should I refresh or do something?" after not
  immediately seeing a just-pushed grantha in the Library — checked
  `js/core.js`'s `library.json`/grantha `data.json` fetches, both already
  use `cache:'no-store'` plus a cache-busting timestamp, so the app itself
  isn't caching anything stale; the delay was GitHub Pages' own
  build/deploy latency, not fixable from this side, just worth explaining
  instead of leaving it as a mystery.

- **Convert tool: revamped the whole page into a horizontal tab/wizard
  layout (v0.22.0), replacing the single long vertical scroll through
  every stage at once.** Seven tabs — ⚙️ Setup, 1. Upload, 2. OCR,
  3. Proofread, 4. Review, 5. Push, 📋 Log — each showing only its own
  small area below the tab bar; tabs are always directly clickable (jump
  to any stage), and a "Next →" / "← Back" button pair at the bottom of
  each panel supports the linear step-through most sessions actually
  follow, matching the "move next next next... until the entire process
  is complete" request. The tab bar scrolls horizontally and is sticky at
  the top of the viewport, since 7 tabs don't all fit on a ~393px phone
  screen (every screenshot from this project so far has been on a phone).
  The last-opened tab is remembered (localStorage) so a reload/reopen
  doesn't dump you back at Setup. Folded the "Danger zone" fieldset into
  the Upload tab (it's about managing the currently-loaded file, so it
  belongs next to Upload rather than sitting alone at the very bottom).
  The error box stays outside all tab panels, always visible regardless
  of which tab is open, since a background OCR/Proofread run can fail
  while you're looking at a different tab. This was a pure layout/CSS/JS
  change — no element IDs were touched, no business logic in
  app.js/gemini.js/github.js/mapper.js was touched — so every existing
  feature (model picker, folder browser, granular clear, output modal,
  progress bars, etc.) keeps working exactly as before, just inside its
  new tab. Verified in a real headless browser: every tab shows exactly
  one active panel, Next/Back walks the full sequence forward and back
  correctly, reload restores the last tab, the folder browser and
  granular-clear features both still function correctly from inside their
  new tabs, and no console/page errors. Screenshots taken at both 393px
  (phone) and 1200px (desktop) confirm it looks intentional, not just
  functional.

- **Convert tool: "Reconstruct reading order" checkbox investigated against
  real output (gltAvivRti-01.pdf, page 11/12) — not the cause of anything
  wrong; a real finding went the other way.** The project lead asked
  whether that checkbox (checked for this run) explains a suspected bad
  reading. Checked the actual `ocr_1.json`/`ocr_2.json`/`ocr_3.json`
  (Tesseract/Vision/both) against the real page image: verse numbers land
  correctly inline (not clumped at page-end, the failure mode that
  checkbox exists to fix), and Tesseract and Vision — two independent,
  differently-built engines — agree with each other almost word-for-word.
  The one real discrepancy found was in the OPPOSITE direction: the
  project lead's own pasted "Gemini-generated ground truth" transcript of
  the same image reads "एवं सन्ततः सन्तापमवधारयन्नाह" at one spot, while
  both OCR engines (independently) AND the image itself (checked directly)
  read "एवं सन्तप्तः सन्मृतिमेवार्थयमान आह" — i.e. that one line in the
  "ground truth" comparison text looks like a Gemini image-reading slip,
  not an OCR/checkbox bug. Worth remembering generally: a single
  generative model's one-shot image reading isn't automatically more
  trustworthy than two independent OCR engines agreeing with each other —
  worth checking both ways before assuming which one is wrong.

- **Convert tool: schema-building pipeline (`mapper.js`) audited end to
  end, per the project lead's concern that "if it goes wrong, everything
  goes wrong because we are directly writing it to GitHub."** Traced the
  full path: Gemini's per-chunk `number` field restarts at 1 in every
  chunk (expected, chunks have no memory of each other) — `app.js`'s merge
  step already assigns a separate guaranteed-unique, guaranteed-ordered
  `index` field across the whole merged result, and `mapper.js` correctly
  keys the final schema by `index` (not the repeating `number`). Confirmed
  against a real live grantha (`data/stotras/pns/data.json`) that this
  matches the established, working schema convention exactly (plain
  sequential "1","2","3"... keys, canonical verse numbers like "॥ १.४४॥"
  living inside the `sa` text itself, not a separate field) — not a bug,
  by design, and consistent with everything else already live. Also
  confirmed there's a real human checkpoint already in place before
  anything reaches GitHub: `renderSchemaMapEditable()` renders every
  shloka's Sanskrit/commentary in editable textareas, and `pushToGithubBtn`
  reads back the (possibly-edited) DOM state, not the original unedited
  mapper output — nothing pushes without a chance to fix it first. No
  correctness bug found in this pass; noting the audit happened and what
  it covered, per the "check what's being extracted and how it's being
  converted" request, rather than just asserting it's fine.

- **Convert tool: a real follow-up round of usability fixes, all reported
  from actually using the tool on Raghavendra Vijaya + SumadhvaVijayaMoola:**
  - **"Clear saved progress" was one all-or-nothing button with no
    indication of WHICH file it would act on** — confirmed by reading the
    actual code that it was correctly scoped to the current file only
    (not the wider wipe it looked like), but the confirm dialog never
    named the file, which is a real source of the "did it just delete
    everything?" feeling when juggling multiple files in one session. Now
    granular: separate checkboxes for OCR text / proofread results /
    reset-options-to-default, and the Danger Zone always shows which file
    it's about to act on by name before you click anything.
  - **Retrying a deterministic failure (MAX_TOKENS, bad key, permission,
    model missing, bad request, blocked) 3-4 times before giving up was
    pure wasted waiting** — the exact same request fails the exact same
    way every time; only a setting change fixes it, not a delay. These
    now fail on the first attempt with a clear "not retrying automatically"
    message. Quota/network/overload errors still retry as before (those
    genuinely can clear with time).
  - **Cancel didn't take effect until the current retry's FULL backoff
    delay finished** — confirmed the retry loop only checked for
    cancellation between attempts, never during the wait itself, so
    Cancel during a 45s backoff meant waiting the full 45s regardless.
    Fixed by polling the cancel flag every 250ms during any wait instead
    of sleeping through it blind.
  - **OCR/Proofread progress was a single line of text with no bar and no
    time estimate** — added a real `<progress>` bar plus a rough ETA
    (from the actual average time-per-unit so far THIS run, not a guess,
    and correctly excluding anything already done in an earlier resumed
    session so resuming doesn't produce a nonsense estimate) to both
    stages, each with its own separate status line so OCR and Proofread
    status never overwrite each other (they silently shared one element
    before). OCR's line also now names which engine is actually running
    (Vision / Tesseract / both).
  - **The folder browser's "Add new" prompt still felt like guessing** —
    added real convention detection: if the existing siblings at a level
    already form an obvious numbered series (`sarga_01`, `sarga_02`, ...),
    the next one is pre-filled automatically in the right format. Caught
    and fixed a wrong first attempt at this during testing: naming the
    "kind" being added from the parent folder's own name works for a
    category level (`kavya/` → "a new kavya", correct) but is actively
    wrong one level deeper (`kavya/raghuvamsha/` → children are text
    layers like `mula`, not more "raghuvamsha"s) — since telling those
    two cases apart reliably isn't possible from names alone, the
    non-numeric case now stays generic and lets the real sibling list
    speak for itself instead of guessing a label that can be wrong.
  - **"Run OCR (from page 1)" had a confusing parenthetical** — simplified
    to "Run OCR" (a separate "Resume" button/bar already exists for
    continuing).
  - **General visual polish** — the page used browser-default styling
    throughout; restyled to the same warm palette as the rest of DGE's
    admin pages (card-style sections, consistent rounded inputs/buttons,
    primary-action buttons visually distinct from secondary ones) so it
    doesn't feel like a separate, rougher tool from the rest of the
    project. Not a full redesign — flagging that a dedicated UX pass is
    still a reasonable future ask if the project lead wants one.
  All verified in a real headless browser: granular clear correctly
  preserves the unchecked category and removes only the checked one;
  the non-retryable-kind list and the abortable-sleep function are both
  present and wired in; the folder browser's numbered-series detector
  round-trips correctly (`sarga_01`→`sarga_02`, `skandha_01..12`→`skandha_13`,
  mixed/non-numeric siblings → no guess); the previously-wrong
  "raghuvamsha" mislabel is gone; new styling actually renders (primary
  button color, warm body background) with no console errors.

- **Convert tool: added a folder browser for picking the push target
  path** (step 5, "📁 Browse existing folders…"), triggered by a real
  question: adding Sarga 1 of a new 10-sarga mahakavya (Raghavendra
  Vijaya), what should Sarga 2's path be? Investigated the real catalog
  before answering rather than guessing: `dge/data/library.json` already
  has 4 real mahakavyas at `kavya/<name>/mula/data.json`, and (separately)
  large multi-part works like Bhagavata Purana use one catalog entry per
  part (`puranas/bhagavata_purana/skandha_01`, `skandha_02`, …) — the
  second pattern is what actually works with Convert's current schema
  (flat, one grantha per push, each able to carry its own commentary
  layer later) without any code change, so the answer given was
  `kavya/raghavendra_vijaya/sarga_01`, `sarga_02`, etc., not the
  capitalized, un-suffixed `Kavya/RaghavendraVijaya` about to be typed in
  the screenshot. Also traced `github.js`'s actual push behavior and
  confirmed a real risk this surfaced: pushing to the SAME slug a second
  time is a straight overwrite (skipped only if byte-identical), not a
  merge — so re-using Sarga 1's exact slug for Sarga 2 would have
  silently destroyed Sarga 1's content, with only a generic "already has
  content, overwrite?" confirm as the safety net, no explanation of what
  "overwrite" actually means here. The folder browser directly addresses
  this: it shows the REAL existing siblings at whatever level you're
  adding to (built from every catalog entry, populated and unpopulated
  alike — the existing search box only searches unpopulated ones, so it
  can't show an already-populated sibling like an existing sarga_01 at
  all), with an "Add new here" field that only ever needs ONE new segment
  typed (auto-sanitized to lowercase/underscore, matching the corpus
  convention automatically) rather than a whole path retyped from memory
  each time — structurally preventing the exact mistake above rather than
  relying on remembering it. Verified against the real live catalog in a
  real browser: correct top-level folders and counts, drilling into
  `kavya/` shows the 4 real mahakavyas with correct populated/title
  badges, and adding a deliberately messy "Raghavendra Vijaya" at that
  level correctly sanitizes to `kavya/raghavendra_vijaya`.
  **Separately flagged, not yet decided:** the `itihasa_purana_text`
  schema (one data.json per whole work, sargas nested as `items[]`) that
  those 4 existing mahakavyas actually use has NO commentary support at
  all in `core.js`'s normalization (`commentaries: {}` hardcoded empty) —
  fine for a mula-only text, but would need a real code change if
  Raghavendra Vijaya's vṛtti/commentary is meant to be readable per-sarga
  rather than mula-only. Not resolved; flagging so it isn't silently lost
  if a commentary shows up on a future page's OCR run.

- **Fixed a real gap: `audio-admin.html` was never linked from the main
  ADMIN dropdown** — built and shipped earlier in the session, but the
  link to it in `index.html` was missed, so a superadmin had no way to
  discover the page existed at all short of typing the URL directly.
  Added `🎙️ Audio Admin` to the dropdown (`js/admin-editor.js`'s
  visibility toggle list updated too) — still routes to the page's own
  separate `AUDIOADMIN` passkey gate, unaffected by this, since the whole
  point of that page was a credential independent of `is_superadmin`.
  Also added a general **"NEW" badge mechanism** for the Admin dropdown
  (`js/modals.js`'s `markNewFeatureBadges()` + a `NEW_ADMIN_FEATURES`
  list) per the project lead's request that newly-added features be
  flagged so they don't go unnoticed sitting in a long menu — a small
  blinking pill next to a dropdown item, shown once the first time that
  menu is opened after the feature ships, then not shown again on future
  page loads (tracked in localStorage). Audio Admin is the first entry;
  add `{itemId, badgeId}` to that list for future admin-only additions.
  Verified in a real browser: badge shows on first open, persists through
  a same-session re-open until dismissed, and is gone after a reload;
  clicking through still correctly hits Audio Admin's own passkey gate.

- **Convert tool: added a "View Output" modal** (expandable/maximizable/
  minimizable/closeable, doesn't require scrolling to the bottom of a long
  page) — the project lead reported the old inline Preview section at the
  bottom of the page was the only way to see generated text, requiring a
  scroll-and-hunt every time on mobile. New `👁 View OCR Output` /
  `👁 View Proofread Output` buttons sit right next to steps 2 and 3's own
  action buttons and open the same modal directly. Verified in a real
  browser: open/maximize/restore/minimize (tapping the header while
  minimized restores it, since the minimize button itself becomes a small
  target once shrunk)/close, and switching views inside the modal with no
  data yet shows the existing error message instead of breaking. Also
  added a `📋 Copy` button in the modal header (per a follow-up report
  that the preview had no copy option at all) — copies exactly what's
  showing (raw OCR or proofread), same clipboard-with-fallback approach
  as the existing "Copy Log" button.

- **Convert tool: found and fixed the real cause of "response was cut off
  (hit the output token limit)" (MAX_TOKENS) failures, separate from the
  429/quota issue fixed earlier.** The shared `js/gemini.js` client (used
  by Convert, Ashtadhyayi, and Kosha alike) had `maxOutputTokens: 2048`
  hardcoded as its default — genuinely too low for Convert's use: a dense
  commentary chunk's full corrected Sanskrit text plus a per-shloka
  classification+note in strict JSON, for up to 8 pages at once, can
  easily need more than that, and a cut-off response breaks the JSON
  parse entirely (which is exactly the error the project lead saw on the
  densest commentary page in a run). Raised the shared default to 8192,
  and added a configurable "Max output tokens per Gemini response" field
  in Convert's Proofread section so it can be raised further per-book if
  needed, without waiting on another code change. (The project lead's
  Gemini consultation on this also suggested specific claims — a
  "Gemini 3.6 Flash" 65536-token ceiling, dropping temperature/top_p, a
  new "thinking_level" parameter — none of which could be verified from
  here and aren't things this session has confirmed are real/current API
  behavior, so none of that was adopted; only the verifiable, safe fix
  --  raising a value that was clearly too conservative -- was made.)

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
- ~~**Convert tool — Vision multi-page batching investigated, not built.**~~
  Superseded — the project lead asked again directly ("is it possible to
  get more than one page processed by OCR... will we save time?") and it
  WAS built: see the "batched Vision OCR calls" entry above (`ocrImagesBatch()`
  in `vision.js`, v0.27.0). The real win turned out to be fewer HTTP
  round-trips over a large book, not a per-image cost change — this
  earlier note's cost/benefit read was incomplete, not wrong about cost
  itself.
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
