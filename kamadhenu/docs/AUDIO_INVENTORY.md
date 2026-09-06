# Audio inventory (Kamadhenu Phase 1)

Built 6 Sep 2026 by `kamadhenu/scripts/build_audio_inventory.py` from the per-file measurements in
`kamadhenu_dataset/audio_inventory.json` and the text mapping in `kamadhenu_dataset/metadata.jsonl`. The CSV is
`kamadhenu/data/audio_inventory.csv` (one row per file, 31 columns). No audio was copied.

## Totals

| | files | hours |
|---|---|---|
| everything reachable | 2,544 | 22.15 |
| grade A (clean, no clipping, SNR good) | 637 | 6.52 |
| grade B (usable) | 1,382 | 12.00 |
| grade C/D (clipped, noisy, or very low bitrate) | 525 | 3.63 |
| paired with a text at confidence ≥ 0.9 | 1,576 | 6.90 |
| **usable for training today** | **1,032** | **4.03** |

"Usable" = grade A or B, text confidence ≥ 0.9, duration plausible for the text, not a byte-identical duplicate.

## By source

| folder | files | hours | grades | sample rate | what it is |
|---|---|---|---|---|---|
| dge_linked/sumadhva_vijaya | 989 | 3.65 | all B | 11.025 kHz MP3 | one file per verse, already linked in the reader; low bitrate |
| dge_linked/raghavendra_vijaya | 576 | 3.20 | 486 D, 85 B | 48 kHz | one file per verse; most clipped |
| dge_linked/PrahladaKrutaNarasimha | 11 | 0.06 | A/B | 44.1 kHz | vasantatilakā stotra |
| drive/Bhagavata Saroddhara | 436 | 2.13 | 425 A | 44.1 kHz | one file per verse; best audio we have; text verified 6 Sep 2026 |
| drive/Gita Shlokas (7 adhyāyas) | 406 | 8.82 | mostly A/B | 44.1/48 kHz | 46–120 s per file: repeated/teaching style, needs segmentation |
| drive/Audio* ('vsn' series) | 106 | 3.86 | B, some D | 48 kHz | Viṣṇu Sahasranāma, mapped at 0.55 confidence, unconfirmed |
| drive/Vayu Stuti | 20 | 0.45 | 18 A | 44.1 kHz | pāda-level files, text not yet in DGE |

## Text, metre and laghu/guru association

Of the 1,985 files paired at confidence ≥ 0.7: 88.6 % carry a metre name from the DGE Chandas engine, 100 %
carry a laghu/guru scan and pāda count, 11.3 % of metres have an exact pāda-level reference recording. Speaker
is "unattributed" for every file: the sources record no reciter name.

## Known defects (marked, not deleted)

* 46 files are byte-identical to another file (Sumadhva Vijaya pairs such as smv1.12 = smv1.16).
* 5 links in the audio repo are dead (`smv5.8`, `smv5.14`, `smv5.16`, `rv02.54`, `rv10.06`).
* 486 Rāghavendra Vijaya files show clipping runs.
* 0 decode errors.

## Columns of the CSV

file_path, filename, format, codec, sample_rate, channels, bit_depth, duration_s, file_size, peak_dbfs, rms_dbfs,
snr_db_est, clipping_runs, quality_grade, qc_flags, exact_duplicate_of, source, folder, speaker, recording_type,
text_id, text_first_words, mapping_confidence, mapping_signal, review_status, meter, meter_confidence, laghu_guru,
pada_count, part, usable_for_training.
