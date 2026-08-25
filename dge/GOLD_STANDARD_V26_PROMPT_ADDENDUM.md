# Gold-Standard v2.6 prompt addendum — paste this into the Gemini AI app

_Written 25 Aug 2026. Companion to `dge/GOLD_STANDARD_ARCHITECTURE.md` and
`dge/data/works_registry.json`. This file exists because the extraction
pipeline runs manually (Gemini AI app on Android + local Python scripts on
the same phone, per the project lead), not via the API -- so there is no
code path to inject this automatically. It has to be pasted by hand into
each Gemini session, alongside the contract document itself._

## Why this file exists

`extracted_gold_latest.json` (the Gītā-Vivṛtti Adhyāya 2 sample already
produced) stamps `document.spec_version: "v2_4"` -- two contract revisions
behind v2.6. Diffed directly against v2.6 Part B12, three things are true of
every unit in that file: zero `cross_references[]`, zero `urn`/`provenance`/
`review_status` fields, and `unit_type` spelled five different ways across
72 units (`shloka`/`single_shloka`/`verse`/`standard`/`single`) for what
should be one controlled value. None of that is a defect in the Gemini
output given what it was asked for -- the v2.4-era prompt never requested
any of it. This addendum is what closes that gap for future batches.

**What NOT to paste this for:** the `dge_manifest.json` build-time indexer
(B12.3) and the V17 CI check run later, over whatever Gemini already
emitted -- they are not part of the extraction prompt and don't belong on
the phone.

## 1. Works registry

Paste the full contents of `dge/data/works_registry.json` (view it raw on
GitHub, copy the JSON) into the same Gemini session as the contract
document, once, before extraction begins. It stays valid for every verse in
the session -- no need to re-paste per shloka.

If Gemini's commentary text names a work not yet in that registry (a new
Tīkā, a Nyāya text, a Purāṇa citation), **add a row to
`dge/data/works_registry.json` first** and re-paste, rather than letting
Gemini invent a `work_id` on the spot -- B12.1's closed-world rule exists
specifically so a URN's identity is never a one-off guess.

## 2. The addendum block itself

```
ADDITIONAL RULES FOR THIS EXTRACTION (Gold-Standard v2.6):

1. spec_version: stamp document.spec_version as "v2_6" (not v2_4).
   document.work.work_id = the correct slug from the works registry
   (e.g. "gita-vivrtti" for this work).
   document.work.commented_on = the MULA's work_id from the registry
   ("gita"), not a free-text string like "bhagavad_gita_mula".

2. unit_type: use ONLY "shloka" for verse units (including multi-verse
   units -- multiplicity is signalled by unit_range, not by a different
   unit_type), "ardha" for a half-verse treated as its own unit, "gadya"
   for prose units, "colophon" for a division-final unit, "title_invocation"
   for opening lines. Never "verse", "standard", "single", or
   "single_shloka" -- normalize to "shloka".

3. cross_references[]: for every quotation/citation you can identify in the
   commentary, emit an entry per this shape (B12.2):
   {
     "quoted_span": "...",       // the exact quoted/cited text as printed
     "citation_marker": "...",   // the commentator's own marker phrase
     "urn": "urn:dge:{work_id}:{locator}" | null,
     "direction": "prior" | "future" | "external",
     "reftype": "intra_text" | "inter_text" | "cross_layer",
     "voice": "siddhantin" | "purvapakshin" | "ekadeshi" | "unstated",
     "stance": "pro" | "contra" | "neutral" | "unstated",
     "basis": "stated"
   }
   - Closed world: the urn's work_id MUST be one of the registered
     work_ids above. If the source is not identifiable against the
     registry, set urn: null, identified_source: null -- never guess a
     work_id.
   - Never guess a locator number. Only fill in a specific locator digit
     when the citation marker itself states it, or the neighbouring
     verses you were given (see rule 4) make it unambiguous. Otherwise
     leave urn: null -- an unresolved citation is correct output, not a
     failure to fix.
   - voice and stance are MANDATORY on every cross_reference AND on every
     pramana/quotation object (B9) -- never omit them (V17).

4. Context window: you are being given the previous verse, the current
   verse, and the next verse (with their commentary). Use the neighbours
   ONLY to resolve prior/future citation direction and multi-verse
   construal (B6.1) -- never to backfill content into the current unit's
   own fields (anti-fabrication invariant, Part 0).

5. Language purity (A4): every commentator-attributed field (gloss,
   pratika, commentary_markdown, anvaya words) is संस्कृतप्रतिपदार्थ एव --
   न हिन्द्यनुवादः. If you would write "जिस...को" or "नहीं" or any Hindi
   function word, that is a defect -- rewrite in Sanskrit prose, or leave
   the field null with basis: "uncommented".
```

## 3. Operational checklist per batch

1. New Gemini session (or a session that hasn't drifted) → paste the
   Gold-Standard contract (`DGE_Gold_Standard_Contract_v2_5.md`, doc
   version 2.6) → paste `dge/data/works_registry.json` → paste the block
   in §2 above.
2. Extract as before (prev/current/next verse windows, one unit out per
   call, per Part F).
3. Before merging a batch into `output/` or the corpus: spot-check that
   `document.spec_version` reads `v2_6` and that `unit_type` values are
   drawn only from the controlled set in rule 2 -- both are visible from a
   plain read of the JSON, no tooling needed yet.
4. When ready to validate mechanically, `tools/validate_gold_standard.py`
   now runs a V17-lite check (registry membership, URN shape, mandatory
   voice/stance) as a WARN gate -- see that script's own docstring for
   what it does and does not yet catch (no `dge_manifest.json` exists yet,
   so target-text verification, B12.3's `identified_source` resolution,
   and the client-side hover/tap card are still open work, not silently
   skipped -- tracked in `dge/PENDING.md`).
