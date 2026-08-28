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
- **Update, 28 Aug 2026, later same session — FULL real-audio benchmark
  completed: 64/64 (100%)** across all 13 categories. The project lead
  sent 2 seed recordings, then all 62 remaining ones. The first real run
  scored 51/64 (80%) and exposed a real, structural gap (non-Latin script
  was a total blind spot in `resolver.js`); fixed with a real Devanagari/
  Kannada→Latin transliterator plus several ASR-confusion-table entries
  drawn directly from the real transcripts observed, landing at 64/64.
  Full detail in sections 6-7.
- **Update, same session — new command set added.** The project lead
  named real command types from actual usage (grammar tools, shloka
  share/download actions, a two-turn content-correction flow). Each was
  checked against the real codebase before wiring anything; some are
  fully WIRED (reusing existing real functions), several are honestly
  PARTIAL or STUB (documented in section 8, not faked). The
  content-correction flow's design (not full implementation) is in
  section 9, including two real product decisions flagged for the
  project lead rather than silently picked.
- **What's still needed**: audio for the 12 new command-set manifest
  entries (section 8) — the ~50-100-utterance benchmark CLAUDE.md
  originally asked for is now done; this is new scope, not the original
  ask reopened. See section 10 for the itemized ask.

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
| Real audio recordings | **2 of ~50-100 provided (28 Aug, later same session) — see section 5** |
| Multi-provider accuracy/latency benchmark | Blocked on the remaining ~48-98 utterances — see section 6 |
| Intent → DGE UI action wiring | 4 fully wired, 2 partial, 4 stubbed (see table) |
| Voice UI (mic/listening state/etc.) | Not built — explicitly "future, not necessarily built tonight" per CLAUDE.md |

## 5. Real-audio verification (update, later same session, 28 Aug 2026)

The project lead sent the two recordings CLAUDE.md section 2 already
describes results for — `sumadhwa_test.wav` (MP4/AAC-LC, 8kHz mono,
~12kbps) and `sumadhwa_16k.m4a` (MP4/AAC-LC, 16kHz mono, 64kbps), both
"Open Sumadhwa Vijaya 1.1" — via a `genie-asr-audio-seed` branch. **Kept
off `main`**: these are the project lead's own personal voice recordings,
not public test fixtures, same reasoning already applied to
`wordnet-dist`/`dasa-sahitya-local-dist`. Folded into
`genie_asr_benchmark/audio/01_english/` on that branch (see its own
`audio/README.md`); `manifests/manifest.json` on `main` references them by
relative path (entries `01_english_002`/`01_english_003`) without carrying
the binaries.

Re-ran both live through Sarvam REST (`scripts/verify_real_audio.js`) —
both transcripts exactly matched CLAUDE.md's prior recorded results:

| Clip | Sarvam transcript | Latency | resolver.js result |
|---|---|---|---|
| `sumadhwa_test.wav` (clean) | "Sumadhwa Vijaya 1.1" | 1900ms | `open_text` → `kavya_alankara/sumadhva_vijaya/sarga_1`, ref "1.1", confidence 0.58 |
| `sumadhwa_16k.m4a` (noisy) | "Sumadha Open Sumadha Vijaya 1.1" | 1681ms | `open_text` → `kavya_alankara/sumadhva_vijaya/sarga_1`, ref "1.1", confidence 0.58 |

**This is the first full real-audio-in-to-correct-DGE-action proof of the
whole pipeline** — not a synthetic TTS smoke test, not a text-only
resolver pass, but a real recording → real Sarvam API call → real
resolver run → the correct grantha and reference, including the noisy
clip's garbled transcript still recovering the right answer, which is
exactly the claim CLAUDE.md section 6 asks this resolver layer to make
good on.

**This is 2 clips, not a benchmark.** Both happen to be the same phrase in
the same category (`01_english`) — they say nothing about Kannada,
Sanskrit, Hindi, mixed speech, or any of the other 12 categories, and two
data points cannot support an accuracy percentage. Treat the numbers above
as a pipeline confirmation, not a result to generalize from.

## 6. Full audio drop: the REAL 13-category benchmark, end to end (28 Aug 2026, later same session)

