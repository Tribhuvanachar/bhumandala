#!/usr/bin/env python3
"""
gemini_ocr_commentary.py — server-side pipeline for OCR'ing a scanned
Sanskrit/Kannada commentary PDF and merging it into one kavya canto's
data.json, without the browser-based dge/convert/ admin tool (which has no
server-side equivalent, times out on a real book in a browser tab, and has
no bypass for its manual review step).

Pipeline, per canto: PDF pages -> PNG images (poppler's pdftoppm) -> Google
Cloud Vision OCR (DOCUMENT_TEXT_DETECTION, ports dge/convert/vision.js's
exact request shape via tools/vision_client.py) -> Gemini proofreading
(ports dge/convert/gemini.js's PROOFREAD_PROMPT/schema VERBATIM, including
its per-shloka accept/review/unresolved self-classification -- so a
server-side run reads identically to a browser-tool run) -> merged into
the target sarga's data.json under commentaries[commentary_key].

Deliberately scoped to ONE canto (a page range you supply) per invocation
-- same as tools/link_english_commentary.py's existing convention, and for
the same reason: automatic multi-canto/sarga-boundary splitting across a
whole book is a genuinely harder problem (dge/convert/sarga-detect.js
exists client-side for exactly this) that hasn't been ported here yet. Run
this once per canto with its own --start-page/--end-page.

Classification-gated merge, since this pipeline exists specifically to
bypass dge/convert/'s slow manual review UI: Gemini's own "accept" /
"review" / "unresolved" self-classification (see PROOFREAD_PROMPT) is the
real review signal here. "accept" always merges. "review" and "unresolved"
are held back by default (reported, not merged) -- pass --include-review /
--include-unresolved to merge them anyway (e.g. for a --direct-push run
where you've decided speed matters more than a second look). This is NOT
a step that can be skipped outright: Gemini's proofreading pass IS the
correction step, not an optional add-on -- there is no useful "raw OCR,
unproofread" output to fall back to.

Never invents a shloka: verse count is hard-validated against the target
canto's metadata.totalShlokas before anything is written, matching this
project's "don't fabricate" rule (dge/PROJECT_BRIEF.md rule 4) and
link_english_commentary.py's existing convention.

Usage:
  GEMINI_API_KEY=... VISION_API_KEY=... python3 tools/gemini_ocr_commentary.py \
      --pdf commentary.pdf --start-page 12 --end-page 54 \
      --sarga-dir dge/data/kavya_alankara/raghavendra_vijaya --canto 1 \
      --commentary-key tika_someauthor --display-label "Someone's Sanskrit Tika" \
      --context-anchor "Raghavendra Vijaya, Sanskrit tika by Someone, Sarga 1"
  python3 tools/gemini_ocr_commentary.py --pdf x.pdf --start-page 1 --end-page 3 \
      --sarga-dir ... --canto 1 --commentary-key x --display-label X --dry-run
"""
from __future__ import annotations

import argparse
import base64
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemini_client import DEFAULT_MODEL, GeminiError, call_gemini  # noqa: E402
from vision_client import VisionError, ocr_images_batch  # noqa: E402
from link_english_commentary import load_json, save_json  # noqa: E402

LANGUAGE_HINTS = ["sa", "hi", "kn"]

