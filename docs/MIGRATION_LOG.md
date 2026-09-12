# Migration log — active restructuring, Sep 2026

Working record of every path/repo change made during the pre-go-live
restructuring (started 11 Sep 2026), so the eventual "fix everything that
broke" pass has an exact map instead of a reconstruction job. Explicitly
deferred per the project lead (12 Sep 2026): broken links, bookmarks, and
search results are NOT being fixed as we go — only recorded here. Update
this file in the SAME commit as any move, rename, or repo change; an entry
added after the fact defeats the point.

Format per entry: date, what moved, old → new, which repo, why, what's
known to break as a result (if anything), and status.

## Repo rename

- **Pending**: `Tribhuvanachar/bhumandala` → `Tribhuvanachar/buddhi`. Not yet
  executed. Will break: `GITHUB_REPO_CONFIG.repo` in `dge/js/config.js`,
  every `owner/repo` string in `.github/workflows/*.yml`, the `og:image`/
  canonical URLs, `sitemap.xml`, `robots.txt`, any hardcoded
  `tribhuvanachar.github.io/bhumandala/...` URL. GitHub auto-redirects the
  old name for a period but hardcoded strings won't self-heal.

## dge/ → repo root flatten

- **Pending**. Plan agreed with the project lead (12 Sep 2026):
  - Root `index.html` (the Guru Vandana gateway page) **stays as-is** —
    same file, same role. Not touched by the flatten.
  - Current `dge/index.html` (the actual reader/app) → new root
    `render.html`, sitting at repo root as a sibling to `index.html`,
    `js/`, `css/`, `data/`, `images/` — not nested, not inside `data/`.
  - `dge/js/`, `dge/data/`, `dge/images/`, `dge/firebase/`, `dge/css/`
    (merges into root's existing `css/`, no filename collisions found),
    `sw.js`, and the other live `.html` entry points (`app.html`,
    `audio.html`, `gita.html`, `grantha.html`, `kamadhenu.html`, `kosha2.html`,
    `reader.html`, `dvaitavedanta-status.html`) move to repo root as-is.
  - `dge/tools/` needs reconciling against root's own pre-existing `tools/`
    (name collision) before merging — not yet inspected.
  - Everything in `dge/` that the obsolete-file audit (12 Sep 2026) placed
    in DELETE / MOVE-to-docs / MOVE-to-Parabuddhi does NOT flatten to root
    as-is — it goes to its audited destination instead (see that report,
    reproduced in outline below).
  - `dge/js/vandana-guard.js` and any other code that currently
    redirects a deep-link back to `dge/index.html` (or the reverse: the
    gateway's "enter" action pointing at `dge/index.html`) needs
    retargeting to `render.html` post-move. Not yet done.
  - Will break: every hardcoded `dge/...` path repo-wide (JS, HTML,
    workflows, `sitemap.xml`'s ~249KB of URLs, `robots.txt`, `og:image`/
    canonical tags) until rewritten. Per the lead's instruction, this is
    being deferred, not fixed inline with the move.

## Parabuddhi cutover (data provenance)

- **Pending**. Existing, already-designed pipeline (`dge/PROVENANCE.md`,
  `tools/parabuddhi_stage.py`, `tools/verify_no_private_provenance.py`) —
  not new. Deliberately paused before this session because running it
  renumbers every unit id (`DV_14063` → `1`), which breaks share links,
  search results, and layer stitching (`core.js`, `global-search.js`,
  `share.js`, `layer-stitch.js` all address units by that id) until the
  search index is rebuilt. Project lead approved running it now
  (12 Sep 2026) and fixing the breakage after, rather than before go-live.
  Scope conflict flagged and not yet resolved: PROVENANCE.md only moves
  fingerprinted *data*, keeping importer *code* public; the lead's
  broader framing this session wants tools/importers/docs private too.
  Needs `add_repo` for `Tribhuvanachar/Parabuddhi` before any of this can
  execute (not yet granted this session).

## Obsolete-file audit (12 Sep 2026, full report in conversation)

High-confidence DELETE (not yet executed, pending lead's go-ahead):
- `dge/legacy/PrahladaKrutaNarasimhaStotra.html`
- `patches/apply_taxonomy_patch.py`, `patches/nav-snippets.md`
- `dge/veda_toolkit/superseded/*` (5 files)

MOVE to docs/ (not yet executed): ~20 loose `.md` files at `dge/`'s top
level (`GO_LIVE_ARCHITECTURE.md`, `PROJECT_STATUS.md`, `PENDING.md`, etc.)
plus a handful beside `guru-parampara/`, `tirtha/`, `tts/`, `kosha_toolkit/`,
`veda_toolkit/`. Several are named by exact path in workflow/tool comments
(`.github/workflows/*.yml`, `tools/*.py`) — those references break on move
until rewritten.

MOVE to Parabuddhi (not yet executed, scope conflict above unresolved):
`vedavani-assets.zip`, `tools/dcs/vendor/` (388MB), `importers/`, most of
`tools/`, `kamadhenu/`, `kamadhenu_dataset/`, `genie_asr_benchmark/`,
`local_drive/`.

**Urgent, independent of the reorg**: `firebase-hosting.json`'s ignore list
excludes `tools/`, `importers/`, `docs/`, etc. from deployment but NOT
`local_drive/` (a 28MB scanned copyrighted PDF) or `genie_asr_benchmark/` —
both are plausibly live-served today. Raised to the lead 12 Sep 2026,
response pending.

Needs human judgment (not yet decided): `HANDOFF.md` (split, don't
delete/move whole — §3 is read by `ask-claude.yml`), `local_drive/Panini_Dhatu/data.json`
(unreferenced anywhere, unclear if abandoned or pending),
`dge/kosha_toolkit/` + `dge/search_toolkit_pkg/` + `dge/build_search_index.py`
(generate data the live reader/admin depend on — tooling, but load-bearing).

## Per-shloka field splitting (Itara + Parabuddhi dvaitavedanta)

- **Pending, schema proposed not yet built.** Requested 12 Sep 2026: split
  monolithic per-work `data.json` files (mula + all commentaries inline
  per shloka, e.g. `DvaitaVedanta/Itara/Stotra/prahlada_kruta_narasimha/data.json`
  — 97KB/11 shlokas, `shlokas[n].commentaries[name]`) into one file per
  field, extending the convention `Bhagavata_Saroddhara/` already uses
  (`mula/data.json`, `tika_vishnutirtha/data.json`, one subfolder per
  layer, named by the actual commentary where known). Purpose: per-field
  lazy loading and per-field public/private visibility.
- Reader code (`core.js`, `grantha-reader.js`, `layer-stitch.js`) currently
  fetches one file per work and reads `commentaries[name]` inline — must be
  updated to fetch per-field files in the same pass as the data split, not
  after (this is a functional break, not a deferred link/bookmark issue).
  Not yet started.
- Also requested: an admin-toggled visibility setting that automatically
  relocates a field's file between the public and private repo when
  flipped (workflow/Action, not yet designed) — ties into the separately
  in-progress ContentResolver/BYOK access-mode work.

## Admin-tool changes already shipped (for reference, not pending)

- `dge/js/admin-editor.js`, `dge/index.html`, `dge/js/config.js`: Cut/Copy/
  Paste clipboard (localStorage-persisted), full-repo root path for
  superadmin code `2` (was capped at `dge/`). Merged to `main` 12 Sep 2026.
- `dge/data/darshana/vedanta/dvaita/DvaitaSahitya` → `.../DvaitaVedantaIn`
  (repo-wide reference rewrite done same commit). Merged to `main`.
