# KAMADHENU_STATUS

Updated 6 Sep 2026, 6:25 pm IST. Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 7 done → 8 (training pipeline scaffold) next

COMPLETED:
- 🟢 Phase 0 audit — `kamadhenu/KAMADHENU_AUDIT.md`
- 🟢 Phase 1 audio inventory — `kamadhenu/data/audio_inventory.csv` + `docs/AUDIO_INVENTORY.md` (2,544 files, 22.15 h)
- 🟢 Phase 2 DGE data located — `kamadhenu_dataset/metadata.jsonl` / `text_index.json`; Sāroddhāra recordings now mapped (364 of 436, grade A)
- 🟢 Phase 3 schema — `kamadhenu/data/schema/kamadhenu_schema.json`, `docs/KAMADHENU_DATASET.md`
- 🟢 Phase 4 validator — `kamadhenu/scripts/kamadhenu_validate_dataset.py` → `kamadhenu/reports/kamadhenu_dataset_report.{json,md}`
- 🟢 Phase 5 Chandas — `docs/CHANDAS_FOR_KAMADHENU.md` (DGE engine is the analysis layer; 8-akṣara sama metres fixed today)
- 🟢 Phase 6 pilot — `kamadhenu/data/pilot/{manifest,train,validation}.jsonl`: 126 grade-A examples, 0.61 h, 14 metres, reproducible (`scripts/build_pilot.py`)
- 🟢 Phase 7 model selection — `docs/MODEL_SELECTION.md`: **BASE MODEL = IndicF5 (MIT)**, Vāgdhenu as benchmark
- 🟢 Phase 15 ledger — `docs/INDEPENDENCE_FROM_VAGDHENU.md` · 🟢 Phase 18 — `docs/RECORDING_PLAN.md`
- 🟢 Phase 16 architecture decided — ZeroGPU Space (`kamadhenu_dataset/DEPLOYMENT_REFERENCE.md`), scaffold in `tools/kamadhenu/space/`

IN PROGRESS:
- 🟠 Phase 8 training pipeline (IndicF5 / F5-TTS recipe, config, loader, resume, export) — not started in code
- 🟠 Phase 13 evaluation script + HUMAN_REVIEW.csv — not started

BLOCKED:
- 🟢 Speaker decided 6 Sep 2026: **3BHU1** (the project lead), consent to train the voice given; recorded in `kamadhenu_dataset/speakers.json`, applied to every Drive-sourced file and the Narasiṃha files. Still unattributed: Sumadhva Vijaya (audio repo) and Rāghavendra Vijaya (archive.org) — confirm whether those are 3BHU1 too
- 🔴 Tīrthaprabandha recordings — Drive folders not shared
- 🔴 ZeroGPU hosting on `SarvamulaOrg` — from 6 Oct 2026; deploy needs GitHub secret `HF_TOKEN`
- 🔴 Any GPU training — none approved; none proposed yet

NEXT ACTION: Phase 8 — write the IndicF5 fine-tune configuration and data exporter (pilot → F5 metadata format, 24 kHz), dry-run on CPU (no training), then present the Experiment A cost card.

HUMAN ACTION REQUIRED:
1. Say whether the Sumadhva Vijaya and Rāghavendra Vijaya recordings are also 3BHU1.
2. Make the three untitled Drive folders + one file public (links in the chat of 6 Sep, 6:25 pm) so the Tīrthaprabandha recordings can be fetched.
3. `HF_TOKEN` secret (write token from SarvamulaOrg) for the Space deploy.
4. Listen to 2 Gītā + 2 'vsn' files (see kamadhenu_dataset/WHAT_I_NEED_TO_DO.md §A).

GPU REQUIRED: none yet. Experiment A will need one 16–24 GB GPU for roughly 1–2 hours (card to be presented for approval).
ESTIMATED COST: ₹0 GPU spent. Experiment A estimate will be given before launch (order of ₹100–300 on a rented T4/L4-class card).
