#!/usr/bin/env python3
"""
gemini_summarize.py — batch padaccheda/anvaya/summary generation for one
kavya's per-canto (sarga) data.json files, using Gemini.

Part of the Raghavendra Vijaya ingestion (see dge/PENDING.md). Unlike
tools/gemini_enrich.py (which detects citations and cross-validates them
against the corpus), this script's task has no local-verification step:
padaccheda (word-split), anvaya (prose word-order) and a plain-language
summary are Gemini's own linguistic analysis of one verse, not a claim
about the outside world tools/reference_resolution could check. So the
safety principle here is narrower and different: give Gemini everything
DGE already knows about the verse (the Sanskrit text, and the corpus's own
linked English translation if one exists) rather than asking it to
translate blind, and label every output as AI-generated and unreviewed
(see the gemini_padaccheda/gemini_anvaya/gemini_summary entries in
dge/js/core.js's KNOWN_COMMENTARY_LABELS) so a reader never mistakes a
first-pass model output for a vetted commentary.

Mirrors tools/gemini_enrich.py's CLI shape and tools/gemini_client.py for
the actual HTTP/retry/error-classification mechanics (shared, not
duplicated -- see that module).

Usage:
  GEMINI_API_KEY=... python3 tools/gemini_summarize.py \
      --sarga-dir dge/data/kavya_alankara/raghavendra_vijaya --cantos 1-10
  python3 tools/gemini_summarize.py --sarga-dir ... --cantos 1 --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemini_client import (  # noqa: E402
    DEFAULT_MODEL, GeminiError, call_gemini,
)
from link_english_commentary import load_json, save_json  # noqa: E402

SYSTEM_INSTRUCTION = (
    "You are assisting a Sanskrit digital library (DGE) in analysing one "
    "verse at a time from a Sanskrit kavya (Raghavendra Vijaya, a devotional "
    "epic). You will be given the verse's Sanskrit text, and -- when the "
    "library already has one -- a published English translation of it. Use "
    "that translation as context to keep your analysis faithful to the "
    "verse's actual meaning; do not let it substitute for genuinely reading "
    "the Sanskrit. Produce three things: (1) padaccheda -- the verse split "
    "into its individual words with sandhi resolved, in Devanagari, words "
    "separated by spaces; (2) anvaya -- the same words rearranged into "
    "plain prose (subject-object-verb) word order, in Devanagari, to aid "
    "comprehension; (3) a concise one-to-two sentence summary in English of "
    "what the verse says. If you cannot confidently produce one of these "
    "for this verse (e.g. the text is too corrupt/ambiguous), say so plainly "
    "in that field rather than guessing -- do not fabricate a plausible-"
    "looking analysis."
)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "padaccheda": {"type": "string"},
        "anvaya": {"type": "string"},
        "summary": {"type": "string"},
    },
    "required": ["padaccheda", "anvaya", "summary"],
}

FIELD_TO_KEY = {
    "padaccheda": "gemini_padaccheda",
    "anvaya": "gemini_anvaya",
    "summary": "gemini_summary",
}


def build_prompt(sanskrit_text: str, english_translation: str | None) -> str:
    parts = [f"Sanskrit verse:\n{sanskrit_text}"]
    if english_translation:
        parts.append(f"\nExisting published English translation (for context only):\n{english_translation}")
    return "\n".join(parts)


def call_gemini_for_verse(sanskrit_text: str, english_translation, api_key: str, model: str) -> dict:
    return call_gemini(
        SYSTEM_INSTRUCTION,
        build_prompt(sanskrit_text, english_translation),
        RESPONSE_SCHEMA,
        api_key,
        model,
        temperature=0.2,
        max_output_tokens=2048,
    )


def mock_analyze_verse(sanskrit_text: str, english_translation) -> dict:
    """Deterministic, network-free stand-in for call_gemini_for_verse(),
    used by --dry-run. Does NOT attempt real padaccheda/anvaya (that needs
    actual language understanding) -- it exists only to exercise the
    merge/labeling/idempotency mechanics of this script without a network
    call, same spirit as gemini_enrich.py's mock_detect_citations."""
    return {
        "padaccheda": f"[dry-run mock] {sanskrit_text}",
        "anvaya": f"[dry-run mock] {sanskrit_text}",
        "summary": "[dry-run mock] summary placeholder -- real analysis requires a live Gemini call",
    }


