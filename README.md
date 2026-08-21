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
manifest.json            granthas (categories, unit counts, shards), the section
                          list (manifest.sections), and df: {trigram -> GLOBAL
                          posting count across all sections}
units/<slug>.json        per-grantha units: {u, pk, ck, s}
postings/<trigram>/<section>.json
                          one file per (trigram, section) pair (trigram
                          directory name percent-safe): [[granthaIdx, unitIdx], ...]
```

Postings are filed per trigram, not by a trigram's first 2 characters —
that used to put every "ram"/"ran"/"raj"/... trigram in one shared file, up
to 7 MB downloaded whole for a query touching any one of them (a राम search
pulled 16 MB). `dge-search.js` fetches only the 2-3 *rarest* trigrams of a
query (by `manifest.df`) instead of every trigram in it — a राम query is
~549 KB now, not 16 MB.

Each trigram is further split **by section** (`vedas`, `itihasa`,
`dvaitavedanta`, ... — `manifest.sections` lists them): an unscoped/global
query fans out across every section's file for a chosen trigram in
parallel and unions the results (same total bytes as one unpartitioned
file, just as several small requests); a section-scoped query reads only
its own partition, so scoped search is proportional to that section's size
rather than paying for the whole corpus, and a Kāvya-only import
republishes only the Kāvya partition instead of every section's postings.
See `SEARCH_ARCHITECTURE.md`.

**937 granthas, 94,941 units** — including the Kāvya layers, which are read
from `kavya-dist` rather than from the site.

## Rebuilding it

`.github/workflows/reindex.yml` on `main`, which builds from `dge/data` plus a
`kavya-dist` checkout and publishes here. Then bump the pin in `js/config.js`:
the job summary prints the line.
