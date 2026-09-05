# WHAT I NEED TO DO — Kamadhenu (written for the project lead, not for a programmer)

Open `kamadhenu_dataset/KAMADHENU_STATUS.html` first. Everything below is derived from what the scripts measured on 6 Sep 2026; re-running `python3 tools/kamadhenu_audit.py` updates the numbers.

## A. DO NOW (only the immediate actions)

1. **Decide whose voice Kamadhenu is.** The 2,544 recordings we could reach (22 h) carry no speaker name anywhere. A TTS voice must be one consenting reciter. Tell Claude: "the voice is ___".
2. **Share the three blocked Drive folders** (Drive → Share → *Anyone with the link: Viewer*), then tell Claude to re-run. They are:
   - https://drive.google.com/drive/folders/1GH_6kU5nuMryJ5HbL98u2LSWdkgoCB0V
   - https://drive.google.com/drive/folders/1eqWmG3hJAExpXzU7Kavx5-wfqdiRLXVM
   - https://drive.google.com/drive/folders/1wOOrLOfr7wWWpE1xRW90FNsDk54V5M81
   - and the single file https://drive.google.com/file/d/1aTBp56uEFK-EAPTEQEuBXmrjAz7z5n03/view
   If you prefer not to share them publicly, download each as a zip and follow §B.
3. **Tell Claude what the "vsn" recordings are** (106 files named `vsn1.aac … vsn16.aac` and `vsn1.1.aac … vsn1.91.aac` in the Drive folder called "Audio"). Viṣṇu Sahasranāma? Vāyu Stuti? Something else? One sentence is enough.
4. **Listen to two Gītā files and describe them.** Every Gītā recording (401 files) is 46–120 seconds long, 5–8× longer than one verse takes. Play `incoming_audio/drive/Gita Shlokas__Adhyaya 2/G.2.10.aac` and `…/Adhyaya 15/G.15.1.1.mp3` and tell Claude what happens inside (verse repeated? meaning spoken? two voices?). That answer decides how 400 files get segmented.

## B. PROVIDE FILES (put these under `kamadhenu_dataset/incoming_audio/`)

| what | where to put it | why |
|---|---|---|
| The two YouTube tracks — run on your computer: `yt-dlp -x --audio-format wav https://youtu.be/lgaxTgliOCo` and `… https://youtu.be/54EPwW-xJoI` | `incoming_audio/youtube/` | YouTube blocks this environment (captcha). Titles seen: "Bhukandam Varanandam Narasimha Stotra Vijayendra Tirtha", "Vedavyasa Gadya" |
| Zips of the three blocked Drive folders (if not shared) | `incoming_audio/<folder name>/` (unzipped) | the Tīrthaprabandha recordings (287) are not in any reachable source — they are probably here |
| The single blocked Drive file | `incoming_audio/single_files/` | unknown content |
| Any `.wav` masters you already have of your own voice | `incoming_audio/own_voice/<date>/` | the only path to Stage 2 |

Then run one command: `python3 tools/kamadhenu_audit.py` (add `--fetch` to also re-download the public sources). Nothing already analysed is re-analysed; nothing you copied in is modified.

**Do not provide**: Sumadhva Vijaya (992 files already fetched from the DGE audio repo), Rāghavendra Vijaya (578, archive.org), Prahlāda Narasiṃha (11), Bhagavad Gītā adhyāyas 1/2/5/6/7/15/16 (408), Bhāgavata Sāroddhāra (436), the Vāyu-Stuti pāda files (20). We have them.

## C. RECORD

Only where measurement says the existing audio cannot serve. Full list with exact texts: `RECORDING_REQUESTS.csv` (P0 = 17 rows). Summary of the P0 set:

