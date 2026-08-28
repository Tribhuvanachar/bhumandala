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

| Renderer | dge-shell.js | contextual-actions.js + reader-state.js + modals.js | entity-linker.js | kosha.js | Commentary Navigator / equivalent | Status |
|---|---|---|---|---|---|---|
| `dge/index.html` (main reader — covers most shloka corpora: Stotra, Purāṇa, Vedānta texts, etc. as data, not separate renderer pages) | ✅ | ✅ (this is where all three were first landed) | ✅ | ✅ | N/A (single-shloka reader, not a multi-commentary-layer view) | **Compliant** |
| `dge/vyakarana/ashtadhyayi.html` | ✅ | ✅ **(this pass)** — was the exact page in the critique's screenshots; previously loaded none of the three | ✅ (already had it) | ❌ (word-level Kosha lookup not wired — see Part IV) | ✅ **(this pass, new)** | **Retrofitted this pass** — see below |
| `dge/dasa-sahitya/index.html` | ✅ | **In flight on a separate branch** (`dasa-sahitya-ux-integration`, commit `914a8e4` as of this writing: *"Wire Dasa Sahitya into the shared reader infra: word-tap Kosha, composer sheets, composition contextual menu"*) — **not merged to `main`** as of this pass, and out of scope for this session per the project lead's explicit instruction. Do not assume it is finished; re-check `git log` for this file before relying on the row above. | unknown (branch not reviewed — out of scope) | unknown | unknown | **Being retrofitted by a different session, in progress** |
| `dge/vyakarana/{chandas,shabda,krdanta,rupasiddhi,dhatuforms,dhatu,prakriya}.html` (7 pages — declension/conjugation/derivation tool pages, not commentary readers) | ✅ | ❌ | ❌ | ❌ | N/A (no commentary layers on these pages — different content shape) | **Not started** — follow-up |
| `dge/kavya/index.html` | ✅ | ❌ | ❌ | ❌ | — | **Not started** — follow-up |
| `dge/tirtha/index.html` | ✅ | ❌ | ❌ | ❌ | — | **Not started** — follow-up |
| `dge/guru-parampara/index.html` | ✅ | ❌ | ❌ | ❌ | — | **Not started** — follow-up |

This session's actual scope was **the contract doc plus the Ashtadhyayi/
Vyakarana retrofit** — not a whole-site rewrite. The table above is the
honest state after this pass, not a claim of sitewide compliance.

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

## Part VI — follow-up punch list (not attempted this pass)

- Retrofit the remaining 7 Vyakarana-cluster tool pages
  (chandas/shabda/krdanta/rupasiddhi/dhatuforms/dhatu/prakriya) onto
  `contextual-actions.js`/`reader-state.js` — lower urgency than Ashtadhyayi
  since they're single-tool pages, not multi-commentary readers, but still
  currently outside the contract.
- Retrofit Kavya, Tirtha, and Guru Parampara the same way.
- Re-check `dge/dasa-sahitya/index.html`'s actual landed state once
  `dasa-sahitya-ux-integration` merges to `main`, and update the compliance
  table in Part III accordingly — do not assume today's "in flight" status
  is still accurate by the time this doc is next read.
- Wire `kosha.js` word-tap lookup into the Vyakarana cluster (Ashtadhyayi
  included) — not part of this pass.
- Extend `entity-linker.js`/`dge_entities.json` to resolve *people* (critique
  #12's ವಿಜಯದಾಸರು example), not just citable works — currently Levels 1–2
  (works) only.
- Extend `contextual-actions.js`'s object-type registry with `person` and
  `textual-reference` once a renderer actually needs person-entity tap
  targets (Dāsa Sāhitya is the most likely first real use).
- Migrate word/phrase-level taps on the Vyakarana cluster from
  `intellisense.js`'s standalone popover onto the shared `contextual-actions.js`
  model, once that can be done without the two systems fighting over the
  same tap (see Part IV's "deliberately not touched" note).
- The Part V product-identity decision (theme naming / sitewide default)
  needs the project lead's actual answer, not another guess.
- Full visual unification of the Vyakarana cluster's own token system
  (`ashtadhyayi.css`'s `--panel`/`--line`/`--ink`/… ) with `main.css`'s
  (`--card-bg`/`--card-border`/`--text-primary`/…) — this pass ported just
  the classes `contextual-actions.js`'s shared menu component needs, scoped
  locally, not a full merge of the two design systems.
