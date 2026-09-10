#!/usr/bin/env python3
"""
build_padaccheda.py — run the offline segmenter (tools/padaccheda.py) over the
corpus and store what it finds, so a reader pays nothing at read time.

TWO TIERS, AND THEY ARE NOT THE SAME THING.

  Tier A  a padaccheda a human editor made, already in the text's own JSON
          (the Aṣṭādhyāyī sūtrapāṭha ships 3,941 of these). Authoritative.
          This tool copies it through untouched and never second-guesses it.

  Tier B  this repository's own segmenter, for the verses nobody has split by
          hand. Useful, and NOT authoritative — see the numbers below.

WHAT TIER B IS WORTH, MEASURED. Scored against those 3,941 editor padacchedas,
counting the editor's own compound hyphens as boundaries so the comparison is
fair, and offering only splits that clear the confidence gate:

    offered 284 of 1,230 · exact 40% · wrong 59% · declined the rest

That is the honest figure and it is why nothing here is written into a text's
`padaccheda` field, which means "an editor said so". It goes to a sidecar,
labelled `source: "engine"`, and the reader shows it as analysis rather than
as the text. The Aṣṭādhyāyī is also the hardest possible test set — it is
Pāṇini's metalanguage, full of pratyāhāras (अच्, हल्, ङः) that are not words
in any lexicon — so ordinary verse does better; how much better is not known,
because there is no ordinary-verse ground truth in this repository to measure
against. Saying "probably better" and leaving it unmeasured is the honest
position, not a claim of accuracy.

    python3 tools/build_padaccheda.py --paths kavya_alankara,stotra
    python3 tools/build_padaccheda.py --evaluate     (re-run the scoring above)

Output: dge/data/_padaccheda/<slug>.json
        {unit_id: [[piece, piece, …], …]} — one list per written token that
        was split, in the order the tokens appear; a token with no analysis is
        absent rather than echoed.
"""

import argparse
import collections
import glob
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from padaccheda import Segmenter, strip_punct, is_devanagari   # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, 'dge', 'data')
OUT_DIR = os.path.join(DATA, '_padaccheda')
HIGHLIGHT = os.path.join(DATA, '_highlight')
MORPH = os.path.join(DATA, '_morph')

DEVA_WORD = re.compile(r'[ऀ-ॣ०-ॿ]+')
TRAIL = re.compile(r'[।॥०-९\s]+$')


def load_vocab():
    """Every word this library can recognise: कोश headwords and verb forms from
    the highlight index, plus the declined nominal forms only _morph carries.

    _morph matters more here than anywhere else. Without it रामस्यैव has no
    analysis at all — रामस्य is a declension, and declensions are exactly what
    the other indexes do not hold."""
    vocab = set()
    for path in glob.glob(os.path.join(HIGHLIGHT, '*.json')):
        if os.path.basename(path) == 'manifest.json':
            continue
        with open(path, encoding='utf-8') as fh:
            raw = json.load(fh)
        for key in ('k', 'd', 'b'):
            if raw.get(key):
                vocab.update(raw[key].split('\n'))
    n_index = len(vocab)
    for path in glob.glob(os.path.join(MORPH, '*.json')):
        with open(path, encoding='utf-8') as fh:
            for word in json.load(fh):
                if not word.startswith('_'):
                    vocab.add(word)
    return vocab, n_index


def unit_texts(doc):
    """(unit_id, devanagari text) for every unit a grantha carries."""
    shlokas = doc.get('shlokas')
    if isinstance(shlokas, dict):
        for key, val in shlokas.items():
            if isinstance(val, dict):
                text = val.get('sa') or val.get('sanskrit_text') or ''
                if isinstance(text, str) and text:
                    yield str(key), text
    for item in doc.get('items') or []:
        if not isinstance(item, dict):
            continue
        uid = str(item.get('id') or item.get('reference') or '')
        base = item.get('sanskrit_text') or item.get('samhita_patha') or item.get('sa') or ''
        if isinstance(base, str) and base:
            yield uid, base
        for sub in item.get('shlokas') or []:
            if not isinstance(sub, dict):
                continue
            sid = uid + ('#' + str(sub.get('number')) if sub.get('number') is not None else '')
            text = sub.get('sanskrit_text') or sub.get('sa') or ''
            if isinstance(text, str) and text:
                yield sid, text


def corpus_frequency(paths=None):
    """How often the corpus actually writes each word.

    This is what stops the search preferring a chain of rare-but-real words
    over the obvious reading: नवद्युनाथप्रतिमप्रभाय parses into six lexicon
    entries and into nothing at all, and frequency is what makes it choose
    nothing."""
    freq = collections.Counter()
    for path in iter_data_files(paths):
        try:
            with open(path, encoding='utf-8') as fh:
                doc = json.load(fh)
        except Exception:
            continue
        texts = []
        shlokas = doc.get('shlokas')
        if isinstance(shlokas, dict):
            for val in shlokas.values():
                if not isinstance(val, dict):
                    continue
                if isinstance(val.get('sa'), str):
                    texts.append(val['sa'])
                for com in (val.get('commentaries') or {}).values():
                    if isinstance(com, str):
                        texts.append(com)
        for _uid, text in unit_texts(doc):
            texts.append(text)
        for text in texts:
            for match in DEVA_WORD.finditer(text.replace('<br>', ' ')):
                word = TRAIL.sub('', match.group(0))
                if len(word) >= 2:
                    freq[word] += 1
    return freq


