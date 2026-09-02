#!/usr/bin/env python3
"""
merge_staged_vasu_kaumudi.py — Stage 2 of the Vasu Siddhānta-Kaumudī
pipeline: reads Stage-1 staged files (tools/vasu_kaumudi_ocr.py) and
merges their entries into the Ashtadhyayi reader's vasu_kaumudi layer,
dge/data/vedanga/vyakarana/ashtadhyayi/vasu_kaumudi/data.json.

Keying: an entry's "sk" (Vasu's serial number) -> kaumudiIndex ->
Ashtadhyayi sutra id via kaumudi_order/data.json. The layer's items use
the same shape as the existing vasu (1891) layer: the English text lives
in sanskrit_text, language "en". The corpus's own sutra text is
authoritative; the staged sutra_ocr is audit trail only and is NOT
merged.

Classification gate (same contract as merge_staged_commentary.py):
"accept" always merges; "review"/"unresolved" only with the
corresponding --include-* flag. Entries with partial="head"/"tail"
(cut by a batch boundary) merge only when the OTHER half is also
present in the inputs (the two halves are joined) or --include-partial
is given; otherwise they are reported and skipped. Duplicate sk across
staged files (the 1-page dispatch overlap): the more complete /
better-classified copy wins; ties -> the longer english text.

Usage:
  python3 tools/merge_staged_vasu_kaumudi.py --staged a.json b.json ... [--include-review]
  python3 tools/merge_staged_vasu_kaumudi.py --staged-dir dge/data/ocr_staging/vasu_siddhanta_kaumudi
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

LAYER = Path("dge/data/vedanga/vyakarana/ashtadhyayi/vasu_kaumudi/data.json")
ORDER = Path("dge/data/vedanga/vyakarana/ashtadhyayi/kaumudi_order/data.json")

HEADER = {
    "schema": "grantha_tika_text",
    "default_author": "Śrīśa Chandra Vasu",
    "title": "Vasu — Siddhānta-Kaumudī English translation",
    "title_devanagari": "Vasu SK (Eng.)",
    "language": "en",
    "source": "S.C. Vasu, The Siddhānta Kaumudī of Bhaṭṭoji Dīkṣita, English "
              "translation (Pāṇini Office, 4 volumes, 1905-07) — public domain. "
              "Scan: archive.org/details/Siddhanta_Kaumudi_English_Translation-SC_Vasu. "
              "Digitised for DGE via Vision OCR + Gemini proofreading "
              "(tools/vasu_kaumudi_ocr.py), classification-gated per entry.",
    "licence": "public domain (Vasu 1905-07); OCR digitisation this project's own",
}

CLASS_RANK = {"accept": 2, "review": 1, "unresolved": 0}


def load_entries(paths: list[Path]) -> list[dict]:
    out = []
    for p in paths:
        doc = json.loads(p.read_text(encoding="utf-8"))
        for e in doc.get("entries") or []:
            e["_from"] = p.name
            e["_volume"] = doc.get("volume", "")
            out.append(e)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--staged", nargs="*", default=[])
    ap.add_argument("--staged-dir")
    ap.add_argument("--include-review", action="store_true")
    ap.add_argument("--include-unresolved", action="store_true")
    ap.add_argument("--include-partial", action="store_true",
                    help="merge head/tail fragments even when the other half is absent")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    paths = [Path(p) for p in args.staged]
    if args.staged_dir:
        paths += sorted(Path(args.staged_dir).glob("*.json"))
    if not paths:
        print("error: no staged files given", file=sys.stderr)
        return 1

    order = json.loads(ORDER.read_text(encoding="utf-8"))
    sk_to_id = {it["kaumudiIndex"]: it["id"] for it in order["items"]}

    raw = load_entries(paths)

    # join head+tail halves of one sk split across two staged batches
    by_sk: dict[int, list[dict]] = {}
    for e in raw:
        sk = e.get("sk")
        if not isinstance(sk, int) or sk <= 0:
            continue
        by_sk.setdefault(sk, []).append(e)

    merged: dict[int, dict] = {}
    skipped = {"partial": [], "gated": [], "unmapped": []}
    for sk, copies in sorted(by_sk.items()):
        heads = [c for c in copies if c.get("partial") == "head"]
        tails = [c for c in copies if c.get("partial") == "tail"]
        wholes = [c for c in copies if not c.get("partial")]
        cand = None
        if wholes:
            cand = max(wholes, key=lambda c: (CLASS_RANK.get(c.get("classification"), 0),
                                              len(c.get("english") or "")))
        elif heads and tails:
            h = max(heads, key=lambda c: len(c.get("english") or ""))
            t = max(tails, key=lambda c: len(c.get("english") or ""))
            cand = dict(h)
            cand["english"] = (h.get("english") or "").rstrip() + "\n" + \
                              (t.get("english") or "").lstrip()
            worst = min((h, t), key=lambda c: CLASS_RANK.get(c.get("classification"), 0))
            cand["classification"] = worst.get("classification", "review")
            if CLASS_RANK.get(cand["classification"], 0) > 1:
                cand["classification"] = "review"
                cand["note"] = (cand.get("note") or "joined across a batch boundary")
        elif args.include_partial:
            cand = max(copies, key=lambda c: len(c.get("english") or ""))
        else:
            skipped["partial"].append(sk)
            continue

        cls = cand.get("classification", "unresolved")
        if cls == "review" and not args.include_review:
            skipped["gated"].append(sk)
            continue
        if cls == "unresolved" and not args.include_unresolved:
            skipped["gated"].append(sk)
            continue
        merged[sk] = cand

    if LAYER.exists():
        doc = json.loads(LAYER.read_text(encoding="utf-8"))
    else:
        doc = dict(HEADER, items=[])
    items_by_sk = {}
    for it in doc.get("items", []):
        items_by_sk[it.get("sk_number")] = it

    added = updated = 0
    for sk, e in merged.items():
        sid = sk_to_id.get(sk)
        if sid is None:
            skipped["unmapped"].append(sk)
            continue
        item = {
            "id": sid,
            "reference": sid,
            "sk_number": sk,
            "sanskrit_text": (e.get("english") or "").strip(),
            "author": "Śrīśa Chandra Vasu",
            "tika_title": "Vasu SK (Eng.)",
            "language": "en",
            "tags": ["ashtadhyayi", "vasu_kaumudi"],
            "source": {"volume": e.get("_volume", ""), "page": e.get("page", 0),
                       "staged": e.get("_from", ""),
                       "classification": e.get("classification", "")},
        }
        if sk in items_by_sk:
            if items_by_sk[sk]["sanskrit_text"] != item["sanskrit_text"]:
                items_by_sk[sk].update(item)
                updated += 1
        else:
            items_by_sk[sk] = item
            added += 1

    doc["items"] = [items_by_sk[k] for k in sorted(items_by_sk)]
    for k, v in HEADER.items():
        doc.setdefault(k, v)

    print(f"merge: {added} added, {updated} updated, layer now {len(doc['items'])} "
          f"of {len(sk_to_id)} mappable SK entries")
    for k, v in skipped.items():
        if v:
            print(f"  skipped ({k}): {len(v)} -> {v[:15]}{' …' if len(v) > 15 else ''}")
    if args.dry_run:
        print("[dry-run] not written")
        return 0
    LAYER.parent.mkdir(parents=True, exist_ok=True)
    LAYER.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {LAYER}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
