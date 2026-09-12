# Multi-layer grantha reading — DvaitaVedanta commentary stitching

_Written 25 Aug 2026, in answer to the directive: "audit + fix the reader UI,
starting with Nyaya Sudha — opening a DvaitaVedanta grantha today shows ONE
layer with no tabs to its siblings or its own mula."_

Everything below was checked directly against the data on disk, the reader
code, and live pages on dvaitavedanta.in this session — file paths and
numbers are cited so the next session doesn't have to re-derive them.

---

## 1. Current state (verified, not assumed)

**How the corpus is filed.** Every DvaitaVedanta grantha is a directory of
layer folders: exactly one `mula/` plus zero or more `tika_<name>/`, each
holding its own complete `data.json` and registered as its own separate
`library.json` entry (675 entries under `darshana/vedanta/dvaita/
DvaitaVedanta/`). 40 of the 56 granthas have more than one layer folder;
`nyaya_sudha` has 44, `brahma_sutra_bhashya` 26. There are only two folder
name shapes corpus-wide: `mula` and `tika_*` (counted: 56 + 619).

**How the reader loads.** `dge/js/core.js` fetches exactly ONE `data.json`
per page view and `dgeNormalizeGranthaData()` builds `commentaries{}` only
from a per-item `item.commentaries{}` object **inside that same file**. The
importer (`tools/dvaitavedanta/import_dvaitavedanta.py`) never writes that
object — so every DvaitaVedanta layer renders as an isolated "grantha" and
the multi-commentary tab UI (`render.js`'s `dge-commentary-tabs`, the same
one a stotra with sayana+wilson uses) never fires. Confirmed at code level.

**The join key already exists.** Within one grantha, every layer's items
share the same `DV_<article_id>` ids as the mula item for the same source
leaf. Measured on `nyaya_sudha`: `tika_sudha`'s 1,574 ids are a strict
subset of `mula`'s 1,650; `tika_parimala`'s 1,452 likewise; zero orphans.
The data isn't missing — the reader just never stitches it.

