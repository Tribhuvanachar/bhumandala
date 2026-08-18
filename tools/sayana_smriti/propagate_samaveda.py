#!/usr/bin/env python3
"""
propagate_samaveda.py — give the Sāmaveda its commentary for free.

THE IDEA
--------
The Sāmaveda Saṃhitā is, in the main, the Ṛgveda set to music: most of its
mantras ARE Ṛgveda mantras. DGE's Sāmaveda data already records which one, in a
`rigveda_ref` field:

    {"id": "1", "samhita_patha": "अग्न आ याहि वीतये…", "rigveda_ref": "०६.०१६.१०"}

Measured against the live repo: **1,761 of 1,875 Kauthuma mantras carry a ref,
and 1,760 of those resolve to a real Ṛgveda id** once the Devanagari numerals
are converted and zero-padding stripped (99.9%). Only ०४.०३९.०९ fails to
resolve, and that one is a genuine mismatch in the source data, not a parser
bug.

So once import_sayana_rigveda.py has run, Sāyaṇa's gloss and Wilson's
translation for 94% of the Sāmaveda can be copied across with **zero network
requests**. There is no other route to a Sāmaveda commentary layer: Sāyaṇa's
Sāmaveda-bhāṣya has never been digitised, and Griffith's translation follows
Benfey's Rāṇāyanīya numbering, which does not line up with DGE's Kauthuma
sequence (585 verses against 650 in the Pūrvārcika).

Every propagated entry is marked. The reader is told, in the text itself, that
they are reading Sāyaṇa on the parallel Ṛgveda mantra — not a Sāmaveda bhāṣya —
and the item records `commentary_via` so the provenance survives in the data.

    python propagate_samaveda.py --dge-root ../bhumandala/dge
    python propagate_samaveda.py --dge-root ../bhumandala/dge --dry-run

RUN ORDER: after import_sayana_rigveda.py, never before — it reads the Ṛgveda
files as its source and will report 0 propagated if Sāyaṇa isn't there yet.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from common import load_json, save_json

RV_GLOB = "data/vedas/rigveda/shakala_shakha/samhita/mandala_{m:02d}/data.json"
SV_FILES = [
    "data/vedas/samaveda/kauthuma_shakha/samhita/purvarchika/data.json",
    "data/vedas/samaveda/kauthuma_shakha/samhita/uttararchika/data.json",
]

DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

# Which Ṛgveda layers are worth carrying across. Sāyaṇa first — he is the point.
PROPAGATE = {
    "sayana": "Sāyaṇa on the parallel Ṛgveda mantra",
    "wilson": "Wilson's translation of the parallel Ṛgveda mantra",
    "griffith": "Griffith's translation of the parallel Ṛgveda mantra",
}


def normalise_ref(raw) -> str:
    """'०६.०१६.१०' -> '6.16.10'. Devanagari numerals, zero-padded segments."""
    s = str(raw or "").strip().translate(DEV_DIGITS)
    if not s:
        return ""
    return ".".join(p.lstrip("0") or "0" for p in s.split("."))


def load_rigveda(dge: Path) -> dict:
    rv = {}
    for m in range(1, 11):
        p = dge / RV_GLOB.format(m=m)
        if not p.exists():
            continue
        for it in load_json(p).get("items", []):
            c = it.get("commentaries") or {}
            if c:
                rv[it["id"]] = c
    return rv


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dge-root", required=True)
    ap.add_argument("--layers", default="sayana,wilson",
                    help="comma-separated Ṛgveda commentary keys to carry across")
    ap.add_argument("--no-annotate", action="store_true",
                    help="do not append the '— Sāyaṇa on RV x.y.z' provenance line "
                         "to the propagated text (the item field is still written)")
    ap.add_argument("--overwrite", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    dge = Path(args.dge_root)
    layers = [l.strip() for l in args.layers.split(",") if l.strip()]
    for l in layers:
        if l not in PROPAGATE:
            print(f"!! unknown layer '{l}' (known: {', '.join(PROPAGATE)})", file=sys.stderr)
            return 2

    rv = load_rigveda(dge)
    print(f"Ṛgveda mantras carrying commentary: {len(rv):,}")
    if not rv:
        print("!! no Ṛgveda commentary found — run import_sayana_rigveda.py first.",
              file=sys.stderr)
        return 3
    available = Counter(k for c in rv.values() for k in c)
    print("   layers available: " + ", ".join(f"{k}={v:,}" for k, v in available.most_common()))

    stats = Counter()
    for rel in SV_FILES:
        path = dge / rel
        if not path.exists():
            print(f"!! missing {path}", file=sys.stderr)
            continue
        data = load_json(path)
        items = data.get("items", [])
        added = 0
        for it in items:
            stats["items"] += 1
            ref = normalise_ref(it.get("rigveda_ref"))
            if not ref:
                stats["no_ref"] += 1
                continue
            src = rv.get(ref)
            if not src:
                stats["ref_unresolved"] += 1
                continue
            stats["resolved"] += 1
            comm = it.setdefault("commentaries", {})
            wrote = False
            for key in layers:
                text = src.get(key)
                if not text:
                    continue
                if comm.get(key) and not args.overwrite:
                    stats[f"{key}_skipped_existing"] += 1
                    continue
                if args.no_annotate:
                    comm[key] = text
                else:
                    comm[key] = f"{text}\n\n— {PROPAGATE[key]}, Ṛgveda {ref}."
                stats[f"{key}_added"] += 1
                wrote = True
            if wrote:
                it["commentary_via"] = f"rigveda:{ref}"
                added += 1

        if added and not args.dry_run:
            data.setdefault("commentary_sources", {})["propagated_from_rigveda"] = {
                "method": "items[].rigveda_ref -> Ṛgveda Śākala Saṃhitā item id",
                "layers": layers,
                "note": "The Sāmaveda Saṃhitā largely reuses Ṛgveda mantras. These "
                        "entries are Sāyaṇa/Wilson on the PARALLEL ṚGVEDA MANTRA, not "
                        "a Sāmaveda bhāṣya — Sāyaṇa's Sāmaveda-bhāṣya has never been "
                        "digitised. Each item records its source in commentary_via.",
                "coverage": f"{added} of {len(items)} mantras in this file",
            }
            save_json(path, data)
            print(f"  {rel}: +{added} of {len(items)} mantras  -> written")
        else:
            print(f"  {rel}: +{added} of {len(items)} mantras"
                  + ("  (dry run, not written)" if args.dry_run else ""))

    print("\n" + json.dumps(dict(stats), indent=2))
    pct = 100.0 * stats["resolved"] / max(stats["items"], 1)
    print(f"\nresolved {stats['resolved']:,}/{stats['items']:,} Sāmaveda mantras "
          f"to a Ṛgveda parallel ({pct:.1f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
