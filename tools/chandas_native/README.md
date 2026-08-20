# chandas_native — from-scratch classical metre engine, Apache-2.0

An independent, clean-room replacement path for the AGPL-3.0 content in
`tools/chandas/` (vendored from `hrishikeshrt/chanda`). **Licence: this
directory is plain Apache-2.0, this repo's default** — no AGPL code or
data anywhere in it.

## What's here

- `scan.py` — syllabifies Devanagari text and applies the standard
  laghu-guru (light-heavy) rule (long vowel, or followed by anusvara/
  visarga/a conjunct → guru; otherwise laghu; final syllable of a pada is
  a wildcard, since its weight is prosodically "anceps"). Written from the
  textbook rule itself, not read off anyone's implementation.
- `build_db.py` — generates `data.json` from the eight three-syllable
  ganas (the "yamataarajabhaanasalagaam" mnemonic) plus a small set of
  named classical metre formulas. Every formula is a standard, widely
  taught fact (Pingala/Vrittaratnakara/Chandomanjari tradition, centuries
  public domain) — this file states them directly rather than
  transcribing anyone's CSV.
- `identify.py` — scans a verse and matches it against `data.json`:
  exact pada-pattern match, a dedicated rule-check for Anustubh (which
  isn't a fixed pattern), and a `difflib`-based fuzzy fallback for
  near-misses.
- `verify.py` — regression test against three real, independently-recalled
  verses (Gita 1.1, two Bhartrhari verses), each checked against its
  well-known metre. Run: `python3 tools/chandas_native/verify.py`.

## Scope — read this before treating it as a drop-in replacement

This is **not** a full replacement for `tools/chandas/`'s AGPL data yet.
It's a deliberately smaller, honestly-scoped core:

| category | this directory | AGPL vendor (`tools/chandas/`) |
|---|---|---|
| sama-vrutta | 13 (the metres that actually recur throughout classical kavya) | 190 |
| upajati | 16 (all Indravajra/Upendravajra combinations, generated mechanically) | 42 (individually named) |
| ardhasama / vishama vrutta | none | 8 / 5 |
| matra-vrutta | 2 (Arya, Giti) | 10 |
| akshara-jaati names | 20 (syllable counts 1-20) | 27 |
| yati (caesura position) | not included | included |

Why smaller rather than padded to match: the 13 sama-vrutta and the
Anustubh rule were each cross-checked — where a real verse was on hand
(3 cases, see `verify.py`), by scanning the actual verse and confirming
the identification; for all 13, additionally by comparing the
independently-derived `lakshana` pattern against the AGPL vendor's own
values as a pure QA step (all 13 matched exactly, which is expected and
unremarkable since these are old public-domain facts, not evidence of
copying — the derivation went gana-table → pattern, never vendor-CSV →
pattern). The `yati` field was dropped because the vendor's numbers turned
out to use a segment-length convention that doesn't reproduce from plain
recall reliably — guessing at it would have been worse than leaving it
out. Ardhasama/vishama vrutta (alternating-pada families like Vaitaliya,
Pushpitagra) need primary-source verification before being added with any
confidence; they simply aren't attempted here.

Extending this safely means checking each new entry against a real
primary source (e.g. a public-domain edition of the Vrittaratnakara or
Chandomanjari) or a real verse, the same way the 13 above were checked —
not transcribing more of the vendor's CSVs, which would defeat the point.

## Status relative to `tools/chandas/`

Both directories currently coexist. Retiring the AGPL vendor copy in
`tools/chandas/` in favour of this one is a coverage/completeness call for
the project lead to make, not something this tool should do unilaterally
— see `dge/PENDING.md`.
