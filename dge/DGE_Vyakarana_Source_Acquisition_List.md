# DGE Vyākaraṇa Corpus — Source & Acquisition List

**Policy:** Ashtadhyayi.com is excluded as an ingestion source. Use independent editions/digitisations wherever possible. Modern copyrighted works should be acquired lawfully and OCRed from legitimately obtained copies.

## Core corpus

| Layer / Work | Author | Recommended source | Status / note |
|---|---|---|---|
| Sūtrapāṭha | Maharṣi Pāṇini | Derived from independently sourced commentary keys / verified editions | Public-domain classical text; establish canonical edition |
| Kāśikā-vṛtti | Vāmana–Jayāditya | Sanskrit Documents / independent editions; verify exact edition before canonical ingestion | Acquire clean Unicode/scan |
| Mahābhāṣya | Patañjali | Independent public-domain scan/edition; GTNM useful as alignment reference | OCR/proofread; only sūtras actually treated by Bhāṣya |
| Nyāsa (Kāśikāvivaraṇapañjikā) | Jinendrabuddhi | Wilbour Hall / independent scan; GTNM alignment reference | OCR/proofread |
| Padamañjarī | Haradatta | Wilbour Hall / independent scan; GTNM alignment reference | Add; important Kāśikā commentary layer |
| Siddhānta-Kaumudī | Bhaṭṭoji Dīkṣita | Dhaval Patel structured XML | Preferred Sanskrit machine source |
| Bālamanoramā | Vāsudeva Dīkṣita | Independent edition / Wikisource where appropriate | Verify edition/provenance |
| Tattvabodhinī | Jñānendra Sarasvatī | Independent edition / scan | High priority |
| S.C. Vasu — Aṣṭādhyāyī (English) | Śrīśa Chandra Vasu | Independent Internet Archive / Sanskrit GitHub proofread source | Public-domain historical work; avoid Ashtadhyayi.com as source |
| S.C. Vasu — Siddhānta-Kaumudī (English) | Śrīśa Chandra Vasu | Internet Archive collection | Historical/public-domain work; OCR available |

## Major missing traditional layers

| Work | Author | Recommended source / lead | Priority |
|---|---|---|---|
| Prakriyā-Kaumudī | Rāmacandra | Internet Archive historical scan | Very high |
| Prakriyā-Pradīpa / related commentary | Viṭṭhala and tradition | Historical editions / Wilbour Hall | Very high |
| Prauḍha-Manoramā | Bhaṭṭoji Dīkṣita | Historical editions / Open Library / Internet Archive | Very high |
| Laghu-Siddhānta-Kaumudī | Varadarāja | Independent editions; Bhaimīvyākhyā as secondary layer | High |
| Laghu-Śabdenduśekhara | Nāgeśa Bhaṭṭa | e-Bharati Sampat Unicode edition | Very high |
| Śabdenduśekhara | Nāgeśa Bhaṭṭa | Historical editions / scans | High |
| Paribhāṣenduśekhara | Nāgeśa Bhaṭṭa | GRETIL for reference; obtain an independent proofread edition | Very high |
| Vākyapadīya | Bhartṛhari | SARIT TEI/XML + K.A. Subramania Iyer editions | Very high |
| Sahajabodha / Aṣṭādhyāyī-Sahajabodha | Puṣpā Dikṣita | Obtain lawful copy; investigate digital availability separately | High |
| Lakṣmī-ṭīkā on Siddhānta-Kaumudī | Sabhāpati Śarmā Upādhyāya | Bibliographic record / printed edition; locate scan | High |
| Siddhānta-Kaumudī-Vilāsa | Lakṣmīnṛsiṃha | Manuscript/catalogue leads; locate edition | Medium/high |
| Dhātupāṭha | Pāṇini tradition | Independent critical/Unicode source | Essential infrastructure |
| Gaṇapāṭha | Pāṇini tradition | Independent Unicode/edition | Essential infrastructure |
| Liṅgānuśāsana | Pāṇini tradition | Independent edition | Important |
| Uṇādisūtra | Pāṇinian tradition | Independent edition | Important |
| Paribhāṣā-pāṭha / related paribhāṣā texts | Various | Independent editions | Important |

## Modern Hindi commentaries worth acquiring (rights-controlled)

### Śrīdharamukhollāsinī
**वैयाकरणसिद्धान्तकौमुदी — श्रीधरमुखोल्लासिनी हिन्दीव्याख्या समन्विता**

Author/commentator: **Govinda Prasāda Śarmā (Govindācārya)**; editor: **Lakṣmī Śarmā**. Published by Chaukhamba Surbharati Prakashan.

The work is documented in scholarly bibliographies and library catalogues. The six-volume modern set should be treated as copyrighted; acquire physical/authorized copies and use the DGE Vision-OCR pipeline on those copies.

Sources:
- https://ci.nii.ac.jp/ncid/BA84341132
- https://aclanthology.org/2022.wildre-1.pdf