def analyze_shloka(shloka: dict, api_key, model: str, dry_run: bool, force: bool,
                    fields) -> bool:
    """Mutates `shloka["commentaries"]` in place. Returns True if changed."""
    commentaries = shloka.setdefault("commentaries", {})
    missing = [f for f in fields if force or FIELD_TO_KEY[f] not in commentaries]
    if not missing:
        return False

    sanskrit_text = shloka.get("sa", "")
    if not sanskrit_text.strip():
        return False
    english_translation = commentaries.get("pavamanacharya_english")

    if dry_run:
        result = mock_analyze_verse(sanskrit_text, english_translation)
    else:
        result = call_gemini_for_verse(sanskrit_text, english_translation, api_key, model)

    changed = False
    for field in missing:
        value = (result.get(field) or "").strip()
        if value:
            commentaries[FIELD_TO_KEY[field]] = value
            changed = True
    return changed


def run(sarga_dir: Path, cantos, model: str, dry_run: bool, force: bool,
        limit, fields) -> int:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not dry_run and not api_key:
        print("error: GEMINI_API_KEY is not set (pass --dry-run to test without one)",
              file=sys.stderr)
        return 1

    total_changed = 0
    total_considered = 0
    for n in cantos:
        sarga_path = sarga_dir / f"sarga_{n}" / "data.json"
        if not sarga_path.exists():
            print(f"error: {sarga_path} does not exist", file=sys.stderr)
            return 1
        data = load_json(sarga_path)
        shlokas = data.get("shlokas")
        if not isinstance(shlokas, dict):
            print(f"error: {sarga_path} has no top-level 'shlokas' dict", file=sys.stderr)
            return 1

        canto_changed = 0
        for n_str in sorted(shlokas.keys(), key=int):
            if limit is not None and total_considered >= limit:
                break
            shloka = shlokas[n_str]
            try:
                if analyze_shloka(shloka, api_key, model, dry_run, force, fields):
                    canto_changed += 1
                total_considered += 1
            except GeminiError as e:
                print(f"warning: canto {n} verse {n_str}: Gemini call failed ({e.kind}): {e}",
                      file=sys.stderr)

        if canto_changed:
            # add/refresh display labels for whichever fields this run touched
            avail = data.setdefault("metadata", {}).setdefault("availableCommentaries", {})
            labels = {
                "gemini_padaccheda": "AI Padaccheda (Gemini, unreviewed)",
                "gemini_anvaya": "AI Anvaya (Gemini, unreviewed)",
                "gemini_summary": "AI Summary (Gemini, unreviewed)",
            }
            for field in fields:
                avail[FIELD_TO_KEY[field]] = labels[FIELD_TO_KEY[field]]
            save_json(sarga_path, data)
        total_changed += canto_changed
        print(f"canto {n}: analyzed {canto_changed} verse(s)")

    print(f"Total: {total_changed}/{total_considered} verse(s) analyzed across {len(cantos)} canto(s)")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--sarga-dir", required=True, type=Path,
                    help="Directory containing sarga_N/data.json subfolders")
    p.add_argument("--cantos", default="1-10",
                    help="Canto range or comma list, e.g. '1-10' or '1,3,5'")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--dry-run", action="store_true",
                    help="No network call; use a deterministic mock analyzer instead")
    p.add_argument("--force", action="store_true",
                    help="Re-analyze verses that already carry these commentary keys")
    p.add_argument("--limit", type=int, default=None,
                    help="Analyze at most N verses total (for a first pass / smoke test)")
    p.add_argument("--fields", default="padaccheda,anvaya,summary",
                    help="Comma list of which of padaccheda/anvaya/summary to generate")
    args = p.parse_args(argv)

    cantos = []
    for part in args.cantos.split(","):
        part = part.strip()
        if "-" in part:
            lo, hi = part.split("-")
            cantos.extend(range(int(lo), int(hi) + 1))
        else:
            cantos.append(int(part))
    fields = [f.strip() for f in args.fields.split(",") if f.strip()]
    for f in fields:
        if f not in FIELD_TO_KEY:
            print(f"error: unknown field '{f}' (expected one of {sorted(FIELD_TO_KEY)})", file=sys.stderr)
            return 1

    return run(args.sarga_dir, cantos, args.model, args.dry_run, args.force, args.limit, fields)


if __name__ == "__main__":
    raise SystemExit(main())
