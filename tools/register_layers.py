#!/usr/bin/env python3
"""Idempotently register every dge/data/**/data.json in library.json's granthas[].

The reader (core.js) only fetches content that has an entry in library.json, and
gen_library_status.py only counts taxonomy leaves that resolve to such an entry.
New importer output (a fresh layer folder like <kanda>/saartha, the bhagavad_gita
section, or darshana/vedanta/advaita/shankara_bhashya/**) therefore stays invisible until it is listed
here. This tool scans the data tree and appends any data.json that is missing,
with populated = (it has content). Safe to run repeatedly; run AFTER an importer.
"""
import json, os, glob, datetime

ROOT = 'dge' if os.path.isdir('dge/data') else '.'
DATA = os.path.join(ROOT, 'data')
LIB = os.path.join(DATA, 'library.json')


def item_count(data):
    items = data.get('items', [])
    if items and isinstance(items[0], dict) and isinstance(items[0].get('shlokas'), list):
        return sum(len(it.get('shlokas', [])) for it in items)
    return len(items)


def main():
    lib = json.load(open(LIB, encoding='utf-8'))
    granthas = lib.setdefault('granthas', [])
    known = {g['path'] for g in granthas}
    added = 0
    # Stamped only on genuinely new entries below, never backfilled onto
    # existing ones -- this repo's git history is a shallow clone (a few
    # days deep) so there is no reliable way to know when an EXISTING
    # grantha was really added, and guessing "today" for all of them would
    # make the whole corpus look simultaneously brand-new the first time
    # this tool runs after this change. library.js's "New" badge (Category
    # 1) is correspondingly honest: entries with no addedAt just show no
    # badge rather than a wrong one.
    today = datetime.date.today().isoformat()
    for fp in sorted(glob.glob(os.path.join(DATA, '**', 'data.json'), recursive=True)):
        # catalog path convention is always "dge/data/.../data.json"
        rel = os.path.relpath(fp, DATA).replace(os.sep, '/')
        catalog = f"dge/data/{rel}"
        if catalog in known:
            continue
        try:
            data = json.load(open(fp, encoding='utf-8'))
            n = item_count(data)
        except Exception:
            n = 0
        granthas.append({"path": catalog, "populated": n > 0, "title": None, "addedAt": today})
        known.add(catalog)
        added += 1
        print(f"  + {catalog} (populated={n > 0})")
    if added:
        # library.json's own convention is 2-space indent -- writing with
        # anything else (the original indent=1 here) reformats every line
        # of the file for a one-entry addition, drowning the real change in
        # thousands of unrelated whitespace-only diff lines.
        json.dump(lib, open(LIB, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(LIB, 'a', encoding='utf-8').write('\n')
    print(f"register_layers: added {added} new grantha entries")


if __name__ == '__main__':
    main()