### Ratnaprabhā
**वैयाकरणसिद्धान्तकौमुदी — सविमर्श 'रत्नप्रभा' हिन्दीव्याख्यासहिता**

Bālakṛṣṇa Pañcolī; four-volume set. Treat as copyrighted modern commentary and acquire lawfully.

Source:
- https://ci.nii.ac.jp/ncid/BA46958455

### Puṣpāñjali
**पुष्पाञ्जलि — Siddhānta-Kaumudī Hindi commentary**

Paṇḍita Īśvaracandra; modern Chaukhamba publication. Treat as copyrighted and acquire lawfully.

A scholarly discussion identifies the 2010 Delhi Chaukhamba edition and gives a concrete volume/page reference:
- https://groups.google.com/g/bvparishat/c/l0BDuyY56a0

### Bhaimīvyākhyā
**लघुसिद्धान्तकौमुदी — भैमीव्याख्या**

Useful modern explanatory layer for Laghu-Siddhānta-Kaumudī. Some online copies exist; check rights before ingestion or redistribution.

Scribd discovery/sample:
- https://www.scribd.com/document/520541331/Laghu-Siddh%C4%81nta-Kaumud%C4%AB-Bhaim%C4%ABvy%C4%81khy

## Excluded

**Ashtadhyayi.com — all content as an ingestion source.**

This includes:
- its Siddhānta-Kaumudī text
- its Mahābhāṣya text
- its Vasu digitisation
- its concordance/data files
- its modern commentary
- any other site-hosted text

Even where the underlying classical work is public domain, DGE should obtain the text independently when practical.

## Important provenance rule

For every ingested text, store:

- work
- author
- edition
- editor
- publication year
- original source
- digitisation source
- licence/public-domain basis
- OCR method
- proofing status
- page/folio reference
- relationship to other texts
- whether the source is canonical, reference-only, or alignment-only

## Key URLs

### Structured / machine-readable
- Dhaval Patel Siddhānta-Kaumudī XML: https://github.com/drdhaval2785/siddhantakaumudi
- Dhaval Patel raw XML: https://raw.githubusercontent.com/drdhaval2785/siddhantakaumudi/master/sk.xml
- SARIT Vākyapadīya XML: https://github.com/sarit/SARIT-corpus/blob/master/bhartrhari-vakyapadiya.xml
- GTNM Aṣṭādhyāyī commentary alignment: https://archive.gtnmtn.org/sutras/

### Historical / scan sources
- Vasu Siddhānta-Kaumudī collection: https://archive.org/details/Siddhanta_Kaumudi_English_Translation-SC_Vasu
- Vasu Volume 1 OCR: https://archive.org/stream/Siddhanta_Kaumudi_English_Translation-SC_Vasu/SiddhantaKaumudiEngTranslationScVasuVolume1-1906_djvu.txt
- Wilbour Hall Sanskrit collection: https://www.wilbourhall.org/
- Prakriyā-Kaumudī: https://archive.org/details/prakriyakaumudi
- Laghuśabdenduśekhara Unicode: https://www.ebharatisampat.in/readunicode.php?id=NDY3Njc5MzYwMzE3NDk5

### Lakṣmī-ṭīkā
- Sabhāpati Śarmā Upādhyāya, Siddhānta-Kaumudī with Lakṣmī commentary — bibliographic record: https://ci.nii.ac.jp/ncid/BA84096130

### Modern Hindi
- Śrīdharamukhollāsinī catalogue: https://ci.nii.ac.jp/ncid/BA84341132
- Govindācārya / publication bibliography lead: https://gurukulsanskritam.org/प्रकाशन/
- Ratnaprabhā catalogue: https://ci.nii.ac.jp/ncid/BA46958455
- Puṣpāñjali scholarly reference: https://groups.google.com/g/bvparishat/c/l0BDuyY56a0
- Bhaimīvyākhyā Scribd sample: https://www.scribd.com/document/520541331/Laghu-Siddh%C4%81nta-Kaumud%C4%AB-Bhaim%C4%ABvy%C4%81khy

## Immediate acquisition order

1. Dhaval Patel Siddhānta-Kaumudī XML
2. Vākyapadīya SARIT XML
3. S.C. Vasu Siddhānta-Kaumudī
4. Kāśikā + Nyāsa + Padamañjarī
5. Mahābhāṣya
6. Tattvabodhinī
7. Bālamanoramā
8. Prauḍha-Manoramā
9. Prakriyā-Kaumudī + Prakriyā-Pradīpa
10. Laghuśabdenduśekhara
11. Paribhāṣenduśekhara
12. Sabhāpati Śarmā Upādhyāya's Sanskrit Lakṣmī-ṭīkā
13. Pushpa Dikṣita's Sahajabodha
14. Śrīdharamukhollāsinī
15. Ratnaprabhā
16. Puṣpāñjali
