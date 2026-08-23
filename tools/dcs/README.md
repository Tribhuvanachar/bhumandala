# DCS import — licence-clean, scale-cautious

Imports from the **Digital Corpus of Sanskrit** (DCS) into DGE's schema.
Started as a one-text pilot (Sūryasiddhānta) to prove out the CoNLL-U
conversion, then a second import (Śivasūtra) to prove a safe way to find
more candidates, then a 24 Aug batch pass that imported everything an
exact taxonomy match could find — 15 texts, ~35,700 items total. Still
well short of DCS's full 253-text corpus; see "Scaling beyond this batch"
below for what that would take.

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

## Scaling beyond this batch — not done here

DCS has 253 texts total; 15 are in now (Sūryasiddhānta, Śivasūtra, and
this batch's 13). Remaining candidates for a future pass:

- The exact-match pass found everything with a *precisely*-named existing
  leaf. It will have missed real matches with slightly different naming
  (spelling variants, abbreviations) — a fuzzier pass, checked by a human
  before importing rather than auto-matched, would find more.
- Several `Skandapurāṇa`/`Liṅgapurāṇa`/`Kūrmapurāṇa`/etc. sub-leaves
  (`brahma_khanda`, `purva_bhaga`, etc.) are still `populated: false` and
  may have DCS matches under different sub-section naming — not checked.
- Where there's no empty leaf at all, taxonomy placement needs deciding
  first — most of DCS's Āyurveda/Tantra texts have no home yet, the same
  open question `dge/PENDING.md` already flags for Āyurveda/Kāmaśāstra.
- An ongoing sync job (checking `OliverHellwig/sanskrit` for upstream
  updates) is worth building now that there's a real imported corpus
  (15 texts, ~35,700 items) to keep in sync — the earlier "premature"
  call no longer applies at this scale, but it's still not started.

None of this is started; it's scoped here so the next pass doesn't have to
re-derive it.
