# Ṛgveda-Prātiśākhya Krama-pāṭha generator — corrected specification

_Written 10 Sep 2026, ~10:40 pm IST. Status: **specification only — no rule-engine code
written yet.** This document exists because a first-draft Gemini prompt for "generate
Krama-pāṭha from Pada-pāṭha" was reviewed against the actual structure of Śaunaka's
Ṛgveda-Prātiśākhya and found to skip most of the tradition-specific machinery. This is the
corrected spec a future session should build against — not the naive prompt._

> **⚠️ Correction, 10 Sep 2026, ~11:50 pm IST (Part II).** The first version of this
> document wrongly claimed the Rigveda Śākala **Pada-pāṭha does not exist** in this repo. It
> does — checked directly and corrected in §2 and §4 below. It also named a single,
> unverified Prātiśākhya digitization source; §4a below replaces that with a three-layer
> sourcing plan (Sanskrit Library TEI/XML as the canonical base, VedaViṣṭāram for
> commentary cross-check, the RV-Prātiśākhya project for independent validation), each
> checked live on 10 Sep 2026. §6.1 also gets a concrete rule-database file layout and
> schema. Everything else from the first version stands.
>
> **Update, 11 Sep 2026, ~12:35 am IST (Part III) — Layer A actually pulled and inspected.**
> §4a is rewritten below with what was actually found: Layer A is **not** a downloadable
> static TEI/XML file — "First XML Edition" describes the source's internal editing process;
> public access is a single undocumented JSON endpoint behind the reader page's JavaScript.
> The endpoint was reached, one full document fetched, and its structure inspected — see
> §4a for the endpoint, its data shape, and why bulk ingestion through it needs a explicit
> go-ahead before it's automated further. The good news: doing this **independently
> confirmed real sūtra text**, including the exact sūtras quoted (unattributed) in the
> original Gemini-derived review — see §4a's verified-sample table.
>
> **Update, 11 Sep 2026, ~1:20 am IST (Part IV) — bulk pull done, with the lead's go-ahead.**
> New §4b: all 1,067 sūtras are now in
> `dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/data.json`, via
> `tools/pratishakhya/import_rv_pratishakhya.py` (methodology in the sibling `SOURCES.md`),
> checked by `tests/test_rv_pratishakhya_import.py`. Building the real importer also caught a
> mistake in Part III's own verified-sample table — see the correction note right above that
> table — which is now fixed. This is the sūtra *text* landing in the repo, cited and
> attributed; turning it into rule logic the generator can run is still future work (§6.1,
> §8, §10).

---

## 0. What this replaces, and why

The rejected approach treated Krama generation as: take adjacent Pada words, apply a short
exception list, run generic Sanskrit sandhi, propagate a hard-coded accent-combination
matrix, emit `iti`-based Parigraha universally, and mix in audio timestamps and colour
markup at generation time. Each of those is a real simplification of a tradition
(Śākala Krama-pāṭha per Śaunaka's Prātiśākhya) that has its own dedicated chapters for
exactly these questions, plus a whole second chapter (Kramahetu) explaining *why* the
exceptions exist. Treating Pāṇinian/Classical Sanskrit sandhi as authoritative, or Parigraha
as `word + iti + iti + word`, will produce fluent-looking Sanskrit that is not the attested
Śākala Krama text. Section 2 below is the corrected rule hierarchy; section 9 has the full
list of what the naive version got wrong, kept for traceability back to the review that
produced this document.

---

## 1. Scope

This generator is specifically for the **Rigveda Śākala tradition** as carried by DGE's own
Saṃhitā data (`dge/data/vedas/rigveda/shakala_shakha/samhita/`). It is not a general Vedic
sandhi/accent engine, and it must not silently fall back to one.

---

## 2. Authoritative rule hierarchy

In order, highest first. A lower source may only be consulted where a higher one is silent:

1. DGE's own Rigveda Śākala Saṃhitā dataset (exists: `mandala_01`–`mandala_10`).
2. DGE's own Rigveda Śākala Pada-pāṭha dataset (**exists** — accented `pada_patha` field on
   all 10,552 mantras, cross-validated 96.61% against VedaWeb TEI; see §4).
3. Śaunaka's Ṛgveda-Prātiśākhya, **Krama-Paṭala** (traditionally numbered Chapter 10, 22
   sūtras).
4. The same work's **Kramahetu-Paṭala** (Chapter 11, 71 sūtras) — the rationale-and-exception
   chapter; it is not optional colour, it carries load-bearing rules including the explicit
   Śākala catuḥkrama (four-fold Krama) practice.
5. The same work's Saṃhitā-Paṭala (ch. 2), Svara-Paṭala (ch. 3) and Sandhi-Paṭala (ch. 4),
   and the Nati/Dhvanyāgama/Pluti chapters (ch. 5–9) where a Krama/Kramahetu rule invokes
   them.
6. General Pāṇinian/Classical Sanskrit phonology — **only** where none of the above governs.

A generic Sanskrit sandhi library (if used at all) is a helper suggestion, never the final
answer: its output must pass through the Prātiśākhya-rule layer, which can override it.
Every non-trivial transformation the generator makes must be able to cite the sūtra(s) that
justify it (see §6.3, `provenance`).

### 2.1 Chapter map of the Ṛgveda-Prātiśākhya

Confirmed from two independent secondary sources (`vedavishtaram.in/lakshanam/rp.html` and
`sites.google.com/view/rv-pratishakhya`, both consulted 10 Sep 2026) — **not yet cross-checked
against the primary scan**, see §4:

| # | Paṭala | Topic | Sūtras |
|---|---|---|---|
| 1 | Saṃjñā-Paribhāṣā | definitions, conventions | 102 |
| 2 | Saṃhitā | continuous-recitation / vowel sandhi | 41 |
| 3 | Svara | accent | 26 |
| 4 | Sandhi | consonant sandhi | 94 |
| 5 | Nati | dental→cerebral etc. | 59 |
| 6 | Dhvanyāgama | inserted sounds | 56 |
| 7–9 | Pluti (I–III) | vowel protraction | 55 + 47 + 49 |
| **10** | **Krama** | **sequential (Krama) recitation method** | **22** |
| **11** | **Kramahetu** | **rationale + exceptions for Krama, incl. Śākala catuḥkrama** | **71** |
| 12 | Sīmā | boundary rules | 25 |
| 13 | Śikṣā | articulation | 48 |
| 14 | Ucchāraṇa-Doṣa | pronunciation errors | 68 |
| 15 | Oṃkāra | Om chanting | 33 |
| 16–18 | Chandaḥ (I–III) | metre | 88 + 48 + 58 |

