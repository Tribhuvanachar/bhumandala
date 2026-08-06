# DGE Veda Ingestion Toolkit

Every Python script used to get the Vedas into the Digital Grantha Engine,
plus the reasoning behind each choice and the mistakes worth not repeating.

Written so that someone (including a future Claude session) can re-run the
whole pipeline without rediscovering the same traps. **The traps are the
valuable part of this document — several cost multiple wasted rounds.**

---

## 1. What is currently live

| Text | Path under `dge/data/` | Units |
|---|---|---|
| Ṛgveda (Śākala) | `vedas/rigveda/shakala_shakha/samhita/mandala_01..10` | 10,552 mantras |
| Atharvaveda (Śaunaka) | `vedas/atharvaveda/shaunaka_shakha/samhita/kanda_01..20` | 5,977 |
| Śukla Yajurveda (Mādhyandina) | `vedas/yajurveda/shukla_yajurveda/vajasaneyi_madhyandina_shakha/samhita` | 1,975 |
| Sāmaveda (Kauthuma) | `vedas/samaveda/kauthuma_shakha/samhita/{purvarchika,uttararchika}` | 1,875 |
| Taittirīya (Kṛṣṇa YV) | `vedas/yajurveda/krishna_yajurveda/taittiriya_shakha/{samhita/kanda_01..07,brahmana,aranyaka}` | ~696 anuvākas + TB + TĀ |

Fields populated per mantra: accented `samhita_patha`, accented
`pada_patha`, `rishi`, `devata`, `chandas`, `svara`, plus (Ṛgveda only)
six European translations as `commentaries`.

---

## 2. How to run anything here

All scripts are written for **Google Colab** (the admin works from an
Android phone; Colab is the practical way to run Python there).

The reliable pattern, learned the hard way:

```
# Cell 1 — dependencies
!pip install requests openpyxl pandas indic_transliteration lxml

# Cell 2 — write the script to a FILE (do not just paste and run)
%%writefile import_all_vedas.py
<paste the entire script beneath this line, same cell>

# Cell 3 — run it as a fresh process
!python import_all_vedas.py
```

**Why `%%writefile` and not just pasting code into a cell:** pasting into
a cell that already contained an older version silently re-runs the OLD
code, because Python keeps whatever was defined most recently in the
session. This wasted several rounds — twice producing output that looked
plausible but came from a superseded script. Writing to a file and running
`!python` guarantees a fresh process with exactly the code on disk.

If a cell must be reused, **select all its text and delete it** before
pasting the new version.

---

## 3. Sources, and their licensing status

| Source | Used? | Terms |
|---|---|---|
| **VedaWeb TEI** (Zenodo 4601264, Univ. of Cologne) | Yes | CC-licensed, per-file terms in each `teiHeader` |
| **sanskritdocuments.org** | Yes | Site states files are not to be reposted without permission; **explicit permission obtained** from the operators (personal connection). Credit them. |
| Hellwig `sanskrit-texts/rigveda` | Checked, not used | CC BY 4.0 but contains no metre data — only morphology/syntax |
| GRETIL | Checked, **not used** | Licensing is **per-file**, not blanket CC. Their Atharvaveda file says "FOR REFERENCE PURPOSES ONLY — copyright as for source file", and is unaccented. Do not assume GRETIL is open. |
| Wisdom Lib | **Not used** | No explicit reuse terms. Its Sāyaṇa "commentary" is a modern English rendering with its own copyright, separate from the 14th-c. Sanskrit original. |
| sri-aurobindo.co.in aggregator | **Not used** | No explicit terms for its own compilation |

**Principle applied throughout: absence of a licence is not permission.**
Copyright is automatic in essentially every country; an explicit grant is
what makes reuse allowed. Where a source was murky it was set aside and a
cleanly-licensed alternative found instead — which, in the end, always
existed.

---

## 4. The pipeline, in order

### Stage 1 — Ṛgveda from VedaWeb (`importers/vedaweb_import.py`)

Downloads the Zenodo TEI zip, parses 10 per-maṇḍala files, writes DGE
JSON. Now largely **superseded** for text (see Stage 3) but still the
source of the six translations, and the reference against which the
newer data was validated.

Run: `!pip install requests lxml indic_transliteration` then the script.
Output: `dge_vedaweb_import.zip`.

### Stage 2 — Verify the spreadsheet source (`diagnostics/`)

1. `inspect_veda_xlsx.py` — downloads `FourVedas20200922.xlsx` and
   `veda_anukriti.xlsx`, prints sheets/columns/sample rows.
2. `validate_fourvedas.py` — **the important one.** Cross-checks all
   10,552 Ṛgveda mantras against the already-live VedaWeb text, two
   independent digitisations. Result: **96.61% exact match**, with every
   sampled mismatch being a known edition variant (b/v alternation,
   anusvāra vs conjunct nasal, minor accent placement) rather than an
   error. That number is what justified trusting the source for ~20,000
   mantras across all four Vedas.

### Stage 3 — All four Vedas (`importers/import_all_vedas.py`)

Reads `FourVedas.xlsx` (download manually in a browser — the server
returns 406 to Colab; see §6). Rebuilds Ṛgveda, imports Atharvaveda,
Śukla Yajurveda and Sāmaveda, merges the existing translations, updates
`library.json`. Output: `dge_all_vedas.zip`.

