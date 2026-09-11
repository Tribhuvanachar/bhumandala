#!/usr/bin/env python3
"""Regenerates RV 1.1's Krama-patha from DGE's own Pada-patha/Samhita-patha
data, computationally, using krama_engine.generate_verse() -- no hardcoded
verse/pair/Parigraha strings. This is the direct response to the reviewed
spec's success criterion (11 Sep 2026): "Delete the manually supplied RV 1.1
pair strings and Parigraha strings, regenerate RV 1.1 entirely from DGE
Pada/Samhita, and obtain the same result ... with every nontrivial
transformation traceable to an actual sutra."

Input: dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_01/data.json,
items 1.1.1-1.1.9 ONLY (pada_patha, samhita_patha fields). Nothing else from
that file, and no per-verse word lists typed by hand anywhere in this script.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from krama_engine import split_into_ardharcas, generate_verse  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SAMHITA_PATH = ROOT / "dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_01/data.json"
OLD_OUTPUT_PATH = ROOT / "dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/krama_generated_output.json"
OUT_PATH = ROOT / "dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/krama_regenerated_output.json"

ACCENT_MARKS = "॒॑"


def strip_accents(s):
    return "".join(ch for ch in s if ch not in ACCENT_MARKS)


def split_pada_words(pada_patha_stripped):
    """pada_patha uses '।' between words within a pada and '॥' verse-final.
    Both are word separators here; strip whitespace per token."""
    text = pada_patha_stripped.replace("॥", "।")
    words = [w.strip() for w in text.split("।")]
    return [w for w in words if w]


def load_verses():
    data = json.loads(SAMHITA_PATH.read_text(encoding="utf-8"))
    by_id = {it["id"]: it for it in data["items"]}
    verse_ids = [f"1.1.{n}" for n in range(1, 10)]
    verses = []
    for vid in verse_ids:
        item = by_id[vid]
        pada_stripped = strip_accents(item["pada_patha"])
        samhita_stripped = strip_accents(item["samhita_patha"])
        pada_words = split_pada_words(pada_stripped)
        verses.append({"id": vid, "pada_words": pada_words, "samhita_patha_stripped": samhita_stripped})
    return verses


def regenerate_all():
    verses = load_verses()
    out_items = []
    for v in verses:
        ardharcas, split_method = split_into_ardharcas(v["id"], v["pada_words"], v["samhita_patha_stripped"])
        units_per_ardharca = generate_verse(ardharcas)
        out_items.append({
            "id": v["id"],
            "pada_words": v["pada_words"],
            "ardharca_split_method": split_method,
            "ardharcas": [
                {"pada_words": words, "units": units}
                for words, units in zip(ardharcas, units_per_ardharca)
            ],
        })
    return out_items


def flatten_pair_and_parigraha_texts(item):
    """For comparison against the old hand-aligned output: returns the
    sequence of unit "text" strings in recitation order across all
    ardharcas of one verse."""
    texts = []
    for ardharca in item["ardharcas"]:
        for u in ardharca["units"]:
            texts.append(u["text"])
    return texts


def compare_against_old(new_items):
    if not OLD_OUTPUT_PATH.exists():
        return None
    old_data = json.loads(OLD_OUTPUT_PATH.read_text(encoding="utf-8"))
    old_by_id = {it["id"]: it for it in old_data["items"]}
    report = []
    for new_item in new_items:
        vid = new_item["id"]
        old_item = old_by_id.get(vid)
        if old_item is None:
            report.append({"id": vid, "status": "NO_OLD_VERSION"})
            continue
        new_texts = flatten_pair_and_parigraha_texts(new_item)
        old_texts = flatten_pair_and_parigraha_texts(old_item)
        matches = []
        max_len = max(len(new_texts), len(old_texts))
        for i in range(max_len):
            nt = new_texts[i] if i < len(new_texts) else None
            ot = old_texts[i] if i < len(old_texts) else None
            matches.append({"index": i, "old": ot, "new": nt, "match": nt == ot})
        n_match = sum(1 for m in matches if m["match"])
        report.append({
            "id": vid,
            "old_unit_count": len(old_texts),
            "new_unit_count": len(new_texts),
            "matching_units": n_match,
            "status": "EXACT_MATCH" if (n_match == max_len and len(old_texts) == len(new_texts)) else "DIFFERS",
            "diffs": [m for m in matches if not m["match"]],
        })
    return report


def build_counts(new_items):
    counts = {"pada_count": 0, "pair_count": 0, "parigraha_count": 0,
              "ardharca_count": 0, "special_exception_count": 0, "unresolved_count": 0}
    for item in new_items:
        for ardharca in item["ardharcas"]:
            counts["ardharca_count"] += 1
            counts["pada_count"] += len(ardharca["pada_words"])
            for u in ardharca["units"]:
                if u["type"] == "pair":
                    counts["pair_count"] += 1
                elif u["type"] == "parigraha":
                    counts["parigraha_count"] += 1
                elif u["type"] in ("monosyllable_retake_tri_unit", "monosyllable_confirm_pair"):
                    counts["special_exception_count"] += 1
                if u.get("confidence") == "low":
                    counts["unresolved_count"] += 1
    return counts


def main():
    new_items = regenerate_all()
    comparison = compare_against_old(new_items)
    counts = build_counts(new_items)

    out = {
        "schema": "generic",
        "note": "Krama-patha for RV 1.1 (all 9 verses) computed by "
                "tools/pratishakhya/krama_engine.py (real sandhi engine + predicate "
                "classifiers) directly from DGE's Pada-patha/Samhita-patha, per the "
                "reviewed spec's success criterion. No per-verse pair or Parigraha "
                "strings are hardcoded anywhere in this pipeline; the only per-verse "
                "manual input is the two ardharca-split overrides in krama_engine.py's "
                "ARDHARCA_SPLIT_OVERRIDES, logged there with the reason each was needed.",
        "engine_source": "tools/pratishakhya/krama_engine.py",
        "pada_samhita_source": "dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_01/data.json",
        "counts": counts,
        "comparison_against_hand_aligned_output": comparison,
        "items": new_items,
    }
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print("\n=== Counts ===")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    print("\n=== Comparison against hand-aligned krama_generated_output.json ===")
    if comparison is None:
        print("  (old output file not found)")
    else:
        for r in comparison:
            print(f"  {r['id']}: {r['status']} ({r.get('matching_units')}/{r.get('old_unit_count')} units match)")
            for d in r.get("diffs", []):
                print(f"      unit {d['index']}: OLD={d['old']!r}  NEW={d['new']!r}")


if __name__ == "__main__":
    main()
