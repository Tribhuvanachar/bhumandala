# HANDOFF — for the next Claude Code session (written 6 Sep 2026, ~10:15 pm IST)

The previous session (`claude/copyleft-licensing-dg-zmk9ac`, several days, compacted many times) ends here.
Everything it did is merged to `main`; nothing lives only in chat. This file says where the state is, what is
pending, and the standing rules. Read it first, then the files it points to. Delete or rewrite it when it is stale.

## 1. Paste-ready opening prompt for the new session

> Read HANDOFF.md at the repo root, then the four status files it names, and continue the pending items in the
> order I give you. Standing rules in HANDOFF.md §3 apply to everything. Do tasks end to end; report times in IST.
> Start with: (1) the Firebase Hosting preview deploy once the `FIREBASE_SERVICE_ACCOUNT` secret exists, then a
> live deploy to sarvamula-org.web.app; (2) Kamadhenu Phase 8 (IndicF5 fine-tune config + CPU dry run, no
> training, then the Experiment A cost card); (3) the Upaniṣad ṭippaṇī import once the Gemini answer packs come
> back. Ask me only for decisions that are mine (money, DNS cutover, publishing, deleting data).

## 2. Where the state lives (read these, in this order)

| What | File |
|---|---|
| Kamadhenu TTS programme — phases, numbers, human actions | `kamadhenu/KAMADHENU_STATUS.md` (+ `kamadhenu_dataset/WHAT_I_NEED_TO_DO.md` for the lead's view) |
| Firebase / accounts / hosting migration state | `dge/FIREBASE_SETUP.md` §0, `dge/GO_LIVE_ARCHITECTURE.md` |
| The project backlog (everything not finished) | `dge/PENDING.md` (section "Pending on this session / next Claude session") |
| Kamadhenu Space (ZeroGPU) deployment reference + measurements | `kamadhenu_dataset/DEPLOYMENT_REFERENCE.md`, `kamadhenu_dataset/space_measurements.json` |
| Upaniṣad ṭippaṇī OCR (8 archive.org volumes) | `dge/data/ocr_staging/upanishad_tippani/<book>/summary.json`, tools in `tools/upanishad_tippani/` |
| Chandas engine + Gemini phone-verification workflow | `kamadhenu_dataset/chandas_gemini_review.md`, `tools/chandas/`, `tools/gemini_phone_pack.py` |
| Sāroddhāra verification | `tools/saroddhara/`, `dge/data/ocr_staging/bhagavata_saroddhara/` |

## 3. Standing rules from the lead (non-negotiable)

- **Merging**: fetch `origin/main` → temp branch → `git merge --no-ff <feature>` → `python3 -m pytest tests/`
  (349) + `python3 tools/audit_library.py` + `python3 tools/validate_data.py` → push temp:main → ff-only sync
  the feature branch → delete temp → push feature. Playwright screenshots before merging any UI change.
- **Commit trailers, exactly**: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and the session URL
  line; never put a model identifier in code, docs, PR text or commit bodies.
- **Money**: no Gemini API call without a ₹ estimate and a go-ahead (the lead has no API credits; Gemini is used
  through the Android app with paste-back packs). No paid GPU/cloud spend without a cost card and approval.
  ZeroGPU on the PRO Hugging Face account is within budget. Vision API is approved.
- **Training**: DO NOT TRAIN A MODEL until the lead approves an experiment card. Base model = IndicF5 (MIT);
  Vāgdhenu is the benchmark only; F5-TTS weights (CC-BY-NC) are excluded.
- **Secrets**: never print or commit secret values; tokens live in GitHub Actions secrets (`HF_TOKEN`,
  `FIREBASE_*`) and are used only inside workflows. `admin/config/keys.json` is never echoed.
- **Data**: never silently delete or overwrite; never fabricate content; every claim about audio/text comes
  from a measurement or the lead's own words. Speaker of all reachable recordings = the lead (3BHU1), consent recorded.
- **Time**: report in IST (`10:30 am IST`), convert from the UTC that git/Actions/logs use.

## 4. Pending, in priority order (details in the files above)

1. **Firebase Hosting preview/live deploy** — blocked on the secret name: the workflow expects
   `FIREBASE_SERVICE_ACCOUNT` (whole JSON) or `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL` (+ id fields).
   Then: verify Google sign-in on sarvamula-org.web.app; Firestore (production mode + publish
   `dge/firebase/firestore.rules`) when the lead creates it; DNS cutover is the lead's decision.
2. **Verified-email capture** (lead's ask, 6 Sep night): keep only verified emails — Google sign-in is already
   verified by Google; for any email/password sign-up require `sendEmailVerification` and gate the profile
   create in `firestore.rules` on `request.auth.token.email_verified == true`; export via the Admin SDK
   (`auth.listUsers`) or the Manage Users screen. Not yet implemented.
3. **Kamadhenu Phase 8**: IndicF5 fine-tune config + pilot exporter (24 kHz, F5 metadata), CPU dry run, then
   the Experiment A cost card (Kaggle T4 free first; L4 ≈ ₹150 fallback). Data: 1,721 usable pairs (6.5 h);
   smv.zip pāda takes 909 identified, 149 on the listen-list (`kamadhenu_dataset/smv_takes_listen_list.csv`).
4. **Kamadhenu trials page** is live (`dge/kamadhenu.html`, both engines verified). Next UI step: a
   "Generate this verse" button in the reader's audio dock using `dge/js/kamadhenu.js`.
5. **Upaniṣad ṭippaṇī ×7 + Tantrasāra**: Vision + Tesseract done for all 3,453 pages; LABELS/NEW/DIFF packs
   regenerated; importer into the mapped layers waits for the lead's Gemini answers.
6. **Chandas**: ārṣa triṣṭubh/jagatī classification, अनुष्टुभ् alias, re-ingest Gemini Parts C/D, harvest
   lakṣaṇa verses for the remaining fixtures (184 unresolved metres without examples).
7. **Sāroddhāra leftovers**: master defects (11.2.37/38, 10.99.34, 10.99.35), 122 extra-beyond-index verses,
   287 refs not in DGE, reindex for backlinks.
8. Waiting on the lead: Śrīpādarāja Aṣṭottara-śata-nāmāvali text (108 names); listen-list answers.
9. Long-paused (Gemini credits): Vasu SK English (5 batches), Lakṣmī Vyākhyā pilot; Grantha data overhaul pilot.
