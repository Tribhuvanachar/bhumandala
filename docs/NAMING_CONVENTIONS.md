# Naming conventions — granthas, authors, sections, and what must agree with what

_Written 9 Sep 2026, in answer to: the library, the guru-paramparā, the Dāsa
Sāhitya section, the admin managers and every new data.json should be in
step with each other — are they, and what is the rule?_

They are not, yet. `python3 tools/audit_names.py` measures the gap (today:
1,007 of 1,701 library titles have no Indic script; 454 spellings for the
authors of 1,410 files, 11 of them mapped to a person; 167 of 171 guru
`works` strings match no library title; 152 of 152 Dāsa composers resolve to
no person). This file states the rules everything is being brought to, so the
next importer, the next admin edit and the coming catalogue page all pull the
same way. The audit enforces what it can; the rest is discipline.

## 1. One id per person, everywhere

**Rule.** A person (author, commentator, composer, saint) is identified by
one lowercase ASCII id, and that id is the one `dge/guru-parampara/data/
parampara.json` already uses when the person is in the paramparā
(`madhva`, `jayatirtha`, `vyasatirtha`, `raghavendra`, `purandara`, …).
Persons outside it are declared in `dge/data/author_aliases.json` under
`persons` with the same shape.

**Where it goes.**

| Store | Field | Status |
|---|---|---|
| `data.json` (any schema) | `author_id` beside the existing `default_author` / `author` / `composer` | new — optional until the alias table covers a folder, then required |
| `taxonomy.json` | `_author_id` beside `_default_author`, cascading like it | new |
| `library.json` entries | `facets.author_id` (derived by `audit_library.py --fix` from the data.json) | new |
| `parampara.json` nodes | `id` (unchanged) — `works[].path` gains the library path | pending |
| `DvaitaVedanta/Itara/DasaSahitya/index.json` composers | `author_id` | new |

**Display names** come from the person record, never from the field on the
file: `name_sa` (Devanagari), `name_en` (IAST with diacritics), `name_kn`
(Kannada) where known. The free-text `default_author` stays as the
*attestation* — what the source said — and is never "corrected" in place.

**Alias table.** `dge/data/author_aliases.json` maps every spelling found in
the corpus to an id. It grows from `audit_names.py`'s "unmapped spellings"
list, one line per certain match, never from a guess. A spelling that is a
placeholder (`unspecified`, `unknown`) maps to nothing and is reported.

## 2. Titles: Devanagari first, and never a slug

**Rule.** `library.json` `title` is the Devanagari (or Kannada, for Kannada
works) name of the text as a reader would say it — `तत्त्वसङ्ख्यानम्`, not
`Tattva Sankhyana`, and never a folder slug. Latin goes in `title_en` (IAST);
a source's own display string, if different, in `title_source`. `audit_
library.py`'s `derive_title()` fallback that humanises a slug (`Mula`, `Tika
Jayatirtha`) is the origin of most of the 1,007 English-only titles; its
output is a placeholder to be replaced, and the audit counts it as one.

**Layer titles.** A commentary layer is titled by the commentary's own name,
with the commentator: `न्यायसुधा (श्रीजयतीर्थः)`. `Tika Jayatirtha` is a
slug, not a title. The 39 titles of the form `<mūla name> — tika_<slug>` are
HARD findings in the audit: the slug tail must be replaced with the ṭīkā's
name, or the entry hidden until someone who can read the source supplies it.

**Numbered units** (maṇḍala, kāṇḍa, adhyāya, skandha, sarga) are labelled by
`DGE_NUMBERED_PREFIXES` in `dge/js/library.js`; they do not need a stored
title.

## 3. Folder slugs

Lowercase ASCII, `_` between words, transliteration without diacritics
(`brahma_sutra_bhashya`, `tika_jayatirtha`). Layer folders begin with the
layer kind: `mula`, `bhashya`, `tika_<author>`, `tippani_<author>`,
`vyakhya_<author>`, `translation_<translator>`, `saartha`. A slug is an
address, never a display string, and never generated from body text — the
`karmavijaya/tika_bahunam_vacanikarthanam…` folders are the counter-example
(HARD finding; they need real names from the source).

## 4. Kinds and parents (for the catalogue page)

Every text is one of: `mula` (independent work), `bhashya`, `tika`,
`tippani`, `vyakhya`, `vritti`, `translation`, `saartha`, `sangraha`,
`stotra`, `pada` (Dāsa composition). A commentary names its parent by
library path. Today both are implied by the folder path (the last segment's
prefix and the enclosing folder); the catalogue page will read them from
`kind` and `parent` fields once `audit_library.py --fix` writes them from
the path — which it can do mechanically, because the folder rule in §3 is
already followed closely enough. Independent works have no `parent`.

## 5. Guru-paramparā ↔ library

`parampara.json` `works[]` entries become objects `{ "title": "…", "path":
"dge/data/…/data.json" }` where the work is in the library, and stay strings
where it is not (a lost work, or one not yet imported). `admin/guru.html`'s
works datalist must offer library titles **with their path** and store both.
The audit reports every string that matches no library title.

## 6. Dāsa Sāhitya

Composer names are Kannada in `index.json` and in each composer file, and
those two must be identical (HARD). Each composer gets an `author_id`
(§1); the reader's composer sheet (`dge/dasa-sahitya/index.html`) joins on
that id, not on a Latin-only normalisation that empties Kannada names.
`admin/dasa-capture.html` reuses the slug the index already has for a
composer and writes `composers/<slug>/data.json` with `items` — the shape
the corpus uses — never a second file.

## 7. Admin pages

No admin page carries its own author or grantha name list. `admin/
ashtadhyayi.html`'s hardcoded `who:` strings, `admin/guru.html`'s free-text
works datalist and the Dāsa capture form all read from the same three
files: `library.json` (paths and titles), `author_aliases.json` +
`parampara.json` (persons). The audit lists any page that still hardcodes.

## 8. Every new data.json or library entry

Before it is committed: Devanagari `title`; `author_id` where the person is
known; folder slug per §3; `kind` and `parent` per §4 (or a path that lets
them be derived). `python3 tools/audit_library.py` and `python3 tools/
audit_names.py` both run in CI; the second reports today and will fail on
HARD findings once the existing backlog is cleared.

## 9. What is done and what is not (9 Sep 2026)

Done: the rules; `author_aliases.json` seeded with the five persons whose
spellings are unambiguous (Madhva, Jayatīrtha, Vyāsatīrtha, Rāghavendra, Veda
Vyāsa) plus person records for the other names the corpus will need;
`tools/audit_names.py` running in CI as a report; the Dāsa capture page
fixed to write the real file shape and to keep Kannada composers apart.

Not done, in the order it should be: (1) grow the alias table over the
443 unmapped spellings — most are one-file authors and a morning's work for
someone who reads the names; (2) `audit_library.py --fix` writing
`author_id`, `kind`, `parent`; (3) replacing the 39 slug-tail titles and the
karmavijaya folder names from the source; (4) `works[].path` in the
paramparā; (5) `DvaitaVedanta/Itara/DasaSahitya/index.json` `author_id`; (6) the catalogue page
on top of all of it.
