# Search and storage architecture — where things should live, and why

_Written 18 Aug 2026, in answer to: should each section (Kāvya, Āyurveda,
Vedāṅga, Dvaita Vedānta, Nyāya, Mīmāṃsā …) have its own search index, with a
global index alongside? And which of it belongs in which repository?_

_Extended 28 Aug 2026 (Part II below) to cover taxonomy label architecture and
the new scholarly cross-reference / entity-linking system, in response to a
28-point UI/UX critique and a cross-reference architecture proposal. Part I
below is unchanged from 18–19 Aug — still the reference for index performance
and repository layout._

Every number below was measured against the live index, not estimated.

---

## 1. The finding that changes the question

A single search today downloads **5 to 40 MB of index**.

| query | index downloaded |
|---|---|
| मोक्षः | 5.1 MB |
| कृष्ण | 6.7 MB |
| धर्म | 9.8 MB |
| वागर्थाविव | 14.9 MB |
| राम | **16.1 MB** |
| तपःस्वाध्यायनिरतं | **40.4 MB** |

The cause is the posting layout, not the corpus size. A trigram is filed by its
**first two characters**, so `ram`, `ran`, `raj`, `rak` and everything else
beginning `ra` share one 3.9 MB file — and `na`, the commonest sequence in
Sanskrit, is a **7.0 MB** file that almost every query touches. The index is
188 MB across 1,797 such buckets: median 2 KB, ninetieth percentile 234 KB,
maximum 7 MB. The distribution is the problem.

**Splitting the index by section does not fix this.** Kāvya is 1.8% of the
corpus, so a Kāvya-only index makes the Kāvya-only query 1.8% of 16 MB — but a
global search still pays the full 16 MB, and global search is what a reader
uses. The section question and the speed question are separate, and the speed
question is the urgent one.

### What does fix it

Two changes, both measured against the real index:

| | राम | तपःस्वाध्यायनिरतं |
|---|---|---|
| today, by two-character bucket | 16.1 MB | 40.4 MB |
| one file per trigram | 1.3 MB | 5.7 MB |
| **+ fetch only the three rarest trigrams** | **549 KB** | **241 KB** |

1. **One file per trigram** rather than per two-character prefix. The query
   fetches what it asked for instead of every neighbour that shares a prefix.
   Costs more files — around 50,000 — which is a third of what the kośa corpus
   already ships and nothing jsDelivr minds.
2. **Fetch the rarest trigrams, not all of them.** `राम` is `^ra`, `ram`, `am$`
   … and `na`-class trigrams match half the corpus, so they cost the most and
   discriminate the least. A small document-frequency table in the manifest
   lets the client fetch the two or three rarest and verify candidates against
   the unit shards it was going to fetch anyway.

Together: **40 MB → 241 KB, about 150×**. On a phone that is the difference
between a search that works and one nobody waits for.

---

## 2. So: one index, or one per section?

**One index, partitioned — not one index per section plus a global one.**

A separate global index would duplicate every posting: 188 MB today, ~200 MB
again, growing together forever. There is no need. The manifest already records
a category per grantha, and a posting is `[granthaIdx, unitIdx]`, so **scope is
a filter, not a different index**. Kāvya-only search is the same fetch with a
predicate.

Partitioning the postings tree *by section* is still worth doing, for a reason
that has nothing to do with query speed:

- **Incremental publishing.** Kāvya changed four times this week and the Vedas
  did not. Today that rebuilds and republishes all 330 MB. Partitioned, a Kāvya
  import republishes the Kāvya partition.
- **Proportional scoped queries.** A Kāvya-scoped search reads only the Kāvya
  partition of a trigram file.
- **Global search costs a fan-out**, not a duplicate: the same trigram from
  eleven partitions, in parallel, over HTTP/2. Eleven small files, not one
  large one.

The section list falls out of the taxonomy already in use — `vedas`,
`vedanga`, `itihasa`, `purana`, `darshana`, `dvaitavedanta`, `kavya_alankara`,
`smriti_dharma`, `agama`, `stotra`, `dasa_sahitya` — with Āyurveda, Nyāya and
Mīmāṃsā joining as their own top-level nodes or under `darshana` as the
taxonomy already has them.

### What each section actually weighs

| section | granthas | units | unit shards |
|---|---:|---:|---:|
| vedanga | 8 | 26,729 | 36.9 MB |
| vedas | 42 | 23,479 | 12.0 MB |
| dvaitavedanta | 699 | 20,210 | 46.7 MB |
| darshana | 50 | 16,092 | 13.4 MB |
| itihasa | 49 | 3,203 | 14.6 MB |
| dasa_sahitya | 1 | 2,355 | 1.1 MB |
| kavya_alankara | 36 | 1,741 | 1.8 MB |
| purana | 24 | 680 | 3.5 MB |
| smriti_dharma, agama, stotra | 7 | 175 | 0.5 MB |

Note what this says about a per-section UI: four sections carry 91% of the
corpus, and six carry almost nothing. Scoped search is worth offering where a
reader would think in sections, not because the index needs it.

---

## 3. Where things should live

The rule this project has arrived at, and should keep:

> **`main` holds the app and the data small enough to serve from it. Anything
> large and derived lives on a data branch of the same repository. A separate
> repository is for a corpus with its own release cadence and its own size
> class.**

Today, and why:

