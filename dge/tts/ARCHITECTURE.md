# DGE Sanskrit TTS & Chanting Architecture

**Version 1.1 — 10 August 2026** (supersedes v1.0: adds §22-30, the Bhāgavata-Vāṇi
APK vs. Vāgdhenu separation-of-responsibilities analysis)

> **Status: planning document, not yet implemented.** Stored here for when TTS/chanting
> work actually starts. No code in `dge/` currently reads or depends on anything in this
> file. The v1.0 `.docx` this was originally generated from sits alongside it in this
> folder (`DGE_Sanskrit_TTS_Architecture_V1.docx`) for reference; this file has since
> been updated to v1.1's content, which is a superset of v1.0 (§1-21 unchanged, §22-30 new).

Architecture inspired by Bhāgavata-Vāṇi / Vāgdhenu and extended for classical Sanskrit, vṛtta/chandas and Vedic svara.

## 1. Executive recommendation
- Do not treat this as ordinary Sanskrit TTS. Build a Sanskrit recitation engine with separate linguistic, metrical, prosodic and acoustic layers.
- Use a modern flow-matching TTS backbone such as IndicF5/F5-TTS as the first baseline.
- Keep voice identity separate from chant style; the same voice should render multiple vṛttas and recitation styles.
- Do not treat Vedic svaras as a minor extension to classical chant. Build a dedicated Vedic accent/prosody track.
- Pre-generate production audio in batch; the website/app should normally serve finished audio plus timing metadata.

## 2. Reference architecture
```text
DGE MASTER CORPUS
       |
       v
Sanskrit frontend -> Akṣara/phonology
       |                    |
       +--> Chandas engine -> Classical prosody plan
       |                    |
       +--> Vedic annotation -> Vedic svara/pitch plan
                            |
                            v
                 Voice/style conditioning
                            |
                            v
                  Flow-matching TTS
                            |
                            v
                     Neural vocoder
                            |
                            v
                  WAV master -> QC -> M4A/AAC
                            |
                            v
                     Object storage/CDN
                            |
                            v
                       DGE player
```

## 3. What to learn from Bhāgavata-Vāṇi / Vāgdhenu
- Separate canonical text/metadata from large audio assets.
- Use a Sanskrit-aware frontend rather than raw Devanāgarī input to a generic TTS tokenizer.
- Make meter a first-class input/metadata layer.
- Use reference recordings to establish chant prosody where appropriate.
- Keep timing metadata separate from audio so karaoke/highlighting can evolve independently.
- Pre-render large corpora rather than running TTS on every user playback.
- Vāgdhenu is classical Sanskrit chant and explicitly has no Vedic svara support; DGE must extend the architecture for Vedic work.

## 4. Four DGE modes
- Mode A — Plain Sanskrit: faithful spoken Sanskrit.
- Mode B — Classical Pārāyaṇa: vṛtta-aware pacing, pauses, elongation and cadence.
- Mode C — Corpus/tradition-specific recitation: style profiles for individual śāstric/scriptural traditions.
- Mode D — Vedic recitation: udātta, anudātta, svarita, dīrgha-svarita and tradition-specific accent behavior.

## 5. Sanskrit linguistic frontend
- Unicode normalization and script detection.
- Canonical internal representation independent of display script.
- Akṣara/syllable segmentation with correct conjunct handling.
- Vowel quantity: hrasva/dīrgha/pluta where applicable.
- Keep aspirates, retroflexes and the three sibilants distinct.
- Homorganic anusvāra handling as a configurable pronunciation rule.
- Visarga handling including jihvāmūlīya/upadhmānīya where the tradition requires it.
- Sandhi-aware pronunciation layer; preserve original text separately from normalized pronunciation.

## 6. Chandas / vṛtta engine
- Parse each pāda into syllables.
- Classify laghu/guru using Sanskrit quantity and positional rules.
- Match against a versioned meter registry.
- Store confidence and alternative meter candidates.
- Represent pāda, ardha and full-verse boundaries.
- Store yati/caesura positions.
- Maintain a reference bank by meter, style, tempo and speaker.
- Permit corpus-specific overrides.

## 7. Suggested first meter bank
- Anuṣṭubh/Śloka — highest priority.
- Triṣṭubh and Jagatī — longer pādas.
- Gāyatrī-family forms — short structured pādas.
- Vasantatilakā — long ornate classical vṛtta.
- Śārdūlavikrīḍita — long complex pāda.
- Mandākrāntā — distinctive cadence.
- Indravajrā / Upendravajrā — closely related pair.
- Mālinī / Śikhariṇī — additional rhythmic diversity.

