# OCR review — from a scanned book to a library layer, with a scholar in the loop

_Written 9 Sep 2026, in answer to: the OCR output is one big chunk of text,
verification goes through Gemini prompts on a phone, and there is no place
where a scholar can approve, reject or fix a passage and hand back a final
version. Wanted: a neat review UI, and the approved text landing in the
library as a commentary layer._

## The pipeline

```
 scan (PDF on archive.org / Drive)
   │
   ├─ ocr-vision-pages.yml      Google Vision, raw text per page (₹ Vision)
   ├─ ocr-sanskrit-commentary   Vision + Gemini proofread → shlokas[] (₹ both)
   ├─ ocr-vasu-kaumudi / -lakshmi-kaumudi   book-specific variants
   └─ ocr-sarvam.yml            Sarvam Document AI, layout kept (₹ Sarvam)   ← new
         │
         ▼   staged JSON on branch ocr-staging/<work>  (or dge/data/ocr_staging on main)
   ocr-preview-pages.yml  (free)  renders the PDF pages → branch ocr-images/<work>
         │
         ▼
   admin/ocr-review.html  ──── scan on the left, units on the right ────┐
   accept · edit · reject · note, per unit; Accept page; Save            │
         │  writes <folder>/review/<file>.decisions.json on the branch   │
         ▼                                                               │
   ocr-review-merge.yml  →  tools/ocr_review_merge.py  →  pull request  ─┘
         │
         ▼
   dge/data/<grantha>/<layer>/data.json   (nightly.yml registers it in library.json)
```

Nothing reaches a reader until the pull request is merged. Every item in the
layer carries `verification.human` — who decided, when, what.

## The review page (Admin Tools → OCR Review)

1. Pick the branch (`main` or an `ocr-staging/<work>`) and the staged file.
   Every file under `dge/data/ocr_staging/` on that branch is offered.
2. The page turns the file into **units** with stable ids, whatever the
   file's shape:

   | staged file | unit | id |
   |---|---|---|
   | `vision_pages_*.json` (Vision, per page) | a paragraph (blank-line split) | `p<page>_b<n>` |
   | `sarvam_pages*.json` (Sarvam, html/md) | a paragraph of the page's text; the page's HTML is shown rendered above the first unit | `p<page>_b<n>` |
   | `blocks.json` / `_sync/anandamakaranda.json` | a block | the block's id |
   | Vasu / Lakṣmī `entries[]` | an entry | `sk<n>` |
   | Gemini commentary `shlokas[]` | a verse (two fields: verse and commentary) | `v<n>` |

   The same rules live in `tools/ocr_review_merge.py` (`units_of`), so an id
   decided on the page is the id the merge tool applies.
3. The scan for the current page comes from the `ocr-images/<work>` branch.
   If it is not there yet, **Render pages** dispatches
   `ocr-preview-pages.yml` with the file's own PDF URL and page range and
   `publish_work=<work>`; the PNGs appear in a couple of minutes. Free.
4. Per unit: read the OCR text (and the other engine's reading, when the
   file has one), fix it in place if needed, then **Accept**, **Save edit**
   or **Reject**, with an optional note. **Accept page** accepts everything
   undecided on the page. Filters: this page, all, undecided, flagged for
   review (the pipeline's own `review` / `unresolved` / `partial` / `new`
   classes), accepted, edited, rejected.
5. **Save decisions** commits `review/<file>.decisions.json` on the same
   branch (one commit per save, as the token holder). Decisions also stay in
   the browser until saved, so a lost connection loses nothing.
6. **Finalise**: give the target layer path, schema, title and author (or
   the sarga directory for a Gemini commentary file) and press Merge. The
   workflow builds the layer and opens a pull request.

Several reviewers can work on one file: decisions merge by unit id, and
each carries its reviewer's name.

## The decisions file

```json
{"staged": "dge/data/ocr_staging/isha/vision_pages_1-292.json",
 "updated_at": "2026-09-09T10:12:00Z",
 "decisions": {
   "p12_b3": {"decision": "accept", "by": "Vidwan X", "at": "…", "note": ""},
   "p12_b4": {"decision": "edit", "text": "corrected text", "by": "…", "at": "…", "note": "OCR read ष as प"},
   "p13_b1": {"decision": "reject", "by": "…", "at": "…", "note": "running header"}
 }}
```

For a Gemini commentary file an `edit` may carry `fields: {sa, commentary}`.

## The merge tool

`tools/ocr_review_merge.py --staged <file> [--decisions <file>]`

- Page / block / entry files → `--target <layer data.json> --schema
  grantha_tippani_text|grantha_tika_text|grantha_mula_text --title --author
  [--mode append|replace]`. Accepted and edited units become items
  `{id, reference, sanskrit_text, tags, source{staged, unit, page, engine},
  verification.human}`; rejected units are dropped; undecided ones are left
  out unless `--include-undecided`. `append` merges by id into an existing
  layer.
- Gemini commentary files → writes `<file>.approved.json` with the decisions
  folded into `sa` / `commentary` / `classification`, and with `--sarga-dir`
  runs the existing `tools/merge_staged_commentary.py` on it, so the kāvya
  sarga layout is unchanged.

## Layout: why Sarvam

Vision returns one string per page; headings, verse breaks and footnotes are
gone before a scholar sees them. Sarvam Document AI (`tools/sarvam_docai.py`,
`ocr-sarvam.yml`) returns HTML/Markdown with the page's structure kept and
is trained on Indian scripts (`sa-IN`, `kn-IN`). Ten pages per request, a
prepaid balance on dashboard.sarvam.ai; the run records the pages it sent.
It needs a `SARVAM_API_KEY` secret; without one the workflow dry-runs. The
review page renders Sarvam's HTML above the units, so what the scholar sees
is the page as laid out, not a wall of text.

## What is not here yet

- Word-level highlighting on the scan needs bounding boxes, which
  `tools/vision_client.py` drops today (a one-field change, then re-OCR).
- The Upaniṣad ṭippaṇī `blocks.json` files are gitignored; commit them (or
  regenerate on the branch) to review them here.
- `apply_answers.py` output for the ṭippaṇīs still has no importer — this
  page plus the merge tool is the intended replacement for that path.
