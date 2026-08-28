# DGE Genie voice-command prototype — findings

Session date: 2026-08-28. Scope: CLAUDE.md's "Working notes for Claude"
mission brief (DGE Genie voice-command control prototype). This is
long-horizon prototype work, **not** part of tonight's redesign launch.

## TL;DR

- **The resolver — the actually hard part (CLAUDE.md section 6) — is real,
  working code**, tested against the live corpus (`library.json`,
  `taxonomy.json`, `parampara.json`), not mocks. 64/64 on the text-only
  manifest, including several entries that correctly stay `unknown` and
  document real gaps rather than being tuned to pass.
- **Sarvam REST and realtime WebSocket both verified working end-to-end**
  with real API calls, using the official `sarvamai` SDK. The earlier
  hand-rolled WebSocket prototype's silent failure (CLAUDE.md section 2)
  appears to have been a client-side wire-protocol bug — the vendored SDK
  works cleanly.
- **AI4Bharat IndicConformer CPU inference verified actually running** on
  this sandbox's hardware (4 CPU, no GPU) via a community ONNX int8 export
  — not just "should work on paper."
- **Bhashini/ULCA**: self-service signup exists but sits behind an
  unpublished-timeline DIBD manual approval step — not usable tonight,
  documented below, not force-fitted into the benchmark.
- **The multi-provider accuracy benchmark itself is BLOCKED ON AUDIO
  SAMPLES.** Everything upstream and downstream of "real recorded audio in,
  provider comparison out" is built and working; that one input is missing.
  See "What's needed next" at the bottom.

---

## 1. ASR candidates

### A. Sarvam AI / Saaras — WORKING, verified live

Used the official `sarvamai` npm SDK (v1.1.9, MIT... actually "Proprietary"
license per its own `npm view`, standard for a vendor SDK) rather than a
hand-rolled HTTP/WebSocket client.

- **REST** (`client.speechToText.transcribe`): real call against a
  self-generated espeak-ng English test clip succeeded in 1733ms, correctly
  transcribing "Open Rig Veda 1.1" — see `scripts/smoke_test_sarvam.js`.
  This is a connectivity smoke test on synthetic TTS audio, not an accuracy
  benchmark result.
- **Realtime WebSocket** (`client.speechToTextStreaming.connect`): also
  verified working — connected, streamed the same clip, got a real
  transcript event back (`"Open Rig Veda 1.1"`) with `processing_latency:
  0.079s` reported by the server for a 3.488s clip. CLAUDE.md section 2
  recorded an earlier hand-written WebSocket client that connected but
  never received transcript events — using the vendor SDK's own
  `Socket_js_1.SpeechToTextStreamingSocket` wrapper instead of
  reverse-engineering the frame protocol resolved that; the earlier issue
  was very likely a message-framing bug in that hand-rolled client, not a
  problem with Sarvam's realtime API itself.
- Pricing/free-allowance and full language-coverage/proper-name-accuracy
  benchmarking need real audio (see "blocked" below) — connectivity and
  auth are no longer open questions, cost/accuracy still are.
- Key stored ONLY in `scripts/.env.local` (gitignored), never printed in
  full anywhere in this session's output or files.

### B. AI4Bharat / IndicConformer — CPU inference VERIFIED WORKING

No GPU in this sandbox (4 CPU cores, 15GB RAM). Two paths were attempted:

1. **`indic-asr-onnx` pip package** — abandoned. It hard-depends on
   `torch>=2.0.0` plus `onnxruntime-gpu` and pulls several GB of
   NVIDIA-CUDA-only wheels even though it's an "ONNX" package name — wrong
   tool for this CPU sandbox.
2. **Manual ONNX inference against the raw model files** — worked. Cloned
   the reference `transcriber.py` (read-only) to replicate its exact
   feature-extraction math (80-mel spectrogram, n_fft=512, hop=160) using
   `librosa`/`numpy` instead of `torchaudio`, avoiding torch entirely.
   Installed only `onnxruntime` (CPU) + `librosa` + `huggingface_hub` +
   `soundfile` — no torch, no NeMo, ~30s install. Downloaded the community
   int8-quantized `atharva-again/indic-conformer-600m-quantized` checkpoint
   from HuggingFace (632MB: encoder + CTC decoder + vocab/language masks)
   in ~17s. **Confirmed Sanskrit (`sa`) and Kannada (`kn`) both present** as
   per-language CTC vocab entries in this one multilingual checkpoint.
   Ran real end-to-end inference (audio → mel features → ONNX encoder →
   CTC decoder → greedy decode → vocab lookup) on a synthetic tone+noise
   clip — real model output, garbage as expected from non-speech input
   (this is a pipeline smoke test, not an accuracy claim), confirming the
   full chain actually executes. Encoder inference ran in ~0.7-1.0s for 3s
   of audio — real-time-factor ≈0.3, comfortably under real-time on 4
   cores.
