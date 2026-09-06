# KAMADHENU_STATUS

Updated 6 Sep 2026, 8:45 pm IST. Legend: 🟢 DONE · 🟡 PARTIAL · 🟠 IN PROGRESS · 🔴 BLOCKED · ⚪ NOT REQUIRED

CURRENT PHASE: 7 done → 8 (training pipeline scaffold) next

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
- 🟠 Phase 8 training pipeline (IndicF5 / F5-TTS recipe, config, loader, resume, export) — not started in code
- 🟠 Phase 13 evaluation script + HUMAN_REVIEW.csv — not started

BLOCKED:
- 🟢 Speaker decided 6 Sep 2026: **3BHU1** (the project lead), consent to train the voice given; every one of the 3,892 recordings is attributed to him (`kamadhenu_dataset/speakers.json`)
- 🟡 Drive, evening batch 6 Sep 2026 (+1,173 files, +15.3 h), lead's answers applied 7:00 pm IST: `smv.zip` = 1,106 pāda-level Sumadhva Vijaya takes: 34 named (30 mapped exactly) + 1,058 numbered `New recording N` **identified by local Whisper transcription + the lead's sequential-pāda rule: 909 assigned** (471 at 0.9, 149 at 0.8, 226 at 0.7, 63 interpolated at 0.6) across sargas 10, 11, 14, 16 (+ a few 15/1); **149 need one listen** (`kamadhenu_dataset/smv_takes_listen_list.csv`); 51 dated files are hour-long sessions, not takes. Overrides in `mapping_overrides.json`, evidence in `smv_takes_check.json`; Harikathāmṛtasāra 31 verses — lead confirmed plain full recitations → accepted; Gītā files are pāda-wise with some words repeated (segmentation plan); Vedavyāsa Gadya text imported (Yādavārya, 100 epithet units) → the 9.7-min file needs per-epithet segmentation; **Aṣṭādhyāyī pārāyaṇa (32 files, 3.9 h) is NOT the lead's voice → excluded**; Kṣīrābhiṣeka video ignored; the two private folders were someone else's and are dropped. Earlier gaps stand: Tīrthaprabandha only Dakṣiṇa 1–19; Nāmāvali 110 clips + video have no text in DGE
- 🟢 **Kamadhenu trials page** `dge/kamadhenu.html` (6 Sep, 8:30 pm IST): DGE chandas verdict + two engines side by side — *Kamadhenu trial* = **IndicF5 (MIT) zero-shot prompted with the lead's own recordings** (`tools/kamadhenu/space/refs/`), *Vāgdhenu baseline*. The lead's question answered honestly: the Space's first engine is Vāgdhenu's weights (built on IndicF5), nothing has been trained; the trial engine is the licensed base model in his voice. 🟠 IndicF5 weights are gated: the Space secret `HF_TOKEN` is set, but the SarvamulaOrg account must accept the gate once (see HUMAN ACTION 8)
- 🟢 **Kamadhenu Space LIVE** 6 Sep 2026, 7:36 pm IST — https://sarvamulaorg-kamadhenu.hf.space on ZeroGPU (zero-a10g), deployed by the `Deploy — Kamadhenu Space` workflow (4th run; fixes: huggingface_hub 1.x API, README metadata length). Measured from a GitHub runner: anuṣṭubh verse 9.6 s audio, **4.3 GPU s warm (RTF 0.45)**, 23.2 GPU s on the cold first call. `appConfig.kamadhenuSpaceUrl` set; `dge/js/kamadhenu.js` loaded by the reader (no visible button yet — the "Generate this verse" UI hook is the next step). Diagnostics: `Kamadhenu Space — logs + API probe` workflow
- 🔴 Any GPU training — none approved; none proposed yet

NEXT ACTION: Phase 8 — write the IndicF5 fine-tune configuration and data exporter (pilot → F5 metadata format, 24 kHz), dry-run on CPU (no training), then present the Experiment A cost card.

HUMAN ACTION REQUIRED:
1. Where are the other Tīrthaprabandha recordings (only Dakṣiṇa 1–19 were in the shared folder)? If they exist, share that folder too.
2. The Śrīpādarāja Aṣṭottara-śatanāmāvalī text (108 names, Devanagari) — then the 110 clips map by number.
3. **Listen-list for 149 smv takes** — `kamadhenu_dataset/smv_takes_listen_list.csv`: each row gives what Whisper heard, the best guess, and the identified neighbours; fill the last column (sarga.verse.pāda or `skip`). Also spot-check a few of the 63 interpolated ones (confidence 0.6 in `smv_takes_check.json`).
4. ~~`HF_TOKEN`~~ — done by the lead 6 Sep 2026 (verified: the deploy workflow found it).
5. Listen to 2 Gītā + 2 'vsn' files (see kamadhenu_dataset/WHAT_I_NEED_TO_DO.md §A).
6. ~~two private folders~~ — not the lead's; dropped.
7. ~~HKS content~~ — plain full recitation (lead, 6 Sep); accepted.
8. **Accept the IndicF5 gate once**: logged in as SarvamulaOrg, open https://huggingface.co/ai4bharat/IndicF5 and click *Agree and access repository* (auto-approved). Until then the trial page's Kamadhenu engine reports "gated repo"; the Vāgdhenu engine works now.

GPU REQUIRED: none yet. Experiment A will need one 16–24 GB GPU for roughly 1–2 hours (card to be presented for approval).
ESTIMATED COST: ₹0 GPU spent. Experiment A estimate will be given before launch (order of ₹100–300 on a rented T4/L4-class card).
