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
| `dge/dasa-sahitya/index.html` | ✅ | ✅ (landed with `914a8e4`, merged to `main`) | ✅ (`dgeScanForEntities` over the list) | ✅ (word-tap, wired with the reader infra) | N/A (no multi-layer/multi-commentary content here — composer and script are page-level filters, not a "several things available, some displayed" pattern; audited directly, not assumed absent) | **Retrofitted (this pass)** — see below |
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

## Part IV-B — the Dāsa Sāhitya retrofit, what changed (29 Aug 2026)

`914a8e4` (merged to `main` before this pass) had already wired Dāsa Sāhitya
into the shared *functional* reader infra — word-tap Kosha, the composer
profile sheet, the composition contextual menu — but was explicitly told not
to also attempt the *visual* retrofit that session, to avoid two sessions
editing the same page's look at once while a separate session did the same
pass for Ashtadhyayi. That left exactly the gap this section closes: the
functional pieces already looked like DGE (they used `--card-bg`/
`--text-primary`/`--accent-red` directly), but the rest of the page — header,
cards, chips, stats, the composer sidebar — rendered off a bespoke
`--bg`/`--panel`/`--ink`/... palette this file defined itself, so the page
read as a visually distinct island next to the retrofitted Ashtadhyayi page.
Confirmed directly by reading `dasa-sahitya.css`'s own `:root` block, not
assumed from the earlier session's commit message.

`dge/css/dasa-sahitya.css`:

1. **Bespoke `:root` palette replaced with a bridge onto `tokens.css`**,
   the exact technique `tokens-vyakarana-bridge.css` already used for the
   Vyakarana cluster (Part I §7): the page's own local names
   (`--bg`/`--panel`/`--ink`/`--muted`/`--line`/`--accent`/`--accent2`/
   `--chip`/`--shadow`) are kept — so the rest of the file's rules barely
   changed — but now alias `--bg-main`/`--panel-bg`/`--text-primary`/
   `--muted-text`/`--card-border`/`--accent-red`/`--accent-gold`/
   `--card-active`/`--shadow-sm` instead of holding their own hex values.
   The `@media(prefers-color-scheme:dark)` override is gone with it —
   `tokens.css`'s bare `:root` (Vandana) is already the dark-first sitewide
   default every other un-themed page gets (neither this page nor
   Ashtadhyayi loads `theme-guard.js`), so this is the same identity, not a
   new one. `--ok`/`--warn` (the composer-list loaded/error dot) aren't in
   `tokens.css`'s vocabulary and stay as page-local extras, same as
   Ashtadhyayi keeps its own `--k`/`--b`/`--t`/etc layer-tag colors beside
   its bridge.
2. **Type/card hierarchy**: the page title grew from a flat `1.35rem` to a
   `clamp(1.3rem,4vw,1.7rem)`/700-weight scale that actually outweighs a
   card's own title beneath it; a composition card's title grew from
   `1rem`/600 to `1.08rem`/700; `.card` itself moved from
   `border-radius:12px`/`box-shadow:var(--shadow)` (identical presence to
   a `.stat` chip) to `var(--radius)`(16px, matching Ashtadhyayi's
   `.dge-card`)/`var(--shadow-md)`, with a subtle border-color hover — a
   card now reads as a genuine unit of content, not a slightly-rounded row
   in a list.
3. **Component-shape audit** (contract Part II §4): checked every
   pill-shaped element on the page against the shape rule. `.chip` (the
   Pada/Suladi/Ugabhoga/... form filter row) and `.badge.form` (each card's
   own content-type tag) are both real tags/filters — the shapes the rule
   says a chip/pill is *for* — not a disguised "toggle a whole section"
   control. No pill-misuse found; nothing changed here.
4. **Commentary-Navigator-equivalent: audited, does not apply.** The
   pattern exists for "several layers of the same content, some displayed,
   some not" (Ashtadhyayi's commentaries). Dāsa Sāhitya has no analogous
   content shape — composer and script are page-level filters over which
   *compositions* show, not toggleable layers of one composition — so
   forcing the pattern here would fit nothing real. Confirmed by reading
   the page's actual data model (`state.author`/`state.script` in the
   page's own script), not assumed absent.
5. **The already-functional pieces** (composer sheet, word-tap Kosha,
   composition contextual menu) needed no change — they were already
   written against `tokens.css`'s real vocabulary directly. They now visibly
   belong to the same page as everything else around them, because that
   surrounding chrome resolves to the same underlying values for the first
   time.

---

## Part IV-C — real taxonomy breadcrumbs (29 Aug 2026)