### Stage 4 — Taittirīya / Kṛṣṇa Yajurveda (`importers/import_taittiriya.py`)

Fetches three ITRANS `.itx` files, converts to accented Devanagari,
writes 9 granthas. Output: `dge_taittiriya.zip`.

Verify with `diagnostics/test_taittiriya_convert.py` first if the source
files ever change.

---

## 5. Traps — read before changing anything

### The `ana` attribute is a GLOBAL hymn counter, not a sūkta number
VedaWeb's `<div type="hymn" ana="N">` numbers hymns 1–1028 across the
entire Ṛgveda. Using it as the sūkta number made RV 2.1.1 come out as
"2.192.01". Maṇḍala 1 looked correct only because there the two
numberings coincide — which is exactly why it went unnoticed. Caught by
`validate_fourvedas.py` when only 2,006 of 10,552 ids matched.

### Vedic Extensions Unicode is a rendering trap
`indic_transliteration` emits accents as U+1CD3 / U+1CD9 (Vedic
Extensions block) which almost no font supports — they render as stray
quote-like marks. The fix is to remap to the **core Devanagari block**
U+0951 (svarita) / U+0952 (anudātta), present in essentially every
Devanagari font since Unicode 1.1. This was misdiagnosed as a font
problem for several rounds; it is a **codepoint** problem.

### Choose the right TEI witness
VedaWeb offers `zurich`, `lubotsky`, `vnh`, `aufrecht`, `padapatha`,
`eichler`. Two wrong guesses before checking real data:
- `zurich` — word-tokenized for morphological analysis, **never applies
  sandhi**. Wrong for continuous reading.
- `aufrecht` — assumed a printed edition would have sandhi. It does not,
  and it shares a spelling inconsistency ("gachati" for "gacchati").
- **`eichler` is correct** — native Devanagari, proper sandhi, correct
  spelling, standard accent codepoints.

### ITRANS `.itx` files contain the text TWICE
Each Taittirīya file has the accented text, then the *entire text again*
unaccented after a `\chapter{|| (niHsvaraH) ...}` marker. A naive parse
yields 2× the units, half accent-stripped. Split at that marker.

### Computational metre detection does not work for Vedic
The `chanda` library was tested against four verses of independently
known metre. It got gāyatrī and jagatī **confidently wrong**, returning
*classical* Sanskrit metre names. Vedic prosody is more flexible than the
classical rules these tools encode. `superseded/05_..._FAILED.py` keeps
the test for the record. Chandas ultimately came from the spreadsheet
source instead.

### `JSON.stringify(Error)` produces `{}`
Not Python, but it hid the real cause of a bug for several rounds in the
app's dev logger. Error `.message` is non-enumerable. Extract it
explicitly.

### Orphaned duplicate folders
The taxonomy scaffold was generated more than once with differing
conventions, leaving pairs like `vedas/atharvaveda/kanda_01` alongside
the correct `vedas/atharvaveda/shaunaka_shakha/samhita/kanda_01`. Two
cleanup rounds were needed. **Always verify a folder's `data.json` files
are empty stubs before deleting** — the check used is in this README's
git history and in the conversation log; it looks for
`metadata.title == "Grantha Title"` or `"goes here"` in the text.

---

## 6. Practical gotchas

- **sanskritdocuments.org returns HTTP 406** to Colab/`requests` even
  with browser headers — likely datacentre IP filtering. Download those
  files manually in a browser and upload to Colab via the Files panel.
  The `.itx` text files fetch fine; it was the `.xlsx` ones that blocked.
- **Colab files are temporary.** Download output zips before the session
  disconnects, or re-run.
- **After uploading to GitHub Pages, wait a moment and refresh.** Pages
  rebuilds after each commit; a first load can serve the old file and
  look like a failure. The app's `[Data]` dev-log lines show exactly what
  was received — check those before assuming a bug.

---

## 7. Still open

- **Accented padapāṭha for Taittirīya** — the source has none.
- **Ṛṣi/devatā/chandas for Taittirīya** — not in the ITRANS files.
- **Sāmaveda gāna** (the melodic notation) — deliberately deferred; it
  needs its own numeric-accent handling, distinct from ṛk-style accents.
- **Missing śākhās.** Most of the traditional 1,131 are genuinely lost;
  ~12 survive. Still absent: Rāṇāyanīya and Jaiminīya (Sāma), Kāṇva
  (Śukla YV), Maitrāyaṇī and Kaṭha (Kṛṣṇa YV), Paippalāda (AV), Bāṣkala
  (RV, fragmentary). Rāṇāyanīya is easiest — the FourVedas Sāmaveda sheet
  already carries its numbering alongside Kauthuma.
- **Audio.** No source identified; a separate research problem.

---

## 8. Credits owed

- **sanskritdocuments.org** volunteers — decades of unpaid preservation
  work; permission granted for this use. Credit them on the site.
- **Virendra Agarwal / VedaKosh** — the "Digitisation of Vedas"
  spreadsheet, 8+ years of effort, which is the backbone of the current
  data.
- **Muralidhara B A**, with permission acknowledged to **Professor
  Anathakrishna** — the Taittirīya ITRANS transliteration.
- **VedaWeb / CCeH, University of Cologne** — the TEI corpus and the
  translations.
- **Jitendra Bansal**, **Pallasena Narayanaswami** — Sāmaveda encoding
  work referenced during this project.
