# DCS import — licence-clean, scale-cautious

Imports from the **Digital Corpus of Sanskrit** (DCS) into DGE's schema.
Started as a one-text pilot (Sūryasiddhānta), then a second import
(Śivasūtra), then two 24 Aug batch passes: the first imported every DCS
text with an exact top-level taxonomy match (13 texts), the second
(`build_batch2.py`) went a level deeper — matching against the
fine-grained `vedanga/kalpa` śākhā structure and splitting a few texts
across several existing leaves by book number — and added 36 more
single-leaf imports plus 4 split imports (spanning 16 leaves between
them), then a third pass (`build_batch3_upanishads.py`, 5 mula-Upaniṣads)
and a fourth (`build_batch4_samkhya_yoga.py`, see below) that also added
new taxonomy nodes rather than only filling existing empty leaves.
**59 DCS texts in now, across 71 taxonomy leaves, 106,140 items
total.** Still well short of DCS's full 253-text corpus;
see the taxonomy-placement proposal (linked from `dge/PENDING.md`'s 24 Aug
entries) for what's left and where it likely goes.

## Licence — the clean case, unlike chandas/skrutable

**DCS itself is CC-BY 4.0** (attribution only, no share-alike) — confirmed
directly from the primary mirror's own README (`ambuda-org/dcs`: *"Source:
Oliver Hellwig: Digital Corpus of Sanskrit (DCS). 2010-2021. License:
CC-BY 4.0"*), not just claimed. No isolation needed the way `tools/chandas/`
(AGPL) is isolated — attribution is stamped per-item (`notes` field) and at
the top of the output `data.json` (`source`, `source_url`, `licence`),
matching the pattern in `dge/kosha_toolkit/LICENSING.md`.

**skrutable is CC BY-SA 4.0** (share-alike) — approved for use as an
**unmodified pip dependency only** (`pip install skrutable`), not vendored
or adapted code. `build_jyotisha_pilot.py` uses its `Transliterator` this
way for IAST→Devanagari conversion; no skrutable source lives in this repo.

## What's here

- `dcs_common.py` — shared CoNLL-U → DGE `generic`-schema conversion:
  `parse_conllu_file()` handles the three DCS sentence-numbering
  conventions found so far (see the 24 Aug section below), and
  `build_generic_import()` writes a schema-conformant `data.json`.
- `vendor/conllu/`, `vendor/conllu_sivasutra/`, and one subdirectory per
  24-Aug-batch text under `vendor/` — source `.conllu` files copied
  verbatim from `github.com/OliverHellwig/sanskrit/.../dcs/data/conllu/files/<text>`,
  kept for provenance.
- `build_jyotisha_pilot.py`, `build_sivasutra.py`, `build_batch.py` — the
  three import passes, each writing its target `data.json` in the site's
  `generic` schema (the fallback schema for a taxonomy leaf with no
  bespoke content model).

## Why Sūryasiddhānta, why jyotisha

`vedanga/jyotisha` was already a taxonomy leaf, just empty (`library.json`
had `"populated": false`) — a clean landing spot with no open placement
question. By contrast, DCS's Āyurveda and Tantra texts don't have a settled
taxonomy home yet — `dge/PENDING.md` already flags "new top-level taxonomy
placement for Ayurveda and Kāmaśāstra" as an open, undecided question. This
pilot deliberately avoided entangling itself with that separate decision.

## Result

139 verses, `dge/data/vedanga/jyotisha/data.json`, `library.json`'s
`populated` flag flipped to `true`. Cross-checked against
`tools/chandas_native/`: 14/20 of the first 20 verses identify cleanly as
Anuṣṭubh, the expected metre for a śāstra text — a sanity check that the
transliterated text is prosodically sound, not just syntactically valid
JSON. (The other 6 don't match any pattern in chandas_native's still-small
21-entry database — not investigated further here, out of scope for this
pilot.)

## Second import: Sivasutra, 23 Aug — proving the "scan for empty leaves" pattern

Before importing more texts, checked `library.json` for `populated: false`
leaves under `purana/`, `darshana/`, and `agama/` (68, 185, and 17 found,
respectively) and cross-referenced DCS's text list against them, rather
than assuming DCS text = new content. This caught a real risk early:
Mahābhārata and Rāmāyaṇa are already `populated: true` with genuine mūla
text in `itihasa/` — importing DCS's versions there would have meant
duplicate/conflicting granthas, not new coverage.

`Śivasūtra` (74 sutras, all 3 unmeṣas — the complete short text) matched
an empty `agama/pancharatra/shaiva_agama/data.json` leaf exactly, same
safe pattern as the Sūryasiddhānta pilot. `build_sivasutra.py` reuses the
CoNLL-U parsing now factored into `dcs_common.py`.

