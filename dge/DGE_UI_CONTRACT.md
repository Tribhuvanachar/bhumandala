# The DGE UI Contract — one interaction system, many renderers

_Written 28 Aug 2026, in answer to a second reviewer's 35-point architectural
critique of three screenshots (the Aṣṭādhyāyī AI-settings modal, its
sūtra+commentary reading view, and an earlier Dāsa Sāhitya mockup) and the
project lead's own framing of the finding: DGE had "several locally-designed
interfaces rather than one coherent DGE interaction system." This document is
the write-down of what "one coherent system" means at DGE — which pieces
already exist and are canonical, which pieces this pass formalizes as new
policy, and which renderers still need to be brought onto them. Matches this
repo's existing convention of a named architecture doc, alongside
dge/SEARCH_ARCHITECTURE.md._

_Updated later the same day (second pass): Dhātu/Śabda retrofitted onto the
contract (Part III/VI), a new sitewide right-side nav rail formalized and
built (Part VII), and the persistent bottom-audio-player bug fixed
sitewide (Part VIII, critique #26). See those parts and Part VI's punch
list for exactly what changed and what's still open._

The reviewer's closing point, quoted directly because it is the thesis of
this file: _"don't treat this as 'fix this screenshot' — treat it as a
standing DGE UI Contract: every corpus renderer is a view over the same DGE
semantic and interaction framework; content-specific differences are
permitted, but interaction semantics, entity resolution, contextual actions,
navigation, Kosha, audio, citation, accessibility, responsive behavior, and
design tokens must remain globally consistent across every renderer."_

---

## Part I — what already exists (canonical, not reinvented)

Before this pass, a survey of the codebase (not the screenshots) found that
most of what the critique asks DGE to "establish" was already built by
sibling sessions the same night, just not yet applied to every page. This
section names each one as the canonical implementation — file, entry points,
what it owns — so nothing below gets rebuilt a second time under a new name.

### 1. Contextual actions — `dge/js/contextual-actions.js`

Answers critique #10 ("DGE needs a universal selection-context engine").
Two halves:

- **A registry** (`window.dgeGetContextualActions(objectType, context)`) that
  merges `admin/config/contextual-actions.json`'s `base` action list per
  object type (`word`, `phrase`, `shloka`, `commentary`, `reference`,
  `chapter`, `page` today) with any matching `taxonomyOverrides` — either
  from that same config file, or registered at runtime via
  `window.dgeRegisterContextualActions({objectTypes, pathPrefixes, add,
  remove, enabled})`. This is the "mappable, can enable/disable/map it"
  mechanism the project lead asked for directly for per-section extensions
  (Veda svara info, Ashtadhyayi sūtra actions, etc.).
- **A generic bottom-sheet/modal component**
  (`window.dgeOpenContextualMenu(objectType, context)`) for object types with
  no pre-existing UI to duplicate. `word`/`phrase` keep `ai.js`'s existing
  selection tooltip; `shloka` keeps `actions.js`'s existing sheet. This
  component's markup (`.modal-overlay`/`.modal-content`/`.ctx-menu-*`) is
  shown and hidden by `modals.js`'s `openModal()`/`closeModal()`, and its
  visual styling lives in `dge/css/main.css`.

**A real dependency this pass found and is now documenting explicitly:**
`dgeOpenContextualMenu` does nothing observable on a page that loads
`contextual-actions.js` but not also `modals.js` (no way to show/hide the
menu) and not also `main.css` or an equivalent stylesheet defining
`.modal-overlay`/`.ctx-menu-*` (the menu exists in the DOM but is invisible
or unstyled). **Any page adopting this system must load `modals.js` +
`contextual-actions.js` + `reader-state.js` together**, and must either load
`main.css` or define the same class contract locally (see Part III, §5, and
the Ashtadhyayi retrofit below for a worked example of the local-CSS path).

### 2. Canonical reader state — `dge/js/reader-state.js`

Answers critique #10's supporting state model. `dgeReaderState()` /
`dgeStudyState(id)` / `dgeAudioState()` / `dgeAssistantState()` /
`dgeSearchState()` are accessor functions over the state that already exists
scattered across `render.js`/`audio.js`/`ai.js`/`markers.js` — deliberately
**not** a rewrite of where state lives (the underlying globals stay the
source of truth), just one documented shape to read through. New code should
call these, not reach into the raw globals directly.

### 3. Cross-corpus entity linking — `dge/js/entity-linker.js` +
`dge/data/dge_entities.json`

Answers critique #11 (hover/tap a citation like "ब्रह्मसूत्रे १.१.२" or
"अष्टाध्याय्याम्" → a small entity card: work name, reference location,
Open/Occurrences actions) and is Levels 1–2 of the detection-difficulty
ladder documented in `dge/SEARCH_ARCHITECTURE.md`'s Part II. Already wired
into `dge/index.html` and (as of this pass) `dge/vyakarana/ashtadhyayi.html`.
Critique #12's ask — the same entity system also resolving *people*
(ವಿಜಯದಾಸರು → a canonical person entity: tradition, works, guru, lineage) — is
the same registry's future extension, not a separate system; not built in
this pass (see Part IV).

