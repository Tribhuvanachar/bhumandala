# Bhāgavata Sāroddhāra importer (hybrid OCR → verified grantha)

Source: the lead's scanned PDF (459 pages, Acharya Vidyadhishthanam edition; Devanāgarī body with Viṣṇutīrtha's
svopajña ṭīkā + editor's footnotes; Kannada ಮುನ್ನುಡಿ and 30 ಸಾರಸಂಗ್ರಹ summaries in front).

```
A  OCR          Vision  : .github/workflows/ocr-vision-pages.yml  → branch ocr-staging/bhagavata_saroddhara (vision_pages_1-459.json)
                Tesseract: 300-dpi PNGs, `tesseract page.png out -l san+kan --psm 4 tsv` with tools/tessdata/fast
B  merge        python3 tools/saroddhara/ocr_merge.py --vision vision/pages.json --tess-dir tess --png-dir hi --out merged
                (Tesseract boxes = geometry; Vision = text; footnote rule; header/heading/verse/ref/footnote regions; agreement A–E)
C  build        python3 tools/saroddhara/build_saroddhara.py --work <dir> --write-data
                → dge/data/darshana/vedanta/dvaita/DvaitaVedanta/later_acharyas/bhagavata_saroddhara/{mula,tika_vishnutirtha,tippani,sara_sangraha_kannada,parishishta}
                → <dir>/verify_input/verify_queue.json + verify_queue.html + crops/   (what a human / local Gemini must check)
                → <dir>/build_report.json
D  verify       open verify_queue.html (offline), answer, Export answers.json → verify_output/
E  apply        python3 tools/saroddhara/apply_verified.py verify_output/answers.json   (idempotent; then re-run validators + safe-merge)
```

Rules: every verse is matched to the Madhva Bhāgavata already in DGE (`bhagavata_purana_madhva`) by its printed
reference (±3) and, when that fails, by text search over the whole Bhāgavata; verified matches take the DGE text as
canonical and keep the OCR in `ocr`. Recovery of verses the tagger missed is limited to the deficit the printed index
shows per prakaraṇa (the commentary quotes Bhāgavata verses constantly). No Gemini call anywhere.
