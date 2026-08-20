#!/usr/bin/env python3
"""
gemini_enrich.py — batch reference/citation enrichment for one grantha's
data.json.

This exists because of a reviewed AI-architecture proposal (see
dge/PENDING.md, "Gemini-enrichment pipeline") whose central point is: Gemini
should identify quotations and citations embedded in commentary prose, but
DGE's own corpus -- not Gemini -- decides whether a proposed source is real.
So the flow here is:

  1. For each item's Sanskrit text, ask Gemini to flag quoted/cited spans
     (narrow task: "is this a quotation, and if so what does it look like",
     not "tell me everything about this text").
  2. Discard any span Gemini returns that is not an exact, verbatim substring
     of the input -- this project's "don't fabricate" rule (see
     dge/PROJECT_BRIEF.md) applies to Gemini's own claimed quotation, not
     just to the source it guesses for it.
  3. Run every surviving span through tools/reference_resolution -- the local,
     network-free resolver -- to get a confidence-tiered verdict: verified /
     possible / unresolved, never "Gemini said so".
  4. Write the result back as an additive `gemini_enrichment` block (segments
     + a references map) that dge/js/footnote-engine.js renders as footnotes.
     Nothing else about the item is touched.

Usage:
  GEMINI_API_KEY=... python3 tools/gemini_enrich.py --target dge/data/.../data.json
  python3 tools/gemini_enrich.py --target dge/data/.../data.json --dry-run

Mirrors dge/js/gemini.js's request shape and its (deliberately retry-less)
one-fallback-attempt error handling -- see dge/GEMINI_ERROR_HANDLING.md for
why this codebase does not build a backoff loop around Gemini's own quota
errors. Uses only the standard library (urllib) -- no new dependency.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reference_resolution import ReferenceResolver  # noqa: E402

API_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
DEFAULT_MODEL = "gemini-flash-latest"
FALLBACK_MODEL = "gemini-flash-lite-latest"
# same three kinds dge/js/gemini.js falls back on -- see shouldFallback() there
FALLBACK_ELIGIBLE = {"quota", "model_missing", "overloaded"}

SYSTEM_INSTRUCTION = (
    "You are assisting a Sanskrit digital library (DGE) in identifying "
    "quotations and citations embedded in commentary prose. The library "
    "already holds its own text corpus and will independently verify any "
    "source you propose, so you do not need to be certain of the source -- "
    "only to flag genuine quotations/citations and give your best guess at "
    "their origin, or omit the guess if you have none. Do not invent or "
    "paraphrase: quoted_text must be an EXACT, VERBATIM substring of the "
    "given passage -- same characters, same punctuation, same word order."
)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "citations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "quoted_text": {"type": "string"},
                    "type": {"type": "string", "enum": ["quotation", "citation", "allusion"]},
                    "source_guess": {"type": "string"},
                },
                "required": ["quoted_text", "type"],
            },
        }
    },
    "required": ["citations"],
}


class GeminiError(Exception):
    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind


def classify_error(status: int) -> str:
    # same status -> kind mapping as dge/js/gemini.js's classifyError()
    if status == 400:
        return "bad_request"
    if status in (401, 403):
        return "permission"
    if status == 404:
        return "model_missing"
    if status == 429:
        return "quota"
    if status in (500, 503):
        return "overloaded"
    return "unknown"


def build_prompt(text: str) -> str:
    return (
        "Find every quotation, citation, or clear allusion to another text "
        "embedded in this Sanskrit commentary passage (look for quote marks "
        "like ‘’ or “”, an iti-quotative, or a recognizable proverb/verse "
        "fragment). For each one, give the exact verbatim quoted span, its "
        "type, and -- only if you have a real guess -- the work it is "
        "likely from.\n\nPassage:\n" + text
    )


def _post(model: str, body: dict, api_key: str) -> dict:
    url = API_URL_TMPL.format(model=model, key=api_key)
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise GeminiError(classify_error(e.code), f"HTTP {e.code}: {detail[:300]}")
    except urllib.error.URLError as e:
        raise GeminiError("network", str(e.reason))
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise GeminiError("bad_response", f"could not parse Gemini response: {e}")


def call_gemini(text: str, api_key: str, model: str = DEFAULT_MODEL) -> dict:
    """One attempt against `model`; one fallback attempt against
    FALLBACK_MODEL only for quota/model_missing/overloaded -- deliberately no
    retry/backoff loop beyond that, matching dge/js/gemini.js's generate()."""
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": build_prompt(text)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
        },
    }
    try:
        return _post(model, body, api_key)
    except GeminiError as e:
        if e.kind in FALLBACK_ELIGIBLE and model != FALLBACK_MODEL:
            return _post(FALLBACK_MODEL, body, api_key)
        raise


_MOCK_QUOTE_RE = re.compile(r"[‘']([^’']{8,300})[’']")