### 4. Ask DGE AI — `dge/js/ai.js` (+ per-renderer BYOK clients:
`dge/js/gemini.js` on the Vyakarana cluster)

Answers critique #9. The main reader already calls this "Ask Acharya";
critique #9's ask is a *naming and prompt-derivation* discipline, not a new
system: the trigger should read "✦ Ask DGE AI", and its prompt should be
auto-derived from whatever's actually selected (word → "Ask about X"; sūtra →
"Explain 1.1.1 X"; one commentary → "Explain this Kāśikā passage"; two → cite
"Compare these commentaries"). `dge/js/gemini.js` is the Vyakarana cluster's
own thin BYOK client (model list, error classification, one-retry-on-a-
lighter-model) — a legitimate second implementation of *transport*, not of
UX, since the cluster's pages don't share `dge/index.html`'s Acharya modal
DOM. The **naming and prompt-derivation contract is one thing sitewide**;
the client underneath it is allowed to differ per renderer.

### 5. Kosha — `dge/js/kosha.js`

`window.dgeOpenKosha(word)` / `window.dgeKoshaQuick(word)`. Answers critique
#25's "background service the renderer already knows how to invoke
contextually" ask — already true on `dge/index.html`; the Vyakarana cluster
does not yet call it (see Part IV).

### 6. Shared shell — `dge/js/dge-shell.js`

`<dge-footer>`/`<dge-breadcrumb>` custom elements: same link sets, same
behavior, sitewide. This is genuinely sitewide already — every gated page
in `tools/redesign/page_inventory.json` uses it or `site-footer.js`'s
un-migrated equivalent.

### 7. Design tokens & themes — `dge/css/tokens.css`

Five live, user-selectable themes (Traditional, Minimal, Vibrant, Dark
Glass, Vandana) already answer most of critique #13/#31's "light / dark /
system" ask, via the theme-swatch picker in `main.css` — not under those
exact names, and this is a real, named product decision the project lead
should see explicitly rather than have silently overridden (see Part V).

---

## Part II — what this pass formalizes as new, sitewide policy

These did **not** exist as named, written contracts before this pass. They
are policy from here on, adapted to tokens/markup DGE already has rather
than inventing a parallel vocabulary.

### 1. DGE semantic color table (critique #3)

| Meaning | Token (existing, from `tokens.css`) | Do NOT use for |
|---|---|---|
| Identity / navigation chrome | `--accent-red` | content emphasis |
| Selected / emphasis / active state | `--accent-gold` | plain UI chrome |
| Available / loaded content | plain text color (`--text-primary`/`--ink`) — loaded content should look **normal**, not colored (see #5 below) | a "this loaded successfully" badge |
| Attention / pending | a subtle loading treatment (skeleton shimmer, already `.dge-skel` on the Ashtadhyayi page), never a permanent color legend | — |
| Warning / doubt / error | `--accent-red` at reduced opacity, or the existing `.jump.miss`-style error red (`#b3462f` on the Vyakarana cluster) | routine controls |
| Commentary / source identity | a per-commentary tag color IS legitimate (Kāśikā ≠ Siddhānta-Kaumudī ≠ Bālamanoramā need to stay visually distinguishable across many open cards) — keep these, but confine them to the commentary's own tag/border accent (`--tag`, `--k`/`--sk`/`--mb`/… on the Vyakarana cluster), never reuse one of those colors for an unrelated control | AI controls, sūtra controls, or anything that isn't that specific commentary |
| Ordinary controls | `--ink`/`--line`/`--panel` (neutral) | — |

The violation the critique found (orange/red for Kāśikā, blue for
Siddhānta-Kaumudī, gold for AI controls, gold/orange for sūtra controls too)
was AI controls and sūtra-navigation controls borrowing commentary-identity
colors and vice versa — that's now the rule this table exists to prevent:
**a commentary's tag color identifies that commentary, and nothing else.**

### 2. Three-level menu hierarchy (critique #28)

- **L1 — immediate content actions.** Visible directly on the content,
  no menu needed: Play, a commentary card's own expand/collapse (whole
  header tappable), the 2–3 highest-value sūtra tools.
