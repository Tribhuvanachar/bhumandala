#!/usr/bin/env python3
"""
gemini_dhatu_lexicon.py — AI-generated multilingual meanings + pedagogical
usage notes for every root (dhātu) in the Dhātupāṭha, via Gemini.

WHY THIS EXISTS. The project lead's own dhātu list
(dge/data/vedanga/vyakarana/dhatupatha/data.json, 2,229 roots via vidyut)
already carries a `artha_extra.{hi,en}` gloss merged in from
ashtadhyayi-com/data -- a separate, licensed open-data repo (distinct from
the ashtadhyayi.com WEBSITE commentary removed in the 23 Aug sutrapatha
pass; see dge/PENDING.md), but it is thin (two languages, mixed together
in one field) and not this project's own content. This script generates
genuinely NEW, independently-composed content instead: standard root
equivalents across 11 languages plus a short usage-nuance note, written
fresh by Gemini rather than copied or lightly reworded from any existing
source -- the project lead's own framing of the ask ("won't be in the
same form... enriched additional meanings").

ANTI-HALLUCINATION DESIGN, deliberately stricter than the reference spec
this was commissioned from:
  - Gemini is NOT asked to also re-emit the root/gaṇa/pada/artha/id fields
    this project already holds and has verified -- only the two NEW things
    (meanings, pedagogy). Asking a model to restate data you already trust
    risks it silently drifting from the verified value; DGE's own RAG
    principle elsewhere in this project (see gemini_summarize.py's header)
    is "don't make Gemini guess blind when DGE already has the answer" --
    applied here as "don't make Gemini re-derive an answer DGE already has
    at all."
  - The reference spec this was commissioned from asked for nuances
    "noted in Dhāturūpanandinī" (a real, named traditional commentary).
    This project holds no actual Dhāturūpanandinī text to ground that
    claim in (checked: it is not among the dhātu-specific dictionaries in
    bhumandala-kosha-data -- see PENDING.md's dhātu-meanings-pipeline
    scoping entry), so asking Gemini to attribute its own generated notes
    to that specific named work would risk exactly the kind of
    unverifiable/fabricated scholarly attribution this project's own
    conventions elsewhere (gemini_enrich.py, the citation-verification
    pipeline) exist to prevent. The system instruction below asks for the
    SAME kind of pedagogical content, generated fresh, but forbids
    claiming it reflects any specific named traditional source.
  - No fake śloka/verse citations, no fabricated page numbers or
    bibliographic detail (kept from the reference spec).
  - A language equivalent Gemini isn't genuinely confident of comes back
    literally "(uncertain)", never a plausible-sounding guess.
  - Every output field is labeled to readers as AI-generated (Gemini),
    unreviewed -- see DISPLAY_LABEL below and dge/js/core.js's
    KNOWN_COMMENTARY_LABELS convention used elsewhere in this project.

Mirrors tools/gemini_summarize.py's CLI shape (batch_size/concurrency/
dry-run/checkpointing) and tools/gemini_client.py for the actual Gemini
HTTP/retry/usage-accounting mechanics (shared, not duplicated).

Usage:
  GEMINI_API_KEY=... python3 tools/gemini_dhatu_lexicon.py \
      --dhatus all --concurrency 5 --limit 50   # first smoke-test pass
  python3 tools/gemini_dhatu_lexicon.py --dhatus all --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemini_client import DEFAULT_MODEL, GeminiError, call_gemini  # noqa: E402

DHATUPATHA_PATH = Path("dge/data/vedanga/vyakarana/dhatupatha/data.json")
OUTPUT_PATH = Path("dge/data/vedanga/vyakarana/dhatu_lexicon/data.json")

LANGUAGES = ["English", "Kannada", "Telugu", "Tamil", "Malayalam", "Hindi",
             "Bengali", "German", "French", "Russian", "Chinese"]

DISPLAY_LABEL = "AI Multilingual Meanings (Gemini, unreviewed)"

SYSTEM_INSTRUCTION = (
    "You are a Sanskrit lexicographer producing SUPPLEMENTARY reference "
    "material for a Sanskrit digital library, one verbal root (dhātu) at a "
    "time. You will be given the root's canonical entry -- root, gaṇa, "
    "pada, and its own dhātvārtha (meaning) in Sanskrit -- already verified "
    "by the library. Use these only as context; do not restate, alter, or "
    "second-guess them.\n\n"
    "Produce exactly two things:\n\n"
    "1. `meanings`: for EACH of these 11 languages -- English, Kannada, "
    "Telugu, Tamil, Malayalam, Hindi, Bengali, German, French, Russian, "
    "Chinese -- the standard, everyday equivalent(s) for this root's core "
    "sense, written in ROMAN TRANSLITERATION even for the Indic languages "
    "(never native script), as 3-5 comma-separated short words/phrases, "
    "e.g. 'To be, to exist, to become, to happen'. If you are not "
    "genuinely confident of an accurate equivalent in a language, write "
    "exactly \"(uncertain)\" for that language instead of guessing a "
    "plausible-sounding word -- a wrong lexical equivalent shown to a "
    "learner is worse than an honest gap.\n\n"
    "2. `pedagogy`: a `concept` (one to two simple sentences, for a "
    "school-age student, on how this root's sense shifts across its "
    "common derived forms -- parasmaipada vs ātmanepada, causative, "
    "whichever this SPECIFIC root actually distinguishes; if it has no "
    "such nuance, say so plainly) and 1-3 `scenarios`, each naming one "
    "derived form, the grammatical trigger that produces it, its shifted "
    "meaning, and ONE original example sentence in Sanskrit with its "
    "English translation that YOU compose to illustrate the point. Do NOT "
    "attribute this explanation or these examples to any specific named "
    "traditional commentary (e.g. do not say 'according to "
    "Dhāturūpanandinī' or cite any other named work) -- this is your own "
    "freshly composed teaching material, not a verified quotation, and "
    "must never be presented as one. Do NOT invent a śloka, a citation, a "
    "page number, or any other bibliographic detail anywhere in your "
    "answer. If the root genuinely has no interesting derived-form nuance "
    "worth teaching, return an empty `scenarios` list rather than "
    "inventing one.\n\n"
    "This entire output will be shown to readers labeled \"AI-generated "
    "(Gemini), unreviewed\" -- write accordingly: prioritize being "
    "honestly uncertain over sounding authoritative."
)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "meanings": {
            "type": "object",
            "properties": {lang: {"type": "string"} for lang in LANGUAGES},
            "required": LANGUAGES,
        },
        "pedagogy": {
            "type": "object",
            "properties": {
                "concept": {"type": "string"},
                "scenarios": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "form": {"type": "string"},
                            "grammar_trigger": {"type": "string"},
                            "meaning": {"type": "string"},
                            "example_sanskrit": {"type": "string"},
                            "example_english": {"type": "string"},
                        },
                        "required": ["form", "grammar_trigger", "meaning",
                                      "example_sanskrit", "example_english"],
                    },
                },
            },
            "required": ["concept", "scenarios"],
        },
    },
    "required": ["meanings", "pedagogy"],
}


def build_prompt(entry: dict) -> str:
    return (
        f"Dhātu ID: {entry['id']}\n"
        f"Root (Devanagari): {entry.get('dhatu', '')}\n"
        f"Root (SLP1): {entry.get('dhatu_slp', '')}\n"
        f"Gaṇa: {entry.get('gana', '')}\n"
        f"Pada: {entry.get('pada_iast', entry.get('pada', ''))}\n"
        f"Dhātvārtha (Sanskrit meaning, from the library's own verified data): "
        f"{entry.get('artha', '')}\n"
    )


def call_gemini_for_dhatu(entry: dict, api_key: str, model: str,
                           usage_totals: dict | None = None) -> dict:
    return call_gemini(
        SYSTEM_INSTRUCTION, build_prompt(entry), RESPONSE_SCHEMA,
        api_key, model, temperature=0.2, max_output_tokens=2048,
        usage_totals=usage_totals,
    )


def mock_result(entry: dict) -> dict:
    """Deterministic, network-free stand-in for --dry-run -- exercises the
    merge/checkpoint/labeling mechanics without a real Gemini call, same
    spirit as gemini_summarize.py's mock_analyze_verse()."""
    return {
        "meanings": {lang: f"[dry-run mock] {entry.get('dhatu', '')} ({lang})" for lang in LANGUAGES},
        "pedagogy": {"concept": "[dry-run mock] placeholder -- real notes require a live Gemini call",
                     "scenarios": []},
    }