# Ported VERBATIM from dge/convert/gemini.js's PROOFREAD_PROMPT, minus the
# dual-engine (Vision + Tesseract cross-check) branch -- this pipeline only
# ever has one OCR reading (Vision), so every page is the "no engine label"
# case that prompt already describes.
PROOFREAD_PROMPT = """You are proofreading raw OCR output from a scanned Sanskrit/Kannada devotional text.

Rules:
1. Correct OCR mistakes only (misread characters, broken/merged words, obvious scan artifacts). Do not rewrite, summarize, paraphrase, or "improve" the wording.
2. Preserve Sanskrit and Kannada text exactly as intended -- do not modernize or alter it.
3. Preserve the original paragraph and page order for the actual sentences/lines themselves.
4. Verse-number markers ("॥ १॥", "॥ २॥", ...) are a known weak point of the OCR layer, not something to trust blindly: when verse numbers are printed in their own visual column/margin on the page, OCR can read that whole column as one separate block and splice it back in slightly offset, landing a marker after the wrong shloka's last line. If this looks like what happened -- numbers not incrementing where they visually sit, or a shloka reading oddly short or long compared to its neighbors -- use the markers' own strict sequence (they always increase by exactly 1 within one sarga/chapter) together with where each verse's sense, grammar, and metre naturally complete to reattach each marker to its real shloka boundary. This only changes which existing text belongs under which "number" -- it never means inventing, dropping, or actually reordering the underlying sentences (rule 3 still applies to those).
5. Where distinguishable, identify which portions are the mula shloka (verse) text versus commentary/explanation.
6. Never invent text that isn't grounded in the OCR reading for that page, beyond fixing an obvious small OCR-level error (broken characters, merged words) that context clearly resolves.
7. For every shloka, self-report a "classification":
   - "accept": the reading is unambiguous and plausible as-is.
   - "review": a verse-marker boundary needed reattaching per rule 4, or something else needed a judgment call -- likely correct, but a human should still glance at it.
   - "unresolved": you cannot determine confident text (the reading is implausible, contradictory, or the source itself looks illegible). Keep your best-guess text in "sa" regardless, but do not invent details the reading doesn't actually show.
   Add a brief "note" explaining why, but only when classification is not "accept" -- omit it (empty string) otherwise.
8. Also report which page (the number from the "--- Page N ---" marker) each shloka came from, in "page".
9. Watch for two specific structural problems, since they're easy to miss shloka-by-shloka but matter a lot downstream: (a) a chapter/sarga boundary -- a chapter-opening line ("अथ <ordinal> सर्गः") or a closing colophon ("इति ... <ordinal> सर्गः") -- that looks incomplete, garbled, or only half-legible, since that's exactly what breaks automatic chapter splitting later; (b) one verse's text that looks like it was actually split into two separate shlokas (or two verses merged into one) by a misplaced verse-number marker, beyond what rule 4 above already resolves. When either happens, still give your best-effort corrected text, but set "classification" to "review" and say specifically what you noticed in "note" (e.g. "possible sarga boundary here -- colophon text looks incomplete" or "this may be two verses merged into one shloka"), so a human reviewer sees exactly what to double-check instead of having to re-read everything.
10. Output ONLY valid JSON -- no markdown code fences, no explanations before or after, no trailing commentary.

Output exactly this JSON shape:
{
  "shlokas": [
    { "number": 1, "page": 3, "sa": "corrected shloka text", "commentary": "corrected commentary text, or empty string if none", "classification": "accept", "note": "" }
  ]
}

If a page doesn't cleanly split into shloka/commentary, put the whole corrected text in "sa" and leave "commentary" empty -- do not invent a split that isn't actually there in the source.

Raw OCR input follows:
"""

PROOFREAD_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "shlokas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "number": {"type": "integer"},
                    "page": {"type": "integer"},
                    "sa": {"type": "string"},
                    "commentary": {"type": "string"},
                    "classification": {"type": "string", "enum": ["accept", "review", "unresolved"]},
                    "note": {"type": "string"},
                },
                "required": ["sa", "classification"],
            },
        },
    },
    "required": ["shlokas"],
}


def pdf_pages_to_pngs(pdf_path: Path, start_page: int, end_page: int, out_dir: Path) -> list[Path]:
    """Renders [start_page, end_page] (1-indexed, inclusive) to PNGs via
    poppler's pdftoppm, at a resolution matching dge/convert/pdf.js's
    default render scale (roughly 200dpi -- plenty for Vision OCR on a
    normal scanned book page)."""
    prefix = out_dir / "page"
    subprocess.run(
        ["pdftoppm", "-png", "-r", "200", "-f", str(start_page), "-l", str(end_page), str(pdf_path), str(prefix)],
        check=True, capture_output=True,
    )
    pages = sorted(out_dir.glob("page-*.png"))
    if not pages:
        raise RuntimeError(f"pdftoppm produced no pages for {pdf_path} [{start_page}-{end_page}]")
    return pages


def ocr_pages(page_paths: list[Path], api_key: str, vision_batch_size: int = 10) -> dict[Path, str]:
    """Returns {page_number: raw_ocr_text}, page_number matching start_page
    onward (not the pdftoppm output filename's own numbering quirks)."""
    texts: dict[int, str] = {}
    for i in range(0, len(page_paths), vision_batch_size):
        chunk = page_paths[i:i + vision_batch_size]
        b64s = [base64.b64encode(p.read_bytes()).decode("ascii") for p in chunk]
        results = ocr_images_batch(b64s, api_key, LANGUAGE_HINTS)
        for path, result in zip(chunk, results):
            texts[path] = result["text"]
    return texts


