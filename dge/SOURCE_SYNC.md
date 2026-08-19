# Staying in step with the sources

_Written 19 Aug 2026, in answer to: the corpus came from a dozen outside
websites — can something check them every fortnight, bring back what is new,
and file it where it belongs, without anyone opening a terminal?_

Yes, in stages, and the first stage is running.

---

## 1. What we take from, and where it goes

Seventeen sources, in `admin/config/sources.registry.json`. Thirteen we have
imported from; four we read, cited or evaluated and never ingested — recorded
so that *"where did this come from, and did anyone check it?"* has an answer
for every site this project has touched.

| source | feeds | how a change is spotted |
|---|---|---|
| GRETIL | kāvya, darśana, itihāsa, purāṇa, vedas | the list of files its index offers (800 today) |
| sanskritsahitya-com/data | kāvya tier A — mūla, **Mallinātha**, padaccheda, anvaya, translations | latest commit on `master` |
| ambuda.org | kāvya tier C — Amaruśataka, Dūtavākya, Ūrubhaṅga, Bhartṛhari | the ETag of its whole-library TEI zip |
| sa.wikisource.org | kāvya tier D — the dramas, Naiṣadhīya, Kādambarī, Kāvyaprakāśa | revision ids of the 65 pages we actually import |
| dvaitavedanta.in | `dvaitavedanta` — 699 granthas, the largest single import | 3,078 links found from one seed per section |
| madhwafestivals.com · dasasahitya.net · meerasubbarao | dāsa sāhitya | the newest item in the RSS feed |
| SanskritDocuments.org | darśana, stotra | its index (221 entries) |
| IndoWordNet (pyiwn dump) | the WordNet branch | the dump's ETag |
| indic-dict StarDict repos | the kośa corpus (sister repo) | latest commit |
| sites.utexas.edu | Sāyaṇa, smṛti | its resource index (34 entries) |
| archive.org, OPenn, wisdomlib, sacred-texts, valmikiramayan | — | no automatic probe; noted for provenance |

The registry is an **index, not a copy**. Each importer family keeps its own
detailed registry — `tools/kavya/config/sources.json`,
`tools/dvaitavedanta/dv_sources.json`, and so on — and the entry points at it.
Copying them into one file would guarantee the two drift, and a source registry
that lies is worse than none.

---

## 2. The shape: check, report, then decide — three separate things

```
   every 15 days                on a click                 on a click
  ┌──────────────┐            ┌───────────────┐         ┌──────────────┐
  │ check-sources│ ── issue ─▶│ the importer  │ ──PR──▶ │ merge, then  │
  │  fingerprints│            │ for that      │         │ republish +  │
  │  17 sources  │            │ source        │         │ bump the pin │
  └──────────────┘            └───────────────┘         └──────────────┘
     imports nothing            rewrites data              reaches readers
```

**Checking and importing are deliberately not the same job.** A check is safe
unattended: it reads a few kilobytes and writes a fingerprint. An import is
not — it rewrites granthas, and this project already has the case that proves
it: merging the Kāvya corpus into `dge/data` would have *appended a second copy
of the Raghuvaṃśa* rather than updating it, 19 sargas silently becoming 38. An
unattended fortnightly job must never be able to do that.

And a change upstream is not automatically a change wanted. A Wikisource edit
may be a correction or may be vandalism. dvaitavedanta.in publishes no licence,
so a new section there is a question for the project lead before it is a job
for a crawler. The check reports; a person decides; the importer runs.

### What runs today

`.github/workflows/check-sources.yml` — 06:00 UTC on the 1st and the 16th, and
on demand. It fingerprints every source, writes the comparison into the run
summary, **opens an issue** when something moved (a workflow log nobody visits
is not a notification), and commits the new fingerprints so the next run
reports the *next* change rather than the same one forever.

`tools/check_sources.py` is the whole of it, and it is honest about its limits:
five sources have no automatic probe and say so rather than reporting "no
change" from a check that never happened.

---

## 3. The button, and why it is a GitHub button today

**Today — and this needs no setup:**

> **github.com/Tribhuvanachar/bhumandala → Actions → pick the workflow on the
> left → "Run workflow" → green button.**

That is the one click. Everything in this project already works this way:
*Kāvya tracker — refresh*, *Check sources for updates*, *Import Kāvya corpus*,
*DGE re-index*, *Publish the Sanskrit WordNet*. Each shows its result in the
run summary — counts, what changed, what to do next — so you never read a log.

**From the site's own admin panel** — `admin/workflows.html`, built, and
running today in its fallback form. The site is static on GitHub Pages: a page
cannot start a job by itself, and it must never hold a token that could
(anyone could read it out of the browser). So it goes through one small
server-side hop:

```
admin/workflows.html  ──▶  Firebase Function  ──▶  GitHub API
(admin latch +            (holds a fine-grained    (workflow_dispatch;
 Firebase Auth)            token as a secret;       ref is always main,
                           reads the caller's       never caller-supplied)
                           role from Firestore)
```

The page lists the same five workflows either way. **Until the Function is
deployed every button opens the GitHub Actions page instead** — one tab away,
exactly as capable, and with no new secret to protect. The page says which of
the two it is doing, on its face, rather than looking the same in both.

Deploying it needs two things that are the project lead's to create, both
described in `FIREBASE_SETUP.md` §12: the **Blaze** plan (a Function on the
free plan cannot reach `api.github.com` at all) and a **fine-grained token,
this repository only, Actions read-and-write only**. A classic PAT with `repo`
scope in a Function is how a project loses its repository.

What the Function will and will not do, since it is the thing holding a token:
only the five workflows in `functions/workflows.json`, only their declared
inputs, only from `main`, only for a caller whose **Firestore** role is high
enough — `superadmin` for anything that republishes text a reader will see,
`admin` for the reporting and tracker jobs — one press a minute per account,
and every press recorded in `workflow_dispatches` with who, what, and whether
GitHub accepted it.

---

## 4. What to build next, in order

1. **Watch what we have not watched.** Five sources have no automatic probe.
   archive.org is the one that matters — its metadata endpoint gives a real
   `item_last_updated` per item, so the audio can be watched properly.
2. **Report *what* changed, not just *that* it changed.** The fingerprint says
   "GRETIL moved"; the useful message is "GRETIL added
   `sa_bhavabhuti-uttararamacarita.xml`" — which the html_index probe already
   has the data for, since it holds the list, and needs only to diff the two
   lists instead of hashing them.
3. **A one-work import path.** Today the Kāvya importer runs over everything;
   `--works <id>` exists but no workflow input exposes it. A change to one
   Wikisource page should be re-importable on its own.
4. **Deploy the admin panel's Function.** The panel itself is built; what is
   missing is the Blaze plan and the fine-grained token, above. Until then it
   is the same five buttons, opening GitHub.

---

## 5. The standing caution

Three of the sources we depend on most — sanskritsahitya, dvaitavedanta.in, the
`indic-dict` mirrors — publish **no licence at all**. This project's own
convention is that absence of a licence is not permission, and each is used
under case-by-case authorisation recorded by the project lead. A sync that
pulls automatically every fortnight quietly widens what was authorised once.
That is a reason for the fortnightly job to stop at *reporting* — which is what
it does — and for the decision to import to stay a person's.
