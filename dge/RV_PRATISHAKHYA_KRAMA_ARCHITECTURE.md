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
| Ṛgveda-Prātiśākhya **sūtra text** (Krama-Paṭala + Kramahetu-Paṭala at minimum) | Still not digitized. `dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/data.json` and the sibling `shaunakiya_chaturadhyayika/data.json` are both empty stubs (`"items": []`) — category placeholders only. §4a replaces the first version's single archive.org citation with a three-layer sourcing plan. |

**Sequencing implication:** the Pada-pāṭha prerequisite is satisfied. The remaining blocker
is the Prātiśākhya sūtra text itself (§4a) — building the rule engine against paraphrase or
a secondary site's summary alone risks baking in exactly the kind of un-sourced
simplification this document exists to avoid.

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
| `RVPr_10.20` | प्रश्लेषः च प्रगृह्यस्य प्रकृत्या स्युः परिग्रहे |
| `RVPr_10.21` | शौद्धाक्षरागमः अपैति |
| `RVPr_10.22` | रिफितानि ऊष्मणः अघोषे दूभावः स्वधितिः इव च |
| `RVPr_11.19` | चतुःक्रमः तु आचरितः अत्र शाकलैः |

**This matters beyond confirming the source works:** every one of these is, word-for-word
(modulo the sandhi a printed edition applies across word boundaries), a sūtra that appeared
unattributed and unnumbered in the original Gemini-derived review that started this whole
document. They are real — not fabricated by that review — and now have exact citations
(the catuḥkrama sūtra, for instance, is specifically **`RVPr_11.19`**, not merely "somewhere
in Kramahetu"). That review's instinct to insist on primary-source verification was correct;
this is that verification actually done.

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

**What to actually ingest, once approved:** do not dump any layer's raw text into a prompt
context. Extract into one structured rule database, one file per paṭala, so every rule is
individually addressable and citable from the generator's `provenance.rules` (§6.3):

```
dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/
├── metadata.json
├── patala-01-samjna-paribhasha.json
├── patala-02-samhita.json
├── patala-03-svara.json
├── patala-04-sandhi.json
├── patala-05-nati.json
├── patala-06-dhvanyagama.json
├── patala-07-pluti.json
├── patala-08-pluti.json
├── patala-09-pluti.json
├── patala-10-krama.json
├── patala-11-kramahetu.json
└── ... (12–18 as later needed; not blocking for Krama work)
```

Each rule, at minimum — now with one real entry, verified against Layer A on 11 Sep 2026
(§4a.1), as a concrete worked example rather than a hypothetical shape:

```json
{
  "id": "RVPr_10.20",
  "patala": 10,
  "sutra": 20,
  "text_devanagari": "प्रश्लेषः च प्रगृह्यस्य प्रकृत्या स्युः परिग्रहे",
  "text_slp1": "praSlezaH ca pragfhyasya prakftyA syuH parigrahe",
  "domain": "krama",
  "conditions": [],
  "action": [],
  "exceptions": [],
  "source": "Sanskrit Library, ed. Peter M. Scharf 2010 (Version 0.1), CC BY-NC-SA 3.0; text per Cardona 1993–94 — sanskritlibrary.org/catalogsText/fgveda_prAtiSAKya.html",
  "crosscheck": "vedavishtaram.in (Uvaṭa Bhāṣya + Viṣṇumitra Vṛtti) — not yet done for this sūtra"
}
```

`conditions`/`action`/`exceptions` are the still-unfinished part of the schema: they encode
what the sūtra actually *means* for the rule engine (here, roughly, "in Parigraha, a
Pragṛhya word's original quality prevails through Praśleṣa" — but that reading is this
session's own gloss, not yet checked against Uvaṭa's Bhāṣya, so it is deliberately **not**
written into the `action` field above). Leave those three empty rather than guessed until a
crosscheck against Layer B or C backs the interpretation — an empty field is an honest gap; a
plausible-sounding paraphrase is not. `text_devanagari`/`text_slp1`, by contrast, can be
filled directly from Layer A once it's actually transcribed — that part is a real citation,
not an interpretation.

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

Each predicate's non-trivial branches should cite a rule `id` from the paṭala-keyed rule
database in §4a (e.g. `RVPr_10.20`) — that database is the source of truth for rule text and
conditions; predicates are code that *applies* those rules, not a second place to restate
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

1. Get the lead's go-ahead for a full pull of paṭalas 10–11 through Layer A's endpoint
   (§4a.1), then ingest that sūtra text into the rule database (§4a), cross-checked against
   Layers B and C — the Pada-pāṭha prerequisite is already satisfied (§4).
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
    original review — they were real, not fabricated, and now have exact `RVPr_N.M` citations.

---

## 10. Open questions for the project lead

- Approve a full pull of paṭalas 10–11 (93 sūtras) through Layer A's undocumented endpoint
  (§4a.1) — one inspection fetch of the whole 1,067-sūtra document has already been made;
  a full structured ingestion is a bigger, repeatable automated use of the same endpoint and
  should get an explicit go-ahead first, per the access-ethics note in §4a.1. Alternative:
  contact Sanskrit Library directly for the underlying TEI XML.
- Approve the three-layer Prātiśākhya sourcing plan in §4a (Sanskrit Library XML as
  canonical base, VedaViṣṭāram + the RV-Prātiśākhya project as cross-checks), including the
  CC BY-NC-SA 3.0 attribution/share-alike obligation that comes with Layer A.
- Confirm an independently attested Krama-pāṭha source to use as the VALIDATE-mode ground
  truth for RV 1.1.1 and subsequent sūktas — `github.com/vishvasa`'s Rigveda repo was
  checked (10 Sep 2026) and does not appear to carry one, so this is still open.
- Decide whether `github.com/vishvasa`'s per-sūkta Śākala Saṃhitā (2,226 files) is worth a
  word-level cross-check against DGE's own Pada/Saṃhitā data before the Krama work leans on
  it, or whether the existing 96.61%-validated VedaWeb cross-check is sufficient.

No code or corpus data changes beyond this document (and the linked `PENDING.md` entry) are
part of this commit; §4a and §10 are the gating items before implementation can start.