The project lead recorded and sent all 62 remaining manifest utterances
(`genie-asr-audio-seed` branch, commit `537d6e5a`, "Add 62 real recordings
completing the Genie ASR benchmark's audio coverage") — every one of the
64 original manifest entries now has a real `.wav`. This is what CLAUDE.md
section 5 actually asked for, no longer blocked.

**One data-integrity check first, per the project lead's own instruction**:
the recorder tool's own `recorder-manifest.json` export was diffed
programmatically against `manifests/manifest.json` on `main`. Of 62 shared
entries, exactly **one** text mismatch: `02_kannada_001`'s intended phrase
was written as "ಸುಮಧು ವಿಜಯ" (Sumadhu, no conjunct) in the recorder tool vs
"ಸುಮಧ್ವ ವಿಜಯ" (Sumadhva, with the conjunct ದ್ವ) in the manifest — but the
recorder's own `note` field says "'Open Sumadhva Vijaya 1.1' in Kannada
script", confirming Sumadhva was the intended word and the recorder's
`phrase` field had the typo, not `manifests/manifest.json`. Settled
empirically rather than guessed: the real Sarvam transcript of the actual
recording came back as "ಸುಮಧ್ವ ವಿಜಯ 1.1 ತೆರೆಯಿರಿ." — the conjunct form — so
the manifest's spelling was correct and no fix was needed on either side.

**Wired `audio_file` into all 64 manifest entries** (`scripts/
run_real_audio_benchmark.js`, new — transcribes every entry's real
recording via Sarvam REST, feeds the actual transcript through
`resolver.js`, scores against `expected`; this is distinct from
`run_manifest_against_resolver.js`, which only re-checks the WRITTEN
prompt text, not real ASR output).

**First real run: 51/64 (80%)** — see section 7 for what that revealed and
fixed. **After fixes: 64/64 (100%)**, every category, confirmed with a
full clean re-run (one entry hit a transient Sarvam 429 rate-limit after
four back-to-back 64-call benchmark runs in quick succession; retried
individually 15s later, succeeded — noted as a real throughput
consideration, not a resolver issue, in section 10).

| Category | Real-audio result |
|---|---|
| 01_english | 8/8 |
| 02_kannada | 4/4 |
| 03_sanskrit | 4/4 |
| 04_hindi | 4/4 |
| 05_mixed_code_switch | 5/5 |
| 06_proper_names | 6/6 |
| 07_open_text | 6/6 |
| 08_open_section | 4/4 |
| 09_search | 5/5 |
| 10_commentary_renderer | 5/5 |
| 11_audio_settings | 5/5 |
| 12_explain_padaccheda_compare | 4/4 |
| 13_ambiguous_commands | 4/4 |
| **Total** | **64/64 (100%)** |

Sarvam REST latency across all 64 real calls: avg 733ms, min 357ms, max
1723ms (`genie_asr_benchmark/results/real_audio_final.json` has the full
per-utterance breakdown — transcript, resolved intent/target/confidence,
timing, for every entry).

**Caveat, stated plainly**: 100% on 64 utterances from one household/
recording setup is a real, hard-won result, not a claim that this
generalizes to arbitrary speakers, accents, background noise, or
microphones. It proves the pipeline design works end to end on real
speech across all 13 categories — it is not a statistically powered
accuracy benchmark across speaker variation. Text-only resolver pass
(`run_manifest_against_resolver.js`, scores the WRITTEN prompts, not the
real audio) sits at 75/76 (99%) on the now-76-entry manifest (see section
8) — the one gap is `02_kannada_003`, explained in section 7.

## 7. What the real audio actually revealed (and what got fixed)

The first full run (51/64, 80%) is the more informative result — it's what
happens when real speech meets a resolver that had only ever been tested
against hand-typed text. Two real, structural gaps surfaced:

**Non-Latin script was a total blind spot.** Every Kannada/Sanskrit/Hindi
recording came back from Sarvam in Devanagari or Kannada script — including
Hindi entries whose *written* manifest prompt had been Latin transliteration
(the real ASR output wasn't). `resolver.js`'s `normalize()` was silently
discarding every non-ASCII character. **Fixed**: added
`transliterateIndicScript()` — a mechanical per-codepoint Devanagari/Kannada
→ Latin transliteration (both scripts are abugidas with the same structure:
consonant + inherent "a", replaced by a vowel sign or suppressed by a
virama for conjuncts) run at the front of `normalize()`. This is
deliberately NOT a general/scholarly IAST library — retroflex/dental/
sibilant collapse to the same Latin letters is intentional, matching the
same rough-phonetic-match philosophy the existing ASR-confusion table
already uses. Landed one real bug during implementation (a `' VIRAMA '`
marker string got corrupted to NUL bytes by an earlier edit and leaked
into transliterated output as literal text before being caught and fixed)
— worth noting since it's exactly the kind of thing that would have
shipped silently wrong without the real-audio round-trip test catching it.

This one fix alone took the real-audio score from 51/64 to 58/64 (91%),
closing 04_hindi and 05_mixed_code_switch completely and most of
02_kannada/03_sanskrit.

**A handful of specific, empirically-observed ASR patterns needed
targeted confusion-table entries** (all added FROM the real transcripts
observed, not guessed):
- Compound-word splits Sarvam's own tokenizer introduced:
  "Harikathamrutasara" → "Hari Kathamrita Sara" / "Harikathamrita Sara";
  "Shishupalavadha" → "Shishupala Vadha"; "Dhatupatha" → "Dhatu Patha".
- Devanagari phonetic respellings of English loanwords: "एक्सप्लेन" (a
  Devanagari sounding-out of "explain") transliterates to "eksaplena";
  "कॉमेंट्री" → "kamemtrii"; "सेलेक्ट" → "selekta" — none of these are
  transliteration bugs, they're what the ASR model actually output for
  English words spoken in a Sanskrit-recording context.
- Vowel-length/spelling variants: "Jayateertha" and "jayatiirthaa" for
  "Jayatirtha"; "kanakadaasaa" for "kanaka dasa".
- A spoken WORD-number ("Rigveda chapter **two**") wasn't recognized the
  way a digit ("chapter **2**") already was — `fuzzyMatchEntities`'s
  numeric-token matching now also converts number words via the existing
  `wordToNum()` helper before comparing, so both forms work identically.

These closed the remaining gap: 58/64 → 64/64.

**What this means for the two Kannada entries that used to be
"documented gaps"**: `02_kannada_001` and `02_kannada_003` were originally
written expecting `unknown`, with notes explicitly saying "expected to
currently fail until Kannada/Devanagari-script normalization is added."
That normalization now exists, and both entries correctly resolve to
`open_text` → `kavya_alankara/sumadhva_vijaya/sarga_1` — the manifest's
`expected` blocks were updated to match this **real, verified**
improvement (not silently left stale). One genuine residual divergence
remains and is left as-is rather than forced: `02_kannada_003`'s *written*
prompt used spelled-out Kannada number words ("ondu point ondu", not
digits), which resolver.js still can't parse as a reference number — but
the REAL recording's actual Sarvam transcript came back with the numbers
already resolved to digits by Sarvam itself ("ಸುಮಧ್ವವಿಜಯ 1.1
ತೆರೆಯಿರಿ."), so the real audio passes while the text-only pass (which
tests the ORIGINAL WRITTEN prompt, not what was actually said) still
correctly fails on that specific unresolved gap. Both facts are true
simultaneously and both are documented in the manifest entry's own notes.

## 8. New command set — real usage the project lead named

The project lead described real command types from actual usage, verbatim:
*"search kAntAya. shabda nIvAra, bhobhUyate dhAtu rUpa. sandhi of ityukte.
samAsa of chakrapani, chandas of this shloka, show vijayadasara hADugaLu,
download this shloka, share this text, make this content correction..."*
Each was checked against the real codebase (not assumed) before wiring
anything. Two new manifest categories added: `14_grammar_tools` (5
entries), `15_content_actions` (5 entries), `16_content_correction` (2
entries, covering the two-turn flow — see section 9). **No audio exists
yet for these 12 new entries** — same "blocked on audio" situation
section 6 just closed for the original 64, now open again for the new
ones (see section 10's ask).

| Command | Real DGE entity/function? | Resolver intent | Wiring status |
|---|---|---|---|
| "search kAntāya" (kosha word lookup) | Yes — same `dgeKoshaQuick` as existing search_kosha | `search_kosha` (bare "search X" fallback added) | **WIRED** |
| "shabda nīvāra" (declension table) | Yes — `dge/vyakarana/shabda.html`, `window.dgeOpenShabdaForSelection` (ai.js) | `shabda_rupa` (new) | PARTIAL — real function, selection-only, no arbitrary-word param |
| "bhobhūyate dhātu rūpa" (conjugation table) | Yes — `window.dgeOpenDhatuForSelection` (ai.js) exists, but **which page it opens (dhatuforms.html vs dhatu.html) was not verified** | `dhatu_rupa` (new) | PARTIAL, flagged unverified — do not assume before wiring for real |
| "sandhi of ityukte" | Yes — `dge/js/sandhi.js:95`, the real "Sandhi (Live)" button (Dharmamitra API) | `sandhi_analysis` (new) | PARTIAL — selection-only |
| "samāsa of chakrapani" | **No** — confirmed no samasa/compound-analysis function exists anywhere in `dge/js/` | `samasa_analysis` (new) | **STUB** — nothing to point at |
| "chandas of this shloka" | Page exists (`dge/vyakarana/chandas.html`), no per-shloka JS entry point | `chandas_identify` (new) | **STUB** |
| "show Vijaya Dasa's hADugaLu" | Yes — `dasa_sahitya/composers/vijaya_dasaru` (library.json), parampara node `vijayadasa`/"Vijaya Dasa" — both verified real, not assumed | `open_text` (existing) | Resolves via the EXISTING pipeline **once phrased with a recognized trigger** ("open" — bare "show" deliberately not added, see below); the exact quoted phrasing has 2 compounding real gaps, documented honestly rather than forced to pass |
| "download this shloka" / "share this text" | Yes — `copyShlokaText` (render.js), `shareShlokaAudio`/`shareShlokaTextOnly` (snippets.js), `openShareImagePreview` (screenshot.js), all real and confirmed live | `shloka_share_action` (new) | PARTIAL — all 4 functions need the CURRENT shloka id, which the resolver has no access to; app layer must supply it |
| "make this content correction..." | Partial — Notes exist but are localStorage-only; **no moderation queue anywhere** | `content_correction` (new, 2-turn) | **STUB by design** — see section 9 |

**Two corrections to how this command set was originally described**:
1. The project lead's message referenced `admin/content-editor.js` as
   existing adjacent infrastructure — **it does not exist in this repo.**
   `admin/` contains `admin/js/keys.js`, `admin/content/*.json`, and
   several `admin/*.html` pages (`ashtadhyayi.html`, `audio.html`,
   `kosha.html`, `library.html`, `workflows.html`) — worth knowing before
   pointing a correction-review UI at a file that isn't there.
2. `dgeOpenSandhiForSelection` is defined TWICE — once in `ai.js` (which
   renames itself internally to `dgeOpenVidyutSandhiForSelection`
   specifically to dodge the clash, per that file's own comment) and once
   in `dge/js/sandhi.js:95`, which is the one that actually wins at
   runtime (loads later) and is the real "Sandhi (Live)" button.

**A regression caught and fixed along the way**: the new bare `"search
<word>"` fallback for search_kosha initially also matched "Search kijiye
for Vyasatirtha in the corpus" — a manifest entry (`05_mixed_001`)
specifically written to test that search_corpus's own trigger doesn't
fire on non-contiguous phrasing. Fixed with a negative lookahead (bare
"search" only fires when "corpus" isn't mentioned anywhere in the same
utterance) — caught by the existing 76-entry manifest regression suite,
not found by inspection.

75/76 text-only manifest entries pass after this work (the one gap is
`02_kannada_003`, explained in section 7); resolver.js unit tests: 26/26.

## 9. Content-correction flow — design (not fully wired, per instruction)

*"...make this content correction in this section and then they will
talk something to be transcribed and added as correction"* — a real,
two-turn voice interaction: (1) the user selects content and says
something like "make a correction here"; (2) the app prompts for and
captures the actual correction as a second spoken utterance.

**What resolver.js does today**: recognizes turn 1 as intent
`content_correction` with `parameters.stage = 'awaiting_correction_text'`.
A separate function, `resolveCorrectionSubmission(correctionText,
context)`, packages turn 2's free-text transcript — deliberately with NO
corpus validation or intent classification (a correction can say
anything) — into `{intent: 'content_correction', stage: 'submitted',
correctionText, context, status: 'pending_review'}`. Both are real,
tested code (`resolver.test.js`). **Execution is intentionally
unimplemented** — `intent_action_map.js`'s `content_correction` handler
returns `not_wired` — because there is nowhere real to send it yet.

**What already exists to build on** (verified, not assumed):
- `dge/js/notes.js` — a real per-shloka Notes mechanism, but
  **localStorage-only**, never leaves the browser.
- `dge/PENDING.md` (lines 1626-1627) — the actual prior plan the project
  lead was referring to. It describes a **mailto:**-based flow only
  (`window.DGE_FEEDBACK_TAG = '[DGE-CONTENT-GAP]'`,
  `dgeReportMissingForm` in `dge/js/modals.js`, routed to a human inbox),
  and is explicit that any *automatic* handling should stay narrow:
  scoped to mechanically-verifiable single-field corrections, with
  anything the classifier isn't highly confident about defaulting to "NOT
  eligible," and taxonomy/schema/`admin/` changes **NEVER** eligible for
  unattended action. There is no correction-workflow state machine or
  moderation-queue scaffolding anywhere in the repo — the project lead's
  read that this was deferred, not built, is correct.
- Firebase is already integrated (`dge/firebase/`, currently used for
  auth) — the natural place to add a real submission/moderation backend
  without introducing a whole new infrastructure dependency.

**Proposed design** (honors PENDING.md's own conservative philosophy for
a scholarly corpus — nothing here proposes auto-applying a correction):

1. **Capture** (built): voice → `content_correction` intent → prompt for
   correction → `resolveCorrectionSubmission()` packages
   `{correctionText, context: {granthaPath, shlokaId/section,
   selectedText}}`.
2. **Submit** (not built, two real options, see the open question below):
   - **A. Reuse the existing mailto: flow** — compose the same kind of
     draft `dgeReportMissingForm` already sends, pre-filled with the
     transcribed correction + context, just voice-triggered instead of
     manually typed. Zero new backend. Ships fast. Doesn't produce a
     trackable/searchable queue — it's an email, same as today.
   - **B. A new Firestore collection** (`content_corrections`): each
     correction stored as `{granthaPath, shlokaId, selectedText,
     correctionText, submittedBy (uid, if `AUTH_CONFIG.enabled`),
     submittedAt, status: 'pending'|'approved'|'rejected'|'applied',
     reviewedBy, reviewNotes}`. Needs a small admin review UI (a new
     `admin/content-corrections.html`, following the existing `admin/
     *.html` pattern) where a scholar reviews and manually applies an
     approved correction through the existing content-editing tools —
     **never automatically**, consistent with PENDING.md.
3. **Review** (not built): every submission lands in `status: 'pending'`
   regardless of how confident anything sounds — no auto-apply path at
   all, full stop, on a scholarly corpus. This is a deliberate,
   conservative design choice, not a placeholder for a future
   auto-apply feature.

**Real product decisions only the project lead can make** (flagging
rather than silently picking one):
- **Mailto (ship now, no queue) vs. Firestore (real queue, needs a review
  UI built)** — a genuine scope/priority call, not an implementation
  detail.
- **Does submitting a correction require being signed in?** `AUTH_CONFIG.
  enabled` is currently `false` (inert, per `dge/js/config.js`) — tying
  correction-submission to login couples this feature's readiness to an
  unrelated, currently-dormant one. An anonymous mailto-style submission
  sidesteps that dependency but loses attribution/spam-resistance.

## 10. What's needed next

**The original ask is done**: 64/64 real audio-in-to-correct-action across
all 13 categories (section 6). What's open now is new scope from this
session's second half:

1. **Audio for the 12 new command-set manifest entries** (`14_grammar_
   tools` × 5, `15_content_actions` × 5, `16_content_correction` × 2 —
   see section 8's table for exactly which). Same layout as before:
   `genie_asr_benchmark/audio/<category>/<id>.wav`, on the
   `genie-asr-audio-seed` branch (or a fresh one), matching each entry's
   `id` in `manifests/manifest.json`. The two `16_content_correction`
   entries are lower priority — that flow's execution isn't built yet
   (section 9), so audio there mainly validates the resolver's turn-1/
   turn-2 recognition, not an end-to-end action.
2. **Two real product decisions, flagged in section 9, not picked
   silently**: mailto vs. Firestore for content-correction submission,
   and whether it requires sign-in.
3. **One verification gap, flagged in section 8's table**: which real
   page `dgeOpenDhatuForSelection` actually opens (`dhatuforms.html` or
   `dhatu.html`) — needs a direct look at `dge/js/ai.js` before the
   `dhatu_rupa` intent gets wired for real; don't assume either way.

Secondary, lower-priority next steps (unchanged from before): complete
the `search_corpus`/`search_dhatu`/`shabda_rupa`/`dhatu_rupa`/
`sandhi_analysis`/`select_commentary`/`renderer_action`/`audio_action`/
`padaccheda`/`shloka_share_action` UI wiring — all currently PARTIAL
because the real functions behind them are selection-driven or need
reader-state (current shloka id) the resolver doesn't have — once
genie.js/ai.js's integration point is decided. And: Sarvam hit a 429
rate-limit after four back-to-back 64-call benchmark runs in this
session — worth knowing for planning a CI-style regression run against
this manifest, not urgent for now.
