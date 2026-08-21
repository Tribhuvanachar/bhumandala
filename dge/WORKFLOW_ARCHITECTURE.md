# The workflow architecture — what to add, and what not to

_Written 21 Aug 2026, in answer to: which other workflows should exist so DGE
keeps itself continuously updated — every section of the site, and especially
What's New? A proposed eight-workflow lifecycle (source sync, content
validation, derived-data builder, master orchestrator, user-report processor,
feedback intake, morphology audit, health check) was on the table; this maps
it onto what the repository actually already has, and names the real gaps._

_Companion to `SOURCE_SYNC.md` (external sources) and the feedback-pipeline
design note in `PENDING.md` (20 Aug). When those disagree with this file on
their own subjects, they win._

---

## 1. More of the proposal exists than the workflow page shows

`admin/workflows.html` lists five workflows. The repository has **twenty**,
and the five-item page is a curation choice, not the inventory. Mapping the
proposed lifecycle onto them:

| Proposed | Already here | Status |
|---|---|---|
| `sync-sources` — detect, stage, never overwrite | `check-sources.yml` (1st & 16th, fingerprints 17 sources, opens an issue, imports nothing) **plus** per-source importers that each open a PR: `ingest`, `ingest-commentaries`, `ingest-gretil-bulk`, `ingest-sayana-smriti`, `import-kavya`, `import-dasa-sahitya`, `extract-dvaitavedanta`, `darshanas`, `vedavani-extract` | **Built.** The check → decide → import split is deliberate; `SOURCE_SYNC.md` §2 is the argument. |
| `validate-content` — the gate | `tools/validate_data.py`, `tools/check_content.py`, `tools/audit_library.py`, `run_tests.sh` (no-network unit tests) | **Tools exist; the gate does not.** See §2.1 — this is the single biggest gap. |
| `rebuild-derived-data` | `interlink.yml` — any push to `main` touching library content rebuilds the prayoga index, backlink shards and library status automatically. `reindex.yml` (search, manual — 330 MB republish + CDN pin bump), `kavya-tracker.yml` (auto after a kāvya import, via `workflow_run`), `publish-wordnet.yml` | **Mostly built.** The cheap derived data is already automatic; the expensive index is manual on purpose. |
| `content-change-pipeline` — master orchestrator | — | **Deliberately not built.** See §4. |
| `process-user-reports` + `check-feedback` | The `[DGE-CONTENT-GAP]` templated mailto is live in the reader; the full weekly triage pipeline is designed, with its safety boundary, in `PENDING.md` (20 Aug) | **Designed, intake shipped, processor pending.** The inbox-reading half runs as a scheduled assistant session, not a GitHub Action — Actions has no inbox. |
| `morphology-audit` | Build scripts only (`build_morphology.py`, `build_dhatu_forms.py`, `build_krt_form_index.py`, `build_prakriya.py`…) | **Gap.** See §2.4. |
| `health-check` | — | **Gap, and the highest-value one after CI.** See §2.2. |

The remaining workflows (`probe-*`, `gemini-enrich`, `recover-dv-structure`)
are investigation scaffolding and one-off recovery — fine as they are, never
candidates for the admin page.

---

## 2. The workflows to add, in priority order

### 2.1 `ci.yml` — the validation gate (build first)

Nothing runs on a pull request today. `validate_data.py` is invoked inside
several importers — and in three of them as `validate_data.py || true`, a
report rather than a gate. A hand-edit to `dge/data/`, `admin/content/` or
`admin/config/` reaches `main` unchecked.

One workflow, `on: [pull_request, push: {branches: [main]}]`, running what a
careful contributor already runs by hand:

- `./run_tests.sh` — the unit suite; no network, no third-party packages.
- `python3 tools/validate_data.py` — **strict**, exit code honoured.
- `python3 tools/check_content.py` — every admin/content page parses and
  carries the keys its page reads.
- `python3 tools/audit_library.py` in check-only mode — no orphan
  `data.json`, no dangling `library.json` entry, no stale `populated` flag.
- The cache-bust convention (§6.1 of `PROJECT_BRIEF.md`): if a PR touches
  `dge/js/*.js` or `dge/css/*.css` without bumping `?v=`, or changes
  `index.html` structure without bumping both the meta stamp and
  `DGE_EXPECTED_HTML_VERSION`, fail with a message that says which pair to
  bump. This convention is currently enforced by memory alone.

This is the proposed `validate-content.yml`, but as a required check on every
change rather than another button. Once it exists, the `|| true` escapes in
the importers can be removed — an importer PR that fails validation should
look red.

### 2.2 `health-check.yml` — daily integrity monitor

Nothing currently notices decay. The project has already paid for that once:
a rebuilt search index sat unreachable because the pin in `config.js` was
not bumped after publishing (`PENDING.md`, 20 Aug) — live for readers only
by luck of the old pin still resolving.