A separate session's `5a5e4b73` had added a lineage strip to standalone
tika pages (`layer-stitch.js`'s `dgeRenderStitchChrome`) but rendered the
taxonomy ancestors above the grantha itself (darshana, vedanta, dvaita, ...)
as plain `<span class="lineage-node">` — real signal, shown, but dead weight
to tap. Investigated `dge/js/dge-breadcrumb.js` first to decide honestly
whether it was fit to extend for this: it is a **page-header brand
breadcrumb** (`⌂ DGE › Parent › Leaf`, one instance per page) whose
`connectedCallback()` already leaves any pre-built child markup untouched —
which is exactly how both its only two adopters (Ashtadhyayi, Dāsa Sāhitya)
use it today, not through its dynamic attribute path. That shape does not
fit a *repeated, per-row* taxonomy chain (many search hits, one lineage
strip) — instantiating the custom element per row for a different visual
context would be the wrong tool, not a gap in this one. **Conclusion: no
change to `dge-breadcrumb.js` itself** — its own escape hatch already
supports arbitrary-depth chains for the one shape it's actually used for
(see the Ashtadhyayi header change below), and the per-row/per-strip case
is served by existing `.lineage-link`/`.lineage-node` markup instead, not a
second breadcrumb mechanism invented alongside it.

What actually changed:

1. **`library.js`**: `dgeRenderLibraryCategoryView` (previously a single
   top-level key lookup, reached only by tapping a Library grid tile) now
   walks an arbitrary slash-path through `dgeLibTree`, and renders a real
   multi-segment breadcrumb (each ancestor a link to that level, the
   deepest a plain "you are here" label) inside the Library modal itself.
   New `window.dgeOpenLibraryToPath(path)` opens the modal and drills to a
   node directly — the honest target for an ancestor *category* segment,
   which has no `data.json` of its own to open as a reader page.
2. **`core.js`**: a new `?libraryPath=<path>` URL param (parsed alongside
   the existing `?path=`/`?jumpShloka=`) calls
   `dgeOpenLibraryToPath` once the grantha data load finishes — the cross-
   page entry point every fix below actually links to.
3. **`layer-stitch.js`**: the tika lineage strip's ancestor segments are now
   real `<a class="lineage-link" href="index.html?libraryPath=...">`
   elements, one cumulative path per segment. The chain's own final grantha
   link (already real) and the `DGE_GRANTHA_LINEAGE`-driven mula/mula
   branch (already real `<a>`s, or an honest non-link where no page exists
   at all — a spine's own sutra text has nothing to link to) were already
   correct and untouched.
4. **`global-search.js`**: every result row now shows its real taxonomy
   path (`h.grantha`, not just title/category/score) as a `.dge-gs-crumbs`
   row of the same kind of real links, ending at a plain current-item
   label. Guarded in the row's own click handler (same pattern as the
   existing sūtra-reference exclusion) so a crumb's native `<a>` navigation
   doesn't race the row's own click-to-open behavior.
5. **`dge/vyakarana/ashtadhyayi.html`**: verified, not assumed — its
   existing breadcrumb *was* genuinely functional (a real `<a>` to Home),
   just shallow (Home → leaf, skipping the real `vedanga/vyakarana`
   ancestors). Extended to the full chain (Home › वेदाङ्गानि › व्याकरणम् ›
   अष्टाध्यायी), each ancestor linking to `?libraryPath=`, using the same
   pre-built-children markup the component already supported.
6. **`dge/dasa-sahitya/index.html`**: verified — already a complete,
   correct, functional 2-level chain (Home › Dāsa Sāhitya). `dasa_sahitya`
   is itself a top-level taxonomy root (confirmed against `dge/data/`'s own
   directory layout), so there is no missing ancestor level to add here;
   left structurally as-is, restyled by the Part IV-B pass above.

---

## Part IV-D — Kosha sutra-backlink coverage audit (29 Aug 2026)

The claim on record was "in the Kosha search, all sutras must be
backlinked." The mechanism (`window.dgeScanForSutras`, wired into
`kosha.js`'s `openEntry()`) was real and already running — but coverage was
not verified before this pass. Two real gaps found by tracing the actual
code, not by re-confirming the mechanism exists and stopping there:

1. **Async AI/translation content was never scanned.** `openEntry()`'s
   `draw()` scans the detail pane once, at initial render. Its "→ English"
   translate button and per-dictionary "Ask AI" quick actions both inject
   their result into the DOM later, in a `.then()` callback — after that one
   scan already ran. A sutra citation inside a *generated* answer (exactly
   where a citation like "as per 1.1.1" is likely to appear) never got the
   tappable treatment. Fixed: both callbacks now call `dgeScanForSutras`
   (and `dgeScanForEntities`) on their own newly-inserted element directly.
2. **Genuine citations were under-linked by the page-context gate.**
   `intellisense.js`'s `shouldLink()` only links a bare "N.N.N" unconditionally
   on pages under `vedanga/vyakarana` (Ashtadhyayi); everywhere else it
   requires a cue word (सूत्र/पाणिनि/...) within 24 characters. Kosha's detail
   view runs on top of *whatever page the reader opened it from* — reading a
   Purāṇa and opening Kosha meant `currentGranthaSlug` was the Purāṇa's, not
   "grammar," so a bare sutra number in a gloss with no nearby cue word
   never linked, even though a kosha gloss is grammar-dictionary content
   almost by definition. Fixed with a new optional `dgeScanForSutras(root,
   {always:true})` mode (backward compatible — every existing caller is
   unaffected) that Kosha's own detail scan (and its async-content fix
   above) now passes.