Treat this table as **provisional** until the primary source is digitized (§4) — sūtra
counts and any specific sūtra text quoted anywhere in project notes must be verified against
it before being encoded as a rule, not taken on the secondary sites' word alone.

---

## 3. What "Krama is not simple adjacent pairing" means concretely

`W1 W2 | W2 W3 | W3 W4 …` is the structural skeleton only. A production generator needs,
at minimum, rule coverage for:

- Śākala-specific catuḥkrama behaviour (ch. 11).
- Avasāna/avasyā and ardharca-boundary handling — sandhi must **not** cross an ardharca
  boundary; this is a prohibition, not an omission to patch later.
- Parigraha — a multi-part rule set (bahumadhyagata, ardharcāntya, iti/setikaraṇa, compound
  puna-vacana, Pragṛhya-in-Parigraha, Śuddhākṣara-āgama, Rephita/ūṣman exceptions), not a
  single `word + iti` formula.
- Pluta exceptions.
- Nati and Dhvanyāgama transformations where a Krama-Paṭala or Kramahetu-Paṭala rule invokes
  them.

Do not implement Parigraha, Pragṛhya, or Rephi handling as a single universal formula or a
flat word list stands in for the phenomenon. A dictionary may **cache** known cases; it must
not **define** them.

---

## 4. Prerequisite data gap — checked against the repo, 10 Sep 2026

Corrected from the first version of this document, which wrongly claimed the Pada-pāṭha was
missing entirely — it checked only for a sibling `pada/` directory next to `samhita/` and
missed the per-mantra field actually holding the text.