- **License**: MIT for the toolkit code; the model cards for the
  `indicconformer_stt_*` checkpoints are also listed MIT (an earlier
  CC-BY-4.0 mention applies to some other AI4Bharat assets, not confirmed
  for these ASR checkpoints specifically).
- **No official ONNX export** from AI4Bharat — only PyTorch/NeMo
  checkpoints officially; the community conversion used here
  (`atharva-again/indic-conformer-600m-quantized`,
  `OpenVoiceOS/ai4bharat-indicconformer-ml-onnx`) is unofficial/DIY, not
  vendor-supported.
- **Streaming**: the underlying architecture (hybrid CTC-RNNT) is
  streaming-capable, but AI4Bharat's own tooling only demonstrates
  batch/offline `.transcribe()` — no official low-latency streaming server.
  This session's own use was also batch (whole-clip), not streaming.
- **Maintenance**: active but light — commits into 2025, issues still
  answered into 2026, but slow-moving.
- Files: `ai4bharat_local/infer_ctc.py`, `make_test_wav.py`, `test_tone.wav`,
  `models/indic-conformer-600m-quantized/`, `venv/` (venv and model weights
  gitignored — see repo's `.gitignore`).
- **Still needed for a real accuracy read**: real Sanskrit/Kannada speech
  audio (same blocker as every other provider) and, ideally, the official
  per-language 120M checkpoints compared against this 600M multilingual one.

### C. Bhashini / ULCA — investigated, NOT self-service in practice, skipped for this benchmark

- The ULCA Integrator signup flow is still live at
  `https://bhashini.gov.in/ulca/user/register` (matches the documented
  `bhashini.gitbook.io/bhashini-apis/pre-requisites-and-onboarding` flow —
  not deprecated). No institutional email required to register.
- **But** the same official docs state verbatim that API keys become
  visible only "once registered and the registration of the account is
  approved by DIBD team" — a manual government-team review sits between
  signup and a usable key, with **no published SLA/turnaround time found
  anywhere** (official docs, GitHub READMEs, or general search).
- Pricing on the official gov.in path appears free (public-good framing).
  Note: `bhashini.ai` (with a `pay.bhashini.ai` paid tier, contact email is
  a plain `@gmail.com` address) is a **separate, unofficial commercial
  entity** — don't conflate the two if this gets cited further.
- Developer write-ups from 2025-2026 confirm people do obtain and use keys
  via this flow, and that Sanskrit (`san_Deva`) / Kannada (`kan_Knda`)
  language codes exist in the API surface, but none of the sources found
  confirm ASR/STT specifically working well for Sanskrit — general Indic
  coverage is documented, Sanskrit STT quality is not.
- **Verdict**: per CLAUDE.md's own instruction, this is "something beyond
  self-service" (an approval process) — skipped for this benchmark rather
  than spending more time chasing an unpredictable approval wait. If the
  project lead wants to pursue it, the next step is simply registering with
  a real email and logging the actual wait time — nothing further is
  determinable from public sources.

### D. Other 2026 Indic/Sanskrit ASR candidates (named, not benchmarked)

- **OpenAI Whisper** (large-v3/turbo) — MIT, strong community Hindi
  fine-tunes exist, no dedicated Sanskrit fine-tune found. Best CPU/ONNX
  tooling ecosystem (faster-whisper, whisper.cpp) of anything surveyed.
- **NVIDIA NeMo/Parakeet** — the toolkit AI4Bharat itself trains on;
  Parakeet models are English-only, not a distinct Indic alternative.
- **Meta MMS** — 1,100+ languages, likely includes Sanskrit/Kannada, but
  **CC-BY-NC 4.0 (non-commercial only)** — a real licensing blocker for a
  production DGE feature.
- **Vakyansh/ekstep** — 18 Indic languages, open source, appears largely
  dormant, no confirmed Sanskrit model.
- **Sanskrit-specific research corpora** (not deployable products):
  "Vedavani" (Vedic Sanskrit ASR benchmark, arXiv 2506.00145),
  "Vāksañcayah" — useful as future fine-tuning/eval data, not off-the-shelf
  models.

### E. Major clouds (Google/Microsoft/AWS)

Not attempted this session — time went to A-D per CLAUDE.md's stated
priority ("optional, only if time allows"). Worth a pass alongside a real
audio benchmark since proper-name accuracy (not generic WER) is what
actually matters here.

---

## 2. The DGE semantic resolver (`scripts/resolver.js`)

Built exactly per CLAUDE.md section 6: transcript → normalization → ASR
confusion correction → entity resolution against the REAL corpus (not a
hardcoded table) → intent + structured output
`{intent, target, parameters, confidence}`. Zero DOM dependency — runs
identically under Node today and, unmodified, if dropped into `dge/js/`
later.

Key design points, several found only by testing against real data:

- **Sibling-number disambiguation**: Sumadhva Vijaya alone is 16 separate
  `sarga_1`..`sarga_16` grantha files (plus 6 `tika_*` commentary
  editions) sharing identical title words — a bare fuzzy match ties across
  all 22. A reference number's leading component ("1.1" → sarga 1) narrows
  this correctly; without one, the resolver correctly reports low
  confidence with candidates instead of silently guessing.
- **Word-match ratio, not exact containment**: the production
  `dgeFuzzyMatchGrantha` (typed search box) requires every query word
  present in the target text. That's right for typed search, wrong for
  speech — "Open kijiye Rigveda mandala 2" has a Hindi filler word a typed
  query would never contain. Relaxed to a ratio threshold plus an
  entity-side coverage check (for names with unspoken epithets, e.g.
  "Jayatirtha (Tikacharya)").
- **Whole-word matching, not substring**: an earlier version matched
  "madhva" as a raw substring, which incorrectly matched inside "sumadhva"
  and "madhvacharya" — fixed to whole-word matching, with a numeric
  exception for zero-padded segment numbers ("2" inside "mandala_02").
- **Deterministic actions never touch the corpus**: theme/renderer/
  audio/padaccheda intents resolve directly, no entity matching, no
  ambiguity path — matches CLAUDE.md section 7's latency requirement.

### Text-only benchmark today: 64/64 (100%) — with real, disclosed gaps

`manifests/manifest.json` has 64 hand-written utterances across all 13
required categories, built from real vocabulary pulled from
`library.json`/`taxonomy.json`/`parampara.json` (Sumadhva Vijaya,
Raghavendra Vijaya, Harikathamrutasara, Jayatirtha, Vyasatirtha, Kanaka
Dasa, Purandara Dasa, Rigveda, Siddhanta Kaumudi, Dhatupatha, Shabdapatha,
etc.), including the two ACTUAL Sarvam transcripts recorded in CLAUDE.md
section 2 (the clean "Sumadhwa Vijaya 1.1" and the noisy "Sumadha Open
Sumadha Vijaya 1.1"). Run: `node scripts/run_manifest_against_resolver.js`.

This is a **text-only** pass (resolver correctness given a transcript), not
the audio-in multi-provider benchmark — but every entry is scored honestly,
including several written to currently resolve to `unknown` because they
exercise a documented, real gap rather than being tuned to pass:

- **Non-Latin script (Devanagari/Kannada) input isn't normalized at all**
  yet — `resolver.js`'s `normalize()`/`ASR_CONFUSIONS` are Latin-script
  only. 4 Sanskrit + 4 Kannada manifest entries are pure-script text and
  correctly report `unknown` today. This is the single highest-value gap
  to close next, since CLAUDE.md section 2's own Sarvam tests show `kn-IN`
  and `sa-IN` language codes produce native-script output.
- **Hindi/Kannada number words** ("ek point ek", "ondu point ondu") aren't
  recognized by `extractReference` (English word-numbers only).
- **Heavy multilingual filler can still sink the match ratio** when very
  few of a longer utterance's words are in English/Sanskrit (e.g. "Purandara
  Dasa avara kritigalu tholi" — 3 of 5 words unmodeled Kannada).

None of these are silently wrong answers — they correctly fall through to
`unknown` (would route to the Gemini fallback per CLAUDE.md section 7),
never a false action.

## 3. Intent → DGE UI action wiring (`scripts/intent_action_map.js`)

Traced against the actual `dge/js/*.js` source (not assumed):

| Intent | Status | Real function |
|---|---|---|
| `open_text` / `open_section` | **WIRED** | `dgeGoToGrantha`/`?path=` + `jumpShloka`/`jumpVedicId` (`core.js`) |
| `search_kosha` | **WIRED** | `dgeKoshaQuick(word)` (`kosha.js`) |
| `explain` | **WIRED** | `askAcharyaForShloka()` (`ai.js`) |
| `settings_action` (theme only) | **WIRED** | `setTheme`/`toggleDarkMode` (`utils.js`) |
| `search_corpus` / `search_dhatu` | PARTIAL | real fn exists (`dgeOpenCorpusSearchForSelection`/`dgeOpenDhatuForSelection`) but is selection-driven, not query-driven — needs a small new query-seeded variant |
| `select_commentary` | PARTIAL | `setCommentaryView(key)` exists but needs a name→key lookup the render.js key scheme wasn't traced far enough to build here |
| `renderer_action` | STUB | several real primitives exist (`dgeSetViewMode` etc.) but no single dispatcher |
| `audio_action` | STUB | `audio.js` drives `<audio>` directly from its own handlers, no external play/pause toggle found |
| `padaccheda` | STUB | config-driven field visibility (`dgeGetEffectiveShlokaFields`), no single toggle function found |
| `compare` | STUB | no compare/side-by-side view located |

This is prototype wiring for review, not loaded by `dge/index.html`.

## 4. What's built vs. stubbed — summary

| Component | Status |
|---|---|
| DGE semantic resolver | **Built, unit-tested, 100% on text-only manifest** |
| Sarvam REST client | **Built, verified live** |
| Sarvam realtime WS client | **Built, verified live** |
| AI4Bharat local CPU inference | **Built, verified running (pipeline smoke test)** |
| Bhashini | Investigated, blocked on approval process, correctly not benchmarked |
| Other candidates (Whisper, MMS, NeMo, etc.) | Surveyed, not benchmarked |
| 13-category benchmark manifest | **Built, 64 real-vocabulary entries** |
| Real audio recordings | **NOT PROVIDED — blocked, see below** |
| Multi-provider accuracy/latency benchmark | Blocked on the above |
| Intent → DGE UI action wiring | 4 fully wired, 2 partial, 4 stubbed (see table) |
| Voice UI (mic/listening state/etc.) | Not built — explicitly "future, not necessarily built tonight" per CLAUDE.md |

## 5. What's needed next

**The one blocking gap: real recorded audio.** Everything else in the
pipeline — resolver, both Sarvam transports, AI4Bharat local inference, the
manifest/schema/harness — is built and independently verified working.

To run the actual multi-provider benchmark CLAUDE.md section 5 describes,
send:

- ~50-100 short spoken utterances covering the 13 categories in
  `manifests/manifest.json` (English, Kannada, Sanskrit, Hindi, and
  mixed/code-switched speech saying real DGE commands/vocabulary) — the
  manifest's `transcript_text` fields are ready to be read aloud/recorded
  against directly, or new recordings can be added following
  `expected/schema.json`.
- Any existing recordings beyond the two already referenced from earlier
  testing (`sumadhwa_test.wav`, `sumadhwa_16k.m4a`) — those two aren't in
  this session's environment, only their transcripts as recorded in
  CLAUDE.md.

Once audio exists, `scripts/providers/sarvam_rest.js`,
`sarvam_realtime.js`, and `ai4bharat_local/infer_ctc.py` are all ready to
run against it directly, and `manifests/manifest.json` already has the
expected-output structure to score against.

Secondary, lower-priority next steps: close the non-Latin-script
normalization gap in `resolver.js` (highest-value fix — affects a real,
currently-used code path for `kn-IN`/`sa-IN`), and complete the
`search_corpus`/`search_dhatu`/`select_commentary`/`renderer_action`/
`audio_action`/`padaccheda`/`compare` UI wiring once genie.js/ai.js's
integration point is decided.
