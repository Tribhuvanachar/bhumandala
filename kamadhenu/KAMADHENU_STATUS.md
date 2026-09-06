# KAMADHENU_STATUS

Updated 6 Sep 2026, 5:50 pm IST (the previous version was mis-stamped 7:05 pm). Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 7 done → 8 (training pipeline scaffold) next

COMPLETED:
- 🟢 Phase 0 audit — `kamadhenu/KAMADHENU_AUDIT.md`
- 🟢 Phase 1 audio inventory — `kamadhenu/data/audio_inventory.csv` + `docs/AUDIO_INVENTORY.md` (3,892 files, 37.83 h after the 6 Sep evening Drive batch)
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
- 🟢 Speaker decided 6 Sep 2026: **3BHU1** (the project lead), consent to train the voice given; every one of the 3,892 recordings is attributed to him (`kamadhenu_dataset/speakers.json`)
- 🟡 Drive, evening batch 6 Sep 2026 (+1,173 files, +15.3 h): `smv.zip` = 1,106 pāda-level Sumadhva Vijaya phone takes (34 named → 30 mapped exactly; 1,072 unnamed `New recording N` need identification; 551 clip); Aṣṭādhyāyī pārāyaṇa 32 whole-pāda files (3.9 h, long-form); Harikathāmṛtasāra 31 verses (Kannada, teaching-length, mapped for review); Brahmasūtra 1.1–1.2 whole; Vedavyāsa Gadya (prose, no text); Nāmāvali video. Two folders (`1o5-yqK_…`, `1-716NX8…`) are still private. Earlier gaps stand: Tīrthaprabandha only Dakṣiṇa 1–19; Nāmāvali 110 clips + video have no text in DGE
- 🟡 ZeroGPU hosting on `SarvamulaOrg` — **available now** (PRO enabled 6 Sep 2026 evening; 40 GPU-min/day quota); the only remaining step is the GitHub secret `HF_TOKEN`, then dispatch `Deploy — Kamadhenu Space` and switch Hardware → ZeroGPU
- 🔴 Any GPU training — none approved; none proposed yet

NEXT ACTION: Phase 8 — write the IndicF5 fine-tune configuration and data exporter (pilot → F5 metadata format, 24 kHz), dry-run on CPU (no training), then present the Experiment A cost card.

HUMAN ACTION REQUIRED:
1. Where are the other Tīrthaprabandha recordings (only Dakṣiṇa 1–19 were in the shared folder)? If they exist, share that folder too.
2. The Śrīpādarāja Aṣṭottara-śatanāmāvalī text (108 names, Devanagari) — then the 110 clips map by number.
3. `smv.zip` (the single Drive file, now fetched): 1,072 of its takes are unnamed `New recording N.m4a`. Are they in recording order (sarga 1 verse 1 pāda 1 onwards)? If you can say which sarga/verse the numbered runs start at, they map by arithmetic; otherwise Claude will try audio alignment against the site's per-verse files (free, CPU) before asking you to listen.
4. `HF_TOKEN` secret (write token from SarvamulaOrg → Settings → Access Tokens → Write) added to GitHub → Settings → Secrets → Actions. That unblocks the ZeroGPU Space today.
5. Listen to 2 Gītā + 2 'vsn' files (see kamadhenu_dataset/WHAT_I_NEED_TO_DO.md §A).
6. Share the two still-private folders (`1o5-yqK_jT-wg-8Augp1XwOyMFJKtyOyU`, `1-716NX8boMumr_Gyyq67veWKezjK3rez`) as *Anyone with the link: Viewer*, or say what they contain.
7. The Harikathāmṛtasāra files run 1.5–2.5 min per verse — is each a plain recitation repeated, or recitation + meaning? (decides segmentation, same question as the Gītā files).

GPU REQUIRED: none yet. Experiment A will need one 16–24 GB GPU for roughly 1–2 hours (card to be presented for approval).
ESTIMATED COST: ₹0 GPU spent. Experiment A estimate will be given before launch (order of ₹100–300 on a rented T4/L4-class card).
