# Genie ASR voice-command benchmark (prototype)

Prototype/research workspace for DGE Genie voice-command control — see
`/home/user/bhumandala/CLAUDE.md`'s "Working notes" (session brief) for the
full mission. **Deliberately kept out of `dge/`** — nothing here is loaded by
the live reader; `intent_action_map.js` documents how it WOULD wire into
`dge/js/` but isn't included from `dge/index.html`.

## Layout

```
genie_asr_benchmark/
  scripts/
    resolver.js                    the DGE semantic resolver (the real deliverable)
    resolver.test.js               unit tests, run against REAL corpus data (26/26)
    intent_action_map.js           intent -> real dge/js/*.js UI call (browser-only)
    load_corpus.js                 Node loader for library.json/taxonomy.json/parampara.json
    run_manifest_against_resolver.js   text-only resolver accuracy pass (75/76)
    run_real_audio_benchmark.js    the REAL audio-in-to-action benchmark (64/64)
    verify_real_audio.js           quick 2-clip real-audio smoke check
    providers/sarvam_rest.js       Sarvam REST STT, via the official `sarvamai` SDK
    providers/sarvam_realtime.js   Sarvam realtime WS STT, via the same SDK
    smoke_test_sarvam.js           REST connectivity smoke test (not a benchmark)
    smoke_test_sarvam_realtime.js  realtime WS connectivity smoke test (not a benchmark)
    .env.local                     SARVAM_API_KEY -- gitignored, never commit
  ai4bharat_local/                 AI4Bharat IndicConformer CPU/ONNX feasibility spike (verified working)
  manifests/manifest.json          76 hand-curated utterances across 16 categories, real DGE vocabulary
  expected/schema.json             manifest entry schema
  audio/                           real recordings live on the genie-asr-audio-seed branch, NOT main
                                    (personal recordings -- see genie-asr-audio-seed's own audio/README.md).
                                    64/64 original entries covered; 12 new command-set entries not yet recorded.
  results/                         local run output (gitignored)
  reports/findings.md              full findings for the project lead
```

## Run it

```sh
cd scripts
node --test resolver.test.js                       # unit tests (26/26)
node run_manifest_against_resolver.js               # text-only resolver accuracy pass (75/76)
node smoke_test_sarvam.js                            # REST connectivity smoke test (needs .env.local)
node smoke_test_sarvam_realtime.js                   # realtime WS connectivity smoke test

# The real audio-in benchmark needs the recordings fetched out of
# genie-asr-audio-seed first (they're gitignored on main -- personal
# voice recordings, kept off main by design):
git fetch origin genie-asr-audio-seed
git archive origin/genie-asr-audio-seed genie_asr_benchmark/audio | tar -x -C /tmp/audio_full
node run_real_audio_benchmark.js /tmp/audio_full/genie_asr_benchmark   # 64/64
```

## What's real vs. what's still open

- **resolver.js is real, working, unit-tested code**, run against the actual
  `dge/data/library.json` / `taxonomy.json` / `dge/guru-parampara/data/parampara.json`
  — not mocked data. Includes a real Devanagari/Kannada→Latin transliterator
  (added after real audio exposed the gap — see `reports/findings.md` §7),
  and intents for the grammar-tool/content-action/content-correction
  command set added in §8-9.
- **Sarvam REST + realtime WS are both verified working end-to-end**, via
  the official `sarvamai` npm SDK, with real API round-trips (not mocked).
- **AI4Bharat IndicConformer CPU inference was verified working end-to-end**
  on this sandbox's hardware via a community ONNX int8 export — see
  `ai4bharat_local/`.
- **The full 13-category real audio-in-to-correct-action benchmark is
  DONE: 64/64 (100%)**, verified live against real recordings across every
  category. See `reports/findings.md` §6-7 for the full story, including
  what the first real run (80%) revealed and how it got fixed.
- **New command set (§8-9): partially wired, honestly marked.** Some
  intents (search_kosha's bare-word fallback, the Vijaya Dasa entity) are
  fully WIRED reusing existing real DGE functions; several (shabda_rupa,
  dhatu_rupa, sandhi_analysis, shloka_share_action) are PARTIAL — a real
  function exists but is selection-only or needs reader-state context;
  samasa_analysis and chandas_identify are STUB — confirmed no real
  function exists yet; content_correction is a real two-turn resolver
  intent with a written design (§9) but no execution wiring — there is
  nowhere real to submit a correction to yet.
- **Still open**: audio for the 12 new command-set manifest entries (no
  recordings exist for these yet — see `reports/findings.md` §10's
  itemized ask), and two real product decisions on the content-correction
  flow flagged for the project lead rather than picked silently.

## Secrets

`SARVAM_API_KEY` lives ONLY in `scripts/.env.local` (gitignored — see the
"Genie ASR voice-command benchmark" entry in the repo's root `.gitignore`),
following this repo's existing Firebase `.env.local`/`.secret.local`
convention. Never commit it, never print the full value.