## 8. Vedic svara architecture
- Use an internal accent alphabet independent of display marks: UDĀTTA, ANUDĀTTA, SVARITA, DĪRGHA-SVARITA and any additional tradition-specific labels.
- Annotate accents at syllable/akṣara level and, where required, sub-syllabic timing.
- Store pitch trajectory, relative pitch range, onset/peak/fall/rise, duration and neighboring-accent context.
- Store śākhā, pāṭha type and recitation tradition as mandatory metadata.
- Do not assume one universal Vedic melody. Target a specified śākhā/tradition.
- Use expert-labeled recordings and independent expert review.

## 9. Vedic acoustic representation
- Phone/akṣara sequence.
- Syllable duration.
- Pitch/F0 contour or normalized pitch trajectory.
- Accent class.
- Phrase/pāda boundary.
- Breath/yati position.
- Local tempo.
- Voice identity embedding.

## 10. User voice cloning
- Record the user's own voice in a quiet, controlled room.
- Keep 48 kHz/24-bit WAV masters and derive training files.
- Record multiple sessions/days to avoid learning room/microphone artifacts.
- Record the same phonetic material across several meters and tempos.
- Keep voice identity and prosody references separate.
- Only use voices for which the speaker has appropriate rights.

## 11. Recording protocol
- 48 kHz/24-bit WAV masters; derive 24 kHz mono training audio if required by the backbone.
- Fixed microphone geometry and gain; low noise floor.
- No background tanpura/drone in the recorded waveform unless intentionally designed into the model.
- Use tradition-appropriate breath groups and daṇḍa/yati pauses.
- Exact transcript for every clip.
- Annotate meter, syllable count, pāda boundaries, yati, tempo, session and take.
- Keep rejected takes with QC status for auditability.

## 12. Dataset schema
- clip_id; text_original; text_normalized; script; phonetic_repr; meter_id; pada_structure; syllable_count; laghu_guru; yati; vedic_accent; pitch_track; duration_track; speaker_id; style_id; session_id; take_id; qc_status.

## 13. Training stages
- Stage 0 — Baseline IndicF5/F5-TTS inference.
- Stage 1 — Sanskrit frontend and pronunciation normalization.
- Stage 2 — User voice adaptation.
- Stage 3 — Classical chant / meter conditioning.
- Stage 4 — Explicit duration, pause, tempo and prosody control.
- Stage 5 — Vedic accent/pitch research.
- Stage 6 — Batch rendering, QC and production deployment.

## 14. Why not train from scratch initially?
- A 300M+ parameter TTS backbone is much more expensive to train from zero than to adapt.
- DGE's differentiator is Sanskrit phonology, chandas, Vedic prosody, data quality and tradition-aware controls.
- Only move toward a custom backbone after experiments show that the baseline cannot represent required Vedic pitch/duration behavior.

## 15. Audio delivery
- Keep WAV masters privately for archival/QC.
- Generate normalized production audio.
- Use M4A/AAC for broad mobile delivery; optionally Opus for web.
- Object layout: /work/section/chapter/verse/audio_version.m4a.
- Store object keys and metadata in the DB, not audio binaries.
- Cache recently played audio locally.
- Version audio independently from text and timing.

## 16. Karaoke/timing layer
```text
{
  "audio_id": "dge.work.04.04.01.v1",
  "unit": "akshara",
  "segments": [
    {"start": 0.00, "end": 0.42, "text": "ए"},
    {"start": 0.42, "end": 0.91, "text": "ता"}
  ]
}
```

## 17. DGE database model
- works(id, title, edition, tradition)
- sections(id, work_id, book/skandha, chapter/adhyaya)
- verses(id, section_id, verse_no, text_original, text_normalized, meter_id)
- meters(id, name, family, pattern, rules_version)
- prosody_profiles(id, tradition, meter_id, style_id)
- audio_assets(id, verse_id, voice_id, style_id, object_key, format, duration, version)
- timings(id, audio_id, unit_type, payload, version)
- voices(id, owner, model_version, license)
- vedic_annotations(id, verse_id, shakha, patha, accent_payload, pitch_payload, version)

## 18. Quality control
- Text QC against canonical source.
- Automatic meter and laghu/guru validation.
- Sanskrit pronunciation checks.
- Audio clipping/noise/truncation checks.
- Prosody checks for pāda timing, yati and daṇḍa pauses.
- Expert Vedic QC; automated metrics are advisory.
- Maintain a fixed golden test set covering difficult conjuncts, visarga, anusvāra, long vowels, rare meters and all Vedic accent classes.

## 19. MVP plan
- MVP-1: canonical Sanskrit corpus and metadata DB.
- MVP-2: 60–120 minutes of clean own-voice Sanskrit recordings.
- MVP-3: baseline IndicF5/F5-TTS voice adaptation.
- MVP-4: deterministic Sanskrit frontend.
- MVP-5: reference bank for about 8 representative classical meters.
- MVP-6: meter-conditioned classical chant.
- MVP-7: 100–500 verse pilot with expert QC.
- MVP-8: one tightly scoped Vedic śākhā/pāṭha pilot before scaling Vedic coverage.

