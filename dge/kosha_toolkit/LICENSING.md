# DGE Kosha — source & licence report

Scope: dictionaries for the multilingual Kosha section. Rule applied (yours):
**"no explicit licence = not cleared."** You have separately directed that this
build is strictly non-commercial / educational and asked to proceed regardless;
where a source is *Unclear* below, the importer still ingests it **but stamps
full provenance + attribution into every entry** (`source_meta.attribution`,
`source_meta.source_url`) and flags the licence in the UI, so nothing is passed
off as cleared and attribution/ShareAlike obligations are met on the CC sources.

## Primary ecosystem: `indic-dict/stardict-sanskrit`
GitHub, ~65 dictionaries, each stored as a `.babylon` **source** text file
(headword + HTML body) — cleanly parseable, no binary decoding needed. The
compiled `.dict.dz` builds live on the repo's `gh-pages` branch; we don't need
them because the importer reads the `.babylon` sources directly.

- **Repo-wide licence:** none at the top level → the repo *as a whole* is
  "all rights reserved / Unclear."
- **Per-dictionary licence:** 28 dictionaries carry their own `LICENSE.xml`.
  These are the **Cologne** re-distributions and are the cleared set.

### Cleared — Attribution + ShareAlike (Cologne, CC-BY-SA 4.0)
Verified via each folder's `LICENSE.xml` (TEI header citing Cologne Digital
Sanskrit Dictionaries / sanskrit-lexicon.uni-koeln.de). Use with attribution;
derivatives must stay ShareAlike.

- Monier-Williams — `sa-head/en-entries/mw-cologne` (and `mw-1872`), plus the
  reverse `en-head/mw-english-sanskrit`. (sa↔en)
- Apte — `sa-head/en-entries/apte-1957`, `apte-1890`; reverse
  `en-head/apte-english-sanskrit-cologne`. (sa↔en)
- Benfey, Macdonell, Capeller, Wilson, Yates, Goldstücker, Lanman,
  Shabda-Sagara, Cappeller, Edgerton (Buddhist Hybrid), Mayrhofer, Bopp,
  Böhtlingk-Roth (pw/pwg, German), Stchoupak (French), Burnouf (French) — all
  under `sa-head/en-entries/`, `sa-head/german-entries/`,
  `sa-head/french-entries/` with `LICENSE.xml`. (sa→en/de/fr)

**Recommended cleared core for launch:** `mw-cologne`, `apte-1957`, `benfey`,
`macdonell`, `mw-english-sanskrit`.

### Unclear — no explicit licence (include only on your own provenance call)
No `LICENSE.xml`; under your rule these are *not cleared*. Several are modern
compilations that may still be in copyright — treat with care.

- Sanskrit–Sanskrit koshas — `sa-head/sa-entries/`: Amarakosha
  (`amara-onto`, `amara-sudhA`), Shabdakalpadruma (`kalpadruma-sa`),
  Vacaspatyam (`vAchaspatyam-sa`), Abhidhanachintamani + parishishta,
  Abhidhanaratnamala, Anekarthadhvanimanjari, Shaiva-kosha, Vaishnava-kosha,
  Nyaya-kosha, etc. (sa→sa)
- **`shabdArtha_kaustubha` (sa→kn)** — `sa-head/other-indic-entries/`: **no
  licence in the repo.** It is a published Kannada–Sanskrit lexicon; provenance
  is yours to confirm. Also here: `apte-hi`, `samskritam-tamizham`,
  `vedic-rituals-hi`.

## Cologne originals (upstream, if you ever want to bypass indic-dict)
- `sanskrit-lexicon.uni-koeln.de` and **`github.com/sanskrit-lexicon`** —
  original MW/Apte/etc. as SLP1 **XML**, CC-BY-SA 4.0. The importer's HTML-body
  parser can be pointed at these too; the indic-dict `.babylon` mirror is
  simply more convenient.

## Your local `dict.zip` (~2.3 GB, compiled StarDict)
Any dictionary in it that is **not** in the public repos can be ingested by the
same importer (`kind='stardict'`, auto-discovered by `.ifo`). For each, confirm
source + licence yourself before publishing; the importer records whatever you
put in the config so attribution travels with the data.

## Recommended sourcing plan
1. **Launch on the cleared Cologne core** (MW, Apte, Benfey, Macdonell, MW-Eng
   reverse) — safe, attributed, ShareAlike-compliant, covers sa↔en fully.
2. **Add the Sanskrit–Sanskrit koshas** (Amara, Shabdakalpadruma, Vacaspatyam,
   Abhidhanachintamani) as *Unclear-but-classical* — these texts are old; the
   *digitisation* is what's unlicensed. Attribution to indic-dict is stamped in.
3. **Add `shabdArtha_kaustubha` (sa→kn)** as your primary Kannada bridge — your
   provenance call; attribution stamped in.
4. For Bengali (`sa↔bn`) and other languages you named, pull from the sibling
   repos (`indic-dict/stardict-bengali`, `-hindi`, etc.) or your local zip;
   verify each licence the same way.
