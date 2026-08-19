# `search-dist` — the built corpus-search index

Data only, no history in common with `main`. `dge/js/dge-search.js` reads it
over jsDelivr; `appConfig.searchIndexBase` in `dge/js/config.js` names the
commit, and `window.DGE_SEARCH_INDEX` has always been the override the search
client looks for.

## Why it is not on main

The index is **330 MB**. The published site was 966 MB against a 1 GB GitHub
Pages ceiling, and rebuilding the index with the `extract_text` fix — the one
that made every shloka-based grantha index its verses instead of nothing —
took it to **1,013 MB**. Pages publishes `main` and nothing else, so moving
the index here takes the site to about **685 MB** and gives the corpus room to
grow again. Same arrangement as `kavya-dist`, `wordnet-dist` and the kośa
corpus.

`dge/search_index/backlinks/` and `backlinks.json` stay on `main`: together
they are 0.1 MB, and `js/backlinks.js` reads them from beside the app.

## What is in it

```
manifest.json           granthas (categories, unit counts, shards) + df: {trigram -> posting count}
units/<slug>.json       per-grantha units: {u, pk, ck, s}
postings/<trigram>.json one file PER TRIGRAM (filename percent-encoded): [[granthaIdx, unitIdx], ...]
```

Postings used to be filed by a trigram's first 2 characters, so every
"ram"/"ran"/"raj"/... trigram shared one file — up to 7 MB, downloaded whole
for a query touching any one of them (a राम search pulled 16 MB). Now each
trigram is its own small file, and `dge-search.js` fetches only the 2-3
*rarest* trigrams of a query (by `manifest.df`) instead of every trigram in
it — a राम query is ~549 KB now, not 16 MB. See `SEARCH_ARCHITECTURE.md`.

**916 granthas, 94,664 units** — including the 36 Kāvya layers, which are read
from `kavya-dist` rather than from the site.

## Rebuilding it

`.github/workflows/reindex.yml` on `main`, which builds from `dge/data` plus a
`kavya-dist` checkout and publishes here. Then bump the pin in `js/config.js`:
the job summary prints the line.

## Coming in the next publish: postings partitioned by section

`postings/<trigram>.json` is about to become `postings/<trigram>/<section>.json`
— one file per (trigram, section) pair instead of per trigram, so a
section-scoped search reads only its own partition and a Kāvya-only import
stops republishing the Vedas' postings too. `manifest.df` (and everything
above) stays accurate for what's live right now; this section is a heads-up
for the next `reindex.yml` run, not a description of the current commit.
See `SEARCH_ARCHITECTURE.md` §4 step 2.