3. **Dāsa Sāhitya's own Kosha never scanned for sutras at all.**
   `kosha.js`'s `dgeScanForSutras` call is already guarded (`typeof
   window.dgeScanForSutras === 'function'`) precisely because not every page
   that loads `kosha.js` also loads `intellisense.js` -- and
   `dge/dasa-sahitya/index.html` (the page most central to this whole pass)
   turned out to be exactly such a page: its own script list wires
   `modals.js`/`kosha.js`/`contextual-actions.js`/`entity-linker.js`
   carefully but never `intellisense.js`, confirmed by reading the file, not
   assumed from the mechanism existing elsewhere. Every word-tap Kosha
   lookup opened from Dāsa Sāhitya has been silently missing this feature
   entirely, independent of the two gaps above. Fixed by adding the one
   script tag -- `intellisense.js` is self-contained (fetches its own sutra
   index relative to its own script `src`), so this cost nothing else on the
   page.

Verified live (Playwright), not just read: opening the Aṣṭādhyāyī reader,
tapping a real `1.1.1` sūtra reference in its rendered commentary resolves
a real popover (मूल text, पदच्छेदः, अन्वयः, English gloss) through this exact
code path -- confirming the underlying mechanism (shared by Kosha) is sound.
The digitized kosha shards actually shipped in this repo (checked
`apte-1957`/`mw-cologne`/`benfey`/`macdonell` directly, not by inspection of
one) do not currently contain a bare `N.N.N` citation with no cue word
nearby, so gap #2 above has no live organic example to screenshot today --
real per the code (`shouldLink()`'s gating is exactly as described), latent
per the current data, and verified instead with a realistic constructed
gloss through the real `dgeScanForSutras`/popover code path end-to-end.

Not touched: the *name*-based identification path (`dgeIdentifySutra`,
"typing a rule's name finds it") is wired only to the search-box hint, by
original design (see Part I §5's neighboring note) — extending it to scan
arbitrary rendered content is a materially different, larger feature
(fuzzy name matching over free text, not a numeric-pattern scan) and was
out of scope for a coverage *audit* of the existing numeric mechanism.

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

- **Retrofit the remaining 7 Vyakarana-cluster tool pages**
  (chandas/shabda/krdanta/rupasiddhi/dhatuforms/dhatu/prakriya) onto
  `contextual-actions.js`/`reader-state.js` — lower urgency than Ashtadhyayi
  since they're single-tool pages, not multi-commentary readers, but still
  currently outside the contract.
- **Retrofit Kavya, Tirtha, and Guru Parampara** the same way (visual
  token-adoption + functional taxonomy breadcrumb both still open on all
  three — this pass covered Ashtadhyayi and Dāsa Sāhitya only, per its own
  explicit scope).
- **Note for whoever reads this table next, so it isn't re-litigated**:
  Purāṇa, Stotra, Brahmasūtra, and the other Vedānta-prasthāna texts are
  *not* separate renderer pages — they're data rendered by `dge/index.html`
  (already ✅ Compliant, Part III), the same way Dāsa Sāhitya's own
  compositions are rendered by its one page. There is no separate
  Purāṇa-renderer or Stotra-renderer file to retrofit; the real remaining
  work is exactly the pages/clusters named in this list.
- **Extend the real taxonomy breadcrumb work (Part IV-C) to the same three
  clusters** (Kavya/Tirtha/Guru-Parampara) and the 7 Vyakarana tool pages —
  this pass only reached Ashtadhyayi, Dāsa Sāhitya, the tika lineage strip,
  and global corpus search. `dge-search.js`'s own (non-global) search
  surface, if any page still uses it standalone, was not audited for the
  same crumb treatment.
- **A composer/person-entity Commentary-Navigator-style pattern may become
  real** if `entity-linker.js` is later extended to resolve people (see the
  existing punch-list item below) — Dāsa Sāhitya's composer sheet could
  then plausibly grow a "which of this composer's other works are
  loaded/available" list. Not built speculatively this pass since the
  underlying person-resolution data doesn't exist yet — see Part IV-B §4's
  audit for why forcing the pattern today would fit nothing real.
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
