# Handoff — Sāyaṇa Bhāṣya & Smṛti commentary import

For Claude Code, to run in the `bhumandala` repo. Read `AUDIT.md` first: it is the
answer to "is Sāyaṇa loaded, and do the smṛtis have their commentaries" (no, and no).

## Why the dump isn't in this zip

The Cowork sandbox has no scraping egress — `curl` to wisdomlib, sacred-texts,
GRETIL and archive.org all fail at the proxy (`CONNECT tunnel failed, 403`). Only
`git clone` and the model's own fetch tool get out. So the data materialises when
the importer runs in **GitHub Actions**, exactly as the Dasa Sahitya, Ashtadhyayi
and Itihāsa imports did.

What *is* finished and verified here: the doc-ID map, the parsers, the alignment
guards, the merge logic, the workflow, the licence triage. The run is one button.

## Install

```
tools/sayana_smriti/          <- everything except the workflow
.github/workflows/ingest-sayana-smriti.yml
```

```bash
mkdir -p tools/sayana_smriti
cp -r dge-sayana-smriti-import/* tools/sayana_smriti/
mv tools/sayana_smriti/.github/workflows/ingest-sayana-smriti.yml .github/workflows/
pip install -r tools/sayana_smriti/requirements.txt
python tools/sayana_smriti/tests/test_parsers.py     # 15 tests, all green
```

## Run

Smoke test first — 50 mantras, ~1 minute, proves the alignment guard on live pages:

```bash
python tools/sayana_smriti/import_sayana_rigveda.py --dge-root dge --mandala 1 --limit 50 --dry-run
```

Then the real thing (Actions → *Ingest — Sāyaṇa Bhāṣya & Smṛti commentaries*, or):

```bash
python tools/sayana_smriti/import_sayana_rigveda.py --dge-root dge          # ~3.5 h, 10,552 pages
python tools/sayana_smriti/import_smriti.py       --dge-root dge --discover-gdocs
python tools/sayana_smriti/patches/taxonomy_patch.py --dge-root dge
python dge/build_search_index.py
```

The workflow caches HTTP responses by URL, so a timeout-and-rerun resumes rather than
refetching. It opens a PR; it never pushes to main.

## The one thing that will bite you

`import_sayana_rigveda.py` writes commentary keyed by mantra id. If wisdomlib's page
numbering ever shifts, every mantra after the shift gets the *wrong* commentary, and
the result looks completely plausible. So the importer checks two things per page —
the page's own title must report the maṇḍala.sūkta.ṛk we asked for, **and** its
Devanagari must match the mantra already in DGE — and aborts the whole run if more
than `--max-drift` (default 2%) fail. This is tested both ways: it passes on a
correct page and fires on a deliberately misaligned one, printing the two texts
side by side. Do not disable it.

## What you'll need to review

- **`patches/core-js-labels.md`** — two small `core.js` edits. The first is cosmetic
  (proper labels for `sayana`/`wilson`). The second is *required* for the smṛti
  commentaries to be visible at all: the nested-śloka branch of
  `dgeNormalizeGranthaData()` currently hard-codes `commentaries: {}`. That fix also
  unblocks the Itihāsa/Gītā commentary layers from the earlier import.
- **`sources.json`** — every layer has an explicit `rights` field. Layers marked
  `encumbered` (Gharpure's 1936 Yājñavalkya translation, GRETIL's Nārada from
  Lariviere 1989, Bṛhaspati from Aiyangar 1941, Kṛtyakalpataru from GOS 1941–53) are
  **skipped unless** `--include-encumbered` is passed. That's a call for the project
  lead, the same way the ashtadhyayi.com data was.
- **Attribution** — each data file gets a `commentary_sources` block naming the
  commentator, edition, digitiser and licence. Keep a visible credit to
  wisdomlib.org, sacred-texts.com, GRETIL and the UT-Austin transcriptions, as DGE
  already does for ashtadhyayi.com.

## Files

```
AUDIT.md                     what's loaded, what's missing, and from where it can come
rigveda_docmap.json          10,552 mantra id -> wisdomlib doc id (verified, no crawl needed)
common.py                    throttled+cached+retrying fetcher, atomic JSON writes
wisdomlib.py                 heading-driven page parser (survives a reskin; selectors wouldn't)
parsers/sacredtexts.py       SBE volumes 2/7/14/25/33
parsers/gretil.py            GRETIL e-texts, all five verse-tag conventions
parsers/gdocs.py             UT-Austin / Olivelle Google Doc transcriptions
import_sayana_rigveda.py     the headline: Sāyaṇa into all ten maṇḍalas
import_smriti.py             mūla + commentaries for 13 smṛti/dharmaśāstra granthas
sources.json                 source registry with per-layer rights triage
patches/                     core.js edits + taxonomy patch
tests/                       15 unit tests over fixtures matching the live markup
.github/workflows/           the Actions runner
```

## Suggested order

1. Run the Sāyaṇa smoke test, eyeball five mantras against wisdomlib in a browser.
2. Full Sāyaṇa run → PR → merge. That alone gives every Ṛgveda mantra a traditional
   bhāṣya for the first time.
3. Apply the `core.js` patches.
4. Run the smṛti importer with `--only manu_smriti` first — Medhātithi is the biggest
   and best-attested layer, and it validates the wisdomlib TOC walk before you turn
   the other twelve granthas loose.
5. Try `sa.wikisource.org` from Actions for the eleven minor smṛtis. It is the only
   remaining lead for that gap, and it could not be tested from the sandbox.

## Phase 2 (not in this package)

Sāyaṇa on the *other* Vedas, and the mūla for the empty Brāhmaṇa/Āraṇyaka folders.
Public-domain English sources exist for all of it: Keith's Taittirīya Saṃhitā and his
Aitareya/Kauṣītaki Brāhmaṇas, Griffith's Yajurveda and Sāmaveda, and Whitney's
Atharva-Veda (HOS 7–8), which discusses Sāyaṇa's commentary throughout. Same importer
shape, different page maps.
