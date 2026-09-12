# DGE — Parallel Cowork task briefs (Round 3, 9 Aug 2026)

Generated from a live-app bug/feature review (screenshots against the real
site) on top of everything already shipped — see `PROJECT_STATUS.md` for
full context before starting any of these. **Every stream below should
start from a fresh `git pull origin main`** — this session just pushed
several fixes (`gen_library_status.py` self-healing, a GRETIL parser
rewrite, a Sarvamoola title-display bug fix, and real What's New content),
so branching from a stale checkout will re-introduce already-fixed bugs.

Each stream is scoped to its own files as much as possible so they can run
truly in parallel without stepping on each other. Deliver each as its own
branch/PR (or zip, matching this project's existing delivery convention) —
**do not bundle two streams into one delivery**, since that's what caused
merge-conflict pain in earlier rounds. This session (Claude Code, working
directly on `main`) will review, test in a real browser, and merge each as
it lands — no need to wait for all streams to finish before delivering one.

---

## Stream 1 — Global UX: navigation, close controls, styling consistency, overlap fix

**Files:** `dge/index.html`, `dge/js/render.js`, `dge/js/modals.js`,
`dge/js/kosha.js`, `dge/tirtha/*`, `dge/guru-parampara/*`,
`dge/ashtadhyayi.html`, `dge/library-admin.html`, plus whatever shared CSS
each of those pulls in. Read-only awareness of `dge/js/config.js` for the
app's existing design tokens (CSS variables) — don't introduce new ones.

**Problems found (real, in the live app):**

1. **No breadcrumbs / cross-page navigation.** None of the standalone
   feature pages (`guru-parampara/index.html`, `tirtha/index.html`,
   `ashtadhyayi.html`, `library-admin.html`) show where the user is or how
   to get back to the main library without using the browser's back
   button. Add a small, consistent top strip on every one of these pages:
   `⌂ DGE  ›  <Section Name>`, linking `⌂` back to `dge/index.html`. Match
   the main app's existing header styling (colors/fonts), don't invent a
   new look.
2. **Missing close/minimize controls.** Audit every modal, popup, and
   floating panel across the *entire* app (main app's popups in
   `render.js`/`modals.js`, Kosha's floating results panel in `kosha.js`,
   any panel in the standalone pages) and list which ones have no way to
   dismiss/minimize them. Add a close (✕) control to every one that's
   missing it, in the same visual style as ones that already have it
   correctly (e.g. the "What's New" modal, which already has a working
   `✕ Close` button — copy that pattern, don't reinvent it).
3. **Kosha button + global search overlap the bottom toolbar.** On mobile
   (confirmed at 393px), the floating "कोश" button and the global search
   panel render *underneath* the bottom audio/Filter/Tools bar, so both are
   genuinely unusable while that bar is visible (screenshots on file show
   the कोश pill half-hidden behind "Filter"/"Tools"). This is a
   z-index/position bug — audit `kosha.js`'s injected button/panel CSS and
   the main app's bottom toolbar CSS for a stacking-context conflict, and
   fix the positioning so neither ever overlaps the other, on both mobile
   and desktop widths.
4. **A native, unstyled `<select>` slipped through.** The reading page's
   script picker (auto / देव / IAST / HK / SLP1 dropdown) renders as a bare
   OS-default white dropdown, not the app's custom-styled dropdown look
   used everywhere else. This is the same class of bug already fixed once
   for the `rangeMode` select (see git history / task tracker) — **audit
   the whole app for any other native `<select>` that slipped through the
   same way**, and restyle all of them to match.
5. **General instruction:** the whole project should look like one
   product. Before adding any new UI, check what CSS classes/variables the
   main app already uses for buttons, pills, panels, and dropdowns, and
   reuse them. Flag anywhere you're not sure which existing pattern
   applies rather than guessing a new one.

**Acceptance:** test at both ~390px (mobile) and desktop width, in a real
browser (not just static review) — screenshot before/after for the overlap
fix and the dropdown restyle specifically, since those are visual bugs.

---

## Stream 2 — Kosha: fix 3 real search bugs + build a Kosha admin dashboard

**Files:** `dge/js/kosha.js`, `dge/kosha_toolkit/`, new `dge/kosha-admin.html`
(mirror the existing `dge/library-admin.html` pattern — same passkey
`SHRI108` gate, same overall dashboard shape).

**Bugs to fix (confirmed live, not hypothetical):**

1. **Wrong-letter search results.** Typing `Madh` into Kosha search
   returns headwords starting with **न** (नाध्, नाध, नध्री, नाधस्...) —
   completely unrelated to what was typed. Something in the
   IAST/transliteration-guessing or fuzzy `fold`-matching path is mapping
   the query to the wrong bucket/shard. Trace `kosha.js`'s search entry
   point through to whichever shard file it's actually querying for a
   query starting with `m`/`M`, and find why it's landing on `n`-initial
   entries instead. This is the highest-priority bug in this stream — it
   makes basic Latin-script search unusable for a large class of queries.
2. **राम search surfaces रम, not राम itself (or not clearly
   distinguished).** Searching "राम" returns "रम" (a different, shorter
   headword) as the top/only result. First establish ground truth: does
   "राम" exist as its own headword in the currently-loaded dictionaries at
   all? If yes, it should show and रम should not silently substitute for
   it. If genuinely absent from the loaded sample, the UI must say "no
   exact match — showing nearest headword रम" rather than presenting रम as
   if it were the answer to "राम". Fix whichever of those two is actually
   true.
3. **Sanskrit/English pivot-translate buttons don't work.** Below several
   dictionary entries there are `→ कन्नड`/`→ English` buttons meant to
   cross-translate a sense via the BYOK Gemini pivot. Tapping one sometimes
   produces a bare ⚠️ icon instead of a translation, with no visible error
   message. Debug this call path end-to-end (including what happens on a
   Gemini API error — see Stream 6 for the shared error-handling pattern to
   use here too) and make it either work or fail with a clear, visible
   reason.

**New: Kosha admin dashboard (`dge/kosha-admin.html`).** Build this on the
same pattern as `library-admin.html`. It should show, per dictionary
currently registered in `dge/data/koshas/_index/manifest.json`:
- name, licence badge (Cleared / Unclear / Unclear-no-licence, matching
  `kosha_toolkit/LICENSING.md`'s existing categories),
- headword/sense counts actually loaded right now,
- a way to hide a dictionary from search results without deleting its
  data (a visibility flag `kosha.js` respects at query time),
- a sortable list, and a clearly separate "known but not yet loaded"
  section listing what's documented in `kosha_toolkit/LICENSING.md` as
  available-but-not-ingested (the ~55 other `indic-dict` dictionaries with
  no `LICENSE.xml`, beyond the 10 already sampled).

**Also answer, in your PR/delivery notes, don't just silently skip:** is
there a Purāṇic-encyclopedia-style dictionary (e.g. Vettam Mani's *Puranic
Encyclopaedia*, or any Purāṇa-index/glossary) anywhere in the public
`indic-dict/stardict-sanskrit` mirror, or documented in
`kosha_toolkit/LICENSING.md`'s local `dict.zip` inventory? If it genuinely
isn't in either place, say so plainly — that's a sourcing gap for the
project lead to decide on, not something to fabricate a fix for. Do **not**
attempt to source new copyrighted reference works yourself; this project's
standing rule is "absence of a licence is not permission" — flag, don't add.

---

## Stream 3 — Guru Parampara: Dasa Parampara lineage + Brindavana images + holy-places admin

**Files:** `dge/guru-parampara/`, `dge/data/parampara.json`.

1. **Add the missing Dāsa Paramparā lineage.** The current dataset tracks
   19 Madhva/Dvaita lineages (210 figures) and does **not** include the
   Dāsa Paramparā (Haridāsa) lineage at all — confirmed absent from
   `parampara.json`'s current lineage list. Research and add it with the
   same field structure every other lineage already uses (dates,
   brindavana, place, purvashrama, works, contribution, sources — see the
   existing completeness-tracker fields for the exact shape), sourced and
   attributed the same way the other 19 are (check `guru-parampara/BUILD_REPORT.md`
   for the sourcing approach used originally).
2. **Brindavana images.** `guru-parampara/brindavana_image_manifest.md`
   already lists Wikimedia Commons search links for 68 shrines — by design,
   no images were embedded when this was originally built. Now actually
   pull a real image for each (Wikimedia Commons / public-domain sources
   only — check each image's own licence tag on Commons before using it,
   don't assume), store it (or a stable Commons URL + local attribution
   record) and wire it into the 2D/3D views. Where a shrine's manifest
   entry turns up nothing usable, leave it blank rather than substituting
   an unrelated image — record which ones stayed blank in your delivery
   notes.
3. **Admin page: which places are "holy."** Build a curation page (new,
   e.g. `guru-parampara/holy-places-admin.html`, same `SHRI108` passkey
   convention) listing every brindavana/tīrtha currently in the dataset,
   letting the project lead add, edit, approve, or hide entries. **Design
   the underlying data shape (id, name, lat/long, type, source, approved)
   to be shared with Stream 4's Tīrtha Prabandha places** — both datasets
   are fundamentally "a sacred place with a location," and Stream 4 needs
   the same shape for its geolocation feature. Coordinate the exact field
   names via your delivery notes so the two streams' data merges cleanly
   even though you're working independently — when in doubt, use the
   simplest shape: `{id, name, lat, lng, type, sourceDataset}`.

---

## Stream 4 — Tirtha Prabandha: place images + shared "nearest holy place" finder + admin tracker

**Files:** `dge/tirtha/`, its `data.json`.

1. **Images for each of the 95 holy places.** Same sourcing rule as
   Stream 3 — Wikimedia Commons / public-domain only, verify each image's
   own licence, skip and note where nothing usable exists. Tirtha
   Prabandha's own pending list already flags "lat/long for maps" as
   missing — add lat/long while you're adding images, since the next item
   needs it.
2. **"Nearest holy place" finder**, using the browser's Geolocation API,
   spanning **both** Tirtha Prabandha's 95 places and Guru Parampara's
   brindavanas from Stream 3 — one shared feature, not two separate ones.
   Since Streams 3 and 4 run in parallel, coordinate on the shared
   `{id, name, lat, lng, type, sourceDataset}` shape proposed in Stream 3
   so this can consume both datasets once they land; if Stream 3's data
   isn't ready yet when you deliver, ship the Tirtha-only half behind the
   same interface so it's a one-line addition once brindavana coordinates
   exist. Fail gracefully (no crash, clear message) if the user denies
   location permission.
3. **Tirtha Prabandha's own admin/progress tracker**, matching Guru
   Parampara's existing "Data Completeness Tracker" (61% overall, per-field
   coverage bars) — Tirtha doesn't have an equivalent yet. Same visual
   pattern, same kind of per-field breakdown (which places have images,
   lat/long, confidence rating, etc.).

---

## Stream 5 — Ashtadhyayi: missing commentary layers + pada-cheda/anvaya + admin tracker

**Files:** `dge/js/ashtadhyayi.js`, `dge/ashtadhyayi.html`,
`dge/data/ancillary/vyakarana/paniniya_vyakarana/{mahabhashya_patanjali,siddhanta_kaumudi}/`,
new data location for Vasu's translation.

**Context:** the reader already supports 4 toggleable commentary layers
(Kāśikā, Nyāsa, Bālamanoramā, Tattvabodhinī — see `ashtadhyayi.js`'s `META`/
`ORDER`). Two more are already scaffolded as empty placeholders in
`taxonomy.json`/`library.json` (Mahābhāṣya, Siddhānta-Kaumudī) but have
**zero content** — nothing has ingested them yet, despite a coworker brief
for exactly this having been drafted earlier (see git history / task
tracker — that brief was written but the work itself was never delivered).

1. **Populate Mahābhāṣya (Patañjali) and Siddhānta-Kaumudī** into their
   already-scaffolded leaves, sourced from GRETIL/sanskritdocuments.org
   (same academic-source convention as every other importer in this
   project — check `importers/` for the existing pattern to follow, and
   `importers/common.py`'s `to_text()`/`iast_to_dev()` helpers rather than
   writing new parsing infra from scratch where the existing helpers fit).
2. **Add Vasu's English translation of the Ashtadhyayi** (Śrīśa Chandra
   Vasu, 1891, Pāṇini Office edition — public domain, available on
   archive.org) as a fifth layer.
3. **Wire all three into `ashtadhyayi.js`'s `META`/`ORDER`** once real
   content exists for each — the UI already has chips waiting for exactly
   this per `PROJECT_STATUS.md`.
4. **Pada-cheda (word-splitting) and anvaya (prose/word-order) display**
   for each sūtra, matching what ashtadhyayi.com already shows. First
   check whether any of the four already-loaded commentaries structurally
   carries this (some commentary traditions include it inline) before
   assuming it needs a wholly separate source — say clearly in your
   delivery notes which case it turned out to be.
5. **Ashtadhyayi's own admin/progress page** (`dge/ashtadhyayi-admin.html`
   or similar, same passkey convention) — which of the (now up to 7)
   layers are loaded vs pending, sūtra-count coverage per layer, and
   licence status per commentary. The four already-live commentaries are
   currently tagged `licence: verify` in their own data (sourced from the
   project lead's own StarDict dictionaries, not yet confirmed against a
   public source) — surface that clearly in this admin page rather than
   silently treating them as cleared; don't resolve the licence question
   yourself, just make its status visible.

---

## Stream 6 — Shared Gemini error handling (small, self-contained)

**Files:** new small shared helper (e.g. `dge/js/ai-errors.js`, or add to
`dge/js/ai.js` if one already exists and is the right home), then update
call sites in `dge/js/ashtadhyayi.js` (AI tutor), `dge/js/kosha.js`
(pivot-translate, see Stream 2 item 3), and `dge/convert/` (proofreading)
to use it.

**Problem:** Ashtadhyayi's "AI tutor" currently shows a raw, unhelpful
dump when the user's own Gemini API key hits a quota wall:

```
Gemini error: You exceeded your current quota... limit: 0, model:
gemini-2.0-flash ... Please retry in 1.9s.
```

A `limit: 0` on a metric almost always means the Google Cloud project
behind that key has never had billing enabled / has no quota grant for
that specific model — not that DGE is misusing the key. **Nothing in DGE's
code can grant someone else's API key more quota**, so this is not a "fix
the bug" task in that sense — it's an error-surfacing and resilience task:

1. Detect this specific error shape (`"exceeded your current quota"`,
   `"limit: 0"`) and show a short, plain-language message instead of the
   raw JSON: something like *"Your Gemini API key has no quota for this
   model — check your Google AI Studio project's billing/quota settings
   (ai.google.dev/gemini-api/docs/rate-limits)."* Keep the raw error
   available behind a "details" toggle for anyone who wants it, don't
   delete it.
2. Add a one-step model fallback: if the configured model
   (`gemini-2.0-flash`) fails specifically on a quota/rate-limit error,
   retry once against a different commonly-available free-tier model
   (e.g. `gemini-1.5-flash`) before surfacing an error to the user. Don't
   retry on other error types (auth failure, malformed request, etc.) —
   only the quota/rate-limit shape.
3. Since Ashtadhyayi's tutor, Kosha's pivot-translate, and Convert's
   proofreading each currently call Gemini independently, build this once
   as a shared helper and switch all three call sites to use it, rather
   than three separate patches with three slightly different behaviors.

---

## Notes for whoever reviews/merges these (this session)

- Stream 2's Kosha admin dashboard and Stream 5's Ashtadhyayi admin page
  are two more instances of the same "every unique DGE section needs its
  own progress/config tracker" pattern Guru Parampara already has and
  Library Manager already provides for the main catalog — after these
  land, every major feature area will have one. No further stream is
  needed just for that meta-goal once Streams 2, 4, and 5 are in.
- Streams 3 and 4 both touch a shared "holy place" data shape by design —
  review them together, not independently, even though they're separate
  deliveries.
- None of these streams should need to touch `dge/data/library.json`,
  `tools/gen_library_status.py`, or anything under `importers/` (Stream 5's
  Ashtadhyayi content ingestion is the one exception — it may reuse
  `importers/common.py`'s helpers, but shouldn't need to modify them) — if
  a delivery does touch those, treat that as a signal to double-check
  scope before merging, since this session is actively iterating on those
  same files for the content-ingestion pipeline in parallel.
