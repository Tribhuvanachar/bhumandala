# DGE — Rigveda / VedaWeb Import: Status & Architecture

_Reference document — written to be handed to any developer or AI tool
picking this work up. One thing it deliberately does NOT include: scraping
instructions for sites whose reuse terms aren't explicit (see the note at
the bottom). That's a boundary carried through intentionally, not an
oversight — please don't ask a downstream tool to route around it._

## 1. What this is

DGE (Digital Grantha Engine) is a static, no-backend Sanskrit digital
library on GitHub Pages. This document covers just the Rigveda import
pipeline — pulling the Rigveda into DGE's schema from VedaWeb's public
dataset, and the open work around metre (chandas) and accented padapatha.

## 2. Source data

**VedaWeb 1.0 TEI dataset** — static, versioned, CC-licensed (per-file
terms in each file's own `teiHeader`).
- Download: `https://zenodo.org/records/4601264/files/cceh/c-salt_vedaweb_tei-v.1.0.0.zip?download=1`
- 10 files: `rv_book_01.tei` .. `rv_book_10.tei` (one per maṇḍala)
- Each stanza has **multiple parallel witnesses** (`<lg source="...">`),
  confirmed present per stanza: `zurich`, `lubotsky`, `vnh`, `aufrecht`,
  `padapatha`, `eichler`, plus translation-only witnesses (`geldner`,
  `grassmann` — German; `griffith`, `macdonell`, `oldenberg` — English;
  `elizarenkova` — Russian).

**Witness selection — confirmed by direct inspection of real output, not
assumed:**

| Witness | Script | Use | Why |
|---|---|---|---|
| `eichler` | Native Devanagari | **Primary samhitā text** | Only witness with correct sandhi ("अग्निमीळे" combined) AND correct spelling ("गच्छति" not "गछति", a real inconsistency shared by zurich/vnh/aufrecht/padapatha) AND standard Unicode accent marks (no remapping needed) |
| `zurich` | IAST, tokenized | Fallback only if `eichler` missing for a stanza | Built for morphological analysis, not continuous reading — never applies sandhi |
| `padapatha` | IAST | Word-by-word `pada_patha` field | Only source for this; **no accent marks in this witness at all** (open issue, see §4) |
| `griffith`/`macdonell`/`oldenberg` | English | Not yet imported | Public domain (1890s–1920s), already present in this same licensed dataset — the clean path for English commentary/translation |

## 3. Known bugs already fixed (don't reintroduce)

- **Accent codepoint mismatch**: the transliteration step (for the
  `zurich` fallback path) was producing Vedic Extensions block codepoints
  (`U+1CD3`, `U+1CD9`) instead of the standard core-Devanagari-block marks
  (`U+0951`/`U+0952`, in every font since Unicode 1.1). Fixed via
  `dgeSanitizeVedicAccents()` — present in both the Python importer and
  the app's own `core.js` (defensive double coverage).
- **`ḷ` (retroflex lateral) vowel/consonant ambiguity**: `l` + combining
  ring-below was being read as the vocalic-ḷ vowel instead of the
  retroflex consonant. Fixed via `fix_retroflex_l()`.
- **`app.stotraData` schema mismatch**: the main app only understood
  PNS's legacy `{metadata, shlokas:{n:{...}}}` shape. New Vedic content
  uses `{schema, items:[...]}`. Fixed via `dgeNormalizeGranthaData()` in
  `core.js`, which adapts new-schema data into the legacy shape at load
  time so every other module (render/audio/markers/notes/search/filter)
  works unchanged.

## 4. What's done

- All 10,552 Rigveda stanzas imported, live on GitHub at
  `dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_0{1-10}/data.json`
- Fields populated per stanza: `id` (traditional reference, e.g.
  "1.1.01"), `samhita_patha` (correct sandhi + accents), `samhita_patha_iast`,
  `pada_patha` (no accents — see open items), `pada_patha_iast`, `rishi`,
  `devata`
- `library.json` catalog entries correctly marked `populated: true` with
  titles
- App renders it correctly: extra structured fields (rishi/devata/chandas/
  padapatha/reference) display via the existing `SHLOKA_EXTRA_FIELDS`
  mechanism (same one used for Padaccheda/Anvaya on other texts)

## 5. Open items and how each should actually be approached

### Chandas (metre) — unsolved, no source found yet
- **Not in VedaWeb's TEI** at all (checked directly — hymn-level metadata
  only has deity/composer, no metre field anywhere in the schema)
