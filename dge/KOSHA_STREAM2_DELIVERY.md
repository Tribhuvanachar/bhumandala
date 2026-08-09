# DGE Kosha — Stream 2 delivery (bugs + admin dashboard)

Scope: the three confirmed Kosha search bugs, a new Kosha admin dashboard, and
the Purāṇic-encyclopedia sourcing question. Files touched:

- `dge/js/kosha.js` — bumped to **v1.1** (the three bug fixes + hidden-dict support)
- `dge/kosha-admin.html` — **new** admin dashboard (mirrors `library-admin.html`)
- `dge/index.html` — one line: cache-bust `js/kosha.js?v=4.59.1` → `?v=4.59.2`
  (so browsers actually pick up the new kosha.js; nothing else in index.html changed)

Everything is additive. No data files or schemas changed.

---

## Bug 1 — “Madh” returned न-words (नाध् नाध नध्री नाधस्…)  ✅ fixed

**Root cause.** The Latin-script query path in `toSLP1list()` fed the query to
Sanscript's HK/ITRANS/SLP1 transliterators **case-sensitively**. In every one of
those schemes a capital **`M` means anusvāra (ṃ)**. So `"Madh"` was read as
*ṃ + a + dh* → SLP1 `MaD`, and the `fold()` step maps `M → n`, giving `naD`.
That lands in the **`na` shard**, whose entries (नाध्=`nAD`, नाध=`nADa`,
नध्री=`naDrI`, नाधस्=`nADas`) all begin `na…` and prefix-match `naD`. Hence the
exact reported symptom. A casual user title-casing “Madh”/“Rama”/“Krishna”
never means the SLP1 special meanings that capitals carry.

**Fix.** Two changes in `toSLP1list()`:
1. For Latin input, transliterate **both the raw query and a lower-cased pass**
   (union), so the intended lower-case reading is always present.
2. **Drop any SLP1 candidate that begins with anusvāra (`M`) or visarga (`H`)** —
   no Sanskrit word can start with either, so such a candidate is always a
   mis-parse. This removes the spurious `na` bucket entirely.

Result: `"Madh"` now yields only the `maD` candidate → the `ma` shard (मध्/माध…),
never `na`. Verified against the real shard index. (In the *sampled* 10-dict data
there is no `ma` shard, so “Madh” currently returns empty rather than wrong —
correct behaviour; the full corpus has the `ma` bucket.)

Mid-word anusvāra typed deliberately (e.g. SLP1 `saMgha`) is **unaffected** — the
filter only drops *word-initial* `M`/`H`.

## Bug 2 — “राम” surfaced रम, not राम  ✅ fixed

**Ground truth (checked in the data):** राम **does** exist as a headword
(`rAma`) in 8 of the 10 loaded dictionaries (Vācaspatyam, Abhidhānachintāmaṇi,
Amarakośa, Śabdārtha-Kaustubha, Macdonell, MW-Cologne, Benfey, Apte-1957). It was
not missing — it was **out-ranked**. Both राम (`rAma`) and रम (`rama`) fold to the
same key `rama`, and the old sort ordered by headword length, so रम (shorter) came
first and looked like the answer.

**Fix.** Added an **exact-SLP1 ranking tier**: a result whose exact SLP1 spelling
equals what the user typed sorts above fold-only neighbours. Typing Devanagari
`राम` (SLP1 `rAma`) now puts **राम #1**; रम drops below it. Also added a subtle
**“No exact headword for X — showing nearest matches”** banner that appears only
when nothing matches the exact spelling typed, so a near-neighbour is never
presented as if it were the exact word. Verified: `राम` → राम first with the exact
flag; `rama` (plain latin) → रम first (you typed the short form), राम present.

## Bug 3 — pivot “→ कನ್ನಡ / → English” buttons showed a bare ⚠  ✅ fixed

**Root cause.** kosha.js read the Gemini key from `localStorage['gemini_api_key']`
and model from `localStorage['gemini_model']` — **names nothing in the app ever
writes to.** The main app saves the key/model as `user_gemini_key` /
`user_gemini_model` (⚙️ Settings), and the Ashtādhyāyī page uses `dge.ash.gkey` /
`dge.ash.gmodel` (JSON-encoded). So the pivot always failed the “no key” check and
showed a bare `⚠` — the real message was hidden in the button's `title` attribute,
which is invisible on touch/mobile. The default model string `gemini-3.6-flash`
also only worked if that model happened to be valid for the key.

**Fix.**
- Read the key/model from **all three** locations in priority order
  (`user_gemini_*` → `dge.ash.g*` → legacy `gemini_*`), so the pivot works wherever
  the user saved their key.
- **Surface a visible inline error** (`.kosha-xl-err`) with the actual reason
  instead of a mystery ⚠ — distinguishing “no key”, “invalid key” (HTTP 400),
  “model not found” (HTTP 404), blocked `finishReason`, and generic API errors.
  The button is restored so the user can retry after fixing the key/model.