def load_dhatupatha() -> list[dict]:
    data = json.loads(DHATUPATHA_PATH.read_text(encoding="utf-8"))
    return data["items"]


def load_existing() -> dict:
    """Returns {dhatu_id: item} of already-generated entries, for
    checkpoint/resume -- a re-run only fills in what's missing unless
    --force. Mirrors the reference spec's checkpoint behaviour."""
    if not OUTPUT_PATH.exists():
        return {}
    try:
        data = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {it["id"]: it for it in data.get("items", []) if "id" in it}


def save(existing: dict, model: str, of_total: int) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    items = sorted(existing.values(), key=lambda it: it["id"])
    out = {
        "schema": "dhatu_lexicon",
        "source": ("Gemini (BYOK), AI-generated multilingual meanings and pedagogical "
                    "usage notes -- independently composed, not derived from "
                    "ashtadhyayi.com or any specific traditional commentary. See "
                    "tools/gemini_dhatu_lexicon.py's own docstring."),
        "licence": "AI-generated -- not a quotation from any copyrighted source",
        "display_label": DISPLAY_LABEL,
        "model": model,
        "count": len(items),
        "of_total": of_total,
        "items": items,
    }
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def select_dhatus(all_entries: list[dict], selector: str) -> list[dict]:
    if selector == "all":
        return all_entries
    wanted = set()
    for part in selector.split(","):
        part = part.strip()
        if "-" in part and part.count("-") == 1 and all(p.strip() for p in part.split("-")):
            lo, hi = part.split("-")
            wanted.update({e["id"] for e in all_entries if lo.strip() <= e["id"] <= hi.strip()})
        elif part:
            wanted.add(part)
    return [e for e in all_entries if e["id"] in wanted]