- **Computational detection tested and failed**: the `chanda` Python
  library (syllable-pattern based) was tested against 4 verses with
  independently-known metre (gāyatrī, triṣṭubh, jagatī, anuṣṭubh — from
  Wikipedia's Vedic metre article, which cites real example verses). It
  got gāyatrī and jagatī both wrong, confidently, with *classical*
  Sanskrit metre names — not just uncertain, actively wrong. Vedic metre
  is more flexible than the classical prosody these tools are built for.
  **Do not use this approach without a much better accuracy story than
  this test showed.**
- **Hellwig's `sanskrit-texts/rigveda` (CC BY 4.0, github.com/sanskrit-texts/rigveda)
  checked and doesn't have it either** — its actual folder structure is
  `merged` / `morpho-lexical` / `verb-argument` — word-level grammar and
  sentence-level syntax, not verse-level prosody.
- **Recommended next step**: look for a purpose-built, explicitly-licensed
  Vedic metre dataset specifically (not a classical-Sanskrit tool, not a
  general aggregator site with unclear terms). If a validation script is
  built once a candidate source exists, it should cover: one verified
  example per unique metre (7 major + ~14 minor, real counts from
  Wikipedia's table sum to ~10,552), plus spot-checks across several
  suktas per maṇḍala and several mantras per sukta — not just a handful
  of isolated verses — before trusting it for the full corpus.

### Accented padapatha — unsolved, genuinely hard
- VedaWeb's own `padapatha` witness has zero accent marks in the source
  encoding (confirmed from raw IAST — no acute/grave characters anywhere)
- `eichler` (which DOES have correct accents) only provides continuous
  saṃhitā text — no word-separated form exists for it in this dataset
- Deriving one by aligning `eichler`'s accents onto `padapatha`'s words
  is a real sandhi-alignment problem (word forms change between saṃhitā
  and pada readings) — not a simple text operation
- **Recommended next step**: investigate a proper Sanskrit sandhi-
  splitting/word-segmentation library (there are several with clear
  licenses — this is a computational-linguistics problem, not a sourcing
  problem) that could derive the padapatha *from* `eichler`'s already-
  correct accented saṃhitā text directly, computationally, rather than
  needing any external data source at all. Untested — would need the
  same kind of accuracy validation as chandas before trusting it.

### English translation/commentary — clean, ready to build
- Griffith/Macdonell/Oldenberg witnesses are already sitting in the same
  VedaWeb data already fully licensed and imported from
- Same import pipeline, same schema pattern — just needs the extraction
  extended to pull one of these witnesses into a `translation` field
- No open sourcing question at all — this is genuinely just an
  engineering task

### Audio — not started, separate undertaking
- VedaWeb is text-only; there is no recitation audio anywhere in this
  pipeline
- Needs its own dedicated sourcing investigation (a correctly-chanted
  Vedic recitation corpus, with explicit reuse rights) — not scoped yet,
  shouldn't be assumed feasible until that's actually found

### Progress-tracking UI — not built yet
- Requested: a visual grid (e.g. one cell per maṇḍala, or drillable down
  to sukta/mantra level) showing status per field per unit — done /
  in-progress / failed-needs-retry / not-started
- Reasonable to build once there's a second real data-fill pass to track
  (e.g. the translation import) — tracking a single already-complete
  import retroactively isn't as useful as building it alongside the next
  actual fill operation

## 6. On sourcing generally

Everything actually *used* in this pipeline so far (VedaWeb's TEI,
Griffith/Macdonell/Oldenberg's public-domain translations, Hellwig's CC
BY 4.0 dataset) has explicit, checkable reuse terms. A few other sites
were considered for chandas/padapatha/commentary (Wisdom Lib, a Sri
Aurobindo–affiliated aggregator, a Hindi Ved portal) and set aside —
none had an explicit license statement for the specific content in
question, and "not explicit" was treated as "not cleared," not as
license to use. If a different source is proposed for any open item
here, checking for an actual explicit reuse statement first is the same
bar everything else in this document was held to.