## 20. Critical principle
- Keep CHANDAS/METRE and VEDIC ACCENT/RECITATION as two orthogonal annotation axes. A verse may have both, but neither should overwrite the other.
- Do not begin by training every meter and every Vedic svara. Prove one controlled classical pipeline first, then add one Vedic tradition with expert-reviewed data.

## 21. References
- Vāgdhenu: https://prathosh.in/vagdhenu/
- Technical report: https://prathosh.in/vagdhenu/vagdhenu_paper.pdf
- Model weights: https://huggingface.co/prathoshap/vagdhenu
- Dataset: https://huggingface.co/datasets/prathoshap/vagdhenu-data
- Vāgbodhinī: https://prathosh.in/vagbodhini/


## 22. Bhāgavata-Vāṇi APK vs. Vāgdhenu TTS — separation of responsibilities

The investigation of the Bhāgavata-Vāṇi APK and its `classes.dex` leads to an important architectural conclusion: the Android application is the **content/player/distribution layer**, while Vāgdhenu is the **audio-generation layer**. The TTS model weights are not embedded in the Bhāgavata-Vāṇi APK.

### 22.1 What belongs to the Bhāgavata-Vāṇi app

```text
Bhāgavata-Vāṇi
│
├── Android/Capacitor application code
│     └── classes.dex
│
├── Local content database
│     └── bhagavatam.db
│
├── Application/UI logic
│
├── Audio URL / download / playback logic
│
└── Optional local audio cache
```

The local database is the content source used by the application. It contains verse text and metadata such as section/verse identity, audio identifiers and timing information. Large audio assets are separate from the APK and can be downloaded/cached for playback.

### 22.2 What belongs to Vāgdhenu

Vāgdhenu is a separate Sanskrit chant TTS system. Its current public model is based on AI4Bharat IndicF5/F5-TTS with a flow-matching DiT and a fine-tuned BigVGAN-v2 vocoder. The public model repository contains approximately 3.15 GB of weights: two approximately 1.35 GB voice-model files plus a roughly 450 MB vocoder. The base IndicF5 components are obtained separately. citeturn0search0turn0search1

The released Vāgdhenu system is explicitly intended for classical Sanskrit chant/pārāyaṇa and **does not support Vedic svaras**. Its prosody is reference-driven rather than an arbitrary pitch/duration controller. citeturn0search0

### 22.3 End-to-end relationship

```text
                  VĀGDHENU / DGE TTS PIPELINE
                           │
        Sanskrit + meter + prosody/reference
                           │
                           ▼
                     TTS inference
                           │
                           ▼
                       WAV master
                           │
                         QC
                           │
                           ▼
                     M4A / AAC
                           │
                           ▼
                 Object storage / CDN
                           │
                           ▼
                  BHĀGAVATA-VĀṆI
                           │
                    stream/download
                           │
                           ▼
                       playback
```

Therefore DGE should **not** put a multi-gigabyte TTS model inside its Android/web application. The model belongs in a separate training/inference environment; the application should consume generated audio.

## 23. What DGE should do differently

DGE should preserve the good separation demonstrated by Bhāgavata-Vāṇi while extending it substantially.

### Layer 1 — Sanskrit knowledge

```text
Canonical text
   ↓
Unicode normalization
   ↓
Sandhi/pronunciation rules
   ↓
Akṣara segmentation
   ↓
Phonological representation
```

### Layer 2 — Chandas

```text
Akṣaras
   ↓
Laghu / Guru
   ↓
Syllable count
   ↓
Vṛtta / chandas detection
   ↓
Pāda boundaries
   ↓
Yati / cadence
```

### Layer 3 — Vedic

```text
Akṣara
   ↓
Udātta / Anudātta / Svarita / Dīrgha-svarita
   ↓
Pitch contour
   ↓
Duration
   ↓
Tradition / śākhā / pāṭha rules
```

### Layer 4 — Voice

```text
Prosody plan + voice identity
              ↓
             TTS
```

### Layer 5 — Audio

```text
TTS
 ↓
Vocoder
 ↓
WAV master
 ↓
QC
 ↓
M4A/AAC
 ↓
Object storage/CDN
```

This keeps the TTS model independent from DGE's corpus, website and Android application.

## 24. DGE should not make the TTS model responsible for everything

The neural model should **not** be expected to infer all Sanskrit knowledge from raw Devanāgarī.

The following should be deterministic or explicitly annotated before inference:

- Sanskrit normalization
- Akṣara/syllable segmentation
- pronunciation
- vowel quantity
- visarga/anusvāra behavior
- laghu/guru
- meter identification
- pāda boundaries
- yati
- Vedic accent labels
- Vedic pitch/duration targets where available

