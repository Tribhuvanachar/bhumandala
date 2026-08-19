# Search and storage architecture — where things should live, and why

_Written 18 Aug 2026, in answer to: should each section (Kāvya, Āyurveda,
Vedāṅga, Dvaita Vedānta, Nyāya, Mīmāṃsā …) have its own search index, with a
global index alongside? And which of it belongs in which repository?_

Every number below was measured against the live index, not estimated.

---

## 1. The finding that changes the question

A single search today downloads **5 to 40 MB of index**.

| query | index downloaded |
|---|---|
| मोक्षः | 5.1 MB |
| कृष्ण | 6.7 MB |
| धर्म | 9.8 MB |
| वागर्थाविव | 14.9 MB |
| राम | **16.1 MB** |
| तपःस्वाध्यायनिरतं | **40.4 MB** |

The cause is the posting layout, not the corpus size. A trigram is filed by its
**first two characters**, so `ram`, `ran`, `raj`, `rak` and everything else
beginning `ra` share one 3.9 MB file — and `na`, the commonest sequence in
Sanskrit, is a **7.0 MB** file that almost every query touches. The index is
188 MB across 1,797 such buckets: median 2 KB, ninetieth percentile 234 KB,
maximum 7 MB. The distribution is the problem.

**Splitting the index by section does not fix this.** Kāvya is 1.8% of the
corpus, so a Kāvya-only index makes the Kāvya-only query 1.8% of 16 MB — but a
global search still pays the full 16 MB, and global search is what a reader
uses. The section question and the speed question are separate, and the speed
question is the urgent one.

### What does fix it

Two changes, both measured against the real index:

| | राम | तपःस्वाध्यायनिरतं |
|---|---|---|
| today, by two-character bucket | 16.1 MB | 40.4 MB |
| one file per trigram | 1.3 MB | 5.7 MB |
| **+ fetch only the three rarest trigrams** | **549 KB** | **241 KB** |

1. **One file per trigram** rather than per two-character prefix. The query
   fetches what it asked for instead of every neighbour that shares a prefix.
   Costs more files — around 50,000 — which is a third of what the kośa corpus
   already ships and nothing jsDelivr minds.
2. **Fetch the rarest trigrams, not all of them.** `राम` is `^ra`, `ram`, `am$`
   … and `na`-class trigrams match half the corpus, so they cost the most and
   discriminate the least. A small document-frequency table in the manifest
   lets the client fetch the two or three rarest and verify candidates against
   the unit shards it was going to fetch anyway.

Together: **40 MB → 241 KB, about 150×**. On a phone that is the difference
between a search that works and one nobody waits for.

---

## 2. So: one index, or one per section?

**One index, partitioned — not one index per section plus a global one.**

A separate global index would duplicate every posting: 188 MB today, ~200 MB
again, growing together forever. There is no need. The manifest already records
a category per grantha, and a posting is `[granthaIdx, unitIdx]`, so **scope is
a filter, not a different index**. Kāvya-only search is the same fetch with a
predicate.

Partitioning the postings tree *by section* is still worth doing, for a reason
that has nothing to do with query speed:

- **Incremental publishing.** Kāvya changed four times this week and the Vedas
  did not. Today that rebuilds and republishes all 330 MB. Partitioned, a Kāvya
  import republishes the Kāvya partition.
- **Proportional scoped queries.** A Kāvya-scoped search reads only the Kāvya
  partition of a trigram file.
- **Global search costs a fan-out**, not a duplicate: the same trigram from
  eleven partitions, in parallel, over HTTP/2. Eleven small files, not one
  large one.

The section list falls out of the taxonomy already in use — `vedas`,
`vedanga`, `itihasa`, `purana`, `darshana`, `dvaitavedanta`, `kavya_alankara`,
`smriti_dharma`, `agama`, `stotra`, `dasa_sahitya` — with Āyurveda, Nyāya and
Mīmāṃsā joining as their own top-level nodes or under `darshana` as the
taxonomy already has them.

### What each section actually weighs

| section | granthas | units | unit shards |
|---|---:|---:|---:|
| vedanga | 8 | 26,729 | 36.9 MB |
| vedas | 42 | 23,479 | 12.0 MB |
| dvaitavedanta | 699 | 20,210 | 46.7 MB |
| darshana | 50 | 16,092 | 13.4 MB |
| itihasa | 49 | 3,203 | 14.6 MB |
| dasa_sahitya | 1 | 2,355 | 1.1 MB |
| kavya_alankara | 36 | 1,741 | 1.8 MB |
| purana | 24 | 680 | 3.5 MB |
| smriti_dharma, agama, stotra | 7 | 175 | 0.5 MB |

Note what this says about a per-section UI: four sections carry 91% of the
corpus, and six carry almost nothing. Scoped search is worth offering where a
reader would think in sections, not because the index needs it.

---

## 3. Where things should live

The rule this project has arrived at, and should keep:

> **`main` holds the app and the data small enough to serve from it. Anything
> large and derived lives on a data branch of the same repository. A separate
> repository is for a corpus with its own release cadence and its own size
> class.**

Today, and why:

| what | where | size | why there |
|---|---|---|---|
| app, catalogue, granthas | `main` | 688 MB | it is the site; Pages publishes `main` and nothing else |
| corpus-search index | `search-dist` branch | 330 MB | committed to `main` it put the site at 1,013 MB against a 1 GB ceiling |
| Kāvya corpus | `kavya-dist` branch | 61 MB | same reason, and it is rebuilt far more often than the site |
| Sanskrit WordNet | `wordnet-dist` branch | 24 MB | same |
| kośa corpus | **`bhumandala-kosha-data`** repo | ~1.8 GB | its own size class, its own build Action, its own cadence |
| audio | **`bhumandala-audio-data`** repo | 29 MB | destined for archive.org; foldered by IA identifier already |

**Do not make a repository per section.** Three reasons, in order of how much
they cost:

1. It buys nothing a branch does not. jsDelivr serves `@branch` and `@commit`
   from any repository identically; Pages ignores both.
2. It multiplies the publish step. Every corpus already needs *publish, then
   bump the pin*; eleven repositories make that eleven workflows and eleven
   pins to keep straight.
3. **The GitHub App cannot create repositories.** This is not hypothetical —
   it blocked the Kāvya data repo this week and the kośa repo in Round 4, and
   both times the answer was a branch or a hand-made repo. Designing around a
   thing that needs the project lead's hands for every new section is designing
   a bottleneck.

The one case for a new repository is the one the kośa corpus already makes: a
body of data big enough that its history would dominate the app repository's,
and independent enough to be built by its own CI on its own schedule. If the
Vijaya kāvyas and their commentaries arrive at the scale the project lead
expects — a dozen mahākāvyas of 500 to 2,000 verses each, with commentary —
that is still tens of megabytes, which is a branch, not a repository.

---

## 4. What to do, in order

1. **Per-trigram postings + a document-frequency table**, and a client that
   fetches the rarest trigrams. The 150× win, and it touches
   `build_search_index.py` and `dge-search.js` only. Nothing about the corpus
   or the repositories changes.
2. **Partition the postings by section** in the same pass. Scoped search
   becomes proportional, and a Kāvya import stops republishing the Vedas.
3. **Scoped search in the UI**, once (1) and (2) are in: a section selector on
   the corpus-search panel, defaulting to everything.
4. **Leave the repository layout as it is.** Branches for derived corpora,
   repositories only for the kośa and the audio.

Until (1) is done, the honest statement about corpus search is that it works
and it is expensive: every query pays megabytes. That is worth saying out loud
rather than discovering on a phone.