Note: this shares the same key/model store as the rest of the app, so once the
user sets a Gemini key in Settings the pivot, the Ashtādhyāyī tutor, and Ask-Ācārya
all use it. (I did **not** unify Ashtādhyāyī's separate `dge.ash.*` store — that's a
larger cross-stream cleanup; the read-fallback covers it for now.)

---

## New — Kosha admin dashboard (`dge/kosha-admin.html`)

Built on the `library-admin.html` pattern: same design tokens, same **`SHRI108`**
passkey gate (`sessionStorage`), dark-mode toggle, localStorage persistence,
export-to-JSON. It shows, per dictionary in `data/koshas/_index/manifest.json`:

- name, direction, and a **licence badge** — *Cleared* (CC-BY-SA), *Unclear*, or
  *Unclear — no licence* — matching the categories in `kosha_toolkit/LICENSING.md`;
- **headword and sense counts** actually loaded (from the manifest);
- a **👁 hide toggle** that removes a dictionary from कोश search **without deleting
  its data** — it writes `localStorage['kosha_hidden_dicts']`, which the updated
  `kosha.js` reads live at query time (verified end-to-end: hiding a dict drops it
  from results on the next search);
- a **sortable** table (click any header) and name/language filter + licence chips;
- **Export visibility** → `kosha-visibility.json` if you want to bake a default set
  of hidden dicts into the repo later;
- a separate **“Known but not yet loaded”** catalogue — the 26 dictionaries named
  in `LICENSING.md` that aren't in the manifest yet (the 16 cleared Cologne titles
  beyond the 5 loaded, the Unclear sa→sa koshas, and the other-Indic bridges), each
  with its licence category.

Wire-up: add a link to `kosha-admin.html` wherever `library-admin.html` is linked
(it's an unlinked super-admin page by the same convention). Tested in Chromium at
1180px and 393px — no console errors.

> Caveat on the not-loaded list: it's the subset **documented** in
> `LICENSING.md`, not a live scrape of `indic-dict/stardict-sanskrit`. The repo has
> ~65 dicts / 28 with `LICENSE.xml`; if you want the exact remaining ~55 with live
> counts, that needs a fetch of the mirror's file tree (a separate task).

---

## Purāṇic-encyclopedia sourcing question — answered plainly

**There is no Purāṇa-encyclopaedia / Purāṇa-index dictionary in either place.**
It is **not** in the current manifest, and **not** documented in
`kosha_toolkit/LICENSING.md`'s inventory of the `indic-dict/stardict-sanskrit`
mirror or the local `dict.zip`. The nearest subject-koshas the mirror carries are
**Śaiva-kosha, Vaiṣṇava-kosha, Nyāya-kosha** (all *Unclear — no LICENSE.xml*) —
none of which is a Purāṇic index.

Vettam Mani's *Purāṇic Encyclopaedia* is a **1975 Motilal Banarsidass**
publication and is almost certainly still in copyright. Per this project's standing
rule — **“absence of a licence is not permission”** — it must not be sourced here.
This is a **sourcing gap for the project lead to decide on**, not something to
fabricate a fix for, and I did **not** attempt to source it.

(Distinct thing, to avoid confusion: the `purANa-encyclopedia` /
`purANa-index-dev` datasets in your 114-item corpus/Ashtādhyāyī list are a
**different pipeline** — Vidyut/ashtadhyayi-style corpus resources — and are not
part of the Kosha StarDict mirror. If you want a Purāṇa glossary inside कोश, that's
a separate decision about which of those (if any) is licence-clear.)

---

## Repo-size check (your “new repository planning” question)

Measured now: working tree **~284 MB** (**~345 MB** incl. `.git`); `data/koshas`
is **63 MB** (the 10 loaded dicts). **You are well under the 1 GB rule — no
separate repo is needed yet.**

Trajectory flag: the admin's “not yet loaded” list is 26+ more dictionaries,
including the **full Cologne set** and the large **sa→sa koshas**. Ingesting those
(MW-Cologne alone is already the biggest single dict at 194k headwords) will grow
`data/koshas` fast. **Recommendation:** before ingesting the bulk remainder, stand
up the planned **`bhumandala-kosha-data`** repo served over jsDelivr and point the
app at it via `window.KOSHA_DATA_BASE` — do the split *before* you cross 1 GB, so
you never commit a >1 GB blob into the Pages repo and then have to rewrite history.
That matches the second Kosha-engine design already on file (CDN-served data repo,
`entry_raw` preserved). Not urgent today; do it before the next big import.

---

## How to test after uploading

1. Upload `js/kosha.js`, `kosha-admin.html`, and the one-line `index.html` bump.
2. Main library page → floating **कोश** button → type `राम` (राम should be #1),
   then `Madh` (should not return न-words).
3. Set a Gemini key in ⚙️ Settings → open a कोश entry → tap **→ ಕನ್ನಡ / → English**;
   it should translate, or show a clear reason if the key/model is wrong.
4. Open `kosha-admin.html`, passkey `SHRI108`; hide a dictionary; reopen कोश and
   confirm it's gone from results.
