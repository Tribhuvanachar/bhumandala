# DGE Sanskrit TTS & Chanting Architecture

**Version 1.0 — 10 August 2026**

> **Status: planning document, not yet implemented.** Stored here for when TTS/chanting
> work actually starts. No code in `dge/` currently reads or depends on anything in this
> file. The original `.docx` this was generated from sits alongside it in this folder
> (`DGE_Sanskrit_TTS_Architecture_V1.docx`) for reference.

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
