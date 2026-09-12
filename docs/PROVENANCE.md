# Where the corpus comes from, and what is published

Two repositories, one direction.

```
   origin sites  ──►  Parabuddhi (private)  ──►  bhumandala (public)
                        source/                    dge/data/
                        edition/
                        provenance/  ◄── the map, which never leaves
```

## The rule

**No import lands here.** Material from a source whose rights position is
unresolved or granted case-by-case is imported into `Tribhuvanachar/Parabuddhi`,
transformed there, and reaches this repository only through that repo's
`tools/publish.py`.

The five importers that used to write straight into `dge/data` —
`extract-dvaitavedanta`, `extract-setutila`, `sync-anandamakaranda`,
`sync-advaitasharada`, `sync-meghamala` — now fail on their first step with a
pointer to the private repo. Their bodies are kept rather than deleted so the
crawl logic stays readable and its history stays attached; the working copies
live in Parabuddhi's `tools/`.

## Why

~833 of this repository's `data.json` files carried the fingerprints of the
site each was imported from. Measured across all 1,728:

| what | size | files |
|---|---|---|
| `source_html` — the origin's raw markup, verbatim | 156.4 MB | 384 |
| `source` — **the origin's own database keys**: `content_id`, `work_id`, `anchor`, `block_uuid` | 47.9 MB | 845 |
| `breadcrumb` — the origin's navigation hierarchy | 18.4 MB | 637 |
| `reference` — the same, in prose | 17.6 MB | 847 |
| `source_url` — a link to the origin page | — | 833 |

About a third of the corpus, and it makes the public copy joinable back to its
sources record by record — not by recognising the prose, but by reading an id.

Publishing strips all of it. Measured on the staged tree: **936 MB private →
465 MB public**, with the Sanskrit text byte-identical.

## The two maps

Both live in Parabuddhi and only there.

- `provenance/source/` — private ← original source. Every unit's origin site,
  URL and record ids, captured from the fields publishing is about to discard.
- `provenance/publish/` — private → public. Every published unit's path and id,
  against the edition key it came from.

Joined on `edition_key` they give the whole chain. `tools/verify_provenance.py`
checks both are complete and in step, and runs in that repo's CI.

## The guard here

`tools/verify_no_private_provenance.py` scans `dge/data` for any origin host,
record id or structural import field, and fails if it finds one.

It is deliberately independent of the publish step. Publishing scrubs what it
was told to scrub; this scans what actually arrived. The day someone re-enables
an old importer, restores a file from history, or pastes a source URL into a
note, the pipeline is not involved at all — and this still fires.

## Not yet done

**The existing 649 files have not been re-published.** They still carry their
original provenance, and the guard reports them. Running the cutover renumbers
every unit id (`DV_14063` → `1`), and `core.js`, `global-search.js`, `share.js`
and `layer-stitch.js` all address units by that id — so it breaks share links,
search results and layer stitching until those are updated and the search index
is rebuilt.

That is a deliberate stop, not an oversight: it is a breaking change and the
go-live is 17 Sep 2026. Until it is run, the guard is a report rather than a CI
gate.