- **L2 — contextual actions (⋮).** `contextual-actions.js`'s registry and
  `dgeOpenContextualMenu` — Bookmark, Copy citation, Compare, Find
  occurrences, Ask DGE AI-about-this, etc. One per object type (word,
  phrase, shloka, commentary, sūtra, chapter, page, and future
  person/textual-reference).
- **L3 — global application tools.** A page-level menu (the Ashtadhyayi
  cluster's existing `☰` drawer is this tier) — search, reading settings,
  Kosha, audio, AI settings, bookmarks, history, help/about. Expand-all/
  collapse-all-type "affect everything on the page" actions belong here (or
  as a tiny affordance directly next to the section they act on — see the
  Commentary Navigator pattern below), never floating as their own row
  competing with L1 content.

Every control on every DGE page should be assignable to exactly one of
these three tiers. If it doesn't fit, it's probably duplicating something
that already has a home (critique #29 — see also `contextual-actions.json`'s
own `_readme`, which documents this same "one canonical home per action"
rule for its registry).

### 3. Commentary Navigator pattern (critique #2)

Replaces a flat row of same-shaped toggle pills. A **labeled list**, one row
per commentary/layer, with:

- a toggle dot (filled = currently displayed, hollow = available but not
  displayed, dashed = still loading) — NOT a pill, since a pill means
  "category/filter" under the component-shape rule below, not "toggle a
  whole content section";
- the commentary's name/author as a label, not just a two-letter tag;
- a plain-language status word ("loading…", "no text on this item",
  or nothing when normal) instead of a persistent color-key legend;
- a one-line summary above the list ("5 of 7 commentaries shown"), replacing
  any "green = loaded from your data · dashed = pending" legend, per
  critique #4 (never expose the app's own loading architecture to the
  reader — say what's true in plain language instead).

Per-commentary *actions* (About, Copy citation, Find citations, Ask DGE AI
about this) live in that commentary's own L2 `⋮` menu on its rendered card,
**not** duplicated onto the navigator row — one canonical home each.

### 4. Component-shape rule (critique #22)

| Shape | Means |
|---|---|
| Button | an action |
| Tabs | switching between modes of the same content |
| Chip/pill | a tag, category, or filter |
| Card | a unit of content |
| Menu | secondary/contextual actions (L2/L3 above) |
| Link | navigation to another page/resource |

A pill row used to mean "toggle whether this whole content section is
displayed" (the old commentary chips) — that's a **list of toggle rows**
under this rule, not a pill row (see Commentary Navigator above). Chips stay
chips only where they really are tags/filters (e.g. the corpus-usage
result's rank groupings).

### 5. Loading-state rule (critique #4/#21)

- **Loaded** content looks normal — no color, no badge.
- **Pending** is a subtle in-place loading treatment (skeleton shimmer),
  never a persistent legend the reader has to learn.
- **Unavailable** (a layer with no content for this specific item) is a
  plain-language disabled state ("no text on this item"), not a colored dot.
- Any aggregate ("5 of 7 commentaries shown") is a one-line plain-language
  summary near the relevant heading, never a color-key legend.

### 6. Icon-labeling rule (critique #6/#17)

No icon-only control ships without an accessible label (`title` +
`aria-label`) stating **exactly** what it does, in plain terms — "Copy
citation" or "Copy commentary text", never a bare icon or the raw Sanskrit
technical term alone as the *only* label. A Sanskrit/technical term is fine
as the **visible** label as long as an English gloss is available (inline,
as with "प्रकरणानि · Topics", or via `title`/`aria-label`) — this is a
labeling completeness rule, not an anti-Sanskrit rule.

---

## Part III — compliance status by renderer

| Renderer | dge-shell.js | contextual-actions.js + reader-state.js + modals.js | entity-linker.js | kosha.js | Commentary Navigator / equivalent | Nav rail (Part VII) | Status |
|---|---|---|---|---|---|---|---|
| `dge/index.html` (main reader — covers most shloka corpora: Stotra, Purāṇa, Vedānta texts, etc. as data, not separate renderer pages) | ✅ | ✅ (this is where all three were first landed) | ✅ | ✅ | N/A (single-shloka reader, not a multi-commentary-layer view) | ✅ **(this pass, new)** | **Compliant** |
| `dge/vyakarana/ashtadhyayi.html` | ✅ | ✅ — was the exact page in the critique's screenshots; previously loaded none of the three | ✅ (already had it) | ❌ (word-level Kosha lookup not wired — see Part IV) | ✅ | ✅ **(this pass, new)** | **Retrofitted (Aug 28 pass); nav rail added this pass** |
| `dge/dasa-sahitya/index.html` | ✅ | ✅ — **confirmed merged to `main` as of this pass** (re-checked `git log`: `914a8e46` *"Wire Dasa Sahitya into the shared reader infra: word-tap Kosha, composer sheets, composition contextual menu"* is on `main`, and the page's own `<script>` tags now load `modals.js`+`reader-state.js`+`kosha.js`+`contextual-actions.js`+`entity-linker.js`). The Part III row below this table's previous revision said "not merged" — that was accurate when written and is now stale; this is exactly the "do not assume it is finished, re-check" warning it told future readers to heed. | ✅ | ✅ | unknown (out of scope this pass — visual retrofit and real breadcrumb work were explicitly owned by a different session as of this pass; re-check before relying on this row) | ✅ **(this pass, new)** — added alongside the page's own in-flight retrofit; re-fetched immediately before merging to avoid clobbering it (see Part VII) | **Shared-systems compliant (merged); visual retrofit in progress by a different session** |
| `dge/vyakarana/dhatu.html` | ✅ | ✅ **(this pass)** — new `dhatuRoot` object type (Bookmark this root / Copy citation / Copy full entry), reached from a new `⋯ More` button in each root's existing `.acts` row. Deliberately does **not** duplicate the derivation links (प्रक्रिया/कृदन्त/रूपाणि/रूपसिद्धिः/अष्टाध्यायी) or the corpus-occurrences search already inline there (critique #29's "one canonical home per action") | ✅ (already had it) | ❌ — follow-up | N/A (lookup tool, not a commentary reader) | ✅ **(this pass, new)** | **Retrofitted this pass** — see Part VII/report |
| `dge/vyakarana/shabda.html` | ✅ | ✅ **(this pass)** — new `subantaWord` object type (Bookmark this word / Copy citation / Copy declension table), reached from a new `⋯ More` button per word. Previously loaded none of the three (shabda.js had a comment documenting this as deliberate; updated now that the page does load `modals.js`) | ❌ — follow-up | ❌ — follow-up | N/A | ✅ **(this pass, new)** | **Retrofitted this pass** — see Part VII/report |
| `dge/vyakarana/{chandas,krdanta,rupasiddhi,dhatuforms,prakriya}.html` (5 pages — declension/conjugation/derivation tool pages, not commentary readers) | ✅ | ❌ | ❌ | ❌ | N/A | ❌ — not this pass | **Not started** — follow-up. Dhātu/Śabda above are now the worked pattern to replicate (new page-local object type + `⋯ More` button + CSS ported into `vyakarana.css`), same role Ashtadhyayi already served for multi-commentary readers |
| `dge/kavya/index.html` | ✅ | ❌ | ❌ | ❌ | — | ❌ — not this pass | **Not started** — follow-up |
| `dge/tirtha/index.html` | ✅ | ❌ | ❌ | ❌ | — | ❌ — not this pass | **Not started** — follow-up |
| `dge/guru-parampara/index.html` | ✅ | ❌ — **deliberately not applied this pass, not an oversight**: this page is a pure navigational hub (3 link-cards to `lineage-2d.html`/`lineage-3d.html`/`tracker.html`), with no content object matching any existing or plausible-to-add object type — see note below the table | ❌ | ❌ | — | ✅ **(this pass, new)** | **Nav rail added this pass; contextual-actions retrofit intentionally out of scope — see note** |
| `dge/guru-parampara/tracker.html` | ✅ | ❌ — **deliberately not applied this pass**: its 215-figure table is a real candidate for a `person` object type (View in lineage tree / Copy name), but Part VI *already* names extending the registry with `person` as explicit future work, tied to `entity-linker.js` resolving people (critique #12) — building a one-off `person` type here now would preempt that decision rather than implement it; see note below the table | ❌ | ❌ | — | ✅ **(this pass, new)** | **Nav rail added this pass; contextual-actions retrofit intentionally deferred to the Part VI person-entity work** |

**Why Guru Parampara's two pages didn't get `modals.js`+`reader-state.js`+
`contextual-actions.js` this pass, unlike Dhātu/Śabda:** the retrofit
pattern this pass established (a new page-local object type + a small
`⋯ More` trigger) needs a real per-item *thing* to attach actions to.
Dhātu/Śabda have one (a root / a declining word). `index.html` has none at
all — it's three navigation cards, already correctly a `Link` shape per the
component-shape rule, nothing to add a menu to. `tracker.html` has one
(a person row) but Part VI already named `person` as a deliberate future
object type tied to `entity-linker.js`'s people-resolution work, not
something to improvise piecemeal here. Loading three extra scripts for a
menu system with nothing real to attach — or attaching it to a `person`
type invented on the spot rather than the one already planned — would have
been exactly the decorative, non-functional wiring this contract exists to
prevent. Both pages got the one thing that *is* real and needed regardless:
the nav rail.

This session's actual scope was **the contract doc plus the Ashtadhyayi/
Vyakarana retrofit** (28 Aug 2026, first pass) and, in this follow-up pass,
**Dhātu/Śabda's contextual-actions retrofit, the sitewide nav rail, and the
bottom-audio-player fix** (see Part VII and Part VIII). The table above is
the honest state after both passes, not a claim of sitewide compliance —
`{chandas,krdanta,rupasiddhi,dhatuforms,prakriya}.html`, Kāvya, and Tīrtha
remain real, un-deferred follow-up.

---

## Part IV — the Ashtadhyayi/Vyakarana retrofit, what changed

`dge/vyakarana/ashtadhyayi.html` + `dge/js/ashtadhyayi.js` +
`dge/css/ashtadhyayi.css`:

1. **Loaded `modals.js` + `reader-state.js` + `contextual-actions.js`.**
   Confirmed by reading the page's own script tags that it previously loaded
   *none* of the three — it had its own bespoke chip toolbar, its own AI
   modal, its own padaccheda/analysis row. Also confirmed
   `contextual-actions.js`'s generic menu has a real, previously-undocumented
   dependency on `modals.js` (for open/close) and on CSS classes normally
   defined in `main.css` (which this page also never loaded) — ported the
   needed CSS into `ashtadhyayi.css` scoped to this page's own token
   variables, rather than pulling in the whole of `main.css`'s separate
   design system (that full visual unification is real follow-up work, not
   attempted here — see Part VI).
2. **Commentary Navigator** (`renderCommentaryNavigator()` in
   `ashtadhyayi.js`) replaces the flat `.dge-chips` row and the
   "green = loaded from your data · dashed = pending" legend with a labeled
   toggle-row list and a "N of 7 commentaries shown" summary line, per Part
   II §3.
3. **Registered two new contextual-action object types** via
   `window.dgeRegisterContextualActions` (the existing runtime extension
   point, scoped by `pathPrefixes: ["vedanga/vyakarana/ashtadhyayi"]` so
   nothing here affects any other reader):
   - `sutra` (new — no prior equivalent existed): Corpus usage (प्रयोगाः),
     Copy sūtra text, Copy citation, Suggest a correction. Reachable from a
     single `⋯ More` button that replaced three separate always-visible
     buttons in `.heroactions`.
   - `commentary` (overrides the shared registry's base actions for this
     taxonomy path only — the base `copy`/`askAcharya`/`references` actions'
     handlers assume `dge/index.html`'s shloka-card shape and don't apply
     here): About this commentary, Copy citation, Find citations, **Ask DGE
     AI about this** (opens the existing AI drawer with the prompt
     pre-filled — "Explain this Kāśikā passage on sūtra 1.1.1." — per
     critique #9's exact worked example). Reachable from a new `⋮` button on
     every commentary card's header.
4. **AI settings modal**: the "bring your own key" privacy paragraph is now
   behind a `<details>`/`<summary>` "Where does my key go?" disclosure
   instead of a permanent paragraph dominating the dialog (critique #8). The
   trigger button and drawer heading are renamed "✦ Ask DGE AI" (critique
   #9) sitewide-consistent with the naming contract in Part I §4.
5. **Focus / reading mode** (critique #30, new `#dge-focusBtn`): collapses
   the page to the sūtra + Commentary Navigator + open commentaries — hides
   the top nav strip, breadcrumb, sūtra-identity metadata line, and footer.
   Persisted like every other reader preference on this page.
6. **Expand-all/Collapse-all** moved out of a row competing with the
   Commentary Navigator into the existing `☰` menu drawer's new
   "Commentaries" section, plus a tiny inline pair of icons in the
   navigator's own summary line (critique #5's "keep only a tiny
   affordance next to the heading itself") — one shared delegated handler
   (`[data-cn-action]`), not two separate implementations.
7. **प्रकरणानि** now carries an inline "· Topics" gloss (critique #17).
8. **Compact mobile prev/next** (critique #15): the neighboring sūtra's full
   text is hidden by default under the mobile breakpoint and shown only
   while the button is actually being pressed/focused (CSS `:active`/
   `:focus-visible`), so revealing it and navigating are the same gesture
   rather than a second interaction step.
9. **"Suggest a correction"** replaces the bare ✏️ icon as a menu item's
   visible label (critique #20) — still routes to the same
   `[DGE-CONTENT-GAP]` mailto template as before.

**Deliberately not touched, and why:** word/phrase-level tap on this page is
left to `intellisense.js`'s existing double-tap popover, not migrated onto
`contextual-actions.js`'s `word`/`phrase` object types. That system already
works on this page and does a different, narrower job (says what a word is);
building a second, competing word-tap menu in the same pass risked exactly
the "two systems fighting over the same tap" failure mode this whole
redesign exists to eliminate. Tracked as real follow-up (Part VI), not
silently declared done.

---

## Part V — one product-taste decision for the project lead

The second reviewer specifically called out wanting the Dāsa Sāhitya
mockup's calmer cream/maroon look made "the DGE default identity," rather
than each corpus developing its own visual language, and separately asked
for a genuine cream/maroon "reading light" + dark-brown/warm-ivory "reading
dark" pair.

**What already exists:** `tokens.css`'s `theme-traditional` (cream
`#FAF3E6` background, maroon `#9A1B1B`/`#AE231F` text/accent) is already
close to the "reading light" ask, and `theme-darkglass` (near-black
`#0E0C0B` background, warm ivory `#EDE2D3` text) is already close to the
"reading dark" ask — both live, both user-selectable today via the
theme-swatch picker. They are not named "reading light"/"reading dark" and
`theme-vandana` (near-black, saffron/gold) remains the sitewide **default**,
not Traditional.

**The decision this session did not make on its own:** whether to (a) leave
the 5 existing themes as-is, (b) rename `theme-traditional`/`theme-darkglass`
to make the "reading light/dark" intent explicit without changing their
values, or (c) actually change the sitewide default from Vandana to
Traditional, as the reviewer's own stated preference would suggest. This is
a real, named product-identity decision — flagged here rather than guessed
at silently, per the project lead's own instruction.

---

## Part VI — follow-up punch list

_Updated 28 Aug 2026, second pass (Part VII/VIII below). Items the first
pass listed and this pass actually completed are marked done and moved out
of the open list rather than left to look outstanding — see Part III for
the compliance table each of these maps to._

**Done in this pass, was open before it:**
- ~~Retrofit Dhātu and Śabda onto `contextual-actions.js`/`reader-state.js`~~
  — done (new `dhatuRoot`/`subantaWord` object types; see Part III).
- ~~Re-check `dge/dasa-sahitya/index.html`'s actual landed state once
  `dasa-sahitya-ux-integration` merges to `main`~~ — done; confirmed merged,
  Part III's row updated. Its own further visual retrofit is separately
  in progress by a different session, not by this pass.
- A sitewide right-side nav rail (a new requirement, not on the original
  punch list — see Part VII) — built once, rolled out to every page this
  pass and the previous pass touched, plus Dāsa Sāhitya.
- The persistent bottom-audio-player bug (critique #26 — see Part VIII) —
  fixed sitewide (`dge/index.html`, plus the one legacy page with its own
  copy of the same element).

**Still open:**
- Retrofit the remaining 5 Vyakarana-cluster tool pages
  (chandas/krdanta/rupasiddhi/dhatuforms/prakriya) onto
  `contextual-actions.js`/`reader-state.js` — Dhātu/Śabda (this pass) are
  now the worked pattern: pick a real per-item object (a chandas metre, a
  kṛdanta form, …), a page-scoped object type, a `⋯ More` trigger, actions
  ported CSS already covers (`vyakarana.css` now carries the shared
  `.modal-overlay`/`.ctx-menu-*` block for the whole cluster).
- Retrofit Kavya and Tirtha the same way (their own content shape needs its
  own look at what a real per-item object is there, same as this pass did
  for Dhātu/Śabda rather than assuming Ashtadhyayi's shape fits).
- Guru Parampara's `contextual-actions.js` retrofit stays intentionally
  deferred — `index.html` has no content object to attach one to;
  `tracker.html`'s natural fit is the `person` object type below, not a
  one-off invented for this page alone (see Part III's note).
- Wire `kosha.js` word-tap lookup into the Vyakarana cluster (Ashtadhyayi,
  Dhātu, Śabda all still lack it) — not part of either pass so far.
- Wire `entity-linker.js` into Śabda (Dhātu already has it; Śabda still
  doesn't) — not part of this pass.
- Extend `entity-linker.js`/`dge_entities.json` to resolve *people* (critique
  #12's ವಿಜಯದಾಸರು example), not just citable works — currently Levels 1–2
  (works) only. Guru Parampara's `tracker.html` (215 figures) is the
  clearest real use once this lands — see Part III.
- Extend `contextual-actions.js`'s object-type registry with `person` and
  `textual-reference` once a renderer actually needs person-entity tap
  targets (Dāsa Sāhitya and/or Guru Parampara `tracker.html` are the
  likeliest first real uses).
- Migrate word/phrase-level taps on the Vyakarana cluster from
  `intellisense.js`'s standalone popover onto the shared `contextual-actions.js`
  model, once that can be done without the two systems fighting over the
  same tap (see Part IV's "deliberately not touched" note).
- The Part V product-identity decision (theme naming / sitewide default)
  needs the project lead's actual answer, not another guess.
- Full visual unification of the Vyakarana cluster's own token system
  (`ashtadhyayi.css`/`vyakarana.css`'s `--panel`/`--line`/`--ink`/… ) with
  `main.css`'s (`--card-bg`/`--card-border`/`--text-primary`/…) — both
  passes ported just the classes `contextual-actions.js`'s shared menu
  component needs, scoped locally, not a full merge of the two design
  systems.
- The nav rail (Part VII) is deliberately a self-contained component with
  its own small hardcoded-with-`--accent-red`-fallback palette, independent
  of every page's own token system, for the same reason as the bullet just
  above — full token unification would let it inherit a page's real theme
  instead. Revisit once that unification happens.
- A "tiny affordance" middle state for the bottom player (Part VIII) —
  this pass implemented the two-state version (hidden vs. full compact
  player) the brief's acceptance bar allowed either of; a persistent small
  speaker/play icon when audio is available but not yet played (the second
  reviewer's original three-state framing) is real, scoped follow-up, not
  silently folded into "done."

---

## Part VII — sitewide right-side global nav rail (new this pass)

A new formalized requirement, not from the original critique: every corpus
page needs a persistent way to jump to another corpus/tool without backing
out through the header menu first (project lead's own framing, 28 Aug
2026).

**What already existed to check first, per the project lead's own
instruction not to invent a second mobile pattern:** `dge-shell.js` had no
utility rail at all — its own header comment named one as planned but
unbuilt ("Phase 6... a Kosha/Search utility rail for the Vyakarana/Kavya/
Dasa-Sahitya/Tirtha/Guru-Parampara cluster pages, alongside the breadcrumb
they already do"). `dge/index.html`'s `#dge-qa-tab` is a real, existing
fixed-edge mobile pattern, but a different job entirely (Kosha/Search/Ask
Acharya quick actions, not cross-corpus navigation) and only exists on that
one page — reusing it for corpus-jump navigation would have overloaded one
button with two unrelated purposes on the only page that has it, and left
every other page with nothing. So this is a genuinely new component, built
once, in the same *visual family* as `#dge-qa-tab` (a small fixed tab
docked to the right edge) without being the same element or serving its job.

**Implementation:** `dge/js/dge-nav-rail.js`, a self-contained
`<dge-nav-rail current="...">` custom element (no dependency on
`modals.js`/`main.css`/any page's own token system — see Part VI's note on
why). Links to: DGE Home (`dge/index.html`), Aṣṭādhyāyī, Dhātu, Śabda,
Kāvya, Tīrtha, Guru Paramparā, Dāsa Sāhitya. Hrefs are resolved from the
script's own known location (`dge/js/`), not the including page's path, so
the same two lines of markup work unmodified at any page depth.

**Responsive behavior and breakpoint:** `760px` — the same value
`main.css`/`kavya.css`/`dasa-sahitya.css` already use sitewide for the
mobile/desktop split (confirmed by grepping every `@media` in `dge/css/`;
no separate breakpoint was invented). At `>= 760px`: a fixed vertical rail
docked to the right edge, one row per corpus/tool with an icon glyph +
visible label (never icon-only, per the icon-labeling rule) and
`aria-current="page"` on the current page's row. Below `760px`: the rail
itself is hidden (no room for it without covering content) and replaced by
a small fixed tab in the `#dge-qa-tab` visual family, docked to the right
edge at a different vertical offset (`bottom: calc(230px + …)` vs.
qa-tab's `calc(160px + …)`) so the two never collide on `dge/index.html`,
the one page carrying both. Tapping the tab opens a small link-list sheet
with the same items.

**Rollout this pass:** `dge/index.html`, `dge/vyakarana/ashtadhyayi.html`,
`dge/vyakarana/dhatu.html`, `dge/vyakarana/shabda.html`,
`dge/guru-parampara/index.html`, `dge/guru-parampara/tracker.html`, and
`dge/dasa-sahitya/index.html` (added despite that page's own visual
retrofit being owned by a different session this pass, since it's a
two-line additive change with minimal collision surface — script tag +
one custom element, no shared-file edits beyond this doc; re-fetched
immediately before merging per the coordination note at the top of this
document). **Not** added to Kāvya/Tīrtha or the five not-yet-retrofitted
Vyakarana-cluster pages — the rollout instruction was "every page you
retrofit in this pass, plus Ashtadhyayi," and those five/two were not
retrofitted this pass (see Part VI).

---

## Part VIII — the persistent bottom-audio-player fix (critique #26)

**The bug, confirmed by direct inspection before any fix:** `dge/index.html`
unconditionally rendered `<div class="bottom-player">` (no visibility
logic at all beyond hiding during immersive reading), and `dge/js/audio.js`
had zero references to `reader-state.js`'s `dgeAudioState()` — the
AudioState abstraction (built in the Reader Redesign phase A work, commit
`32b03feb`) existed but was never wired to the actual player element.
`genie.js`'s own `bottomPlayerClearance()` already defensively checked
`getComputedStyle(player).display === 'none'`, i.e. it was written
*expecting* the player to sometimes be hidden — clear evidence the gating
was designed for but never implemented, not merely missed.

**The fix:** `dge/css/main.css`'s `.bottom-player` rule now defaults to
`display: none`; a new `.bottom-player.dge-audio-active` rule is what shows
it. `dge/js/audio.js` gained `dgeUpdateBottomPlayerVisibility()`, which
reads `window.dgeAudioState()` and adds/removes that class based on
`status`. Called from `updatePlayUI()` — already the single UI-sync point
every playback state change (`playing`/`pause`/`ended` events, `playShloka`,
`togglePlay`, `playNextFiltered`/`playPrevFiltered`) already ran through —
plus once at boot for the initial page-load state.

**The exact rule, and why `loaded` is grouped with `idle`:**
`dgeAudioState()`'s `status` is `'idle'` only when nothing has ever been
selected. Merely navigating to/selecting a track (`loadShloka()`, called by
every prev/next, TOC tap, filter jump, and history/snippet select) sets
`activeId` and the audio element's `src`, which makes `status` become
`'loaded'` — *without ever calling `.play()`*. The critique is explicit
that no navigation/selection/search/word-lookup/AI/menu-opening action may
ever show the player, only explicit Play — so `'loaded'` had to be treated
the same as `'idle'` (hidden), not as "something is happening" (shown).
The player becomes visible only once status reaches `'playing'`/
`'buffering'`/`'paused'`/`'completed'`/`'error'` — states that are only
reachable by an actual `currentAudio.play()` call having happened.

**Audited every caller that can reach `playShloka`/`togglePlay` (i.e.
every potential auto-play/auto-show site):** four real call sites exist —
`contextual-actions.js`'s `play` menu action, `core.js`'s quick-jump/search
navigation, `history.js`'s reading-history tap, and `snippets.js`'s saved-
snippet playback — and all four are genuine *explicit* Play actions (the
reader tapped Play on something), not side effects of an unrelated
operation. Every other caller found (`render.js`'s shloka tap, `history.js`'s
TOC tap, `filter.js`'s range/mark-filter jumps — which already carried a
comment saying "do not start audio as a side effect" — `render.js`'s
single-view prev/next, and `core.js`'s page-load `dgeRestoreLastVerse()`)
calls `loadShloka()` only, never `.play()`. None of them touch
`.bottom-player`'s visibility directly at all — the new gating is the only
thing that does, and it only reacts to real state, not to which function
was called.

**Also fixed:** `dge/legacy/PrahladaKrutaNarasimhaStotra.html` — the only
other page found with its own copy of `.bottom-player` (grepped the whole
`dge/` tree). It doesn't load `audio.js`/`reader-state.js` at all (a fully
separate, self-contained legacy implementation predating the shared
systems entirely — already the repo's own documented reason this page is
excluded from `tools/redesign/audit_pages.py`'s vandana-guard check). Given
that existing "out of scope for the redesign" boundary, this pass applied
the same *shape* of fix locally (its own `isPlaying`/`activeId` state,
mirrored inline) rather than pulling the shared systems into a page
explicitly declared out of scope — hidden by default, shown once
`isPlaying` or `currentTime > 0`.

**Not attempted this pass:** the second reviewer's original three-state
framing ("no audio → nothing; audio available → tiny affordance; explicit
play → full player") — the brief's own acceptance bar allowed either that
or the simpler two-state version (hidden vs. full player) this pass built;
a real tiny-affordance middle state is tracked as genuine follow-up in
Part VI, not silently claimed as done.