## Batch import, 24 Aug — every exact taxonomy match, plus a real parser bug found and fixed

A proper normalized match (strip diacritics, lowercase, alnum-only; exact
match required, no fuzzy matching) between all 253 DCS text names and
every `populated: false` leaf in `library.json` found 13 clean matches
— see `build_batch.py` for the list and `dge/PENDING.md`'s 24 Aug entry
for the full match table. All 13 imported:

| text | items | landed in |
|---|---|---|
| Agnipurāṇa | 610 | `purana/agni_purana/` |
| Matsyapurāṇa | 8,341 | `purana/matsya_purana/` (all 175 chapters DCS carries) |
| Kālikāpurāṇa | 288 | `purana/upapuranas/kalika_purana/` |
| Narasiṃhapurāṇa | 35 | `purana/upapuranas/narasimha_purana/` |
| Varāhapurāṇa | 39 | `purana/varaha_purana/` |
| Gautamadharmasūtra | 891 | `vedanga/kalpa/independent_dharmasutras/gautama_dharmasutra/` |
| Nirukta | 610 | `vedanga/nirukta/` |
| Gopathabrāhmaṇa | 4,241 | `vedas/atharvaveda/shaunaka_shakha/brahmana/gopatha_brahmana/` |
| Aitareya-Āraṇyaka | 862 | `vedas/rigveda/shakala_shakha/aranyakas/aitareya_aranyaka/` |
| Aitareyabrāhmaṇa | 3,733 | `vedas/rigveda/shakala_shakha/brahmanas/aitareya_brahmana/` |
| Jaiminīyabrāhmaṇa | 7,325 | `vedas/samaveda/jaiminiya_shakha/brahmanas/jaiminiya_brahmana/` |
| Sāmavidhānabrāhmaṇa | 330 | `vedas/samaveda/kauthuma_shakha/brahmanas/samavidhana_brahmana/` |
| Maitrāyaṇīsaṃhitā | 7,954 | `vedas/yajurveda/krishna_yajurveda/maitrayani_shakha/samhita/maitrayani_samhita/` |

**~35,300 items total**, all cross-checked for content sanity (not just
valid-JSON) — several land on independently-verifiable famous openings,
e.g. Nirukta 1.1.1 is Yāska's own "समाम्नायः समाम्नातः" and Maitrāyaṇī
Saṃhitā 1.1.1.1 is the well-known Yajurveda opening "इषे त्वा सुभूताय".

**A real bug was found and fixed while running this, not after**:
`dcs_common.py`'s original parser only handled one DCS sentence-numbering
convention (`sent_counter`/`sent_subcounter`, alternating for verse
padas). Running it on prose texts surfaced two more it didn't handle:
Aitareya/Jaiminīya Brāhmaṇa's prose files leave `sent_subcounter` blank
on *every* sentence (no pada pairing) rather than omitting it, and some
files (~20% of Aitareya/Jaiminīya Brāhmaṇa) have no counter fields at
all, only a `sent_id`. The first version of the fix silently dropped
those units — went from "285 files → 8 items" (obviously wrong) to
"285 files → 3,733 items" only after actually inspecting raw file content
rather than trusting the item count. See the docstrings on
`_parse_int`/`parse_conllu_file` in `dcs_common.py` for the three
conventions now handled, and why the no-counters fallback deliberately
never merges consecutive sentences (each gets its own item) rather than
guessing they pair up.