def build_ocr_pages_text(page_texts: dict[Path, str], start_page: int) -> str:
    parts = []
    for idx, path in enumerate(sorted(page_texts.keys())):
        page_num = start_page + idx
        parts.append(f"--- Page {page_num} ---\n{page_texts[path]}")
    return "\n\n".join(parts)


def proofread_batch(ocr_pages_text: str, api_key: str, model: str, context_anchor: str,
                     max_output_tokens: int, usage_totals: dict | None = None) -> dict:
    anchor = f"Context anchor: this text is from {context_anchor}.\n\n" if context_anchor else ""
    prompt = anchor + PROOFREAD_PROMPT + "\n\n" + ocr_pages_text
    return call_gemini(
        "You are a meticulous OCR proofreader for classical Sanskrit/Kannada texts.",
        prompt, PROOFREAD_RESPONSE_SCHEMA, api_key, model,
        temperature=0.1, max_output_tokens=max_output_tokens, usage_totals=usage_totals,
    )


def mock_proofread_batch(ocr_pages_text: str, *args, **kwargs) -> dict:
    """--dry-run stand-in, same spirit as gemini_summarize.py's mock."""
    return {"shlokas": [
        {"number": 1, "page": 1, "sa": "[dry-run mock] " + ocr_pages_text[:40],
         "commentary": "[dry-run mock] commentary placeholder", "classification": "accept", "note": ""},
    ]}


def merge_shlokas(sarga_path: Path, shlokas: list[dict], commentary_key: str, display_label: str,
                   include_review: bool, include_unresolved: bool, force: bool,
                   content_field: str = "commentary") -> dict:
    """Validates shloka count/numbering against the canto's own metadata
    before writing anything -- refuses a mismatched merge rather than
    silently attaching commentary to the wrong verse."""
    data = load_json(sarga_path)
    target_shlokas = data.get("shlokas")
    if not isinstance(target_shlokas, dict):
        raise ValueError(f"{sarga_path}: no top-level 'shlokas' dict -- not the expected legacy shape")

    expected_total = data.get("metadata", {}).get("totalShlokas")
    numbers = [s.get("number") for s in shlokas if s.get("number") is not None]
    if expected_total is not None and numbers and (min(numbers) < 1 or max(numbers) > expected_total):
        raise ValueError(
            f"{sarga_path}: metadata.totalShlokas={expected_total} but proofread output has "
            f"shloka numbers {min(numbers)}-{max(numbers)} -- refusing to merge a mismatched "
            f"canto/page-range rather than silently linking wrong verses"
        )

    linked = held_review = held_unresolved = skipped_existing = skipped_blank = 0
    for s in shlokas:
        n = s.get("number")
        if n is None:
            continue
        n_str = str(n)
        shloka = target_shlokas.get(n_str)
        if shloka is None:
            raise ValueError(f"{sarga_path}: proofread output has verse {n_str} but this canto has no such shloka")

        classification = s.get("classification", "unresolved")
        if classification == "review" and not include_review:
            held_review += 1
            continue
        if classification == "unresolved" and not include_unresolved:
            held_unresolved += 1
            continue

        text = (s.get(content_field) or "").strip()
        if not text:
            skipped_blank += 1
            continue
        commentaries = shloka.setdefault("commentaries", {})
        if commentary_key in commentaries and not force:
            skipped_existing += 1
            continue
        commentaries[commentary_key] = text
        linked += 1

    if linked:
        avail = data.setdefault("metadata", {}).setdefault("availableCommentaries", {})
        avail[commentary_key] = display_label
        save_json(sarga_path, data)

    return {
        "linked": linked, "held_review": held_review, "held_unresolved": held_unresolved,
        "skipped_existing": skipped_existing, "skipped_blank": skipped_blank,
    }


