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

- **Eight `rigveda_ref` values in the Sāmaveda data name the wrong verse** (found
  18 Aug while propagating Sāyaṇa; `tools/sayana_smriti/SOURCES.md` §7 has the
  evidence). These are errors in DGE's own Sāmaveda data, not in the
  propagation. `propagate_samaveda.py` now checks each ref against the mantra
  text and **skips** these eight rather than repairing them silently, so the
  commentary is absent rather than wrong — but the refs themselves still want
  fixing at source, which is a content call:
  | agreement | SV → RV | |
  |---|---|---|
  | 0.11 | 1429 → 9.89.5 | no word in common |
  | 0.19 | 385 → 4.39.6 | no word in common |
  | 0.22 | 1420 → 1.93.3 | no word in common |
  | 0.23 | 469 → 9.65.1 | no word in common |
  | 0.26 | 345 → 8.24.16 | no word in common |
  | 0.40 | 891 → 9.61.17 | **890 and 891 appear to name each other's verses** |
  | 0.52 | 890 → 9.61.18 | |
  | 0.53 | 1204 → 9.12.8 | |
  Eight more agree only partially (0.55–0.70) where the Sāmaveda's own reading or
  verse division differs; those *are* propagated, since every entry already tells
  the reader it is Sāyaṇa on the parallel Ṛgveda mantra.
- **150 dangling `library.json` entries, all dvaitavedanta.** Pre-existing on
  main, not caused by the Sāyaṇa work, and unchanged by it.
  `tools/audit_library.py --fix` clears them in one command. Left alone across
  three sessions now because they may belong to an in-flight crawl — **this needs
  a yes or no from the project lead**, otherwise it will keep being deferred.
- **Rights on the archive.org Sāyaṇa scan** (`rgveda-with-sayanabhasya`) — the
  item states no licence. Sāyaṇa's text is long out of copyright; the Vaidika
  Saṃśodhana Maṇḍala edition's own status is unchecked. Now lower priority: the
  Wikisource route (CC BY-SA, stated) supplies 98.45% and is what actually
  shipped, so this only matters if the OCR route is ever published from.

- **~~The published site is 1,091 MB against GitHub Pages' 1 GB limit~~ — down to 999 MB, and every decision below is the project lead's, taken 18 Aug.** Under the limit, but by 1%, so the next few granthas put it back over. What was done:
  - **Archives deleted (74.5 MB)** — `mahabharata.7z.001/.002`, `smv-assets-audio.7z.001/.002/.003`, `smv-assets-text*.zip`. All in git history. `vedavani-assets.zip` stays: `vedavani-extract.yml` unzips it at CI time.
  - **`dge/data/kosha` kept (61 MB), by decision** — the site reads the full corpus from `bhumandala-kosha-data`, so what stays in-repo is now a fallback for when that CDN is unreachable rather than dead weight. Worth remembering when the next CDN failure is diagnosed.
  - **`dge/convert/backups` kept (14 MB)** — not covered by the decision, so not touched.
  - **Audio moved to `Tribhuvanachar/bhumandala-audio-data` (29 MB)** — 1,041 Sumadhva Vijaya files under `smv_audio/`, served over jsDelivr, foldered by Internet Archive item identifier so the eventual move to archive.org is a host-prefix change in `config.js` and no data edit. The repo already existed and was empty.
  - **Step B — the generated indexes and `prakriya` — deferred**, by decision. The list and the numbers are in this file's history (commit `98bc8be`) when it is wanted: `search_index/postings` 168.7 MB, `search_index/units` 116.4 MB, `prakriya` 66.9 MB, `_morph` 14.8 MB, `_synonyms` 3.6 MB, ~370 MB in all. The search-index slimming below shrinks the two largest of those rather than relocating them, and is the better next move.

- **A regression of my own, found while moving the audio and fixed with it (`72e8fb4`): the Sumadhva Vijaya recordings had been 404ing since the taxonomy restructure.** All 16 sargas stored `archiveBaseUrl: "data/kavya/sumadhva_vijaya/assets/"`, the pre-restructure path. `migrate_slugs.py` rewrote cross-references, backlinks, manifest slugs and shard names, and did not touch `archiveBaseUrl` inside a grantha's `metadata` — so every verse of the Madhva Vijaya asked for audio at a path that no longer existed, and nothing said so, because a missing recording fails quietly. Worth a general lesson: **the restructure's blind spot was URLs inside metadata**, and anything else of that shape is worth a look. Raghavendra Vijaya's ten sargas carried the same stale prefix for audio that exists nowhere at all; repointed to its own identifier so the files work the day they arrive.

- ~~**Should the 7 Ashtadhyayi/Dhatupatha files be exposed in the main Library browser?**~~ **Decided — yes — and they already are.** Checked before changing anything: all seven are in `library.json`, all seven are in `taxonomy.json`, and the Library modal shows वेदाङ्गानि › व्याकरणम् (9) → अष्टाध्यायी (6) plus Dhātupāṭha. A later session registered them and the note here went stale. `register_layers.py` will stop re-surfacing them.

- **Ananda Ramayana and Adbhuta Ramayana go under `itihasa/ramayana`, and a `misc` node holds what is undecided** (`0ce7a91`) — both the project lead's call. Neither Ramayana is sourced yet, so they are empty leaves; `misc` holds "Ajaya Vijayendra" and the Satyadhyana Tirtha civil suit until what they are is settled, and says so in its own note. **One thing to decide before they are filled:** Valmiki's seven kandas sit directly under `ramayana`, so these two now stand as their siblings — a work beside a chapter. The clean shape is a `valmiki` node holding the kandas, but that renames seven live slugs and everything referencing them, so it wants its own pass with `migrate_slugs.py` rather than being done incidentally.

- **Grantha acquisition list dictated 18 Aug 2026 — 16 lines to source and load, plus a two-way Veda↔saint linking requirement that is half-built. Several titles came through a voice transcription garbled; my readings are recorded beside the raw words rather than silently corrected, and the flagged ones need the project lead's own confirmation before anyone goes hunting for a text. Bṛhatī Sahasra has since been confirmed; two remain open.** Nothing here is sourced yet — this is the wanted-list, not a status report.

  | Dictated as | Read as | Confidence | Where it would sit |
  |---|---|---|---|
  | "Jayateertha Vijaya" | Jayatīrtha Vijaya | high | `kavya_alankara/` (vijaya-kāvya), cross-linked to `jayatirtha` in the parampara |
  | "Satyasantha Vijaya" | Satyasandha Vijaya | high | same; saint node `satyasandha` |
  | "Satyabodha Vijaya" | Satyabodha Vijaya | high — already named in `parampara.json` under `satyabodha` ("Satyabodha Vijaya (kavya)") | same |
  | "Raghuuttama Vijaya" | Raghūttama Vijaya | high; saint node `raghuttama` exists | same |
  | "Satyadhyana Vijaya or some mahakavyas of Satyadhyana Tirtha" | Satyadhyāna Vijaya, and other mahākāvyas of Satyadhyāna Tīrtha (Uttarādi Maṭha, 1872–1942) | high for the person, open for which works | same; note Satyadhyāna Tīrtha has **no node** in `parampara.json` yet |
  | "Vijayandra Vijaya" (earlier message) | Vijayīndra Vijaya | high; saint node `vijayindra` exists | same |
  | "Ajaya Vijayendra" (earlier message) | **unclear** — possibly "Ajeya Vijayīndra", possibly a duplicate of the line above, possibly a distinct work | **low — confirm** | unknown |
  | "Gita Prathipadartha Chandrika" | Gītā Pratipadārtha Candrikā | high | `darshana/vedanta/dvaita/…/gita_prasthana` |
  | "Civil Suit of Satyadhyana Tirtha" | **unclear** — reads as the Uttarādi Maṭha litigation record rather than a grantha; could equally be a mis-transcription of a Sanskrit title | **low — confirm.** If it really is the court record, it is an archival document, not a grantha, and needs its own home (and a licence check) rather than a taxonomy leaf | unknown |
  | "Vishnu Sahasranama with all its commentaries of Madhva saints" | Viṣṇusahasranāma + every Mādhva vyākhyāna — and see the Bṛhatī Sahasra note below, which tradition holds is its verse-by-verse counterpart | high | `stotra/` mūla with per-commentator layers. `parampara.json` already names two: `satyanidhi` ("Vishnu-Sahasranama Vyakhyana") and `satyasandha` ("commentary on Vishnu-Sahasranama") — a starting list, not a complete one |
  | "Veda Sukta … vyakhyanas by Madhva saints" | Sūkta vyākhyānas (Puruṣa Sūkta &c.) by Mādhva saints | high; `satyasandha` already carries "Purusha-Sukta commentary" | `vedas/` as a commentary layer — see the linking requirement below |
  | "Brihati Sahasra" | Bṛhatī Sahasra — **confirmed by the project lead, then checked online at their asking**: an aggregate of a thousand mantras, not the bṛhatī chandas. A real technical term (MW glosses it "a thousand bṛhatīs", attested in the Śatapatha Brāhmaṇa and Śāṅkhāyana Śrauta Sūtra), and in Mādhva practice a chanted collection with its own printed commentary | high on what it is; **the extent is still open** — see below | `vedas/` — as a named collection over its constituent ṛks, if they turn out to be ṛks we already hold |
  | "Pomaana Sukta" (earlier dictation: "Paumana") | Pavamāna Sūkta vyākhyānas | high | `vedas/` |
  | "Ananda Ramayana" (18 Aug) | Ānanda Rāmāyaṇa | high | `itihasa/` beside Vālmīki, or `purana/` — it is traditionally classed with the Purāṇas, so the placement is a real call, not a default |
  | "Adbhuta Ramayana" (18 Aug) | Adbhuta Rāmāyaṇa | high | same question, same answer needed |
  | "Smrutimuktaavali and Smrutis" | Smṛtimuktāvalī, and the Smṛtis generally | high | `smriti_dharma/smriti` — the node exists and is empty |

  **Bṛhatī Sahasra — what the search actually turned up, and the one thing it did not.** Searched at the project lead's asking; worth writing down because it changes what we would be loading. Caveat first: `madhwakart.com`, `wisdomlib.org`, `anandsp1.wordpress.com` and `texasgaushala.com` are all blocked by this sandbox's egress proxy, so every line below comes from search-result summaries rather than from a page actually read here. Treat it as a lead to verify against a printed copy, not as sourcing.
  - **The term is real and old.** Monier-Williams glosses *bṛhatī-sahasra* as "a thousand bṛhatīs", attested in the Śatapatha Brāhmaṇa and the Śāṅkhāyana Śrauta Sūtra — a ritual measure of chant, counted in bṛhatī units, long before any Mādhva usage.
  - **In Vaiṣṇava and Mādhva tradition it is tied directly to the Viṣṇusahasranāma**, which matters here because the project lead wants both. The reported correspondence is one-to-one: each of the thousand names answers to one mantra of the Bṛhatī Sahasra, said to belong to the Ṛgveda. The syllable arithmetic used to justify it is given two different ways by two different sources — 36 akṣaras per verse in one, 36 svaras + 36 vyañjanas = 72 in another — which is a fair warning about the level these accounts are pitched at. If we ever ship the name↔mantra alignment it should come off the printed text, not off that arithmetic.
  - **It is chanted, and it is in print.** A "Bṛhatī Sahasra Mahā Mantra Homa" is performed at Mādhva maṭhas, and Madhwakart lists both a two-part *Bruhati Sahasra* and a separate *Bruhati Sahasra Pradīpa* — so the commentary the project lead asked for exists as a published book, likely Kannada.
  - **What no search answered: which thousand.** No source found gives the extent — which mantras, in what order, from which maṇḍalas or śākhās. That single fact decides the data shape. If they are Ṛgveda mantras we already hold, the collection is a **manifest over existing ids** (`vedas/rigveda/shakala_shakha/samhita/mandala_09` alone has 1,108, each with a stable id like `9.1.1` beside its pada-pāṭha, ṛṣi, devatā and chandas) and costs almost nothing. If it draws across śākhās or carries its own recension, it needs its own text. Either way a second copy of verses we already have would give the site two Rigvedas that drift apart and split every backlink between them — so the manifest is the default, and the printed Pradīpa's own table of contents is the thing to get hold of. The same reasoning covers Puruṣa Sūkta and Pavamāna Sūkta as named sūktas, and conveniently the addressing a manifest needs (`<grantha-slug>#<unit-id>`) is exactly what `references[].target` already uses.
  Where this came from, so the next person can go straight to it: `wisdomlib.org/definition/brihatisahasra` (the MW gloss and the Brāhmaṇa/Śrauta-sūtra attestations), `madhwakart.com/product/bruhati-sahasra/` and `.../bruhati-sahasra-pradeepa/` (the two-part text and its Pradīpa), `naadopaasana.wordpress.com/tag/vishnu-sahasranama/` and `hindupedia.com/en/Vishnu_Sahasranamam` (the name↔mantra correspondence and the two versions of the syllable count), `texasgaushala.com/post/a-call-to-harmony-bruhati-sahasra-maha-yajna` (the homa), plus a scanned *Bruhathi Sahasra* PDF circulating on Scribd/pdfcoffee that would settle the extent question if someone can open it and check its contents page.

  **The structural requirement, which is the harder half and the reason this is not just a shopping list.** In the project lead's own words: a sūkta vyākhyāna should live under the Veda section *and* show up under the individual saint's contributions — "If someone clicks on that verse, the commentary should appear, or if one goes to a particular saint, his vyakhyanas should be seen there." Two directions, and they are in very different states today:

  - **Verse → commentary is already the backlinks mechanism, and needs no new design.** A commentary unit declares `references[].target` pointing at `<grantha-slug>#<unit-id>`; `tools/shard_backlinks.py` inverts that into `dge/search_index/backlinks.json` plus per-cited-grantha shards, and `dge/js/backlinks.js` decorates each verse row with a count and a list of who discusses it. What is missing is only *coverage*: exactly three cited texts have shards today (`ashtadhyayi/sutrapatha`, `ashtadhyayi/kashika`, `sarvamula/sutra_prasthana/anuvyakhyana`). No Vedic saṃhitā is a backlink target yet, so a reader on a Rigveda verse sees nothing. Pointing a sūkta vyākhyāna's units at their mantras and re-running the sharder is the whole job on this side — worth saying plainly, because it means the Veda-side requirement is a data task, not a feature build.
  - **Saint → his vyākhyānas does not exist, and the pieces for it are closer than they look.** `dge/guru-parampara/data/parampara.json` already holds 215 saint nodes, 50 of which carry a `works` array (138 entries) — but those are free-text strings ("Bhavaprakashika (on Gita Bhashya)"), linked to nothing. On the other side, 1,049 `data.json` files carry a `default_author`. Joining the two is the missing index, and the obstacle is naming, not plumbing: those 1,049 files spell their authors 192 different ways across Latin and Devanagari — "Sri Jayatirtha" (33 files) and "श्रीजयतीर्थः" (21) are the same person to a reader and two strings to a machine, and 143 files leave the field empty. So the work is (1) a canonical saint id on each grantha — reusing `parampara.json`'s existing ids (`jayatirtha`, `raghuttama`, `vijayindra`) rather than inventing a second vocabulary, (2) a generated author→granthas index, and (3) `works` entries growing an optional path so a saint's page links into the library instead of merely naming a title. Not started, and not to be started before the acquisition list above is confirmed — the shape of the index should be settled against real texts, not guessed ahead of them.

- **Custom domain `www.sarvamula.org` goes live 29 Aug 2026, or 18 Sep if that slips — the switchover is now a checklist, not a hunt.** The `CNAME` file was deleted from `main` on 17 Aug, so GitHub Pages currently serves `tribhuvanachar.github.io/bhumandala` only. Almost nothing in the site cares: the reader resolves its links relatively and its JavaScript uses `location.origin`, both of which follow whatever domain served the page. The one exception is the Open Graph `og:image` in the root `index.html` — the portrait shown in WhatsApp/Telegram/X link previews — which must be fully qualified and is read by crawlers that never run JavaScript, so it cannot be resolved at runtime. That URL is now managed: `site.config.json` holds `siteOrigin`, the tag is marked `<!-- site-url: ... -->`, and `tools/set_site_url.py` rewrites it. **On go-live day:** restore `CNAME`, run `python3 tools/set_site_url.py --set https://www.sarvamula.org`, set `customDomain.status` to `live`, and — the one that bites silently — add both `www.sarvamula.org` and `sarvamula.org` to Firebase → Authentication → Settings → Authorized domains, or Google Sign-In stops working on the new domain with no error message. The full checklist is in `site.config.json` itself; `--check` verifies the repo is in sync and is worth adding to any pre-delivery check run.

