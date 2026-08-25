# Gold-Standard commentary — gap analysis and integration plan

_Written 25 Aug 2026, in answer to the project lead's directive: "going
forward all content will be presented in gold standard... we have to render
content/html in similar way. may need schema overhaul for entire library
wherever applicable... analyse and come up with solution."_

Source material: `DGE Gold-Standard Commentary Contract & Universal Sanskrit
Exegetical Framework (v2.2)` (the attached PDF spec), a matching sample
(`extracted_gold_v2_2.json`, a Gītā-Vivṛtti adhyāya), and a matching reference
reader (`gita_viewer.html`) built against that sample. This document compares
all three against DGE's actual current schema and rendering code, and
proposes how to bring the two together **without a flag-day rewrite**.

---

## 1. What Gold-Standard actually specifies

Four points matter most for engineering purposes (the full contract has many
more philological rules — sandhi separation, clitic registries, compound
hyphenation — that are correct as written and don't need re-litigating here):

1. **A layer boundary invariant.** Source (diplomatic text) → Analysis
   (padaccheda/anvaya/word_mappings) → Semantics (evidence classes, dialectic
   pairing) → Presentation (HTML/typography). A transformation permitted at
   one layer must never leak into a lower one — e.g. hyphenation is
   Presentation-only and must never be baked into `mula_sanskrit` or
   `word_mappings` themselves.
2. **A richer per-unit schema**: alongside `mula_sanskrit`, every unit gains
   `mula_metadata` (chandas, speaker_frame), `padaccheda`, `padapatha`,
   `anvaya`, and — the load-bearing new piece — `word_mappings[]`
   (`mula_word`, `pratika`, `gloss`, `basis`) paired with a
   `commentary_markdown` string that uses a small, strict markup dialect:
   - Every commented lemma wrapped `**"..."**` (straight double quotes,
     bold) — and required to be an exact substring match against some
     `word_mappings[i].pratika` (the "Parity Rule").
   - Block directives on their own paragraph: `> [!मङ्गलम्]` (commentator's
     own verse), `> [!प्रमाणम् (cite)]` (quoted canonical authority),
     `> [!फलितार्थः]` (unit-final holistic summary only — not routine
     word-by-word gloss), `*अवतरणिका —*` (context-setting transition).
3. **A presentation contract**: daṇḍas (।/॥) non-breaking-bound to the
   preceding syllable; pratīka spans are the touch target directly (no
   separate `[↩]` button); ≥2.0 line-height, ragged-right on narrow mobile;
   `scroll-margin-top` on every jump target so a sticky header never clips
   it; the reader must be "100% generic, dynamically compiling from JSON
   without per-shloka hardcoded overrides."
4. **CI quality gates (V1–V7)**: source-checksum immutability, pratīka
   regex compliance, mapping parity, zero residual sandhi in padaccheda,
   every objection paired with a resolution (or an explicit `unanswered:`
   flag), zero line-initial daṇḍas under headless render, and no orphan
   citation links.

This is a real, well-specified upgrade over what DGE ingests and renders
today — not a restyle. The gap is genuine and worth closing.

---

## 2. What DGE actually has today

Checked directly against a live file (`dge/data/stotra/PrahladaKrutaNarasimha/data.json`)
and the render path (`dge/js/render.js`), not assumed:

```json
"shlokas": {
  "1": {
    "sa": "श्रीप्रह्राद उवाच |<br>ब्रह्मादयः ... ॥ ८ ॥",
    "commentaries": {
      "padaratnavali": "पदरत्नावली - सत्वे नित्याविर्भूतबलज्ञानसमाहारे ..."
    }
  }
}
```

- **Every commentary is one plain string.** No `padaccheda`, `anvaya`,
  `word_mappings`, `mula_metadata`, no block structure of any kind.
- `render.js`'s `commentaryHtml` pipeline (`render.js:358-393`) does exactly
  one thing to that string: `highlightText(convertedText, pattern)` — literal
  search-term highlighting. No markdown, no pratīka linking, no provenance
  boxes.
- `parseMarkdown()` (`ai.js:176`) — the one markdown parser already in this
  codebase — is real and reused across AI surfaces (Ask Acharya, Kosha), but
  it only handles `#`/`##`/`###` headers, `*`/numbered lists, and inline
  `**bold**`/`*italic*`. **It has no concept of `> [!directive]` blocks,
  pratīka spans, or word-mapping parity** — it was built for free-form
  Gemini chat replies, not a structured philological contract, and reusing
  it as-is for Gold-Standard content would silently drop every block
  directive to a plain blockquote-less paragraph.
- `dgeWrapWordsForTap()` (`render.js`, from this session's earlier
  word-tap-to-select fix) already wraps every mūla word in an invisible
  `<span class="dge-word">` for reliable selection — real, working
  infrastructure, but built for word-lookup tools (Shabda/Dhātu/Kośa), not
  for pratīka↔word-pill bidirectional jumping. Adjacent capability, not the
  same capability.
- `footnote-engine.js` (built this session for Gemini-enrichment citations)
  is architecturally the closest existing precedent: a small, additive,
  pure-function render module (`window.DGEFootnotes.render(...)`) that
  returns `{html, footnotesHtml}` and is a no-op when its data isn't
  present. Not reusable *as* Gold-Standard rendering — it solves a
  different problem (numbered citation footnotes, not commentary
  structuring) — but its **shape** (isolated module, additive, degrades to
  "nothing changes" when data is absent) is exactly the right template.
- **No validation tooling** for any of V1–V7 exists. `tools/validate_data.py`
  checks structural completeness (no empty shlokas, valid slugs, etc.), not
  philological contract compliance.

Net: DGE can display Gold-Standard `mula_sanskrit` today (it's just text),
but everything that makes Gold-Standard *Gold-Standard* — pratīka linking,
word-mapping pills, provenance boxes, parity validation — doesn't exist yet.

---

## 3. Proposed architecture — four pieces, additive throughout

The governing constraint: **~tens of thousands of units already exist as
plain-string commentary.** A schema that requires every one of them to be
rewritten before anything ships is a non-starter. Everything below is
designed so old and new content render correctly side by side, indefinitely,
with no forced migration.

### A. Schema extension (additive, per-commentary)

Keep `shlokas[i].sa` and `shlokas[i].commentaries[cKey]` exactly as they are
today for any commentary that hasn't been upgraded. For a commentary that
*has* been produced/re-processed to the Gold-Standard contract, its value
becomes an object instead of a string:

```json
"commentaries": {
  "padaratnavali": "पदरत्नावली - सत्वे ...",          // unchanged, legacy string
  "vritti": {                                          // new, gold-standard
    "format": "gold_v2_2",
    "commentary_markdown": "*अवतरणिका —* ...",
    "word_mappings": [{ "mula_word": "...", "pratika": "...", "gloss": "...", "basis": "stated" }],
    "padaccheda": ["...", "..."],
    "anvaya": ["...", "..."],
    "relations": [...],
    "quotations": [...],
    "flags": { "has_mangala": true, "has_colophon": false }
  }
}
```

`render.js` branches on `typeof commentary === 'string'` vs `.format ===
'gold_v2_2'` at the point it already iterates `Object.entries(shloka.commentaries)`
— a few lines, not a rewrite, since the tab/selection machinery around it
(commentary chips, tabs, AI badges) is format-agnostic and stays untouched.
`mula_metadata` (chandas, speaker_frame) is likewise an optional addition to
the shloka object, ignored by anything that doesn't look for it.

This is the direct answer to "may need schema overhaul... wherever
applicable": the overhaul is **per-commentary, opt-in, and backward
compatible** — not a single migration that touches the whole library at once.

### B. New renderer module — `dge/js/gold-render.js`

A new file, not a rewrite of `parseMarkdown()` (which stays exactly as-is
for its own job: free-form AI replies). Same shape as `footnote-engine.js`:
pure function in, HTML string out, no side effects, absent data → caller
falls back to the legacy string path automatically.

`window.DGEGoldRender.render(commentaryObj) → html`, doing what
`gita_viewer.html`'s own `parseCommentary()` already proves out, generalized
to the full contract:

- Block split on blank lines; dispatch each block by its leading token:
  `#`/`##` → title banner, `> [!मङ्गलम्]` → commentator-verse card,
  `> [!प्रमाणम् (cite)]` → citation card with a footer chip, `> [!फलितार्थः]`
  → the summary box, `*अवतरणिका —*` → the transition-line style, `---` →
  colophon, default → paragraph.
- Inline: `**"pratika"**` → `<span class="pratika-tag" data-pratika-idx="N">`
  — matched at **ingestion/validation time** against `word_mappings`, not
  render time, so a malformed pair fails the CI gate (Part C) instead of
  silently rendering wrong in production.
- Daṇḍa non-breaking binding on every rendered Sanskrit string in this path.
  **This is a real, independent typography bug worth fixing regardless of
  Gold-Standard adoption** — DGE's current renderer has no equivalent
  binding anywhere, so an orphaned `।`/`॥` at a line wrap is already possible
  on the existing plain-string path today. Worth a small standalone fix
  (`bindDandas()`, one function, applied in `highlightText()`'s output path
  too) independent of everything else in this document.
- Word-mapping pill grid, using DGE's own `.pop-item`/pill CSS language
  (already themed across all 5 existing themes) rather than importing
  `gita_viewer.html`'s own fixed cream/gold palette wholesale — see Part D.
- Compound hyphenation applied only to this function's HTML *output*, never
  written back into `mula_sanskrit`/`word_mappings` — this is the literal
  enforcement of the spec's own Layer 4 boundary invariant.

### C. Ingestion-side validation — `tools/validate_gold_standard.py`

Implements V1–V7 as an offline gate, run against any file where a commentary
carries `format: gold_v2_2`, following this project's own established
discipline of checking real output before trusting a clean pipeline run
(see, e.g., the Shankaracharya-import editorial-text bug this session, which
a naive "did it run without erroring" check would have missed entirely):

- **V2/V3** (pratīka regex + mapping parity) — direct string/regex checks,
  exactly as specified.
- **V4** (zero residual sandhi in padaccheda) — reuse
  `search_toolkit_pkg/normalize.py`'s existing fold tables (already used for
  search normalization) to flag un-split junctions, rather than writing new
  sandhi-detection logic.
- **V5** (dialectic pairing), **V1** (source checksum), **V7** (closed-world
  citation links) — straightforward structural checks against the JSON.
- **V6** (zero line-initial daṇḍas) — a headless Playwright render check at
  a few mobile widths, matching this session's own verification convention
  (every UI fix this session was checked live in headless Chromium, not
  just code-read).

This is the piece that actually *enforces* "gold standard" rather than just
naming it — without it, a future Gemini-assisted import could produce
content that looks right in the sample but silently violates the contract,
the same class of bug the resilience/parity test suites built earlier this
session exist to catch in the search pipeline.

### D. This is a Layout, not a Theme — and where it lives

**Correction from this document's first draft**, made in direct conversation
with the project lead, worth stating precisely since it changes the
mechanism: rendering Gold-Standard content is a **Layout** question, not a
**Theme** question, and the two are not interchangeable in this codebase.

- **Theme = look only.** Color, font, spacing, shadow, decorative
  treatment — CSS custom properties repainted over an *unchanged* DOM. DGE's
  5 existing themes (Vandana/Traditional/Minimal/Vibrant/Dark Glass) are
  exactly this: same card, same fields, same order, different paint.
  Switching a theme never adds, removes, or reorders content.
- **Layout = structure.** What content blocks exist, what order they're in,
  what's shown vs. hidden, how they're arranged. This changes what actually
  renders. DGE already has two real examples: **Scholar vs. App** (hides/
  reveals commentary, changes density — though it also nudges padding/
  shadow, which blurs slightly into theme territory, an honest blur worth
  naming rather than papering over) and the **Library's Folder view vs.
  List view** (same taxonomy data, structurally different traversal).

Gold-Standard rendering is unambiguously the second kind. It introduces
content that does not exist in DGE's current renderer at all — a
word-mapping pill grid, provenance boxes (मङ्गलम्/प्रमाणम्/फलितार्थः),
bidirectional pratīka↔pill linking — new structure, not new paint. Calling it
"a 6th theme" (this document's original framing) undersold that and would
have led to the wrong mechanism: bolting it onto the theme system would try
to reskin a DOM shape that doesn't exist yet, instead of building the DOM
shape.

**One real difference from every other Layout DGE has**: Scholar/App and
Folder/List are free choices, always available, independent of the content
underneath. A Gold-Standard rendering mode can only activate where the
underlying commentary actually *has* the structured data — a legacy
plain-string commentary has no `word_mappings` to build pills from, no
`commentary_markdown` to parse blocks out of. So this isn't a peer toggle
sitting in the Display sheet next to Scholar/App; it's a **capability gated
per-commentary by `format: gold_v2_2` being present**, with its own display
preference only once that gate is open.

**Separate page, or restructure in place?** Both are feasible; only one
reuses what already works. A separate page (like the reference
`gita_viewer.html`, or how `ashtadhyayi.html` sits apart from `index.html`)
means its own URL, its own JS/CSS, and none of the main reader's existing
machinery — no audio player, no notes/snippets, no search deep-linking, no
immersive mode, no admin tools — all of which would need rebuilding a second
time or going without. Restructuring in place means `render.js`'s existing
card-building function grows a branch: when a commentary is `gold_v2_2`, it
emits the richer HTML (pills, provenance boxes, pratīka spans) inside the
*same* shloka card, instead of the plain-string block — mechanically the
same pattern Scholar/App already uses (one function, a class or a per-shloka
branch, CSS/JS respond to it). Recommended: **in place, inside `index.html`,
via `render.js` + the new `gold-render.js` module** — the same reasoning
that led the Ashtadhyayi declutter to reuse the app's own drawer system
rather than invent one: one reader stays one reader, and richer content
shouldn't cost the plumbing already built around it.

### D.1 The Gold-Standard badge — telling the reader, and giving them the switch

Direct ask from the project lead: readers need a visible signal — "some
badge... some ribbon, some wrapper, gold wrapper, like some things which are
wrapped on a certificate" — that (a) this particular commentary is the rich,
verified format, and (b) the richer view can be switched into. Legacy
plain-string commentary carries no badge at all, since it isn't Gold-Standard
and shouldn't claim to be.

Two distinct visual elements, not one, doing two different jobs:

1. **A small badge/chip, always present when `format: gold_v2_2`.** Sits
   next to the commentary's title, reusing the exact size/shape/placement
   convention `render.js` already established for the "AI"
   badge (`.dge-ai-badge`, next to `.commentary-title` — see
   `render.js:379-380`) rather than inventing a new visual language. Gold
   gradient/border instead of the AI badge's neutral gray, a seal-like glyph
   (e.g. 🏅 or a laurel) instead of the letters "AI", tooltip text explaining
   what it certifies ("Gold-Standard: word-by-word mapping, structured
   citations, verified pratīka links"). Reuses the same pattern DGE already
   trusts for exactly this kind of at-a-glance provenance marker.
   **This badge is not decorative — it is the switch.** Tapping it is how a
   reader moves from the plain-render fallback into the richer Gold-Standard
   layout for that commentary, the same way `dgeShowCommentaryTab()` already
   switches which commentary block is visible. No separate settings screen
   needed to discover that a richer view exists — the badge on the content
   itself is the entry point, exactly matching "so that the user knows that
   the content is rich and the view can be switched."
2. **A certificate-style wrapper, applied only once the Gold-Standard layout
   is actually active.** When a reader is inside the rich view, the
   commentary block itself gets the distinct bordered "certificate" framing
   the project lead described — a gold double-rule border, a seal motif in
   a corner, echoing the reference sample's own `.vivruti-container`
   treatment (`border: 1.5px solid var(--border-ornate)`, a top seal row)
   but built from DGE's own theme-aware custom properties (`--accent-gold`
   or a new `--gold-standard-border` token defined per-theme, not one fixed
   hex value) so it still looks correct across all 5 existing themes and
   both dark/light. This is the visual confirmation, once switched, that
   "yes, this is the certified rendering" — the wrapper the project lead
   asked for, scoped to only appear where it's earned.

Both elements key off the same signal (`commentaries[cKey].format ===
'gold_v2_2'`) and both disappear automatically for legacy content — no
separate flag to maintain, no risk of a legacy commentary accidentally
looking "certified."

---

## 4. Migration scope, stated plainly

**Not** a rewrite of the existing corpus. Concretely:

- New imports and re-processed corpora target `gold_v2_2` directly from the
  start, validated by Part C before merge.
- Existing plain-string commentary keeps rendering exactly as it does today,
  indefinitely — nothing breaks, nothing needs to change, on day one or ever,
  for content nobody chooses to upgrade.
- A deliberate, one-corpus-at-a-time backfill (Gemini-assisted padaccheda /
  word_mappings / pratīka-tagging of already-ingested plain-string
  commentary) is the honest path to widening Gold-Standard coverage over
  time — each pass verified against its real source before shipping, same
  standard as every import this session. Not attempted in this document;
  this is analysis and a build plan, not the backfill itself.

---

## 5. What this document does NOT do

Per the project lead's own instruction ("analyse and come up with
solution"), nothing above has been built yet. The mechanism question (Layout
in `render.js`, in place, not a separate page or a theme — Part D) and the
badge/certificate-wrapper design (Part D.1) are now settled by direct
conversation with the project lead; what's still open is purely build order:

1. Build `gold-render.js` + the schema extension (Part A+B) — a scoped,
   independently shippable unit; the attached `extracted_gold_v2_2.json`
   (Gītā Vivṛtti, Adhyāya 2) is a ready-made real test case, not a synthetic
   one. The badge (D.1.1) and certificate wrapper (D.1.2) are built as part
   of this same unit, not deferred — they're the switch and the confirmation
   for the layout, not a separate feature.
2. Build `tools/validate_gold_standard.py` (Part C).
3. Pick the first real corpus for an end-to-end pilot before any wider
   backfill commitment.
