#!/usr/bin/env python3
"""Kavya corpus importer for DGE.

Runs on GitHub Actions (or Colab).  Reads config/works.json, fetches each
declared source, parses it into itihasa_purana_text layers, and merges them
non-destructively into dge/data/kavya_alankara/.

  python3 -m kavya.import_kavya --probe-only
  python3 -m kavya.import_kavya --works raghuvamsha,meghaduta
  python3 -m kavya.import_kavya --all --data-root ../dge/data

--probe-only fetches, reports what each source actually contains (including
any commentary key not yet declared in works.json) and writes NOTHING.  Run it
first whenever a new work or source is added.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from .common import log, read_json, write_json
from .merge import ShrinkError, merge_into_existing
from .parsers import ambuda_tei, gretil_tei, sanskritsahitya, wikisource
from .schema import recount, validate_layer

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "config")
CATEGORY = "kavya_alankara"


def load_config():
    works = read_json(os.path.join(CONFIG, "works.json"), {"works": []})["works"]
    sources = read_json(os.path.join(CONFIG, "sources.json"), {"tiers": {}})["tiers"]
    return works, sources


def layer_dir(data_root, work_id, layer_id):
    return os.path.join(data_root, CATEGORY, work_id, layer_id)


# --------------------------------------------------------------------------

def _fetch(url, offline_dir=None):
    if offline_dir:
        name = url.rsplit("/", 1)[-1].split("?")[0]
        path = os.path.join(offline_dir, name)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                return fh.read()
        raise FileNotFoundError(path)
    from .fetch import get
    return get(url)


def import_sanskritsahitya(work, tier, offline_dir=None, probe=False):
    cfg = work["sources"]["sanskritsahitya"]
    d = cfg["dir"]
    url = tier["raw"].format(dir=d, file=cfg.get("file", d + ".json"))
    doc = json.loads(_fetch(url, offline_dir))
    if probe:
        return sanskritsahitya.probe(doc)
    return sanskritsahitya.parse(
        doc, work["id"],
        commentary_keys=cfg.get("commentary_keys", {}),
        source={"tier": "A", "url": url, "repo": tier["name"]},
        license_note=tier["licence"],
    )


def import_gretil(work, tier, key="gretil", offline_dir=None, probe=False):
    cfg = work["sources"][key]
    url = tier["raw"].format(file=cfg["file"])
    text = _fetch(url, offline_dir)
    if text.lstrip().startswith("<"):
        units = list(gretil_tei.split_units_tei(text))
        convention = "TEI"
        if not units:
            # TEI markup, but no xml:id on any unit -- the reference is inline
            # in the verse instead. Without this the file parses to nothing and
            # the work imports as empty, which is what 10 of the 16 GRETIL
            # sources actually did on the first probe: Kathasaritsagara,
            # Sisupalavadha, Svapnavasavadatta, Dhvanyaloka and the rest.
            flat = gretil_tei.tei_plaintext(text)
            convention, hits = gretil_tei.detect_convention(flat)
            if convention:
                units = list(gretil_tei.split_units(flat, convention))
                convention = "TEI+" + convention
    else:
        convention, hits = gretil_tei.detect_convention(text)
        units = list(gretil_tei.split_units(text, convention))
    if probe:
        return {"convention": convention, "units": len(units),
                "first": units[0] if units else None}
    meta = cfg.get("layer") or {"id": "mula", "kind": "mula",
                                "name_sa": "मूलम्", "name_en": "Mula"}
    layer = gretil_tei.build_layer(
        units, work["id"], meta["id"], meta["kind"],
        commentator=meta.get("commentator", ""),
        name_sa=meta.get("name_sa", ""), name_en=meta.get("name_en", ""),
        source={"tier": "B", "url": url, "marker": cfg.get("marker", ""),
                "convention": convention},
        license_note=tier["licence"],
        item_depth=cfg.get("item_depth"),
    )
    return {meta["id"]: layer}


def import_wikisource(work, tier, offline_dir=None, probe=False):
    cfg = work["sources"]["wikisource"]
    url = tier["raw"].format(page=cfg["page"])
    doc = json.loads(_fetch(url, offline_dir))
    wt = doc["parse"]["wikitext"]["*"]
    units = list(wikisource.split_units(wt))
    if probe:
        return {"units": len(units), "first": units[0] if units else None}
    return {"mula": gretil_tei.build_layer(
        units, work["id"], "mula", "mula", name_sa="मूलम्",
        source={"tier": "D", "url": url}, license_note=tier["licence"])}


def import_ambuda(work, tier, offline_dir=None, probe=False):
    cfg = work["sources"]["ambuda"]
    url = cfg["url"]
    units = list(ambuda_tei.split_units(_fetch(url, offline_dir)))
    if probe:
        return {"units": len(units), "first": units[0] if units else None}
    meta = cfg.get("layer") or {"id": "mula", "kind": "mula"}
    return {meta["id"]: gretil_tei.build_layer(
        units, work["id"], meta["id"], meta["kind"],
        commentator=meta.get("commentator", ""),
        source={"tier": "C", "url": url}, license_note=tier["licence"])}


IMPORTERS = {
    "sanskritsahitya": ("A", import_sanskritsahitya),
    "gretil":          ("B", import_gretil),
    "gretil_tika":     ("B", lambda w, t, **k: import_gretil(w, t, key="gretil_tika", **k)),
    "ambuda":          ("C", import_ambuda),
    "wikisource":      ("D", import_wikisource),
}


# --------------------------------------------------------------------------

def run(args):
    works, tiers = load_config()
    wanted = None
    if args.works:
        wanted = {w.strip() for w in args.works.split(",") if w.strip()}
    report = {"probe": args.probe_only, "works": {}, "errors": [],
              "skipped_scan_only": [], "totals": {"works": 0, "layers": 0,
                                                  "entries": 0}}

    for work in works:
        wid = work["id"]
        if wanted and wid not in wanted:
            continue
        srcs = {k: v for k, v in (work.get("sources") or {}).items()
                if k in IMPORTERS}
        if not srcs:
            report["skipped_scan_only"].append(
                {"id": wid, "register": work.get("register", {})})
            continue
        if args.sources:
            keep = set(args.sources.split(","))
            srcs = {k: v for k, v in srcs.items() if k in keep}
        wrep = {"sources": {}, "layers": {}}
        for key in srcs:
            tier_id, fn = IMPORTERS[key]
            tier = tiers.get(tier_id, {})
            try:
                out = fn(work, tier, offline_dir=args.offline_dir,
                         probe=args.probe_only)
            except Exception as exc:                      # noqa: BLE001
                msg = "%s/%s: %s: %s" % (wid, key, type(exc).__name__, exc)
                log("  !! " + msg)
                report["errors"].append(msg)
                continue
            if args.probe_only:
                wrep["sources"][key] = out
                continue
            for lid, layer in out.items():
                errs = validate_layer(layer)
                if errs:
                    report["errors"].append("%s/%s: %s" % (wid, lid, errs[:3]))
                    continue
                path = os.path.join(layer_dir(args.data_root, wid, lid),
                                    "data.json")
                existing = read_json(path)
                try:
                    merged, mrep = merge_into_existing(existing, layer)
                except ShrinkError as exc:
                    log("  !! " + str(exc))
                    report["errors"].append(str(exc))
                    continue
                recount(merged)
                if not args.dry_run:
                    write_json(path, merged)
                wrep["layers"][lid] = dict(
                    mrep.as_dict(), counts=merged["grantha"]["counts"])
                report["totals"]["layers"] += 1
                report["totals"]["entries"] += merged["grantha"]["counts"]["shlokas"]
                log("  %s/%s -> %s" % (wid, lid, mrep))
        if wrep["sources"] or wrep["layers"]:
            report["works"][wid] = wrep
            report["totals"]["works"] += 1

    if args.probe_only:
        for wid, wrep in report["works"].items():
            for key, out in wrep["sources"].items():
                unknown = (out or {}).get("unknown_keys")
                if unknown:
                    log("PROBE %s/%s: UNDECLARED KEYS %s" % (wid, key, unknown))

    if args.report:
        write_json(args.report, report, indent=1)
    log("\n%s: %d works, %d layers, %d entries, %d errors"
        % ("PROBE" if args.probe_only else "IMPORT",
           report["totals"]["works"], report["totals"]["layers"],
           report["totals"]["entries"], len(report["errors"])))
    return 1 if report["errors"] and args.strict else 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--works", help="comma-separated work ids")
    p.add_argument("--sources", help="comma-separated source keys")
    p.add_argument("--all", action="store_true", help="every work in works.json")
    p.add_argument("--data-root", default="dge/data")
    p.add_argument("--probe-only", action="store_true",
                   help="fetch and report, write nothing")
    p.add_argument("--offline-dir", help="read sources from a local directory "
                                         "instead of the network (tests/CI)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--strict", action="store_true", help="exit 1 on any error")
    p.add_argument("--report", default="_dump/KAVYA_IMPORT_REPORT.json")
    args = p.parse_args(argv)
    if not (args.works or args.all):
        p.error("pass --works or --all")
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
