# Chandas comparison — DGE vs Vāgdhenu

Generated evidence: `kamadhenu_dataset/chandas_comparison.json` (regenerate with `python3 -m tools.kamadhenu.compare_vagdhenu`).
Decision: **ONE authoritative Chandas layer = DGE (`dge/js/chandas.js` + `dge/data/vedanga/chandas/data.json`)**. Vāgdhenu's metre tables are replaced; its syllable/weight code is wrapped only where DGE has no Python equivalent.

## 1. What each side has

| | DGE | Vāgdhenu |
|---|---|---|
| Metre database | **245 vṛttas** (190 sama + 8 ardhasama + 5 viṣama + 42 upajāti) + 10 mātrā-vṛttas + 27 akṣara-jāti names; source Chandojñānam (AGPL-3.0 data) | `tts_meter.py` METERS: 13 entries (13 metres); `chandas_labeler.py` SIGNATURES: 10 metres; bank.json: 16 reference metres |
| Classification | anuṣṭubh rule (pathyā/vipulā-as-अन्यथा), sama, ardhasama, upajāti (14 named indra/upendra mixes + 28 others), viṣama, mātrā (āryā family), nearest-3 fuzzy | rigid 4-pāda template match; upajāti = any pāda indra **or** upendra; 32 syllables → anuṣṭubh by default; 16 → half-anuṣṭubh; else `unknown` |
| Anceps | last syllable of each pāda: scanned laghu may satisfy template guru (one-way) | last position ignored (two-way) |
| Yati | 116/190 sama metres carry yati segment lengths | 5 metres hard-coded (`YATI` dict) |
| Alphabet / script | Devanagari input only; `ग`/`ल` output | SLP1 input (any Brahmic script via sanscript); `G`/`L` |
| Gaṇa | yes (`ganas()`) | no (L/G ids only) |
| Syllable weight rules | long vowel · anusvāra/visarga · conjunct after · line-final consonant heavy. **Candrabindu (ँ) and explicit ᳵ/ᳶ do not count** — bug | `tts_weight`: long vowel · M/H immediately after · cluster ≥2 · pāda-final anceps; `chandas_labeler.scan`: same + `~` counts as closing mark |
| Runs headless | yes — `tools/kamadhenu/chandas_runner.js` (3 stubbed globals, engine unmodified) | yes (pure Python, needs `indic_transliteration`) |
| Tests | none for the JS engine (only `tools/chandas_native/verify.py`, 3 cases, for a separate clean-room Python engine) | `__main__` demos only |

## 2. Pattern-level comparison (every Vāgdhenu template vs the DGE lakṣaṇa)

| Vāgdhenu table | metre | Vāgdhenu pattern | DGE metre | DGE pattern | agrees |
|---|---|---|---|---|---|
| tts_meter.METERS | indravajra | `GGLGGLLGLGG` | इन्द्रवज्रा | `GGLGGLLGLGG` | ✅ |
| tts_meter.METERS | upendravajra | `LGLGGLLGLGG` | उपेन्द्रवज्रा | `LGLGGLLGLGG` | ✅ |
| tts_meter.METERS | upajati | `GGLGGLLGLGG` | उपजाति | `—` | ❌ |
| tts_meter.METERS | upajati | `LGLGGLLGLGG` | उपजाति | `—` | ❌ |
| tts_meter.METERS | vamshastha | `LGLGGLLGLGLG` | वंशस्थ | `LGLGGLLGLGLG` | ✅ |
| tts_meter.METERS | indravamsha | `GGLGGLLGLGLG` | इन्द्रवंशा | `GGLGGLLGLGLG` | ✅ |
| tts_meter.METERS | vasantatilaka | `GGLGLLLGLLGLGG` | वसन्ततिलका | `GGLGLLLGLLGLGG` | ✅ |
| tts_meter.METERS | malini | `LLLLLLGGLGGLGGG` | मालिनी | `LLLLLLGGGLGGLGG` | ❌ |
| tts_meter.METERS | shikharini | `LGGGGGLLLLLGGGGLG` | शिखरिणी | `LGGGGGLLLLLGGLLLG` | ❌ |
| tts_meter.METERS | mandakranta | `GGGGLLLLLGGLGGLGG` | मन्दाक्रान्ता | `GGGGLLLLLGGLGGLGG` | ✅ |
| tts_meter.METERS | harini | `LLLLLGGGGGLGLLGLG` | हरिणी | `LLLLLGGGGGLGLLGLG` | ✅ |
| tts_meter.METERS | prithvi | `LGLLLGLGLLLGGLGGL` | पृथ्वी | `LGLLLGLGLLLGLGGLG` | ❌ |
| tts_meter.METERS | shardulavikridita | `GGGLLGLGLLLGGGLGGLG` | शार्दूलविक्रीडित | `GGGLLGLGLLLGGGLGGLG` | ✅ |
| tts_meter.METERS | sragdhara | `GGGGLGGGLLLLLLGGLGGLG` | स्रग्धरा | `GGGGLGGLLLLLLGGLGGLGG` | ❌ |
| chandas_labeler.SIGNATURES | indravajrā(11) | `GGLGGLLGLGG` | इन्द्रवज्रा | `GGLGGLLGLGG` | ✅ |
| chandas_labeler.SIGNATURES | upendravajrā(11) | `LGLGGLLGLGG` | उपेन्द्रवज्रा | `LGLGGLLGLGG` | ✅ |
| chandas_labeler.SIGNATURES | vaṃśastha(12) | `LGLGGLLGLGLG` | वंशस्थ | `LGLGGLLGLGLG` | ✅ |
| chandas_labeler.SIGNATURES | vasantatilakā(14) | `GGLGLLLGLLGLGG` | वसन्ततिलका | `GGLGLLLGLLGLGG` | ✅ |
| chandas_labeler.SIGNATURES | mālinī(15) | `LLLLLLGGGLGGLGG` | मालिनी | `LLLLLLGGGLGGLGG` | ✅ |
| chandas_labeler.SIGNATURES | mandākrāntā(17) | `GGGGLLLLLGGLGGLGG` | मन्दाक्रान्ता | `GGGGLLLLLGGLGGLGG` | ✅ |
| chandas_labeler.SIGNATURES | śikhariṇī(17) | `LGGGGGLLLLLGGLLLG` | शिखरिणी | `LGGGGGLLLLLGGLLLG` | ✅ |
| chandas_labeler.SIGNATURES | pṛthvī(17) | `LGLLLGLGLLLGLGGLG` | पृथ्वी | `LGLLLGLGLLLGLGGLG` | ✅ |
| chandas_labeler.SIGNATURES | śārdūlavikrīḍita(19) | `GGGLLGLGLLLGGGLGGLG` | शार्दूलविक्रीडित | `GGGLLGLGLLLGGGLGGLG` | ✅ |
| chandas_labeler.SIGNATURES | sragdharā(21) | `GGGGLGGLLLLLLGGLGGLGG` | स्रग्धरा | `GGGGLGGLLLLLLGGLGGLGG` | ✅ |