Daily, 01:00 UTC (= 6:30 am IST, on the project lead's phone with morning
coffee), report-only:

- **The site responds** — fetch the entry page, `dge/index.html`, and one
  grantha `data.json` from the live origin.
- **Pin drift** — the reader pins *commit hashes*, not branches
  (`appConfig.kavyaDataBase`, `wordnetDataBase`, the search-index pin, the
  kosha pin into `bhumandala-kosha-data`). Compare each pinned hash against
  the tip of its dist branch. Pinned ≠ tip means a republish happened and
  the second step was forgotten — exactly the failure already lived through.
- **Dist branches are alive** — `search-dist`, `kavya-dist`, `wordnet-dist`
  exist and their key files are fetchable through jsDelivr, not just at
  origin (the CDN edge has diverged from origin before).
- **Corpus counts** — regenerate library status in-memory and diff against
  the committed `admin/config/library-status.json`; a large unexplained
  swing in verse counts is worth a look even when every file parses.
- **Recent workflow failures** — any scheduled workflow red on its last run.
- **Source-check staleness** — `check-sources` fingerprints older than ~20
  days means the fortnightly job has silently stopped.

Output: update **one rolling issue** (`DGE health`), the way `check-sources`
opens issues — a workflow log nobody visits is not a notification, and one
issue per day is noise that trains the reader to ignore it. Green days
append nothing.

### 2.3 `whats-new-draft.yml` — the What's New drafter

This is the section the question singled out, and the honest answer is that
the *data* for it is already computed — it is just never turned into words.

`admin/content/whats-new.json` is the reader-visible panel, hand-edited,
re-read every time the panel opens. Meanwhile `interlink.yml` already
refreshes `library-status.json` on every content push — so the repository
knows, mechanically, when a section gains a work or a work gains content.

The drafter:

- **Trigger:** `workflow_run` after `interlink.yml` completes (it is the job
  that refreshes the status snapshot), plus `workflow_dispatch`.
- **Diff** the two most recent versions of `library-status.json` in git
  history: leaves newly `populated`, item counts materially changed, new
  taxonomy sections.
- **Draft** one `updates[]` entry per real change — date, title, a
  one-sentence description in the panel's existing register ("विष्णुस्मृतिः —
  97 adhyayas, 2,363 verses, newly live."), counts taken from the status
  snapshot, not invented.
- **Cross-check `comingSoon[]`** while there: an entry whose subject is now
  populated (the panel currently promises Harivaṃśa "blocked on a GRETIL
  page-format fix" — the drafter should notice the moment that stops being
  true) is flagged for removal or promotion into `updates[]`.
- **Open a PR. Never push.** These are words a reader sees, exactly the
  class of write this repository routes through review everywhere else. The
  PR is small, arrives within minutes of content landing, and merging it
  *is* the publish — `modals.js` reads the file uncached.

Two things this workflow must never do: invent an entry for a change the
status diff cannot substantiate, and touch `updates[]` history (existing
entries are a record, not a feed to groom).

The same PR is the natural place to staple every "a human should glance at
this" consequence of a content landing — which is most of what a master
orchestrator would have done, without the orchestrator (§4).

### 2.4 `morphology-audit.yml` — monthly, report-only

The vyākaraṇa layer (Dhātupāṭha, Śabdapāṭha, kṛdanta, prakriyā, WordNet) is
the one part of the corpus that is *generated*, so it can be *audited*
mechanically against itself:

- dhātus with no derivable forms; surface forms whose root code resolves to
  nothing; disagreements between the tiṅanta and kṛt form indexes and their
  sources; lakāra/person/number holes in paradigms that claim completeness;
  WordNet lemmas absent from the kośa corpus.

Monthly, artifact + issue-on-findings, and emphatically **audit, not
repair** — the लभ्यः case (`PENDING.md`, 20 Aug) showed the correct outcome
is sometimes "this is a build gap, rebuild" and sometimes "genuinely absent
from the source; log it, do not fabricate." That fork is a human's.

### 2.5 `publish-audio.yml` — a permanent home for extracted audio

Already on the backlog in its own right: extracted recitation audio lives in
workflow artifacts with a 14-day expiry, which is a slow-motion deletion.
The pattern is already established three times over — a dist branch
(`search-dist`, `kavya-dist`, `wordnet-dist`) or a Release per corpus,
force-pushed as a publication, pinned by hash from the reader. This is the
same workflow shape as `publish-wordnet.yml` with a different payload, and
it should exist before the next VedaVaNi extraction run, not after.

### 2.6 The feedback pipeline — build to the existing design, not the proposal

The proposal's `check-feedback` → `process-user-reports` pair is the right
separation, and `PENDING.md` (20 Aug) already carries a stricter version of
it, designed around this project's actual threat model: an inbox is a
remote-triggerable write path, so **auto-merge is available only for a
single, mechanically-verifiable class of change** — a templated
`[DGE-CONTENT-GAP]` report resolving to one exact field in one file under
`dge/data/`, verified against an already-trusted source before it is
applied. Everything else becomes an issue for a human, and mail without the
template tag is not read at all.