The model should primarily learn the mapping from these linguistic/prosodic controls to the desired acoustic realization.

## 25. Vedic support must be a separate research track

Vāgdhenu's public model card explicitly states that it is for classical Sanskrit chant and has no Vedic-svara support. citeturn0search0

Therefore DGE should not attempt to obtain Vedic recitation simply by adding accent marks to classical TTS input.

For Vedic work, create a dedicated dataset with:

```text
text
+
śākhā
+
pāṭha type
+
accent per akṣara
+
pitch/F0 contour
+
duration
+
pāda/boundary information
+
speaker/tradition
```

A recent research direction on Rigvedic accent placement also demonstrates the importance of Unicode-safe, accent-aware representations and separate evaluation of accent errors. citeturn0academia23

The eventual Vedic engine should therefore be **tradition-specific**, rather than claiming to produce a universal "Vedic voice".

## 26. DGE voice-cloning strategy

DGE should first build a dedicated voice-adaptation dataset using the user's own recordings.

Recommended approach:

1. Record clean Sanskrit speech/chant in a controlled environment.
2. Keep lossless WAV masters.
3. Record multiple sessions rather than one very long session.
4. Cover Sanskrit phonetic combinations systematically.
5. Record the same voice across multiple classical meters.
6. Keep voice identity separate from meter/style references.
7. Fine-tune an established backbone before considering training a new backbone from scratch.
8. Maintain explicit model versions and evaluation sets.

The Vāgdhenu corpus demonstrates that a relatively small, carefully curated single-speaker Sanskrit chant dataset can be useful for specialization; its public dataset is licensed CC-BY-4.0. citeturn0search4

## 27. DGE should add an ASR/recitation-verification layer

A powerful future extension is:

```text
Correct canonical verse
        ↓
DGE TTS reference
        ↓
Student/user recitation
        ↓
Sanskrit ASR
        ↓
Akṣara/word alignment
        ↓
Compare:
  pronunciation
  omissions
  additions
  timing
  meter
  Vedic accent
        ↓
Feedback
```

This is inspired by the broader Sanskrit speech-recognition direction: Sanskrit ASR benefits from language-specific units and phonetic/graphemic representations rather than treating Sanskrit as generic text. A published Sanskrit ASR study released a 78-hour corpus and found advantages from Sanskrit-specific modelling units. citeturn0academia22

## 28. Recommended DGE deployment architecture

```text
                         DGE MASTER CORPUS
                                │
                                ▼
                       Sanskrit/Metadata DB
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
         Sanskrit FE       CHANDAS ENGINE    VEDIC ENGINE
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                         PROSODY PLAN
                                │
                                ▼
                       YOUR VOICE MODEL
                                │
                                ▼
                         TTS + VOCODER
                                │
                                ▼
                          WAV / QC
                                │
                                ▼
                           M4A / AAC
                                │
                                ▼
                       Object Storage/CDN
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 DGE Web                 DGE Android
                    │                       │
                    └───────────┬───────────┘
                                ▼
                          Audio playback
                                │
                       Timing/karaoke layer
```

The AI infrastructure and application infrastructure should therefore be independently scalable.

## 29. Recommended development order

### Phase A — Reproduce the classical architecture

- Set up IndicF5/F5-TTS and Vāgdhenu as a reference baseline.
- Run inference on Sanskrit verses.
- Study its input/reference/meter mechanism.
- Build the DGE Sanskrit frontend.
- Build a small meter registry.
- Produce a small test corpus.

### Phase B — DGE's own voice

- Record 1–2 hours of carefully controlled Sanskrit voice material.
- Adapt the voice.
- Test pronunciation separately from prosody.
- Add 8–10 representative classical meters.
- Build meter-specific reference recordings.
- Generate a 100–500 verse pilot.

### Phase C — Production architecture

- Canonical DGE text database.
- Audio asset generation pipeline.
- Object storage/CDN.
- Versioned audio IDs.
- Timing metadata.
- Web/Android player.
- Offline cache.

### Phase D — Vedic research

- Choose one śākhā.
- Choose one pāṭha type.
- Obtain/record expert-approved material.
- Build explicit accent/pitch/duration annotations.
- Train/evaluate a Vedic prosody controller.
- Expand only after expert validation.

## 30. Final principle

**DGE should copy the architectural separation, not merely copy the Vāgdhenu model.**

The long-term DGE platform should be:

```text
                    SANSKRIT KNOWLEDGE
                           +
                      CHANDAS
                           +
                  VEDIC RECITATION
                           +
                    YOUR VOICE
                           ↓
                    DGE TTS ENGINE
                           ↓
                    AUDIO LIBRARY
                           ↓
                    DGE APPLICATION
```

The application should remain lightweight. The expensive AI work happens offline/in the TTS infrastructure; the resulting audio becomes a reusable digital asset.