def run(pdf: Path, start_page: int, end_page: int, sarga_dir: Path, canto: int,
        commentary_key: str, display_label: str, context_anchor: str, model: str,
        pages_per_gemini_batch: int, include_review: bool, include_unresolved: bool,
        force: bool, dry_run: bool, content_field: str = "commentary") -> int:
    sarga_path = sarga_dir / f"sarga_{canto}" / "data.json"
    if not sarga_path.exists():
        print(f"error: {sarga_path} does not exist", file=sys.stderr)
        return 1

    api_key = os.environ.get("GEMINI_API_KEY")
    vision_key = os.environ.get("VISION_API_KEY")
    if not dry_run and (not api_key or not vision_key):
        print("error: GEMINI_API_KEY and VISION_API_KEY must both be set (pass --dry-run to test without them)",
              file=sys.stderr)
        return 1

    all_shlokas: list[dict] = []
    usage_totals: dict = {}

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        if dry_run:
            page_paths = [tmp_path / f"page-{i:03d}.png" for i in range(start_page, end_page + 1)]
            for p in page_paths:
                p.write_bytes(b"")
            page_texts = {p: f"[dry-run mock OCR text for {p.name}]" for p in page_paths}
        else:
            print(f"Rendering pages {start_page}-{end_page} of {pdf} ...")
            page_paths = pdf_pages_to_pngs(pdf, start_page, end_page, tmp_path)
            print(f"Running Vision OCR on {len(page_paths)} page(s) ...")
            page_texts = ocr_pages(page_paths, vision_key)

        page_list = sorted(page_texts.keys())
        for i in range(0, len(page_list), pages_per_gemini_batch):
            batch_pages = page_list[i:i + pages_per_gemini_batch]
            batch_start_page = start_page + i
            batch_text = build_ocr_pages_text({p: page_texts[p] for p in batch_pages}, batch_start_page)
            print(f"Proofreading pages {batch_start_page}-{batch_start_page + len(batch_pages) - 1} ...")
            try:
                if dry_run:
                    result = mock_proofread_batch(batch_text)
                else:
                    result = proofread_batch(batch_text, api_key, model, context_anchor,
                                              max_output_tokens=16384, usage_totals=usage_totals)
            except GeminiError as e:
                print(f"error: proofreading pages {batch_start_page}+ failed ({e.kind}): {e}", file=sys.stderr)
                return 1
            all_shlokas.extend(result.get("shlokas") or [])

    report = merge_shlokas(sarga_path, all_shlokas, commentary_key, display_label,
                            include_review, include_unresolved, force, content_field)
    print(f"canto {canto}: linked {report['linked']}, "
          f"held back {report['held_review']} review + {report['held_unresolved']} unresolved "
          f"(rerun with --include-review/--include-unresolved to merge them anyway), "
          f"skipped {report['skipped_existing']} already-linked, {report['skipped_blank']} blank")
    if usage_totals:
        print(f"Gemini usage: {usage_totals.get('calls', 0)} call(s), "
              f"{usage_totals.get('total_tokens', 0):,} total tokens "
              f"(model={usage_totals.get('model_version') or model})")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--pdf", required=True, type=Path)
    p.add_argument("--start-page", required=True, type=int)
    p.add_argument("--end-page", required=True, type=int)
    p.add_argument("--sarga-dir", required=True, type=Path)
    p.add_argument("--canto", required=True, type=int)
    p.add_argument("--commentary-key", required=True,
                    help="Key under shlokas[n].commentaries to write into (e.g. tika_someauthor)")
    p.add_argument("--display-label", required=True,
                    help="Human-readable label written to metadata.availableCommentaries")
    p.add_argument("--context-anchor", default="",
                    help='e.g. "Raghavendra Vijaya, Sanskrit tika by X, Sarga 1" -- helps Gemini '
                         "resolve ambiguous OCR against real context instead of guessing blind")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--pages-per-batch", type=int, default=6,
                    help="Pages per Gemini proofreading call (6 confirmed to complete cleanly "
                         "on real dense kavya text; going much higher risks hitting max output tokens)")
    p.add_argument("--include-review", action="store_true",
                    help="Also merge shlokas Gemini classified 'review' (a judgment call was made)")
    p.add_argument("--include-unresolved", action="store_true",
                    help="Also merge shlokas Gemini classified 'unresolved' (low confidence)")
    p.add_argument("--force", action="store_true",
                    help="Overwrite a verse's commentary even if already present")
    p.add_argument("--dry-run", action="store_true",
                    help="No network/poppler calls; use deterministic mocks instead")
    p.add_argument("--content-field", default="commentary", choices=["commentary", "sa"],
                    help="Which of Gemini's proofread fields to merge as this commentary's text. "
                         "'commentary' (default) is right for a tika/bhashya PDF -- the mula shloka "
                         "is already in the corpus, so only the explanation text is new. Use 'sa' "
                         "only if this PDF is itself a mula-text source with no separate commentary.")
    args = p.parse_args(argv)

    return run(args.pdf, args.start_page, args.end_page, args.sarga_dir, args.canto,
               args.commentary_key, args.display_label, args.context_anchor, args.model,
               args.pages_per_batch, args.include_review, args.include_unresolved,
               args.force, args.dry_run, args.content_field)


if __name__ == "__main__":
    raise SystemExit(main())
