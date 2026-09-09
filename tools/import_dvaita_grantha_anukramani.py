#!/usr/bin/env python3
"""Import the द्वैतवेदान्तग्रन्थानुक्रमणी bibliography (a scholar's Excel
catalogue of every known Dvaita Vedanta work, digitised or not) into a
committed JSON the reader page at dge/dvaita-grantha-anukramani/ loads.

This is a BIBLIOGRAPHY, not the corpus itself: most rows have no digitised
text anywhere in dge/data/ yet (many are marked अनुपलब्ध/manuscript-only).
It is also NOT a flat list -- the "Link" column (D) names the row's parent
work by title, so a टीका/टिप्पणी/विवरणम् row points back at the मूलम् or
टीका it was written on. Sheet order is depth-first (a work's own children
are the rows immediately after it), which is what makes an ambiguous title
like "जयतीर्थीय-टीका" -- repeated once per prakarana, since Jayatirtha wrote
one for each of the दशप्रकरण -- resolvable at all: parent resolution below
walks backward from each row to the NEAREST earlier row with a matching
title, not just any row with that title.

Two duplicate signals come out of this, deliberately kept separate rather
than collapsed into one "duplicate" label -- collapsing them would bury a
few hundred real repeat-entry mistakes under many legitimate structural
repeats (the same commentary title recurring once per prakarana):
  * exactRowDuplicates -- every column identical between rows: almost
    certainly the same catalogue entry typed in twice.
  * nameParentKartaDuplicates -- title+parent+author identical but some
    other column (availability, a note) differs: very likely the same
    work, worth a scholar's look but not auto-mergeable.
  * nameCollisions -- same title, different author or parent: informational
    only (this is normal for the दशप्रकरण's repeating commentary titles).

Run:  python3 tools/import_dvaita_grantha_anukramani.py <source.xlsx> \
        --out dge/data/catalogs/dvaita_grantha_anukramani.json

Requires openpyxl (pip install openpyxl) -- not a runtime dependency of the
site, only of this one-time/occasional import.
"""

from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import re
from collections import defaultdict

import openpyxl

SHEET_NAME = "dwita.books.index."
# Spreadsheet column letter -> our field name. Columns without a real header
# in row 1 (I, all of M onward) carry no data and are skipped.
COLUMNS = {
    "B": "status",          # 'publish' -- publication/availability shorthand (vmp, s, no, ...)
    "C": "grantha",         # ग्रन्थनाम -- the work's title
    "D": "linkRaw",         # Link -- parent work's title, as typed (ambiguous; resolved below)
    "E": "karta",           # ग्रन्थकर्तृ -- author
    "F": "vibhaga",         # विभागः -- broad division (मूलम्/व्याख्यानम्/सर्वमूलम्/...)
    "G": "vishayaVibhaga",  # विषयविभागः -- finer division (टीका/टिप्पणी/भाष्यम्/...)
    "H": "prasthana",       # द्वैत-वेदान्तग्रन्थानुक्रमणिका -- top-level corpus/prasthana tag
    "J": "mention",         # free-text notes column (manuscript codes, remarks)
    "K": "sourceLibrary",   # manuscript repository (baroda, saraswatimahal, ...)
    "L": "availability",    # हस्तप्रति/नोपलब्धम्/... -- manuscript availability
}
TAG_FIELDS = ("vibhaga", "vishayaVibhaga", "prasthana")


