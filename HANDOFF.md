# HANDOFF — for the next Claude Code session (written 7 Sep 2026, ~1:20 pm IST)

Two sessions end here: `claude/copyleft-licensing-dg-zmk9ac` (6 Sep, the long one) and
`claude/handoff-pending-review-o4cvmf` (6–7 Sep, this one). Everything both did is merged to `main`
(last merge 923d66cb); nothing lives only in chat. This file says where the state is, what is pending, and the
standing rules. Read it first, then the files it points to. Delete or rewrite it when it is stale.

## 1. Paste-ready opening prompt for the new session

> Read HANDOFF.md at the repo root, then the status files it names, and continue the pending items in the
> order I give you. Standing rules in HANDOFF.md §3 apply to everything. Do tasks end to end; report times in IST;
> Playwright screenshots before merging any UI change; merge to main by the §3 procedure.
> Start with: (1) whatever I report from the phone about the new reader, chandas reports, dhātu chips or the
> declension generator; (2) the Firebase Hosting deploy once the `FIREBASE_SERVICE_ACCOUNT` secret exists;
> (3) Kamadhenu Phase 8 (IndicF5 fine-tune config + CPU dry run, no training, then the Experiment A cost card).
> Ask me only for decisions that are mine (money, DNS cutover, publishing, deleting data).

## 2. Where the state lives (read these, in this order)

