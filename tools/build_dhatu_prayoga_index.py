#!/usr/bin/env python3
"""Where is each dhātu form actually used in the library? (धातुप्रयोगसूची)

For every surface form the site can already name -- the 204,974 tiṅanta
forms in prakriya/formindex/ and the 48,890 kṛdanta forms in
prakriya/krtindex/, both keyed to a Dhātupāṭha code and a cell -- this walks
every verse and prose unit of the corpus, records each exact occurrence, and
writes two mirror-image indexes:

  by_dhatu/<gana>/<code>.json     code → {total, forms: {cell → {n, e:[examples]}}}
                                  (the examples a dhātu page shows under a form)
  by_grantha/<slug>.json          unit → [[word, code, cell], …]
                                  (the chips a verse card shows, linking back)
  manifest.json                   totals, per-dhātu totals for leaderboards,
                                  per-branch totals, build info

Why a stored index when intellisense.js and dhatu.js deliberately route
"other occurrences" through the global search: search is STRING-precise (it
finds the letters भवति wherever they occur), this is FORM-precise (it knows
भवति is 01.0001 भू, लट् प्रथमपुरुष एकवचन, and can therefore count, rank and
list examples per cell, per dhātu and per branch). The two answer different
questions and this one cannot be asked of a substring search at all.

Precision over recall: only exact, word-bounded matches count. A word fused
by sandhi (भवत्येव) is not found -- fine, the list is examples, not a census
-- and the very short or notoriously ambiguous forms (ते, स, मे, याति as a
noun …) are skipped by length and a small stoplist rather than counted
wrongly. formindex is first-write-wins, so a form shared by two roots is
credited to one of them; that is documented on the page.

Run:  python3 tools/build_dhatu_prayoga_index.py        (~3 min)
"""
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / 'dge/data'
VY = DATA / 'vedanga/vyakarana'
FORMINDEX = VY / 'prakriya/formindex'
KRTINDEX = VY / 'prakriya/krtindex'
OUT = VY / 'dhatu_prayoga'

SCAN_TOPDIRS = ['darshana', 'dasa_sahitya', 'itihasa', 'kavya_alankara', 'purana',
                'smriti_dharma', 'stotra', 'nitishastra', 'upaveda', 'agama', 'vedas',
                'vedanga/chandas', 'vedanga/nirukta', 'vedanga/jyotisha', 'vedanga/shiksha',
                'vedanga/kalpa', 'shastra', 'misc']
MAX_PER_FORM = 20          # examples kept per (dhātu, cell); counts stay complete
MAX_PER_UNIT = 40          # chips per verse card
SNIPPET = 45
MIN_LEN = 3                # code points; ते / स / मे are noise, not evidence
# Words that are far more often something else than the verb form the
# index knows them as (pronouns, particles, common nouns). Extend freely.
STOP = set('''ते स मे न च वा हि तु किं कः का के तत् एव इति अपि यत् यः या ये सः सा
अस्ति आसीत् अस्मि सन्ति स्म अथ इव यथा तथा नु वै आह उत उ ह ऊचुः
भवान् भवति भवत् याति यान्ति वेद वेदः वेदाः नाम काम कामः रामः कृष्णः
अर्थः अर्थ अर्थे लोकः लोके लोकाः देवः देवाः पुत्रः पुत्र गुरुः ईश ईशः'''.split())
# भवति is kept out on purpose? No -- it is the single most useful example
# of all; only the honorific भवान्/भवत् are stopped. Remove it from STOP:
STOP.discard('भवति')

DEVA_WORD = re.compile(r'[ऀ-ॣ०-ॿ]+')
TRAIL = re.compile(r'[।॥०-९0-9\s]+$')


def rank_of(slug):
    if slug.startswith('darshana/vedanta/dvaita/SarvaMula'):
        return 0
    if slug.startswith('darshana/vedanta/dvaita/DvaitaVedanta'):
        return 1
    if slug.startswith('dasa_sahitya'):
        return 2
    return 3


def units_of(doc):
    """(unit_id, text) for every text unit a grantha carries (same walk as
    build_sutra_prayoga_index.py), plus the shlokas{} map schema."""
    sh = doc.get('shlokas')
    if isinstance(sh, dict):
        for k, v in sh.items():
            if isinstance(v, dict):
                t = v.get('sa') or v.get('sanskrit_text') or v.get('text') or ''
            else:
                t = str(v or '')
            if t:
                yield str(k), t
    for it in doc.get('items') or []:
        uid = str(it.get('id') or it.get('reference') or '')
        base = it.get('sanskrit_text') or it.get('samhita_patha') or it.get('sa') or it.get('text') or ''
        if base:
            yield uid, base
        for s in it.get('shlokas') or []:
            suid = uid + ('#' + str(s.get('number')) if s.get('number') is not None else '')
            st = s.get('sanskrit_text') or s.get('sa') or ''
            if st:
                yield suid, st


def load_forms():
    """surface → (code, key, ambiguous). The kṛdanta reading wins a collision
    (स्तुतम् is the क्त participle far more often than लोट् मध्यम-द्विवचन of स्तु),
    and the collision itself is remembered so the page can say so."""
    forms = {}
    for d, kind in ((KRTINDEX, 'k'), (FORMINDEX, 't')):
        for fp in sorted(d.glob('*.json')):
            if fp.name == 'manifest.json':
                continue
            for surf, rec in json.loads(fp.read_text(encoding='utf-8')).items():
                if not isinstance(rec, dict) or len(surf) < MIN_LEN or surf in STOP:
                    continue
                key = rec['k'] if kind == 't' else 'krt:' + rec['k']
                if surf in forms:
                    forms[surf] = (forms[surf][0], forms[surf][1], 1)
                    continue
                forms[surf] = (rec['c'], key, 0)
    return forms


