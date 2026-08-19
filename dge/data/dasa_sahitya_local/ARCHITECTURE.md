# Dasa Sahitya — two folders, one eventual corpus

Two independent sources of Dasa Sahitya (Dasara Padagalu / Suladi / Ugabhoga
/ ...) now exist side by side under `dge/data/`:

| | `dge/data/dasa_sahitya/` | `dge/data/dasa_sahitya_local/` |
|---|---|---|
| Source | Web crawl (madhwafestivals, dasasahithyamahithi, dasasahitya.net, ...) | Local Android-app SQLite assets (e.g. `dasa1.db`) |
| Built by | `tools/dasa_sahitya/import_dasa_sahitya.py` | `tools/dasa_sahitya/import_dasa_sahitya_local_db.py` |
| Composers | 34 files, ~1396 compositions | 135 dasaru (`dasa1` alone), 13540 keerthanas |
| Composer names | Latin/English (romanized by the scraper) | Kannada (native, from the app's own `dasaru` table) |
| Attribution quality | 453 of 1396 (32%) filed as `untitled` — no composer known | Every row has a `dasaru_id` FK — no untitled bucket |
| Form/genre tagging | Parsed from page structure, fairly reliable | Guessed from a numeric `category` column (0-5), **unconfirmed** — see below |

They are kept separate on purpose, not because a merge is hard to write, but
because a merge done now would silently commit to guesses that haven't been
checked by a human yet (composer identity, category→form mapping). Everything
new lives under its own folder, tagged `pending`, until that review happens.

## Why "local" isn't one file

The Android app reportedly ships 4-5 SQLite assets, not one. The importer
takes `--asset-name` so each one lands in its own subfolder
(`dasa_sahitya_local/<asset-name>/...`) without overwriting a sibling asset's
data:

```
dge/data/dasa_sahitya_local/
  dasa1/
    index.json                          -- manifest: counts, category guess, per-dasaru file list
    cross_source_duplicate_review.json  -- composer-level overlap vs dasa_sahitya/, tagged pending
    dasaru/<slug>.json                  -- one file per dasaru, ASCII-transliterated slug
  dasa2/            (next asset, once provided)
  ...
  ARCHITECTURE.md    -- this file
```

To add the next asset once it's provided:
```
python3 tools/dasa_sahitya/import_dasa_sahitya_local_db.py \
    --db /path/to/dasaN.db --out dge/data/dasa_sahitya_local --asset-name dasaN
```
The raw `.db` file itself is **not** committed (it's a 30MB+ binary asset
dump, not source); only the generated JSON is. Re-run the importer whenever
a fresher copy of an asset shows up — it's a full regenerate, not additive.

## What "pending" means here, concretely

1. **Composer identity** — `dasa1/cross_source_duplicate_review.json` has
   three tiers:
   - `confirmed_duplicates` (12 composers): Kannada name and English name
     are unambiguously the same person, hand-checked after an automated
     fuzzy pass. Safe to merge once someone signs off on the record-level
     merge strategy (below).
   - `needs_human_review` (5 composers): name-root looks related (shared
     "Gopala"/"Prasanna"/"Jagannatha" stem) but Haridasa tradition reuses
     ankita names and honorifics across gurus and disciples, so a same-root
     match is not proof of the same person. Needs a Kannada-literate human
     call, not another regex.
   - Everything else (~117 of 135 app dasaru, ~4800+ keerthanas) has **no**
     plausible match — genuinely new to the corpus, not a duplicate at all.
   - The file also flags **`untitled.json`'s 370 attributable compositions**
     on the web side as a concrete merge opportunity: cross-matching their
     Kannada verse text against dasa1's fully-attributed 13540 keerthanas
     could recover a real composer name for a chunk of that 453-item pile.

2. **Category → form mapping** — the app DB's `category` int (0-5) was
   reverse-engineered from ~30 sampled rows per bucket, not documented
   anywhere:
   - `0` → `pada` (default bucket, 88% of rows — not a positive signal)
   - `1` → `ugabhoga`, `5` → `suladi` (consistent header keyword found)
   - `2` → `mundige` (riddle-padas, mostly Kanakadasa; **not yet in the
     existing `dasa_pada_text` form enum** — needs a schema addition)
   - `3` → `pada` (no consistent header keyword found — least confident)
   - `4` → `devaranama` (rows carry an explicit structured trailing block:
     song name / singer / raga / tala / style / music director / studio —
     reads like modern recorded renditions, not classical compositions;
     worth a second look at whether these belong in `dasa_pada_text` at all
     or need their own record type)

   Each imported record carries `form_confidence` explaining which case it
   is, and the manifest (`index.json` → `category_confidence`) has the same
   breakdown at the bucket level.

3. **Verse-body parsing** — `txt` mixes a variable metadata header (composer
   name repeat, a one-line description, a genre word) with the verse body,
   `<br>`-joined, no stanza markers. The importer strips only lines it can
   positively identify (exact composer-name match, known genre keywords, the
   structured trailing block for category 4) and leaves everything else
   as-is — under-stripping on purpose, since a stray header line sitting in
   the body is easy for a human to spot and fix, while over-stripped verse
   text is silently gone. 154 of 13540 records (1.1%) are flagged
   `_needs_review: true` — either genuinely empty verse text or leftover
   punctuation-only artifacts from the source.

## Publishing-size flag — decide before this reaches `main`

`dasa1/` alone is ~46MB of JSON (comparable to the existing `dasa_sahitya/`
folder's ~45MB). This repo's `.gitignore` already documents that the
published GitHub Pages site sits "about 1% under the GitHub Pages 1GB
limit" — that's why `dge/data/_wordnet/` is kept out of `main` and published
to a separate `wordnet-dist` branch instead, fetched over jsDelivr. Adding
this folder (and the 3-4 more assets still to come) directly into `main` the
same way `dasa_sahitya/` is tracked would eat further into that margin, and
this data isn't ready for the live site yet anyway (it's still `pending`
review, not merged into the browsable corpus). This is currently only on
this feature branch, not `main` — flagging so whoever merges makes an
explicit call rather than finding out at the 1GB ceiling: either mirror the
wordnet pattern (separate branch + jsDelivr) once this is ready to publish,
or keep it `.gitignore`d from `main` until the merge in step 4 below
actually happens and it folds into `dasa_sahitya/`'s existing footprint
instead of adding a parallel one.

## Path to one folder

Not done in this pass — laid out here so the next step is a decision, not a
rediscovery:

1. Get human sign-off on the 12 `confirmed_duplicates` + a call on the 5
   `needs_human_review` composers (a Kannada reader, or the screenshot of
   Dasaru names/authors mentioned as coming next, can settle both).
2. Decide a merge rule for a confirmed-duplicate composer: keep both sets of
   compositions side by side under one composer (most likely correct, since
   dasa1 and the web crawl are largely non-overlapping *compositions* even
   for the *same* composer — 983 app vs 306 web for Purandara Dasaru, near-
   zero title overlap expected), vs. run the existing `dedupe()` fingerprint
   logic (composer + first 80 Kannada chars) across both sources to catch
   the same *pada* appearing in both.
3. Resolve the `category`→`form` guesses (particularly `mundige` needing a
   schema-enum addition, and whether category-4 "rendered song" entries
   belong in the same record type at all).
4. Only then: fold `dasa_sahitya_local/<asset>/dasaru/*.json` into
   `dasa_sahitya/composers/*.json` (one write pass, composer-file-by-
   composer-file) and retire `dasa_sahitya_local/` in favor of the single
   `dasa_sahitya/` folder — at that point `also_at`/dedup provenance fields
   should record which source(s) each composition came from, same as the
   existing cross-source dedup already does for the web crawl.
5. Repeat steps 1-4 once the remaining 3-4 app assets are imported — do the
   review per-asset as each arrives rather than batching all of them, so the
   backlog of undecided composer-identity calls never gets large enough to
   be a project of its own.