def iter_data_files(paths=None):
    for path in sorted(glob.glob(os.path.join(DATA, '**', 'data.json'), recursive=True)):
        if 'ocr_staging' in path:
            continue
        if paths:
            rel = os.path.relpath(path, DATA)
            if not any(rel.startswith(p) for p in paths):
                continue
        yield path


def split_text(seg, text):
    """[[piece, …], …] for the tokens in this unit that have an analysis."""
    out = []
    for match in DEVA_WORD.finditer(text.replace('<br>', ' ')):
        token = TRAIL.sub('', match.group(0))
        if not token or not is_devanagari(token):
            continue
        got = seg.confident_split(token)
        if got:
            out.append([token] + [w for w, _rule in got])
    return out


def evaluate(seg):
    """Score against the editor padacchedas the repository already ships."""
    path = os.path.join(DATA, 'vedanga/vyakarana/ashtadhyayi/sutrapatha/data.json')
    if not os.path.exists(path):
        print('no ground-truth file to evaluate against', file=sys.stderr)
        return 1
    with open(path, encoding='utf-8') as fh:
        doc = json.load(fh)
    exact = same = wrong = declined = 0
    for item in doc.get('items') or []:
        pc = item.get('padaccheda')
        text = item.get('sanskrit_text') or ''
        if not pc or not isinstance(pc, list) or not text:
            continue
        # The editor writes compound seams as '-' inside a piece; those are
        # boundaries too, and counting them as mismatches would score the
        # segmenter down for agreeing.
        editor = [p for x in pc for p in strip_punct(x).split('-') if p]
        if len(editor) < 2:
            continue
        tokens = [strip_punct(t) for t in text.split() if is_devanagari(t)]
        if len(tokens) != 1:
            continue
        got = seg.confident_split(tokens[0])
        if not got:
            declined += 1
            continue
        ours = [w for w, _ in got]
        if ours == editor:
            exact += 1
        elif set(ours) <= set(editor) or set(editor) <= set(ours):
            same += 1
        else:
            wrong += 1
    offered = exact + same + wrong
    print(f'ground truth: {offered + declined} single-token sutras with an editor padaccheda')
    print(f'  offered  {offered}')
    print(f'  exact    {exact} ({100 * exact / max(1, offered):.0f}% of offered)')
    print(f'  same pieces, different depth {same}')
    print(f'  wrong    {wrong} ({100 * wrong / max(1, offered):.0f}% of offered)')
    print(f'  declined {declined}')
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--paths', default='', help='comma-separated data/ prefixes to build (default: all)')
    ap.add_argument('--evaluate', action='store_true', help='score against the shipped editor padacchedas and stop')
    ap.add_argument('--limit', type=int, default=0, help='stop after this many granthas (for a quick look)')
    ap.add_argument('--out', default=OUT_DIR)
    args = ap.parse_args(argv)
    paths = [p.strip() for p in args.paths.split(',') if p.strip()]

    t0 = time.time()
    vocab, n_index = load_vocab()
    print(f'{len(vocab):,} words of vocabulary '
          f'({n_index:,} from the highlight index, {len(vocab) - n_index:,} declensions from _morph)')
    print('counting corpus frequencies…', flush=True)
    freq = corpus_frequency(paths)
    print(f'  {len(freq):,} distinct written words')
    seg = Segmenter(vocab, freq)

    if args.evaluate:
        return evaluate(seg)

    os.makedirs(args.out, exist_ok=True)
    files = units = splits = 0
    for path in iter_data_files(paths):
        try:
            with open(path, encoding='utf-8') as fh:
                doc = json.load(fh)
        except Exception:
            continue
        slug = os.path.relpath(os.path.dirname(path), DATA)
        found = {}
        for uid, text in unit_texts(doc):
            units += 1
            rows = split_text(seg, text)
            if rows:
                found[uid] = rows
                splits += len(rows)
        if not found:
            continue
        files += 1
        name = slug.replace('/', '__') + '.json'
        with open(os.path.join(args.out, name), 'w', encoding='utf-8') as fh:
            json.dump({'slug': slug, 'source': 'engine',
                       'tool': 'tools/build_padaccheda.py',
                       'units': found},
                      fh, ensure_ascii=False, separators=(',', ':'))
        if args.limit and files >= args.limit:
            break
    print(f'{files} granthas, {units:,} units, {splits:,} tokens split '
          f'in {time.time() - t0:.0f}s -> {os.path.relpath(args.out, REPO)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