def norm(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def read_rows(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET_NAME]
    from openpyxl.utils import column_index_from_string
    col_idx = {field: column_index_from_string(letter) for letter, field in COLUMNS.items()}
    rows = []
    for r in range(2, ws.max_row + 1):
        rec = {field: norm(ws.cell(row=r, column=idx).value) for field, idx in col_idx.items()}
        if not rec["grantha"] and not rec["karta"]:
            continue  # a genuinely blank spreadsheet row -- nothing to catalogue
        rec["row"] = r
        rows.append(rec)
    return rows


def resolve_parents(rows):
    """For each row, find its parent row: the NEAREST earlier row whose
    title (grantha) equals this row's linkRaw. Falls back to the nearest
    row in EITHER direction if no earlier one matches (a few rows in this
    sheet name a parent that is typed a little further down), and leaves
    parent_idx None (flagged as an unresolved link) if no row anywhere
    carries that title."""
    by_title = defaultdict(list)
    for i, rec in enumerate(rows):
        if rec["grantha"]:
            by_title[rec["grantha"]].append(i)

    for i, rec in enumerate(rows):
        rec["parentIdx"] = None
        rec["unresolvedLink"] = False
        link = rec["linkRaw"]
        if not link:
            continue
        candidates = by_title.get(link)
        if not candidates:
            rec["unresolvedLink"] = True
            continue
        pos = bisect.bisect_left(candidates, i) - 1
        if pos >= 0:
            rec["parentIdx"] = candidates[pos]
        else:
            # only forward matches exist -- take the nearest one
            rec["parentIdx"] = min(candidates, key=lambda j: j - i)


def build_paths(rows):
    """Depth/path/breadcrumb per row, walking parentIdx chains. Guards
    against a cycle (shouldn't happen given the backward-resolution above,
    but a malformed sheet could in principle produce one) by capping walk
    length at the row count."""
    ids = [f"r{rec['row']}" for rec in rows]
    n = len(rows)
    for i, rec in enumerate(rows):
        chain = [i]
        seen = {i}
        cur = rec["parentIdx"]
        steps = 0
        while cur is not None and steps < n:
            if cur in seen:
                break  # cycle guard
            chain.append(cur)
            seen.add(cur)
            cur = rows[cur]["parentIdx"]
            steps += 1
        chain.reverse()
        rec["path"] = [ids[j] for j in chain]
        rec["depth"] = len(chain) - 1
        rec["breadcrumb"] = " › ".join(rows[j]["grantha"] or "?" for j in chain)


def detect_duplicates(rows):
    """Groups keyed on the RESOLVED parent (parentIdx), never on linkRaw's
    raw text -- linkRaw is deliberately ambiguous (see resolve_parents'
    docstring: "जयतीर्थीय-टीका" is typed identically once per prakarana),
    so keying on it directly would lump together rows that share a generic
    commentary-title convention but sit under entirely different mula
    works. parentIdx already picks out the ONE specific occurrence a row
    actually binds to, which is the identity that matters here."""
    exact_key = defaultdict(list)
    npk_key = defaultdict(list)
    name_key = defaultdict(list)
    for i, rec in enumerate(rows):
        parent_marker = rec["parentIdx"] if rec["parentIdx"] is not None else ("unresolved:" + rec["linkRaw"])
        full = (rec.get("status", ""), rec["grantha"], parent_marker, rec["karta"], rec.get("vibhaga", ""),
                rec.get("vishayaVibhaga", ""), rec.get("prasthana", ""), rec.get("mention", ""),
                rec.get("sourceLibrary", ""), rec.get("availability", ""))
        exact_key[full].append(i)
        if rec["grantha"]:
            npk_key[(rec["grantha"], parent_marker, rec["karta"])].append(i)
            name_key[rec["grantha"]].append(i)

    exact_groups = []
    grouped_exact = set()
    for key, idxs in exact_key.items():
        if len(idxs) > 1 and key[1]:
            gid = "dup-" + hashlib.sha1("|".join(str(k) for k in key).encode("utf-8")).hexdigest()[:10]
            exact_groups.append({"id": gid, "ids": [f"r{rows[i]['row']}" for i in idxs]})
            grouped_exact.update(idxs)
            for i in idxs:
                rows[i]["exactDuplicateGroup"] = gid

    npk_groups = []
    for key, idxs in npk_key.items():
        if len(idxs) > 1 and not all(i in grouped_exact for i in idxs):
            gid = "npk-" + hashlib.sha1("|".join(str(k) for k in key).encode("utf-8")).hexdigest()[:10]
            npk_groups.append({"id": gid, "ids": [f"r{rows[i]['row']}" for i in idxs]})
            for i in idxs:
                if "exactDuplicateGroup" not in rows[i]:
                    rows[i]["nameParentKartaGroup"] = gid

    collision_groups = []
    for key, idxs in name_key.items():
        kartas = {rows[i]["karta"] for i in idxs}
        parents = {rows[i]["linkRaw"] for i in idxs}
        if len(idxs) > 1 and (len(kartas) > 1 or len(parents) > 1):
            gid = "coll-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]
            collision_groups.append({"id": gid, "name": key, "ids": [f"r{rows[i]['row']}" for i in idxs]})
            for i in idxs:
                rows[i].setdefault("nameCollisionGroup", gid)

    return exact_groups, npk_groups, collision_groups


def build_vocab(rows):
    vocab = {}
    for field in TAG_FIELDS + ("status", "availability"):
        counts = defaultdict(int)
        for rec in rows:
            v = rec.get(field)
            if v:
                counts[v] += 1
        vocab[field] = [{"value": k, "count": v} for k, v in
                         sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]
    kartas = defaultdict(int)
    for rec in rows:
        if rec["karta"]:
            kartas[rec["karta"]] += 1
    vocab["karta"] = [{"value": k, "count": v} for k, v in
                       sorted(kartas.items(), key=lambda kv: (-kv[1], kv[0]))]
    return vocab


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", help="path to the .xlsx catalogue")
    parser.add_argument("--out", default="dge/data/catalogs/dvaita_grantha_anukramani.json")
    args = parser.parse_args(argv)

    rows = read_rows(args.source)
    resolve_parents(rows)
    build_paths(rows)
    exact_groups, npk_groups, collision_groups = detect_duplicates(rows)
    vocab = build_vocab(rows)

    ids = [f"r{rec['row']}" for rec in rows]
    items = []
    for i, rec in enumerate(rows):
        parent_idx = rec["parentIdx"]
        items.append({
            "id": ids[i],
            "row": rec["row"],
            "grantha": rec["grantha"],
            "karta": rec["karta"],
            "vibhaga": rec["vibhaga"],
            "vishayaVibhaga": rec["vishayaVibhaga"],
            "prasthana": rec["prasthana"],
            "status": rec["status"],
            "availability": rec["availability"],
            "mention": rec["mention"],
            "sourceLibrary": rec["sourceLibrary"],
            "linkRaw": rec["linkRaw"],
            "parentId": ids[parent_idx] if parent_idx is not None else None,
            "unresolvedLink": rec["unresolvedLink"],
            "path": rec["path"],
            "depth": rec["depth"],
            "breadcrumb": rec["breadcrumb"],
            "flags": {
                "missingGrantha": not rec["grantha"],
                "missingKarta": not rec["karta"],
                "missingTags": not (rec["vibhaga"] or rec["vishayaVibhaga"] or rec["prasthana"]),
                "unresolvedLink": rec["unresolvedLink"],
            },
            "exactDuplicateGroup": rec.get("exactDuplicateGroup"),
            "nameParentKartaGroup": rec.get("nameParentKartaGroup"),
            "nameCollisionGroup": rec.get("nameCollisionGroup"),
        })

    out = {
        "schema": "dvaita_grantha_anukramani",
        "title": "द्वैतवेदान्तग्रन्थानुक्रमणी",
        "sourceNote": "Imported from a scholar-compiled Excel bibliography of Dvaita "
                       "Vedanta works, digitised or not; not yet cross-checked against "
                       "dge/data/library.json, dasa_sahitya, or guru_parampara names.",
        "sourceSheet": SHEET_NAME,
        "totalRows": len(rows),
        "vocab": vocab,
        "duplicates": {
            "exactRowDuplicates": exact_groups,
            "nameParentKartaDuplicates": npk_groups,
            "nameCollisions": collision_groups,
        },
        "items": items,
    }

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write("\n")

    print(f"{len(rows)} rows -> {args.out}")
    print(f"  exact-row duplicate groups: {len(exact_groups)} "
          f"({sum(len(g['ids']) for g in exact_groups)} rows)")
    print(f"  name+parent+karta duplicate groups: {len(npk_groups)} "
          f"({sum(len(g['ids']) for g in npk_groups)} rows)")
    print(f"  name-collision groups (informational): {len(collision_groups)}")
    print(f"  unresolved parent links: {sum(1 for it in items if it['unresolvedLink'])}")
    print(f"  missing grantha name: {sum(1 for it in items if it['flags']['missingGrantha'])}")
    print(f"  missing karta: {sum(1 for it in items if it['flags']['missingKarta'])}")
    print(f"  missing all tags: {sum(1 for it in items if it['flags']['missingTags'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