| What | File |
|---|---|
| Everything done 6–7 Sep, with numbers and known limits | `dge/PENDING.md`, section "Pending on this session / next Claude session" — the top three entries (7 Sep scholar features; 7 Sep ten-point reader review; 7 Sep reader declutter) |
| Kamadhenu TTS programme — phases, numbers, human actions | `kamadhenu/KAMADHENU_STATUS.md` (+ `kamadhenu_dataset/WHAT_I_NEED_TO_DO.md` for the lead's view) |
| Kamadhenu Space (ZeroGPU) deployment + measurements + the ×1.5 GPU-duration accounting | `kamadhenu_dataset/DEPLOYMENT_REFERENCE.md` §2, `kamadhenu_dataset/space_measurements.json` |
| Firebase / accounts / hosting migration state | `dge/FIREBASE_SETUP.md` §0, `dge/GO_LIVE_ARCHITECTURE.md` |
| Vṛtta reports (data + builder + page) | `dge/data/vedanga/chandas/reports/manifest.json`, `tools/chandas/build_chandas_reports.js`, `dge/js/chandas-report.js`, `dge/js/chandas-page.js`, `admin/config/chandas-features.json` |
| Dhātu occurrence index | `dge/data/vedanga/vyakarana/dhatu_prayoga/manifest.json`, `tools/build_dhatu_prayoga_index.py` (its docstring is the design note) |
| Any-stem declension | `dge/js/shabda-gen.js` (+ `subanta-steps.js`, `dge/wasm/vidyut/`) |
| Library curation (display-only moves, labels) | `admin/config/library-overrides.json` |
| Upaniṣad ṭippaṇī OCR, Chandas Gemini workflow, Sāroddhāra | `dge/data/ocr_staging/upanishad_tippani/<book>/summary.json`, `kamadhenu_dataset/chandas_gemini_review.md`, `tools/saroddhara/` |

## 3. Standing rules from the lead (non-negotiable)

- **Merging**: fetch `origin/main` → temp branch → `git merge --no-ff <feature>` → `python3 -m pytest tests/`
  (349) + `python3 tools/audit_library.py` + `python3 tools/validate_data.py` → push temp:main → ff-only sync
  the feature branch → delete temp → push feature. Playwright screenshots before merging any UI change
  (the `pip install playwright` + `/opt/pw-browsers/chromium` recipe in this session's scratch scripts works;
  serve the REPO ROOT, not `dge/`, or `admin/config/*` overrides don't load; set
  `sessionStorage.dge_vandana_passed=1`, `localStorage.has_seen_welcome=true`, `dge_tour_seen=1`,
  `dge_onboarded=true` to skip the gates).
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
- **UI taste, from this session's reviews**: the verse comes first (chrome minimal, first card near the top);
  two themes only (Vandana dark default, Traditional light); accordions with ▾/▴ for menu sections; the
  verse card carries only the verse; layouts stay one body-class switch (`reader.html`/`app.html` are thin
  entry pages, never copies).

## 4. What this session shipped (7 Sep 2026) — the short version

1. **Reader declutter** (index.html 4.66.0): search row in the top bar between an icon-only Library button and
   ☰; sticky reading card removed, read-along highlight lives in the active verse card; credit line gone;
   compact header; Display sheet accordions; two themes; Screen section (full screen, wake lock).
2. **Ten-point review**: chandas engine now splits on ASCII `|` and `<br>` and drops उवाच speaker lines (the
   Prahlāda Nṛsiṃha stotra scans Vasantatilakā); one काव्यम् in the library tree, Prahlāda stotra under
   Sarvamūla स्तोत्राणि (display-only moves); verse card = verse only with pāda line breaks from the engine
   (2 lines for anuṣṭubh-length pādas, 4 for longer); grouped nav rail with Chandas/Uṇādi/Phiṭ/Liṅgānuśāsana/
   Gaṇapāṭha/Rūpasiddhi and the rail mounted on those pages; pinned Library ignores outside taps and docks as a
   resizable pane on ≥760 px; no saved-password prompt on the search box (API-key inputs are text until
   focused); copy-guard on the reading pages.
3. **Vṛtta reports** on chandas.html: per-grantha, library/branch, per-vṛtta, leaderboards; precomputed (1 min,
   Node runs the browser engine) + in-browser regenerate with progress/ETA; feature gating via
   `admin/config/chandas-features.json` and the page's super-admin panel.
4. **Dhātu occurrences**: 912,115 exact hits of 251,597 nameable forms; badges + examples on prakriya/krdanta,
   usage sort on dhatu.html, chips under every verse card in the reader (bidirectional links). 80 MB of data.
5. **Any-stem declension** on shabda.html (`?gen=<stem>&l=P|S|N`), and the reader's word tools always offer a
   table.
6. **Kamadhenu Space**: GPU request lowered to 60 s (ZeroGPU bills ×1.5 on this hardware, so 120 s reached
   visitors as "180 s requested"); both engines re-verified; measurements recorded. The lead's own verdict on
   the IndicF5 zero-shot trial: voice ~70 % similar, words unintelligible — expected for an untrained base
   model on chant; this is the "before" sample for Phase 8.

## 5. Pending, in priority order

1. **Lead's feedback on the 7 Sep work** — expect it from the phone. Likely follow-ups: chips in App layout are
   hidden until a card is expanded (deliberate); a search phrase spanning a pāda break won't match (known);
   the Display sheet's "Reading View" header shows no current value until a view is chosen.
2. **Firebase Hosting preview/live deploy — still blocked on the lead** (re-tested 7 Sep, run 4 of
   `Deploy — Firebase Hosting`): `FIREBASE_PROJECT_ID` is visible but none of the nine service-account secret names
   the workflow reads is, at repository → Actions scope. The key the lead saved is under another name or another
   scope (Environment secret, repository *variable*, Codespaces/Dependabot, org). Lead: rename it to
   `FIREBASE_SERVICE_ACCOUNT` under Settings → Secrets and variables → Actions → Repository secrets, or name it.
   Then: preview channel → verify Google sign-in on sarvamula-org.web.app → Firestore (production mode + publish
   `dge/firebase/firestore.rules`, which now carries the verified-email rule) → DNS cutover is the lead's decision.
3. ~~Verified-email capture~~ — **done 7 Sep 2026**: `user-auth.js` stores only provider-verified emails
   (`dgeVerifiedEmail`) and captures a later-verified one on the next sign-in; `firestore.rules` `emailOk()` /
   `emailVerifiedFlagOk()` enforce it on create and self-update; Manage Users exports the verified list as CSV
   (`dgeExportVerifiedEmails`). 47 rules tests (emulator runs in the sandbox: `npm run test:rules`) + 196 unit
   tests pass. Not screenshotted: the export button needs a signed-in super-admin. Rules take effect only when
   the lead publishes them to the live project (Firestore is not created yet).
4. **Kamadhenu Phase 8**: IndicF5 fine-tune config + pilot exporter (24 kHz, F5 metadata), CPU dry run, then
   the Experiment A cost card (Kaggle T4 free first; L4 ≈ ₹150 fallback). Data: 1,721 usable pairs (6.5 h);
   smv.zip pāda takes 909 identified, 149 on the listen-list. Two cheap diagnostics proposed and not yet run:
   a Hindi sentence with an IndicF5 prompt clip (is the deployment sound), and a plain-read reference clip of
   the lead (is chant tempo or Sanskrit the gap). `tp_shardula_1` (76 syllables in 11.85 s) may hold only half
   its verse — listen before using it as a reference.
5. **Scholar features, next steps**: (a) Vedic metre detection is still the data's declared `chandas`, not the
   engine (PENDING.md's long-open item); (b) dhātu index: sandhi-fused forms are uncounted, `_morph` records
   carry no dhātu code, so the intellisense popover links to shabda tables but not to dhātu cells — a
   lemma→code side table would close that; (c) `vidyut` Python wheel (19 MB) timed out through the proxy —
   with it, `tools/` could pregenerate declension tables and verify the analogy paradigms offline; (d) a
   "differs from the paradigm in cells …" diff on shabda-gen is an easy scholar win.
6. **Upaniṣad ṭippaṇī ×7 + Tantrasāra**: Vision + Tesseract done for all 3,453 pages; LABELS/NEW/DIFF packs
   regenerated; importer into the mapped layers waits for the lead's Gemini answers.
7. **Chandas engine**: ārṣa triṣṭubh/jagatī classification, अनुष्टुभ् alias, re-ingest Gemini Parts C/D, harvest
   lakṣaṇa verses for the remaining fixtures (184 unresolved metres without examples). The new reports list
   93 DB vṛttas never attested in the library — a ready-made target list.
8. **Sāroddhāra leftovers**: master defects (11.2.37/38, 10.99.34, 10.99.35), 122 extra-beyond-index verses,
   287 refs not in DGE, reindex for backlinks.
9. Waiting on the lead: Śrīpādarāja Aṣṭottara-śata-nāmāvali text (108 names); listen-list answers.
10. Long-paused (Gemini credits): Vasu SK English (5 batches), Lakṣmī Vyākhyā pilot; Grantha data overhaul pilot.

## 6. Gotchas learned this session

- `core.js` checks `<meta name="dge-html-version">` against `DGE_EXPECTED_HTML_VERSION`; bump both on any
  index.html structure change or every reader shows the "cached page" banner.
- `menu.js renderThemes` re-parents theme rows from a config; anything that wraps them (accordions) must
  survive that — it now appends within the current parent.
- `library.json` grouping is by path segments; `admin/config/library-overrides.json` `moves` rename display
  paths without touching real ones (`config.js` and deep links use real slugs).
- ZeroGPU: `@spaces.GPU(duration=N)` is billed as N × `duration_factor` (1.5 on sm_120); `KAMADHENU_GPU_SECONDS`
  overrides the default 60.
- The interlink workflow (`.github/workflows/interlink.yml`) now rebuilds the sūtra-prayoga index, the dhātu
  occurrence index and the vṛtta reports on library changes — do not hand-edit those data folders.
