# DGE search-engine architecture (7 Sep 2026)

## A. Architecture summary

One meaningful content item → one stable canonical URL → one useful HTML document → rich internal links → sitemap →
search-engine understanding. The interactive reader is unchanged; beside it, a **build step** turns the same
`dge/data` into a crawlable tree of static pages:

```
dge/data/library.json + dge/data/**/data.json          (source of truth, unchanged)
        │
        ▼  tools/seo/build_seo_site.py  (Python, no JavaScript in the output, ~3 min for the corpus)
_site/dge/<canonical path>/index.html                  one page per section (sūkta / adhyāya / sarga / part),
_site/dge/<category>/index.html                        one index page per taxonomy level and per work,
_site/sitemap.xml + sitemap-pages-N.xml + robots.txt   canonical URLs only,
dge/data/seo_urls.json                                 slug → canonical URL/title (committed; the reader's canonical)
        │
        ▼  .github/workflows/seo-pages.yml  (validate with tools/seo/validate_seo.py, then upload / deploy)
GitHub Pages "GitHub Actions" deployment  = repo files the browser needs + the generated tree
```

**Why generated pages are a deploy artifact, not files in `main`.** The published tree is already 2.7 GB against the
1 GB GitHub Pages soft limit (dge/GO_LIVE_ARCHITECTURE.md §0.3); the generated pages are ~0.9 GB more and are
derived from data already in the repo. They are rebuilt on every run and shipped with the deployment. The public
URL (`/dge/veda/rigveda/samhita/mandala-1/sukta-1/`) says nothing about where `data.json` lives, so both the data and
the pages can move to object storage or Firebase Hosting later without a single link changing.

**Audit findings that shaped this** (repository at merge 9f986d07):
- `dge/index.html`, `dge/grantha.html`, `dge/gita.html` … are JavaScript shells: without JS the body holds no text.
- The only sitemap (`sitemap.xml`, 1,220 URLs) listed the reader's `dge/index.html?path=…` query URLs; no page carried
  `<link rel="canonical">`, a per-page description or structured data; `robots.txt` was sound (allows search engines,
  blocks AI-training crawlers and `/admin/`).
- 1,280 populated texts, 866,610 verses/units, 285 M characters of Sanskrit. Four licensed corpora (878 MiB, §2.2 of
  GO_LIVE_ARCHITECTURE.md) must not be republished; they are excluded by prefix in `admin/config/seo.json`.
- Every verse of a grantha is one JSON file the reader downloads whole (a Ṛgveda maṇḍala is ~2–6 MB); the static pages
  are 15–60 KB each and need nothing else.

## B. URL specification