`upajati` rows show "—" for DGE because DGE keeps upajāti as 42 explicit 4-pāda combinations, not a single template; that is a design difference, not an error.

### Conflicts found
* **`tts_meter.py` has four wrong templates** — mālinī, śikhariṇī, pṛthvī, sragdharā. Checked against the gaṇa formulas (mālinī = na-na-ma-ya-ya, śikhariṇī = ya-ma-na-sa-bha-la-ga, pṛthvī = ja-sa-ja-sa-ya-la-ga, sragdharā = ma-ra-bha-na-ya-ya-ya) DGE is right and `tts_meter.py` is wrong. Because `detect_meter()` falls through to `unknown`, every mālinī/śikhariṇī/pṛthvī/sragdharā verse rendered through that path was treated as *gadya* (flat template).
* **Vāgdhenu disagrees with itself**: `chandas_labeler.SIGNATURES` (used for the L/G conditioner) carries the correct patterns for the same four metres:

| metre | tts_meter.py | chandas_labeler.py |
|---|---|---|
| मालिनी | `LLLLLLGGLGGLGGG` | `LLLLLLGGGLGGLGG` |
| शिखरिणी | `LGGGGGLLLLLGGGGLG` | `LGGGGGLLLLLGGLLLG` |
| पृथ्वी | `LGLLLGLGLLLGGLGGL` | `LGLLLGLGLLLGLGGLG` |
| स्रग्धरा | `GGGGLGGGLLLLLLGGLGGLG` | `GGGGLGGLLLLLLGGLGGLGG` |

* Vāgdhenu's production build (`build_mbtn_adh_v2.py`, per TECH_REPORT §10) "self-calibrated L/G signatures from bank refs" — i.e. a *third* table that lives outside the repo. Not inspectable here.

## 3. DGE gaps exposed by running it over 7,696 corpus units

| gap | evidence | effect | fix |
|---|---|---|---|
| Strict anuṣṭubh rule: 5th laghu + 6th guru required in **every** pāda | Gītā: 131 of 701 verses (e.g. 1.5, 1.9, 1.25) → अज्ञातम्; Tīrthaprabandha 37; Sumadhva Vijaya 61 | classical vipulās (na-, bha-, ma-, ra-vipulā) are reported unknown; Kamadhenu labels them `अनुष्टुप् (vipulā/irregular — unverified)` at 0.6 confidence | add the four vipulā classes to `matchAnushtup` and name them |
| Upajāti table lacks the U-I-U-U mix (row `ऋद्धि` duplicates `वाणी` = I-U-I-I) | `data.json upajati_vrutta`; Sumadhva Vijaya 1.4 unmatched | valid upajāti verses → अज्ञातम्; Kamadhenu labels them `उपजाति` at 0.7 | fix the `ऋद्धि` row; add a generic "any indra/upendra mix" fallback in `matchVrutta` |
| Candrabindu / explicit jihvāmūlīya-upadhmānīya not heavy | `frontend_gap_report.json` cases "candrabindu", "explicit jihvāmūlīya" | wrong L/G on Vedic-extension text | change the nasal test at `chandas.js:58` to `/[ँंःᳵᳶ]/` |
| Devanagari only | Kannada input → `padas: []`, silently | Kannada-script granthas cannot be scanned on the site | transliterate upstream (Kamadhenu `texts.py` does; the site page does not) |
| Pāda split = syllable midpoint of a 2-line verse | `toPadas()` | wrong for ardhasama/viṣama stored as two lines | store 4-line pāda text for reference-bank verses |
| No tests | — | regressions invisible | add `tests/test_chandas_engine.py` driving `chandas_runner.js` with the 22 probe cases + 10 known verses |