| Needed | Current state |
|---|---|
| Rigveda Śākala **Pada-pāṭha** dataset | **Done.** Accented `pada_patha` field (alongside `samhita_patha`) on all 10,552 mantras in `dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_01..10/data.json`. Sourced from the `FourVedas.xlsx` spreadsheet (Virendra Agarwal's "Digitisation of Vedas" / VedaKosh, via sanskritdocuments.org, used with explicit permission) and cross-validated at 96.61% exact match against the independent VedaWeb TEI dataset (`diagnostics/validate_fourvedas.py`, every sampled mismatch a known edition variant). Full provenance and the accent-codepoint convention (core Devanagari block `U+0951`/`U+0952`, not the Vedic Extensions block — see §6.2) are in `dge/veda_toolkit/README.md` §1–3. Independently cross-checkable: `github.com/vishvasa`'s Rigveda repo carries a per-sūkta Śākala Saṃhitā (2,226 files vs our 10 mandala-level files per `tools/reports/vishvasa_gap_report.md`) — not yet inspected for word-level agreement, and its org page (checked 10 Sep 2026) shows no dedicated Krama-pāṭha or Prātiśākhya repo, so it is a Pada/Saṃhitā cross-check candidate only, not a source for §4a below. |
| Ṛgveda-Prātiśākhya **sūtra text** (Krama-Paṭala + Kramahetu-Paṭala at minimum) | **Done, §4b.** All 1,067 sūtras across all 18 paṭalas are now in `rigveda_pratishakhya/data.json` (the sibling `shaunakiya_chaturadhyayika/data.json` is a separate work, the Atharvaveda-Prātiśākhya, untouched by this import). What's *not* done yet: cross-checking the 258 sūtras with an unresolved source-marked reading against Layers B/C, and turning sūtra text into executable rule logic (§6.1) — this ingestion is text-in-repo, not rules-in-engine. |

**Sequencing implication:** both the Pada-pāṭha and the Prātiśākhya sūtra text prerequisites
are now satisfied (§4b). What building the rule engine still needs, and does not have yet, is
the *interpretation* step — turning cited sūtra text into `conditions`/`action`/`exceptions`
rule logic (§6.1) checked against Layer B or C — not paraphrased or guessed, which is exactly
the kind of un-sourced simplification this document exists to avoid.

**Gemini-cost note (CLAUDE.md standing rule) still applies conditionally:** the Sanskrit
Library XML edition (§4a Layer A) is already machine-readable TEI, so ingesting it is a
parsing task, not an OCR task, and needs no Gemini call. If VedaViṣṭāram's or the RV-
Prātiśākhya project's material (Layers B/C) is only reachable as scanned images at some
point, or if any future archive.org PDF is used as a supplementary check, that step is a
Gemini-calling task and needs a cost estimate + the lead's go-ahead first, exactly as for any
other OCR staging job in this repo.

---

## 4a. Prātiśākhya sourcing — three layers, not one PDF

The first version of this document named a single source (a 1894 archive.org scan) as "the"
digitization source. That was the only one on hand at the time, sourced as a PDF scan
requiring OCR. A better, machine-readable primary source has since been identified and
checked live (10 Sep 2026); use three layers, cross-checked against each other, rather than
trusting any one of them alone:

| Layer | Source | Role | Checked live 10–11 Sep 2026 |
|---|---|---|---|
| **A — canonical base** | Sanskrit Library, *Ṛgveda-Prātiśākhya: First XML Edition*, ed. Peter M. Scharf, 2010, Version 0.1 (`sanskritlibrary.org/catalogsText/fgveda_prAtiSAKya.html`) | Primary machine-readable text | **Pulled and inspected — see §4a.1 below, it's not what the citation implied.** Catalog page confirms the 2010 edition, "Version: 0.1", and "Creative Commons Attribution Non-Commercial Share Alike license" (reuse requires attribution, derivatives under the same licence). The catalog page's own source note credits the underlying digital text to **George Cardona's "First digital edition," Philadelphia, 1993–94** — Scharf's team re-marked it up in TEI. Śaunaka is not named as author on the catalog card itself (traditional attribution, not confirmed from this page). |
| **B — commentary cross-check** | VedaViṣṭāram, `vedavishtaram.in/lakshanam/rp.html` — Śaunaka's text with Uvaṭa's Bhāṣya and Viṣṇumitra's Vṛtti, searchable, sūtra-addressable | Cross-checks Layer A's sūtra text and supplies commentary the XML edition may not carry | Confirmed live 10 Sep 2026 (already used for the chapter map in §2.1) |
| **C — independent validation** | The RV-Prātiśākhya project, `sites.google.com/view/rv-pratishakhya` — Devanagari/Unicode, transliteration, German and English translation, organized by all 18 paṭalas | Third, independently-maintained rendering to catch errors that survive A+B agreeing with each other | Confirmed live 10 Sep 2026 (already used for the chapter map in §2.1) |

### 4a.1 What Layer A actually is, on inspection (11 Sep 2026)

"First XML Edition" describes how the Sanskrit Library's editorial team marked the text up
internally (TEI-tagged), not a file the public can download. The catalog page's "Text"
button calls into `textTranslation.html`, whose scripts (`sl.js`, `sl.model.js`) resolve to
an **undocumented backend JSON endpoint**, reverse-engineered here by reading the site's own
JavaScript rather than found in any published API doc:

```
GET https://sanskritlibrary.org/LoadText?text=fgveda_prAtiSAKya&texttype=forTranslation
```

One full-document fetch (a single GET, equivalent to one normal page load — not a crawl) was
made to inspect the shape, returning a 318 KB JSON object: `{"lines": [...]}`, **1,067
entries**, each one sūtra tagged `sN.M` (paṭala N, sūtra M) followed by its word-tokenized
text in **SLP1 transliteration** (not Devanagari, not raw TEI tags — the TEI markup is not
exposed through this endpoint) plus four scholarly-apparatus fields per sūtra: **Cross
ref./Allusions in [other Prātiśākhya]/Allusions to [other Prātiśākhya]/Parallels/Comments**
— e.g. sūtra 10.14 cross-references Vājasaneyi-Prātiśākhya 1.147 verbatim. Most apparatus
fields in this pass are empty or marked `[?]` (an OCR-uncertainty marker the source itself
uses, also appearing mid-word in a few sūtras) — consistent with the catalog page's own
"Version 0.1" label. **This is a draft edition, not a finished critical text** — cross-
checking against Layers B and C stays mandatory, not a formality.

**Access-ethics note, not just a technical one:** this endpoint is not a documented public
API or download link — it exists to serve the site's own interactive reader. The CC
BY-NC-SA licence is an explicit copyright grant to reuse the *content*, which is more
permissive than most sources already vetted in this repo (contrast GRETIL's per-file "for
reference purposes only" terms that `dge/veda_toolkit/README.md` §3 rejected outright) — but
a copyright licence on the content doesn't by itself settle whether automating bulk requests
against an undocumented endpoint is appropriate use of the site's infrastructure. One
inspection fetch is not that question. **Before scripting a full 1,067-sūtra bulk pull
through this endpoint, get the lead's go-ahead** — the alternative, contacting Sanskrit
Library directly for the actual TEI XML or an export, may be the more respectful path for
anything beyond this kind of one-off inspection, mirroring this repo's existing discipline
of not scraping sites whose terms aren't explicit (`dge/VEDAWEB_IMPORT_STATUS.md`'s stated
boundary).

**Verified sample — real sūtras pulled from Layer A, SLP1 transliterated to Devanagari here
for legibility** (© The Sanskrit Library 2010, Peter M. Scharf ed., CC BY-NC-SA 3.0; source
text per Cardona 1993–94):

| ID | Devanagari (word-separated, no sandhi applied — Layer A doesn't apply it) |
|---|---|
| `RVPr_10.1` | क्रमः |
| `RVPr_10.7` | अन्तःपदम् च येषाम् स्यात् विकारः अनन्यकारितः एतानि परिगृह्णीयात् |
| `RVPr_10.8` | बहुमध्यगतानि च |
| `RVPr_10.9` | अर्धर्चान्त्यम् च |
| `RVPr_10.12` | उपस्थितम् सेतिकरणम् |
| `RVPr_10.16` | समासान् तु पुनर्वचने इङ्ग्येत् |
| `RVPr_10.18` | सन्धिः न अर्धर्चयोः भवेत् |
| `RVPr_10.21` | शौद्धाक्षरागमः अपैति |
| `RVPr_11.19` | चतुःक्रमः तु आचरितः अत्र शाकलैः |

**Correction to this table, made while writing the real importer (§4b): 10.20 and 10.22 were
wrongly shown here as clean Devanagari.** The source marks a character uncertain (`[?]`) in
both — `nakArasya [?]zmavat vfttam ... praSlezaH ca pragfhyasya prakftyA syuH parigrahe .`
for 10.20 (note this is also the *whole* numbered sūtra; the review's quoted clause,
"praśleṣaśca pragṛhyasya prakṛtyā syuḥ parigrahe," is only its second half — the traditional
edition the review's quotes came from apparently numbers that clause on its own, one of the
sub-sūtra-counting differences flagged below) — and `... riPitAni [?]zmaRaH aGoze d[?]BAvaH
svaDitiH iva ca .` for 10.22. An earlier pass through this document guessed `[?]` = ū (a
reasonable-looking guess — `[?]zmaRaH` is almost certainly `ūṣmaṇaḥ` — but a guess, not read
off the source) and printed the guessed Devanagari here without saying so. That was wrong to
do even informally; §4b's actual dataset does not do it, and marks both `has_uncertain_reading:
true` with empty Devanagari/IAST until a human checks Layer B or C.

**This matters beyond confirming the source works:** every one of the sūtras in the table
above is, word-for-word, a sūtra that appeared unattributed and unnumbered in the original
Gemini-derived review that started this whole document. They are real — not fabricated by
that review — and now have exact citations (the catuḥkrama sūtra, for instance, is
specifically **`RVPr_11.19`**, not merely "somewhere in Kramahetu"). That review's instinct
to insist on primary-source verification was correct; this is that verification actually
done — including finding the two places (10.20's truncation, the `[?]` guess) where extra
care was still needed.

**Real paṭala/sūtra counts from Layer A** (vs. the secondary-source table in §2.1 — some
disagree, notably paṭala 2; paṭalas 10 and 11, the ones this document cares most about,
match exactly):

| Paṭala | Layer A count | §2.1 secondary-source count |
|---|---|---|
| 1 | 103 | 102 |
| 2 | 82 | 41 |
| 3 | 34 | 26 |
| 4 | 98 | 94 |
| 5 | 61 | 59 |
| 6 | 56 | 56 |
| 7 | 56 | 55 |
| 8 | 50 | 47 |
| 9 | 52 | 49 |
| **10** | **22** | **22** |
| **11** | **71** | **71** |
| 12 | 26 | 25 |
| 13 | 50 | 48 |
| 14 | 69 | 68 |
| 15 | 33 | 33 |
| 16 | 92 | 88 |
| 17 | 50 | 48 |
| 18 | 62 | 58 |

Total: 1,067 (Layer A) vs. 990 (summing the §2.1 table). The gap is almost certainly a
sub-sūtra/vārttika counting-convention difference between editions (unresolved — not
important enough to block on, since 10 and 11 already agree exactly), except paṭala 2's
82-vs-41 gap, which is large enough to actually check once paṭala 2 (Saṃhitā) work starts.

**Licensing implication of Layer A:** CC BY-NC-SA is non-commercial and share-alike. That is
compatible with DGE's own stated non-commercial preservation/study mission
(`dge/PROJECT_BRIEF.md` §1), but — following the exact discipline `dge/veda_toolkit/README.md`
§3 already applies to every other Veda source in this repo ("absence of a licence is not
permission"; GRETIL's per-file terms were checked and rejected for exactly this reason) —
record Layer A's licence and attribution on the ingested rule data itself (see the `source`/
`crosscheck` fields in the schema below), not just in this document, and do not assume a
different licence for Layers B or C without checking each site's own terms first.

## 4b. Ingestion done (11 Sep 2026) — what's actually in the repo now

The project lead approved the bulk pull ("bulk pull it," 11 Sep 2026). All 1,067 sūtras are
now in `dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/data.json`, replacing the
empty stub from §4. The importer is `tools/pratishakhya/import_rv_pratishakhya.py`, with the
full methodology in `tools/pratishakhya/SOURCES.md` — that file, not this section, is now the
authoritative record of how to re-run it; this section just summarizes what's true today.

**One deliberate deviation from the per-paṭala file layout sketched in §4a's earlier draft:**
every sibling Śikṣā work in this repo (`paniniya_shiksha/data.json`,
`shodashasloki_shiksha/data.json`, etc.) is one `data.json` per work, with a top-level
`{schema, default_author, source, source_url, licence, note, items}` shape — not a file per
chapter. 1,067 items is not too large for that convention (the Ṛgveda Saṃhitā's mandala files
already hold 2,006 items each), so the actual output follows the house pattern instead of
introducing a new one. `library.json`'s catalog entry is updated to `"populated": true` with
matching `source`/`facets`.

Each item's real shape (not the earlier hypothetical schema — this is what
`import_rv_pratishakhya.py` actually writes, one real entry shown):

```json
{
  "id": "10.7",
  "patala": 10,
  "patala_name": "Krama",
  "sutra": 7,
  "text_devanagari": "अन्तःपदम् च येषाम् स्यात् विकारः अनन्यकारितः एतानि परिगृह्णीयात्।",
  "text_iast": "antaḥpadam ca yeṣām syāt vikāraḥ ananyakāritaḥ etāni parigṛhṇīyāt|",
  "text_slp1": "antaHpadam ca yezAm syAt vikAraH ananyakAritaH etAni parigfhRIyAt .",
  "has_uncertain_reading": false,
  "apparatus": {"cross_ref": "", "allusions_in": "[?]Pr.", "allusions_to": "[?]Pr.", "parallels": "", "comments": ""},
  "has_cross_reference_content": false,
  "domain": "krama",
  "crosscheck": ""
}
```

What's deliberately **not** filled in, and why:

- **`crosscheck`** is empty on every item — it records once a sūtra has actually been checked
  against Layer B or C, and pre-filling it would misrepresent work not done.
- **258 of 1,067 items (24%) have `has_uncertain_reading: true`** and empty
  `text_devanagari`/`text_iast` — wherever the source's own `[?]` marker appears (see the
  correction two paragraphs above §4b for why this document does not paper over that with a
  guess). `text_slp1` always has the raw text, `[?]` included, as ground truth.
- **The `conditions`/`action`/`exceptions` fields from the original hypothetical schema (§6.1)
  are not part of this ingestion at all.** This pull gets the sūtra *text* into the repo,
  cited and attributed; turning a sūtra's text into a rule the generator can execute is
  interpretation, and stays a separate, later step per §6.1's "cite a rule `id`... predicates
  are code that applies those rules, not a second place to restate them."
- **`apparatus`** (cross-references to the Taittirīya-/Vājasaneyi-Prātiśākhyas and to Ṛgveda
  verses) is kept as raw SLP1, not transliterated — it carries its own Vedic-accent notation
  that a plain SLP1→Devanagari pass would corrupt.

Verified with `tests/test_rv_pratishakhya_import.py` (total count, paṭala 10/11 counts, the
nine hand-checked sūtras in the table above, and — explicitly — that 10.20/10.22 are *not*
silently filled in). **Superseded by §4c below** for 10.20/10.22 specifically: they are now
resolved, via VedaViṣṭāram, not left uncertain.

---

## 4c. VedaViṣṭāram cross-check and uncertain-reading resolution (11 Sep 2026)

Done with the project lead's direction to cross-check the uncertain-reading sūtras reliably,
not randomly. `tools/pratishakhya/crosscheck_vedavishtaram.py` (full methodology and its own
limits in its module docstring — read that before trusting anything below) fetches Layer B
(VedaViṣṭāram, `vedavishtaram.in/lakshanam/rp.html` — Śaunaka's text with Uvaṭa's Bhāṣya and
Viṣṇumitra's Vṛtti) and:

1. **Attaches Layer B's sūtra text + Uvaṭa's Bhāṣya to every item** where a same-index entry
   exists (1,007 of 1,067) — new `vedavishtaram_sutra_text` / `vedavishtaram_bhashya` fields.
   This is the raw material §6.1's future rule-logic work will interpret from — not sūtra
   text in isolation, but with the traditional commentary attached.
2. **Resolved 24 of paṭala 10–11's 26 `has_uncertain_reading` sūtras by hand**, each with a
   citation of exactly how (direct VedaViṣṭāram match, or an explicit corpus-internal pattern
   like "pūrva confirmed directly 6+ times elsewhere in this text" — never a silent guess).
   The other 2 (10.3, 11.8) are deliberately still unresolved: 10.3 shows a genuine apparent
   edition variant (VedaViṣṭāram reads `ई` where Layer A implies `ईम्`), and 11.8's uncertain
   word has no independent confirmation anywhere checked. Both carry a `crosscheck` note
   explaining why, not a blank field that looks unchecked.
3. **Resolved 85 more uncertain sūtras outside paṭala 10–11** by an automated same-index
   substring match, accepted only when unambiguous — explicitly *not* trusted with the
   paṭala-10–11-style pattern inference, since the same-index correspondence itself isn't
   verified outside those two chapters (§4a.1's paṭala-2 count mismatch, 82 vs. 41, is exactly
   the kind of boundary drift that makes pattern-based inference unsafe elsewhere).
4. **135 sūtras remain genuinely unresolved** (down from 258) — left that way rather than
   forced, per the same "an empty field is an honest gap" principle as everywhere else in
   this document.

**Two real bugs caught and fixed while building this, not silently avoided:**

- **Sanskrit Library's SLP1 uses lowercase `x` for the Vedic retroflex lateral **ळ**** (only
  found in the Rigveda Śākala tradition), not standard SLP1's vocalic ऌ. This was silently
  mis-transliterating 35 sūtras across the corpus (e.g. `vyAxiH` → the nonsense "व्याऌइः"
  instead of "व्याळिः") since the very first import — caught only while investigating this
  cross-check, confirmed against VedaViṣṭāram's own Uvaṭa Bhāṣya, which spells the word out
  unambiguously as व्याळिः, "the teacher Vyāḷi" (a named phonetic authority, fittingly cited
  in paṭala 3's accent rules). Fixed in `import_rv_pratishakhya.py`'s `transliterate_sutra`
  (remap `x`→`L`, which `indic_transliteration`'s own SLP1 scheme already spells correctly).
- **The automated same-index resolver initially had a real matching bug**: when an uncertain
  character sat at the very edge of its word (an empty "pre" or "post" anchor), an unanchored
  empty-string regex component matched the *leftmost* position satisfying the rest of the
  pattern — which is usually one character early, swallowing everything back to the start of
  the sūtra. Caught concretely on 1.39, which came back as "प्रथमपञ्चमौ च द्वौ
  **प्रथमपञ्चमौ च द्वा** ऊष्मणाम्" (visibly duplicated) instead of the correct
  "प्रथमपञ्चमौ च द्वौ ऊष्मणाम्." Fixed with an explicit word-boundary anchor
  (`(?:^|(?<=\s))`) plus a hard cap on the resolved span length, and guarded by
  `test_algorithmic_resolution_does_not_swallow_neighbouring_words` so it can't regress
  silently.

Both bugs are a reminder that "reliable" here means checked output, not just a fetched
source — every one of the 85 automated resolutions was read over by eye before being trusted
(§4c's table would be too long to reproduce here; see the item list this session produced
while reviewing them, and `tools/pratishakhya/crosscheck_vedavishtaram.py`'s
`P10_11_RESOLUTIONS` table for the paṭala 10–11 reasoning specifically).

---

## 5. Corrected pipeline

```
DGE Pada-pāṭha (once it exists)
        │
        ▼
┌─────────────────────┐
│ STRUCTURAL LAYER     │  ardharca + pada boundaries, word indices
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ KRAMA RULE ENGINE     │  RV-Prātiśākhya ch.10 (Krama) + ch.11 (Kramahetu)
└──────────┬───────────┘
           │
    ┌──────┴───────┐
    ▼              ▼
ordinary pair   special case (catuḥkrama, parigraha, pragṛhya-in-parigraha, …)
    │              │
    └──────┬───────┘
           ▼
┌─────────────────────┐
│ RV PHONOLOGY LAYER    │  Sandhi (ch.4) · Nati (ch.5) · Dhvanyāgama (ch.6) ·
│                       │  Rephita · Pragṛhya · Pluti (ch.7–9)
│                       │  — a generic sandhi library, if used, is a helper here,
│                       │    subordinate to this layer, never authoritative (§2)
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ SVARA ENGINE          │  source svara (from Saṃhitā) + derived svara
│                       │  (ch.3 Svara-Paṭala rules) — pracaya, kampa, svarita
│                       │  propagation. Treat any accent-combination matrix as a
│                       │  hypothesis to validate, never as ground truth (§6.2).
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ VALIDATOR             │  generated vs. an independently attested Krama text
│                       │  (§7) — required before trusting output on new sūktas
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ RENDERER              │  IAST / Devanagari, colour-by-svara, audio alignment —
│                       │  all downstream presentation, none of it inside the
│                       │  generator itself (§6.4)
└─────────────────────┘
```

---

## 6. Data model

### 6.1 Rule-driven predicates, not static lists

Encode context-sensitive phenomena as predicates over `(word, context)`, backed by named,
citable rules — a static dictionary may accelerate a predicate but must never stand in for
it:

```
isPragrhya(word, context)
isRephi(word, context)
isPluta(word, context)
requiresParigraha(word, context)
requiresCaturkrama(context)
requiresNati(word, context)
requiresDhvanyagama(word, context)
```

Each predicate's non-trivial branches should cite a rule `id` from the ingested sūtra text in
§4b (e.g. `10.20`, matching that file's actual `"id": "patala.sutra"` format — `RVPr_10.20`
below and elsewhere in this document is this document's own citation convention for talking
about a sūtra, not the literal `id` string in the data) — that dataset is the source of truth
for rule text; predicates are code that *applies* those rules, not a second place to restate
them.

Where a dictionary is used as a cache, structure it by the kind of evidence backing each
entry rather than as one flat list, e.g. for Pragṛhya:

```json
{
  "pragrhya": {
    "lexical": [],
    "morphological": [],
    "phonological": [],
    "contextual": [],
    "shakala_specific": []
  }
}
```

### 6.2 Internal accent model — script-independent

Never use a Unicode glyph (Devanagari combining marks, IAST diacritics, or the wrong-block
`॑`/`॒` accent characters) as the semantic representation of svara. Represent
accent as a closed, named enum internal to the data model:

```
udatta | anudatta | svarita | dirgha_svarita | pracaya | kampa
```

(plus any further state the Śākala tradition is found to require once ch. 3 is digitized —
do not assume the list above is complete). Devanagari, IAST, and any pedagogical romanization
are rendering targets computed from this enum at the presentation layer only (§6.4), not
alternate sources of truth.

**Codepoint choice for rendering is a separate, already-burned decision — don't relitigate it
blind.** This repo already hit exactly this problem for udātta/anudātta/svarita:
`dge/veda_toolkit/README.md` §5 records that `indic_transliteration` emits Vedic Extensions
codepoints (`U+1CD3`/`U+1CD9`), which "almost no font supports," and that the working fix was
remapping to the core Devanagari block (`U+0951` svarita, `U+0952` anudātta) via
`dgeSanitizeVedicAccents()`. Unicode's dedicated dīrgha-svarita mark (`U+1CDA`, Vedic
Extensions block) is very likely the same trap — before wiring it into any renderer, test it
against the same fonts `dgeSanitizeVedicAccents()` targets, and if it fails, document
whatever fallback (a doubled `U+0951`, a superscript notation, etc.) is chosen, the same way
the existing svarita/anudātta fix is documented. This is a rendering-layer decision, not an
internal-model one — the `dirgha_svarita` enum value above is unaffected either way.

Each generated token should retain, at minimum:

```
lexicalText, padaText, samhitaText, syllables[], svara[],
sourceSvara[], generatedSvara[], transformationHistory[]
```

### 6.3 Provenance on every generated unit

```json
{
  "source": {
    "samhita": "DGE-RV-SHAKALA",
    "pada": "DGE-RV-PADA",
    "pratishakhya": "Shaunaka",
    "tradition": "Shakala"
  },
  "generated": true,
  "generatorVersion": "krama-0.1.0",
  "rules": ["RVPr_10.1", "RVPr_11.4"]
}
```

`rules` cites Paṭala.sūtra identifiers so a "why was this generated this way" question has a
traceable answer once the sūtra text is digitized (§4) — do not invent sūtra numbers before
that; leave `rules` empty rather than guess.

### 6.4 Strictly out of the generator

- **Colour** is a renderer concern: the generator emits `{"svara": "anudatta"}`; a
  `[data-svara="anudatta"]` CSS rule (or equivalent) does the rest. This lets the colour
  scheme change without touching corpus data, and lets DGE offer normal / svara-marked /
  colour-coded / traditional-notation as display modes on one dataset.
- **Audio timestamps** are a separate alignment system's job, added after the fact against
  `{"pairIndex", "wordIndices", "text", "syllables"}` — not `data-start`/`data-end` baked in
  at generation time. Mixing text generation + phonology + svara + audio alignment + UI into
  one function is exactly the kind of premature coupling to avoid.

### 6.5 Rule logic — done for paṭala 10, and 14 of paṭala 11's sūtras (11 Sep 2026)

`tools/pratishakhya/build_krama_rules.py` writes
`rigveda_pratishakhya/krama_kramahetu_rules.json`: one entry per paṭala 10/11 sūtra (93
total), each citing its sūtra text and, where fully worked out, `conditions`/`action`/
`exceptions`/`examples` grounded in Uvaṭa's Bhāṣya (via §4c's cross-check data). All 22
paṭala-10 sūtras are fully worked out — the base pairing algorithm (10.2), Parigraha's real
scope (10.7–10.9, replacing the naive `word+iti` formula), the `sthita`/`upasthita`/
`sthitopasthita` mechanism that formula was standing in for (10.12–10.14), the ardharca-sandhi
prohibition (10.18), Pragṛhya-in-Parigraha (10.20), Śuddhākṣara-āgama removal (10.21), and
Rephita (10.22). Of paṭala 11, 14 sūtras that directly extend paṭala 10 operationally are
worked out the same way (catuḥkrama, 11.19; the default/ayāvana case, 11.22–23; the parigraha
phonetic-reversion block, 11.36–46; the sthitopasthita confirmation, 11.61); the remaining 57
are classified (domain/rule type/one-line summary) but not reduced to executable logic — most
of that material is rationale, historical lineage (11.65 names Prabāhravya as Krama's first
teacher), or grammarians' debate about *why* the rules are as they are, not new operative
content. Every entry says explicitly what it rests on (`basis`) and carries
`"validated_against_attested_krama": false` — this is this session's interpretation of the
Bhāṣya, not independently checked against any attested Krama-pāṭha output; §7's VALIDATE mode
is the next real gate, still blocked on §10's open question about a ground-truth source.
Checked by `tests/test_krama_kramahetu_rules.py`.

---

### 6.6 Real generator engine, computing from Pada-pāṭha directly (Phase 8, 11 Sep 2026)

Built in direct response to the project lead's own detailed spec document
(`DGE_RIGVEDA_KRAMA_CLOUD_CODE_UPDATED_SUTRA_AND_COMPARATIVE_SPEC.md`, 11 Sep 2026), whose
core finding was correct: `generate_krama_rv_1_1.py` (§4b/6.5's predecessor) contained
hardcoded `pairs = [...]` and a hand-typed `PARIGRAHA_FORMS` dict per verse — it proved the
rules could be *labelled* onto manually prepared RV 1.1 text, not that they could *generate*
arbitrary Pada-pāṭha input. Three new modules replace that approach:

- **`tools/pratishakhya/sanskrit_phonology.py`** — a real sandhi engine (`samhita_join`,
  `resolve_compound`) covering Paṭala 2's vowel classes (savarṇa-dīrgha, guṇa, vṛddhi, yaṇ,
  eṅ-a elision) and Paṭala 4's visarga/consonant rules (sa/eṣa exception, i/u/diphthong-class
  visarga, a-class visarga with sibilant assimilation, word-final m/n/t). Validated to 69/70
  (98.6%) exact match against DGE's own attested `samhita_patha` across every actual word pair
  in RV 1.1 — the one non-match is the 10.3 आ-exception case, out of this module's scope by
  design (that's a Krama-Paṭala structural rule, not a segmental phonology rule).
- **`tools/pratishakhya/pratishakhya_classify.py`** — predicates (`is_pragrhya`, `is_rephi`,
  `parse_compound`, `requires_parigraha`, `get_sthita`/`get_upasthita`/`get_sthitopasthita`,
  `is_monosyllable_avasana`), replacing the flat Pragṛhya/Rephi word-lists the rejected draft
  used. Each predicate's docstring states plainly what it still cannot derive (e.g. `is_rephi`
  is a cache of forms already confirmed rephita, not a phonological derivation from an
  arbitrary word — a real, named limitation, not silently assumed solved).
- **`tools/pratishakhya/krama_engine.py`** — `generate_ardharca`/`generate_verse`, the actual
  generator loop: base pairing via `samhita_join` (10.2), Parigraha triggering via
  `requires_parigraha` (10.7–10.9) rendered via `get_sthitopasthita` (10.12–10.14, 10.16), and
  a computational reconstruction of sūtra 10.3's monosyllable-avasāna exception (see below).
  `split_into_ardharcas()` finds each verse's ardharca boundary automatically, using DGE's own
  attested `samhita_patha` only as a length-alignment oracle for *where* the boundary falls
  (never to look up pair *content* — every pair is still computed independently by
  `samhita_join`); it gets 7 of RV 1.1's 9 verses right unaided, with 1.1.7 and 1.1.9 as
  logged manual overrides (`ARDHARCA_SPLIT_OVERRIDES`), not silent substitutions.

**Sūtra 10.3's आ-exception**, the spec's stated "single highest-priority special-case test":
reconstructed from Uvaṭa's own worked example (`आ मन्द्रम् । मन्द्रमा वरेण्यम् । आ वरेण्यम्`)
as a general condition — when the word about to be retaken for its next pair was immediately
preceded by a monosyllable-avasāna word, replace the ordinary retake-pair with a tri-unit
(retaken-word + monosyllable, joined via sandhi, + next word) plus a separate confirming pair
(monosyllable + next word). `krama_engine.py`'s own `__main__` self-test reproduces Uvaṭa's
example exactly; `validate_krama_rv1_1.py`'s Test D (below) confirms the same computationally,
not by construction from the example itself.

**`tools/pratishakhya/regenerate_krama_rv_1_1.py`** runs this pipeline directly against
`dge/data/vedas/rigveda/shakala_shakha/samhita/mandala_01/data.json` (items 1.1.1–1.1.9,
`pada_patha`/`samhita_patha` fields only — no per-verse word list is typed anywhere in this
script) and compares its output unit-by-unit against the old hand-aligned
`krama_generated_output.json`, writing both the new output and the comparison to
`krama_regenerated_output.json`. Result: **7 of 9 verses match the old output exactly**
(1.1.1, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.8, 1.1.9). The 2 that differ are both informative, not
regressions:

- **1.1.2**, ardharca 2 (`सः देवान् आ इह वक्षति`): the new engine detects that इह's preceding
  neighbour, आ, is a monosyllable-avasāna — structurally the *same* configuration as Uvaṭa's
  own example — and fires the 10.3 tri-unit reconstruction (`इहा वक्षति` / `आ वक्षति`) instead
  of the old code's un-flagged ordinary pairing (`इह वक्षति`, admitted `"confidence": "low"` in
  the old output precisely because it knew this was an आ-adjacent case it wasn't handling).
  This is the new engine doing what the old one explicitly flagged as unhandled — an
  improvement, not a mismatch to fix, though it rests on generalizing from *one* attested
  example to a second, structurally identical case, which is a real (documented, not hidden)
  interpretive step, not a certainty.
- **1.1.7**, ardharca 2, one unit (`भरन्तः` + `आ`): the new engine's classical a-class-visarga
  rule gives `भरन्तो आ` (visarga → ओ, आ kept separate, per the general Paṭala-2/4 rule for
  visarga before any vowel other than short अ). DGE's own attested continuous `samhita_patha`
  for this exact environment reads `भरन्त एमसि` — i.e. the visarga is dropped *entirely*
  (not converted to ओ) before this आ. Neither this engine's classical output nor the old hand
  -aligned guess (`भरन्तो`, which silently swallowed the आ with no cited rule) matches that
  attested form. **This is a genuine, open gap**, most likely a Vedic-specific visarga-lopa
  variant (the Prātiśākhya's own `bahulaṃ chandasi` latitude) not yet covered by any rule in
  `krama_kramahetu_rules.json` — flagged here rather than patched with an unverified ad hoc
  rule. Left for whoever picks up Priority-1 item 10.20/10.22-adjacent visarga work; see
  `tools/pratishakhya/validate_krama_rv1_1.py`'s Test F for the same kind of Saṃhitā-vs-Pada
  restoration gap this belongs to.

**`tools/pratishakhya/validate_krama_rv1_1.py`** implements the spec's own Test A–H suite
(sec.21) in the exact required per-test format (sec.22: INPUT PADA / EXPECTED / GENERATED /
STATUS / APPLIED RULES / TRANSFORMATIONS / WHY). Tests A–E (ordinary pairing, compound
Parigraha, ardharca-final Parigraha, the 10.3 आ-exception, no cross-ardharca sandhi) **PASS**
against the real engine — not against hand-picked examples designed to pass, since Tests A–C
and E use fresh word combinations not copied from RV 1.1's own verses. Tests F (Saṃhitā-vs-
Pada restoration on retake, 10.21/11.23), G (bahumadhyagata auto-discovery, 10.8), and H
(Śuddhākṣara restoration, 10.21/11.37–43) are reported **UNRESOLVED**, each with the specific
missing function named (`restore_shuddhakshara`/`resolve_rephi` derivation,
`detect_bahumadhyagata`, a restoration-on-retake mechanism in `samhita_join` or a layer above
it) — these are Priority-0 item 4/5 and Priority-1 items 8/10/12 from the spec's own priority
order (sec.23), not yet built, and not claimed to be.

**Not yet done, honestly**: the old `generate_krama_rv_1_1.py` and its `PARIGRAHA_FORMS`/
`VERSES` hardcoded data have not been deleted — the spec's stated success criterion ("obtain
the same result... regenerate RV 1.1 entirely") is now satisfied for 7/9 verses with the other
2 understood and documented above, which is close enough to justify treating the old file as
superseded, but it is being left in place one more round in case the lead wants to review the
1.1.2/1.1.7 discrepancies first. Full-Rigveda scaling has not started, per the spec's own
"only after that" gate.

---

## 7. Two modes

**GENERATE** — Pada-pāṭha → Krama-pāṭha, per §5.

**VALIDATE** — authoritative (independently attested) Krama text → run the same input through
GENERATE → diff. On mismatch, report the pair index, expected vs. generated text, a
best-effort classification of what kind of rule the difference implicates (e.g. "rephi
handling"), and rule candidates from the digitized Kramahetu-Paṭala once it exists. This mode
is not optional polish — see §8, it gates every corpus-wide run.

---

## 8. Validation-first development plan

Do not run the generator over the whole Rigveda before this sequence, in order:

1. **Done (§4b).** The lead approved a full pull through Layer A's endpoint; all 1,067
   sūtras (paṭalas 10–11 included) are now in `rigveda_pratishakhya/data.json`. Still open:
   cross-check the 24% marked `has_uncertain_reading` (and ideally the rest too) against
   Layers B/C, and turn cited sūtra text into actual `conditions`/`action`/`exceptions` rule
   logic (§6.1) — that interpretation step has not been done. The Pada-pāṭha prerequisite was
   already satisfied (§4).
2. Implement RV 1.1.1 only.
3. Generate its Krama-pāṭha; compare against an independently attested Krama text for RV
   1.1.1 (VALIDATE mode, §7).
4. Write automated tests (`tests/test_krama_engine.py`, matching this repo's existing
   `tests/test_*.py` convention) for every Prātiśākhya exception RV 1.1.1 actually exercises,
   plus deliberately chosen cases for: Pragṛhya, Rephita, Pragṛhya-inside-Parigraha,
   compound-inside-Parigraha, pluta, svarita, kampa, a hard vowel-sandhi combination,
   consonant sandhi, an ardharca boundary, and Śākala catuḥkrama.
5. Only after those pass, extend sūkta by sūkta — not maṇḍala by maṇḍala — re-running
   VALIDATE at each step where an independently attested Krama text is available.

---

## 9. Corrections this spec makes to the rejected draft (for traceability)

Kept as a short index back to the full review, not restated in full here:

1. Add the Kramahetu-Paṭala (ch. 11) as a first-class phase, not an afterthought.
2. Replace the universal `word + iti + iti + word` Parigraha formula with a rule-driven
   subsystem over Krama-Paṭala 10.7–10.22 and the relevant Kramahetu-Paṭala rules.
3. Demote any generic Pāṇinian/Classical Sanskrit sandhi API to an optional helper,
   subordinate to the Prātiśākhya-specific rule layer (§2).
4. Replace the flat Pragṛhya word list with the categorized structure in §6.1.
5. Replace the static Rephi word list with an `isRephi(word, context)` predicate, list as
   cache only.
6. Treat any accent-combination ("Udātta + Anudātta = …") matrix as an unvalidated
   hypothesis, not ground truth, until checked against attested Śākala forms (§6.2).
7. Represent an Akṣara as a structured object (text/vowel/onset/coda/svara/…), not a regex
   match — the regex is a tokenizer only, never the phonological model.
8. Fix the transliteration/accent-encoding confusion: internal accent state is a
   script-independent enum (§6.2); rendering to Devanagari/IAST/Vedic-Unicode happens only
   at the presentation layer.
9. Add `dirgha_svarita`, `pracaya`, `kampa` (and room for more, pending ch. 3 digitization)
   to the accent model instead of collapsing to udātta/anudātta/svarita.
10. Move colour entirely to the renderer (§6.4).
11. Remove audio-timestamp fields from the generator's output (§6.4).
12. Require `provenance`/`rules` citations on every generated unit (§6.3).
13. Require a VALIDATE mode (§7), not GENERATE-only.
14. Require the Prātiśākhya text itself as the rule source, not paraphrase — which is exactly
    what §4a blocks on today.
15. (Part II, 10 Sep 2026) Correct this document's own first-draft error: the Rigveda Śākala
    Pada-pāṭha already exists in this repo (§4) — it was missed by checking only for a
    sibling directory, not the per-mantra field actually holding it.
16. (Part II) Replace the single unverified archive.org PDF citation with a three-layer,
    live-checked sourcing plan for the Prātiśākhya sūtra text itself, plus a concrete
    per-paṭala rule-database schema (§4a).
17. (Part II) Correct the accent-rendering guidance: do not recommend a Vedic Extensions
    codepoint for dīrgha-svarita without testing it against the font-support trap this repo
    already documented and fixed for svarita/anudātta (§6.2).
18. (Part III, 11 Sep 2026) Actually pull and inspect Layer A rather than trust the citation:
    found it is an undocumented JSON endpoint, not a downloadable TEI/XML file (§4a.1);
    confirmed paṭalas 10 and 11 sūtra counts (22, 71) exactly against the source itself; and
    verified, word-for-word, several specific sūtras that had appeared unattributed in the
    original review — they were real, not fabricated, and now have exact citations.
19. (Part IV, 11 Sep 2026) Bulk pull done, with the lead's go-ahead: all 1,067 sūtras are now
    in `rigveda_pratishakhya/data.json` (§4b). Caught and fixed, while building the real
    importer, a mistake in Part III's own verified-sample table: 10.20 was quoted as only
    its second clause, and 10.20/10.22 had their source-marked `[?]` uncertain characters
    silently guessed rather than left unresolved — the shipped data does not repeat either
    error (§4a.1's correction note, `tools/pratishakhya/SOURCES.md`).
20. (Part V, 11 Sep 2026) Responding to the lead's own detailed critique document: replaced
    the hand-aligned `generate_krama_rv_1_1.py` approach with a real computational engine
    (`sanskrit_phonology.py`, `pratishakhya_classify.py`, `krama_engine.py`, §6.6) that
    computes sandhi and Parigraha from Pada-pāṭha directly rather than looking up precomputed
    per-verse strings, and regenerated RV 1.1 through it — 7 of 9 verses match the old
    hand-aligned output exactly, the other 2 surface one real improvement (10.3's exception
    correctly generalized to a second case) and one genuine open phonological gap (visarga
    before आ in 1.1.7, documented rather than patched blindly). Explicitly did NOT import any
    rule or form from the KYVeda/Taittirīya corpus into this engine, per the lead's strict
    instruction — that corpus was consulted only as a methodological precedent (§10).

---

## 10. Open questions for the project lead

- ~~Approve a full pull of paṭalas 10–11 through Layer A's undocumented endpoint.~~ **Done —
  approved 11 Sep 2026 ("bulk pull it"), all 1,067 sūtras ingested, §4b.**
- ~~Cross-check the `has_uncertain_reading` sūtras against Layer B or C.~~ **Done for paṭala
  10–11 (24 of 26 resolved, 2 genuinely left open) and 85 more sūtras elsewhere in the corpus
  — §4c.** 135 sūtras remain unresolved outside paṭala 10–11; revisit if/when work reaches
  those paṭalas, not blocking Krama work now.
- Cross-check against Layer C (the RV-Prātiśākhya project) too, as a third independent source
  — not done yet; VedaViṣṭāram alone was enough to resolve the paṭala 10–11 cases actually
  needed so far, but Layer C stays valuable as a check on VedaViṣṭāram itself (which has its
  own small errors — see §4c's note on 11.59's apparent typo).
- ~~Approve turning cited sūtra text into actual rule logic.~~ **Done for paṭala 10 (all 22
  sūtras) and 14 of paṭala 11's — §6.5.** Review that interpretation (it is this session's own
  reading of the Bhāṣya, not independently checked) before relying on it, and decide whether
  the remaining 57 paṭala-11 sūtras (mostly rationale/lineage/debate, not new operative
  content — see §6.5) are worth the same treatment.
- Confirm an independently attested Krama-pāṭha source to use as the VALIDATE-mode ground
  truth for RV 1.1.1 and subsequent sūktas — `github.com/vishvasa`'s Rigveda repo was
  checked (10 Sep 2026) and does not appear to carry one, so this is still open.
- Decide whether `github.com/vishvasa`'s per-sūkta Śākala Saṃhitā (2,226 files) is worth a
  word-level cross-check against DGE's own Pada/Saṃhitā data before the Krama work leans on
  it, or whether the existing 96.61%-validated VedaWeb cross-check is sufficient.

- (Added 11 Sep 2026, Part V) The visarga-before-आ gap found in RV 1.1.7 (§6.6) needs either a
  Prātiśākhya sūtra that specifically licenses Vedic visarga-lopa in this environment (search
  paṭalas 2–4 more carefully — this project's cross-check so far focused on paṭalas 10–11) or
  confirmation from Layer B/C that this is genuinely `bahulaṃ chandasi` free variation with no
  single derivable rule.
- (Added 11 Sep 2026, Part V) Decide whether to delete `generate_krama_rv_1_1.py` and its
  `PARIGRAHA_FORMS`/`VERSES` hardcoded data now that the real engine (§6.6) reproduces 7/9
  verses exactly and explains the other 2 — left in place pending the lead's review of the
  1.1.2/1.1.7 discrepancies.
- (Added 11 Sep 2026, Part V) Priority-0 items 10.10–10.11 (आ before ardharca-final Parigraha,
  distinct from 10.3), 10.21/11.23 restoration as an explicit function (currently 10.21's
  segmental effects are folded implicitly into `samhita_join`, not a separately named
  restoration step, and 11.23's principle has no function at all — Test F in
  `validate_krama_rv1_1.py` reports this UNRESOLVED), and Priority-1 items 10.8 bahumadhyagata
  auto-detection, 10.20/10.22 Pragṛhya/Rephī restoration as named functions, and 11.25/11.37–43
  remain open — not started.

(Note on the sentence above: it described the state as of Part II/III. As of Part IV/V, actual
ingestion, rule-logic, and now the real generator engine code have all landed — see §4b, §6.5,
§6.6 for what's shipped, and the items just above for what's still open.)