| what | where | size | why there |
|---|---|---|---|
| app, catalogue, granthas | `main` | 688 MB | it is the site; Pages publishes `main` and nothing else |
| corpus-search index | `search-dist` branch | 330 MB | committed to `main` it put the site at 1,013 MB against a 1 GB ceiling |
| Kāvya corpus | `kavya-dist` branch | 61 MB | same reason, and it is rebuilt far more often than the site |
| Sanskrit WordNet | `wordnet-dist` branch | 24 MB | same |
| kośa corpus | **`bhumandala-kosha-data`** repo | ~1.8 GB | its own size class, its own build Action, its own cadence |
| audio | **`bhumandala-audio-data`** repo | 29 MB | destined for archive.org; foldered by IA identifier already |

**Do not make a repository per section.** Three reasons, in order of how much
they cost:

1. It buys nothing a branch does not. jsDelivr serves `@branch` and `@commit`
   from any repository identically; Pages ignores both.
2. It multiplies the publish step. Every corpus already needs *publish, then
   bump the pin*; eleven repositories make that eleven workflows and eleven
   pins to keep straight.
3. **The GitHub App cannot create repositories.** This is not hypothetical —
   it blocked the Kāvya data repo this week and the kośa repo in Round 4, and
   both times the answer was a branch or a hand-made repo. Designing around a
   thing that needs the project lead's hands for every new section is designing
   a bottleneck.

The one case for a new repository is the one the kośa corpus already makes: a
body of data big enough that its history would dominate the app repository's,
and independent enough to be built by its own CI on its own schedule. If the
Vijaya kāvyas and their commentaries arrive at the scale the project lead
expects — a dozen mahākāvyas of 500 to 2,000 verses each, with commentary —
that is still tens of megabytes, which is a branch, not a repository.

---

## 4. What to do, in order

1. ✅ **Per-trigram postings + a document-frequency table**, and a client that
   fetches the rarest trigrams. **Published and live** as of 19 Aug 2026 —
   `search-dist` at commit `f11a2e3b`, pinned in `js/config.js` and
   `js/global-search.js`. Measured against the real corpus after publishing
   (937 granthas, including Kāvya): राम **16.1 MB → 549 KB**, कृष्ण **6.9 MB
   → 80 KB**, धर्म **10.0 MB → 181 KB** — matching this doc's original
   estimate almost exactly, with correctness verified (all four test queries
   return correct top hits at 0.97 confidence, including the Rigveda's
   actual opening verse for "agnimILe"). The first published version had a
   real bug — baking a `%XX` escape into filenames, which a browser's
   `fetch()` silently mis-requests since it percent-*decodes* `%XX` in a URL
   before sending it — caught by checking the *live* published index over
   the CDN rather than trusting a Node-only test (which never touches URL
   parsing), fixed, and re-verified the same way before pinning.