Corpus-side defects that surface as metre failures (not engine bugs): unequal half-verse syllable counts (e.g. Sumadhva Vijaya 1.17: 23/22), typos (`सिधुः` for `सिन्धुः`, Tīrthaprabandha TP_DAK_003), hyphenated compounds broken across lines. These belong in the DGE correction workflow (`text_index.json` → `chandas_analysis.inferred_reason` lists them).

## 4. Special cases
* **Anuṣṭubh**: DGE distinguishes pathyā vs "अन्यथा" only; Vāgdhenu does not distinguish at all (32 syllables ⇒ anuṣṭubh, which also swallows 8-syllable sama metres like प्रमाणिका/विद्युन्माला when they are not in its table).
* **Half verses**: Vāgdhenu renders per hemistich and has `anushtubh_half`; DGE has no half-verse concept (a 2×8 input falls to fuzzy sama). Kamadhenu handles halves at the mapping layer (`part = half_1/half_2`).
* **Mātrā metres (āryā family)**: DGE supports 10; Vāgdhenu none.
* **Sūtra/ritual ॐ inside verses** (Anuvyākhyāna): Vāgdhenu `mark_sutras()` excludes ॐ-bracketed spans from metre detection; DGE has nothing — Kamadhenu `texts.py` strips standalone ॐ lines only.
* **Vedic**: neither.

## 5. Decision — what stays, what is replaced, what is wrapped

| Vāgdhenu piece | verdict | reason |
|---|---|---|
| `tts_meter.py` METERS + `detect_meter` | **replace with DGE** | 4 wrong templates, 13 metres vs 245, no upajāti mixes, no mātrā |
| `chandas_labeler.SIGNATURES` / `YATI` | **replace with DGE** (`data.json` yati) | subset of DGE; yati for 116 metres in DGE vs 5 |
| `chandas_labeler.scan` / `syllabify_slp1`, `tts_syllabify`, `tts_weight` | **wrap** as the Python-side akṣara segmenter *only* where a Python caller cannot spawn node; results must be cross-checked against `chandas_runner.js` (L/G strings agree on all 18 correct templates) | DGE's segmenter is browser JS |
| `chandas_labeler.char_gana_ids` / `gana_f5.py` / `gana_uni.py` | **do not carry forward** | Vāgdhenu's own report: text-side gaṇa conditioner is architecturally inert (E59/E65/E68/E78) |
| `prep_text.py` (script routing, visarga sandhi, echo visarga, ṝ→rū, hna metathesis, parenthetical strip) | **reuse as explicit pronunciation transforms** | the best-tested Sanskrit TTS frontend that exists; but it must never rewrite DGE canonical text — apply at render time, logged |
| `extract_prosody.py` | **reuse later** (Stage 4) | needs MFA TextGrids |
| `reference_bank/bank.json` format (`wav, mode, dur_s, sr, hnr, sec_per_syll, ref_text, full_verse`) | **adopt the format**, not the audio | different speaker; Kamadhenu `reference_bank.json` is a superset |
| `render.py` shard input `{id, meter, padas[], seed, out}` | **target interface** for the Kamadhenu → Vāgdhenu bridge | DGE text + DGE chandas name → `meter` |

Vāgdhenu bank metres: anuṣṭubh, pramāṇikā, vasantatilakā, upajāti, indravajrā, upendravajrā, vaṃśastha, rathoddhatā, śālinī, indravaṃśā, drutavilambita, bhujaṅgaprayāta, mālinī, śārdūlavikrīḍita, sragdharā, vrutta-1, repeat_primes, gadya, gadya_mbtn.

## 6. Missing metres relative to Kamadhenu's corpus
Metres present in the indexed DGE works but absent from Vāgdhenu's bank (so Vāgdhenu's nearest-by-syllable-count fallback would be used): see `chandas_coverage.html` — notably स्वागता, प्रमिताक्षरा, मञ्जुभाषिणी, रथोद्धता, शालिनी, द्रुतविलम्बित (all frequent in Sumadhva/Rāghavendra Vijaya), and the mātrā metres.
