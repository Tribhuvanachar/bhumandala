# KAMADHENU_STATUS

Updated 7 Sep 2026, 10:50 pm IST. Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 12 Experiment A DONE (attempt 4, bf16, 9:56 pm IST) — the lead listens to the 13 A/B pairs; total spend ≈ ₹154 of the ₹185 cap

COMPLETED:
- 🟢 Phase 0 audit — `kamadhenu/KAMADHENU_AUDIT.md`
- 🟢 Phase 1 audio inventory — `kamadhenu/data/audio_inventory.csv` + `docs/AUDIO_INVENTORY.md` (3,892 files, 37.83 h; pairs ≥0.9: 2,530 = 11.0 h; usable now 1,721 = 6.5 h)
- 🟢 Phase 2 DGE data located — `kamadhenu_dataset/metadata.jsonl` / `text_index.json`; Sāroddhāra recordings now mapped (364 of 436, grade A)
- 🟢 Phase 3 schema — `kamadhenu/data/schema/kamadhenu_schema.json`, `docs/KAMADHENU_DATASET.md`
- 🟢 Phase 4 validator — `kamadhenu/scripts/kamadhenu_validate_dataset.py` → `kamadhenu/reports/kamadhenu_dataset_report.{json,md}`
- 🟢 Phase 5 Chandas — `docs/CHANDAS_FOR_KAMADHENU.md` (DGE engine is the analysis layer; 8-akṣara sama metres fixed today)
- 🟢 Phase 6 pilot — `kamadhenu/data/pilot/{manifest,train,validation}.jsonl`: 136 grade-A examples (126 Sāroddhāra + 10 Tīrthaprabandha), 0.65 h, all speaker 3BHU1, reproducible (`scripts/build_pilot.py`)
- 🟢 Phase 7 model selection — `docs/MODEL_SELECTION.md`: **BASE MODEL = IndicF5 (MIT)**, Vāgdhenu as benchmark
- 🟢 Phase 15 ledger — `docs/INDEPENDENCE_FROM_VAGDHENU.md` · 🟢 Phase 18 — `docs/RECORDING_PLAN.md`
- 🟢 Phase 16 architecture decided AND deployed — ZeroGPU Space live (`kamadhenu_dataset/DEPLOYMENT_REFERENCE.md`, `kamadhenu_dataset/space_measurements.json`)

