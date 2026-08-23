# DCS pilot import — licence-clean, scale-cautious

A pilot import from the **Digital Corpus of Sanskrit** (DCS), proving out
the conversion from DCS's CoNLL-U format into DGE's schema on one text
before deciding whether to scale to the rest of the corpus.

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

- `vendor/conllu/` — the two source `.conllu` files for Sūryasiddhānta
  (chapters 1-2 as excerpted in DCS, 139 verses; the primary DCS mirror
  carries only these two chapters of this text, not the full classical
  14-chapter Sūryasiddhānta), copied verbatim from
  `github.com/OliverHellwig/sanskrit/tree/master/dcs/data/conllu/files/Sūryasiddhānta`.
- `build_jyotisha_pilot.py` — parses the CoNLL-U (grouping DCS's per-pada
  "sentences" into whole verses via `sent_counter`/`sent_subcounter`),
  transliterates to Devanagari, and writes `dge/data/vedanga/jyotisha/data.json`
  in the `generic` schema (the site's fallback schema for a taxonomy leaf
  with no bespoke content model — `jyotisha`'s `data.json` already declared
  `"schema": "generic"` before this pilot, as an empty stub).

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

## Scaling beyond the pilot — not done here

DCS has 253 texts total, ~1.5 GB in the primary mirror. This pilot proves
the mechanics on one; scaling to more means, for each text:

1. Copy its `.conllu` file(s) from the mirror into `vendor/conllu/` (or a
   per-text subfolder, if importing many at once).
2. Resolve where it lands in the taxonomy — most of DCS's texts (Āyurveda,
   Tantra, Jyotiṣa, Śaiva Āgama) don't have an existing empty leaf the way
   `jyotisha` did; each needs a placement decision first, the way
   `dge/PENDING.md` already flags for Āyurveda/Kāmaśāstra.
3. Decide the distribution mechanism once volume grows past what belongs
   in `main` — this project's existing pattern is a CDN-served sibling
   branch (`kavya-dist`, `wordnet-dist`) or a separate hand-created repo
   (`bhumandala-kosha-data`), not committing large corpora directly.
4. An ongoing sync job (checking `OliverHellwig/sanskrit` for upstream
   updates) is worth building once there's an actual imported corpus to
   keep in sync — premature before that.

None of this is started; it's scoped here so the next pass doesn't have to
re-derive it.