**What "mula" actually holds — the "reference instead of text" symptom.**
For 54 of 56 granthas, ≥99% of mula items have `sanskrit_text` identical to
`unit_title` — i.e. the mula layer is the site's **leaf heading**, often a
truncated pratīka ending in `..` (`nyaya_sudha`: "नारायणं
निखिलपूर्णगुणैकदेहं.."; `tattva_viveka`: 146 of 155 items truncated).
Checked against the live site (pages fetched this session, e.g.
`category-details/4879/...` and `category-details/5815/...`): **the live
site's own `<h2 class="shloka">` is the same truncated pratīka** — the full
mula verse does not exist anywhere on those pages. So this is not a crawl
bug to "fix" by re-fetching; it is the site's own design: the leaf heading
is a pratīka *anchor*, and the real content of the page is the commentary
layers below it. The two honest exceptions, where mula holds real text:
`anuvyakhyana` (folded to real verses last session, median 535 chars) and
`gita_bhashya` (full Gītā verses, median 91 chars); `pramana_paddhati` and
`dvaita_dyumani` are partial.

The reader-level consequence today: opening "श्रीमन्न्यायसुधा — mula" shows
1,650 bare heading fragments and none of the 9 real commentary layers
sitting in sibling folders — which is exactly the reported symptom.

**BUT the pratīka is not the whole story — the importer also drops real
text the site does carry.** Live-compared one sample leaf per section (all
8 sections, cached under the session scratchpad as `cmp_<section>_<grantha>.html`):
on 6 of the 8 pages, the `.details` block opens with a *preamble* before
the first `<h3>` — marked up as `<h1>`/inner-`<h2>` blocks — containing
the FULL mula verse (with daṇḍas and verse numbers) and, on
bhāṣya-granthas, **Madhva's own bhāṣya** under a `भाष्यम्` heading.
`dv_parse.py`'s `_layers_from_article()` reads only `h2.shloka` + `<h3>`
blocks, so this preamble is silently dropped whenever `<h3>`s exist. Two
distinct verified losses:

- `gita_prasthana/gita_bhashya` (article2748): preamble holds "भाष्यम् —
  देवं नारायणं नत्वा…" — Madhva's Gītā-bhāṣya itself. DGE has 9 tika
  folders and **no bhāṣya layer at all**: the grantha named गीताभाष्यम्
  carries everything except the bhāṣya. Same shape on
  `kathopanishad_bhashya` (full mantra under `उपनिषत्` + `भाष्यम्` text,
  both absent from DGE), and presumably the other upaniṣad bhāṣyas.
- `later_acharyas/nyayamrita` (article13957): preamble holds the full
  maṅgala verses ॥१॥–॥६॥; DGE mula holds one truncated line. Same on
  `bhagavata_tatparya_nirnaya` and `vishnu_tattva_vinirnaya` (full verse
  with ॥१॥ sits under a `मूल` heading in the preamble).

And on pages with NO `<h3>` at all, the fallback branch captures nothing:
`_text_between(shloka, None, details)` starts walking at the `<h2>` and
breaks on the first node outside `.details` — which is the very first
node it meets, since the content is *inside* `.details`, after it. So
`sruti_prasthana/rig_bhashya` (whole leaves of maṅgala verses + bhāṣya,
2,856 chars on the sampled leaf) and
`itihasa_prasthana/mahabharata_tatparya_nirnaya` ingested only pratīkas.
This — not the pratīka-as-heading design — is the deeper form of the
"reference instead of text" symptom: the text exists on the live page and
was dropped at parse time. Importer fix + re-crawl tracked in §6/PENDING;
it is independent of (and complementary to) the reader stitching below.

**What the live site shows on one leaf** (same `category-details` page):
the pratīka as `<h2>`, a section heading (e.g. "नम्यत्वप्रयोजकधर्मपरतया
व्याख्यानम्"), then each commentary as an `<h3>`-titled block, with a row of
tag-pills (सुधा · वाक्यार्थचन्द्रिका · परिमळ · यादुपत्यम् ·
श्रीनिवासतीर्थीया · वाक्यार्थरत्नमाला) linking to them. That pill row is
precisely DGE's existing per-card commentary tab bar.

**Structure metadata is already captured per item.** Every item carries
`breadcrumb: [grantha, layer, adhyāya, pāda, adhikaraṇa, section, unit]`
(1,612 of nyaya_sudha's 1,650 mula items have the full 7 levels). Nothing
about adhikaraṇa navigation requires new crawling.

**Known dirt the design must tolerate** (all task-tracked in `PENDING.md`,
none fixed here): `bhedojjivana` has 217 layer folders, `karmavijaya` 57,
`candrikamandanam` 88 — most are the mis-split heading-as-layer bug, so the
layer list for a grantha can contain junk one-item "layers"; some tika
folders carry garbage `default_author` strings (body text); `nyaya_sudha`'s
~24 `tika_<adhikaraṇam>` one-item folders are genuinely Jayatīrtha's own
sectioned commentary (NOT the Anuvyākhyāna fold bug — do not refold).

---

## 2. The decision: load-time stitching, not data restructure

Two candidate fixes were named in the handoff; both were sized against the
real data before choosing.

**(a) Restructure at rest** — merge each `tika_*/data.json` into the mula
file as `item.commentaries{key}` (the corpus's established per-item shape,
and the Gold-Standard doc's additive precedent). Rejected, for measured
reasons:

- **Size.** `nyaya_sudha`'s layers total ~42 MB (`tika_vakyartharatnamala`
  alone is 9.7 MB). One merged `data.json` of ~40 MB is unusable on the
  static-file GitHub Pages reader this app is (`core.js` already calls a
  2 MB Rigveda maṇḍala "large"). Per-layer files are the natural lazy-load
  unit and the restructure would destroy exactly that.
- **It bakes today's dirt in.** Folding 619 tika folders — including
  bhedojjivana's 217 mostly-fake ones — into mula files would have to be
  undone folder-by-folder when the heading-classifier fixes land. A wrong
  restructuring choice here is expensive to undo across dozens of folders;
  a wrong JS choice is one revert.
- **It fights the importer.** Every re-crawl regenerates per-layer files;
  the merge would have to re-run after every crawl forever, or the importer
  rewritten now, mid-cleanup.

**(b) Load-time stitching in the reader** — chosen. The library catalog
(`library.json`), already fetched on every page load, is the manifest: all
sibling layers of a grantha are recognizable from their paths alone
(`<grantha>/mula`, `<grantha>/tika_*`). The reader can therefore know every
available commentary **without fetching a byte of them**, list them in the
existing commentary picker/tab UI, and fetch+merge a layer's `data.json` by
id only when the reader actually turns it on.

- Initial load stays one file (nyaya_sudha mula: 2.6 MB).
- Zero data rewritten; re-crawls and the pending layer-name cleanups keep
  working; junk layers disappear from the picker the moment their folders
  are cleaned, with no second migration.
- Works uniformly for all 40 multi-layer granthas across all 8 sections on
  day one — nothing per-grantha to backfill.
- The Gold-Standard additive `commentaries{}` path is untouched: a curated
  gold commentary embedded in a data.json still renders exactly as before;
  stitched layers just append alongside via the same normalized shape.

Tradeoff stated plainly: stitching adds runtime complexity (async fetch on
commentary-toggle, id-keyed merge, a re-render) and the coupling now lives
in JS convention ("sibling folders share ids") rather than in the data
file. That convention is real and verified today, and `verify_extract.py`
already warns on tika items with no matching mula id, so it is guarded at
import time, not just assumed at read time.

## 3. How the stitcher works (dge/js/layer-stitch.js)

1. **Detect.** After the catalog resolves, if the current slug's last
   segment is `mula` or `tika_*`, collect all populated catalog entries
   under the same grantha directory. If ≥2 layers exist, this is a
   multi-layer grantha.
2. **Advertise.** `metadata.availableCommentaries` gains one key per
   sibling layer (key = folder name minus `tika_`, label = the layer's
   display name + author from its catalog title / `_meta`), each marked
   internally as `pending` — no fetch yet.
3. **Fetch on demand.** When a stitched key is toggled on (commentary
   picker, tab, or "All"), fetch that layer's `data.json` once, then merge:
   for each layer item, find the spine item with the same id (exact match
   first, then the `-N` collision-suffix-stripped base id) and set
   `shlokas[n].commentaries[key]`. The layer-name first line each tika item
   repeats (e.g. "परिमळ\n…") is dropped at merge time — the tab already
   says it. Unmatched items are counted and logged, never invented an
   anchor. Then re-render.
4. **Spine = mula.** Opening a `tika_*` entry directly still works
   standalone (unchanged), but the drawer presents one entry per grantha
   (see §4), pointing at the mula spine.

## 4. Navigation model

- **Library drawer: one leaf per grantha.** A tree node whose leaves are
  exactly `mula` + `tika_*` collapses to a single leaf labeled with the
  grantha's own title, opening the mula spine. 44 sibling rows under
  `nyaya_sudha` stop masquerading as unrelated works. (Display-level fold
  in `library.js` only — `library.json` itself keeps every entry, and admin
  surfaces keep seeing the real folders.)
- **Top of the reader: lineage strip.** A small curated map (in
  `dge/js/config.js`, `DGE_GRANTHA_LINEAGE`) records what a grantha
  comments on: `nyaya_sudha` → `sutra_prasthana/anuvyakhyana` →
  (ब्रह्मसूत्राणि, whose sūtra-spine lives in
  `sutra_prasthana/brahma_sutra_bhashya`). Rendered as tappable ancestry
  above the title: ब्रह्मसूत्र → अनुव्याख्यानम् → न्यायसुधा. Curated
  because the data holds no machine link between granthas — see "what was
  deliberately not built" below.
- **Per card: pratīka heading + tabs.** The card's main text is the mula
  spine text (the pratīka for most of this corpus — same as the live
  site's own `<h2>`); its breadcrumb tail (adhyāya · pāda · adhikaraṇa ·
  section) shows as a small reference line via the existing `vedicId`
  field; commentaries render below through the existing tab bar exactly as
  a stotra's sayana/wilson do.
- **Sidebar: adhikaraṇa navigation.** The in-file section navigator groups
  the spine by `breadcrumb` levels (adhyāya → pāda → adhikaraṇa), jumping
  to the first card of the chosen section — the "which adhikaraṇa am I in,
  take me to the next one" question the breadcrumbs already answer.

## 5. What was deliberately NOT built (and why)

- **Auto-inlining the Anuvyākhyāna verse (and Brahma Sūtra) into each
  Nyāya Sudhā card.** The only machine link would be matching the spine's
  truncated pratīka against `anuvyakhyana/mula` text. Measured: 928 of
  1,650 pratīkas (56%) find an exact normalized-prefix match; the rest
  differ by real textual variance (e.g. the sudhā pratīka reads "नारायणं
  निखिलपूर्णगुणैकदेहं.." where the anuvyākhyāna verse reads "नारायणं
  निखिलगुणैकदेहं…"). Auto-stitching at 56% precision would silently show
  the wrong verse under a scholar's nose — against PROJECT_BRIEF's
  don't-fabricate rule. The right future shape is a verified concordance
  (adhikaraṇa-level, human- or pipeline-checked like the
  reference-resolution tiers), tracked in PENDING.md.
- **Refolding `nyaya_sudha`'s `tika_<adhikaraṇam>` one-item folders.**
  Genuinely separate sectioned commentary (see PENDING 25 Aug) — they
  simply appear as more tabs where their ids match the spine.
- **Any importer/data change.** The stitcher is read-side only; the layer
  hygiene bugs stay tracked where they are.

## 6. Importer follow-up (found by this audit, not fixed by the stitcher)

`dv_parse.py` needs two parsing fixes before the next crawl, both verified
against live pages this session (§1):

1. **Capture the `.details` preamble.** Everything between the start of
   `.details` and the first `<h3>` is real content: structural headings,
   the full mula verse (usually under an `<h1>` run or a `मूल` heading),
   and on bhāṣya-granthas Madhva's bhāṣya under an inner-`<h2>` `भाष्यम्`
   heading. Parse it with the same heading-delimited logic as the `<h3>`
   pass (treating `<h1>`/inner-`<h2>` bold headings as layer boundaries):
   `उपनिषत्`/`मूल`/`मूलम्`-titled blocks belong to the mula layer (full
   text replacing the pratīka-only `h2.shloka` capture), `भाष्यम्` becomes
   its own mapped layer (author Madhva), anything else goes through the
   existing `resolve_layer_config` path.
2. **Fix the no-`<h3>` fallback.** `_text_between(shloka, None, details)`
   walks from the `<h2>` and breaks on the first node outside `.details` —
   i.e. immediately — so no-h3 leaves (all of `rig_bhashya`, all of
   `mahabharata_tatparya_nirnaya`) ingest only the pratīka. The walk must
   start inside `.details`.

Both need a re-crawl to take effect (the extract workflow, per shard —
the later_acharyas Actions cache belongs to another session's branch).
The reader stitching above is correct with or without this richer data:
once mula text improves, the same spine simply shows fuller verses.