- **Two delivered drop-in patches confirmed NOT yet implemented/merged — checked file-by-file against the live repo, not guessed from filenames.** `dgecommentaryimport.zip`: 4 new GitHub-Actions-driven importers (Ramayana word-gloss commentary from valmikiramayan.net, Mahabharata Ganguli PD English translation, a new standalone Bhagavad Gita section under Itihasas with the `gita/gita` open dataset + optional GitaSupersite classical bhashyas, a new top-level Shankaracharya bhashya section from the Zenodo GRETIL CC-BY dump) plus `ingest-commentaries.yml`/`validate_data.py`/`register_layers.py` — none of the 5 new importer files, 3 new tooling/workflow files, or `taxonomy.json` nodes (`bhagavad_gita`, `shankara_bhashya`) exist in this repo.
  **Update — deployed and Bhagavad Gita ingested (verified, merged); the other 3 queued for their own Actions smoke tests (all 4 sources are blocked from this sandbox directly, confirmed by curl — same block pattern as GRETIL/Dasa Sahitya).** Before shipping `bhagavadgita.py`, ran its real logic locally against the live `github.com/gita/gita` dataset (the one source of these four actually reachable here): all 18 chapters matched their standard verse counts exactly (701/701 total), and the base dataset already carries real classical bhashyas per verse -- including **Sri Madhavacharya's own Gita Bhashya at 700/701** -- so GitaSupersite's optional, slow (Wayback-Machine-dependent, thousands of individual fetches, one shloka+flag combination at a time) enrichment wasn't needed for a useful first pass and wasn't enabled. Added a 0.5s request delay to `mahabharata_ganguli.py` (the delivered version had none at all across what could be thousands of fetches over 18 books) to match this project's own established crawler politeness convention. Fixed `tools/register_layers.py`'s own indent (1→2) before it ever ran for real -- the delivered version would have reformatted all of `library.json` on its first run, the exact json.dump mistake already caught and fixed once this session on this same file.
  **Real regression caught and fixed in `taxonomy.json` before it shipped:** naively adding the new `saartha`/`translation_ganguli` layers as a bare new child key under each Ramayana kanda/Mahabharata parva would have turned that node from a taxonomy LEAF into an internal node, silently dropping its EXISTING `/mula` content from `gen_library_status.py`'s leaf-counting (which only counts leaves with no children). Fixed by adding an explicit `"mula": {}` sibling alongside each new layer at all 24 affected nodes; verified with a real before/after run that `loaded`/`items` totals were byte-identical (177 / 307,731) except the expected +54 new not-yet-populated leaves.
  **Bhagavad Gita ingested and merged**: 18 adhyayas, 701/701 verses, real per-verse `bhashya[]` from ~20 translators/commentators. One side-effect caught and fixed before merging its PR: `register_layers.py` correctly finds every *unregistered* `data.json` on disk, which also picked up 7 pre-existing files (`vedanga/vyakarana/ashtadhyayi/*`, `vedanga/vyakarana/dhatupatha`) that were never added to `library.json` — separately confirmed via `gen_library_status.py`'s own comment that Ashtadhyayi is deliberately excluded from the main library.json-driven reader (its own standalone feature/page). Stripped those 7 out of the Gita PR before merging rather than silently folding an unrelated feature's exposure decision into this one.
  **New, real, standalone finding needing the project lead's own call:** should `vedanga/vyakarana/ashtadhyayi/{balamanorama,kashika,nyasa,sutrapatha,tattvabodhini,vasu}/data.json` and `vedanga/vyakarana/dhatupatha/data.json` (7 files, all real content, currently reachable only via the dedicated Ashtadhyayi/Dhātupāṭha pages) also be exposed through the MAIN site's Library browser modal (by adding them to `library.json`)? Nothing was changed either way — `register_layers.py` will keep re-surfacing these 7 as "new" on every future run of ANY importer until this is decided one way or the other.
  **Ramayana word-meaning (`saartha`) ingested and merged: 5 of 6 kandas.** bala/ayodhya/aranya/kishkindha/yuddha, real word-by-word gloss + English (opening verse of Bala Kanda spot-checked against the well-known text). `sundara_kanda` failed cleanly — `discover_sargas()` found no sarga links on its contents page, exactly the "if a kanda yields 'no sargas discovered', the contents-page filename... needs a tweak" case the importer's own docstring already anticipated. Can't fix from here (valmikiramayan.net is blocked from this sandbox); needs someone who can actually load `https://www.valmikiramayan.net/sundara/sundara_contents.htm` (or whatever its real path is) to find the right pattern for `_sarga_page_url`/`SARGA_HREF` for that one kanda specifically.
  **Update — a candidate fix applied, NOT yet confirmed against the real site.** A Cowork session with real network access reported Sundara's contents page writes its sarga links with looser href quoting (single-quoted/unquoted, and not reliably carrying a literal `sargaN` token in a double-quoted href) than the other five kandas, which is why the original `href="[^"]*sarga(\d+)[^"]*\.htm"` pattern matched zero links there. `SARGA_HREF` was generalized to key off the per-sarga FRAME filename (`<prefix>_<N>_frame.htm`, uniform across all six kandas per `_sarga_page_url()`'s own docstring) with tolerant quoting instead: `href\s*=\s*["\']?([^"\'>\s]*?(\d+)_frame\.htm)`. Verified from this sandbox (no direct site access here either — same block) with a synthetic-HTML regex test: byte-identical matches on the 5 already-working kandas' real known href format, and correctly matches hypothetical single-quoted/unquoted/spaced variants that the old pattern missed. **What's NOT verified: that this is actually Sundara's real quirk.** The handoff explicitly asked for a live `discover_sargas('sundara','sundara_contents')` run confirming ~68 real sarga URLs before handing back a fix; that confirmation wasn't included with this diff. Applied anyway since it's strictly backward-compatible (provably no regression on the 5 working kandas) and can only help, not hurt, Sundara's current zero-sarga state — but treat "Sundara Kanda ingested" as still open until a real run (e.g. via GitHub Actions, or `python importers/ramayana_saartha.py`) actually confirms real Sundara Kanda content comes out.
  **Shankaracharya bhashya ingested and merged: 3 of 13 works.** Brahmasutra Bhashya (556 units) and Gita Bhashya (1175 units, per-verse keyed) both real, spot-checked (Brahmasutra's opening unit matches the known adhikarana-sutra text). Aitareya Upanishad Bhashya (59 units) also real. The other 9 Upanishads (Zenodo) and 2 of 3 remaining GRETIL-classic works (Kena/Katha/Mundaka) all 404'd — the exact "GRETIL marker formats vary... verify filenames on first run" case the importer's docstring flagged. Needs someone with real access to `zenodo.org/records/6466333/files/` and `gretil.sub.uni-goettingen.de` (both blocked from this sandbox) to find the current correct filenames for `shankara_bhashya.py`'s `WORKS` list.
  **Update — 6 of the 9 stuck Upanishads re-pointed to real, verified URLs; Kena/Katha/Mundaka confirmed genuinely unavailable, not just misnamed.** A Cowork session with real network access found the root cause: Zenodo record 6466333 is only a SUBSET of GRETIL's corpus — of the Shankara set it ships just Brahmasutra + Aitareya as `.txt` (both already correctly ingested above), never the other 9. Confirmed by direct fetch that Isha/Prashna/Mandukya/Taittiriya/Chandogya/Brihadaranyaka bhashyas actually live on GRETIL itself under a different, newer tree — `corpustei/transformations/html/sa_*.htm` — and that all six return real IAST Sanskrit + Shankara's commentary there. `WORKS` re-pointed for those six (`fmt` stays `iast_htm`, same generic tag-stripping + reference-marker split `parse_units()` already uses successfully for the working `bhgsbh_u.htm` classic page, so the differing corpustei markup shouldn't matter — but this specific claim is NOT independently confirmed against real fetched content, see caveat below). Kena/Katha/Mundaka are a real, structural dead end, not a filename typo: GRETIL's own index marks them "restricted / not available from TITUS," and the old classic `1_veda/4_upa/` paths 404. Commented out (not deleted) in `WORKS`, pending a separate follow-up to wire in the `sanskritdocuments.org` ITX fallback the module's docstring already anticipated for the Gita bhashya — deliberately not built in the same pass, to keep this diff small and reviewable.
  **What's NOT verified here:** this sandbox can't reach either `zenodo.org` or `gretil.sub.uni-goettingen.de` (same block as always), so the six corrected URLs and the `parse_units()` segmentation of corpustei's TEI-derived markup (mūla lines tagged e.g. `ChUp_1,1.1`, commentary `ChUpBh_1,1.1`) haven't been proven end-to-end from here — only that the module imports cleanly and `WORKS` now has exactly the intended 9 live entries (6 corpustei + brahmasutra/aitareya on Zenodo + gita_bhashya on classic GRETIL) with Kena/Katha/Mundaka correctly absent. Needs a real run (`python importers/shankara_bhashya.py`, or via GitHub Actions) to confirm real unit counts for the six re-pointed Upanishads before calling this "13 of 13 reachable works ingested."
  **Recurring side effect across all 4 PRs, now a confirmed pattern, not a one-off:** every single one of these ingests independently triggered `register_layers.py` to also pick up the same 7 pre-existing, deliberately-unregistered Ashtadhyayi/Dhatupatha files (see above) — stripped from each PR before merging. This will keep happening on *every* future run of *any* importer until the underlying Ashtadhyayi library.json-exposure question is actually decided. Worth resolving soon just to stop the repeated manual strip.
  **Mahabharata Ganguli translation ingested and merged: 16 of 18 parvas.** Real English prose confirmed (Adi Parva opens with Ganguli's own well-known translator's preface). Per-book section counts: adi 237, vana 313, udyoga 199, drona 199, bhishma 124, karna 96, sabha 80, virata 72, ashvamedhika 92, ashramavasika 39, shalya 65, stri 26, sauptika 18, mausala 8, mahaprasthanika 3, svargarohana 6. **Shanti Parva (book 12) and Anushasana Parva (book 13) — the two longest, most complex parvas — both came back completely empty, and failed near-instantly rather than timing out** (the job log shows the "book 12 ..."/"book 13 ..." print lines landing within the same second, meaning the very first section fetch failed immediately for both, not after working through some sections first). That pattern points to `sacred-texts.com` using a different URL or section-numbering convention for those two books specifically, not a rate-limit or transient failure. Can't diagnose further from here (site blocked from this sandbox) — a 4th Cowork handoff file (`FIX_MAHABHARATA_SHANTI_ANUSHASANA.md`) covering this specifically should be sent alongside the other 3 already delivered.
  ~~`dge_library_curation.zip`: a rewritten Library Manager...~~ **Done — merged.** `dge/js/library.js` v3.0 now reads an optional `dge/data/library-overrides.json` (hide/pin/reorder/rename/move, non-destructive — `taxonomy.json`/`library.json` and the real fetch path are never touched; navigation still resolves to the true slug even after a display-only move) as a superset of the old hide-only `library-visibility.json`, which is still honored as a fallback. `dge/library-admin.html` rewritten to match (previously hide-only). Added `.github/workflows/reindex.yml` (the admin page's "↻ Re-index search" button deep-links to it) and wired `dge/build_search_index.py` into `ingest.yml` so new content is searchable in the same PR that adds it. Ran both generators once by hand while at it — `dge/search_index/**` and `library_status.json` were genuinely stale (missing Sumadhva Vijaya, the Ashtadhyayi commentary layers, Vyasakuta), not just untested; now current (177/601 folders loaded, 307,731 items). Verified in a real browser: the seed (empty) overrides file renders byte-for-byte identical to the pre-change tree; a test file exercising all four override types (hide/pin/rename/move) produced exactly the right DOM change each time with zero regressions to the other 181 entries; the admin UI's hide/pin toggles and Export button work and produce the documented JSON shape. Not carried over from the admin tool's design: pin/reorder apply *within* the existing folders-then-leaves render grouping rather than one fully-merged sibling list across both — a deliberate smaller scope to avoid restructuring how the tree renders folders vs. leaves; noting here rather than silently diverging from the delivered spec.

- **Dasa Sahitya importer deployed (Haridasa padas/suladis/ugabhogas), triggered on GitHub Actions since it needs network the sandbox lacks — but flagging one real architectural overlap before it's merged.** Another Cowork session built a 7-source crawler (madhwafestivals.com, dasasahitya.net recursive, meerasubbarao, dasasahithyamahithi.com, lyricsraaga.com, kannada.dasasahitya.net stub, Raghavendra Vijaya) with cross-source dedup and count reporting, but couldn't fetch from its own sandbox (same block confirmed directly from here too — all 5 host domains returned a 403 policy denial, same as GRETIL/the CDNs). Deployed as designed: `tools/dasa_sahitya/` (importer + config), `.github/workflows/import-dasa-sahitya.yml` (workflow_dispatch → opens a PR, same pattern as `ingest.yml` — never pushes directly), `dge/dasa_sahitya.html` (browser page, smoke-tested against the delivered sample fixture in a real headless browser — renders, filters, script-switches correctly, no console errors; the fixture itself was removed before committing, not shipped as if real), new `dasa_pada_text` schema in `schemas.json` and a `dasa_sahitya` taxonomy node (both reformatted to match this repo's actual existing conventions, not pasted verbatim from the delivered patch, which used a different shape).
  **Real overlap, not yet reconciled:** this repo already has a `dasakuta` taxonomy node + matching `dge/data/dasakuta/<composer>/<form>/` folder scaffold (Purandaradasa, Kanakadasa, Vijayadasa, Gopaladasa, Jagannathadasa, Prasannavenkatadasa, Mahipatidasa — pada_kirtane/suladi/ugabhoga/mundige/dandaka/other_compositions each) — built earlier, still entirely empty, and covering the exact same subject as this new corpus. The new importer's own output shape (composer-file JSON with dedup/`also_at`, IAST/Devanagari auto-transliteration, source attribution) doesn't match `dasakuta`'s per-form-folder convention (matching every other grantha in the library), so this ships as a second, separate representation rather than filling in `dasakuta` directly. Whether to (a) keep both, (b) migrate the crawler's output into `dasakuta`'s existing folder shape once real data exists, or (c) retire `dasakuta` in favor of this corpus is a real catalog-organization call for the project lead, not something to decide unilaterally — flagged here rather than guessed. The PR the workflow opens is the natural checkpoint to make that call before merging.
  **Update — smoke test (limit=2/index) ran clean, real numbers inspected, full crawl then triggered.** PR #24 (`import/dasa-sahitya`) opened by the workflow: 136 unique compositions (0 cross-source dups reported), 94 pada / 16 suladi / 5 ugabhoga / rest smaller forms, from madhwafestivals.wordpress.com (105) + madhwafestivals.com (19) + dasasahitya.net (10) + meerasubbarao.wordpress.com (2) — `dasasahithyamahithi.com`/`lyricsraaga.com`/the kannada.dasasahitya.net stub yielded 0 in the smoke test, worth checking once the full run's own step logs are in. 77/136 (57%) came back with `composer: ""` ("untitled" bucket) — traced this to the importer's own code (`import_dasa_sahitya.py`, generic-source crawl path, `page_links[:limit_per_index]`): composer attribution comes from *which category/index page a song's link was first discovered under*, and `limit_per_index=2` caps how many links get kept per index page — with a cap that low, most songs get discovered via a deity/theme listing before their own composer listing is ever reached, so they never pick up a composer tag. This reads as a smoke-test artifact of the artificially low cap, not a structural bug — confirmed by re-reading the crawl logic directly rather than guessing. Also spotted one garbled composer slug (a raw percent-encoded Kannada title leaking into the `composer` field for one Vyasaraja-related entry) worth a follow-up look once real full-crawl data is in front of us. Given the artifact explanation held up on inspection, triggered the FULL crawl (no `limit_per_index`, `delay=1.0`) rather than stopping at the smoke test — same workflow, will force-update `import/dasa-sahitya`/PR #24 in place with real production data once it completes. Still not merged; still needs the project lead's `dasakuta` call above before it lands.
  **Update — full crawl landed, PR #24 merged, `dasakuta` question asked and answered ("keep both for now").** Real full-crawl numbers: 1,414 fetched → **1,396 unique** compositions (18 cross-source dups merged), 1,246 with actual verse text. By form: 1,189 pada / 75 suladi / 33 sampradaya / 27 mangala / 18 aarati / 16 laali / 11 kavya / 8 ugabhoga / 7 shobhane / 6 dashavatara / 5 kolu / 1 mixed — still nothing under mundige/dandaka (neither source site appears to index those separately; see the capture tool below for tagging them by hand). Composer attribution improved from 57% "untitled" (smoke test) to 32% (453/1,396) on the full run — confirms the earlier read that this was mostly a `limit_per_index` artifact, not a structural bug, though 453 unattributed compositions is still a real, non-trivial gap. `dasasahithyamahithi.com` (blocked from this sandbox, reachable from the Actions runner) came through with 97 on the full run; `lyricsraaga.com` and the `kannada.dasasahitya.net` stub still yielded 0 — worth checking those two sources' config entries specifically ***(resolved — see the "2 dead-end sources disabled" entry below)***. Asked the project lead directly (they were live in-session) whether to keep the crawler's own `composers/<slug>.json` (all-forms-per-file) shape or migrate to the pre-existing empty `dasa_sahitya/dasakuta/<composer>/<form>/` scaffold matching every other grantha — answer: **"keep both for now"**, i.e. merge PR #24 as-is and defer the folder-shape unification to a later cleanup pass. Merged (`30c8b7a`). `dasakuta` scaffold stays empty until that pass.
  **New: progress tracker + manual capture tool, per the project lead's direct request.** They asked for (a) a live count of how many padas/suladis/ugabhogas/mundiges/dandakas etc. are filled, (b) visibility into which source links didn't come out well so they can click through them by hand (up to 100-200/day, by their own estimate), and (c) a way to select lyrics text in their own browser on a source site and get it saved into the right composer's file without going through the crawler. Built `dge/dasa_capture.html` (superadmin-gated, same pattern as Convert): a stats/form-count dashboard read straight from `index.json`; a review queue of `no_text`/`failed_fetch` URLs (now written by the importer itself — see below — instead of only going to stderr) with one-click "Capture this" prefill; a bookmarklet (drag to bookmarks bar, no install) that copies a selected page's lyrics + URL + title to the clipboard from *any* site, including the ones blocked from this sandbox, since it runs in the project lead's own real browser; a paste-and-parse capture form (composer/form/deity/raga/tala/tags/meaning + a live JSON preview in the exact `dasa_pada_text` shape); and a Save button that pushes the new record straight to GitHub — the target composer file, `index.json`'s counts, and a new `_dump/manual_captures.json` ledger (so a captured URL drops out of the review queue and a later re-crawl won't re-flag it) — all in one commit via the existing `convert/github.js`. Added `mundige`/`dandaka`/`other` to the form vocabulary (`dasa_sahitya.html`, `schemas.json`) so manual captures can tag those even though the crawler hasn't surfaced any yet. `import_dasa_sahitya.py` now collects fetch failures (`Fetcher.failed`) and no-verse-text pages into `_dump/pending_review.json` with reasons, plus a `pending` summary block in `index.json`, instead of only printing to stderr — the PR #24 run predates this, so the review queue will be empty until the next crawl (triggered again after this change, to populate it for real). Verified the whole tool end-to-end in a real headless browser against the real merged 1,396-record `index.json`: stats/form-table render correctly, queue tabs and "Capture this" prefill work, the bookmarklet's `javascript:` href is correctly constructed, the paste-parser correctly splits a bookmarklet-format block into stanzas, the live preview renders the exact target schema, and a full save (GitHub calls mocked to avoid pushing test data) produced the correct 3-file commit (composer file + `index.json` + ledger) with the right commit message. Not built: live IAST/Devanagari auto-transliteration for manually captured titles (crawler entries mostly lack it too — flagged, not solved); a true "expected total" completion percentage (unknowable — no source publishes an authoritative total count of all Haridasa compositions, so the tracker shows "found so far," not "% complete").

- **Dasa Sahitya: 2 dead-end sources verified with real network access and disabled — `lyricsraaga.com` and `kannada.dasasahitya.net`.** Both had yielded 0 compositions since the very first crawl, flagged above as needing a real look. Confirmed (not guessed): `lyricsraaga.com` is a fully client-side-rendered SPA — every route (the tag archive, individual song pages, `/wp-json/`, `/sitemap_index.xml`) returns only an empty app-shell to a non-browser client, so the crawler's plain-`requests` `Fetcher` gets 0 links no matter the URL pattern (its real song URLs are `/devotional/<slug>/` and `/kannada/<slug>/`, not the old `/…-lyrics/` pattern — corrected in the config for if a JS-capable fetcher is ever built). `kannada.dasasahitya.net` has an invalid TLS cert for its own hostname (`CERTIFICATE_VERIFY_FAILED`, a server-side misconfiguration, not a sandbox block), is unindexed by search (effectively defunct), and is redundant regardless — the already-working `dasasahitya.net` crawl (`parser: "dasasahitya"`, 69 composers) already serves Kannada-script content directly under Kannada-suffixed categories (e.g. `/category/krishna-ಕೃಷ್ಣ/`). Both composers' work (Purandara/Kanaka/Sripadaraja) is fully covered by `madhwafestivals` + `dasasahitya.net` already, so building headless-browser rendering for one heavily-overlapping source wasn't worth it. Added a small `"enabled": false` flag to each block in `dasa_sources.json` (a source with no `enabled` key defaults to enabled, so the 4 working sources + `raghavendra_vijaya` are untouched) and a matching skip-and-log guard in `import_dasa_sahitya.py`'s `crawl()`. Verified with a synthetic-config unit test (no network needed): a disabled source is skipped and logged (`[skip] <name>: <reason>`), an enabled one is still attempted. Expected result of the next Actions run: unchanged corpus (~1,396 compositions), two fewer 0-yield sources cluttering the log. Re-enable either only if a JS-capable fetcher is built (lyricsraaga) or someone confirms unique content at a valid-cert URL with real index pages (kannada_dasasahitya).

- **Vyākaraṇa module, "stage 15 vṛttis" handoff — built the missing foundation it depended on, shipped and browser-tested; scope narrower than the full master handoff doc.** The project lead's `DGE_Vyakarana_CLAUDE_CODE_HANDOFF.md` describes stages 0-15 as "already built and shipped" in a prior Cowork session, but this repo (checked directly, all branches/history) only ever had the base sūtra reader (the one `DGE_ashtadhyayi_DROP_IN.zip` sync from 8 Aug) — stages 1-14 (Dhātupāṭha, Gaṇapāṭha, Prakriyā/Śabda/Kṛdanta/Taddhitānta viewers, Uṇādi/Phiṭ/Liṅgānuśāsana/Vārttika, Pratyaya catalog, Paribhāṣā) were never actually delivered here, only described in the doc. The one zip actually supplied this session (`DGE_stage15_vrittis_DROP_IN.zip`) ships `dhatu.html`/`js/dhatu.js` + 1380 `vritti/<code>.json` files, but those depend entirely on `dhatupatha/data.json` (stage 1) existing, which it didn't.
  **What was actually built to make this real, not just dropped in inert:** confirmed GitHub is reachable from this environment (unlike gretil.sub.uni-goettingen.de and the CDN domains, both blocked by the proxy policy) and `pip install vidyut` works — used vidyut's own Python bindings (MIT) to build `dge/tools/build_dhatupatha.py`, producing a real 2229-root `dge/data/vyakarana/dhatupatha/data.json` (code, Devanagari root with its traditional it-markers, artha, gaṇa — all directly from vidyut's authoritative data, gaṇa distribution matches the doc's own stated totals). `pada` (parasmaipada/ātmanepada) required real caution: a first attempt derived it from the wrong it-marker and called "paṭh" (पठ्, "to read" — genuinely parasmaipada, everyone's first-year Sanskrit) ātmanepada, with an implausible 181:2048 P:A split — caught by spot-checking before shipping, not after. The corrected rule (the OTHER it-marker) was cross-checked against 4 known roots before shipping, with an honest caveat in the data's own `note` field; ubhayapada roots aren't distinguished from parasmaipada, and seT/aniṭ was left out entirely rather than risk a second wrong guess (documented in the build script's own comment, including the exact wrong hypothesis and why it was wrong).
  Wired `dhatu.html`/`js/dhatu.js` in, added an Explore-menu link (`index.html`), and verified in a real headless browser: all 2229 roots load, search finds specific roots correctly, the pada field displays correctly for spot-checked roots (भू→Parasmaipada, एध्→Ātmanepada), and the वृत्तयः panel loads real GPL-licensed Mādhavīya commentary text (सायणः's actual gloss on एध्, with real derived forms) across all three vṛtti tabs with no console errors.
  **Not done, and explicitly out of scope for what was verifiable here:** T1 (Prakriyā/Śabda/Kṛdanta/Taddhitānta derivation viewers) — vidyut's `Vyakarana.derive()` Python API does work (tested directly: correctly derived "Bavati" for BU), but the site's `prakriya.js`/etc. expect a specific JSON shape from Rust generator scripts (`gen_prakriya_json.rs` etc.) that weren't in this handoff's zips, and guessing that shape without the reference scripts risked shipping JSON those pages can't actually render — safer to leave for whoever has the real generators. Ganapāṭha, Uṇādi/Phiṭ/Liṅgānuśāsana/Vārttika, Pratyaya catalog, Paribhāṣā (stages 6-12) are all still genuinely missing — vidyut's own downloaded data package (`prakriya/unadipatha.tsv`, `varttikas.tsv`, `kaumudi.tsv`, etc.) turned out to bundle several of these directly and could unblock T5 (authoritative Kaumudī order) too, a real, promising follow-up not pursued further given the time already spent getting stage 15 itself working end-to-end.

- **Prakasa Samhita (Pancharatra) ingested — first populated samhita in `agama/pancharatra/pancharatra_samhitas/` (the other 14 are still empty stubs).** Source: GRETIL corpustei TEI (`sa_prakAzasaMhitA.xml`), CC BY-NC-SA 4.0, project lead supplied it already converted IAST→Devanagari this session (matches `GRETIL_source_catalog.csv`'s own note: 1623 verses, `DONE_devanagari`). Parsed by marker `// ps_<paricchheda>,<adhyaya>.<verse> //`: 2 paricchhedas (15 + 6 adhyayas), 21 units total, 1623 shlokas — the parsed count matches the catalog's stated count exactly, and spot-checked first/last verses of both paricchhedas against the source text directly. Wired into `taxonomy.json` (new `prakasha_samhita` leaf) and `library.json` (new populated entry, positioned among its `pancharatra_samhitas` siblings, not appended out of place). Editorial/structural lines (colophons, "अथ...अध्यायः" chapter openers, "...उवाच" speaker tags) dropped, matching this corpus's own stated "mula only" convention and the same stray-line-drop approach `importers/gretil.py` already uses elsewhere.
  **Not done, and flagged rather than guessed:** no live-fetch importer was added to `importers/` for this text. GRETIL's own domain (`gretil.sub.uni-goettingen.de`) is blocked by this environment's outbound proxy policy (confirmed via a direct request — 403 policy denial, same block as the CDN domains noted elsewhere in this doc), and the corpustei source is TEI-XML (a different structure than the plain-HTML/plaintext GRETIL pages `gretil.py` already parses) — building a live importer for an XML format I can't fetch to actually test against would mean shipping unverified parsing logic, so it wasn't done. The pre-converted Devanagari text (this session's upload) is the actual, verified source of the committed data; a live-fetch importer for future re-runs is a real follow-up task if wanted, ideally built/tested on a machine that can reach GRETIL directly (matches this repo's own existing pattern of running such importers via GitHub Actions, not this sandbox).
  Remaining `pancharatra_samhitas` stubs (Sattvata, Paushkara, Jayakhya, Ahirbudhnya, Ishvara, Parama, Padma, Vishnu, Naradiya, Lakshmi Tantra, Hayagriva, Parashara, Vasishtha, Vishvaksena) are still empty — `GRETIL_source_catalog.csv` shows most as `confirmed_on_gretil` (findable, not yet transliterated) or `gap_scanned` (only on archive.org as scans, needs OCR) — a real next task once sourced the same way Prakasa Samhita was.

- **Update (fresh Proofread run of sargas 10-13, using the just-fixed pipeline): confirmed clean and matches the source's own printed counts exactly — 10=56, 11=77 (78 per the project lead's reference, one verse still to insert), 12=54, 13=69 (matches the project lead's own "13.69" reference). No duplicate text, no missing pages.** One genuine content finding, not a bug: indices 57-58 (pages 122-123, between sarga 10 and 11) are a real editorial appendix — the book shows verses 10.48 and 10.54 rearranged into their *sarvatobhadra* (palindrome) and *chakrabandha* (wheel-pattern) citrakavya forms, not new narrative verses. Awaiting the project lead's call on how to fold this into `sarga_10`'s schema (extra commentary on shlokas 48/54, or set aside separately) before pushing sarga_10; sargas 11-13 have no open questions and are ready to push once asked.
  **Update (v0.33.0) — this citrakavya-appendix finding CONFIRMED with real data, root cause fixed, plus three more real bugs found the same way.** The project lead shared the actual PDF plus real Vision/Gemini API keys specifically so this could be tested end-to-end instead of only with synthetic fixtures. Ran the real pipeline against pages 119-124 (the exact sarga 10/11 boundary):
  1. **Root cause of the 57/58 "duplicate" confirmed directly, not inferred.** Real Vision OCR reproduced the page 122-123 text verbatim ("अस्मिन् काव्ये द्वौ बन्धौ कविना ग्रथितौ सर्वतोभद्रं च चक्रबन्धश्च... [१०.४८]" / "...चक्रबन्धग्रथितं... [१०.५४]"), and real Gemini proofreading of that text got it exactly right on its own: it gave every genuine shloka (45-56, then sarga 11's 1-4) a real `number`, but correctly left `number` OUT of the two appendix entries — a real, reliable signal Gemini already emits by itself, needing no prompt change. The actual bug was downstream: `mergeSavedProofreadChunks()` in `app.js` blindly assigned every entry the next sequential `index` regardless of whether Gemini gave it a real number, which is exactly how two appendix pages became fake shlokas "57" and "58". Fixed: an entry with no `number` still gets an index (nothing is dropped) but is now forced to `classification: "review"` with an explicit note pointing straight at the fix ("...delete this row in the schema editor below (numbering auto-adjusts) or merge it into the previous shloka") — closing the loop with the manual row editor shipped in v0.31.0. Verified in a real browser reproducing this exact real shloka sequence: the two appendix entries land in Review class C with the new note, and the schema still renders/builds cleanly around them.
  2. **A second, unrelated but serious real bug found along the way: this app's default AND fallback Gemini models are both dead for a freshly-issued API key.** `gemini-2.5-flash` (the hardcoded default in `js/gemini.js`, shared by every AI feature on the site) and `gemini-2.5-flash-lite` (its own one-step fallback) both returned a real 404 ("no longer available to new users") against the project lead's real key — even though `models.list` still lists both with `generateContent` support, which apparently doesn't reflect real per-key availability. With both primary and fallback dead, every AI feature site-wide (Convert, Kosha, Ashtadhyayi, main app chat) would fail outright for this exact key with no automatic recovery. Switched both to Google's own `-latest` rolling aliases (`gemini-flash-latest` / `gemini-flash-lite-latest`), confirmed working against the same key. Also fixed a user-facing error message in the same file that was suggesting the now-dead `gemini-2.5-flash` as the fix for a 404 — would have sent an affected user straight into a second 404.
  3. **Real evidence the default max-output-token budget is too low for genuinely dense classical-kavya text.** The same 6-page real Proofread run (verse + the citrakavya appendix + commentary-style explanation) hit `MAX_TOKENS` at the shared client's 8192-token default and only completed cleanly at 32768. Raised Convert's own effective default (when the admin hasn't typed a value) to 16384 — a real, evidence-backed floor specific to Convert's dense-JSON-dump use case, deliberately left the shared 8192 default untouched for other, lighter-weight Gemini features elsewhere on the site that don't need it.
  4. **A real discrepancy surfaced, not resolved — flagging rather than guessing.** The project lead's own manifest gave "11.1 अति-चित्र-धाम्नि" as sarga 11's opening verse. The real PDF (and real Gemini output from it) both show verse 1 as "प्रचुरान्तर-प्रवचनं फणि-राड्..." — "अति-चित्र-धाम्नि" is verse **2**, not 1, in this book's own printed numbering. Not fixed or assumed either way; needs the project lead to double-check their reference (possibly a different edition's numbering, or a transcription slip) before this specific manifest row is trusted.
  5. **Also caught and fixed while shipping this: EVERY per-file cache-bust query string in `index.html` except `app.js`/`style.css` had been stuck at `?v=0.30.1` since v0.30.2, despite `mapper.js`, `sarga-detect.js`, `renderer.js`, and both `gemini.js` files all being genuinely edited in the meantime** (the auto-split fix, the schema editor, the colophon support, and this round's model/merge fixes) — the exact same "stale cache-bust" class of bug already caught once this session for `app.js` alone, just wider than realized. All 17 script/style tags are now bumped together to the same version number every release, instead of trying to track each file's own version independently — the safer default going forward.
  All of the above (except item 4, which is a data question, not code) verified in a real browser; item 1's fix additionally verified against the real Gemini output it was built to handle, not just a synthetic approximation of it.
  **Update (v0.34.0) — the project lead asked for the same real test extended across the FULL sarga 10-12 range (pages 109-152, 44 pages), not just the one boundary. Found and fixed one more real bug, and got a strong end-to-end confirmation on the rest.**
  1. **Sandbox-specific hurdle, not an app bug**: this sandbox's egress proxy blocks `cdnjs.cloudflare.com`/`cdn.jsdelivr.net` (confirmed via `curl`, 403), which breaks pdf.js — so the real PDF couldn't be uploaded directly through a real headless browser here. Worked around it two ways without touching the real device path a real user actually uses: (a) Convert's own image-upload path (`loaders.js` → `image.js`) accepts pre-rendered page images directly, no pdf.js involved, so the real PDF's 44 pages were rendered to PNGs and fed in that way when driving the real browser UI; (b) even that hit a second, deeper sandbox quirk — this specific headless Chromium's own outbound requests to `vision.googleapis.com`/`generativelanguage.googleapis.com` were silently dropped before ever reaching the proxy (confirmed via the proxy's own relay logs: Chromium's background telemetry pings showed up there, a direct `page.goto()` to the same Vision URL did not), even with `--proxy-server` set explicitly — while the exact same real calls succeeded every time from plain Python `requests`/`curl` in this same sandbox. Rather than spend more time fighting a sandbox-specific network quirk unrelated to any real user's browser, ran the real OCR+Proofread via Python (proven working) and fed the real output into the real app's own IndexedDB exactly as a live run would leave it, then drove the real browser's own merge/auto-split/manifest-check code against that real data — same technique already used successfully throughout this session, just scaled up to real, full-range data instead of a synthetic fixture.
  2. **A second real, more consequential inconsistency in Gemini's own output found by comparing two independent real runs of the same source content**: a chapter boundary marker (colophon or chapter-opener) can land in EITHER the `sa` field or the `commentary` field depending on the run — confirmed directly: the first (6-page) run put sarga 10's closing colophon and sarga 11's opening line in `sa`; the second (44-page) run put BOTH of those same lines in `commentary` instead for the exact same page content. `sarga-detect.js`'s `detectAnchors()` only ever checked `sa`, so the second run's real output silently merged sarga 10 and 11 into one 133-shloka segment — exactly the kind of merge mistake this whole feature exists to prevent, just from a different cause than the already-fixed 57/58 case. Fixed: `detectAnchors()` now checks both fields. Re-ran the exact same real data after the fix: sarga 10 (56 shlokas), sarga 11 (77 — matches this project's own previously-documented real print count exactly), and sarga 12 (54, matching the project lead's manifest exactly) all split correctly. Also caught, while comparing the two runs, that Gemini fully OMITTED the citrakavya appendix pages (122-123) on this second run instead of including them unnumbered as it had the first time — a real, further inconsistency in how Gemini handles this specific tricky content, but not a gap in this app: the existing "N selected page(s) have no proofread text" warning (built well before this session, `lastProofreadMissingPages`) already exists precisely to catch a page contributing zero output, and would have fired on a real live Proofread run — it simply wasn't exercised by this test's IndexedDB-seeding shortcut, which bypasses the live run that computes it.
  3. **The manifest-check feature (v0.32.0) proved itself on real data in the same run**: fed it the project lead's real sarga 10/11/12 manifest against a page range that (deliberately, to see what would happen) started mid-sarga-9 and ended mid-sarga-13. It immediately flagged the top-level mismatch ("Manifest lists 3 chapter(s), but 5 were actually built") plus every per-chapter count/opening/closing mismatch that followed from that — exactly the kind of signal this feature was built to give, on a real run, not a contrived one.
  4. **A fourth real staleness bug, in the same family as the cache-bust fix directly above**: the visible "Version: X" text and this page's `<title>` were plain hardcoded HTML with no JS keeping them in sync — only the adjacent "Build: Y" text was ever actually wired up to the real `DGE_CONVERT_BUILD` variable. The version number shown on screen had been frozen at "0.30.1" for several releases (visible in the project lead's own earlier screenshots) while the real code moved on underneath it. Both now driven from `DGE_CONVERT_VERSION` at load time, the same source of truth as the build string.
  All fixes verified in a real browser against the real data from this run; no regressions found against the existing synthetic-fixture test suite for the schema editor, the unnumbered-shloka flagging, or the manifest check.
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

- **Convert tool (v0.30.2): fixed a second gap in the same reload-recovery logic from item 1 above — the "known files" quick-resume button skipped it entirely.** The project lead hit this directly on the Sumadhva Vijaya sargas 10-13 run: file status bar correctly showed "Proofread 8/8 chunk(s)" (OCR 57/220, 163 pending), yet Build Schema Preview threw "⚠ No proofread JSON yet — run Proofread first." Root cause: `onFileSelected()` (re-picking the actual file via the file input) already had the correct completeness check and called `mergeSavedProofreadChunks()` to rebuild `finalJson` for free — but `resumeFromKnownFile()` (tapping a `.known-file-btn` in the known-files hint panel, the *other* way to resume without re-selecting the file) never had the same check, so it always showed the generic "tapping Proofread will resume from where it left off" note and left `finalJson` null even when every chunk was already saved. Fix: mirrored the exact same `isComplete` check + `mergeSavedProofreadChunks()` call into `resumeFromKnownFile()`. Verified in a real (headless) browser: seeded IndexedDB with a complete 2/2-chunk saved proofread result reachable only via the known-files hint, reloaded, clicked the known-file button, confirmed the resume note read "2/2 proofread chunk(s) already saved for this file — restored automatically, nothing to re-run" and Build Schema Preview succeeded with no "No proofread JSON yet" error. Immediate workaround for anyone hitting the old bug before this ships to their device: re-select the file directly via the normal file picker instead of the known-files quick-resume button — that path already worked correctly.

- **Convert tool (v0.30.3): auto-populate grantha title/author from a populated sibling — direct project-lead ask ("shouldn't title etc be auto populated? I don't have to give grantha title every time for each new sarga").** Picking a target slug (via search, the folder browser, or its "suggested next segment" button) that ends in a number and has a populated sibling under the same parent path (e.g. picking `kavya_alankara/sumadhva_vijaya/sarga_10` when `sarga_9` is already populated) now auto-fills: **title**, by swapping the sibling's own trailing number for the new one (`"Sumadhva Vijaya सर्गः 9"` → `"...सर्गः 10"`) — keeps whatever chapter-word the sibling actually used (सर्गः, स्कन्धः, काण्डः, ...) instead of assuming one, so it works for any multi-part work, not just सर्गः-numbered kavyas; **author**, by fetching the sibling's own already-pushed `data.json` from GitHub and reading `metadata.author` (a real network call, best-effort — silently does nothing on failure/no token, never blocks picking a target). Never overwrites a value the admin actually typed — only fills a field that's still empty or still holds this code's own last guess, tracked via `lastAutoFilledTitle`/`lastAutoFilledAuthor`, so typing your own title then picking a different sibling never gets clobbered. Verified in a real browser (mocked catalog + GitHub API): title and author both auto-fill correctly from a real sibling, and a manually-typed title survives re-picking the same target unclobbered.
  **Not fixed, and flagged rather than guessed — the same run's sarga_11_to_12 "unconfirmed" merge (131 shlokas) reported alongside this ask.** `sarga-detect.js`'s auto-split (v0.28.0) correctly split off `sarga_10` (58 shlokas) and `sarga_13` (69, matching the project lead's own "13.69" reference) using real chapter-open/colophon markers, but found ZERO markers anywhere in the 11–12 span, so it honestly labeled the whole stretch a range instead of guessing a wrong split — the conservative behavior it was deliberately built to have (see the v0.28.0 entry above). This means the source text's own colophon for sarga 11's end and/or chapter-opener for sarga 12's start didn't survive OCR/Proofread as recognizable text for this specific page — a data-quality gap on that one internal boundary, not a code defect (the same detector's markers worked fine immediately before and after this span). Useful ground truth already on record from this project's own earlier per-sarga page-range investigation (see the "Update (fresh OCR of pages 101-220...)" entry above): sarga 11 = 77 shlokas, sarga 12 = 54 — **77+54 = 131, an exact match** for this merged block's count, strong (not proven) evidence the real cut is exactly 77 shlokas in. Immediate workaround: the auto-split's per-segment schema-preview textareas are independently editable before Push (existing, unrelated behavior) — the merged block's text can be manually cut at its 77th shloka into two segments before pushing. A generic fix (recognizing this source's own printed running cumulative-shloka-count colophon — "आदितः श्लोकाः-N+M=N+M" — as a THIRD anchor type, independent of the named-ordinal markers) is plausible but not built: it would need verifying against this run's actual proofread text to confirm Gemini's output still carries that exact marker, which isn't available from this session (lives only in the project lead's browser).
  **Update (v0.31.0) — the manual editor the workaround above needed now actually exists, per the project lead's own detailed spec.** Their exact ask, in full: delete a shloka with auto-renumbering; type a target number and have a shloka relocate there with everything else auto-sorting; insert a manual sarga-boundary between any two shlokas (with the next one restarting local numbering at 1, and an editable closing-colophon field); a quick-jump search instead of scrolling a long list; and (separately) get Gemini itself to flag suspected split-shloka/boundary issues instead of only catching them after the fact. All built:
  1. **Real bug found and fixed along the way, independent of the editor itself**: a split-off segment (e.g. the auto-detected "sarga 11" block) kept the BATCH's global running shloka index instead of restarting at 1 — exactly what the project lead caught directly ("Ekadasha sarga should have started with one. Instead it is showing as 59"). `MapperMod().buildGranthaJson` keys shlokas by `index`, and `buildSchemaPreview()`'s per-segment slice never remapped that field after slicing. Fixed: each segment's shlokas are renumbered 1..N locally before mapping, matching the LOCAL per-sarga numbering convention every other sarga in this project already uses.
  2. **Per-row toolbar** (`renderer.js`, delegated click handlers so it survives rows being added/removed): move up/down, "move to position #" (type a target number, the row relocates there, everything renumbers), "+ shloka" (insert a blank row right after, for a verse the OCR/print genuinely omitted — e.g. the already-flagged sarga 11 verse 59 gap), "✕ delete" (blocked below 1 remaining row, so a segment can't collapse to an empty file), and "✂ split sarga after this" (see below). A row's number is never separately stored — it's always recomputed from its live DOM position, so any of these operations "just works" with no separate bookkeeping to keep in sync.
  3. **"Split sarga after this shloka"** — the manual complement to `sarga-detect.js`'s automatic detection, for exactly the sarga_11_to_12 case above: cuts a segment's row list at that point into two independently-editable blocks (bootstrapping an ordinary single-file batch into the same multi-segment machinery on its very first split, so there's only one code path). The new segment's number/slug/title are auto-suggested as "previous + 1" — but ONLY when that number isn't already claimed by another segment in the same batch; caught this colliding with a real already-existing next segment during testing (splitting "sarga 10" when "sarga 11" already followed it produced two blocks both auto-titled "सर्गः 11") and fixed it to fall back to an obviously-unfinished label ("...(split — rename me)") instead of a silently wrong duplicate. Every segment's title AND path are now plain editable text inputs (previously static text) for exactly this reason — auto-derived numbers are a starting guess, not a guarantee.
  4. **Closing colophon field**, per segment, wired to the existing `metadata.colophon` convention (already used by `kavya_alankara/sumadhva_vijaya/sarga_1..8`, confirmed by reading one of those files directly) — optional, stored separately from whatever's already in the last shloka's own text, with a `suggestColophon()` helper in `sarga-detect.js` that offers a sibling/previous segment's own colophon text with just its ordinal word swapped, when one's available, rather than fabricating lineage/authorship wording this code has no way to know.
  5. **Quick-jump search bar** above the whole preview area (`#schemaJumpBar`) — searches Sanskrit + commentary text across every segment at once, Enter/click cycles matches, scrolls to and briefly highlights the matched row.
  6. **Gemini-side detection, the project lead's direct ask ("isn't there any way that Gemini AI recognizes this discrepancy")**: added rule 10 to `PROOFREAD_PROMPT` (`gemini.js`) — explicitly tells Gemini to watch for an incomplete/garbled chapter-opening or closing-colophon line, or a verse that looks like it was wrongly split into two shlokas (or two merged into one) beyond what the existing verse-marker-reattachment rule already resolves, and to set `classification: "review"` with a specific note when either looks likely — surfaced through the existing review-classifier UI a human already checks, not a new UI.
  Verified all of the above in a real (headless) browser end-to-end, including the caught-and-fixed collision case: local renumbering after auto-split, delete/insert/move-up/move-to-position all correctly renumbering, split-after both bootstrapping a plain single batch and splitting an already-multi one, the colophon field landing in the actual committed JSON (intercepted the real GitHub blob-creation request bodies, not just DOM state), and the jump bar finding/highlighting the right row.
  **Not built, explicitly out of scope for this pass**: true multi-select-and-bulk-move (the per-row ▲/▼ plus "move to position #" covers the same outcome one row at a time, which is what got built); auto-extracting an existing embedded colophon out of a shloka's own text into the new separate field (the field is purely additive — nothing already in a shloka's text is touched or duplicated); the cumulative-shloka-count auto-detection third anchor type flagged in the entry directly above (still unverified against real data, unrelated to this manual-editor ask specifically).
  **Also caught and fixed while shipping this: a real cache-staleness bug of exactly the kind `PENDING.md`'s own "Known unresolved bugs" section warns about.** The v0.31.0 commit bumped `DGE_CONVERT_VERSION`/the CSS cache-bust query string but missed `app.js?v=` — so the version banner would have claimed 0.31.0 while some browsers kept serving the OLD app.js under the stale `?v=0.30.3` URL, silently NOT getting any of that release's fixes. Caught by re-checking all four cache-bust points together before this release, not by a user report — worth double-checking all of `DGE_CONVERT_VERSION`/`DGE_CONVERT_BUILD`/`app.js?v=`/`style.css?v=` move together every time, not just the ones that were actually touched.
  **Update (v0.32.0) — the project lead's next ask, built together as planned: (1) the schema-editor's edits now survive a reload, and (2) a "chapter manifest" ground-truth check.**
  1. **Schema-edit persistence.** Before this, every delete/move/insert/split/colophon/title edit in the schema preview lived only in the DOM — a reload (the same tab-eviction failure mode already fixed for OCR/Proofread progress, see the v0.29.0 entry above) would have silently discarded all of it, even though the underlying Proofread data survived fine. `saveSchemaEditState()` now re-collects the LIVE, current state (via the same `collectEditedShlokas()` the row editor already uses) into IndexedDB after every Build Schema Preview, every row-level edit (`renderer.js` now dispatches a bubbling `dge-schema-changed` event on any structural change or textarea input, debounced 800ms before writing), every title/slug/colophon edit, and every manual split. `resumeFromKnownFile()`/`onFileSelected()` now restore it automatically on file resume, right alongside the existing Proofread-completeness restore — no extra click, no re-running Build Schema Preview.
  2. **Chapter/sarga manifest** — the project lead's exact spec: how many chapters/sub-chapters, how many shlokas each, first/last few words of each chapter's opening/closing shloka, and its closing colophon — entered as ground truth BEFORE checking the output, then validated automatically against whatever's actually built (and re-validated live after every edit, not just once). New collapsible "Chapter/sarga manifest" section above the schema preview; each row is `{label, expected shloka count, opening words, closing words, colophon}`; matched to the actual built/split segments by position and checked with lenient (whitespace/danda-normalized, substring-near-start/near-end) text matching, since OCR output won't be byte-identical to hand-typed expectations. Renders one clear banner: a green "✅ N/N chapters match" or specific red flags ("expected 4 shloka(s), found 3", "opening doesn't match manifest..."). Persisted and restored the same way as the schema-edit state, for the same reload-survival reason.
  **Real bug caught and fixed while building/testing this, not shipped broken**: the manifest check's first implementation read `seg.mappedJson.shlokas` directly — a snapshot object that's only ever updated by the title/slug/colophon input handlers, never by row-level delete/move/insert (those only ever touch the DOM). It would have silently never noticed a row being deleted or moved. Fixed to re-derive the live shloka list from the DOM the same way the save function already does, for both the manifest check and (implicitly, since it shares the fix) anything else that needs "what does this segment actually contain right now."
  Verified all of the above together in a real browser: a clean manifest match, a live count-mismatch flag immediately after deleting a row (no rebuild needed), a live closing-text mismatch after inserting a blank row, and — the actual point of building this — a full page reload followed by known-files resume correctly restoring both the exact edited shloka list (including the mid-test blank insert) and the manifest itself, with the check immediately re-confirming the same (correctly still-flagged) mismatch state.

- **Confirmed clean from a fresh OCR upload, cross-checked against the project lead's own reference-edition boundary shlokas: raw OCR is NOT the source of the sarga_10-16 corruption.** See the "Update" note attached to the FLAGGED sarga_10 entry above for the full per-sarga page ranges and the source's own printed running-cumulative-shloka-count discovery (an independent ground truth for exact per-sarga shloka counts, straight from the book). Still needs: the project lead to re-run Proofread on this same OCR data through the now-fixed pipeline (items 1-3 directly above), and a decision on how to handle sarga 11's one verse (59) that this print physically omits but the reference edition includes.

- **Convert tool (v0.26.0–0.27.0): root-caused and fixed the "OCR says choose a file again after backgrounding the tab" report, plus batched Vision OCR calls (real speedup, project lead's own suggestion).**
  1. *Root cause, explained to the project lead and now explained in-app*: nothing was actually lost. Two SEPARATE browser behaviors were conflated in the report — (a) a backgrounded tab's JS pauses immediately (recoverable, just wait); (b) after several minutes away, mobile browsers can go further and evict the whole tab's memory, wiping the live PDF file object (not recoverable — no web page can prevent this, it's the same security boundary that stops any site reading files without the user re-picking them each time). OCR needs the live file to render more page images and hits this; Proofread doesn't (it only reads already-saved OCR text from IndexedDB), which is exactly why the project lead's own account showed Proofread's "resume from where you left off" working smoothly while OCR's did not. The old error, "Load a PDF or image(s) first," was technically correct but read like data loss. Replaced with `describeFileReselectNeeded()` in `app.js`: names the specific file and exact page progress when there's exactly one candidate (from `currentFileDisplayName` or the single entry in the known-files list), stays generically reassuring rather than guessing when there are multiple known files and no resume click yet (verified this exact ambiguous case with a real test — my first attempt at the fix wrongly named one of several candidates, caught and fixed before shipping). Also rewrote the Upload tab's warning hint to explain both mechanisms explicitly. This is the real, permanent fix available within a pure client-side tool — the underlying tab-eviction behavior itself cannot be prevented from a web page, full stop; only the confusion around recovering from it could be fixed, and now is.
  2. *Batched Vision OCR calls — the project lead's own suggestion ("more than one page at once, like 5, instead of one after another") — implemented for the "Vision AI only" engine.* Added `ocrImagesBatch()` in `vision.js`: Vision's `images:annotate` endpoint already accepts multiple images in one HTTP call, each returning its own independent result, so this is a real cut in network round-trips over a large book (not a change to Vision's own per-image OCR speed or cost). New "Pages per Vision API call" field in the OCR tab, default 5, persisted like every other option; set to 1 to fall back to the original one-call-per-page behavior. Deliberately conservative on failure: one bad page fails the WHOLE batch as a unit (same halt-and-resume-after semantics the tool already relied on, just a coarser unit) rather than trying to salvage partial results — kept it simple and safe rather than clever. Not applied to "Tesseract.js only" (no network call to batch — it's local WASM work) or "Both" (the per-page Vision+Tesseract cross-check would only get more complicated for no matching benefit) — confirmed via diff that neither of those code paths was touched at all, purely additive. Verified thoroughly in a real browser with a mocked Vision endpoint: a 12-page run at batch size 4 made exactly 3 HTTP calls (not 12) with correct per-page results; a simulated batch-2 failure correctly halted after exhausting retries, kept pages 1–4 saved, and reported the right page range; reloading the page (simulating the real tab-eviction scenario) and re-selecting the file correctly showed "Resume OCR from page 5?" — exactly the batch boundary — and resuming completed cleanly with no duplicates.

  **(a) Decided, not yet built — GitHub Actions unattended-processing pipeline.** Project lead's answer: "Both, as a choice in Convert" — a hardened client-side path AND a GitHub Actions path, selectable within Convert, not one instead of the other. Explicitly paused mid-build ("wait") before implementation started; the decision stands, just deferred. Planned approach so far, matching this repo's existing conventions (`.github/workflows/ingest.yml`, `importers/`): Python, `workflow_dispatch` inputs mirroring Convert's own fields, PR-based via `peter-evans/create-pull-request` (not a direct push — same as `ingest.yml`), `VISION_API_KEY`/`GEMINI_API_KEY` as GitHub Secrets (confirmed safe — this repo is public, workflow would be owner-triggered, Secrets are masked in logs and withheld from fork PRs), Vision-only for v1 (Tesseract stays browser-only), a Convert-UI trigger button as a deferred follow-up phase. Not started — resume once the project lead says to continue.
  **(b) Still open, not yet decided:** whether to build automatic OCR→Proofread pipeline overlap (Proofread currently CAN be run manually while OCR is still going — nothing blocks clicking both buttons — but it only proofreads whatever's in the in-memory OCR list at the moment it's clicked, not automatically as new pages keep finishing).
  **(c) From the same follow-up message, still open (not yet built):** cancel/pause and live-vs-snapshot config-read behavior during a run were explained to the project lead, not code changes (Cancel already IS pause — nothing destructive, everything saved incrementally; model/context-anchor/max-tokens fields already apply live to the next chunk; chunk-size/OCR-batch-size need Cancel→change→Resume, which already works). Actual open builds: (1) show Gemini's real per-model max output token limit next to the model picker (`listModels()` in `gemini.js` already fetches `outputTokenLimit` from `models.list` but discards it); (2) adaptive/recommended chunk-size or page-count suggestions before/during a run; (3) ~~auto-populate grantha title/author when the chosen target slug is a sibling of an already-populated multi-part work~~ — done, see v0.30.3 entry below; (4) folder-naming-convention audit/enforcement for new targets; (5) "Accept all" bulk action in the Review tab (only per-shloka Accept/Edit/Mark-unresolved exist today); (6) scroll-to-top/scroll-to-bottom quick-nav for long Review/Push previews; (7) make the Log panel persistently visible/pinned/floatable/minimizable instead of only reachable via its own tab. Schema-preview textareas being editable before push was confirmed already true, no change needed.

- **Sumadhva Vijaya: Sargas 1–8 ingested (441 shlokas), following the project lead's own ingestion spec — direct raw-text upload, not through Convert.** The project lead supplied a full raw Sanskrit transcript (`sumadhva_vijaya_sargas_18_full.txt`) plus a companion spec document describing the target schema and requested a validation report. Parsed programmatically (not by hand, to make the reported counts trustworthy) — split on the `## अथ ... सर्गः` headings, separated each sarga's colophon (kept, not counted as a shloka, stored as `metadata.colophon`) from its verse blocks, matched each block's trailing danda-delimited number marker, normalized digits (including a few genuinely mixed-script markers in the source itself, e.g. "३0", "२8", "५0" — Devanagari digit + ASCII digit in the same marker — handled correctly, not misread). Result exactly matches the spec's own index table and the cumulative totals baked into the source's own colophons (e.g. "आदितः श्लोकाः-१०९+५६=१६५" after sarga 3): **55+54+56+54+52+57+59+54 = 441**, zero duplicate keys, zero missing numbers, zero malformed blocks. 4 records flagged with `[ ]` (uncertain/missing source characters, sarga 6 key 34; sarga 8 keys 19/27/33) — preserved exactly as supplied per the spec's own instruction ("keep uncertain/missing characters... exactly as supplied... flag them for a later editorial-review layer"), not silently fixed or guessed at. Pushed as `kavya_alankara/sumadhva_vijaya/sarga_1` through `sarga_8` (same flat-shlokas-dict schema as the existing sarga_9, LOCAL per-sarga numbering matching the printed marker, `commentaries: {}` since this source has none). Verified in a real browser: every sarga fetches with the right shloka count and number range, the actual reader renders sarga 3's text correctly (spot-checked against the source verbatim), and the Library tree now shows all 9 sargas as distinct clickable entries.

  **Along the way, also renamed all 9 catalog titles for consistency** (`Sumadhva Vijaya सर्गः 1` … `सर्गः 9`, matching the exact `"<work> स्कन्धः N"` pattern already used by Bhagavata Purana's skandhas) — the pre-existing sarga_9 entry's title was just bare "Sumadhva Vijaya" with no sarga number, which would have shown as 9 identical, indistinguishable leaf labels in the Library tree once sargas 1–8 were added alongside it (confirmed this was a real risk by reading `library.js`'s tree-render code — leaf labels come straight from the catalog `title` field with no other disambiguator). Only `library.json`'s title and `sarga_9/data.json`'s own `metadata.title` were touched — its shlokas/numbering were left exactly as they already were.

  **Retracts part of an earlier flag in this file**: previously guessed that the pre-existing sarga_9 (verses 15–55, from an earlier separate Convert/OCR job, source unknown) might actually be mislabeled Sarga 1 content, since 15–55 exactly matches the tail of Sarga 1's real range. Now that the real Sarga 1 text is available, checked directly — sarga_9's actual text ("प्राज्ञ-वित्तमयमाप्तुमागतैः...", about a scholarly assembly/debate) does **not** match Sarga 1 verse 15 at all ("गोभिः समानन्दित-रूपसीतः...", about Hanuman crossing the ocean). That hypothesis is disproven. What sarga_9 actually is remains unconfirmed either way — it doesn't match anything now supplied (only sargas 1–8), so it can't be checked against the real Sarga 9 until that text is supplied too. Left as-is; not blocking anything.

  **Also wired up audio for all 9 sargas** (the other half of the project lead's ask, "map audios"). Confirmed the existing `smv<sarga>.<verse_no>.mp3` filenames in `assets/` already use the exact same per-sarga LOCAL verse numbering as the shloka keys just ingested — spot-checked `smv1.1.mp3`, `smv1.30.mp3`, `smv1.55.mp3`, `smv3.1.mp3`, `smv3.56.mp3`, `smv8.1.mp3`, `smv8.54.mp3` all actually exist, a direct 1:1 match with no renaming or re-mapping needed. Set each sarga's `metadata.archiveBaseUrl` = `"data/kavya/sumadhva_vijaya/assets/"` (relative, same-origin — the files are already committed straight into this repo, not a separate CDN/repo, so this matches how every other same-repo asset is already fetched), `filePrefix` = `"smv<N>."`, `fileExtension` = `".mp3"` — the app's existing `resolveAudioSrc()` (`js/audio.js`) already builds a URL as `base + filePrefix + id + extension` for whichever shloka's playing, so no new code was needed, only the 3 metadata fields per sarga. Verified in a real browser: every constructed URL fetches with HTTP 200 and `audio/mpeg` content-type across multiple sargas and edge verses (first/last/mixed-digit-marker verses), the on-page track counter correctly reads e.g. "2/55" after selecting a shloka in sarga 1 (not the 43 left over from the default stotra — that "0/43" seen before any shloka is clicked is a pre-existing static placeholder baked into `index.html` itself, present for every grantha until the first click, unrelated to this change). Sarga 9's audio was already correctly wired from the earlier push and was left untouched. Not covered: the sarga-opening announcement clips (`smv<n>.0.mp3`), Sarga 1's four intro tracks (`smv1.0a`–`0d.mp3`), and closing colophon clips (`smv<n>.end.mp3`, `end2.mp3` for sarga 16) — the app has no per-sarga "intro/outro audio" slot today, so these aren't reachable through the per-shloka player; logging as a possible future feature, not fixing now.

- **Convert tool: two more requested improvements built (v0.25.0) — auto-detected starting shloka number, and an always-visible file status dashboard.** Both direct follow-ups from the project lead's feedback on the numbering fix:
  1. *Auto-detect the starting number instead of always defaulting to 1 or requiring manual entry.* The project lead's exact ask: "why should shloka number always be hardcoded to fifteen... you should be looking at the shloka numbers found in that particular page... or you can optionally ask where should the number begin from, default is one." Added `U().detectVerseNumber(text)` in `utils.js` — scans the first merged shloka's own OCR'd text for the LAST danda-delimited marker (॥, | or ‖ on both sides) whose inner content is digits-only in one script, converts Devanagari/Kannada/Telugu/Tamil/Malayalam/Bengali/ASCII digits to a plain integer, and rejects compound markers like "१.४४" (contains a non-digit '.') rather than guessing at a chapter.verse split. Wired into `runProofread()`'s completion: if a marker is found, the "Starting shloka/unit number" field is auto-filled with a visible hint explaining where the number came from; a value the admin already typed is never silently overwritten (tracked via `lastAutoFilledStartingNumber`, cleared whenever a different file loads or its proofread data is cleared). Verified with real Devanagari/Kannada/ASCII text and a battery of tricky cases (no marker, compound rejected, last-of-multiple-markers, user-override survives) in a real browser — all correct.
  2. *Always-visible file status: pages loaded/OCR'd/proofread/pending, sarga/target, without having to hunt through tabs or re-select the file.* The project lead's exact ask: "how do I know how many pages... are loaded, how many proofread, how many OCRed... it must all be very clear on top of the convert tool page itself... if I again pick up the same file, it should show me that sarga name, shloka numbers which are loaded, etc." Added `#fileStatusBar` — same "outside every tab, never hidden" placement as the error box (so status is visible no matter which tab is open) — showing the filename, `OCR: X/Y page(s) — N pending`, `Proofread: X/Y chunk(s) — N pending — M shloka(s), numbered A–B` (upgrading to the actually-built schema's real numbered range once "Build Schema Preview" has run, since that reflects any starting-number offset), and the chosen target grantha path. Wired into `renderFileStatusBar()`, called after every OCR page, every Proofread chunk, schema build, push, and — critically for the "re-picking the same file" case — at the end of `onFileSelected`/`resumeFromKnownFile`/`handleUrlImport`. Found and fixed a real bug of my own while building this: `currentMappedJson` (the built schema) was never reset when switching files or clearing progress, which would have shown a previous file's stale numbered range in the new status bar — added the reset alongside every existing `finalJson = null` site. Verified in a real browser: hidden with no file loaded, populates correctly on resume with the exact pending counts, updates live through a full OCR→Proofread→Build flow, and correctly resets to a clean state when switching to a different file (no leftover numbers from the previous one).

- **RESOLVED (v1 shipped) — Grantha content editor**, greenlit and built this
  session. Project lead's exact ask, resolved via `AskUserQuestion`: "Both
  — inline for quick text fixes, popup for structural changes." Built as
  `dge/js/content-editor.js`, wired into the main reading page (not
  Convert):
  - An `✏️ Edit` toggle appears in the grantha header, gated on
    `is-authorized` (admin) OR `is_superadmin` (project lead's exact
    words: "admin, super admin" — both tiers, not superadmin-only like
    Convert's own gate) AND the grantha actually being safe to edit (see
    below). Toggling it on shows a pencil icon per shloka.
  - **Inline edit**: tapping the pencil turns that shloka's text into a
    textarea in place with Save/Cancel, matching the "editable there
    itself" half of the ask.
  - **Structural edit**: a `🔀 Reorder / Insert / Delete` button opens a
    popup modal — one row per shloka with move-up/down, insert-after,
    delete controls, renumbering sequentially from the grantha's own
    existing starting number on Apply (mirrors Convert's schema editor's
    row model, matching the "similar to our previous schema editing"
    ask; drag-and-drop specifically not built — up/down arrows achieve
    the identical reordering outcome and are far more reliable to test).
  - **Safety**: neither edit mode touches GitHub until a floating "Preview
    & Save…" bar is explicitly tapped, showing the exact file path and
    new shloka count before pushing — reuses `admin-editor.js`'s existing
    `dgeAdminBatchCommit` (the same safe diff-and-skip-unchanged-files
    commit path Config Editor already uses), so no new GitHub
    infrastructure was needed at all.
  - **Real, deliberate scope boundary, not an oversight**: only grantha
    files whose source `data.json` is the plain legacy `{metadata,
    shlokas:{n:{...}}}` shape are editable — confirmed via a new
    `window.stotraDataEditable` flag set in `core.js` from the RAW
    fetched JSON, before `dgeNormalizeGranthaData()` overwrites it.
    Granthas that need that normalization to even render (`items:[...]`
    schemas — Vedic texts, itihasa_purana_text's per-chapter nesting)
    don't get an Edit button at all, since saving them back would need
    real denormalization logic that doesn't exist yet and risks
    corrupting the source file's actual on-disk shape. Sumadhva Vijaya
    (all of it) and most kavyas/stotras ARE covered by this.
  - Bumped `index.html`'s `dge-html-version` meta tag + `core.js`'s
    `DGE_EXPECTED_HTML_VERSION` together to `4.61.1` (the stale-shell
    detector both must agree on), plus `render.js`/`core.js`/the new
    file's own `?v=` cache-bust tags.
  - **Verified end-to-end in a real browser** against the just-published
    live `sarga_10` data (56 real shlokas): Edit toggle appears for an
    authorized session and not otherwise; inline edit stages a change and
    surfaces the save bar; structural modal opens with all 56 rows,
    insert/move-down both work and the row count updates correctly;
    Apply renumbers and updates the live shloka count; the save-preview
    modal shows the correct real target path
    (`dge/data/kavya/sumadhva_vijaya/sarga_10/data.json`) and shloka
    count. Deliberately did NOT click through to an actual push during
    this test (no real edit was intended) — the commit path itself is
    the same already-proven `dgeAdminBatchCommit` Config Editor uses, not
    new/unverified code.
  - **Not built / real remaining gaps, for whenever this comes up again**:
    denormalization for `items:[...]`-schema granthas (would unlock
    editing for a large chunk of the corpus currently excluded); editing
    the `commentaries` sub-object itself (currently only `sa` is
    editable inline; the structural editor preserves whatever
    commentaries a row already had but doesn't let you change them);
    pagination for very large shloka sets in the structural modal (an
    100+ verse sarga renders every row at once — functional but a long
    scroll, no perf problem found in testing but not stress-tested
    beyond ~56 rows either).

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
  `kavya_alankara/raghavendra_vijaya/sarga_9/data.json` moved to
  `kavya_alankara/sumadhva_vijaya/sarga_9/data.json` (see below); `library.json`'s
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
  originally at `kavya_alankara/raghavendra_vijaya/sarga_9`) is now at
  `kavya_alankara/sumadhva_vijaya/sarga_9/data.json`, alongside its own audio.**
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
    wrong one level deeper (`kavya_alankara/raghuvamsha/` → children are text
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
  has 4 real mahakavyas at `kavya_alankara/<name>/mula/data.json`, and (separately)
  large multi-part works like Bhagavata Purana use one catalog entry per
  part (`purana/bhagavata_purana/skandha_01`, `skandha_02`, …) — the
  second pattern is what actually works with Convert's current schema
  (flat, one grantha per push, each able to carry its own commentary
  layer later) without any code change, so the answer given was
  `kavya_alankara/raghavendra_vijaya/sarga_01`, `sarga_02`, etc., not the
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
  level correctly sanitizes to `kavya_alankara/raghavendra_vijaya`.
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

- **Three more admin-panel reports, all investigated this session
  (`dge/js/admin-editor.js` → v1.19, `dge/js/content-editor.js` → v1.3).
  One fully fixed, one fixed as a real feature gap, one only partially
  diagnosed — flagged honestly below rather than claimed as solved.**
  1. **RESOLVED (messaging, not a bug) — "edited PNS, saved, refreshed,
     still saw old text, but the admin file browser shows the right
     data.json."** This is almost certainly GitHub Pages' own CDN, not
     this app's caching: the site is served from
     `tribhuvanachar.github.io/bhumandala/dge/` (confirmed in
     `PROJECT_STATUS.md`), and GitHub Pages caches responses at its edge
     for a few minutes independent of anything the app does — the commit
     itself is real and immediate (which is exactly why the admin file
     browser, which reads straight from the GitHub API, already showed
     the correct text), but the *live* site can lag behind it briefly.
     Couldn't verify this against the actual production CDN from this
     sandbox (no reachable deployment here), so this is a strong
     diagnosis, not a confirmed one. Since there's no way to control GH
     Pages' Cache-Control headers from a plain Pages site, fixed the
     part that's actually fixable: `dgePushContentEdits`'s success alert
     now says this explicitly, so a refresh showing old text right after
     a push doesn't read as a failed save.
  2. **PARTIALLY INVESTIGATED, not confirmed fixed — admin file browser:
     "edited+saved PNS, navigated folders to Raghavendra Vijaya sarga_1,
     clicked its data.json, still saw PNS's old content until I manually
     closed the editor and reopened it."** Read through
     `dgeAdminOpenFile`, `dgeAdminNavigate`, `dgeAdminRowClick`, and
     `dgeAdminSaveFile` closely — structurally all four look correct
     (fresh cache-busted fetch every open, textarea cleared synchronously
     before the fetch, save closes the editor and resets its state,
     selection is cleared on every navigate, row click handlers get
     fresh path/name values from the current render with no stale
     closures). Could not reproduce live to confirm or rule out a
     specific cause — the repo is private and this session has no GitHub
     token, so even a read-only `dgeGithubListDir`/`dgeGithubGetFile`
     call fails here. Added a real hardening fix regardless of exact
     root cause: `dgeAdminOpenFile` now carries a per-call request ID
     (`dgeAdminOpenFileRequestId`), so if an earlier file's fetch somehow
     resolves after a later one has already started, its response is
     discarded instead of overwriting the textarea — a defensive fix for
     any race-condition variant of this symptom, not a confirmed cure
     for this specific report. If it recurs, worth noting whether any
     checkboxes were selected at the time (the one remaining code path
     that could plausibly swallow a row click without visibly failing).
  3. **RESOLVED — admin panel's "Recent Activity" Undo only ever worked
     on the single most recent commit; undoing anything older forced
     undoing every commit after it too, even when those were completely
     unrelated files.** Real, valid complaint — admin-panel commits are
     frequently unrelated single-file edits, and the project lead was
     right that they shouldn't have to unwind unrelated later changes
     just to revert one earlier one. Replaced `dgeAdminUndoLastCommit`
     (which only worked by resetting the tree to the target commit's own
     parent — correct only when that commit IS the current tip) with
     `dgeAdminUndoCommit(commitSha)`, a real per-commit revert: diffs the
     target commit against its own immediate parent to find exactly
     which paths IT changed (via two full recursive-tree fetches, not
     GitHub's Compare API, to avoid relying on its less-precise added/
     removed/modified semantics), then applies the inverse of just those
     paths on top of the CURRENT head tree via a partial tree update
     (`base_tree` + only the changed entries) — any commits before or
     after that touched OTHER files are left completely alone, which is
     the actual fix. Also detects genuine conflicts: if some later commit
     already touched one of the same paths again, that path is skipped
     (reported by name to the admin) rather than silently clobbering the
     later edit — matches what `git revert` itself would flag as a
     conflict rather than silently resolving. Every entry in Recent
     Activity now gets its own working "↩️ Undo This" button, not just
     the top one. Verified the core diff/conflict logic with a standalone
     unit test against synthetic blob-sha maps covering: unrelated
     commits touching different files (only the target commit's own file
     reverted, no false conflicts), a real conflict (same path touched
     again later — correctly skipped, not clobbered), added-file revert
     (deletes it), removed-file revert (restores it), the original
     "undo the actual last commit" case (still works), and a multi-file
     single commit (all its paths revert together) — all pass. Could not
     test the real GitHub API calls end-to-end for the same reason as #2
     (private repo, no token here), so this is logic-verified but not
     live-verified.

- **RESOLVED — Raghavendra Vijaya kavya data, all 10 sargas now published
  and registered.** Sequel to the entry below (which found the problem):
  the project lead confirmed "relabel and register 9 sargas, leave
  sarga_1 pending," then supplied the real sarga_1 content (42 verses,
  self-consistent `metadata.stotraCode: "sarga_1"`) directly, so all 10
  could go in at once instead of leaving a gap. Fixed as: moved
  `dge/data/kavya/"Raghavendra Vijaya"/sarga_N` → lowercase
  `dge/data/kavya/raghavendra_vijaya/sarga_(N+1)` for N=1..8 (each
  file's own embedded metadata already correctly said which sarga it
  actually was — the folder was just wrong), kept only ONE copy of the
  byte-identical sarga_9/sarga_10 duplicate under `sarga_10`, added the
  project lead's real sarga_1 as a new file, deleted the old
  space-and-capitals folder entirely (`git rm -r`, so git recorded the
  moves as renames), and added `library.json` entries for all 10 sargas.
  Verified in a real browser: all 10 sargas load with matching
  title/verse-count/rendered-card-count, and re-ran the new admin
  validator (see below) against the final corrected set — zero warnings,
  confirming the fix actually resolved every issue the validator itself
  had flagged on the original upload. 578 total shlokas across the
  complete work, no duplicates remaining (checked by hashing every
  sarga's shloka content pairwise).

- **Added real content-sanity checks to every admin write path**
  (`dge/js/admin-editor.js` → v1.18), directly prompted by the
  Raghavendra Vijaya discovery above — project lead asked "can we have
  checks when something is added/changed in data directly from admin
  page?" New `dgeAdminValidateGranthaFileEntries(fileEntries)` scans any
  `.../data.json` files in a pending upload/save and warns on exactly
  the failure modes just found for real: (a) a file's own
  `metadata.stotraCode` not matching the folder it's being placed in,
  (b) `metadata.totalShlokas` not matching the actual shloka count, (c)
  byte-identical shloka content appearing under two different paths in
  the same batch (duplicate/misplaced file), (d) a folder name with a
  space or uppercase letter (breaks from the site's
  lowercase_with_underscores convention), (e) grantha-shaped data with
  no matching entry in `data/library.json` yet — pushed but unreachable.
  Wired into all four write paths that exist: the zip uploader (shown as
  a non-blocking warning banner in its existing preview-before-confirm
  panel — that flow already had a checkpoint, so warnings just render
  there rather than adding a second confirmation), and the single-file
  upload, folder upload, and file-editor save paths (none of which had
  any preview step before, so a `confirm()` with the warning text now
  gates those instead — still overridable, this tool has to stay usable
  for arbitrary non-grantha files too). Verified for real in a browser:
  ran the validator against the actual 10 Raghavendra Vijaya files
  fetched from disk — it reproduced all 12 real problems (9 stotraCode
  mismatches, 1 duplicate pair, 1 missing-from-library.json count, 1
  naming-convention flag) with zero false positives against a known-good
  already-published file (sumadhva_vijaya sarga_9, clean run, zero
  warnings).

- **Content Editor (`dge/js/content-editor.js` → v1.2): edits now
  survive a page refresh, and there's a real Undo.** Project lead
  reported doing an inline edit on PNS, seeing it reflected, then
  refreshing and finding the old text back — with no success indicator
  to tell the difference between "staged" and "actually gone nowhere."
  This was working exactly as designed, not a bug: "Save" on an inline
  edit (or "Apply" in the structural editor) only ever stages the change
  in `stotraData` in memory — nothing reaches GitHub until "Preview &
  Save" is explicitly clicked (same intentional two-step design as
  Config Editor). But a plain in-memory stage has no way to survive a
  refresh, and the UI gave no indication that's what "Save" meant, so
  the loss read as a malfunction. Fixed by addressing the actual gap
  rather than just re-explaining the existing design:
  - Every staged edit (inline save or structural Apply) now also mirrors
    into `localStorage`, keyed per grantha file (`dgeContentDraft:<path>`),
    and is restored automatically on load — before the first render —
    so a refresh (or an accidental tab close) no longer discards work.
    Wired into `core.js`'s data-load path right after `initApp()` (needs
    to run after the `is-authorized` class is set, but re-renders once
    if a draft was actually found).
  - A toast now fires on every save/apply ("...saved in this browser —
    click Preview & Save to publish"), and the persistent save bar's
    wording now says plainly that edits are local-only and will survive
    a reload but aren't visible to anyone else yet — plus, when a draft
    was restored, how long ago it was last saved.
  - Added a real "↶ Undo" button — a bounded (20-deep) in-memory stack
    of full pre-edit snapshots, one per inline save or structural Apply,
    each poppable independently (not just a blanket "Discard all," which
    already existed and still does). **Found and fixed a real bug in my
    own first pass at this**: naively treating "undo stack empty" as
    "back to published" breaks the moment a draft was restored from
    localStorage, because the restored draft — not the true published
    file — is what the stack bottoms out at; undoing back to it would
    have wrongly cleared the dirty flag and deleted the still-unpublished
    draft. Fixed by capturing a separate pristine snapshot (the state as
    fetched from the server, before any draft is applied) once per page
    load, and having Undo compare against *that* — not stack emptiness —
    to decide whether dirty/draft state actually clears. Caught by a
    dedicated real-browser test that reproduced exactly this sequence
    (edit → reload → edit again → undo twice) before it shipped.
  - `dgeDiscardContentEdits()` and a successful `dgePushContentEdits()`
    both now clear the localStorage draft and reset the undo stack, so
    neither leaves a stale draft that would wrongly reappear on the next
    load.
  Verified in a real browser end-to-end: edit → refresh → edit still
  present in both the reading view and the structural editor (the
  project lead's exact reported sequence); two edits → undo twice →
  state matches the original fetched data byte-for-byte and dirty/draft
  both clear; discard → reload → edit is gone and draft is cleared.
  **Not built**, and explicitly out of scope for this pass: the "revert
  by two/five seconds" idea from the request was vague even in the
  request itself ("not sure what feature it could be") — interpreted as
  covered by the per-edit Undo stack above rather than building a
  separate time-scrubber, since that's the concrete mechanism a
  step-backward "revert" actually needs. If the project lead had
  something more specific in mind (e.g. a visual history timeline), say
  so and it can be scoped properly.

- **Published Sumadhva Vijaya sarga 15, 16 — this completes the full
  16-sarga work.** sarga_15: 141 verses (pages 179-207 of
  `SumadhvaVijayaMoola.pdf`). sarga_16: 58 verses (pages 208-219) — the
  work's final sarga. Cross-checked against the source's own printed
  running-total colophons: `807+141=948` (sarga 15) and `948+58=1006`
  (sarga 16, matching the source's closing "समाप्तश्चायं ग्रन्थः ।
  श्रीकृष्णार्पणमस्तु ।" — "thus this text is complete, offered to Sri
  Krishna"). 1006 total shlokas across all 16 sargas, consistent with
  every prior sarga's own running total in this chain (496→552→...→948→
  1006). Page 220 (the PDF's actual last page) is genuinely blank — Vision
  returned empty text and visual inspection confirmed a blank page, not
  an OCR or rendering failure.
  **How it was resumed and one new colophon-shaped issue found:** the
  prior session's 152-200 batch had reached sarga 15 verse 109 with no
  colophon (verse 109 closes cleanly on page 200, so no half-verse risk
  at the resume seam, but the first new proofread chunk was still
  anchored on page 200 anyway as cheap insurance, per the lesson from
  that batch). Pages 201-220 rendered fresh from the source PDF via
  PyMuPDF at the same effective scale as the existing page_200.png
  (zoom 3.0), then OCR'd (Vision) and proofread (Gemini) in 4-page
  chunks the same way as before. The redundant re-proofread of verses
  105-109 (from the anchor page) matched the already-published text
  almost exactly (one trivial hyphenation difference, "पञ्चगव्यं" vs
  "पञ्च-गव्यं" — same word) confirming no drift, so the previously
  published 1-109 were kept as-is and only 110+ appended. New wrinkle,
  same root cause family as the half-verse bug: Gemini mislabeled sarga
  16's trailing colophon-only text (no verse content of its own) as a
  spurious extra numbered shloka "59" instead of recognizing it as pure
  colophon — verse 58 already closes cleanly with "॥ ५८ ॥" right before
  it, and the source's own total (948+58=1006) confirms 58 is the real
  count. Caught by the same verse-count-vs-colophon-math cross-check
  used throughout this chain; fixed in the build script by detecting a
  shloka whose entire `sa` starts with "इति" and contains "सर्गः" as a
  standalone entry (not just embedded in the tail of the true last
  verse, which the existing `split_trailing_colophon` regex already
  handled) and popping it into `metadata.colophon` instead of keeping it
  as a numbered shloka. Ran the same numbering-gap + verse-close-marker
  scan used on 13-14 across both new sargas: zero unresolved splits.
  Verified both sargas load, render, and count correctly in a real
  browser (141/141 and 58/58 cards).

- **Fixed two real bugs in the v1 Content Editor (`dge/js/content-editor.js`
  → v1.1), found via a live user bug report on PNS** (project lead did an
  inline edit on shloka 1, saw it reflected in the reading view, then
  opened the Structural editor and reported "the old text is still seen,
  both are not in sync" — with a screenshot showing literal `<br>` tags
  visible as text in the row textarea).
  1. **Line-break format mismatch, not a real desync.** Different
     granthas store pada breaks differently: PNS (and apparently most
     stotras) use literal `<br>` HTML tags in `sa`, rendered correctly via
     `innerHTML` in the reading view; Sumadhva Vijaya's sarga files
     (10-14, built this session) use plain `\n` instead — confirmed by
     direct browser test that `.shloka-text`'s computed `white-space` is
     `normal`, so those `\n`s render as nothing at all (no visual line
     break, just wrapped continuous text) — a pre-existing cosmetic quirk
     of Sumadhva Vijaya's data, not a regression, and not what was
     reported, so left alone rather than mass-rewritten. The editor's
     plain `<textarea>` elements can't interpret either format as HTML,
     so raw `<br>` text was showing through literally — which read as
     "wrong"/"old" content even though the underlying data was actually
     in sync the whole time. Fixed by converting `<br>` (and bare `\n`)
     to real `\n` for editing (both inline textarea and structural modal
     rows) and back to `<br>` on save — `<br>` chosen as the canonical
     stored format since it's the only one of the two that actually
     renders as a line break, so any verse touched through the editor
     from now on (Sumadhva Vijaya included) gets working line breaks as a
     side effect, without touching verses nobody edited.
  2. **Real data-loss bug, found while fixing #1**: the structural
     editor's row builder, its Apply handler, and the final GitHub-push
     reconstruction all hand-picked only `sa` + `commentaries` when
     rebuilding each shloka object, silently dropping any other field —
     concretely, `note` (colophon-style text) and `reviewNote` (OCR
     review-flag text, present on several sarga_13/14 verses from this
     session's own review-flagged verses). Opening the structural editor
     and hitting Apply — even with zero edits — plus any push through
     "Preview & Save" would have stripped these fields from the live
     file. Fixed by shallow-copying the whole original shloka object at
     each of these three points instead of hand-picking two fields.
  Both fixes verified in a real headless-Chromium browser test against
  the actual PNS and sarga_13 data files: inline edit → structural
  editor round-trip now shows identical (edited) text with no literal
  `<br>` and correct row heights; Apply-without-editing on sarga_13
  preserves `reviewNote` byte-for-byte. Not yet pushed to GitHub by the
  project lead through the UI itself — only tested locally.

- **Published Sumadhva Vijaya sarga 13, 14 for real (continuing straight
  on from 10-12 above, pages 153-200 of the source PDF), and found a
  real, systemic OCR/Proofread pipeline bug in the process, not just a
  one-off boundary glitch.** sarga_13: 69 verses. sarga_14: 55 verses.
  Cross-checked against the source's own running-total colophon notes
  (`683+69=752`, `752+55=807`) — consistent with sarga_12's own ending
  total, same double-check method as before.
  **The real bug, worth remembering for any future OCR/Proofread run
  that resumes mid-document:** when a proofread chunk's first page
  starts mid-verse (the previous page's OCR wasn't fed into the SAME
  Gemini call), Gemini has no way to know it's continuing an
  in-progress verse, and silently starts renumbering from what it sees
  as its own "verse 1"-equivalent — except it isn't really starting a
  new verse, it's absorbing the second half of the cut-off one into a
  new mislabeled entry. The effect cascades: EVERY subsequent verse in
  that run comes out shifted by half a verse (each entry becomes [tail
  of true verse N] + [head of true verse N+1], carrying verse N's own
  number) for as long as the run continues, not just at the seam
  itself. Caught by actually comparing verse TEXT across the old
  (pre-resume) and new datasets at the resume point — comparing only
  verse COUNTS or numbering-sequence wouldn't have caught it, since the
  shifted numbering was still perfectly sequential (1, 2, 3, ...), just
  built from the wrong text. Same root issue recurred, in miniature, at
  ordinary chunk-to-chunk boundaries within the corrected run too (2 of
  12 four-page chunk boundaries happened to land mid-verse) — fixed by
  re-proofreading each affected span as one larger combined call
  spanning both original chunks rather than a narrow patch window (a
  narrow patch just relocates the same problem to the patch's own
  edges, confirmed the hard way — first attempt at a 4-page patch
  window created two NEW seam issues at its own boundaries against
  still-unpatched neighbouring data). Final systematic check: scan
  every shloka's `sa` field for one that doesn't end in a proper
  `॥ N ॥` verse-close marker (allowing for a small number of expected
  false positives from compound words that happen to contain "सर्ग" as
  a substring, e.g. निसर्गात्/संसर्ग-लोलैः, not real chapter markers) —
  confirms zero remaining unresolved splits in the final 152-200 range.
  **Stops at sarga 15, verse 109 (page 200, the last page of this
  batch) — NOT published**, no colophon reached yet within this range,
  so sarga 15's real length is still unknown; continuing needs OCR
  starting at page 201. 21 verses across sarga_13/14 carry a
  `reviewNote` (mostly the boundary-fix verses themselves, self-flagged
  by Gemini during the targeted re-proofreads) for the same
  spot-check-via-admin-panel workflow as sarga 10-12.
- **Published Sumadhva Vijaya sarga 10, 11, 12 for real (previously only
  1-9 were live).** Source: real Gemini-proofread OCR output from this
  session's earlier live API test (pages 109-152 of the source PDF,
  `SumadhvaVijayaMoola.pdf`), recovered from this session's own
  scratchpad rather than re-run. Verse counts cross-checked two ways —
  sequential 1..N numbering within each sarga, AND the source text's own
  running-total colophon annotations (496+56=552 after sarga 10,
  629+54=683 after sarga 12) landed exactly consistent with the computed
  552/629/683 totals, a real independent confirmation this is chaptered
  correctly, not just internally self-consistent.
  - **sarga_10**: 56 verses (1-56). **sarga_11**: 77 verses (1-77).
    **sarga_12**: 54 verses (1-54). All three have `metadata.colophon`
    populated (matching sarga_1/2/8's convention; sarga_9 itself lacks
    one, pre-existing gap, not touched).
  - **Stops at sarga 13, verse 4 (incomplete, page 152 cuts off
    mid-verse) — NOT published.** That's the real edge of what the
    earlier OCR/Proofread run covered; continuing past sarga 12 needs a
    fresh OCR/Proofread run starting at page 153.
  - **Flagged for the project lead's own review pass** (each carries a
    `reviewNote` field verbatim from Gemini's own proofreading, visible
    per-verse so discrepancies are easy to find): 7 in sarga_10, 9 in
    sarga_11, 2 in sarga_12 — mostly confidently-fixed OCR typos/
    duplicate-line artifacts with the fix explained inline, not
    necessarily errors, but worth a human glance per the project lead's
    own stated plan to spot-check via the Convert tool's admin panel.
  - **Two Sarvatobhadra/Chakrabandha citra-kavya (pattern-poetry) verses**
    (sarga_10 verses 48 and 54) have real explanatory Sanskrit prose
    captured in a `note` field, but their source pages (122, 123) also
    show a visual bandha/grid diagram that isn't captured in plain text
    at all — a genuine content gap for this verse type specifically, not
    fixable from text alone.
  - `library.json`'s pre-existing `sarga_10` stub (`populated: false`,
    no title) was fixed in place; `sarga_11`/`sarga_12` entries added
    following the sarga_1-9 pattern exactly (minimal diff, matched the
    file's existing indentation by hand rather than re-serializing the
    whole 692-entry array through `json.dump`, which would've produced
    a spurious ~6000-line diff from an indent-width mismatch — caught
    and reverted before committing).
  - **Search index NOT regenerated** — `build_search_index.py` is a
    known separate, larger backlog item (already noted below: stale
    relative to many other already-ingested granthas), out of scope for
    this pass; sarga_10-12 are readable on the site but not yet
    searchable, same current state as everything else awaiting that
    reindex.
  - **Found, but did NOT fix (separate, pre-existing, out of scope):**
    `tools/gen_library_status.py`'s `item_count()` only handles the
    newer `{schema, items:[...]}` shape — the legacy `{metadata,
    shlokas:{n:{...}}}` shape (which ALL of Sumadhva Vijaya uses, 1-12)
    always counts as 0 items, so the Library Manager dashboard's
    verse/item totals have been silently undercounting this entire
    grantha since sarga_1, not something newly broken by sarga_10-12.
    Confirmed via a no-op diff after running the regenerator. Real
    site-reading availability is unaffected (`library.json`'s
    `populated` flag is what `core.js` actually gates on, and that's
    set correctly) — this only affects the admin dashboard's own count
    display.

- **`tools/voice_lab/` added — real bug found and fixed before first real
  use.** Project lead's own uploaded files (`voice_transform.py` Track A —
  numpy/scipy pitch+formant shift for female→male re-timbre, no AI model;
  `clone_knn_vc.py` Track B — optional zero-shot kNN-VC voice conversion
  toward a reference voice, needs `torch.hub` model download; both meant
  eventually to feed a TTS feature). Ran Track A on a real 20s slice of
  the project lead's own chanting recording before trusting it (per
  session convention): the `--preset male` output measured RMS 0.004 vs
  the original's 0.158 (39x quieter) with 0% of samples carrying real
  signal (vs 76% in the source) — i.e. the output was silence plus one
  artificial click, not a deepened voice. Root cause: `phase_vocoder_stretch()`'s
  overlap-add window-normalization floor (`win[win<1e-6]=1e-6`) let
  under-covered edge samples explode to ~123x normal amplitude; the
  driver's peak-based normalize (`x/np.max(np.abs(x))`) then divided the
  *entire* clip down by that one freak sample. Fixed by flooring `win`
  relative to its own interior median (zeroing the handful of genuinely
  under-covered edge samples instead of amplifying them) and switching
  the final normalize from raw max to a 99.9th-percentile-based clip.
  Re-tested on the same real audio after the fix: RMS 0.099, 70% signal
  coverage, peak 0.69 — back in a sane, working range. Sent the project
  lead the actual fixed output (both `male` and `deepmale` presets) to
  judge quality by ear; **awaiting their listen-through verdict** before
  calling Track A done. Track B (`clone_knn_vc.py`) not tested at all yet —
  needs `torch.hub` access for WavLM+HiFiGAN, same network constraint
  that blocks Demucs model downloads in this sandbox; would need to run
  in the project lead's Codespace, same as Audio Admin.
  **Update:** project lead tested the fixed Track A on two real sources
  (their own recording, and a separately-uploaded female-voice
  `mangalacharana.mp3`) across `slightly`/`male`/`deepmale` presets —
  verdict: `deepmale` is closest but still "not good" (quality issue,
  not the earlier crash bug). Confirms Track A's plain DSP re-timbre has
  a real quality ceiling for this use case. Project lead now wants to
  try **Track B** (`clone_knn_vc.py`, zero-shot kNN-VC toward a real
  reference voice) using 5 short clips of their own voice as reference
  (`NS1/10/11/12/13.mp3`, ~90s combined — comfortably within kNN-VC's
  recommended 30-60s+). Track B needs `torch.hub.load("bshall/knn-vc", ...)`,
  which pulls from `github.com` — confirmed blocked in this sandbox
  (403, same proxy policy as the Demucs/HuggingFace blocks) — so this
  must run in the project lead's Codespace, same pattern as Audio Admin.
  Scaffolded `tools/voice_lab/incoming/{ref,source}/` (gitignored, mirrors
  Audio Admin's `incoming/` convention) for the project lead to upload
  their reference clips + a source recitation into, ready for them to
  `pip install torch torchaudio soundfile numpy` (torch itself likely
  already present from the Audio Admin install) and run `clone_knn_vc.py`.
  **Update:** Track B (`clone_knn_vc.py`) got a real end-to-end result
  after three genuine bugs found and fixed via live Codespace testing
  (all pushed): (1) an invisible zero-width space in browser-uploaded
  reference filenames that never matched anything typed by hand -- fixed
  by having `--ref` accept a folder and glob it internally instead of
  requiring typed filenames; (2) `get_matching_set()` throwing a
  tensor-shape RuntimeError when given multiple reference clips of
  different lengths -- worked around by ffmpeg-concatenating all `--ref`
  clips into one file before handing them to kNN-VC; (3) the real root
  cause of a `(2, 999, 1024)` malformed feature shape -- kNN-VC's
  `get_features()` doesn't downmix stereo input itself, so a stereo
  source/reference clip's 2 channels were being treated as 2 separate
  batch items; fixed by always downmixing both source and reference
  audio to mono/16kHz via ffmpeg before either ever reaches the model.
  **Verdict on the actual output** (project lead's own listening test):
  technically ran end-to-end, but kNN-VC is a speech-to-speech frame
  matcher with no pitch/F0 modeling -- applied to melodic chanting
  (Sumadhva Vijaya-style recitation), it flattened the raga/svara
  movement and introduced a rough, "unwell"-sounding quality (known
  artifact of kNN averaging). **Correctly diagnosed as the wrong tool
  for melodic content, not another bug to chase** -- kNN-VC is
  fundamentally built for spoken dialogue, not song. Project lead redirected
  based on this to three concrete next tasks (in progress):
  1. **Plain-speech TTS test (not chanting)** in the project lead's own
     voice, English + Sanskrit, since a from-scratch TTS generation has
     no original melody to lose (unlike kNN-VC's audio-to-audio
     conversion) -- should hold up much better for straight narration on
     the DGE site. Built `tools/voice_lab/tts_clone.py` (Coqui XTTS-v2,
     zero-shot, reuses the same `--ref`-folder pattern as
     `clone_knn_vc.py`). XTTS-v2 has no native Sanskrit checkpoint (no
     mainstream open TTS toolkit does) -- testing Sanskrit text through
     the `hi` (Hindi) language mode as the closest practical
     approximation, an experiment to judge by ear, not a validated
     solution. Noted CPML license (non-commercial + attribution) in the
     script docstring. Not yet run for real -- needs `pip install TTS`
     (~1.8GB model download) in the Codespace.
  2. **Zero-background separation** ("only pure human shloka rendering,
     no vina/tabla") for the Audio Admin splitting tool -- only
     `htdemucs` (the default) has been tried so far, and it leaves real,
     audible leakage (confirmed by the project lead listening to
     `voice_only/chunk_12.wav` directly and still hearing veena). Built
     `tools/audio_admin/compare_separation.py` to export the SAME
     region through `htdemucs`, `htdemucs_ft`, and `mdx_extra` side by
     side so the cleanest can be picked by ear. Not yet run.
  3. **Reliable shloka splitting on clips with a real ~1.5s gap** --
     explicitly deferred until task 2 lands, since the earlier
     mis-detected 1.5s gap (shlokas clubbed despite an audible pause)
     was actually caused by separation leakage keeping the "silent" gap
     non-silent in the voice track, not a detector/threshold problem.
     Should mostly resolve once a cleaner separation model is picked.
- **Audio Admin (`tools/audio_admin/`) real-world tuning in progress —
  three real defects found across two rounds of actual listening, one
  now understood to be a separation-quality limit rather than a
  threshold-tuning bug.** Project lead ran `autotune.py` on a real
  chanting recording (Sumadhva Vijaya sarga 9, 62 shlokas) in their own
  GitHub Codespace (no direct Claude access to that environment; guided
  the lead through Codespace UI + terminal manually throughout).
  Round 1 (full 62-shloka file): hit `62/62` exact count, but listening
  to actual clips surfaced two problems the count alone hid — full-mix
  clips carry background music throughout by original design, and
  adjacent shlokas (e.g. 5+6) got clubbed into one clip despite the
  *total* count coming out exact (root cause: `min_len` merge folding
  short segments into predecessors regardless of whether they're really
  separate, plus `solve_for_target()` only optimizing for total count,
  so an under-split and an over-split elsewhere can cancel out and still
  read as "exact"). Fixed: `engine.py`/`autotune.py` now also export a
  `voice_only/` sibling folder (same boundaries, cut from the cached
  separated-vocals track) for real full-mix-vs-isolated comparison, and
  `autotune.py` prints per-shloka durations flagging outliers (>1.6x or
  <0.5x median) as likely-clubbed/likely-oversplit so bad boundaries can
  be found from the terminal log instead of listening to every clip.
  Round 2 (trimmed ~6.5min/16-shloka sample, `Sarga-9-sample.mp3`, cut
  for faster iteration): confirmed the outlier-flagging works — it
  correctly caught a clubbed pair — but investigating that specific clip
  revealed a *second*, different cause: the project lead reported an
  audible, clear ~1.5s pause between the two clubbed shlokas (so it's
  not a too-short-to-detect pause), yet the tool still merged them.
  Fixed `solve_for_target()`'s previously-hardcoded 0.30s silence-
  detection floor into a `--min-sil` flag on the theory it might be a
  too-short pause elsewhere in the file, but the project lead then
  directly listened to that specific clip's `voice_only/` version and
  confirmed veena is *still clearly audible* there and the gap is "barely
  quieter but not silent" — meaning Demucs' separation itself is leaking
  real background energy into the "vocals" stem at that point, not a
  threshold-tuning problem at all. No noise-threshold sweep can find a
  gap that never actually goes quiet in the track being searched.
  **Not yet done:** try `htdemucs_ft` (slower, typically cleaner
  separation) instead of plain `htdemucs` to see if it resolves the
  leakage; if not, accept that some tightly-chanted shloka pairs may
  need manual boundary correction rather than fully automatic detection;
  decide full-mix vs. voice-only for the *final* saved clips once heard
  side-by-side (project lead asked to see both rather than commit to one
  sight-unseen — still open); lock winning params into `config.yaml`'s
  `defaults:` once settled (`min_gap` looked like it wanted to land near
  0.5s on one file, well below the current 1.5s default, not yet
  confirmed generalizable across recordings).
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
  dropdown), AND (v0.30.3) auto-populated title/author when the picked
  target is a sibling of an already-populated multi-part work — see
  entry below. NOT shipped, still open from the original ask: a "preview
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

- **Sāyaṇa is missing on 164 Ṛgveda mantras (1.55%)**, and the gaps are
  explained rather than mysterious: the **Vālakhilya** (RV 8.49–8.55, 8.57, 8.59)
  has no bhāṣya on Wikisource at all — much of the manuscript tradition transmits
  it apart from Sāyaṇa — and 66 more are the first half of each **dvipadā** pair
  in RV 1.65–1.70, which the edition glosses jointly and DGE splits in two. The
  archive.org OCR route (`archive_sayana.py`, kept and unchanged) does cover the
  Vālakhilya and is the obvious next attempt if that gap matters.
- **No commentary layer on the Atharvaveda (5,977 items), Śukla Yajurveda
  (1,975) or Taittirīya Saṃhitā (696)** — all three still at zero.
  `import_veda_phase2.py` is deployed and tested but has never been run for real;
  it wants Griffith + Whitney–Lanman, Griffith, and Keith respectively.
- **142 Sāmaveda mantras have no Ṛgveda parallel to inherit from** (114 carry no
  `rigveda_ref` at all, 8 have a bad one, 19 point at Ṛgveda mantras that are
  themselves in the Vālakhilya/dvipadā gaps, 1 unresolvable). There is no other
  route to a Sāmaveda commentary: Griffith follows Benfey's Rāṇāyanīya numbering,
  which does not line up with DGE's Kauthuma sequence.

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

- **`github-advanced-security` fails on every PR, and it is not any PR's diff.**
  GitHub's Copilot Autofix agent dies against its own backend with
  `CAPIError: 400 The requested model is not supported`
  (`COPILOT_AGENT_MODEL: sweagent-capi:claude-opus-4.6`). Confirmed not ours
  three ways: CodeQL's three real analyses (python, javascript-typescript,
  actions) pass on the same commits; PR #56 shows the identical failure and was
  merged anyway; and it failed again on a **documentation-only** commit in #57.
  Nothing in this repository can fix it — it is GitHub-side, and either it
  recovers on its own or the check wants disabling in the repo's security
  settings, which is the project lead's call. **Do not re-run it and do not
  re-investigate it**; check whether CodeQL is green instead.

- **Six things reported from a real phone on 18 Aug 2026, with two screenshots — noted only, not started, at the project lead's instruction ("just note these, I will give a go ahead shortly"). Each one was grounded in the code before being written down, so the next session starts from a cause and not a symptom. Where a cause is stated below it was read out of the source; where it is a guess it says so.**

  1. **Kosha: `अगस्त्य` returns no proper entry — it falls back to listing the top of the dictionary.** The screenshot shows the query `अगस्त्य` answered with `अ`, `आ`, `aa`, `'a'`, `ai`, `AI`, `au`, `ax`, `अक`, `अख`, `अग`, `अघ`, `अङ` — every one of them *shorter* than the query and in alphabetical order, i.e. the head of the index rather than matches. Cause not established here. **Do not touch `dge/js/kosha.js` without checking first:** the parallel session "Load unloaded libraries from public sources" (`session_01JVTFJzQMwCDFF2yTKLcAty`) is blocked on an unmerged `claude/kosha-synonym-search` PR against that very file, and is waiting for the project lead to merge it before rebuilding kosha data. Two sessions editing `kosha.js` at once is how the earlier hand-restored `DGE_LEGACY_SLUGS` clobber happened. Sequence this one after that merge.

  2. **The Aṣṭādhyāyī page's AI settings offer four Gemini models that no longer exist, and default to a dead one.** Confirmed by reading the source, not inferred: `dge/ashtadhyayi.html` lines 106-109 hardcode `gemini-2.0-flash` / `-flash-lite` / `gemini-1.5-flash` / `gemini-1.5-pro`, and `dge/js/ashtadhyayi.js:197` defaults to `gemini-2.5-flash`'s successor-in-name-only, `gemini-2.0-flash`. This is the **same bug already fixed once** in `dge/js/gemini.js` (v0.33.0 moved it to the rolling aliases `gemini-flash-latest` / `gemini-flash-lite-latest` after both hardcoded models returned a real 404 for a freshly-issued key) — the fix was applied to the shared client and this page's own private copy of the list was missed. So Aṣṭādhyāyī's AI is broken for any new key, in exactly the documented way. Small, isolated fix; worth doing first because it is certain.

  3. **Aṣṭādhyāyī needs Siddhāntakaumudī navigation alongside sūtrapāṭha order, and the number box should navigate.** The jump box already exists — `dge/ashtadhyayi.html:19`, `<input class="jump" id="dge-jump" placeholder="1.1.1" list="dge-sutralist">` — so "numbers editable" may be a discoverability problem rather than a missing feature; verify on the phone whether typing `2.3.16` there actually jumps before building anything. Kaumudī-order navigation is genuinely absent: the page reads `sutrapatha` order only, and the Kaumudī sequence is a different ordering of the same 3,962 sūtras. Note the earlier finding that vidyut's own data package bundles `kaumudi.tsv`, which is very likely the authoritative order needed here — that was flagged once already as "a real, promising follow-up" and this is the second time it has come up.

  4. **Intellisense is not reachable from the two pages where a reader would most expect it.** `intellisense.js` is loaded by exactly three pages — `dge/index.html`, `dge/krdanta.html`, `dge/prakriya.html` — and by neither `dge/ashtadhyayi.html` nor `dge/dhatu.html`. That is the whole of "unable to click a sūtra or dhātu": on those two pages the script simply is not there, so there is nothing to enable. `admin/config/intellisense.json` has no per-page switch either; it is on or off for the site. Two separate pieces of work: add the script (and a visible way to turn it on) to those pages, and decide whether the config grows a per-page list.

  5. **Dhātu page: prakriyā/forms wanted for all lakāras.** Currently `tools/build_prakriya.py` generates full step-by-step derivations for two lakāras only (`STEP_LAKARAS = ['Lat', 'Lot']`) and bare forms for the other six, a deliberate size trade — the full-step build was 116 MB against a 1 GB GitHub Pages ceiling the repo is already ~704 MB into. So this is not a switch to flip; it needs either better compression, on-demand generation, or a decision to spend the space. Also, `dhatu.html` does not link a root to its prakriyā at all, which is the cheap half and probably the real ask.

  6. **The magnifying-glass search returns no library results.** Two different searches wear a magnifying glass and it matters which one is meant: the reader's top bar has `#searchInput` ("🔍 Search text or shloka number…", `dge/index.html:188`) which searches **only the open grantha** and never the library — if that is the one, it is working as built and the ask is a real feature. The corpus-wide search is a separate floating 🔎 button injected by `dge/js/global-search.js`. One concrete suspect there: it resolves its index as `var INDEX_BASE = window.DGE_SEARCH_INDEX || 'search_index'` — a **page-relative** path, which is correct from `dge/index.html` and wrong from anywhere else, exactly the class of bug the script-URL-derived paths in `core.js`/`menu.js`/`keys.js` were introduced to kill. Worth checking the browser console for a 404 on `search_index/index.json` before assuming the index itself is stale. Separately, the landing page (root `index.html`) carries no search of any kind — if "main page" meant that page, there is nothing to fix, only something to add.

  **Worked through 18 Aug, one at a time. What each turned out to be, including two things recorded above that were wrong.**

  1. ~~Ashtadhyayi's AI settings offer four dead models~~ **Fixed (`b83600e`).** The list now lives once in `gemini.js` as `MODELS` and the page builds its menu from it, so it cannot drift again; a model saved by an older build is no longer honoured, so a reader who picked `gemini-2.0-flash` moves to the working default instead of failing forever. Only aliases confirmed against a real key are offered — a pro-tier alias probably exists, and deliberately is not listed until someone has watched it answer.

  2. ~~The jump box may be a discoverability problem~~ **It was, and it is now more than that (`bb76b0f`).** Typing `2.3.16` always worked; typing `2-3-16`, `2 3 16` or `2.3` did nothing, silently, which reads as a dead control. Any separator now works, a partial reference goes to the head of that adhyaya or pada, Enter fires even when the text has not changed, and a miss colours the box instead of sitting there.

  3. ~~Intellisense is absent from the two grammar pages~~ **Fixed (`adfe1ec`)** — and adding the script was the smaller half. It scanned two containers named for the reader's markup and read the grantha from a global the reader sets while navigating, so on a standalone page it would have loaded and done nothing. A page now declares itself: `data-grantha-slug`, `data-intellisense-roots`, `data-intellisense-search`. On the Dhatupatha page the vrittis turn out to cite sutras by name and never by number — checked across 400 vritti files, zero numeric references — so what it gets is name identification on its own search box.

  4. **A serious data bug found while doing (3), and fixed (`3e35114`): 1,019 sutras — a quarter of the Ashtadhyayi — carried their neighbour's analysis.** The enrichment from ashtadhyayi.com was joined to our mula by id, and the two number the text differently: ours reads उञ ऊँ as one sutra where the source counts two, so from there to the end of the pada every gloss sat one late. It resets at each pada boundary and starts again at the next disagreement, so no fixed shift could repair it. `tools/realign_sutra_enrichment.py` aligns the two sequences by their own text, pada by pada, and remapped 2,198 anuvritti references that were in source numbering. 22 sutras now show no gloss and 21 glosses match no sutra we carry; both are left as honest gaps. This was the reader's padaccheda panel too, not only intellisense.

  5. ~~dhatu.html does not link a root to its prakriya at all~~ — **that note was wrong.** It has linked to `prakriya.html#<code>` and `krdanta.html#<code>` all along, and both work: opened भू from the Dhatupatha page and got its derivation with all eight lakaras offered. The real gap is the one already recorded — steps for two lakaras, bare forms for the other six — and that remains a size decision, not a switch.

  6. ~~The magnifying-glass search returns no library results~~ **Fixed (`91c767b`), and it was two faults, neither of them the page-relative path I suspected.** It opened every grantha its candidates lived in — 444 unit shards for "राम", about ten seconds on a desktop connection, which on a phone is a search that returns nothing. And the scoring gave a substring match 0.8 plus a bonus for the unit being *short*, so "राम" ranked विरमति above every verse that actually says राम. A candidate must now share most of the query's trigrams before its grantha is opened, at most 40 granthas are opened, and a whole word beats a fragment. "राम" answers in under a second with राम राम महाबाहो at the top. Still 5–10 MB per search, because ranking needs each grantha's unit shard — cutting that means keeping enough in the postings to rank without opening shards, which is an index change and is left for its own pass.

  7. **Kosha अगस्त्य (`81344c4`) — one cause confirmed, one not, and the difference is worth keeping.** Confirmed: the query is transliterated with Sanscript, which comes from a CDN, and when that fetch fails every Devanagari word answers "No headwords found". The app's own `dge-normalize.js` has a Devanagari table needing nothing external and is now used as the fallback; with the CDN genuinely unreachable, अगस्त्य returns its nine dictionaries. Not confirmed: keystrokes each started a lookup with no ordering guard, so a slow one-character browse could land after the whole word and repaint — which is exactly what the screenshot shows. The guard is in, but I could not provoke the race here (the production index is on jsDelivr, which this sandbox blocks, and neither the local sample nor a synthetic slow index reproduced it), so treat that diagnosis as unproven until the phone says otherwise.

  **Parallel sessions, checked at the project lead's instruction before any of this is scheduled.** Four others exist against this repo, three of them live, and two collide with the list above:
  - `session_017Vp35ezrDd5UeByjToL5uM` "Tasks to completion" — **blocked right now on a question awaiting an answer**: a wisdomlib import on GitHub Actions is failing every fetch (each page exhausting five retries) and will burn its 350-minute timeout importing nothing. It is asking whether to cancel. That one needs the project lead's attention before anything here.
  - `session_01JVTFJzQMwCDFF2yTKLcAty` "Load unloaded libraries" — blocked waiting for `claude/kosha-synonym-search` to be merged. **Owns `kosha.js`; see item 1.**
  - `session_01BPDUCk8X9w2eSedhHQ23zt` "Dvaitavedanta crawler" — review-ready, reporting "17 orphaned folders from incomplete renames". Worth a look from this side too: this session moved the whole taxonomy, and orphaned folders from renames is precisely the failure mode that migration could have left behind.
  - `session_01PdaPRixnw1DeZv5kLia587` "Firebase auth" — review-ready, domain switchover tooling; overlaps the 29 Aug go-live checklist above but nothing here.

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
