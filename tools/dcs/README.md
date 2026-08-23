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

## Scaling beyond the two imports so far — not done here

DCS has 253 texts total, ~1.5 GB in the primary mirror. Two are in
(Sūryasiddhānta, Śivasūtra); scaling further means, for each candidate:

1. **Check for an existing empty (`populated: false`) taxonomy leaf
   first** — the check described above, not optional. A rough one-time
   pass (keyword-matching DCS's `texts.csv` against `library.json`, done
   23 Aug, see `dge/PENDING.md`) found real matches worth checking
   properly and importing the same way:
   - `Matsyapurāṇa` → `purana/matsya_purana/` (currently empty) — but this
     is DCS's **full text, 174 chapter files**, a much bigger job than
     either import so far; deserves its own pass, not a rushed add-on.
   - Several `Skandapurāṇa`/`Liṅgapurāṇa`/`Kūrmapurāṇa`/etc. sub-leaves
     (`brahma_khanda`, `purva_bhaga`, etc.) are `populated: false` and may
     have DCS matches — not individually checked yet.
   - `Vaiśeṣikasūtra`, `Yogasūtra`-family, `Sāṃkhyakārikā` and its
     commentaries under `darshana/` — same pattern as Śivasūtra, not
     checked yet.
   - The rough keyword pass left 184/253 DCS texts "unclassified" — real
     classification (not keyword-matching) is needed before knowing what
     else fits an empty leaf vs. needs a placement decision.
2. Where there's no empty leaf, resolve taxonomy placement first — most of
   DCS's Āyurveda/Tantra texts have no home yet, the same open question
   `dge/PENDING.md` already flags for Āyurveda/Kāmaśāstra generally.
3. Decide the distribution mechanism once volume grows past what belongs
   in `main` — this project's existing pattern is a CDN-served sibling
   branch (`kavya-dist`, `wordnet-dist`) or a separate hand-created repo
   (`bhumandala-kosha-data`), not committing large corpora directly.
4. An ongoing sync job (checking `OliverHellwig/sanskrit` for upstream
   updates) is worth building once there's a large enough imported corpus
   to keep in sync — premature with two texts in.

None of this is started; it's scoped here so the next pass doesn't have to
re-derive it.
