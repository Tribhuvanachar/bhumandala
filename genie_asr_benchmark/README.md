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
    resolver.test.js               unit tests, run against REAL corpus data
    intent_action_map.js           intent -> real dge/js/*.js UI call (browser-only)
    load_corpus.js                 Node loader for library.json/taxonomy.json/parampara.json
    run_manifest_against_resolver.js   scores manifests/manifest.json against resolver.js
    providers/sarvam_rest.js       Sarvam REST STT, via the official `sarvamai` SDK
    providers/sarvam_realtime.js   Sarvam realtime WS STT, via the same SDK
    smoke_test_sarvam.js           REST connectivity smoke test (not a benchmark)
    smoke_test_sarvam_realtime.js  realtime WS connectivity smoke test (not a benchmark)
    .env.local                     SARVAM_API_KEY -- gitignored, never commit
  ai4bharat_local/                 AI4Bharat IndicConformer CPU/ONNX feasibility spike
  manifests/manifest.json          64 hand-curated utterances, real DGE vocabulary, TEXT ONLY
  expected/schema.json             manifest entry schema
  audio/                           BLOCKED: no real recordings provided yet (see below)
  results/                         local run output (gitignored)
  reports/                         findings for the project lead
```

## Run it

```sh
cd scripts
node --test resolver.test.js                     # unit tests (14/14)
node run_manifest_against_resolver.js             # text-only resolver accuracy pass (64/64)
node smoke_test_sarvam.js                          # REST connectivity smoke test (needs .env.local)
node smoke_test_sarvam_realtime.js                 # realtime WS connectivity smoke test
```

## What's real vs. what's blocked

- **resolver.js is real, working, unit-tested code**, run against the actual
  `dge/data/library.json` / `taxonomy.json` / `dge/guru-parampara/data/parampara.json`
  — not mocked data. `manifests/manifest.json`'s 64 entries score 100%
  against it, including several deliberately-still-`unknown` entries that
  document real, current gaps (non-Latin-script normalization, Hindi
  number-words, heavy multilingual filler) rather than papering over them.
- **Sarvam REST + realtime WS are both verified working end-to-end**, via
  the official `sarvamai` npm SDK, with a real API round-trip (not mocked).
- **AI4Bharat IndicConformer CPU inference was verified working end-to-end**
  on this sandbox's hardware via a community ONNX int8 export — see
  `ai4bharat_local/`.
- **Two real recordings were provided (28 Aug 2026) and verified working
  end-to-end** — see `reports/findings.md` section 5 and
  `scripts/verify_real_audio.js`. Kept off `main` (personal voice
  recordings) on the `genie-asr-audio-seed` branch;
  `manifests/manifest.json` entries `01_english_002`/`003` reference them
  by path.
- **The full 13-category multi-provider benchmark (CLAUDE.md section 5) is
  still BLOCKED ON THE REMAINING ~48-98 AUDIO SAMPLES** — 2 clips can't
  support a benchmark. See `reports/findings.md` section 6 for the exact,
  itemized ask.

## Secrets

`SARVAM_API_KEY` lives ONLY in `scripts/.env.local` (gitignored — see the
"Genie ASR voice-command benchmark" entry in the repo's root `.gitignore`),
following this repo's existing Firebase `.env.local`/`.secret.local`
convention. Never commit it, never print the full value.
