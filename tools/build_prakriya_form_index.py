#!/usr/bin/env python3
"""
build_prakriya_form_index.py — reverse lookup from an inflected surface form
(उवाच, गच्छति, ...) back to the (root, lakāra.puruṣa.vacana) cell it belongs
to, for the reader's word-tool "Dhātu" click.

The word-tool has always opened dhatu.html?q=<word> — a plain substring
search that lands on a list of roots, not the specific form the reader
actually tapped. The project lead asked repeatedly for the click to open
the actual conjugated cell, highlighted (e.g. उवाच → वच् 02.0058, लिट्
प्रथमपुरुष एकवचनम्). That mapping isn't decidable client-side: it would mean
fetching all ~2,230 per-root files under dge/data/vedanga/vyakarana/prakriya
(262 MB total, one root ~29-120 KB) just to check one word. So it's
precomputed here, once, from the same data build_prakriya.py already wrote.

SHARDING. A single flat reverse index would be several MB — fine to build,
wasteful to fetch in full for a one-word lookup. Sharded by the surface
form's first Devanagari codepoint (as a 4-hex-digit filename, e.g. उ ->
0909.json) so dge/js/ai.js's click handler fetches one small shard, not
the whole index. Around 50-60 shards result, one per distinct initial
consonant/vowel actually in use.

AMBIGUITY, HANDLED DELIBERATELY. A surface form can belong to more than one
(root, key):
  - the SAME root can produce the same string from two different cells
    (वच् 02.0058 itself: Lit.00 प्रथम-एकवचन and Lit.20 उत्तम-एकवचन both
    include उवाच as a variant — प्रथम is the traditional citation form).
  - TWO DIFFERENT roots can share a surface form. उवाच is a documented
    example: वच् 02.0058 has its own native लिट्, and ब्रू 02.0039 (which
    has no लिट् of its own) borrows वच्'s ("ब्रुवो वचिः") — Vidyut
    correctly generates उवाच under both roots' own paradigms.
  This script keeps ONE (root, key) per surface form — first-write-wins —
  rather than a list, so the client needs no disambiguation UI (the
  project lead has been explicit: build one good answer, don't hand the
  reader a choice they didn't ask for). The scan order is chosen so
  "first write" lands on the traditionally-expected answer as often as
  possible: roots in Dhātupātha code order (so a lower gaṇa/id wins —
  ब्रू 02.0039 before वच् 02.0058, matching how उवाच is actually taught,
  as ब्रू's लिट्), and within one root, lakāras in ALL_LAKARAS order and
  cells in प्रथम/मध्यम/उत्तम × एक/द्वि/बहु order (so the citation form
  Lit.00 wins over any later cell's overlapping variant). This is a
  heuristic, not a guarantee — a genuinely ambiguous form can still land
  on the "wrong" root for a given sentence's context, same limitation as
  every other automatic word-linking already shipped on this site.

    python3 tools/build_prakriya_form_index.py
"""

import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRAKRIYA_DIR = os.path.join(REPO, 'dge', 'data', 'vedanga', 'vyakarana', 'prakriya')
OUT_DIR = os.path.join(PRAKRIYA_DIR, 'formindex')

# Matches ALL_LAKARAS in tools/build_prakriya.py — every root's "forms" dict
# carries all eight, so the reverse index can find a form in any of them,
# not just the two (Lat/Lot) that also get step-by-step derivations.
LAKARA_ORDER = ['Lat', 'Lit', 'Lut', 'Lrt', 'Lot', 'Lan', 'VidhiLin', 'Lun']
PV_ORDER = ['00', '01', '02', '10', '11', '12', '20', '21', '22']


def main():
    if not os.path.isdir(PRAKRIYA_DIR):
        print(f'no prakriya data at {PRAKRIYA_DIR} — run tools/build_prakriya.py first', file=sys.stderr)
        return 1

    root_files = []
    for gana_dir in sorted(os.listdir(PRAKRIYA_DIR)):
        full = os.path.join(PRAKRIYA_DIR, gana_dir)
        if not os.path.isdir(full):
            continue
        for fn in sorted(os.listdir(full)):
            if fn.endswith('.json'):
                root_files.append(os.path.join(full, fn))

    if not root_files:
        print(f'no per-root files found under {PRAKRIYA_DIR}', file=sys.stderr)
        return 1

    flat = {}  # surface form -> {"c": code, "k": key}
    roots_seen = 0
    for path in root_files:
        with open(path, encoding='utf-8') as fh:
            d = json.load(fh)
        code = d.get('code')
        forms = d.get('forms') or {}
        if not code or not forms:
            continue
        roots_seen += 1
        for lak in LAKARA_ORDER:
            for pv in PV_ORDER:
                key = lak + '.' + pv
                variants = forms.get(key)
                if not variants:
                    continue
                for f in variants:
                    f = (f or '').strip()
                    if f and f not in flat:
                        flat[f] = {'c': code, 'k': key}

    shards = {}
    for form, hit in flat.items():
        cp = format(ord(form[0]), '04x')
        shards.setdefault(cp, {})[form] = hit

    os.makedirs(OUT_DIR, exist_ok=True)
    for cp, shard in shards.items():
        with open(os.path.join(OUT_DIR, cp + '.json'), 'w', encoding='utf-8') as fh:
            json.dump(shard, fh, ensure_ascii=False, separators=(',', ':'), sort_keys=True)

    manifest = {
        '_readme': (
            'Reverse index for dge/js/ai.js\'s Dhatu word-tool: surface form -> '
            '{"c": Dhatupatha root code, "k": "<Lakara>.<purusha><vacana>"}. Built '
            'by tools/build_prakriya_form_index.py from the per-root files this '
            'directory already holds (see build_prakriya.py). Sharded by the '
            'form\'s first Devanagari codepoint (4 lowercase hex digits, e.g. '
            'उ -> 0909.json) so one word-click fetches one small shard, not the '
            'whole index. A form present under more than one (root, key) keeps '
            'only its first match by a deliberately chosen scan order — see the '
            'AMBIGUITY note in the build script\'s own docstring, not stored here '
            'to avoid drifting out of sync with it.'
        ),
        'rootsIndexed': roots_seen,
        'distinctForms': len(flat),
        'shardCount': len(shards),
    }
    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)

    print(f'{roots_seen} roots -> {len(flat)} distinct forms across {len(shards)} shards')
    return 0


if __name__ == '__main__':
    sys.exit(main())