def branch_of(slug):
    seg = slug.split('/')
    return seg[0] if seg[0] != 'vedanga' else 'vedanga/' + seg[1]


def main():
    t0 = time.time()
    forms = load_forms()
    print(f'{len(forms):,} dhātu forms indexed (after length/stoplist filters)')
    by_form = defaultdict(lambda: [0, []])          # (code,key) -> [n, examples]
    by_grantha = {}                                 # slug -> {unit: [[word,code,key]]}
    per_dhatu = defaultdict(lambda: [0, set()])     # code -> [total, cells]
    per_branch = defaultdict(int)
    amb_cells = set()                               # (code,key) whose surface also reads as another word
    files = units = hits = 0
    for top in SCAN_TOPDIRS:
        root = DATA / top
        if not root.exists():
            continue
        for fp in sorted(root.rglob('data.json')):
            if 'ocr_staging' in fp.parts:
                continue
            slug = str(fp.parent.relative_to(DATA))
            try:
                doc = json.loads(fp.read_text(encoding='utf-8'))
            except Exception:
                continue
            files += 1
            r = rank_of(slug)
            title = str(doc.get('title') or doc.get('title_devanagari') or
                        (doc.get('metadata') or {}).get('title') or '')
            gmap = {}
            for uid, text in units_of(doc):
                if isinstance(text, dict):        # dasa_pada_text keeps {kannada, devanagari, …}
                    text = text.get('devanagari') or text.get('sa') or ''
                    if isinstance(text, list):
                        text = ' '.join(str(x) for x in text)
                if not isinstance(text, str) or not text:
                    continue
                units += 1
                text = text.replace('<br>', ' ').replace('<br/>', ' ')
                chips = []
                seen = set()
                for m in DEVA_WORD.finditer(text):
                    w = TRAIL.sub('', m.group(0))
                    if len(w) < MIN_LEN or w in seen:
                        continue
                    rec = forms.get(w)
                    if not rec:
                        continue
                    seen.add(w)
                    code, key, amb = rec
                    hits += 1
                    ent = by_form[(code, key)]
                    ent[0] += 1
                    if len(ent[1]) < MAX_PER_FORM * 4:   # over-collect, rank later
                        s0 = max(0, m.start() - SNIPPET)
                        s1 = min(len(text), m.end() + SNIPPET)
                        snip = ('…' if s0 else '') + text[s0:s1].strip() + ('…' if s1 < len(text) else '')
                        ent[1].append((r, slug, uid, w, snip, title))
                    if amb:
                        amb_cells.add((code, key))
                    per_dhatu[code][0] += 1
                    per_dhatu[code][1].add(key)
                    per_branch[branch_of(slug)] += 1
                    if len(chips) < MAX_PER_UNIT:
                        chips.append([w, code, key, amb] if amb else [w, code, key])
                if chips:
                    gmap[uid] = chips
            if gmap:
                by_grantha[slug] = gmap
    print(f'{files} files, {units:,} units, {hits:,} occurrences, '
          f'{len(by_form):,} distinct (dhātu, cell) pairs, {len(per_dhatu)} dhātus attested '
          f'in {time.time() - t0:.0f}s')

    # ---- write ----
    if OUT.exists():
        for p in OUT.rglob('*.json'):
            p.unlink()
    (OUT / 'by_dhatu').mkdir(parents=True, exist_ok=True)
    (OUT / 'by_grantha').mkdir(parents=True, exist_ok=True)
    per_code = defaultdict(dict)
    for (code, key), (n, ex) in by_form.items():
        ex.sort(key=lambda e: (e[0], e[1], e[2]))
        per_code[code][key] = {'n': n, 'e': [list(e[1:]) for e in ex[:MAX_PER_FORM]]}
        if (code, key) in amb_cells:
            per_code[code][key]['amb'] = 1
    for code, cells in per_code.items():
        gana = code.split('.')[0]
        d = OUT / 'by_dhatu' / gana
        d.mkdir(parents=True, exist_ok=True)
        (d / f'{code}.json').write_text(json.dumps(
            {'code': code, 'total': per_dhatu[code][0], 'cells': len(cells), 'forms': cells},
            ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for slug, gmap in by_grantha.items():
        (OUT / 'by_grantha' / (slug.replace('/', '__') + '.json')).write_text(
            json.dumps(gmap, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    manifest = {
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'tool': 'tools/build_dhatu_prayoga_index.py',
        'formsIndexed': len(forms), 'files': files, 'units': units, 'occurrences': hits,
        'dhatusAttested': len(per_dhatu), 'formCellsAttested': len(by_form),
        'maxPerForm': MAX_PER_FORM, 'maxPerUnit': MAX_PER_UNIT,
        'byBranch': dict(sorted(per_branch.items(), key=lambda kv: -kv[1])),
        # code -> [total occurrences, distinct cells attested]
        'byDhatu': {c: [v[0], len(v[1])] for c, v in sorted(per_dhatu.items(), key=lambda kv: -kv[1][0])},
        'granthas': sorted(by_grantha.keys()),
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    total_bytes = sum(p.stat().st_size for p in OUT.rglob('*.json'))
    print(f'wrote {OUT.relative_to(REPO)}: {len(per_code)} by_dhatu files, {len(by_grantha)} by_grantha files, '
          f'{total_bytes / 1e6:.1f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