2. ✅ **Partition the postings by section.** Done — `build_search_index.py`
   writes `postings/<trigram>/<section>.json` (one file per trigram per
   section) instead of one file per trigram; `dge-search.js`'s
   `_loadPosting(tg, scope)` fetches just that one section's file when
   scoped, or fans out across every section in parallel and unions the
   results when not (`opts.section` on `.search()`). `manifest.df` stays a
   GLOBAL count across sections — it decides which trigrams are worth
   fetching, not which files answer them, so it didn't need to change.
   Validated the same way as (1): real rebuild (912 granthas, 58,112
   trigrams, 11 sections), unscoped fan-out totals came out byte-identical
   to the pre-partition numbers above (549 KB / 80 KB / 181 KB — the
   underlying posting data didn't grow, only the file count did), a scoped
   search to `itihasa` returned only `itihasa/`-prefixed hits and covered
   proportionally more of that section than the unscoped, MAX_SHARDS-capped
   search did, and both scoped and unscoped queries were re-verified against
   a real HTTP server forcing the browser `fetch()` code path. **Published
   and live** — `search-dist` at `cedcc73b`, pin bumped in `js/config.js`
   and `js/global-search.js`, re-verified over the real CDN before bumping
   (937 granthas including Kāvya, both a scoped and an unscoped posting file
   fetched at their real paths).
3. ✅ **Scoped search in the UI.** Done — a "Search scope" `<select>` next
   to the script picker on the corpus-search panel, defaulting to
   "Everything," populated from `manifest.sections` once the index loads
   (the list isn't known ahead of a fetch) and passed through as
   `idx.search(q, {section})`. Changing it re-runs the current query
   immediately. Verified end-to-end in a real headless Chromium session
   (Playwright, not just a Node harness): the dropdown populated with all
   11 real sections, scoping to Itihāsa returned only `itihasa/`-prefixed
   results, and switching back to "Everything" worked. That testing pass
   also caught and fixed a real pre-existing bug it happened to expose —
   `open()` rebuilt the entire panel (FAB, overlay, and now the section
   `<select>`) on every call with no guard, harmless while there was
   nothing to populate post-load, but producing duplicate-ID `<select>`
   elements (and a second stacked FAB button) the moment something needed
   to fill in live data after the fact. `build()` now no-ops if the panel
   already exists.
4. **Leave the repository layout as it is.** Branches for derived corpora,
   repositories only for the kośa and the audio.

(1), (2) and (3) are all live as of 19 Aug 2026.

---
---

# Part II — Taxonomy labels & cross-reference architecture

_Added 28 Aug 2026, in response to a 28-point UI/UX critique (search modal,
result cards, taxonomy labels) and an architectural proposal for a scholarly
cross-reference / entity-linking system, both reviewed together. Written for
a reviewer who has not seen this codebase. Priorities used throughout
(project lead's own framework): **P0** correctness bugs, **P1** UI/
architectural inconsistency (cross-reference linking was explicitly elevated
to P0/P1, not a nice-to-have), **P2** UX improvement, **P3** polish._

## 5. Search UI architecture (the client-side half Part I doesn't cover)

Part I above is about the index's *performance*; this section is about the
two files that turn it into the search UI:

- **`dge/js/dge-search.js`** — the index client (candidate generation via
  trigram intersection, then phonetic-fold + edit-distance scoring in
  `_score()`). Runs identically in the browser and under Node (`require`
  guard at the top) — this is what makes it unit-testable at all.
- **`dge/js/global-search.js`** — the UI. Builds the search overlay, debounces
  input, calls into `dge-search.js`, then applies **client-side post-filters**
  (type / category / siddhānta / keyword / "exact spelling only") over the
  fetched result set — never a second network round trip. Also owns the
  scheme picker (auto/Devanagari/IAST/HK/SLP1) and the section/scope picker
  described in Part I §2–4.

Normalization (`dge/js/dge-normalize.js`) folds Devanagari/IAST/HK/SLP1 input
to one phonetic key so "rAma"/"राम"/"rāma" all match the same postings.

**This sandbox has no network path to the `search-dist` CDN** (330MB,
external branch — see Part I §3), so the search UI's own result rendering
could not be visually screenshotted with real results tonight — verified
instead by reading the code paths directly and by the taxonomy-label checks
in §6, which don't need the index.

### P1 shipped: taxonomy label unification (critique points 6 & 7)

Root cause the project lead had already found and asked to be verified
before fixing — confirmed exactly as described: `global-search.js` had its
**own** hardcoded, mostly-IAST `SECTION_LABELS` map and a separate,
mostly-Devanagari-but-inconsistent `CATEGORY_LABELS` map, completely
independent of `dge/js/library.js`'s `DGE_PATH_LABELS` dictionary +
`dgeToActiveScript()` — the exact mechanism the rest of the app (Library
tree, Kosha, chapter nav) already uses to keep one label per taxonomy
segment that follows the reader's own script preference. Verified:
`library.js` (loaded before `global-search.js` in every page, confirmed in
`dge/index.html`'s script order) exports `dgeSegLabel(seg)` as a real
function-declaration global, i.e. `window.dgeSegLabel` — a single call site
already exists for exactly this.

Fix: `global-search.js`'s `CATEGORY_LABELS`/`SECTION_LABELS`/`SIDDHANTA_LABELS`
maps and `sectionLabel()` fallback are gone. A single `taxonomyLabel(seg)`
calls `window.dgeSegLabel(seg)` (falling back to a plain title-cased render
only if `library.js` somehow isn't loaded — not the normal path). Every call
site — the category filter chips, the corpus-scope popup, and the
advaita/dvaita/viśiṣṭādvaita siddhānta row — now reads from this one function.
Verified live (Playwright, real running app): `window.dgeSegLabel('vedanga')`
→ `वेदाङ्गानि`, `dvaitavedanta` → `द्वैतवेदान्तः` (previously the literal Latin
string `"Dvaitavedanta"` in one map and absent from the other), `dasa_sahitya`
→ `दाससाहित्यम्` (previously misspelled `दासस्ताहित्यम्` in the removed map).
One canonical policy, one place a new taxonomy category needs a label added
(`DGE_PATH_LABELS` in `library.js`), full script-preference support
(Kannada/Telugu/Tamil/Malayalam/IAST) for controls that previously only ever
showed Devanagari-or-IAST regardless of the reader's choice.

`dvaitavedanta` also got a real entry in `DGE_PATH_LABELS`
(`द्वैतवेदान्तः`) — it's a stale pre-restructure category id some
not-yet-rebuilt search index shards still carry (see `siddhantaOf()`'s own
comment in `global-search.js`), so an admin viewing one of those hits now
gets a real name instead of the auto-labeller's bare capitalized ASCII.

### Deferred (P2/P3, documented not built)

Points 1–5, 8–28 of the critique (modal height/scroll behavior, result-card
visual hierarchy, relevance-score display, title formatting, filter-chip
active-state contrast, close-button contrast, "0 of 30" wording, empty-state
copy, top-row layout, admin-overlay chrome, per-śloka control density, audio
player idle state, header compression, "DESIGNED BY" typography, and the
three-independent-dimensions naming problem) are real, valid findings but are
CSS/layout/copy work orthogonal to the architecture — each is a scoped,
independently shippable change once someone with a live index (or Figma) can
iterate against real rendered results. Attempting all 20+ of them tonight
alongside the entity-linking build (elevated to P0/P1) would have meant doing
neither well. **Recommendation for a follow-up pass**: treat the reviewer's
own framing literally — "search as a proper component system with consistent
sub-parts" — and refactor `global-search.js`'s render functions
(`renderRows`, `buildFilterBar`) around named sub-components (input, mode,
scope, type, taxonomy filter, result card, result count) before touching
any one's CSS, so points 2–5 and 26–28 get fixed together instead of each
styled in isolation (which is explicitly named as how the current
inconsistency was produced in the first place).

## 6. Taxonomy architecture

Three files, one relationship, now enforced instead of just intended:

```
dge/data/taxonomy.json      the corpus HIERARCHY (folder → subfolder → grantha),
                             annotated with _schema/_default_author at any level
dge/data/library.json       the per-grantha CATALOG: path, title, facets, source,
                             populated flag — one entry per digitized edition
dge/js/library.js           DGE_PATH_LABELS: canonical Devanagari display name
                             per taxonomy path SEGMENT, + dgeToActiveScript()
                             to render it in the reader's chosen script
```

`DGE_PATH_LABELS` (519 lines, ~1450 entries per its own version-comment
history) is already the de facto canonical label registry for taxonomy
segments — it just wasn't being used everywhere that needed one, which is
what §5's fix corrects. `dge_entities.json` (§7) deliberately does **not**
duplicate this: an entity's `category` field is a `DGE_PATH_LABELS` key, so a
UI showing "this is a वेदाङ्गानि text" for an Aṣṭādhyāyī cross-reference still
resolves through the same one function.

`dge/data/commentators.json` (extended earlier tonight by another session) is
a precedent worth naming explicitly: a hand-maintained canonical registry of
commentators/authors, derived from `taxonomy.json`'s own `_default_author`
fields plus corrections, with a `_readme` documenting its provenance and
caveats. `dge_entities.json` follows the same shape and the same discipline
(a `notes` field per entry recording exactly what was verified against real
data and what wasn't) rather than inventing a new registry convention.

## 7. Cross-reference / entity-linking system

### Architecture (as specified — not shortcut into "find known words, hyperlink them")

```
TEXT → DETECTION → NORMALIZATION → RESOLUTION → CANONICAL DGE ID → TARGET LOCATION → RENDERING
```

Concretely, for `"ब्रह्मसूत्रे १.१.२"`:

```json
{"surface": "ब्रह्मसूत्रे १.१.२", "entity_type": "text_reference",
 "work": "brahmasutra", "target": {"adhyaya": 1, "pada": 1, "sutra": 2},
 "confidence": 0.97, "level": 1}
```

**Files:**

| Stage | File |
|---|---|
| Canonical registry | `dge/data/dge_entities.json` (new) |
| Detection + normalization + resolution + rendering | `dge/js/entity-linker.js` (new) |
| Registry/corpus-grounded tests | `tests/test_dge_entities_registry.py` (new, pytest) |
| Detection/resolution logic tests | `dge/js/entity-linker.test.js` (new, `node --test`) |

### Why a browser-side regex engine, not an LLM call

The brief's own constraint, restated because it drove every design choice
here: **reference detection must never call an LLM in the live request
path.** `entity-linker.js` makes zero network calls beyond one small,
cacheable fetch of `dge_entities.json` (a few KB, unlike the 330MB search
index) — matching diagnosis (a regex over a pre-built alias table) is the
same cost class as `intellisense.js`'s existing sūtra-citation scanner this
file runs alongside, and that scanner already proved this approach works
live in this app (it's been running in Kosha/Ashtadhyayi/Dhatu/Rupasiddhi for
some time). An LLM is explicitly reserved for **offline, ambiguous-case**
enrichment with human review — never wired into anything that runs when a
reader opens a page.

### `dge_entities.json` — the registry

One record per **citable work** (not per digitized edition — a work like
Rāmāyaṇa may span many kāṇḍa-level granthas in `library.json`). Fields:
`id`, `display_name`/`sanskrit_name`/`iast_name`, `aliases` +
`abbreviations`, `category` (a `DGE_PATH_LABELS` key), `corpus_id`,
`canonical_route` (+ `route_type`: `reader` | `reader_templated` | `custom`),
`reference_scheme` + `reference_components`, `jump_target_kind` +
`jump_target_template`. Ships tonight with 8 entities: the 4 the review's
test cases require (Brahma Sūtra, Aṣṭādhyāyī, Ṛgveda, Bhāgavata Purāṇa) at
full Level-1 (verse-level) resolution, plus Viṣṇu Purāṇa/Mahābhārata/
Rāmāyaṇa/Sumadhvavijaya at Level-2 (named-work) resolution — each entry's own
`notes` field says exactly which parts are verified against real corpus data
and which are a documented placeholder for follow-up (see §11).

**A real bug this surfaced**: the first draft of the Brahma Sūtra entry
assumed unit ids were plain dotted numbers (`"1.1.2"`). The corpus-grounded
pytest test (`tests/test_dge_entities_registry.py`) caught that this is
false — the real `data.json`'s ids are `BS_C01_S01_V02`-shaped
(Chapter/Section/Verse) — before it ever shipped. This is exactly why that
test suite checks the registry against files on disk rather than trusting
the registry's own claims.

### `entity-linker.js` — detection, resolution, rendering

**Detection** (Levels 1–2 of the difficulty ladder, per the brief's own
"build in this order, stop when time runs out" instruction):

1. **Level 1 — explicit verse-numbered citations** ("ब्रह्मसूत्रे १.१.२",
   "भागवते १०.१४.८"): one regex built from every entity's aliases +
   abbreviations (longest-first, so "ब्रह्मसूत्राणि" isn't shadowed by the
   shorter "ब्रह्मसूत्र" it starts with), followed by up to 16 characters of
   locator-parsing (`parseLocator`) that accepts Devanagari **or** ASCII
   digits separated by `.`/`-`/space/en-dash. A locator only counts as
   Level 1 — and only then are its characters folded into the rendered span —
   when it has **exactly** as many components as that entity's own
   `reference_components`; a stray number that doesn't fit the scheme is left
   as plain text rather than guessed at (unit-tested:
   `entity-linker.test.js`'s "wrong component count degrades to Level 2").
2. **Level 2 — named work, no number** ("अष्टाध्याय्याम्", "विष्णुपुराणे"):
   the same match with no (or a non-conforming) locator — resolves the work,
   no target location.

Levels 3 (abbreviated citations) and 4 (quoted-passage detection) were
**not** attempted by this file — see §9, because both already exist
elsewhere in this codebase in more mature form than a from-scratch build
tonight would have produced.

**Resolution**: alias → entity id → `reference_components` mapped
positionally onto the parsed locator → `buildOpenUrl()` fills the entity's
route template (supporting `{var}` and zero-padded `{var:02d}` forms) and,
for a resolved target, appends `&jumpVedicId=`/`&jumpShloka=` using each
entity's own `jump_target_template` — because, as this project discovered
mid-build (see §10's core.js fix), different corpus schemas use genuinely
different addressing conventions for "the same" citation, and treating them
uniformly is exactly what produces a broken deep link.

**Rendering**: a `.dge-entity-ref` span — a fine **dotted underline** in the
app's own `--muted-text` token (not a solid blue link-underline: the
explicit ask was "subtle... NOT a garish blue-underline hyperlink"). Desktop
hover (350ms delay, so a pointer just passing over text doesn't flash a
popup) and touch tap (a real `click`, the same handler) both open the same
card: work name (transliterated via `dgeToActiveScript`, same convention as
`intellisense.js`'s own popover), the resolved locator in Sanskrit component
labels (अध्यायः/पादः/सूत्रम्/मण्डलम्/स्कन्धः/... — transliterated the same
way), an honest note when a match is Level 2 or when a work's route type is
`unresolved` ("Verse-level linking for this work isn't wired up yet"), and
two actions: **Open in DGE →** (or **Open in <work> →** for a custom-route
work like Aṣṭādhyāyī, which already has its own dedicated page) and
**Search this reference** (calls `window.DGEGlobalSearch.open()` — reuses
the existing search entry point rather than building a second one).

Verified end-to-end with Playwright against the real running app (not a
mock): injecting `"ब्रह्मसूत्रे १.१.२ ... अष्टाध्याय्याम् ... कान्ताय..."`
into a live page correctly produced one Level-1 span
(`target: {adhyaya:1,pada:1,sutra:2}`), one Level-2 span, and **zero** spans
around "कान्ताय" (the negative control — see §10); tapping the Level-1 span
rendered the exact popover markup below, with a working `?path=...&jumpVedicId=
BS_C01_S01_V02` link, on both desktop (1280×900) and a real Pixel 5 viewport:

```html
<div class="dge-er-head"><span>ब्रह्मसूत्रम् · Brahma Sūtra</span>
  <button class="dge-er-x" data-er-close aria-label="Close">✕</button></div>
<div class="dge-er-loc">अध्यायः 1 · पादः 1 · सूत्रम् 2</div>
<div class="dge-er-actions">
  <a href="/dge/index.html?path=darshana/vedanta/dvaita/SarvaMula/sutra_prasthana/
brahma_sutra_bhashya/mula&jumpVedicId=BS_C01_S01_V02">Open in DGE →</a>
  <button type="button" data-er-search>Search this reference</button>
</div>
```

**Wired into**: the reader (`render.js`'s `renderList()`, once per render
over the whole list — this app's main reading view had **no** citation
scanning of any kind before tonight; `dgeScanForSutras` only ever ran in
Kosha/Ashtadhyayi/Dhatu/Rupasiddhi), plus those same four existing call
sites, plus global search's own result snippets (`global-search.js`). Script
tag added alongside `intellisense.js` on all 6 pages that load it
(`dge/index.html` + the 5 `dge/vyakarana/*.html` pages).

**Ordering matters and is enforced in code, not just convention**: at every
call site, `dgeScanForEntities()` runs **before** `dgeScanForSutras()` and
before `dgeMarkCitations()` is walked over — a phrase like
"अष्टाध्याय्याम् १.१.१" is simultaneously one of this file's entity aliases
*and* contains "अष्टाध्याय", one of `intellisense.js`'s own cue words for
linking a bare number citation. `intellisense.js`'s and `kosha-citations.js`'s
own tree-walkers were each given a one-line addition rejecting a
`dge-entity-ref` (and, symmetrically, `entity-linker.js` rejects
`dge-sutra-ref`/`dge-cite`) ancestor, so a citation matched by one system is
never re-entered and double-wrapped by another. This was found and fixed
tonight, not by inspection but by tracing the actual required test case
through both systems' code — see §10.

### Stretch goal (explicitly P2, not attempted)

Connecting cross-reference data into search itself ("used in 37 texts",
searching a work name surfaces both text matches and a references section)
needs the detection to be **indexed**, not just rendered on the fly — i.e.
`build_search_index.py` would need to run `entity-linker.js`'s (or a Python
port of its) detection over every unit at indexing time and store the
results as searchable annotations, per the brief's own "precomputed at
indexing time" performance constraint. Not started tonight; flagged as the
natural next phase once Levels 1–2 have been live long enough to validate
the registry against real reader traffic.

## 8. Corpus metadata reference

| What | Where | Shape |
|---|---|---|
| Corpus hierarchy | `dge/data/taxonomy.json` | nested folders, `_schema`/`_default_author` annotations |
| Per-grantha catalog | `dge/data/library.json` | flat list: `path`, `title`, `facets`, `source`, `populated` |
| Taxonomy segment labels | `dge/js/library.js`'s `DGE_PATH_LABELS` + `dgeSegLabel()`/`dgeToActiveScript()` | Devanagari source of truth, transliterated live |
| Commentator/author registry | `dge/data/commentators.json` | id → `{name, traditions, works[], note?}` |
| **Citable-work (entity) registry** | `dge/data/dge_entities.json` **(new)** | id → `{aliases, category, canonical_route, reference_scheme, ...}` |
| Content schemas | `dge/data/schemas.json` | per-schema field contract (referenced by `dge-search.js`'s `classifyContentType`) |

**Access control**: search results from `darshana/vedanta/dvaita/DvaitaVedanta/`
(admin-only content) are filtered client-side in `global-search.js`'s
`dgeSearchIsAdminOnlyHit()` — explicitly documented in that file as *not*
real access control (it hides the hit from the UI; the underlying static
JSON is still fetchable directly). `dge_entities.json` and
`entity-linker.js` introduce no new access-control surface — every entity
routes into content already reachable through the normal `?path=` contract.

## 9. Prior art discovered tonight — four other citation/reference systems already exist

The brief asked for independent analysis rather than blind implementation of
every point as worded. Investigating "what's already known" (per the brief's
own instruction) surfaced **four** pre-existing systems doing some version of
"recognize a reference, find where it points," none of which the brief
mentioned by name. Documenting them here is itself a P1 deliverable: the
UI/UX critique's root-cause diagnosis for the taxonomy-label bug ("this keeps
happening because features invent their own label handling instead of
sharing one") is, on this evidence, **also** true of citation/reference
handling in this codebase, and worth the project lead knowing before more
get built:

1. **`dge/js/intellisense.js`** — sūtra-number citations *within
   grammar/Vyākaraṇa content specifically*, self-referencing the Aṣṭādhyāyī
   only. Cue-gated (a bare "१.१.१" only links near a grammar cue word or
   inside `vedanga/vyakarana` paths) to avoid false-linking a Purāṇa verse
   number. Already had a full detection→resolution→popover pipeline;
   `entity-linker.js` generalizes the same *idea* to other works, reuses its
   `tr()`/transliteration convention, and was made to interoperate with it
   (§7) rather than compete.
2. **`dge/js/kosha-citations.js`** — abbreviated citations specifically
   inside dictionary (Kosha) glosses: "भा. IX. २२. ३३", "ऋ.वे. 1.165",
   "रघु० ४-४४" — i.e. **exactly** the brief's Level 3
   ("conventional abbreviated citations... needs a citation-abbreviation
   registry"). It already has one, per-scheme, with real false-positive
   guards documented inline (e.g. why "R." is only trusted inside specific
   dictionaries, why "Bhā." is deliberately *not* matched alongside "भा."
   because they index different, incompatible editions). **A real,
   live bug was found and fixed here tonight**: its Bhāgavata Purāṇa scheme
   pointed at `purana/bhagavata_purana/...`, a pre-restructure path that no
   longer exists (the real path nests one level deeper under `maha_purana/`)
   — every भा. citation in Kosha was silently resolving to "Not found in
   this library's copy" and a broken "Open the full text" link. One-line
   fix, verified against the real `data.json` on disk.
3. **`tools/reference_resolution/`** — an **offline** Python engine (used by
   `tools/gemini_enrich.py`) that resolves a Gemini-proposed
   `{target_slug, unit_id}` or free-text quoted passage against the corpus,
   with a `verified`/`possible`/`unresolved` confidence ladder and an
   explicit `min_verified_length` guard against short-string false positives.
   This is, in effect, most of the brief's **Level 4** ("quoted-passage
   detection... explicitly a LATER phase, high false-positive risk") already
   built — just for the offline enrichment pipeline, not the live reader.
   Already has its own test suite (`tests/test_reference_resolution.py`).
4. **`genie_asr_benchmark/scripts/resolver.js`** — resolves a **voice**
   command ("Open Rigveda 1.1", noisy ASR output like "Sumadha Vijaya 1.1")
   to a target grantha + reference, with its own hardcoded phonetic-variant
   alias table (`rikveda`→rigveda, `ashtadhyai`→ashtadhyayi) built to correct
   ASR mistranscriptions specifically — a different normalization problem
   than a citation appearing in already-correct written Sanskrit, so not
   directly reusable, but the SAME underlying need (a work name → a route).

**Recommendation, not attempted tonight**: `dge_entities.json` is the
natural convergence point for all four — `kosha-citations.js`'s abbreviation
table, `resolver.js`'s phonetic-alias table, and any future move of
`reference_resolution.py`'s exact-match layer to also resolve *named works*
(it currently only checks a given `{slug, unit_id}` against the corpus, with
no work-name→slug lookup of its own beyond a loose title substring search)
could all read entity records from one file instead of four independently
hand-maintained ones. This is a real, scoped refactor for a future session,
not something to attempt under tonight's time budget — the risk of breaking
four already-working, already-tested features to save some duplication is
not worth taking with the review clock running.

## 10. P0 bugs found and fixed

1. **`dge/js/core.js`'s `dgeResolveQuickJumpTarget()`** — the `?jumpVedicId=`
   deep-link matcher's `normalize()` ran `parseInt()` on **every** vedicId
   unconditionally, including non-numeric ones. For a chapter-based
   itihāsa/purāṇa grantha (`vedicId` set to something like `"Skandha 10,
   Adhyaya 14 · 8"`, not a dotted number), `parseInt()` on a string starting
   with a letter returns `NaN`, so **every** such shloka's vedicId collapsed
   to the literal string `"NaN"` and collided with every other one — a
   `jumpVedicId` deep link into any non-Vedic chapter-based text silently
   landed on the **first** shloka of that grantha instead of the one
   actually named. Found while tracing exactly how `भागवते १०.१४.८` would
   need to resolve for entity-linker.js's own deep link to actually work —
   without this fix, that citation's "Open in DGE" link would have silently
   opened the wrong verse. Fixed: `normalize()` now only applies the
   dotted-numeric parse when the string actually looks like one
   (`/^[\d.]+$/`); anything else compares as a plain trimmed string. Vedic
   (dotted-numeric) deep links are byte-for-byte unaffected.
2. **`dge/js/kosha-citations.js`'s Bhāgavata Purāṇa citation scheme** — see
   §9.2. Stale pre-restructure path, silently broken resolution and
   "Open the full text" link for every भा. citation in Kosha.

Both are exactly the class of bug this project has already hit once before
tonight (`dvaitavedanta`'s stale top-level path, `find_title()`'s fuzzy-match
bug per `9cf1f186`) — a restructure changed real paths and left one or more
readers of the old path unmigrated. Worth a repo-wide grep for other
hardcoded `'purana/'`/`'darshana/'`-style literal paths as a follow-up; this
session fixed only the two found while doing the work above, not an
exhaustive sweep.

## 11. Test data

**Node** (`dge/js/entity-linker.test.js`, run with
`node --test dge/js/entity-linker.test.js`) — 17 tests, pure detection/
resolution/routing logic against the real `dge_entities.json`:

| Input | Expected |
|---|---|
| `ब्रह्मसूत्रे १.१.२` | `brahmasutra`, Level 1, `{adhyaya:1,pada:1,sutra:2}` |
| `अष्टाध्याय्याम् १.१.१` | `ashtadhyayi`, Level 1, `{adhyaya:1,pada:1,sutra:1}` |
| `ऋग्वेद १.१.१` | `rigveda`, Level 1, `{mandala:1,sukta:1,rik:1}` |
| `भागवते १०.१४.८` | `bhagavata_purana`, Level 1, `{skandha:10,adhyaya:14,shloka:8}` |
| `कान्ताय कल्याणगुणैकधाम्ने` | **zero** matches (negative control — see below) |
| ASCII-digit alias ("brahma sutra 1.1.2") | same Level 1 result — script-agnostic |
| Wrong-arity locator (`ऋग्वेदे १`) | degrades to Level 2, not a wrong guess |
| Two citations in one string | both resolve, non-overlapping, in order |
| `buildOpenUrl()` for each resolved case | exact, correct `?path=...&jumpVedicId=...` URL |

**Python** (`tests/test_dge_entities_registry.py`, run with `pytest` or
`python3 -m unittest`) — validates the registry's shape *and* pins the same
five cases against the **real corpus files on disk** (not a synthetic
fixture): confirms `BS_C01_S01_V02` really exists and really is "जन्माद्यस्य
यतः", confirms Rigveda `1.1.1` really is "अग्निमीळे...", confirms Bhāgavata
skandha_10's `adhyaya_14` chapter really has a shloka numbered 8, and —
the exact scenario named in the brief — confirms Sumadhvavijaya sarga_1's
first shloka really does begin `"ॐ ॥ कान्ताय..."` (the underlying corpus fact
`dge-search.js`'s word-exact scoring path depends on for the screenshot's
own search example; the search engine itself is a browser/CDN-index module,
exercised via the live-app Playwright check in §7, not re-implemented here).

**Playwright** (ad hoc scripts used during this session, not checked in —
see below): confirmed detection + popover rendering end-to-end against the
real running app on desktop (1280×900) and a real Pixel 5 emulation
(393×851, `device_scale_factor=2.75`), and confirmed the taxonomy-label fix
(`window.dgeSegLabel`) produces correct, consistent Devanagari labels for
every category that was previously mismatched. Not committed to the repo —
they were throwaway harness scripts (a local static server + a page-injection
test), not a durable addition to the test suite; the durable coverage is the
Node/pytest suites above, which run without any server or browser.

## 12. Status report (Part II's work)

### Shipped

- **P0**: `core.js`'s `dgeResolveQuickJumpTarget()` NaN-collision bug on
  non-numeric `vedicId`s (silent wrong-verse navigation).
- **P0**: `kosha-citations.js`'s Bhāgavata Purāṇa citation scheme's stale
  pre-restructure path (silently broken resolution + dead link).
- **P1**: Taxonomy label unification (critique points 6 & 7) —
  `global-search.js` now reads every taxonomy display label through
  `library.js`'s single `dgeSegLabel()`/`DGE_PATH_LABELS`, removing two
  duplicate/inconsistent hardcoded maps (one had a typo, one had a stray
  Latin-script entry).
- **P1**: Cross-reference / entity-linking system, Detection Levels 1–2:
  `dge/data/dge_entities.json` (8 works, 4 at full verse-level resolution),
  `dge/js/entity-linker.js` (detector/resolver/hover-and-tap-card renderer),
  wired into the reader (a genuinely new integration point — the reading
  view had no citation-scanning at all before tonight) and five existing
  citation-scan call sites, with real interoperability fixes so it doesn't
  double-link against the three other citation systems already in this
  codebase (§9).
- Full architecture documentation of the search, taxonomy, and (now) entity
  systems, including four previously-undocumented parallel implementations
  of "resolve a citation" this session found while investigating.

### Deferred, and why

- **P2/P3 UI/UX polish** (critique points 1–5, 8–28): real findings, but CSS/
  layout/copy work that's better done as its own focused pass once the
  reviewer's own "component system" refactor of `global-search.js`'s
  rendering is in place (recommended in §5) — bundling 20+ independent
  visual changes into tonight's architecture-focused session risked shipping
  none of them carefully.
- **Detection Level 3** (abbreviated-citation registry): not built from
  scratch — `kosha-citations.js` already does this, better-guarded against
  false positives than a first attempt tonight would likely have been. Its
  scope is Kosha-only today; extending it to the reader is future work, and
  a candidate for eventual convergence onto `dge_entities.json` (§9).
- **Detection Level 4** (quoted-passage detection): explicitly out of scope
  per the brief. Also already substantially prototyped, offline, in
  `tools/reference_resolution/` — for the Gemini-enrichment pipeline, not
  the live reader. Bringing it into the live UI is a distinct, larger
  project (needs the confidence ladder's `possible` tier surfaced to a human
  reviewer, not auto-linked) and shouldn't be scheduled alongside Level 1–2
  hardening.
- **Search × cross-reference integration** (the stretch goal — "used in 37
  texts", references section on a search result): needs index-time
  precomputation per the brief's own performance constraint; not attempted.
- **Verse-level resolution for Viṣṇu Purāṇa / Mahābhārata / Rāmāyaṇa /
  Sumadhvavijaya**: registered at Level 2 (named-work) only. Each is a
  multi-part work (18 parvas, 7 kāṇḍas, ...) whose exact `vedicId`/chapter-
  reference string convention needs verifying against real `data.json` files
  per part, the same way Bhāgavata's was — mechanical work, not
  architectural, deferred purely for time.
- **A repo-wide sweep for other stale post-restructure paths**: this session
  fixed the two instances found incidentally while building the above; it is
  not a claim that these are the only two.

### What the project lead needs to decide or provide

1. **Whether to unify the four citation/reference systems** (§9) around
   `dge_entities.json`, and on what timeline — this is an architectural call
   with real risk (four working, tested features) that shouldn't be made
   unilaterally under a time-boxed session.
2. **Whether `entity-linker.js`'s registry-driven approach should also
   absorb `kosha-citations.js`'s abbreviation schemes**, given the overlap
   is already real enough that both files now defensively skip each other's
   spans (§7) rather than duplicate coverage outright.
3. **A decision on the P2/P3 UI backlog's priority** relative to finishing
   Levels 3–4 of cross-reference detection and the search × cross-reference
   stretch goal — both are legitimate next steps and roughly comparable in
   scope; which matters more to ship next is a product call, not an
   engineering one.
4. **Corpus verification time** for the four Level-2-only works (§ Deferred
   above) if verse-level linking for them is wanted — needs someone to check
   each work's real chapter-reference string convention against its
   `data.json`, the same 15 minutes of verification Bhāgavata Purāṇa's entry
   already got.

## The exact word-level index (30 Aug 2026)

The trigram index above answers "which units share this 3-letter fragment" —
the right question for typo-tolerant fuzzy matching, the wrong one for exact
lookup at corpus scale. Measured live: कान्ताय's interior trigrams
(kan/nta/tay) are each shared by tens of thousands of units, 48,585 of which
tie as equally-"complete" candidates; no shard-open budget can resolve that
many ties, so a genuine verbatim occurrence (Sumadhva Vijaya 1.1) was never
even opened. Raising the budget 20× didn't reach it. The tie-storm is
structural, not a tuning problem.

`words/<bucket>/<section>.json` is a second, additive index answering the
right question directly: `{word: [[granthaIdx, unitIdx], ...]}`. Measured
against the real corpus: `kantaya` has **12 postings total** — a direct
lookup, no ties, no budget. 2,168,237 distinct words; ≈121 MB raw.

Key decisions (each measured, see the 30 Aug 2026 review):

- **Tokenizer** (`word_tokens()` / dge-search.js `wordTokens()`, parity
  asserted by test-parity.js): split the pkey on ANY char outside
  `[0-9A-Za-z]`+`ॐ`, drop pure-digit tokens. A whitespace-only split left
  punctuation baked into 5.6% of postings (`[sriyan`, `(nahahavi`) —
  unfindable forever.
- **Buckets**: first 2 chars of the word, case-encoded (uppercase →
  lowercase+`-`, so `Ba`→`b-a` never collides with `ba` on a
  case-insensitive filesystem; build asserts no collisions). Fixed 2-char
  buckets fail the ~1 MB/file budget (sa/darshana measured 4.76 MB), fixed
  3-char still fails (pra/darshana 3.22 MB), and per-word files are absurd
  (1.68M hapaxes). Adaptive depth: the few globally-oversized 2-char
  prefixes deepen to 3, still-oversized 3-char to 4; the decisions ship as
  `manifest.wordBucketDeepen` (a few dozen entries) for the client to walk.
- **Query** (`searchExact()`): tokenize identically, fetch one bucket file
  per (distinct bucket, section), direct dict lookup + a prefix scan (a
  word opening a longer compound, `kantayasan`, still surfaces; a word
  buried mid-compound is invisible here by construction — that remains the
  trigram path's job). Intersect across query words, fall back to best
  partial overlap; rank exact>prefix, verse-schema>commentary, then
  shorter unit first. Two serial network stages ≈ 0.6–1.8 s on mobile.
- **Routing** (global-search.js): "Exact spelling only" ON (the default)
  uses `searchExact()`; empty exact results fall back to the fuzzy path, so
  a stale index without `words/` degrades gracefully. OFF keeps the trigram
  path unchanged.
- **Exactness contract**: retrieval is fold-exact (pkey), display is
  orthographic-exact — NFC + zero-width strip + anusvara↔class-nasal
  equivalence (कान्ताय ↔ कांताय are the same word; hiding one is a false
  negative), while vowel length, sibilants, visarga, and gemination stay
  strict.

Deferred follow-ups are tracked in PENDING.md (trigram-hit blending under
sparse exact results, variant-spelling labeling, mega-shard splitting,
mojibake cleanup, the trigram tree's own pre-existing case-collision
hazard).
