# Script Reference

What each file does, what it needs, what it produces, and what "correct"
looks like. All are written for Google Colab — see README §2 for the
`%%writefile` pattern (it matters; don't just paste into a cell).

---

## importers/ — produce uploadable output

### `import_all_vedas.py` — the main one
Imports all four Vedas from the VedaKosh spreadsheet.

- **Needs:** `!pip install requests openpyxl pandas` and
  `./veda_xlsx/FourVedas.xlsx` present (download manually in a browser —
  the server 406s Colab; see README §6).
- **Also fetches:** the live site, to carry over the six Ṛgveda
  translations and to update `library.json`.
- **Produces:** `dge_all_vedas.zip` — 33 grantha files + `library.json`.
- **Expect:** per-maṇḍala counts printed as
  `{1: 2006, 2: 429, 3: 617, 4: 589, 5: 727, 6: 765, 7: 841, 8: 1716, 9: 1108, 10: 1754}`
  totalling 10,552; Atharvaveda 5,977; Yajurveda 1,975; Sāmaveda 1,875.
- **Safety:** aborts rather than misaligning if the live site and the
  spreadsheet disagree on a maṇḍala's mantra count, since translations
  are merged **positionally**.
- **Deliberately excluded:** the Ārya Samāj commentaries (Dayānanda,
  Āryamuni, Brahmamuni, Śivaśaṅkara Śarmā) present in the source. Their
  interpretive frame diverges sharply from this library's tradition.
  Only structural/textual fields are taken. To include them, map the
  commentary columns in the `Rik`/`Yaju`/`Saam`/`Atharva` sheets — but
  label them clearly by author.

### `import_taittiriya.py` — Kṛṣṇa Yajurveda
Taittirīya Saṃhitā (7 kāṇḍas), Brāhmaṇa, and Āraṇyaka.

- **Needs:** `!pip install requests indic_transliteration`. Fetches the
  three `.itx` files directly (these are not blocked, unlike the .xlsx).
- **Produces:** `dge_taittiriya.zip` — 9 granthas + `library.json`.
- **Expect:** ~696 anuvāka units for the Saṃhitā across 7 kāṇḍas. Ends
  with a spot-check printing the first item, which should read
  `इ॒षे त्वो॒र्जे त्वा॑ वा॒यवः॑ स्थ...` with **no invocation prefix**.
- **Known limitation:** dīrgha svarita (~4k occurrences) is mapped to
  plain svarita. Its dedicated codepoint is in the poorly-supported Vedic
  Extensions block. Flagged, not hidden.
- **No** ṛṣi/devatā/chandas/padapāṭha — the source doesn't carry them.

### `vedaweb_import.py` — Ṛgveda from VedaWeb TEI
Largely superseded for text by `import_all_vedas.py`, but this is where
the six translations come from, and it's the independent source the
spreadsheet was validated against.

- **Needs:** `!pip install requests lxml indic_transliteration`.
  Downloads the 16.7 MB Zenodo zip itself.
- **Produces:** `dge_vedaweb_import.zip` — 10 maṇḍala files.
- **Expect:** exactly 10,552 stanzas, 1,028 hymns.
- **Note:** its `id` field uses the buggy global-hymn numbering (README
  §5). `import_all_vedas.py` supersedes it precisely to fix that.

---

## diagnostics/ — verify before trusting

### `validate_fourvedas.py` — **run this if the source data ever changes**
Cross-checks all 10,552 Ṛgveda mantras in the spreadsheet against the
live site's independently-sourced text, normalising away formatting-only
differences (`ओ३म्` prefix, `।` vs `/`, whitespace). Also prints random
samples from the other three Vedas for manual review.

- **Expect:** ~96.6% exact match. Mismatches should all be recognisable
  edition variants. A sharp drop means something is wrong — investigate
  before importing.

### `inspect_veda_xlsx.py`
Downloads (or reads locally) the two VedaKosh spreadsheets and prints
sheet names, columns, row counts, sample rows. Run this first if column
positions ever shift — `import_all_vedas.py` addresses columns by index.

### `inspect_taittiriya.py`
Prints structure and character frequencies of the three `.itx` files:
how `\chapter`/`\section`/anuvāka divisions are marked, which accent
markers appear, whether the text is ITRANS or Devanagari.

### `test_taittiriya_convert.py`
Prototype for the ITRANS→Devanagari accent conversion. Verifies three
things before touching 30,541 lines:
1. Private Use Area placeholders survive transliteration (prints
   `True`/`False` — if `False`, the whole approach is invalid, stop).
2. The duplicate `(niHsvaraH)` half is correctly excluded (should report
   ~50% of lines kept).
3. Structure parses, with sample conversions to eyeball.

### `diagnostic_witnesses.py`
Prints every parallel witness VedaWeb holds for a given stanza
(`zurich`, `lubotsky`, `vnh`, `aufrecht`, `padapatha`, `eichler` +
translations). This is the script that settled which witness to use —
run it before changing that choice.

---

## superseded/ — kept for the record, not for reuse

Numbered in the order they were needed. Each answered one question and
was then done. They're retained because the *reasoning* is occasionally
worth revisiting.

| File | Answered |
|---|---|
| `01_tei_tag_structure.py` | What tags does the TEI actually use? (revealed `vedaweb_corpus.tei` has an **empty body**) |
| `02_find_included_files.py` | Where is the real text? (XInclude → 10 `rv_book_NN.tei` files) |
| `03_peek_book_file.py` | What does real markup look like? (revealed the parallel-witness structure) |
| `04_translit_candidates.py` | Which IAST encoding does the transliteration library actually accept? (settled the accented-vocalic-r bug) |
| `05_chandas_autodetect_FAILED.py` | Can metre be computed from the text? **No** — see README §5. Kept as evidence, so nobody retries it hopefully. |
