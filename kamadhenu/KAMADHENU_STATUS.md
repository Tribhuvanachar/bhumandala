# KAMADHENU_STATUS

Updated 6 Sep 2026, 5:25 pm IST. Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 2 → 3 (data understood; designing the master dataset format)

COMPLETED:
- 🟢 Phase 0 audit — `kamadhenu/KAMADHENU_AUDIT.md`
- 🟢 Phase 1 audio inventory — `kamadhenu/data/audio_inventory.csv`, `kamadhenu/docs/AUDIO_INVENTORY.md` (2,544 files, 22.15 h, 4.03 h usable today)
- 🟢 Phase 2 DGE data located — text, metre, laghu/guru, pāda, audio links all in `kamadhenu_dataset/metadata.jsonl` (2,544 records); Tīrthaprabandha texts 235, Sumadhva Vijaya 992, Gītā 701, Sāroddhāra 371, Viṣṇu Sahasranāma 200 in `kamadhenu_dataset/text_index.json`
- 🟢 Chandas engine ready for Phase 5 (245 vṛttas, vipulā classes, ardhasama, 81 tests)
- 🟢 Deployment reference (ZeroGPU) and Space scaffold; HF account `SarvamulaOrg`

IN PROGRESS:
- 🟠 Phase 3 dataset schema (`kamadhenu/data/schema/kamadhenu_schema.json`, `docs/KAMADHENU_DATASET.md`)
- 🟠 Phase 4 validation script (`kamadhenu/scripts/kamadhenu_validate_dataset.py`)

BLOCKED:
- 🔴 Speaker decision (whose voice Kamadhenu is) — needed before any speaker-adaptation training
- 🔴 Tīrthaprabandha recordings — Drive folders not shared
- 🔴 ZeroGPU hosting on `SarvamulaOrg` — allowed from 6 Oct 2026 (account age rule)

NEXT ACTION: write the schema + validator, then build the pilot (Phase 6) from the 1,032 usable files, preferring Sāroddhāra (grade A) and Sumadhva Vijaya verses with a named metre.

HUMAN ACTION REQUIRED:
1. Name the voice (or say "use the existing recordings as a multi-speaker baseline for now").
2. Listen to 2 Gītā + 2 'vsn' files and describe what is inside (`kamadhenu_dataset/WHAT_I_NEED_TO_DO.md` §A).
3. Add the HF write token as GitHub secret `HF_TOKEN` (for the Space deploy; no training yet).

GPU REQUIRED: none so far (all work local/CPU).
ESTIMATED COST: ₹0 spent on GPU. Vision OCR today ≈ $5 (approved, separate project).