What belongs in *this* repository's workflow layer is only the last mile: a
`workflow_dispatch` job that takes a proposed single-field correction,
applies it on a branch, runs the §2.1 gate, and opens the PR with the report
quoted verbatim. The inbox reading and classification run in the scheduled
assistant session, outside Actions, per that design note. Do not rebuild
this from the generic proposal — the PENDING version has already survived
contact with the safety questions.

---

## 3. Section by section: how each part of the site stays current

The site's sections do not need a workflow each. Every reader-facing section
falls into one of four update patterns, and the machinery above covers all
of them:

| Pattern | Sections | How it updates | What's New source |
|---|---|---|---|
| **Imported corpus text** | Vedas, Sarvamūla / DvaitaVedānta, Itihāsa, Purāṇa, Smṛti, Stotra, Kāvya, Darśana, Nītiśāstra, Upaveda, Āgama, Dāsa Sāhitya, Nirukta, Chandas | `check-sources` reports → the section's importer opens a PR → merge → `interlink.yml` rebuilds derived data → `reindex.yml` when warranted (its summary already says when) | `library-status.json` diff — the §2.3 drafter sees every one of these automatically |
| **Generated reference layers** | Aṣṭādhyāyī enrichment, Dhātupāṭha, Śabdapāṭha, kṛdanta, prakriyā, WordNet | Rebuilt by their `tools/build_*.py` scripts when sources or code change; audited by §2.4 | Drafter, when a rebuild changes counts; hand-written when the news is a *feature* ("7 commentary layers") rather than a count |
| **Curated data** | Guru Paramparā, Tīrtha Prabandha, audio catalogue, kosha status | Hand-edited through their admin pages, committed by hand | Hand-written entry in the same commit — curation news ("210 figures across 19 lineages") is editorial by nature |
| **Site words and behaviour** | home, About/Support, tour, menus, What's New itself | Hand-edited JSON under `admin/`, guarded by `check_content.py` — which the §2.1 gate finally makes mandatory | Not news — the panel does not report on itself |

The rule of thumb that falls out: **anything whose change is visible in
`library-status.json` gets its What's New entry drafted for free; anything
curated by hand writes its own entry in the same commit.** No section needs
more than that, and no new per-section workflow is required — the kāvya
tracker stays the one bespoke tracker because its corpus lives on a dist
branch outside the status snapshot's view.

---

## 4. What not to build

- **The master orchestrator.** Chaining
  validate → build → index → publish into one `content-change-pipeline.yml`
  re-couples exactly what `SOURCE_SYNC.md` §2 deliberately separated. This
  repository's own near-miss is the argument: an unattended merge would have
  appended a second Raghuvaṃśa — 19 sargas silently becoming 38. The
  pipeline here is *event-driven with a human valve in the middle*:
  automation on both sides of the merge button, a person at the button. Also
  practically: `workflow_run` chains cap at three levels, and
  `interlink.yml` + `kavya-tracker.yml` already spend two.
- **Auto-import when a source changes.** A Wikisource edit may be a
  correction or vandalism; dvaitavedanta.in publishes no licence. Check →
  issue → a person dispatches the importer. Already the standing policy.
- **Auto-publishing What's New.** Drafting is mechanical; deciding what is
  worth a reader's attention is editorial. PR, always.
- **A silent auto-repairing validator.** `validate_data.py` reports;
  `audit_library.py` repairs only the three faults it can prove. Anything
  "cleverer" fabricates, and rule 4 of `PROJECT_BRIEF.md` §6 applies:
  invented content is worse than missing content.
- **Fifteen buttons on `admin/workflows.html`.** The page's five-workflow
  curation is right. Of the additions here, only the What's New drafter and
  the morphology audit earn a button (admin tier, report-only colours); CI
  runs on PRs, the health check runs itself, and both surface through
  issues, not buttons.

---

## 5. Order of work

1. **`ci.yml`** — the gate. Everything else assumes it; it also finally
   enforces the cache-bust convention and `check_content.py`.
2. **`health-check.yml`** — pin drift alone justifies it; the failure it
   watches for has already happened once.
3. **`whats-new-draft.yml`** — the visible payoff: content lands, and the
   panel PR is waiting before anyone remembers to write it.
4. **`publish-audio.yml`** — before the next extraction run expires.
5. **`morphology-audit.yml`** — monthly, once the gate exists to keep its
   fixes honest.
6. **Feedback pipeline last mile** — per the `PENDING.md` design, with the
   project lead present to confirm the auto-merge boundary first.

Everything above obeys the one rule that already governs this repository:
**the canonical corpus under `dge/data/` is the only source of truth, and
every index, tracker, status file and panel is a reproducible output of
it** — regenerated by machinery, reviewed by a person wherever a reader
will see the result.