**Canonical grammar** (tools/seo/taxonomy.py; public root `/dge/`; the generated "All texts" catalogue is `/dge/texts/` — `/dge/index.html` stays the reader app and is never overwritten, `Site.write` refuses to replace an unstamped file; every generated page carries `<meta name="generator" content="dge-seo">`, which is also how the validator tells generated pages from the reader's own):

| internal folder (storage) | canonical URL (public) |
|---|---|
| `vedas/rigveda/shakala_shakha/samhita/mandala_01` | `/dge/veda/rigveda/samhita/mandala-1/` — sūktas at `…/mandala-1/sukta-1/` |
| `vedas/atharvaveda/shaunaka_shakha/samhita/kanda_20` | `/dge/veda/atharvaveda/shaunaka-shakha/samhita/kanda-20/sukta-143/` |
| `DvaitaVedanta/Itara/Kavya/raghavendra_vijaya/sarga_1` | `/dge/kavya/raghavendra-vijaya/sarga-1/` |
| `itihasa/mahabharata/adi_parva/mula` | `/dge/itihasa/mahabharata/adi-parva/` — chapters at `…/adi-parva/adhyaya-1/` |
| `itihasa/ramayana/ayodhya_kanda/saartha` (a layer) | `/dge/itihasa/ramayana/ayodhya-kanda/saartha/` |
| `purana/maha_purana/bhagavata_purana/skandha_10` | `/dge/purana/maha-purana/bhagavata-purana/skandha-10/adhyaya-14/` |
| `DvaitaVedanta/Itara/Stotra/prahlada_kruta_narasimha` | `/dge/stotra/prahladakrutanarasimha/` |

Rules: top-level folder renamed by `rootMap` (vedas→veda, kavya_alankara→kavya, DvaitaVedanta/Itara/DasaSahitya→dasa, smriti_dharma→smriti …);
`mula` (the default layer) vanishes; a level with a single child everywhere collapses (Ṛgveda has only the Śākala
śākhā); `mandala_01` → `mandala-1`; lowercase, hyphens, trailing slash; a text longer than ~90 KB is split into
`part-N/` pages; verses are anchors (`#v-1.1.3`, `#v-12`) inside their section page, not separate URLs (the corpus
has 867 k verses — one URL per verse would be thin pages and a 4 GB site). The build **fails** if two internal paths
map to one URL.

**Shortcut grammar** (dge/js/shortcuts.js, docs/SHORT_URLS.md) is unchanged: `?rv1.1.3`, `?smv1.5`, `?bhp10.14.8` …
It stays a *reader* address — the interactive experience is what a person tapping a short link wants — and the
reader's `<link rel="canonical">` points at the section's static page, so search engines never treat a shortcut, a
`?path=` URL or a `jumpShloka` variant as a separate document. Each static page prints its short address.

## C. Files changed / created

- `tools/seo/taxonomy.py` — internal path → canonical URL, breadcrumb labels (Devanagari + IAST), public-slug filter.
- `tools/seo/build_seo_site.py` — the generator (pages, category indexes, sitemaps, robots, `seo_urls.json`).
- `tools/seo/validate_seo.py` — the automated checks (section G).
- `admin/config/seo.json` — origin/prefix, root map, exclusions, page-size and sitemap limits, `canonicalLive`.
- `.github/workflows/seo-pages.yml` — build → validate → artifact → (optional) GitHub Pages deployment; weekly.
- `dge/js/core.js` — `dgeApplySeoCanonical`: the reader adds `<link rel="canonical">` to the generated page once
  `canonicalLive` is true. `dge/data/seo_urls.json` — the map it reads (committed, ~150 KB).
- `tests/test_seo_build.py` — grammar collisions, licence exclusion, a subset build with all per-page checks.
- This document; `docs/SHORT_URLS.md` (shortcuts).

## D. Build process (automatic for new content)

A new grantha only needs its `data.json` and a `populated: true` entry in `library.json` (what the reader already
requires). The next build then produces, with no per-text work: its canonical URL, one page per section with the
text, a unique title and description made from the labels and the first verse, the canonical tag, visible breadcrumbs
and a BreadcrumbList, JSON-LD for the page and the work, prev/next and parent/child links, an entry in the category
index above it, the sitemap entry, and a row in `seo_urls.json` for the reader's canonical. Labels come from the same
tables the Library drawer uses (`DGE_PATH_LABELS` in `dge/js/library.js`, curated labels in
`admin/config/library-overrides.json`), so naming stays in one place. `python3 tools/seo/build_seo_site.py --out _site`
runs it locally; the workflow runs it on demand and every Sunday.

## E. Sitemap

`build_seo_site.py` writes `sitemap.xml` as a **sitemap index** pointing at `sitemap-pages-N.xml` (≤ 20,000 URLs
each, canonical pages only, lastmod = build date) and `sitemap-static.xml` (the reader's own static pages, from the
list in `tools/build_sitemap.py`). No query-string URLs, no search results, no admin pages. `robots.txt` in the
artifact carries the sitemap line. The committed root `sitemap.xml` (query URLs) is superseded by the artifact's copy
the moment the Actions deployment is switched on; until then it keeps the reader discoverable as before.

## F. Canonicalisation

| URL family | treatment |
|---|---|
| `/dge/veda/…/sukta-1/` (generated) | the canonical; self-referencing `<link rel="canonical">` |
| `dge/index.html?path=<slug>&jumpShloka=N`, `&jumpVedicId=`, `&hl=`, `&layout=` | reader views; JS adds `rel=canonical` → the grantha's generated page (after `canonicalLive`) |
| `?rv1.1.3` and the other shortcuts, `?SMV=1.1` | resolve inside the reader to the same view; same canonical |
| `/bhumandala/?rv1.1.3` (landing) | 302-style JS forward to the reader |
| `dge/reader.html`, `dge/app.html` | thin layout presets that forward to `dge/index.html` |
| search results (global-search.js) | in-page overlay, no URL of its own — nothing for a crawler to enumerate |

Nothing that works today was removed or redirected.

## G. SEO validation (`tools/seo/validate_seo.py`)

Per page: exactly one unique `<title>`; a description of 40–320 chars (uniqueness reported); exactly one canonical
that equals the page's own URL; `<html lang>`; exactly one `<h1>`; breadcrumb `<nav>`; JSON-LD parses and carries a
BreadcrumbList; no `noindex`; Devanagari present on text pages; page size under 400 KB; every internal link resolves
to a generated page. Site-wide: every page is in a sitemap and every sitemap URL exists; no orphan (breadth-first
reachability from `/dge/`); no duplicate canonical. Exit 1 on any blocking finding; the JSON report is uploaded by the
workflow as `seo-reports`.

## H. Remaining issues (need a person, a setting, or another project)

1. **Nothing is published until the Pages source is switched.** Settings → Pages → Source → *GitHub Actions*, then run
   `DGE — SEO pages` with `deploy=true`, then set `canonicalLive: true` in `admin/config/seo.json`. Alternatively the
   Firebase Hosting deploy (blocked on the service-account secret name) can ship the same `_site` tree.
2. **Size.** Repo files the browser needs (~3.2 GB) + generated pages (~0.9 GB) is far above the 1 GB Pages soft limit
   (already the case before this work). The durable fix is the GO_LIVE plan: licensed corpora behind an API, large
   assets on object storage; the canonical URLs are already independent of that.
3. **Licensed corpora are not indexed** (DvaitaVedanta, Advaita Sharada, SetuTila, SarvaMula) until the lead
   classifies entries; `includePrefixes` in `seo.json` reopens any sub-tree.
4. **Authority** (backlinks, citations from institutions, Wikipedia references) and **Search Console** verification,
   sitemap submission and coverage monitoring are outside the repository.
5. **Translations** are included only from public-domain fields (`translation`, `artha`, Griffith/Macdonell); the
   reviewed modern translations in some texts need a rights decision before they go on public pages.
6. **Performance of the reader** itself (whole-grantha JSON per page, ~1.9 MB of JS): the static pages sidestep it for
   crawlers and first-time visitors; a lighter reader payload is a separate task.