**Vendor size**: `vendor/` is now ~54 MB of source `.conllu` (kept for
provenance, same reasoning as `tools/chandas/vendor`), generated
`data.json` output adds a few more MB per large text (Matsyapurāṇa's is
4.6 MB). Committed directly to `main`, not routed through a CDN branch —
the project lead lifted the earlier 1 GB caution (`dge/PENDING.md`: "1GB
is just a recommendation, 5GB+ is the real ceiling").

## Third import, batch 3 (`build_batch3_upanishads.py`) — a proposal correction

The taxonomy-placement proposal in `dge/PENDING.md` had listed "Upaniṣad
mūla texts" as a Tier B gap needing new taxonomy structure. Checking
`library.json` directly (not trusting the proposal) found that precise
empty leaves already exist per Veda/śākhā — no new structure needed, just
5 more single-leaf imports: Chāndogya, Kaṭha, Taittirīya, Aitareya,
Muṇḍaka Upaniṣad. Bṛhadāraṇyakopaniṣad deliberately excluded — DCS's own
"BĀU" chapter headers don't distinguish the Kāṇva vs Mādhyandina
recension, and the taxonomy has separate empty leaves for each; guessing
would risk mislabeling a real textual variant.

## Fourth import, batch 4 (`build_batch4_samkhya_yoga.py`) — new taxonomy nodes, and a fourth parser convention

Unlike every prior batch, this one didn't just fill an existing empty
leaf — `darshana.sankhya` and `darshana.yoga` didn't exist in
`taxonomy.json` yet. They were added deliberately narrowly: `dge/js/library.js`'s
`DGE_PATH_LABELS` dict already carries Devanagari labels for `sankhya`
and `yoga` (note the spelling — `sankhya`, not `samkhya` — matched
exactly rather than guessed) under a comment naming an external
"recommended DGE taxonomy (`DGE_Shastra_Taxonomy.md`)" reference document
that does **not** actually exist anywhere in this repo (confirmed by
search). That's the *only* reason Sāṃkhya/Yoga were added here and
Āyurveda/Buddhist-literature/Tantra were not — no such label precedent
exists for those. See `dge/PENDING.md` for this open question, unresolved
as of this batch.

New nodes: `darshana.sankhya.sutra_and_karika` (`samkhya_karika` and
`samkhya_sutra`, each `mula` + several `tika_*`/`bhashya_*` sibling
leaves, mirroring the existing `nyaya_sutra`/`vaisheshika_sutra` pattern)
and `darshana.yoga.sutra_and_bhashya.yoga_sutra` (`mula` + 4 commentary
leaves). 13 leaves drafted; only 3 have a DCS match — **Sāṃkhyakārikā
and Sāṃkhyasūtra's own mūla texts are not in the DCS mirror at all**
(checked by listing, not assumed), only a commentary
(Sāṃkhyatattvakaumudī) is. Yogasūtra mūla and its Vyāsabhāṣya are both
present and imported; the other 10 leaves stay `populated: false` stubs,
same as any other planned-but-unsourced grantha elsewhere in this
taxonomy.

**A 4th DCS chapter-numbering convention was found and fixed while
running this, not after** (same discipline as the 24 Aug prose-brāhmaṇa
fix): Sāṃkhyatattvakaumudī's `## chapter:` line is a single already-dotted
field (`STKau zu SāṃKār, 1.2`), not several comma-separated bare
integers like every text seen before it. The original `_parse_chapter_path`
only accepted a bare integer per comma-field, so this text silently
produced `chapter_path = None` for every sentence — 0 items from 14
files, caught as implausible rather than accepted as "this text is just
short." Fixed in `dcs_common.py` by accepting a comma-field that is
itself a dot-separated run of digits and splitting it in; re-verified
byte-identical against every already-shipped import (pilot + batches
1–3) before trusting the fix on new data. Sāṃkhyatattvakaumudī went from
0 → 20 items, and — because the same convention turned out to affect
Yogasūtrabhāṣya too — that text's count went from a first, silently-wrong
106 items to a correct 785.

Content sanity-checked against independently known text, not just
valid JSON: Yogasūtra 1.1 is the universally known opening "अथ
योगानुशासनम्", its last sūtra is the equally well-known "पुरुषार्थशून्यानां
गुणानां प्रतिप्रसवः...कैवल्यम्", and Yogasūtrabhāṣya's very first unit is
Vyāsa's own "अथेत्ययमधिकारार्थः" gloss on the word *atha*.

## Scaling beyond this batch — not done here

DCS has 253 texts total; 59 are in now, across 71 taxonomy leaves,
106,140 items. Remaining candidates for a future pass:

- The exact-match pass found everything with a *precisely*-named existing
  leaf. It will have missed real matches with slightly different naming
  (spelling variants, abbreviations) — a fuzzier pass, checked by a human
  before importing rather than auto-matched, would find more.
- Several `Skandapurāṇa`/`Liṅgapurāṇa`/`Kūrmapurāṇa`/etc. sub-leaves
  (`brahma_khanda`, `purva_bhaga`, etc.) are still `populated: false` and
  may have DCS matches under different sub-section naming — not checked.
- Where there's no empty leaf at all, taxonomy placement needs deciding
  first — most of DCS's Āyurveda/Tantra/Buddhist texts have no home yet,
  and (as of batch 4) there's a *specific* open question blocking that:
  whether `DGE_Shastra_Taxonomy.md` — referenced by name in
  `dge/js/library.js` but absent from the repo — actually defines homes
  for them, which this session cannot see to check.
- An ongoing sync job (checking `OliverHellwig/sanskrit` for upstream
  updates) is worth building now that there's a real imported corpus
  (59 texts, ~106,000 items) to keep in sync — the earlier "premature"
  call no longer applies at this scale, but it's still not started.

None of this is started; it's scoped here so the next pass doesn't have to
re-derive it.
