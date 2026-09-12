# DGE Kosha — source & licence report

Scope: dictionaries for the multilingual Kosha section. Rule applied (yours):
**"no explicit licence = not cleared."** You have separately directed that this
build is strictly non-commercial / educational and asked to proceed regardless;
where a source is *Unclear* below, the importer still ingests it **but stamps
full provenance + attribution into every entry** (`source_meta.attribution`,
`source_meta.source_url`) and flags the licence in the UI, so nothing is passed
off as cleared and attribution/ShareAlike obligations are met on the CC sources.

## Sources at a glance

| repo | dicts loaded | repo-level licence |
|---|---|---|
| `indic-dict/stardict-sanskrit` | 63 | none at top level; 28 folders carry `LICENSE.xml` (Cologne, CC-BY-SA 4.0) |
| `indic-dict/stardict-sanskrit-kAvya` | 17 | `LICENSE.md`: CC-BY 4.0 **except** where a 3rd party or book title is named |
| `indic-dict/stardict-sanskrit-vyAkaraNa` | 13 | no licence file at all |
| `sanskrit-lexicon/csl-orig` | 2 | Cologne's canonical sources — CC-BY-SA 4.0 |

95 dictionaries in the built corpus: 2,111,218 headwords.

## `sanskrit-lexicon/csl-orig` — the canonical Cologne text sources
A code-by-code diff found 42 of csl-orig's 44 dictionaries already loaded: the
indic-dict `.babylon` mirror redistributes the same Cologne data under other
names (`abch` = abhidhanachintamani, `lrv` = vaidya, `nybj` =
jhalki-bhima-nyaya-koshah, `acph`/`acsj` = the Abhidhānacintāmaṇi pariśiṣṭa and
śiloñcha). Only two were missing and both are now loaded, CC-BY-SA 4.0:

- **`bohtlingk-kurzere-fassung-nachtrage`** (14,995) — the *Nachträge und
  Verbesserungen* to Böhtlingk's kürzere Fassung, companion to a dictionary the
  corpus already carried.
- **`kridanta-rupamala`** (1,698) — the Cologne digitisation of the text, not
  the machine-generated paradigm table of the same name in `-vyAkaraNa`.

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

## `indic-dict/stardict-sanskrit-kAvya` — encyclopaedias, indices, concordances
Repo-wide `LICENSE.md`: *"unless otherwise specified and unless a 3rd party or
book title is explicitly mentioned in the dict name, license may be assumed to
be CC-BY 4.0."* That carve-out does the real work here — most of this repo's
value is named third-party books, so most of it is **not** covered by the grant.

### Covered by the repo grant (CC-BY 4.0)
`buddhist-mahavyutpatti`, `buddhist-pentaglot`, `chandas`, `dcs-frequency`
(Digital Corpus of Sanskrit frequencies), `rv-padapatha`, `rv-padasvara`,
`av-padasvara`, `kyv-ts-padasvara`.

### Named books — outside the grant, flagged *Unclear*
Each carries a `license_note` in its `meta.json` recording the edition and what
is actually known about its copyright status:

- **`purana-encyclopedia`** — Vettam Mani, *Purāṇic Encyclopaedia* (Motilal
  Banarsidass, 1975). **Almost certainly still in copyright.** Loaded on the
  project lead's explicit request and standing non-commercial/educational
  clearance, stamped Unclear, presented as cleared nowhere. This one is the
  live decision: if the answer is no, drop it from `dicts_config.json` in the
  data repo and rebuild.
- **`purana-index`** — V. R. Ramachandra Dikshitar, *The Purana Index*
  (University of Madras, 1951–55). Copyright status unverified.
- **`ncc`** — *New Catalogus Catalogorum* (University of Madras), an in-progress
  modern publication. Copyright status unverified.
- **`rkmath-encyclopedia-of-hinduism`** — *A Concise Encyclopaedia of Hinduism*
  (Ramakrishna Math). Modern, very likely in copyright.
- **`mahabharata-cultural-index`** — cultural index to the BORI critical
  edition. Copyright status unverified.
- Public domain by age, but still outside the repo grant because the name is a
  book title: **`vedic-index-macdonell-keith`** (Macdonell & Keith 1912 — a
  fuller digitisation than the Cologne `vedic-index-of-names-and-subjects`
  already loaded), **`index-names-mahabharata`** (Sörensen 1904),
  **`bloomfield-vedic-concordance`** (Bloomfield 1906),
  **`mahabharata-kosha-krishnacharya`** (Nirnaya Sagara Press; the source runs
  only to the letter *da*).

**Not loaded from this repo:** `rAnADe-vedic-rituals` duplicates the
`vedic-rituals-hi` already ingested from `stardict-sanskrit`.

## `indic-dict/stardict-sanskrit-vyAkaraNa` — Aṣṭādhyāyī and dhātu literature
**No licence file anywhere in the repo** → Unclear throughout, under the same
clearance as the other Unclear sets. Loaded: `ashtadhyayi-anuvritti`,
`ashtadhyayi-english`, `kashika`, `ganapatha`, `abhyankara-grammar`
(K. V. Abhyankar, *A Dictionary of Sanskrit Grammar*, 1961 — copyright
unverified), `bucknell-sanskrit-manual`, `akhyatachandrika`, `dhatupatha-sa`,
`dhatupatha-krishnacharya`, `dhatupatha-sasvara`, `dhatupradipa`,
`kshiratarangini`, `madhaviya-dhatu-vritti`.

The Aṣṭādhyāyī sets key on the sūtra *number*; the importer's `head_pick`
option promotes the sūtra *text* to the headword so the sūtras are reachable by
word, with the number kept as a synonym.

**Not loaded from this repo** — and this is a deliberate exclusion, not an
oversight: the `vidyut/**` and `_deprecated/**` trees, plus `kRdanta-rUpa-mAlA`,
`kRdanta-sa`, `puShpA-ArdhadhAtuka` and `jnu-tiNanta`. These are
machine-generated subanta/tiṅanta/kṛdanta/taddhitānta paradigm tables — millions
of derived word-forms that would dwarf the lexicon and bury real headwords in
the lookup index. They belong behind a morphology service, not in a kosha.

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