IN PROGRESS:
- 🟢 **Phase 8 training pipeline scaffold — done 7 Sep 2026, 6:05 pm IST** (`kamadhenu/training/`, README there): text convention (`kamadhenu_text.py` = Vāgdhenu model_text), IndicF5 vocab (2,545, sha1-pinned), exporter to the F5 layout (24 kHz mono wavs at −3 dBFS, metadata.csv, duration.json, vocab.txt, raw.arrow), checkpoint converter both ways (safetensors ⇄ trainer `model_last.pt`), `experiment_a.yaml`, resumable wall-clock-capped launcher, A/B evaluation renderer. **CPU dry run executed on the real pilot audio** (136 files re-fetched from Drive): 123 train verses = 35.1 min, 13 held out, every character in the vocab, arrow loads, sampler simulated (24 GB: 90 batches/epoch × 34 epochs = 3,060 updates). Card: `kamadhenu/docs/EXPERIMENT_A_CARD.md`; numbers: `kamadhenu/reports/experiment_a_dry_run.json`. Not exercised here: torch/GPU (the launcher's `--dry-run` does that in the first 20 min of the budget)
- 🟠 Phase 13 evaluation script + HUMAN_REVIEW.csv — not started

BLOCKED:
- 🟢 Speaker decided 6 Sep 2026: **3BHU1** (the project lead), consent to train the voice given; every one of the 3,892 recordings is attributed to him (`kamadhenu_dataset/speakers.json`)
- 🟡 Drive, evening batch 6 Sep 2026 (+1,173 files, +15.3 h), lead's answers applied 7:00 pm IST: `smv.zip` = 1,106 pāda-level Sumadhva Vijaya takes: 34 named (30 mapped exactly) + 1,058 numbered `New recording N` **identified by local Whisper transcription + the lead's sequential-pāda rule: 909 assigned** (471 at 0.9, 149 at 0.8, 226 at 0.7, 63 interpolated at 0.6) across sargas 10, 11, 14, 16 (+ a few 15/1); **149 need one listen** (`kamadhenu_dataset/smv_takes_listen_list.csv`); 51 dated files are hour-long sessions, not takes. Overrides in `mapping_overrides.json`, evidence in `smv_takes_check.json`; Harikathāmṛtasāra 31 verses — lead confirmed plain full recitations → accepted; Gītā files are pāda-wise with some words repeated (segmentation plan); Vedavyāsa Gadya text imported (Yādavārya, 100 epithet units) → the 9.7-min file needs per-epithet segmentation; **Aṣṭādhyāyī pārāyaṇa (32 files, 3.9 h) is NOT the lead's voice → excluded**; Kṣīrābhiṣeka video ignored; the two private folders were someone else's and are dropped. Earlier gaps stand: Tīrthaprabandha only Dakṣiṇa 1–19; Nāmāvali 110 clips + video have no text in DGE
- 🟢 **Kamadhenu trials page** `dge/kamadhenu.html` (6 Sep, 8:30 pm IST): DGE chandas verdict + two engines side by side — *Kamadhenu trial* = **IndicF5 (MIT) zero-shot prompted with the lead's own recordings** (`tools/kamadhenu/space/refs/`), *Vāgdhenu baseline*. The lead's question answered honestly: the Space's first engine is Vāgdhenu's weights (built on IndicF5), nothing has been trained; the trial engine is the licensed base model in his voice. **Both engines verified live from a GitHub runner at 8:49 pm IST** (Vāgdhenu 9.6 s audio / 4–14 GPU s; IndicF5 zero-shot 11.5 s audio / 13.9 GPU s cold). IndicF5's gate was accepted for SarvamulaOrg by the deploy workflow and the Space holds `HF_TOKEN` as a secret
- 🟢 **Kamadhenu Space LIVE** 6 Sep 2026, 7:36 pm IST — https://sarvamulaorg-kamadhenu.hf.space on ZeroGPU (zero-a10g), deployed by the `Deploy — Kamadhenu Space` workflow (4th run; fixes: huggingface_hub 1.x API, README metadata length). Measured from a GitHub runner: anuṣṭubh verse 9.6 s audio, **4.3 GPU s warm (RTF 0.45)**, 23.2 GPU s on the cold first call. `appConfig.kamadhenuSpaceUrl` set; `dge/js/kamadhenu.js` loaded by the reader (no visible button yet — the "Generate this verse" UI hook is the next step). Diagnostics: `Kamadhenu Space — logs + API probe` workflow
- 🔴 Any GPU training — none approved; none proposed yet
- 🟢 **Zero-shot diagnostics run 7 Sep 2026, 1:24 pm IST** (`Kamadhenu Space — zero-shot diagnostics` workflow, run 34097773688, artifact `kamadhenu-diagnostics`; the Space now has a `/diagnose` endpoint and IndicF5's own model-card prompt clip as a diagnostic reference). Four clips, seed 60, all rendered: A IndicF5 prompt + Hindi 6.17 s (15.98 GPU s cold) · B lead's chant + Hindi 10.19 s · C IndicF5 prompt + Gītā 1.1 6.96 s · D lead's chant + Gītā 1.1 11.51 s. Measured before listening: the same Hindi sentence comes out 65 % longer from the chanted reference (10.19 vs 6.17 s) — the chant clip forces chant tempo on read speech, which is the smearing mechanism. The lead's ear decides A–D; the reading key is in the workflow header. Lead's verdict on the original trial (6 Sep): voice ~70 % similar, words unintelligible.

NEXT ACTION: the lead's verdict on the 13 A/B pairs (attempt 4). If the fine-tuned voice is closer: Phase 13 evaluation sheet, then Experiment B on the full grade-A set (6.5 h) with a fresh cost card; wire `model.wrapper.safetensors` into the Space as a third engine. If not: more data before more steps (the pilot is 35 min of audio).

HUMAN ACTION REQUIRED:
0. **Experiment A ran (approved 6:20 pm IST, cap ₹185, 24 GB).** Four HF Jobs on `l4x1` ($0.80/h): 1 pip conflict (1 min); 2 EMA
   key layout (17 min); 3 trained but fp16 diverged — loss=nan from step 1, NaN weights by step ~320, renders were noise
   (72 min ≈ ₹85); **4 (bf16) healthy**: 3,060 updates in 20.5 min (0.4 s/update), loss 0.73 → window means 0.70/0.69/0.68/0.66,
   no NaN, EMA + online weights exported in both layouts, 13 held-out A/B renders (base zero-shot vs fine-tuned, same
   reference/seed) — real audio (rms ≈ 0.2, base↔fine-tuned correlation 0.01, i.e. genuinely different). Total spend upper
   bound ≈ ₹21 + ₹85 + ₹48 = **₹154** (HF bills RUNNING minutes only). Results: `SarvamulaOrg/kamadhenu-voice-a`
   (export/model.safetensors + model.wrapper.safetensors for the Space, eval/, train.log), GitHub artifact
   `kamadhenu-experiment-a` on run 34139626712 (expires 6 Dec), records in `kamadhenu/reports/experiment_a/`.
   **Lesson**: the duration ratio is not a discriminator for F5 — it fixes the output length from the reference/text
   ratio, so base and fine-tuned are identical on it (0.86 median, 11/13 on tempo); intelligibility is the lead's ear
   (Phase 13 HUMAN_REVIEW.csv next). **Human action**: listen to `eval/<verse>/base.wav` vs `finetuned.wav` vs
   `finetuned_online.wav` for the 13 verses and say which, if any, sounds like you reading intelligible Sanskrit.
1. Where are the other Tīrthaprabandha recordings (only Dakṣiṇa 1–19 were in the shared folder)? If they exist, share that folder too.
2. The Śrīpādarāja Aṣṭottara-śatanāmāvalī text (108 names, Devanagari) — then the 110 clips map by number.
3. **Listen-list for 149 smv takes** — `kamadhenu_dataset/smv_takes_listen_list.csv`: each row gives what Whisper heard, the best guess, and the identified neighbours; fill the last column (sarga.verse.pāda or `skip`). Also spot-check a few of the 63 interpolated ones (confidence 0.6 in `smv_takes_check.json`).
4. ~~`HF_TOKEN`~~ — done by the lead 6 Sep 2026 (verified: the deploy workflow found it).
5. Listen to 2 Gītā + 2 'vsn' files (see kamadhenu_dataset/WHAT_I_NEED_TO_DO.md §A).
6. ~~two private folders~~ — not the lead's; dropped.
7. ~~HKS content~~ — plain full recitation (lead, 6 Sep); accepted.

GPU REQUIRED: none pending. Measured on the L4: 3,060 updates in 20.5 min (bf16); a full-set Experiment B would be ~10× the data → order of 3–4 GPU hours, card to follow.
ESTIMATED COST: Experiment A spent ≈ ₹154 upper bound (four HF Jobs, cap ₹185, approved). No Gemini spend.