def process_one(entry: dict, api_key: str, model: str, dry_run: bool,
                 usage_totals: dict | None) -> dict:
    result = mock_result(entry) if dry_run else call_gemini_for_dhatu(entry, api_key, model, usage_totals)
    return {"id": entry["id"], "meanings": result.get("meanings", {}),
            "pedagogy": result.get("pedagogy", {}), "model": model}


def run(selector: str, model: str, concurrency: int, limit, dry_run: bool,
        force: bool) -> int:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not dry_run and not api_key:
        print("error: GEMINI_API_KEY is not set (pass --dry-run to test without one)",
              file=sys.stderr)
        return 1

    all_entries = load_dhatupatha()
    existing = load_existing()
    wanted = select_dhatus(all_entries, selector)
    if not force:
        wanted = [e for e in wanted if e["id"] not in existing]
    if limit is not None:
        wanted = wanted[:limit]

    print(f"dhatupatha: {len(all_entries)} roots total | requested: "
          f"{len(select_dhatus(all_entries, selector))} | already done: "
          f"{len(existing)} | this run: {len(wanted)}")
    if not wanted:
        print("Nothing to do.")
        return 0

    usage_totals: dict = {}
    done = 0

    def handle_result(entry: dict, fut_result: dict | None, err: Exception | None):
        nonlocal done
        if err is not None:
            print(f"warning: {entry['id']} ({entry.get('dhatu', '?')}): "
                  f"Gemini call failed: {err}", file=sys.stderr)
            return
        existing[fut_result["id"]] = fut_result
        done += 1
        if done % 25 == 0 or done == len(wanted):
            save(existing, model, len(all_entries))
            print(f"checkpoint: {done}/{len(wanted)} this run "
                  f"({len(existing)}/{len(all_entries)} total)")

    if concurrency <= 1:
        for entry in wanted:
            try:
                res = process_one(entry, api_key, model, dry_run, usage_totals)
                handle_result(entry, res, None)
            except GeminiError as e:
                handle_result(entry, None, e)
    else:
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            future_to_entry = {
                pool.submit(process_one, entry, api_key, model, dry_run, usage_totals): entry
                for entry in wanted
            }
            for future in as_completed(future_to_entry):
                entry = future_to_entry[future]
                try:
                    handle_result(entry, future.result(), None)
                except GeminiError as e:
                    handle_result(entry, None, e)

    save(existing, model, len(all_entries))
    print(f"Total: {done}/{len(wanted)} root(s) generated this run "
          f"({len(existing)}/{len(all_entries)} of the whole Dhātupāṭha now have an entry).")
    if usage_totals:
        model_used = usage_totals.get("model_version") or model
        thoughts = usage_totals.get("thoughts_tokens", 0)
        thoughts_note = f", {thoughts:,} thinking tokens (billed at the output rate)" if thoughts else ""
        print(f"Gemini usage: {usage_totals.get('calls', 0)} call(s), "
              f"{usage_totals.get('prompt_tokens', 0):,} prompt tokens, "
              f"{usage_totals.get('output_tokens', 0):,} output tokens{thoughts_note}, "
              f"{usage_totals.get('total_tokens', 0):,} total tokens "
              f"(model={model_used}, concurrency={concurrency})")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dhatus", default="all",
                    help="'all', a comma list of dhātu ids (e.g. '01.0001,01.0002'), "
                         "or an id range 'lo-hi' (e.g. '01.0001-01.0100')")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--concurrency", type=int, default=5,
                    help="Parallel in-flight requests -- the project lead asked for a "
                         "batch of 5 in-flight at a time. Default 5.")
    p.add_argument("--limit", type=int, default=None,
                    help="Generate at most N roots this run (for a first smoke-test pass)")
    p.add_argument("--dry-run", action="store_true",
                    help="No network call; use a deterministic mock generator instead")
    p.add_argument("--force", action="store_true",
                    help="Re-generate roots that already have an entry")
    args = p.parse_args(argv)
    return run(args.dhatus, args.model, args.concurrency, args.limit, args.dry_run, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
