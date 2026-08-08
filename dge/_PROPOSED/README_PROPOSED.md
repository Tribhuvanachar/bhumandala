# Proposed additions (NON-DESTRUCTIVE — nothing here is auto-merged)

## 1. taxonomy.json
Merge the object in `taxonomy_snippet.json` as a new TOP-LEVEL key `"vyakarana"`
in `dge/data/taxonomy.json` (a sibling of `vedas`, `sutras`, `puranas`, ...).
It reuses the EXISTING schemas — no change to schemas.json is required, because
`grantha_mula_text` / `grantha_tika_text` / `grantha_tippani_text` already model
the mula → tika → tippani stack that Ashtadhyayi needs.

## 2. Optional schema-description polish
If you want the schema *descriptions* to read for vyakarana as well as Sarvamoola,
you may later broaden the wording in schemas.json — but the FIELDS are identical,
so it is not required for the data to load.

## 3. Counts imported
{
  "sutrapatha": 3962,
  "kashika": 3962,
  "nyasa": 3831,
  "balamanorama": 2944,
  "tattvabodhini": 2450
}

## 4. Cross-references
Every commentary item points back at its sutra via
  references:[{ "target":"vyakarana/ashtadhyayi/sutrapatha" (or /kashika for Nyāsa),
                "unit_id":"<a.p.s>", "note":"comments_on" }]
so the library-wide backlink index resolves "what explains this sutra".
