# Content access architecture — three mechanisms, three different jobs

Written 12 Sep 2026 while deciding how per-shloka layers (mula, tika,
tippani, vyākhyā, pada-ccheda...) should be split into individual files and
mapped back together, across the public repo, Parabuddhi (private), and
whatever staging repo comes later. The short version: **there are two
different problems that look like one** ("keep some content away from some
people") and this project already has a built mechanism for each — the risk
was reaching for a third, weaker one out of not knowing the first two exist.

## The two real problems

**1. Rights/provenance — "this must not sit in a public git repo at all."**
Unresolved-licence or case-by-case-permission source material (from
dvaitavedanta.in, setutila.in, etc.) cannot live in a public repository's
history, full stop — a role check at read time doesn't help, because
anyone can `git clone` the whole history regardless of what today's HEAD
serves. This is `dge/PROVENANCE.md` / `tools/parabuddhi_stage.py`'s actual
job: physical separation into `Tribhuvanachar/Parabuddhi`.

**2. Access control — "this is fine to exist, just not for everyone yet."**
A commentary that's fully rights-clear but the lead wants restricted to
logged-in subscribers/sponsors/admins doesn't have a rights problem — it
has a *who's asking* problem. `dge/CORPUS_PROXY.md` already built this:
one private GCS bucket, one Cloud Function (`corpusFile`), and a role check
(`dge/firebase/functions/lib/corpus-access.js`, 51 tests) that mirrors the
client-side `role-access.js` exactly so the two can never quietly drift.
**It exists, is tested, and is switched off** (`corpusBase: ""` in
`dge/js/config.js`) — turning it on is one string, per `CORPUS_PROXY.md` §2.

Conflating these two into "private repo + BYOK GitHub PAT for everything"
(as an earlier architecture proposal did, before this document) would mean:
moving access-controlled-but-rights-clear content to a second repo for no
provenance reason, and reinventing per-request role checking with a
GitHub PAT that GitHub itself can only scope per-*repository*, never per
folder — strictly weaker than what `corpusFile`'s path-prefix gates already
do today.

## Where BYOK actually still fits

Narrower than first proposed: `corpusFile` covers every reader who can be
asked to log into this site's existing Firebase role system. BYOK is for
the one case that doesn't cover — an external scholar the lead wants to
grant access to without making them a tracked account. Build it as a
*second* resolver alongside `corpusFile`, not the primary private-access
path, and only when that specific need actually comes up.

## The per-grantha layer manifest

Every grantha folder's `_meta.json` (already present everywhere) gains a
`layers` array — the authoritative, self-describing list of what this
grantha has and where each piece currently lives. Central `library.json`
stays the search/browse rollup, generated *from* these, never hand-edited
to disagree with them.

```jsonc
{
  "directory": "bhagavata_saroddhara",
  "description": "भागवतसारोद्धारः — ...",
  "schema": "grantha_prakarana_text",
  "layers": [
    { "id": "mula", "type": "mula",
      "label": { "sa": "मूलम्", "en": "Root text" },
      "path": "mula/data.json", "access": "public" },

    { "id": "tika_vishnutirtha", "type": "tika",
      "label": { "sa": "विष्णुतीर्थटीका", "en": "Vishnutirtha's commentary" },
      "author": "Vishnutirtha", "path": "tika_vishnutirtha/data.json",
      "access": "public" },

    // hypothetical: a commentary restricted to logged-in roles, still
    // physically in THIS repo, served through corpusFile once it's on
    { "id": "tika_restricted_example", "type": "tika",
      "label": { "en": "..." }, "path": "tika_restricted_example/data.json",
      "access": "gated", "minRole": "subscriber" },

    // hypothetical: a layer whose rights are unresolved — physically
    // moved out; the local repo keeps only the pointer, never the text
    { "id": "tika_unresolved_example", "type": "tika",
      "label": { "en": "..." }, "access": "private_provenance",
      "repo": "Tribhuvanachar/Parabuddhi",
      "path": "dvaitavedanta/bhagavata_saroddhara/tika_unresolved_example/data.json" }
  ]
}
```

`access` values and what each means for where the bytes live and how the
reader fetches them:

| `access` | Bytes live in | Reader fetches via | Why |
|---|---|---|---|
| `public` | this repo, static | direct `fetch(path)` | no rights or access concern |
| `gated` | this repo, static (until `corpusFile` is on) | `corpusFile` once switched on; static fetch until then | rights-clear, role-restricted |
| `private_provenance` | Parabuddhi (or a future staging repo) | Parabuddhi's own publish step, or a later cross-repo resolver | rights/provenance unresolved |

A layer's `access` can change (an admin toggle flips `public`→`gated`, or
a rights review resolves `private_provenance`→`public`) without touching
its sibling layers or the grantha's identity — that's the whole point of
splitting per-layer instead of per-grantha.

## Still open, not decided here

- The admin-toggle-driven workflow that actually moves a `private_provenance`
  file's bytes between repos when its `access` changes (mentioned 12 Sep
  2026, not yet designed).
- Whether `gated`'s `minRole` reuses `role-access.js`'s existing gate config
  directly (`config/roleAccess` gates) or needs its own — leaning toward
  reusing it, since `corpus-access.js` already mirrors that exact system.
- Regenerating `library.json` from per-folder manifests is a real script,
  not yet written.