| Chandas | which text (DGE id) | how many | unit | length | why |
|---|---|---|---|---|---|
| इन्द्रवंशा | Sumadhva Vijaya 5.24, 10.43, 11.73 | 3 | full śloka | ≈16 s each | only 4 recordings exist, all 11 kHz/16 kbps mp3 — unusable as a clean reference |
| पृथ्वी | SV 9.55, 10.52, 12.51 | 3 | full śloka | ≈22 s | same |
| शिखरिणी | SV 3.56, 10.20, 16.57 | 3 | full śloka | ≈22 s | same |
| मन्दाक्रान्ता | SV 1.55, 10.49 | 2 | full śloka | ≈22 s | same |
| स्रग्धरा | SV 10.50, Tīrthaprabandha DAK 18, DAK 46 | 3 | full śloka | ≈28 s | 4 exist at 48 kHz but hot-peaked; the metre needs an impeccable reference (21 syllables, two yatis) |
| भुजङ्गप्रयात | SV 11.77, TP DAK 6 | 2 | full śloka | ≈16 s | 1 recording only |
| हरिणी | SV 10.56 | 1 | full śloka | ≈22 s | 1 recording only |

Recording requirements (from Vāgdhenu's protocol and `dge/tts/ARCHITECTURE.md`): one room, one microphone, 48 kHz / 24-bit WAV, peaks around −6 dB, no tanpura in the recording, **no gaps between words inside a pāda**, pause only at pāda ends and at the yati of long metres, hold long vowels, sustain final visarga, articulate retroflexes and aspirates, one clean take per verse, file named `<dge_id>.wav` (e.g. `sumadhva_vijaya_sarga_5_24.wav`). These are **reference** recordings; they double as training data.

What NOT to record yet: anuṣṭubh, upajāti, vasantatilakā, स्वागता, शालिनी, रथोद्धता, मञ्जुभाषिणी, प्रमिताक्षरा, द्रुतविलम्बित, वंशस्थ, मालिनी, प्रहर्षिणी — we already hold 49–402 recordings each; they need *verification*, not more takes. Training-volume recording (hours) waits for the voice decision (§A.1).

## D. VERIFY (needs Sanskrit ears/eyes)

1. **Reference candidates — 38 metres** (`reference_bank.html`): play the "best reference", confirm the audio speaks exactly the text shown, start to end, nothing extra. ~1 hour. Tell Claude "verified: <list>" or edit `mapping_overrides.json`.
2. **Chandas fallbacks** (`text_index.json`, or filter `chandas_coverage.html` for "unverified"): 229 verses the DGE engine could not classify but that scan as 4×8 (vipulā?) or as an indra/upendra mix. Spot-check 10; if the engine is right, Claude extends it.
3. **Text defects the metre check exposed**: e.g. Tīrthaprabandha DAK 3 `सिधुः` (should be `सिन्धुः`), Sumadhva Vijaya 1.17 (23 vs 22 syllables in the two halves). Claude can list all of them (`inferred_reason` = "unequal pāda syllable counts"); you confirm the correction.
4. **Pronunciation policy** (one-time decisions): final visarga — echo vowel (rāmaha) or plain? word-boundary visarga sandhi applied or spoken as written? ṝ as "rū"? These are switches in the Vāgdhenu frontend; Kamadhenu needs your tradition's answer.
5. **Yati** for long metres in your recitation (mandākrāntā 4/10, śikhariṇī 6, śārdūla 12, sragdharā 7/14 — confirm or correct).
6. **Vedic svara**: nothing to verify yet — no path handles it.

## E. DO NOT DO YET

- Do not train or fine-tune anything (no decided voice, no clean masters, no GPU).
- Do not record hours of training audio before §A.1 and §D.1 are done.
- Do not clean/renormalise/re-encode the fetched recordings — the pipeline never modifies originals and neither should you.
- Do not build a second Sanskrit text database for TTS — DGE is the source; add missing works (Vāyu Stuti, Sāroddhāra, Saṅkalpa Gadya) to DGE instead.
- Do not touch Vāgdhenu's model code or prosody conditioners — its own report shows text-side conditioning is inert; the reference clip is the lever.
- Do not spend Gemini credits on this — nothing in the audit needs an LLM.
