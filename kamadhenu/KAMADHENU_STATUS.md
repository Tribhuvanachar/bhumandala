# KAMADHENU_STATUS

Updated 6 Sep 2026, 7:05 pm IST. Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 7 done → 8 (training pipeline scaffold) next

COMPLETED:
- 🟢 Phase 0 audit — `kamadhenu/KAMADHENU_AUDIT.md`
- 🟢 Phase 1 audio inventory — `kamadhenu/data/audio_inventory.csv` + `docs/AUDIO_INVENTORY.md` (2,544 files, 22.15 h)
- 🟢 Phase 2 DGE data located — `kamadhenu_dataset/metadata.jsonl` / `text_index.json`; Sāroddhāra recordings now mapped (364 of 436, grade A)
- 🟢 Phase 3 schema — `kamadhenu/data/schema/kamadhenu_schema.json`, `docs/KAMADHENU_DATASET.md`
- 🟢 Phase 4 validator — `kamadhenu/scripts/kamadhenu_validate_dataset.py` → `kamadhenu/reports/kamadhenu_dataset_report.{json,md}`
- 🟢 Phase 5 Chandas — `docs/CHANDAS_FOR_KAMADHENU.md` (DGE engine is the analysis layer; 8-akṣara sama metres fixed today)
- 🟢 Phase 6 pilot — `kamadhenu/data/pilot/{manifest,train,validation}.jsonl`: 136 grade-A examples (126 Sāroddhāra + 10 Tīrthaprabandha), 0.65 h, all speaker 3BHU1, reproducible (`scripts/build_pilot.py`)
- 🟢 Phase 7 model selection — `docs/MODEL_SELECTION.md`: **BASE MODEL = IndicF5 (MIT)**, Vāgdhenu as benchmark
- 🟢 Phase 15 ledger — `docs/INDEPENDENCE_FROM_VAGDHENU.md` · 🟢 Phase 18 — `docs/RECORDING_PLAN.md`
- 🟢 Phase 16 architecture decided — ZeroGPU Space (`kamadhenu_dataset/DEPLOYMENT_REFERENCE.md`), scaffold in `tools/kamadhenu/space/`

IN PROGRESS:
- 🟠 Phase 8 training pipeline (IndicF5 / F5-TTS recipe, config, loader, resume, export) — not started in code
- 🟠 Phase 13 evaluation script + HUMAN_REVIEW.csv — not started

BLOCKED:
- 🟢 Speaker decided 6 Sep 2026: **3BHU1** (the project lead), consent to train the voice given; every one of the 2,719 recordings is now attributed to him (`kamadhenu_dataset/speakers.json`)
- 🟡 Drive folders shared and fetched 6 Sep 2026 (+175 files): Tīrthaprabandha has only 19 verse recordings (Dakṣiṇa-prabandha 1–19), not the ~287 expected; Prahlāda-stuti 43 verses (Bhāgavata 7.9.8–50) mapped; Śrīpādarāja Aṣṭottara-śatanāmāvalī 110 clips have no text in DGE yet; the single Drive file still fails (Google virus-scan page)
- 🔴 ZeroGPU hosting on `SarvamulaOrg` — from 6 Oct 2026; deploy needs GitHub secret `HF_TOKEN`
- 🔴 Any GPU training — none approved; none proposed yet

NEXT ACTION: Phase 8 — write the IndicF5 fine-tune configuration and data exporter (pilot → F5 metadata format, 24 kHz), dry-run on CPU (no training), then present the Experiment A cost card.

HUMAN ACTION REQUIRED:
1. Where are the other Tīrthaprabandha recordings (only Dakṣiṇa 1–19 were in the shared folder)? If they exist, share that folder too.
2. The Śrīpādarāja Aṣṭottara-śatanāmāvalī text (108 names, Devanagari) — then the 110 clips map by number.
3. What is the single Drive file `1aTBp56…`? Google serves a confirmation page instead of the file; upload it into `kamadhenu_dataset/incoming_audio/single_files/` or tell me its name.
4. `HF_TOKEN` secret (write token from SarvamulaOrg) for the Space deploy.
5. Listen to 2 Gītā + 2 'vsn' files (see kamadhenu_dataset/WHAT_I_NEED_TO_DO.md §A).

GPU REQUIRED: none yet. Experiment A will need one 16–24 GB GPU for roughly 1–2 hours (card to be presented for approval).
ESTIMATED COST: ₹0 GPU spent. Experiment A estimate will be given before launch (order of ₹100–300 on a rented T4/L4-class card).
