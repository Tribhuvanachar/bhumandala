#!/usr/bin/env python3
"""Build dge/data/vedanga/vyakarana/ashtadhyayi/kaumudi_order/data.json -- a
partial correspondence between the standard Ashtadhyayi sutra numbering
(1.1.1, 1.1.2, ...) and Siddhanta Kaumudi's own reading order, from
ashtadhyayi-com/data's ska/data.txt (Siddhanta Kaumudi's own text, in ITS
reading order, not Panini's 8-adhyaya order).

DELIBERATELY PARTIAL, not a bug: matching by exact sutra text (after
normalizing spacing/punctuation) only correlates about 1,100 of the corpus's
~3,962 sutras. The rest genuinely don't restate their own words anywhere in
Kaumudi's text -- Kaumudi very often carries a rule forward only through
anuvrtti (grammatical inheritance from the previous sutra) rather than
re-quoting it, and a minority of the sutras that ARE restated use a
different traditional reading than the Kashika-based text this repo's own
sutrapatha follows (e.g. 1.1.7 is "halo 'nantarah samyogah" here vs
Kaumudi's "halo mithah slishtah samyogah" -- a real textual variant, not an
error). Fuzzier matching (substring containment) pushes coverage to about
42% but risks false positives on short sutras, so this script does not use
it -- an absent entry means "not confidently known," not "does not exist in
Kaumudi."

Usage:
    python3 tools/build_kaumudi_order.py /path/to/ashtadhyayi-com/data
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

SOURCE_NOTE = ("ashtadhyayi-com/data (github.com/ashtadhyayi-com/data, commit 24109f7, "
               "ska/data.txt -- \"ska_sutrapath\"); its README: \"free to use ... provided "
               "that appropriate credits are mentioned\".")

REPO_ROOT = Path(__file__).resolve().parent.parent
SUTRAPATHA_PATH = REPO_ROOT / "dge/data/vedanga/vyakarana/ashtadhyayi/sutrapatha/data.json"
OUT_PATH = REPO_ROOT / "dge/data/vedanga/vyakarana/ashtadhyayi/kaumudi_order/data.json"


def norm(s):
    s = unicodedata.normalize("NFC", s).strip()
    s = s.replace("॰", "")
    return re.sub(r"[।॥,\-.\s]+", "", s)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src_root = Path(sys.argv[1])
    ska_path = src_root / "ska" / "data.txt"
    if not ska_path.exists():
        print(f"Not found: {ska_path}")
        sys.exit(1)

    sutras = json.loads(SUTRAPATHA_PATH.read_text(encoding="utf-8"))["items"]
    ska = json.loads(ska_path.read_text(encoding="utf-8"))["data"]

    by_text = {}
    for row in sutras:
        by_text.setdefault(norm(row["sanskrit_text"]), row["id"])

    matched = {}  # sutra id -> Kaumudi's own sequence index (first occurrence wins)
    for row in ska:
        sid = by_text.get(norm(row["s"]))
        if sid and sid not in matched:
            matched[sid] = row["ind"]

    items = [{"id": sid, "kaumudiIndex": ind}
             for sid, ind in sorted(matched.items(), key=lambda kv: kv[1])]

    out = {
        "_readme": [
            "A partial correspondence between the standard Ashtadhyayi sutra numbering",
            "(1.1.1, 1.1.2, ...) and Siddhanta Kaumudi's own reading order",
            "(kaumudiIndex, 1-6481), for sutras where this repo's sutrapatha text and",
            "Kaumudi's own citation of that sutra match exactly after normalizing",
            "spacing/punctuation.",
            "",
            f"Source: {SOURCE_NOTE}",
            "which is Siddhanta Kaumudi's own text in ITS reading order -- the same",
            "sutra can appear at multiple Kaumudi positions (it is cited wherever it is",
            "topically relevant); kaumudiIndex here is its FIRST such position.",
            "",
            f"DELIBERATELY INCOMPLETE, on purpose, not an oversight: only "
            f"{len(items)} of {len(sutras)} sutras are covered -- see this script's",
            "own module docstring (tools/build_kaumudi_order.py) for why, and why a",
            "looser fuzzy match was not used instead.",
            "",
            "Regenerate with tools/build_kaumudi_order.py if either source updates.",
            "Do not hand-edit -- fix the matching/normalization in that script instead."
        ],
        "source": "https://github.com/ashtadhyayi-com/data (ska/data.txt)",
        "totalSutras": len(sutras),
        "matchedCount": len(items),
        "items": items
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_PATH} with {len(items)}/{len(sutras)} sutras matched "
          f"({100 * len(items) / len(sutras):.1f}%)")


if __name__ == "__main__":
    main()