def mock_detect_citations(text: str) -> dict:
    """Deterministic, network-free stand-in for call_gemini(), used by
    --dry-run. Finds multi-word spans wrapped in Unicode single quotes --
    a real Gemini call would catch far more (iti-quotatives, unmarked
    proverbs, etc) and would not need the length/space heuristic below,
    since it judges by meaning rather than punctuation. This commentary
    style also uses single quotes to gloss individual terms being
    explained (not just to mark quotations), so a short quoted span with no
    internal space is almost always a gloss, not a citation -- excluded here
    to keep the mock's false-positive rate reasonable; real Gemini calls
    make this judgment semantically instead. This exists to exercise the
    resolution+footnote pipeline without network access, not to replace
    real semantic detection."""
    return {
        "citations": [
            {"quoted_text": m.group(1), "type": "quotation", "source_guess": ""}
            for m in _MOCK_QUOTE_RE.finditer(text)
            if " " in m.group(1).strip()
        ]
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _primary_text(item: dict) -> str:
    return item.get("sanskrit_text") or item.get("samhita_patha") or item.get("sa") or ""


def enrich_item(item: dict, resolver: ReferenceResolver, api_key, model: str,
                 dry_run: bool, ref_counter: list[int]) -> bool:
    """Mutates `item` in place, adding a `gemini_enrichment` block. Returns
    True if the item was changed (false for empty/blank items, left alone)."""
    text = _primary_text(item)
    if not text.strip():
        return False

    if dry_run:
        gemini_result = mock_detect_citations(text)
        model_used = "dry-run-mock"
    else:
        gemini_result = call_gemini(text, api_key, model)
        model_used = model

    citations = gemini_result.get("citations") or []

    # keep only citations whose quoted_text is a real, verbatim substring
    spans = []
    for c in citations:
        quoted = (c.get("quoted_text") or "").strip()
        if not quoted:
            continue
        idx = text.find(quoted)
        if idx < 0:
            continue  # Gemini paraphrased or hallucinated the span -- discard
        spans.append((idx, idx + len(quoted), quoted, c))
    spans.sort(key=lambda s: s[0])

    # drop overlapping spans, keeping the earliest-starting one
    kept = []
    last_end = -1
    for span in spans:
        if span[0] < last_end:
            continue
        kept.append(span)
        last_end = span[1]

    segments = []
    references = {}
    cursor = 0
    for start, end, quoted, c in kept:
        if start > cursor:
            segments.append({"text": text[cursor:start]})
        ref_counter[0] += 1
        ref_id = f"ref-{ref_counter[0]:06d}"
        resolved = resolver.resolve({
            "quoted_text": quoted,
            "source_guess": c.get("source_guess") or None,
        })
        references[ref_id] = {
            "quoted_text": quoted,
            "type": c.get("type", "quotation"),
            "source_guess": c.get("source_guess") or None,
            **resolved.to_dict(),
        }
        segments.append({"text": quoted, "reference_ids": [ref_id]})
        cursor = end
    if cursor < len(text):
        segments.append({"text": text[cursor:]})
    if not segments:
        segments = [{"text": text}]

    item["gemini_enrichment"] = {
        "generated_at": _now_iso(),
        "model": model_used,
        "segments": segments,
        "references": references,
    }
    return True


def run(target: Path, limit, model: str, dry_run: bool, force: bool) -> int:
    with open(target, encoding="utf-8") as fh:
        data = json.load(fh)

    items = data.get("items")
    if not isinstance(items, list):
        print(f"error: {target} has no top-level 'items' array "
              f"(legacy shloka-nested files aren't supported by this script yet)",
              file=sys.stderr)
        return 1

    api_key = os.environ.get("GEMINI_API_KEY")
    if not dry_run and not api_key:
        print("error: GEMINI_API_KEY is not set (pass --dry-run to test without one)",
              file=sys.stderr)
        return 1

    resolver = ReferenceResolver()
    ref_counter = [0]
    changed = 0
    considered = 0
    for item in items:
        if limit is not None and considered >= limit:
            break
        if item.get("gemini_enrichment") and not force:
            continue
        considered += 1
        try:
            if enrich_item(item, resolver, api_key, model, dry_run, ref_counter):
                changed += 1
        except GeminiError as e:
            print(f"warning: {item.get('id')}: Gemini call failed ({e.kind}): {e}",
                  file=sys.stderr)

    if changed:
        with open(target, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=1)
        print(f"Enriched {changed}/{considered} considered item(s) in {target}")
    else:
        print(f"No changes ({considered} item(s) considered).")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--target", required=True, help="Path to a grantha's data.json")
    p.add_argument("--limit", type=int, default=None,
                    help="Enrich at most N not-yet-enriched items (for a first pass / smoke test)")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--dry-run", action="store_true",
                    help="No network call; use a deterministic mock detector instead")
    p.add_argument("--force", action="store_true",
                    help="Re-enrich items that already carry a gemini_enrichment block")
    args = p.parse_args(argv)
    return run(Path(args.target), args.limit, args.model, args.dry_run, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
