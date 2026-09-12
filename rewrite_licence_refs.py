#!/usr/bin/env python3
"""Rewrite top-level `licence`/`license` fields in data/**/*.json to a
`licence_ref` pointer into data/_attributions.json, for the distinct
licence values already catalogued there.

Consolidation pattern from the 12 Sep 2026 licence-hardcoding cleanup:
stop repeating full licence prose in every data.json, keep exactly one
copy of it in data/_attributions.json, and leave each file with only an
id that points at it. Public-domain / no-restriction values are left
untouched -- there is no licence text there to consolidate.

This covers the distinct licence VALUES already registered in
data/_attributions.json (the most common ones as of the first pass).
Extending to the remaining corpus is a mechanical repeat of this same
script with more entries added to VALUE_TO_REF.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")

VALUE_TO_REF = {
    "GPL-2.0 (samsaadhanii/scl) — keep attribution": "gpl-2.0-scl",
    "GPL-2.0 — keep attribution": "gpl-2.0-scl",
    "CC-BY 4.0": "cc-by-4.0",
    "CC BY 4.0": "cc-by-4.0",
    "CC BY-SA 4.0": "cc-by-sa-4.0",
    "CC BY-SA": "cc-by-sa-generic",
    "CC BY-NC-SA 4.0": "cc-by-nc-sa-4.0",
    "MIT": "mit-generic",
    "AGPL-3.0-or-later": "agpl-3.0-chandas",
}


def main():
    attributions_path = os.path.join(DATA_DIR, "_attributions.json")
    with open(attributions_path, encoding="utf-8") as f:
        registry = json.load(f)
    known_refs = set(registry["licences"].keys())
    for ref in set(VALUE_TO_REF.values()):
        assert ref in known_refs, f"{ref} not in data/_attributions.json"

    touched = 0
    for dirpath, _dirnames, filenames in os.walk(DATA_DIR):
        for fn in filenames:
            if not fn.endswith(".json"):
                continue
            fp = os.path.join(dirpath, fn)
            with open(fp, encoding="utf-8") as f:
                raw = f.read()
            try:
                d = json.loads(raw)
            except Exception:
                print(f"SKIP (parse error): {fp}", file=sys.stderr)
                continue
            if not isinstance(d, dict):
                continue
            v = d.get("licence")
            if not isinstance(v, str) or v.strip() not in VALUE_TO_REF:
                continue
            ref = VALUE_TO_REF[v.strip()]
            # Preserve key order: replace 'licence' in place with 'licence_ref'.
            new_d = {}
            for k, val in d.items():
                if k == "licence":
                    new_d["licence_ref"] = ref
                else:
                    new_d[k] = val

            # Match the file's existing formatting (compact vs. pretty,
            # and its indent width) instead of forcing one style corpus-wide.
            lines = raw.split("\n", 2)
            if len(lines) < 2 or not lines[1].startswith(" "):
                # Single-line / minified file.
                dumped = json.dumps(new_d, ensure_ascii=False, separators=(",", ":"))
            else:
                indent_width = len(lines[1]) - len(lines[1].lstrip(" "))
                dumped = json.dumps(new_d, ensure_ascii=False, indent=indent_width)

            with open(fp, "w", encoding="utf-8") as f:
                f.write(dumped)
                if raw.endswith("\n"):
                    f.write("\n")
            touched += 1

    print(f"Rewrote {touched} files to use licence_ref.")


if __name__ == "__main__":
    main()
