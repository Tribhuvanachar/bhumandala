# DGE — Stream 5 delivery: Ashtadhyayi missing layers + padaccheda/anvaya + admin tracker

Scope: **Stream 5 only** (COWORK_TASKS_ROUND3.md). Delivered as a zip per this
project's convention (git proxy blocks direct pushes). No other stream touched.

## What shipped

| # | Item | Status |
|---|------|--------|
| 1 | Populate **Mahābhāṣya** (Patañjali) + **Siddhānta-Kaumudī** into the scaffolded leaves | ✅ 1,691 + 3,928 sūtras |
| 2 | Add **Vasu's English translation** (1891) as a further layer | ✅ 3,962 sūtras |
| 3 | Wire all three into `ashtadhyayi.js` `META`/`ORDER` (chips were waiting) | ✅ 7 live layers |
| 4 | **Pada-cheda + anvaya** display per sūtra | ✅ + anuvṛtti/adhikāra/type/English |
| 5 | **Ashtadhyayi admin/progress page** with per-layer coverage + licence status | ✅ `ashtadhyayi-admin.html` |

The reader now offers **7 toggleable layers** (was 4): Kāśikā · Siddhānta-Kaumudī ·
Mahābhāṣya · Bālamanoramā · Tattvabodhinī · Nyāsa · Vasu (English). Default view =
Kāśikā + Siddhānta-Kaumudī + Bālamanoramā.

## Files (extract at repo root)

```
dge/ashtadhyayi.html                      (modified — chips, analysis panel, CSS vars, v=1.2.0)
dge/js/ashtadhyayi.js                      (modified — +3 layers, path override, English layer, analysis renderer)
dge/ashtadhyayi-admin.html                 (NEW — SHRI108 gate, coverage + licence tracker)
dge/data/vyakarana/ashtadhyayi/sutrapatha/data.json   (enriched in place)
dge/data/vyakarana/ashtadhyayi/vasu/data.json         (NEW — 5.8 MB)
dge/data/ancillary/vyakarana/paniniya_vyakarana/siddhanta_kaumudi/data.json     (populated — 3.4 MB)
dge/data/ancillary/vyakarana/paniniya_vyakarana/mahabhashya_patanjali/data.json (populated — 6.5 MB)
importers/ashtadhyayi_layers.py            (NEW — reproducible importer)
```

All edits are additive/non-destructive. `schemas.json` and `taxonomy.json` are
**unchanged** — the two new commentary leaves reuse the existing
`grantha_tika_text` schema and were already scaffolded in the taxonomy; the reader
loads them via an explicit per-layer `path` in `META` (no folder-convention change),
so the ancillary leaves are the single canonical home (no data duplication).

## Item 4 — padaccheda / anvaya: which case was it?

The brief asked to first check whether the four already-loaded commentaries
structurally carry padaccheda/anvaya before assuming a separate source.

**Answer: neither case — it is carried by the *sūtra metadata*, not by any
commentary layer.** The four commentary dictionaries (Kāśikā, Nyāsa, Bālamanoramā,
Tattvabodhinī) are running Sanskrit prose keyed by sūtra; they do **not** expose a
machine-readable word-split or prose-order field. ashtadhyayi.com's
`sutraani/data.txt` does, per sūtra:

- `pc` → **padaccheda** (word-split), e.g. `वृद्धिः + आत्-ऐच्`
- `ss` → **anvaya** (prose / word-order form), e.g. `आत्-ऐच् वृद्धिः`
- `an` → **anuvṛtti** (carried-over words, each linked to its source sūtra)
- `ad` → **adhikāra** (governing rule)
- `type` → **sūtra type** (saṃjñā / paribhāṣā / vidhi / adhikāra …)

These are attached to each `sutrapatha` item during import and rendered in the hero
via the new **॥ पदच्छेद / विश्लेषण ॥** button (a compact always-on strip shows the
word-split + type; the toggle panel shows anvaya, anuvṛtti with cross-links,
adhikāra, and the English gloss). This matches what ashtadhyayi.com shows.

Coverage: padaccheda 100%, sūtra-type 100%, English gloss 100%, adhikāra 88%,
anuvṛtti 88%, anvaya 39% (the `ss`/anvaya field is only populated for ~1,561 sūtras
upstream — the rest genuinely have no prose-order form on record; the admin page
surfaces this honestly rather than faking it).

## Sourcing decision — read this

The brief suggested GRETIL/sanskritdocuments.org. **I used
`github.com/ashtadhyayi-com/data` instead, deliberately:**

- GRETIL/sanskritdocuments carry the Mahābhāṣya and Siddhānta-Kaumudī as **running
  text, not keyed per sūtra** — aligning them to the 3,962 canonical sūtra IDs would
  require heavy, error-prone heuristic segmentation.
- ashtadhyayi.com's data is **already sūtra-keyed** (id `11001` → `1.1.1`), so it
  drops cleanly into the existing `comments_on` reference schema with zero alignment
  guesswork. It is also the **same source convention** the project already uses.
- Per the project lead's own record, ashtadhyayi.com's curator has granted e-mail
  permission for non-commercial/educational reuse — this clears the repo (which has
  no formal LICENSE) for DGE's private prototype.

If you would still prefer GRETIL-sourced text for either commentary, that's a
re-run of `importers/ashtadhyayi_layers.py` against a different source — say the word.

## Licence status (surfaced on the admin page, not resolved here)

- **Vasu English** — public domain (Vasu, *The Ashṭādhyāyī of Pāṇini*, 1891). Cleared. ✅
- **Siddhānta-Kaumudī, Mahābhāṣya** — `licence` note records: used under
  ashtadhyayi.com curator's e-mail permission for non-commercial/educational use;
  source repo has no formal LICENSE; keep visible attribution; resolve before public
  launch. Badge: *Permitted (curator)*.
- **Kāśikā, Bālamanoramā, Tattvabodhinī, Nyāsa** (pre-existing) — still tagged
  `licence: verify` (project lead's own StarDict dictionaries, edition not confirmed
  against a public copy). The admin page flags all four for review and does **not**
  treat them as cleared. Licence resolution is a project-lead call; this page only
  makes the status visible.

## How to regenerate

```
git clone https://github.com/ashtadhyayi-com/data   # or let the importer fetch raw
python importers/ashtadhyayi_layers.py --local ./data
```

Rewrites only the four data files above; safe to re-run.

## Not in scope / left pending (intentionally)

- **⚙ प्रक्रिया** chip stays pending — it's the external Vidyut/Vidyullekha
  derivation engine, not a text layer.
- Kaiyaṭa-Pradīpa / Nāgeśa-Uddyota — upstream data covers only āhnika 1–2 and is
  chunk-keyed, not sūtra-keyed; not ingested.
- Sanscript transliteration CDN is blocked in the build sandbox, so non-Devanagari
  scripts fall back to Devanagari during local testing only; on the live GitHub
  Pages site the CDN loads and script-switching works as before.

## Verified

Driven in headless Chromium at 393 px (mobile) and 1200 px (desktop): all 7 layers
toggle and load; Vasu renders as English (non-transliterated); the analysis panel
shows padaccheda + anvaya + anuvṛtti + English; admin gate + coverage bars + licence
badges render with no failed requests. Screenshots on request.
