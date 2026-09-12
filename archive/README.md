# archive/ — finished one-off importers, zipped

Importers whose job is done: their output is committed under `data/`, no
workflow, `importers/dispatch.py` or test references them, and re-running one
would mean re-reading a hand-prepared input (a TSV, a scan, a spreadsheet)
that no longer changes. Kept as one zip so `importers/` and `tools/` show only
what is in use, without losing the code. Git history has every file as well.

## `retired-importers-2026-09.zip` (archived 9 Sep 2026)

| Inside the zip | What it loaded | Output (still on main) |
|---|---|---|
| ~~`importers/ramanuja_meghamala.py`~~ | **Taken back out on 9 Sep 2026** — the lead wants the Meghamālā synced, so it lives in `importers/` again with `--granthas` / `--strict` and a crawler beside it (`tools/meghamala/crawl_meghamala.py`, `sync-meghamala.yml`). | — |
| `importers/shatapatha_madhyandina.py` | Mādhyandina Śatapatha Brāhmaṇa with Sāyaṇa + Eggeling layers, from github.com/vishvasa/vedAH_yajuH | `data/vedas/yajurveda/shukla_yajurveda/…/shatapatha_brahmana_madhyandina/` |
| `tools/gretil_pancharatra/` | Pauṣkara (partial) and Viṣvaksena Saṃhitās from GRETIL; the other 11 Pāñcarātra leaves have no e-text | `data/agama/vaishnava_agama/pancharatra/…` |
| `tools/guru_harvest/` | The two hand-curated Guru-Paramparā spreadsheets (`sources/guru_parampara_sheet_raw.txt`) + `enrich_jagannatha_v.py` | `guru-parampara/data/parampara.json` (now hand-edited through `admin/guru.html`) |
| `tools/gita_boray/` | Dr Giridhar Boray's English Gītā (2021 PDF) as a ṭīkā layer | `…/SarvaMula/gita_prasthana/gita_bhashya/tika_english_boray/` |
| `tools/gita_nadgouda/` | Nadgouda's English Gītā (PDF) as a second English layer | `…/gita_bhashya/tika_english_nadgouda/` |
| `tools/krishnacharitra/` | Kṛṣṇacaritra Mañjarī with Kannada vyākhyāna, local Tesseract-Kannada OCR | `…/DvaitaVedanta/later_acharyas/krishnacharitra_manjari/` |
| `tools/mbtn/` | Mahābhārata-Tātparya-Nirṇaya multi-ṭīkā splitter over four archive.org scans | `…/itihasa_prasthana/mahabharata_tatparya_nirnaya/tika_*/` |
| `tools/jayanthi/` | Jayantī Nirṇaya from a user-supplied Kannada transcription (`jayanthi_kannada_parsed.json` is inside the zip — it is the source, keep it) | `…/SarvaMula/achara_and_ancillary_granthas/jayanti_nirnaya/` |
| `tools/tirtha/` | Tīrthaprabandha mūla from tirthaprabandha.wordpress.com + Nārāyaṇa ṭīkā merge (`sources/` inside) | `…/SarvaMula/kavya/tirtha_prabandha/` and the `tirtha/` page |

**Kept out of the zip on purpose**, although no workflow runs them either:
`importers/advaita_sharada.py`, `importers/ramanuja_mula.py`,
`ramanuja_subcommentaries.py`, `ramanuja_extended.py`,
`importers/ashtadhyayi_layers.py` — their sources are live websites/repos that
the *Online source syncers* watch, so a delta re-run is plausible;
`tools/dcs/` (vendored corpus, ~93 texts still to import); `tools/chandas_native/`
(the Apache-licensed replacement for the AGPL `tools/chandas`);
`tools/saroddhara/` and `tools/upanishad_tippani/` (OCR work in flight);
`tools/reports/` (notes, not code).

## To bring one back

    unzip archive/retired-importers-2026-09.zip tools/tirtha/\* -d .

and run it as its docstring says. If it stays, move it out of the zip in the
same commit so this README and the zip agree.
