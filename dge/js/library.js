// dge/js/library.js — Library browser modal, window.openLibraryModal().
// Renders every POPULATED grantha from data/library.json as a collapsible
// TREE mirroring the real taxonomy folder structure, rather than one flat
// list per top-level category. With four Vedas x shakha x samhita x
// mandala/kanda now live, a flat list interleaved unrelated texts
// (Rigveda mandala 1, Atharvaveda kanda 1, Rigveda mandala 2 ...) and
// gave no sense of where anything sat in the corpus.
// Deliberately excludes unpopulated entries — the catalog lists hundreds
// of planned granthas, and showing empty placeholders would look broken.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['library.js'] = 'v3.12 (layer-manifest drawer fold: a joinable multi-layer grantha\'s mula+tika_* catalog entries collapse to ONE tree leaf via dgeFoldLayerEntries, gated strictly by data/layer_manifest.json; unjoinable layers keep their own rows. See dge/MULTI_LAYER_READER_ARCHITECTURE.md. On top of v3.11\'s purana_class facet)';

// Display names for path segments, stored in DEVANAGARI as the single
// source of truth — every label is then run through the app's existing
// applyTransliteration() into whichever script the user has selected
// (Sanskrit / English-IAST / Kannada / Telugu / Tamil / Malayalam).
// Previously these were hardcoded IAST while grantha titles rendered in
// Devanagari, so the same menu mixed two scripts and neither responded
// to the script selector.
// Anything not listed falls back to dgeAutoLabel(), which is ASCII and
// deliberately left untransliterated — a folder name we have no Sanskrit
// name for shouldn't be mangled through a Devanagari->script converter.
const DGE_PATH_LABELS = {
  vedas: 'वेदाः', stotras: 'स्तोत्राणि', puranas: 'पुराणानि',
  itihasas: 'इतिहासाः', smritis: 'स्मृतयः', sutras: 'सूत्राणि',
  dharmashastra: 'धर्मशास्त्रम्', pancharatra_agama: 'पाञ्चरात्रागमः',
  sarvamoola_grantha: 'सर्वमूलग्रन्थाः', dasakuta: 'दासकूटः',
  vyasakuta: 'व्यासकूटः', dasa_sahitya: 'दाससाहित्यम्',
  koshas: 'कोशाः', ancillary: 'अङ्गानि',

  // The branches of the recommended DGE taxonomy (DGE_Shastra_Taxonomy.md).
  // Listed whether or not the corpus has been moved onto it yet: the Library
  // Manager can regroup the tree onto these names without the folders moving
  // (see the "moves" map in admin/config/library-overrides.json, and
  // tools/restructure_taxonomy.py), and an unlabelled segment falls back to
  // ASCII, which would leave a Sanskrit tree with English branch headings.
  vedanga: 'वेदाङ्गानि',
  shiksha: 'शिक्षा', chandas: 'छन्दः', nirukta: 'निरुक्तम्',
  jyotisha: 'ज्योतिषम्', kalpa: 'कल्पः', pratishakhya: 'प्रातिशाख्यानि',
  vyakarana: 'व्याकरणम्',
  ashtadhyayi: 'अष्टाध्यायी', dhatupatha: 'धातुपाठः', vritti: 'वृत्तिः',

  darshana: 'दर्शनानि', vedanta: 'वेदान्तः',
  dvaita: 'द्वैतम्', advaita: 'अद्वैतम्', vishishtadvaita: 'विशिष्टाद्वैतम्',
  nyaya: 'न्यायः', vaisheshika: 'वैशेषिकम्', sankhya: 'साङ्ख्यम्',
  yoga: 'योगः', mimamsa: 'मीमांसा',
  // 23 Aug 2026 restructure (origin/main): the separate top-level
  // dvaitavedanta/ tree moved to sit beside SarvaMula here (admin-only,
  // see the visibility flag on its taxonomy/library.json entries --
  // dgeIsHiddenGrantha below). SetuTila is an empty placeholder for a
  // second Sarvamula edition. PascalCase matches the actual folder names
  // on disk post-rename -- confirmed directly, not assumed.
  SarvaMula: 'सर्वमूलग्रन्थाः',
  DvaitaVedanta: 'द्वैतवेदान्तः', SetuTila: 'सेतुतिला',
  sarvadarshana_sangraha: 'सर्वदर्शनसङ्ग्रहः',

  // 23 Aug: upaveda/shastra, added per the project lead's own framework
  // (not this session's invention) -- Ayurveda and Dhanurveda under the
  // Upavedas, Natya/Kama/Niti-shastra and Buddhist literature under a
  // Shastra catch-all. See dge/PENDING.md for what's still open (Tantra,
  // Gandharvaveda/Sthapatyaveda have no sourced content yet).
  upaveda: 'उपवेदाः', ayurveda: 'आयुर्वेदः', dhanurveda: 'धनुर्वेदः',
  gandharvaveda: 'गान्धर्ववेदः', sthapatyaveda: 'स्थापत्यवेदः',
  nighantu: 'निघण्टवः', rasashastra: 'रसशास्त्रम्',
  shastra: 'शास्त्राणि', natya_shastra: 'नाट्यशास्त्रम्',
  kama_shastra: 'कामशास्त्रम्', niti_shastra: 'नीतिशास्त्रम्',
  artha_shastra: 'अर्थशास्त्रम्', hitopadesha: 'हितोपदेशः',
  bauddha_sahitya: 'बौद्धसाहित्यम्', sutra: 'सूत्रम्',
  pramana: 'प्रमाणम्', avadana: 'अवदानम्',
  krishi_shastra: 'कृषिशास्त्रम्', shainika_shastra: 'श्यैनिकशास्त्रम्',
  ratna_pariksha: 'रत्नपरीक्षा',

  // 23 Aug: Tantra/Saiva-Sakta cluster, deferred every earlier batch
  // until explicitly requested. shaiva_agama/shakta_agama moved here
  // from under agama.pancharatra (a Vaishnava-specific term that never
  // fit) -- see dge/PENDING.md for that reparenting.
  pashupata: 'पाशुपतम्', pratyabhijna: 'प्रत्यभिज्ञा',
  shaiva_siddhanta: 'शैवसिद्धान्तः', shaiva_agama: 'शैवागमः',
  shakta_agama: 'शाक्तागमः', natha_sampradaya: 'नाथसम्प्रदायः',

  itihasa: 'इतिहासाः', purana: 'पुराणानि',
  ramayana: 'रामायणम्', ananda_ramayana: 'आनन्दरामायणम्',
  adbhuta_ramayana: 'अद्भुतरामायणम्',
  // Not a category anyone would claim: a holding place for material whose
  // home is not settled. Named plainly so it reads as temporary.
  misc: 'अन्यत्',
  smriti_dharma: 'स्मृतिधर्मशास्त्राणि', smriti: 'स्मृतयः',
  kavya_alankara: 'काव्यालङ्कारौ', kavya: 'काव्यम्',
  kosha: 'कोशाः', stotra: 'स्तोत्राणि',
  agama: 'आगमाः', pancharatra: 'पाञ्चरात्रम्',
  pancharatra_samhitas: 'पाञ्चरात्रसंहिताः', shaiva_agama: 'शैवागमः',
  shakta_agama: 'शाक्तागमः', vaikhanasa_agama: 'वैखानसागमः',
  nitishastra: 'नीतिशास्त्रम्', upaveda: 'उपवेदाः',
  ayurveda: 'आयुर्वेदः', kamashastra: 'कामशास्त्रम्', nighantu: 'निघण्टुः',

  rigveda: 'ऋग्वेदः', yajurveda: 'यजुर्वेदः',
  samaveda: 'सामवेदः', atharvaveda: 'अथर्ववेदः',

  krishna_yajurveda: 'कृष्णयजुर्वेदः', shukla_yajurveda: 'शुक्लयजुर्वेदः',

  shakala_shakha: 'शाकलशाखा', bashkala_shakha: 'बाष्कलशाखा',
  shaunaka_shakha: 'शौनकशाखा', paippalada_shakha: 'पैप्पलादशाखा',
  kauthuma_shakha: 'कौथुमशाखा', ranayaniya_shakha: 'राणायनीयशाखा',
  jaiminiya_shakha: 'जैमिनीयशाखा', taittiriya_shakha: 'तैत्तिरीयशाखा',
  maitrayani_shakha: 'मैत्रायणीशाखा', katha_shakha: 'कठशाखा',
  vajasaneyi_madhyandina_shakha: 'वाजसनेयिमाध्यन्दिनशाखा',
  vajasaneyi_kanva_shakha: 'वाजसनेयिकाण्वशाखा',

  samhita: 'संहिता', brahmana: 'ब्राह्मणम्', brahmanas: 'ब्राह्मणानि',
  aranyaka: 'आरण्यकम्', aranyakas: 'आरण्यकानि',
  upanishad: 'उपनिषत्', upanishads: 'उपनिषदः',
  mula: 'मूलम्', tika: 'टीका', tippani: 'टिप्पणी',
  purvarchika: 'पूर्वार्चिकः', uttararchika: 'उत्तरार्चिकः',
  taittiriya_brahmana: 'तैत्तिरीयब्राह्मणम्',
  taittiriya_aranyaka: 'तैत्तिरीयारण्यकम्',

  // Mahabharata parvas
  adi_parva: 'आदिपर्व', sabha_parva: 'सभापर्व', vana_parva: 'वनपर्व', virata_parva: 'विराटपर्व',
  udyoga_parva: 'उद्योगपर्व', bhishma_parva: 'भीष्मपर्व', drona_parva: 'द्रोणपर्व', karna_parva: 'कर्णपर्व',
  shalya_parva: 'शल्यपर्व', sauptika_parva: 'सौप्तिकपर्व', stri_parva: 'स्त्रीपर्व', shanti_parva: 'शान्तिपर्व',
  anushasana_parva: 'अनुशासनपर्व', ashvamedhika_parva: 'अश्वमेधिकपर्व', ashramavasika_parva: 'आश्रमवासिकपर्व', mausala_parva: 'मौसलपर्व',
  mahaprasthanika_parva: 'महाप्रस्थानिकपर्व', svargarohana_parva: 'स्वर्गारोहणपर्व',
  // Ramayana kandas
  bala_kanda: 'बालकाण्डम्', ayodhya_kanda: 'अयोध्याकाण्डम्', aranya_kanda: 'अरण्यकाण्डम्', kishkindha_kanda: 'किष्किन्धाकाण्डम्',
  sundara_kanda: 'सुन्दरकाण्डम्', yuddha_kanda: 'युद्धकाण्डम्', uttara_kanda: 'उत्तरकाण्डम्',
  // Itihasa/Kavya misc
  mahabharata: 'महाभारतम्', mahabharata_kannada: 'महाभारतम् (कन्नड)', harivamsha: 'हरिवंशः', harivamsha_khila: 'हरिवंशखिलम्',
  bhagavad_gita: 'भगवद्गीता', purushasuktam: 'पुरुषसूक्तम्', yamaka_bharata: 'यमकभारतम्', raghavendra_vijaya: 'राघवेन्द्रविजयः',
  sumadhva_vijaya: 'सुमध्वविजयः', kiratarjuniya: 'किरातार्जुनीयम्', kumarasambhava: 'कुमारसम्भवः', raghuvamsha: 'रघुवंशः',
  shishupalavadha: 'शिशुपालवधः',
  // Puranas
  maha_purana: 'महापुराणानि', upa_purana: 'उपपुराणानि', upapuranas: 'उपपुराणानि',
  bhagavata_purana: 'भागवतपुराणम्', bhagavata_purana_madhva: 'भागवतपुराणम् (माध्वम्)', bhavishya_purana: 'भविष्यपुराणम्', brahmanda_purana: 'ब्रह्माण्डपुराणम्',
  brahma_purana: 'ब्रह्मपुराणम्', agni_purana: 'अग्निपुराणम्', varaha_purana: 'वराहपुराणम्', vayu_purana: 'वायुपुराणम्',
  brahmavaivarta_purana: 'ब्रह्मवैवर्तपुराणम्', garuda_purana: 'गरुडपुराणम्', kurma_purana: 'कूर्मपुराणम्', linga_purana: 'लिङ्गपुराणम्',
  markandeya_purana: 'मार्कण्डेयपुराणम्', narada_purana: 'नारदपुराणम्', padma_purana: 'पद्मपुराणम्', shiva_purana: 'शिवपुराणम्',
  skanda_purana: 'स्कन्दपुराणम्', vamana_purana: 'वामनपुराणम्', vishnu_purana: 'विष्णुपुराणम्',
  vishnu_dharmottara_purana: 'विष्णुधर्मोत्तरपुराणम्', devi_bhagavata_purana: 'देवीभागवतपुराणम्', kalika_purana: 'कालिकापुराणम्',
  narasimha_purana: 'नृसिंहपुराणम्', brihannaradiya_purana: 'बृहन्नारदीयपुराणम्', saura_purana: 'सौरपुराणम्',
  ganesha_purana: 'गणेशपुराणम्', sanatkumara_purana: 'सनत्कुमारपुराणम्', nandi_purana: 'नन्दिपुराणम्', adi_purana: 'आदिपुराणम्',
  rudra_samhita: 'रुद्रसंहिता',
  // Dvaita Tatparya Nirnaya corpus (prasthanas, bhashyas)
  gita_prasthana: 'गीताप्रस्थानम्', sutra_prasthana: 'सूत्रप्रस्थानम्', upanishad_prasthana: 'उपनिषत्प्रस्थानम्', itihasa_prasthana: 'इतिहासप्रस्थानम्',
  purana_prasthana: 'पुराणप्रस्थानम्', sruti_prasthana: 'श्रुतिप्रस्थानम्', gita_bhashya: 'गीताभाष्यम्', gita_tatparya_nirnaya: 'गीतातात्पर्यनिर्णयः',
  itihasa_purana_tatparya_nirnaya: 'इतिहासपुराणतात्पर्यनिर्णयः', bhagavata_tatparya_nirnaya: 'भागवततात्पर्यनिर्णयः', mahabharata_tatparya_nirnaya: 'महाभारततात्पर्यनिर्णयः', rig_bhashya: 'ऋग्भाष्यम्',
  anubhashya: 'अणुभाष्यम्', anuvyakhyana: 'अनुव्याख्यानम्', brahma_sutra_bhashya: 'ब्रह्मसूत्रभाष्यम्', brahmasutra_bhashya: 'ब्रह्मसूत्रभाष्यम्',
  nyaya_vivarana: 'न्यायविवरणम्', upanishad_bhashya: 'उपनिषद्भाष्यम्', aitareya_upanishad: 'ऐतरेयोपनिषत्', aitareyopanishad_bhashya: 'ऐतरेयोपनिषद्भाष्यम्',
  brihadaranyakopanishad_bhashya: 'बृहदारण्यकोपनिषद्भाष्यम्', brihadaranyakopanishadbhashyam: 'बृहदारण्यकोपनिषद्भाष्यम्', chandogyopanishad_bhashya: 'छान्दोग्योपनिषद्भाष्यम्', ishavasyopanishad_bhashya: 'ईशावास्योपनिषद्भाष्यम्',
  kathopanishad_bhashya: 'कठोपनिषद्भाष्यम्', kenopanishad_bhashya: 'केनोपनिषद्भाष्यम्', mandukyopanishad_bhashya: 'माण्डूक्योपनिषद्भाष्यम्', mandukyopanishadbhashyam: 'माण्डूक्योपनिषद्भाष्यम्',
  mundakopanishad_bhashya: 'मुण्डकोपनिषद्भाष्यम्', mundakopanishadbhashyam: 'मुण्डकोपनिषद्भाष्यम्', prashnopanishad_bhashya: 'प्रश्नोपनिषद्भाष्यम्', taittiriyopanishad_bhashya: 'तैत्तिरीयोपनिषद्भाष्यम्',
  shatprashnopanishadbhashyam: 'षट्प्रश्नोपनिषद्भाष्यम्', nrisimhatapaniya_upanishad: 'नृसिंहतापनीयोपनिषत्', vaishnava_upanishads_group: 'वैष्णवोपनिषदः',
  // Madhva's Dasha Prakarana + ancillary works
  dasha_prakarana_granthas: 'दशप्रकरणग्रन्थाः', karma_nirnaya: 'कर्मनिर्णयः', katha_lakshana: 'कथालक्षणम्', mayavada_khandana: 'मायावादखण्डनम्',
  pramana_lakshana: 'प्रमाणलक्षणम्', prapancha_mithyatvanumana_khandana: 'प्रपञ्चमिथ्यात्वानुमानखण्डनम्', tattva_sankhyana: 'तत्त्वसंख्यानम्', tattva_viveka: 'तत्त्वविवेकः',
  tattvodyota: 'तत्त्वोद्योतः', upadhi_khandana: 'उपाधिखण्डनम्', vishnu_tattva_vinirnaya: 'विष्णुतत्त्वविनिर्णयः', achara_and_ancillary_granthas: 'आचारादिग्रन्थाः',
  sutra_and_bhashya: 'सूत्रभाष्यम्', independent_dharmasutras: 'स्वतन्त्रधर्मसूत्राणि',
  // Post-Madhva acharyas and their works
  jayanti_nirnaya: 'जयन्तीनिर्णयः', kanduka_stuti: 'कन्दुकस्तुतिः', krishnamrita_maharnava: 'कृष्णामृतमहार्णवः', nakha_stuti: 'नखस्तुतिः',
  sadachara_smriti: 'सदाचारस्मृतिः', tantrasara_sangraha: 'तन्त्रसारसङ्ग्रहः', yati_pranava_kalpa: 'यतिप्रणवकल्पः', dvadasha_stotra: 'द्वादशस्तोत्रम्',
  vagvajra: 'वाग्वज्रः', karmavijaya: 'कर्मविजयः', later_acharyas: 'उत्तराचार्याः', raghavendra_tirtha: 'राघवेन्द्रतीर्थः',
  vadiraja_tirtha: 'वादिराजतीर्थः', vyasatirtha: 'व्यासतीर्थः', vijayadasa: 'विजयदासः', purandaradasa: 'पुरन्दरदासः',
  kanakadasa: 'कनकदासः', jagannathadasa: 'जगन्नाथदासः', gopaladasa: 'गोपालदासः', mahipatidasa: 'महीपतिदासः',
  prasannavenkatadasa: 'प्रसन्नवेङ्कटदासः', nyayamrita: 'न्यायामृतम्', tarka_tandava: 'तर्कताण्डवः', madhvamukhalankara: 'मध्वमुखालङ्कारः',
  madhvasiddhantasara: 'मध्वसिद्धान्तसारः', sarvasiddhantasarasaravivecanam: 'सर्वसिद्धान्तसारसारविवेचनम्', shrimanmadhvasiddhantasaroddhara: 'श्रीमन्मध्वसिद्धान्तसारोद्धारः', shrimannyayasudhamandanam: 'श्रीमन्न्यायसुधामण्डनम्',
  shrivijayindravijayavaibhavam: 'श्रीविजयीन्द्रविजयवैभवम्', dvaita_dyumani: 'द्वैतद्युमणिः', bhedaparanyeva_khalu_brahmasutrani: 'भेदपराण्येव खलु ब्रह्मसूत्राणि', bhedojjivana: 'भेदोज्जीवनम्',
  bhagavato_nirdoshatvalakshanam: 'भागवतनिर्दोषत्वलक्षणम्', candrikamandanam: 'चन्द्रिकामण्डनम्', tatparya_chandrika: 'तात्पर्यचन्द्रिका', nyaya_sudha: 'न्यायसुधा',
  tantradipika: 'तन्त्रदीपिका', vadavali: 'वादावली', yukti_mallika: 'युक्तिमल्लिका', nyasa_paddhati: 'न्यासपद्धतिः',
  // Vedanta/general Vedantic terms
  omkara_vada: 'ओंकारवादः', vyutpattivada: 'व्युत्पत्तिवादः', shabda_khanda: 'शब्दखण्डः', tithi_nirnaya: 'तिथिनिर्णयः',
  shaktivada: 'शक्तिवादः', samanya_nirukti: 'सामान्यनिरुक्तिः',
  // Nyaya/Vaisheshika (classical + Navya)
  navya_nyaya: 'नव्यन्यायः', nyaya_bhushana: 'न्यायभूषणम्', nyaya_kusumanjali: 'न्यायकुसुमाञ्जलिः', nyaya_manjari: 'न्यायमञ्जरी',
  nyaya_ratnamala: 'न्यायरत्नमाला', nyaya_sutra: 'न्यायसूत्रम्', vaisheshika_sutra: 'वैशेषिकसूत्रम्', prachina_nyaya: 'प्राचीनन्यायः',
  prashastapada_bhashya: 'प्रशस्तपादभाष्यम्', tarkasangraha: 'तर्कसङ्ग्रहः', tarkabhasha: 'तर्कभाषा', karikavali: 'कारिकावली',
  bhasha_pariccheda: 'भाषापरिच्छेदः', siddhanta_lakshana: 'सिद्धान्तलक्षणम्', padarthasangraha: 'पदार्थसङ्ग्रहः', pramana_paddhati: 'प्रमाणपद्धतिः',
  prakarana_panchika: 'प्रकरणपञ्चिका', prakarana: 'प्रकरणम्', pramukha_prakarana: 'प्रमुखप्रकरणानि', vyaptyanugama: 'व्याप्त्यनुगमः',
  pakshata: 'पक्षता', badha: 'बाधः', badha_vibhajaka: 'बाधविभाजकः', avacchedakata_nirukti: 'अवच्छेदकतानिरुक्तिः',
  avayava: 'अवयवः', anumana_khanda: 'अनुमानखण्डः', chaturdashalakshani: 'चतुर्दशलक्षणी', panchalakshani: 'पञ्चलक्षणी',
  satpratipaksha: 'सत्प्रतिपक्षः', savyabhichara: 'सव्यभिचारः', vyadhikarana: 'व्यधिकरणम्', upamana_khanda: 'उपमानखण्डः',
  pratyaksha_khanda: 'प्रत्यक्षखण्डः', vadas: 'वादाः', tattvacintamani: 'तत्त्वचिन्तामणिः',
  // Mimamsa
  mimamsa_nyaya_prakasha: 'मीमांसान्यायप्रकाशः', mimamsa_paribhasha: 'मीमांसापरिभाषा', mimamsa_sutra: 'मीमांसासूत्रम्', tantravarttika: 'तन्त्रवार्त्तिकम्',
  tuptika: 'टुप्टीका', shlokavarttika: 'श्लोकवार्त्तिकम्', shastra_dipika: 'शास्त्रदीपिका', bhatta_dipika: 'भट्टदीपिका',
  bhatta_rahasya: 'भट्टरहस्यम्', arthasangraha: 'अर्थसङ्ग्रहः', bhatta: 'भाट्टम्', prabhakara: 'प्राभाकरम्',
  brihati: 'बृहती',
  // Vedic Kalpa-sutra schools (Grihya/Shrauta/Dharma-sutra)
  apastamba: 'आपस्तम्बः', ashvalayana: 'आश्वलायनः', baudhayana: 'बौधायनः', bharadvaja: 'भारद्वाजः',
  drahyayana: 'द्राह्यायणः', gobhila: 'गोभिलः', hiranyakeshin: 'हिरण्यकेशी', katyayana: 'कात्यायनः',
  kaushika: 'कौशिकः', kauthuma: 'कौथुमः', khadira: 'खादिरः', latyayana: 'लाट्यायनः',
  manava: 'मानवः', paraskara: 'पारस्करः', shankhayana: 'शाङ्खायनः', vadhula: 'वाधूलः',
  vaikhanasa: 'वैखानसः', vaitana: 'वैतानः', varaha: 'वाराहः', kathaka: 'काठकः',
  satyashadha: 'सत्याषाढः', kapisthala_shakha: 'कपिष्ठलशाखा', jaiminiya: 'जैमिनीयः', jaiminiya_nyayamala: 'जैमिनीयन्यायमाला',
  // Vedic shiksha/pratishakhya
  atharvaveda_shiksha: 'अथर्ववेदशिक्षा', rigveda_shikshas: 'ऋग्वेदशिक्षाः', samaveda_shikshas: 'सामवेदशिक्षाः', krishna_yajurveda_shikshas: 'कृष्णयजुर्वेदशिक्षाः',
  shukla_yajurveda_shikshas: 'शुक्लयजुर्वेदशिक्षाः', yajurveda_shikshas: 'यजुर्वेदशिक्षाः', samaveda_pratishakhya: 'सामवेदप्रातिशाख्यम्', purvabhaga: 'पूर्वभागः',
  // Vyakarana
  mahabhashya_patanjali: 'महाभाष्यम् (पतञ्जलिः)', siddhanta_kaumudi: 'सिद्धान्तकौमुदी',
  // Chandas
  vrittaratnakara: 'वृत्तरत्नाकरः',
  // Agama restructure (25 Aug 2026) -- Vaishnava/Shaiva/Shakta/Kashmir Saiva/
  // Natha-Hathayoga split, see dge/PENDING.md
  vaishnava_agama: 'वैष्णवागमः', shakta_tantra: 'शाक्ततन्त्रम्', shakta_shaiva: 'शाक्तशैवम्',
  kashmir_shaivism: 'कश्मीरशैवम्', spanda: 'स्पन्दः', trika: 'त्रिकम्', krama: 'क्रमः',
  shiva_sutra: 'शिवसूत्राणि', shiva_sutra_vartika: 'शिवसूत्रवार्त्तिकम्',
  natha_hathayoga: 'नाथहठयोगौ', natha: 'नाथसम्प्रदायः', hathayoga: 'हठयोगः',
  yamunacharya: 'यामुनाचार्यः', samvitsiddhi: 'संवित्सिद्धिः', shaiva_tantra: 'शैवतन्त्रम्',
  mahacina_tantra: 'महाचीनतन्त्रम्', matrikabheda_tantra: 'मातृकाभेदतन्त्रम्',
  todala_tantra: 'तोडलतन्त्रम्', uddamareshvara_tantra: 'उड्डामरेश्वरतन्त्रम्',
  devikalottara_agama: 'देवीकालोत्तरागमः', shakta_vijnana: 'शाक्तविज्ञानम्',
  vatulanatha_sutras: 'वातूलनाथसूत्राणि', mrigendra_tantra: 'मृगेन्द्रतन्त्रम्',
  pashupata_sutra: 'पाशुपतसूत्रम्', ganakarika: 'गणकारिका', spanda_karika: 'स्पन्दकारिका',
  tantraloka: 'तन्त्रालोकः', tantrasara: 'तन्त्रसारः', amaraughashasana: 'अमरौघशासनम्',
  gorakshashataka: 'गोरक्षशतकम्', gheranda_samhita: 'घेरण्डसंहिता', hathayogapradipika: 'हठयोगप्रदीपिका',
  // Pancharatra Ratnatraya/Pramukha/Anya regroup (25 Aug 2026)
  ratnatraya: 'रत्नत्रयम्', pramukha_samhitas: 'प्रमुखाः पाञ्चरात्रसंहिताः', anya_samhitas: 'अन्याः उपलब्धाः संहिताः',
  // Advaita corpus + misc
  shankara_bhashya: 'शङ्करभाष्यम्', badhanta: 'बाधान्तः', brahmasutranyayasamgraha: 'ब्रह्मसूत्रन्यायसंग्रहः',
  // Dasa Sahitya composers (25 Aug 2026 taxonomy integration) --
  // Devanagari transliteration of each composer's own Kannada name in
  // dge/data/dasa_sahitya/index.json (generated with indic_transliteration,
  // the same library tools/dasa_sahitya/*.py uses for the compositions
  // themselves), plus hand-attested Devanagari for the major composers
  // whose index.json name is Latin (Purandara/Vijaya/Kanaka Dasaru etc.).
  // A handful of singleton, likely-mis-attributed 'composer' entries
  // (a title filed as a composer name, one URL-garbled slug, the honest
  // 'untitled' bucket) are left out on purpose rather than guessed --
  // see dge/data/dasa_sahitya_local/ARCHITECTURE.md.
  composers: 'दाससाहित्यरचयितारः',
  acalanamdadasa: 'अचलानंददास', aihole_vemkatesa: 'ऐहॊळॆ वॆंकटेश', ambabayi: 'अंबाबायि', anamtadrisaru: 'अनंताद्रीशरु', anyadasaru: 'अन्यदासरु',
  askihala_govimda: 'अस्किहाळ गोविंद', asuri_ramasvamiayyamgar: 'असूरि रामस्वामिअय्यंगार्', badannayyacaryaru: 'बडण्णय्याचार्यरु', bagepalli_sesadasaru: 'बागेपल्लि शेषदासरु', belle_dasappayya: 'बॆळ्ळॆ दासप्पय्य',
  beluru_vaikumthadasaru: 'बेलूरु वैकुंठदासरु', beteraya_diksitaru: 'बेटॆराय दीक्षितरु', bhatakala_appayya: 'भटकळ अप्पय्य', bhavatarakaru: 'भावतरकरु', bhimasamkara: 'भीमाशंकर',
  bhupati_vithalaru: 'भूपति विठलरु', bolara_vasudevayya: 'बोळारा वासुदेवय्य', cannapattanada_ahobaladasaru: 'चन्नपट्टणद अहोबलदासरु', cidanamda_avadhutaru: 'चिदानंद अवधूतरु', dhanvanthri: 'धन्वन्तरिः',
  durga: 'दुर्गा', galagaliavvanavaru: 'गलगलिअव्वनवरु', gopala_dasaru: 'गोपालदासरु', gopalaryaru: 'गोपालार्यरु', gopativithalaru: 'गोपतिविठलरु',
  govimdadasa: 'गोविंददास', gumdamma: 'गुंडम्म', gurugovimdavithalaru: 'गुरुगोविंदविठलरु', guruimdiresaru: 'गुरुइंदिरेशरु', gurujagannathadasaru: 'गुरुजगन्नाथदासरु',
  gurupranesavithalaru: 'गुरुप्राणेशविठलरु', gururamalimga: 'गुरुरामलिंग', gururamavithala: 'गुरुरामविठल', gurutamdevaradagopalavithalaru: 'गुरुतंदॆवरदगोपालविठलरु', guruvijayaviththalaru: 'गुरुविजयविठ्ठलरु',
  hanumesavithala: 'हनुमेशविठल', harapanahalli_bheemavva: 'हरपनहळ्ळि भीमव्वा', hasanmukha_vithalaru: 'हसन्मुख विठलरु', helavanakatte_giriyamma: 'हॆळवनकट्टॆ गिरियम्मा', henneramgadasaru: 'हॆन्नॆरंगदासरु',
  hosakere_cidambarayyanavaru: 'हॊसकॆरॆ चिदंबरय्यनवरु', imdiresaru: 'इंदिरेशरु', jagannatha_dasaru: 'जगन्नाथदासरु', jakkappayyanavaru: 'जक्कप्पय्यनवरु', jayesavithala: 'जयेशविठल',
  jnanabodakaru: 'ज्ञानबोदकरु', kadarumdalagi_hanumayya: 'कदरुंडलगि हनुमय्य', kadarumdalagisaru: 'कदरुंडलगीशरु', kakhamdaki_sri_krsnadasaru: 'काखंडकि श्री कृष्णदासरु', kakhamdaki_sri_mahipatirayaru: 'काखंडकि श्री महिपतिरायरु',
  kalasada_sumdaramma: 'कळसद सुंदरम्म', kamalapativiththalaru: 'कमलपतिविठ्ठलरु', kanaka_dasaru: 'कनकदासरु', karki_kesavadasa: 'कर्कि केशवदास', karpara_naraharidasaru: 'कार्पर नरहरिदासरु',
  kavi_laksmisa: 'कवि लक्ष्मीश', kavi_paramadevadasaru: 'कवि परमदेवदासरु', keladi_vemkanna_kavi: 'कॆळदि वॆंकण्ण कवि', kesavaviththalaru: 'केशवविठ्ठलरु', kosala_purisara: 'कोसल पुरीशर',
  krsnavithaladasaru: 'कृष्णविठलदासरु', laksminarayanarayaru: 'लक्ष्मीनारयणरायरु', mahanithivithala: 'महानिथिविठल', mahipathi_dasaru: 'महीपतिदासरु', malige_ramgasvamidasaru: 'मळिगॆ रंगस्वामिदासरु',
  mohana_dasaru: 'मोहनदासरु', muddumohanavithaladasaru: 'मुद्दुमोहनविठलदासरु', namjanagudu_tirumalamba: 'नंजनगूडु तिरुमलांबा', narasimha: 'नरसिंह', narasimhavithalaru: 'नरसिंहविठलरु',
  narayanadasaru: 'नारायणदासरु', nidaguruki_jivubayi: 'निडगुरुकि जीवूबायि', orabayi_laksmidevamma: 'ओरबायि लक्ष्मीदेवम्म', pamduramga: 'पांडुरंग', parisistam: 'परिशिष्टं',
  pavamje_laksminarnappayya: 'पावंजॆ लक्ष्मीनार्णप्पय्य', pradyumnatirtharu: 'प्रद्युम्नतीर्थरु', pranesha_dasaru: 'प्राणेशदासरु', prasanna_srinivasadasaru: 'प्रसन्न श्रीनिवासदासरु', prasanna_venkata_dasaru: 'प्रसन्नवेङ्कटदासरु',
  purandara_dasaru: 'पुरन्दरदासरु', radhabayi: 'राधाबायि', raghavendra: 'राघवेन्द्रः', raghuramavithaladasaru: 'रघुरामविठलदासरु', rajagopaladasaru: 'राजगोपालदासरु',
  ramadasaru: 'रामदासरु', ramapativithalaru: 'रमापतिविठलरु', ramgadasaru: 'रंगदासरु', ramgesavithaladasaru: 'रंगेशविठलदासरु', rukmamgadaru: 'रुक्मांगदरु',
  sadanamdaru: 'सदानंदरु', samasarmaru: 'शामशर्मरु', samasumdara_vithala: 'शामसुंदर विठल', samkarabhatta_agnihotri: 'शंकरभट्ट अग्निहोत्रि', sampattayyamgar: 'संपत्तय्यंगार्',
  samtibayi: 'शांतिबायि', saraguru_vemkatavaradaryaru: 'सरगूरु वॆंकटवरदार्यरु', sarasabayi: 'सरसाबायि', sarasvati_bayi: 'सरस्वति बायि', shyama_sundara_dasaru: 'श्यामसुन्दरदासरु',
  siddhagurutripuramtaka: 'सिद्धगुरुत्रिपुरांतक', sirigovimdavithala: 'सिरिगोविंदविठल', sirigurutamdevaradavithalaru: 'सिरिगुरुतंदॆवरदविठलरु', sirivatsamkitaru: 'सिरिवत्सांकितरु', sirivithalaru: 'सिरिविठलरु',
  sivaramaru: 'शिवरामरु', sridavithalaru: 'श्रीदविठलरु', srinidhivithalaru: 'श्रीनिधिविठलरु', sripadarajaru: 'श्रीपादराजरु', sripati: 'श्रीपति',
  srisa_kesavadasaru: 'श्रीश केशवदासरु', srisapranesavithalaru: 'श्रीशप्राणेशविठलरु', tamde_muddumohana_vithalaru: 'तंदॆ मुद्दुमोहन विठलरु', tamde_srinarahari: 'तंदॆ श्रीनरहरि', tamdevaradagopalavithalaru: 'तंदॆवरदगोपालविठलरु',
  timmappadasaru: 'तिम्मप्पदासरु', tulasiramadasaru: 'तुळसीरामदासरु', tupaki_vemkataramanacarya: 'तुपाकि वॆंकटरमणाचार्य', uragadrivasavithaladasaru: 'उरगाद्रिवासविठलदासरु', vadirajaru: 'वादिराजरु',
  varadesavithala: 'वरदेशविठल', varahatimmappa: 'वरहतिम्मप्प', varavaniramarayadasaru: 'वरावाणिरामरायदासरु', vemkatadasaru: 'वॆंकटदासरु', vemkatavaradaryaru: 'वॆंकटवरदार्यरु',
  vemkatesavitthala: 'वॆंकटेशविट्ठल', vemkatrav: 'वॆंकट्राव्', venugopaladasaru: 'वेणुगोपालदासरु', vidyakamtayatigalu: 'विद्याकांतयतिगळु', vidyaprasannatirtharu: 'विद्याप्रसन्नतीर्थरु',
  vidyaratnakaratirtharu: 'विद्यारत्नाकरतीर्थरु', vijaya_dasaru: 'विजयदासरु', vijaya_ramacamdravithala: 'विजय रामचंद्रविठल', vijayimdratirtharu: 'विजयींद्रतीर्थरु', viranarayana: 'वीरनारायण',
  visvapati: 'विश्वपति', visvemdratirtha: 'विश्वॆंद्रतीर्थ', vyasarayaru: 'व्यासरायरु', vyasatatvajnadasaru: 'व्यासतत्वज्ञदासरु', vyasaviththalaru: 'व्यासविठ्ठलरु',
  yadugiriyamma: 'यदुगिरियम्म',
};

// Numbered folders, e.g. "mandala_07". The prefix is Devanagari (so it
// transliterates with everything else) and the numeral is converted to
// the matching script's digits by the same engine.
const DGE_NUMBERED_PREFIXES = {
  mandala: 'मण्डलम्', kanda: 'काण्डम्', adhyaya: 'अध्यायः',
  skandha: 'स्कन्धः', prapathaka: 'प्रपाठकः', anuvaka: 'अनुवाकः',
  ashtaka: 'अष्टकम्', parva: 'पर्व', sarga: 'सर्गः'
};

const DGE_DEVA_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];
function dgeDevaNum(n) {
  return String(n).split('').map(d => DGE_DEVA_DIGITS[+d]).join('');
}

// A label/title that mixes Devanagari text with plain ASCII digits (e.g.
// a custom curator label like "स्कन्धः 1") passes dgeToActiveScript's
// Devanagari-detection gate as a whole, but the digit run itself is never
// touched by that gate -- it stays ASCII through a non-Devanagari script
// selection too, so the digits don't follow the rest of the label into
// Kannada/Tamil/etc. Converting the digits to Devanagari first lets the
// later transliteration pass carry them through like everything else.
function dgeLocalizeNumerals(text) {
  if (!text || !/[ऀ-ॿ]/.test(text)) return text;
  return text.replace(/\d+/g, m => dgeDevaNum(parseInt(m, 10)));
}

// ---------------------------------------------------------------------- //
// Library Manager curation overrides (admin/library.html exports
// admin/config/library-overrides.json). A NON-DESTRUCTIVE display layer only:
// hide/pin/reorder/rename/move all affect how populated granthas group
// and sort in this tree, never library.json/taxonomy.json or the actual
// fetch path -- dgeGoToGrantha always navigates on the real slug even
// after a display-only move. Absent/empty file = identical to before
// this existed.
// ---------------------------------------------------------------------- //
let dgeLibOverrides = { hidden: [], pinned: [], labels: {}, order: {}, moves: {} };

async function dgeLoadLibraryOverrides() {
  try {
    const url = window.dgeAdminConfigUrl ? window.dgeAdminConfigUrl('library-overrides.json')
                                        : '../admin/config/library-overrides.json';
    const ov = await fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (ov) {
      dgeLibOverrides = {
        hidden: Array.isArray(ov.hidden) ? ov.hidden : [],
        pinned: Array.isArray(ov.pinned) ? ov.pinned : [],
        labels: (ov.labels && typeof ov.labels === 'object') ? ov.labels : {},
        order: (ov.order && typeof ov.order === 'object') ? ov.order : {},
        moves: (ov.moves && typeof ov.moves === 'object') ? ov.moves : {}
      };
      return;
    }
  } catch (e) { /* no overrides file yet */ }
  // Legacy fallback: the older hide-only file, still honored when the
  // newer overrides file doesn't exist yet.
  try {
    const vis = await fetch('data/library-visibility.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (vis && Array.isArray(vis.hidden)) dgeLibOverrides.hidden = vis.hidden;
  } catch (e) { /* nothing hidden */ }
}

// 23 Aug 2026: per-grantha "hidden" flag written directly onto a
// library.json entry (distinct from dgeLibOverrides.hidden above, which is
// an admin-curated path-prefix list read from library-overrides.json) --
// admin-only content like darshana/vedanta/dvaita/DvaitaVedanta/*, gated
// the same way admin-gate.js gates a standalone page. Not real access
// control -- see that file's own caveat -- but keeps it out of the reader
// nav and quick-jump for anyone who isn't signed in as admin.
function dgeIsAdmin() {
  try {
    return localStorage.getItem('acharyaAuthorized') === 'true' ||
           localStorage.getItem('is_superadmin') === 'true';
  } catch (e) { return false; }
}
// admin/library.html's own gate is super-admin only (not the broader
// acharyaAuthorized tier dgeIsAdmin() above accepts) -- matched here so the
// tracker link this file adds is never shown to someone who'd just be
// bounced by that page's own passkey prompt.
function dgeIsSuperAdmin() {
  try { return localStorage.getItem('is_superadmin') === 'true'; }
  catch (e) { return false; }
}
function dgeIsAdminOnlyGrantha(g) {
  return !!(g && g.hidden) && !dgeIsAdmin();
}

function dgeIsHiddenPath(path) {
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    if (dgeLibOverrides.hidden.indexOf(parts.slice(0, i).join('/')) >= 0) return true;
  }
  return false;
}

// A 'move' override is keyed by the REAL taxonomy slug and rewrites where
// a grantha (or, as a side effect, every grantha under that same prefix)
// GROUPS in the tree -- the longest matching source prefix wins so moving
// a deep subfolder isn't shadowed by a move of one of its ancestors.
function dgeEffectiveDisplayPath(realSlug) {
  const moves = dgeLibOverrides.moves;
  let best = null;
  Object.keys(moves).forEach(src => {
    if (realSlug === src || realSlug.indexOf(src + '/') === 0) {
      if (!best || src.length > best.length) best = src;
    }
  });
  if (!best) return realSlug;
  const dest = moves[best];
  const rel = realSlug.slice(best.length).replace(/^\//, '');
  return dest ? (rel ? dest + '/' + rel : dest) : rel;
}

function dgePinRank(path) {
  const i = dgeLibOverrides.pinned.indexOf(path);
  return i < 0 ? Infinity : i;
}
function dgeOrderRank(parentPath, name) {
  const explicit = dgeLibOverrides.order[parentPath];
  if (!explicit) return Infinity;
  const i = explicit.indexOf(name);
  return i < 0 ? Infinity : i;
}
// Pin/order apply WITHIN each of the two existing sibling groups (folders,
// then leaves) rather than fully interleaving them — a deliberately
// smaller scope than the admin tool's own single merged sibling list, to
// avoid restructuring how folders vs. leaves render. A curator can still
// pin/reorder subfolders among themselves, or a grantha among its
// leaf-siblings, just not mix the two groups' order together.
function dgeSortChildKeys(parentPath, keys) {
  return keys.slice().sort((a, b) => {
    const pa = dgePinRank(parentPath ? parentPath + '/' + a : a);
    const pb = dgePinRank(parentPath ? parentPath + '/' + b : b);
    if (pa !== pb) return pa - pb;
    const oa = dgeOrderRank(parentPath, a), ob = dgeOrderRank(parentPath, b);
    if (oa !== ob) return oa - ob;
    return dgeCompareSlugs(a, b);
  });
}
function dgeSortLeaves(parentPath, leaves) {
  return leaves.slice().sort((a, b) => {
    const pa = dgePinRank(a.slug), pb = dgePinRank(b.slug);
    if (pa !== pb) return pa - pb;
    const na = a.slug.split('/').pop(), nb = b.slug.split('/').pop();
    const oa = dgeOrderRank(parentPath, na), ob = dgeOrderRank(parentPath, nb);
    if (oa !== ob) return oa - ob;
    return dgeCompareSlugs(a.slug, b.slug);
  });
}

// Converts a Devanagari label into the user's currently selected script,
// reusing the same engine the reading view uses so the whole app stays
// consistent. Non-Devanagari input (an auto-generated ASCII folder name)
// is returned untouched.
function dgeToActiveScript(devaText) {
  const script = window.activeScript || localStorage.getItem('app_script') || 'devanagari';
  if (script === 'devanagari') return devaText;
  if (!/[\u0900-\u097F]/.test(devaText)) return devaText;
  if (typeof window.applyTransliteration === 'function') {
    try { return window.applyTransliteration(devaText, script); } catch (e) { return devaText; }
  }
  return devaText;
}

function dgeAutoLabel(seg) {
  const m = seg.match(/^([a-z]+)_(\d+)$/i);
  if (m && DGE_NUMBERED_PREFIXES[m[1].toLowerCase()]) {
    return DGE_NUMBERED_PREFIXES[m[1].toLowerCase()] + ' ' + dgeDevaNum(parseInt(m[2], 10));
  }
  // No Sanskrit name known — plain ASCII, left as-is by dgeToActiveScript.
  return seg.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function dgeSegLabel(seg) {
  return dgeToActiveScript(DGE_PATH_LABELS[seg] || dgeAutoLabel(seg));
}

// Compares path segments so "mandala_2" precedes "mandala_10" (numeric
// where both segments share a prefix), while keeping unrelated folders
// properly separated instead of interleaving them purely by trailing
// number — which is what the previous sort did.
function dgeCompareSlugs(a, b) {
  const pa = a.split('/'), pb = b.split('/');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const mx = x.match(/^(.*?)(\d+)$/), my = y.match(/^(.*?)(\d+)$/);
    if (mx && my && mx[1] === my[1]) return parseInt(mx[2], 10) - parseInt(my[2], 10);
    return x.localeCompare(y);
  }
  return 0;
}

function dgeBuildTree(entries) {
  const root = { children: {}, leaves: [] };
  entries.forEach(e => {
    const segs = e.slug.split('/');
    let node = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      node.children[s] = node.children[s] || { children: {}, leaves: [], key: s };
      node = node.children[s];
    }
    node.leaves.push(e);
  });
  return root;
}

let dgeTreeNodeSeq = 0;
// path -> total registered granthas under it (populated or not), rebuilt at
// the top of every openLibraryModal() call; see the comment there.
let dgeLibTotalCounts = {};

// 24 Aug 2026 -- icon-driven Library home screen, alongside the existing
// text tree (project lead's ask: something resembling an external
// ChatGPT mockup's "icon structure," not a pixel copy of it). A view
// mode, not a separate feature: the SAME tree data, sort order, badges
// and drill-down (dgeRenderNode) the list view already builds -- this
// only changes how the TOP LEVEL is presented, replacing "however many
// taps to reach any category" with one tap into a labelled icon tile,
// then handing off to the existing list rendering for everything below
// it. dgeLibTree/dgeLibTopKeys are cached here (module scope, not
// re-fetched) so switching List<->Grid or drilling in/out is instant --
// only openLibraryModal() itself does the async catalog fetch.
let dgeLibTree = null;
let dgeLibTopKeys = [];
let dgeLibGridCategory = null; // null = showing the grid itself; else the top-level key drilled into

// One icon per real top-level taxonomy key (see DGE_PATH_LABELS above for
// the keys actually in use). Unmapped keys fall back to a plain folder
// icon rather than guessing -- better an honest generic icon than a
// wrong specific one.
const DGE_LIBRARY_ICONS = {
  vedas: '📿', veda: '📿',
  itihasa: '⚔️', itihasas: '⚔️',
  purana: '📜', puranas: '📜',
  darshana: '🕉️',
  smriti_dharma: '⚖️', smritis: '⚖️',
  kavya_alankara: '🪶', kavya: '🪶',
  kosha: '📖', koshas: '📖',
  stotra: '🎶', stotras: '🎶',
  agama: '🔥', pancharatra_agama: '🔥',
  vedanga: '📚', ancillary: '📚',
  dasa_sahitya: '🎵', dasakuta: '🎵', vyasakuta: '🎵',
  upaveda: '🧘', upavedas: '🧘',
  nitishastra: '🏛️',
  dharmashastra: '⚖️',
  misc: '🗂️',
};
function dgeLibraryIconFor(key) {
  return DGE_LIBRARY_ICONS[key] || '🗂️';
}

function dgeGetLibraryViewMode() {
  try { return localStorage.getItem('dge_library_view_mode') || 'grid'; }
  catch (e) { return 'grid'; }
}
window.dgeSetLibraryViewMode = function (mode) {
  try { localStorage.setItem('dge_library_view_mode', mode); } catch (e) { /* ignore */ }
  dgeLibGridCategory = null;
  document.querySelectorAll('#libraryViewToggle .range-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.libraryView === mode));
  dgeRenderLibraryRoot();
};
// A grantha counts as "New" for this many days after register_layers.py
// first stamped its addedAt -- existing entries (registered before that
// tool tracked dates) have no addedAt at all and never show this badge,
// deliberately: there is no reliable way to backfill a real date for them
// (this repo's git history is a shallow clone), and guessing would be
// worse than just not claiming to know.
const DGE_LIB_NEW_DAYS = 21;
function dgeIsRecentlyAdded(addedAt) {
  if (!addedAt) return false;
  const t = Date.parse(addedAt);
  if (isNaN(t)) return false;
  return (Date.now() - t) / 86400000 <= DGE_LIB_NEW_DAYS;
}

// Collapses single-child chains ("Ṛgveda › Śākala Śākhā › Saṃhitā") into
// one row instead of three nested taps — the taxonomy is deep and mostly
// linear, so without this the tree needs four taps to reach any mantra.
//
// noCollapseAtRoot (24 Aug 2026, project lead's direct report, matched a
// live screenshot exactly): the List view's own TOP-LEVEL category rows
// were also going through this same collapsing, so a category with a
// single populated branch (e.g. आगमः -> पाञ्चरात्रम् -> Pancharatra
// Samhitas) rendered as one row with the whole chain glued into its
// label instead of the clean single name every other category row
// shows ("It should be just the parent... not the entire parent child
// connecting notes"). dgeRenderLibraryListView() passes true for this on
// its own top-level call only -- every deeper call (both the recursive
// collapse-continuation just below and normal child iteration in `inner`)
// leaves it unset, so the tap-depth reduction this comment describes is
// completely unchanged below the top level, including inside the grid
// view's own per-category drill-down (dgeRenderLibraryCategoryView),
// which never sets it either.
function dgeRenderNode(node, labelPrefix, depth, nodePath, noCollapseAtRoot) {
  const childKeys = dgeSortChildKeys(nodePath, Object.keys(node.children));
  if (!noCollapseAtRoot && childKeys.length === 1 && node.leaves.length === 0) {
    const only = node.children[childKeys[0]];
    const label = (labelPrefix ? labelPrefix + ' › ' : '') + dgeSegLabel(childKeys[0]);
    const onlyPath = nodePath ? nodePath + '/' + childKeys[0] : childKeys[0];
    return dgeRenderNode(only, label, depth, onlyPath);
  }

  const id = 'dgeTree' + (dgeTreeNodeSeq++);
  const inner =
    childKeys.map(k => dgeRenderNode(node.children[k], dgeSegLabel(k), depth + 1, nodePath ? nodePath + '/' + k : k)).join('') +
    dgeSortLeaves(nodePath, node.leaves).map(leaf =>
      `<div class="pop-item" style="margin-left:${depth * 10}px;"
            onclick="window.dgeGoToGrantha('${leaf.realSlug}')">${leaf.title}${
        dgeIsRecentlyAdded(leaf.addedAt)
          ? '<span style="margin-left:auto; font-size:9px; font-weight:800; color:#fff; background:var(--accent-red,#7a3b1d); border-radius:999px; padding:2px 6px; letter-spacing:.3px;">NEW</span>'
          : ''
      }</div>`
    ).join('');

  if (!labelPrefix) return inner;

  const count = dgeCountLeaves(node);
  // "Lifecycle status" for a folder (Category 1's ask): how much of what's
  // registered under it is actually filled in yet. total comes from EVERY
  // registered grantha (populated or not, see openLibraryModal), so it
  // reflects real scaffolding rather than a guess. Falls back to count
  // itself if the path is missing from the map for any reason (shouldn't
  // happen -- every populated leaf's own ancestor prefixes are counted --
  // but a badge silently reading "count/count" is a harmless fallback,
  // never a broken one).
  const total = dgeLibTotalCounts[nodePath] || count;
  const countBadge = total > count
    ? `<span style="font-size:10px; color:var(--accent-red); font-weight:700;" title="${count} of ${total} texts registered under this section are filled in">${count}/${total}</span>`
    : `<span style="font-size:10px; color:var(--muted-text); font-weight:400;" title="All texts registered under this section are filled in">${count}</span>`;
  return `<div style="margin-left:${depth * 10}px;">
    <div onclick="window.dgeToggleTreeNode('${id}', this)"
         style="cursor:pointer; padding:7px 4px; font-size:13px; font-weight:600;
                display:flex; align-items:center; gap:6px;">
      <span style="font-size:10px; width:10px;">▸</span>
      <span style="flex:1;">${labelPrefix}</span>
      ${countBadge}
    </div>
    <div id="${id}" style="display:none;">${inner}</div>
  </div>`;
}

// Folds a joinable multi-layer grantha's sibling entries — mula/ plus its
// tika_*/ folders — into ONE tree leaf pointing at the mula spine, so 44
// "श्रीमन्न्यायसुधा — tika_..." rows stop masquerading as unrelated works
// (dge/MULTI_LAYER_READER_ARCHITECTURE.md §4). Strictly manifest-gated:
// only granthas tools/build_layer_manifest.py measured as id-joinable are
// in dge/data/layer_manifest.json, and within one, only layers with
// matched > 0 are absorbed — an unjoinable layer (different id scheme, or
// a mis-split one-item folder from another leaf page) keeps its own row,
// since the stitched view cannot reach it. Detection runs on realSlug
// (the on-disk path); the folded leaf keeps the entry's DISPLAY slug
// (admin move overrides preserved) minus the '/mula' segment.
function dgeFoldLayerEntries(entries, manifest) {
  if (!manifest || !manifest.granthas) return entries;
  const out = [];
  entries.forEach(e => {
    const m = e.realSlug.match(/^(.*)\/(mula|tika_[^/]+)$/);
    const grantha = m ? manifest.granthas[m[1]] : null;
    if (!grantha) { out.push(e); return; }
    if (m[2] === 'mula') {
      const title = grantha.title
        ? dgeToActiveScript(dgeLocalizeNumerals(grantha.title))
        : (e.title || '').replace(/\s+—\s+mula$/, '');
      out.push(Object.assign({}, e, {
        slug: e.slug.replace(/\/mula$/, ''),
        title: title || e.title
      }));
      return;
    }
    const layer = (grantha.layers || []).find(l => l.folder === m[2]);
    if (layer && layer.matched > 0) return; // reachable as a tab on the stitched spine
    out.push(e);
  });
  return out;
}

function dgeCountLeaves(node) {
  let n = node.leaves.length;
  Object.values(node.children).forEach(c => { n += dgeCountLeaves(c); });
  return n;
}

window.dgeToggleTreeNode = function(id, headerEl) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  const arrow = headerEl.querySelector('span');
  if (arrow) arrow.textContent = open ? '▸' : '▾';
};

window.openLibraryModal = async function() {
  if (typeof openModal === 'function') openModal('libraryModal');
  const listEl = document.getElementById('libraryModalList');
  if (!listEl) return;
  listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted-text); font-size:12px;">Loading library…</div>`;

  const library = await (window.dgeLibraryCatalogPromise || Promise.resolve(null));
  if (!library || !Array.isArray(library.granthas)) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">Couldn't load the library catalog.</div>`;
    return;
  }

  // Admin-curated overrides — see admin/library.html. Optional; most
  // repos won't have one until the project lead actually curates something.
  await dgeLoadLibraryOverrides();

  // The layer manifest (see layer-stitch.js / MULTI_LAYER_READER_ARCHITECTURE.md)
  // drives the drawer fold below: a joinable multi-layer grantha shows as
  // ONE leaf, not 44 sibling "granthas". Best-effort — no manifest, no fold.
  const layerManifest = (typeof window.dgeLayerManifestPromise !== 'undefined')
    ? await window.dgeLayerManifestPromise : null;

  const populated = dgeFoldLayerEntries(
    library.granthas.filter(g => g.populated && !dgeIsAdminOnlyGrantha(g)).map(g => {
      const realSlug = window.dgeGranthaSlug(g.path);
      const slug = dgeEffectiveDisplayPath(realSlug); // where it GROUPS in the tree
      const custom = dgeLibOverrides.labels[slug];
      const rawTitle = custom !== undefined ? custom : (g.title || realSlug);
      return { slug, realSlug, title: dgeToActiveScript(dgeLocalizeNumerals(rawTitle)), addedAt: g.addedAt || null, facets: g.facets || null };
    }).filter(e => !dgeIsHiddenPath(e.slug)),
    layerManifest);
  if (!populated.length) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">No texts are available yet — check back soon.</div>`;
    return;
  }

  // Folder-level completeness badges ("Category 1"'s lifecycle-status ask)
  // need to know how many texts COULD eventually live under a branch, not
  // just how many currently do -- computed from every registered grantha
  // (populated or not), the same grouping/hidden-path rules as the visible
  // tree above, so an admin-hidden or moved branch's total lines up with
  // where its populated count actually renders. Leaves themselves stay
  // populated-only as before (deliberately not showing ~550 empty
  // placeholder entries in the everyday reader) -- this only powers each
  // folder header's own badge.
  const allForTotals = dgeFoldLayerEntries(
    library.granthas.filter(g => !dgeIsAdminOnlyGrantha(g)).map(g => {
      const realSlug = window.dgeGranthaSlug(g.path);
      return { slug: dgeEffectiveDisplayPath(realSlug), realSlug };
    }).filter(e => !dgeIsHiddenPath(e.slug)),
    layerManifest).map(e => e.slug);
  dgeLibTotalCounts = {};
  allForTotals.forEach(slug => {
    const segs = slug.split('/');
    let prefix = '';
    for (let i = 0; i < segs.length - 1; i++) {
      prefix = prefix ? prefix + '/' + segs[i] : segs[i];
      dgeLibTotalCounts[prefix] = (dgeLibTotalCounts[prefix] || 0) + 1;
    }
  });

  dgeTreeNodeSeq = 0;
  dgeLibTree = dgeBuildTree(populated);
  dgeLibTopKeys = dgeSortChildKeys('', Object.keys(dgeLibTree.children));
  dgeLibPopulatedCount = populated.length;
  dgeLibGridCategory = null;
  dgeRenderLibraryRoot();
};

// Everything below builds off dgeLibTree/dgeLibTopKeys, cached by
// openLibraryModal() above -- none of these re-fetch or rebuild the tree,
// so switching view modes or drilling in/out of a category is instant.
let dgeLibPopulatedCount = 0;

function dgeTopLevelLeavesHtml() {
  return dgeSortLeaves('', dgeLibTree.leaves).map(leaf =>
    `<div class="pop-item" onclick="window.dgeGoToGrantha('${leaf.realSlug}')">${leaf.title}${
      dgeIsRecentlyAdded(leaf.addedAt)
        ? '<span style="margin-left:auto; font-size:9px; font-weight:800; color:#fff; background:var(--accent-red,#7a3b1d); border-radius:999px; padding:2px 6px; letter-spacing:.3px;">NEW</span>'
        : ''
    }</div>`
  ).join('');
}

// The List view -- unchanged in substance from before this pass, just
// pulled out into its own function so dgeRenderLibraryRoot() can pick
// between this and the grid.
function dgeRenderLibraryListView() {
  return dgeLibTopKeys.map(k => dgeRenderNode(dgeLibTree.children[k], dgeSegLabel(k), 0, k, true)).join('') + dgeTopLevelLeavesHtml();
}

// The new icon-driven home screen: one tile per top-level category
// (same keys/order/counts the list view already computes), each tappable
// straight through to that category's own list (dgeShowLibraryCategory) --
// no separate "grid data model," just a different view of the same tree.
function dgeRenderLibraryGridView() {
  const tiles = dgeLibTopKeys.map(k => {
    const node = dgeLibTree.children[k];
    const count = dgeCountLeaves(node);
    const total = dgeLibTotalCounts[k] || count;
    const countText = total > count ? `${count}/${total}` : `${count}`;
    return `<button type="button" class="dge-lib-tile" onclick="window.dgeShowLibraryCategory('${k}')">
      <span class="dge-lib-tile-icon">${dgeLibraryIconFor(k)}</span>
      <span class="dge-lib-tile-label">${dgeSegLabel(k)}</span>
      <span class="dge-lib-tile-count">${countText}</span>
    </button>`;
  }).join('');
  const topLeaves = dgeTopLevelLeavesHtml();
  return `<div class="dge-lib-grid">${tiles}</div>` + (topLeaves ? `<div class="popup-label" style="margin-top:14px;">Other</div>${topLeaves}` : '');
}

/* =========================================================================
   "View By" facets (25 Aug 2026) -- see dge/PENDING.md's Pancharatra pass.

   Principle: the taxonomy tree stays the ONE authoritative hierarchy for
   what a text IS (Ratnatraya/Pramukha/Anya, Vaishnava/Shaiva/Shakta, ...).
   Guna, Madhvacharya-relevance, genre and availability are per-leaf METADATA
   (library.json's "facets", synced from each data.json by
   tools/audit_library.py's derive_facets()), never separate folders -- a
   text is never duplicated across the tree just because it also has a
   scholarly classification. This section regroups the SAME leaves already
   in dgeLibTree by that metadata instead of by taxonomy path, entirely
   client-side (no new fetch: facets rode along on the same catalog
   fetch openLibraryModal() already made).

   Scoped to the category drill-down (dgeRenderLibraryCategoryView) only,
   not the flat List view -- a facet grouping mixing unrelated top-level
   categories (Vedas next to Kavya) would be noise, not a view. List view
   keeps Hierarchy only; a real, disclosed limitation, not an oversight.
   ========================================================================= */
const DGE_VIEW_BY_FACETS = {
  guna_classification: {
    label: 'गुणः', extract: f => f && f.guna_classification,
    values: { sattvika: 'सात्त्विकम्', rajasa: 'राजसम्', tamasa: 'तामसम्', not_specified: 'अनिर्दिष्टम्' }
  },
  madhvacharya_relevance: {
    label: 'माध्वसाम्प्रदायसाम्यम्', extract: f => f && f.madhvacharya_relevance && f.madhvacharya_relevance.level,
    values: {
      direct_quote: 'प्रत्यक्षोद्धृतम्', prominent: 'प्रमुखम्',
      general_authority: 'सामान्यप्रामाण्यम्', other: 'अन्यत्', not_specified: 'अनिर्दिष्टम्'
    }
  },
  text_status: {
    label: 'उपलब्धता', extract: f => f && f.text_status,
    values: {
      extant_complete: '🟢 सम्पूर्णोपलब्धम्', extant_partial: '🟡 आंशिकोपलब्धम्',
      quotation_only: '🟠 उद्धृतांशमात्रम्', lost_unlocated: '🔴 अलभ्यम्', unpopulated: 'अनुपलब्धम्'
    }
  },
  genre: {
    label: 'प्रकारः', extract: f => f && f.genre,
    values: {}
  },
  // Purana-only: whether a work is one of the fixed 18 Mahapuranas, an
  // Upapurana, or one whose Maha/Upa status the tradition itself disputes
  // (e.g. Devi Bhagavata Purana) -- metadata alongside the physical
  // maha_purana/upa_purana split, not a replacement for it (see
  // dge/PENDING.md's 25 Aug Purana pass).
  purana_class: {
    label: 'पुराणवर्गः', extract: f => f && f.purana_class,
    values: { mahapurana: 'महापुराणम्', upapurana: 'उपपुराणम्', disputed: 'विवादास्पदम्', regional: 'प्रादेशिकम्' }
  }
};
const DGE_VIEW_BY_NOT_SPECIFIED = 'not_specified';

function dgeFlattenLeaves(node, out) {
  out = out || [];
  node.leaves.forEach(l => out.push(l));
  Object.keys(node.children).forEach(k => dgeFlattenLeaves(node.children[k], out));
  return out;
}

// Which facet keys are worth offering for this node -- only those where at
// least one leaf underneath actually declares that key at all (regardless
// of whether the value itself is "not_specified"; "Guna: Not specified" is
// a legitimate, visible bucket, not a reason to hide the facet).
function dgeAvailableViewBys(node) {
  const leaves = dgeFlattenLeaves(node);
  return Object.keys(DGE_VIEW_BY_FACETS).filter(fk =>
    leaves.some(l => l.facets && DGE_VIEW_BY_FACETS[fk].extract(l.facets) !== undefined)
  );
}

let dgeLibViewBy = 'hierarchy';
window.dgeSetLibraryViewBy = function (key) {
  dgeLibViewBy = key;
  dgeRenderLibraryRoot();
};

function dgeViewByRowHtml(node) {
  const facetKeys = dgeAvailableViewBys(node);
  if (!facetKeys.length) return '';
  const btn = (key, label) => `<button type="button"
      class="dge-viewby-btn${dgeLibViewBy === key ? ' active' : ''}"
      onclick="window.dgeSetLibraryViewBy('${key}')">${label}</button>`;
  return `<div class="dge-viewby-row">
      <span class="dge-viewby-label">VIEW BY</span>
      ${btn('hierarchy', 'Hierarchy')}
      ${facetKeys.map(fk => btn(fk, DGE_VIEW_BY_FACETS[fk].label)).join('')}
    </div>`;
}

// Groups every leaf under `node` by one facet value and renders flat group
// headers instead of the taxonomy tree -- same leaf row markup dgeRenderNode
// already uses (.pop-item, NEW badge), just regrouped.
function dgeRenderFacetView(node, facetKey) {
  const cfg = DGE_VIEW_BY_FACETS[facetKey];
  const leaves = dgeFlattenLeaves(node);
  const groups = {};
  leaves.forEach(l => {
    const raw = (l.facets && cfg.extract(l.facets)) || DGE_VIEW_BY_NOT_SPECIFIED;
    (groups[raw] = groups[raw] || []).push(l);
  });
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === DGE_VIEW_BY_NOT_SPECIFIED) return 1;   // Not-specified sinks to the bottom
    if (b === DGE_VIEW_BY_NOT_SPECIFIED) return -1;
    return groups[b].length - groups[a].length;       // biggest group first otherwise
  });
  return keys.map(k => {
    const label = cfg.values[k] || dgeToActiveScript(k.replace(/_/g, ' '));
    const rows = dgeSortLeaves('', groups[k]).map(leaf =>
      `<div class="pop-item" style="margin-left:10px;" onclick="window.dgeGoToGrantha('${leaf.realSlug}')">${leaf.title}${
        dgeIsRecentlyAdded(leaf.addedAt)
          ? '<span style="margin-left:auto; font-size:9px; font-weight:800; color:#fff; background:var(--accent-red,#7a3b1d); border-radius:999px; padding:2px 6px; letter-spacing:.3px;">NEW</span>'
          : ''
      }</div>`
    ).join('');
    return `<div style="margin-top:6px;">
      <div style="padding:6px 4px; font-size:12px; font-weight:700; color:var(--muted-text); display:flex; align-items:center; gap:6px;">
        <span>${label}</span><span style="font-weight:400;">${groups[k].length}</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

// Admin-only deep link into the Library Manager's completion tracker
// (admin/library.html), pre-filtered/scrolled to this section (its own
// ?section= handling, see that file's start()). Super-admin gated, not the
// broader dgeIsAdmin() tier -- that page's own gate is super-admin only,
// so showing this to a plain admin would just walk them into its passkey
// prompt. "Top right" of the section view per the project lead's ask: a
// flex child pushed to the far end of the breadcrumb row via margin-left:auto.
function dgeSectionTrackerHtml(key) {
  if (!dgeIsSuperAdmin()) return '';
  return `<a href="../admin/library.html?section=${encodeURIComponent(key)}" target="_blank" rel="noopener"
      style="margin-left:auto; font-size:11px; color:var(--muted-text); text-decoration:none; white-space:nowrap;"
      onclick="event.stopPropagation()" title="Open the completion tracker for this section (super-admin)">📊 Progress</a>`;
}

// One category's own subtree, reached by tapping its grid tile -- reuses
// dgeRenderNode exactly as the list view does, just scoped to one branch
// with a breadcrumb back to the grid instead of every branch at once.
// dgeLibViewBy != 'hierarchy' swaps that for dgeRenderFacetView() instead,
// same leaves, grouped by metadata rather than by taxonomy path.
function dgeRenderLibraryCategoryView(key) {
  const node = dgeLibTree.children[key];
  if (!node) return dgeRenderLibraryGridView(); // stale key (shouldn't happen) -- fail back to the grid rather than a blank screen
  const body = dgeLibViewBy === 'hierarchy'
    ? dgeRenderNode(node, '', 0, key)
    : dgeRenderFacetView(node, dgeLibViewBy);
  return `<div class="dge-lib-breadcrumb" onclick="window.dgeShowLibraryGrid()">
      <span>❮</span> <span>${dgeSegLabel(key)}</span>${dgeSectionTrackerHtml(key)}
    </div>` + dgeViewByRowHtml(node) + body;
}

window.dgeShowLibraryCategory = function (key) {
  dgeLibGridCategory = key;
  dgeLibViewBy = 'hierarchy';
  dgeRenderLibraryRoot();
};
window.dgeShowLibraryGrid = function () {
  dgeLibGridCategory = null;
  dgeLibViewBy = 'hierarchy';
  dgeRenderLibraryRoot();
};

function dgeRenderLibraryRoot() {
  const listEl = document.getElementById('libraryModalList');
  if (!listEl || !dgeLibTree) return;
  const mode = dgeGetLibraryViewMode();
  const header = `<div style="font-size:11px; color:var(--muted-text); margin-bottom:8px;">${dgeLibPopulatedCount} text(s) available</div>`;
  if (dgeLibGridCategory) {
    listEl.innerHTML = header + dgeRenderLibraryCategoryView(dgeLibGridCategory);
  } else if (mode === 'grid') {
    listEl.innerHTML = header + dgeRenderLibraryGridView();
  } else {
    listEl.innerHTML = header + dgeRenderLibraryListView();
  }
}

// Quick Search entry point — parses e.g. "rv1.1.3" (see
// dgeParseQuickSearchQuery in config.js) and navigates straight to that
// verse, reusing dgeGoToGrantha's own path-encoding rule. The actual
// verse selection happens after the new page loads and normalizes its
// data (see the jumpVedicId/jumpShloka handling in core.js) — a full
// navigation is unavoidable here since the target grantha's data isn't
// loaded yet at the point this runs.
// Folder/section-name fallback for Quick Jump — e.g. typing "mahabharata
// sabha parva" or "chandas" with no verse number at all. Titles in
// library.json are NOT reliably searchable text: many are Devanagari
// (महाभारतम् आदिपर्व), some are plain English (Ganguli's own titles),
// depending on which importer wrote them — but every grantha's realSlug
// (its taxonomy path, e.g. "itihasa/mahabharata/adi_parva/mula") is
// always plain ASCII, underscore-separated. Matching against a
// normalized form of THAT, not the display title, is what makes this
// work regardless of which script the title happens to be in.
function dgeNormalizeForMatch(s) {
  return String(s || '').toLowerCase().replace(/[_/]+/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
async function dgeFuzzyMatchGrantha(text) {
  const q = dgeNormalizeForMatch(text);
  if (!q) return null;
  const library = await (window.dgeLibraryCatalogPromise || Promise.resolve(null));
  if (!library || !Array.isArray(library.granthas)) return null;
  const qWords = q.split(' ').filter(Boolean);
  let best = null, bestScore = -1;
  library.granthas.forEach(function (g) {
    if (!g.populated || dgeIsAdminOnlyGrantha(g)) return;
    const realSlug = window.dgeGranthaSlug(g.path);
    const hay = dgeNormalizeForMatch(realSlug + ' ' + (g.title || ''));
    if (!hay) return;
    // Every query word must appear somewhere in the slug/title text —
    // "mahabharata sabha" should not match a grantha whose path only
    // mentions one of the two words. Score favors an exact whole-slug
    // match, then a shorter/more-specific matching slug (a leaf beats a
    // whole section sharing the same prefix).
    const allWordsPresent = qWords.every(function (w) { return hay.indexOf(w) !== -1; });
    if (!allWordsPresent) return;
    let score = 100 - Math.min(99, hay.length - q.length);
    if (hay === q) score += 1000;
    else if (hay.indexOf(q) === 0) score += 200;
    if (score > bestScore) { bestScore = score; best = realSlug; }
  });
  return best;
}

window.dgeQuickJump = function(text) {
  const target = (typeof window.dgeParseQuickSearchQuery === 'function') ? window.dgeParseQuickSearchQuery(text) : null;
  if (target) {
    const readableSlug = /^[a-z0-9_/]+$/i.test(target.granthaPath) ? target.granthaPath : encodeURIComponent(target.granthaPath);
    let url = window.location.pathname + '?path=' + readableSlug;
    if (target.vedicId) url += '&jumpVedicId=' + encodeURIComponent(target.vedicId);
    else if (target.shlokaNumber) url += '&jumpShloka=' + target.shlokaNumber;
    window.location.href = url;
    return true;
  }
  // Not a recognized "abbrev + verse number" pattern (e.g. "rv1.1.3") —
  // try matching it as a folder/section/grantha name instead before
  // giving up. Async, so this path can't return true/false synchronously
  // the way the pattern-match path above does; it resolves the
  // navigation (or the "not recognized" toast) itself.
  dgeFuzzyMatchGrantha(text).then(function (slug) {
    if (slug) { window.dgeGoToGrantha(slug); return; }
    if (typeof showToast === 'function') showToast('Not recognized — try e.g. "rv1.1.3", "pns5", or a section name like "mahabharata sabha parva".');
  });
  return false;
};

// A handful of taxonomy leaves are not shloka-shaped at all (a root/word
// list, not verses) and have their own dedicated browser/search page
// instead of being readable through the general reader. Opening one of
// these via the normal ?path= route fed dge/index.html data it has no
// renderer for — the library entry existed and looked clickable, but
// nothing ever appeared ("Dhatu Patha... is not loading"). Keyed by the
// realSlug PREFIX so a future sibling under the same folder is covered
// without a new entry.
const DGE_SPECIAL_PAGES = [
  { prefix: 'vedanga/vyakarana/dhatupatha', page: 'dhatu.html' },
  { prefix: 'vedanga/vyakarana/shabdapatha', page: 'shabda.html' }
];
function dgeSpecialPageFor(realSlug) {
  const hit = DGE_SPECIAL_PAGES.find(function (e) {
    return realSlug === e.prefix || realSlug.indexOf(e.prefix + '/') === 0;
  });
  return hit ? hit.page : null;
}

window.dgeGoToGrantha = function(slug) {
  const special = dgeSpecialPageFor(slug);
  if (special) { window.location.href = special; return; }
  // Grantha slugs are always plain lowercase letters, digits, underscores,
  // and slashes by design (see taxonomy.json) — none of that needs
  // percent-encoding, and encodeURIComponent turning every "/" into
  // "%2F" just makes the address bar hard to read for no real benefit.
  // Falls back to full encoding only if something outside that safe set
  // ever shows up, so this can't silently produce a broken URL.
  const readableSlug = /^[a-z0-9_/]+$/i.test(slug) ? slug : encodeURIComponent(slug);
  window.location.href = window.location.pathname + '?path=' + readableSlug;
};

// 24 Aug 2026: Previous/Next Sarga/Adhyaya/Maṇḍala/Kāṇḍa navigator --
// project lead's direct ask, confirmed via investigation to not exist
// anywhere ("I already requested that there may be a navigator... that
// is currently missing"). Every multi-sarga/multi-mandala work (e.g.
// Raghavendra Vijaya's sarga_01..sarga_10, the Rigveda's mandala_01..10)
// stores each sub-unit as its OWN grantha entry/data.json -- there was no
// way to step to the next one without going back through the Library
// drawer's taxonomy tree. Pure UI wiring: reuses the SAME data.json's
// numbered-folder naming convention (dgeAutoLabel/DGE_NUMBERED_PREFIXES
// above) and library.json catalog this file already parses for the tree
// view -- no new data pipeline or metadata backfill needed. Deliberately
// no change to grantha data.json itself: prev/next are computed fresh
// from the catalog on every load, so a newly-added sarga is picked up
// automatically without touching every sibling file's own metadata.
let dgeChapterNavPrevSlug = null, dgeChapterNavNextSlug = null;
let dgeChapterNavPrefix = null, dgeChapterNavIdx = 0, dgeChapterNavTotal = 0;

window.dgeInitChapterNav = async function() {
  const row = document.getElementById('chapterNavRow');
  if (!row) return;
  row.style.display = 'none';
  dgeChapterNavPrevSlug = null;
  dgeChapterNavNextSlug = null;

  const slug = window.currentGranthaSlug;
  const lastSlash = slug ? slug.lastIndexOf('/') : -1;
  if (lastSlash < 0) return; // top-level grantha (e.g. stotra/xyz) -- no numbered parent to page within
  const parentPath = slug.slice(0, lastSlash);
  const lastSeg = slug.slice(lastSlash + 1);
  const m = lastSeg.match(/^([a-z]+)_(\d+)$/i);
  if (!m || !DGE_NUMBERED_PREFIXES[m[1].toLowerCase()]) return; // this leaf isn't a numbered sub-unit (sarga_2 etc.)
  const prefix = m[1].toLowerCase();

  const library = await (window.dgeLibraryCatalogPromise || Promise.resolve(null));
  if (!library || !Array.isArray(library.granthas)) return;

  const prefixRe = new RegExp('^' + prefix + '_\\d+$', 'i');
  const siblings = library.granthas
    .filter(g => g.populated && !dgeIsAdminOnlyGrantha(g))
    .map(g => window.dgeGranthaSlug(g.path))
    .filter(s => {
      const sl = s.lastIndexOf('/');
      return sl >= 0 && s.slice(0, sl) === parentPath && prefixRe.test(s.slice(sl + 1));
    });
  if (siblings.length < 2) return; // this is the only sub-unit under this parent -- nothing to page between

  siblings.sort(dgeCompareSlugs);
  const idx = siblings.indexOf(slug);
  if (idx === -1) return; // current grantha isn't itself in the populated catalog (shouldn't happen if it loaded at all)

  dgeChapterNavPrevSlug = idx > 0 ? siblings[idx - 1] : null;
  dgeChapterNavNextSlug = idx < siblings.length - 1 ? siblings[idx + 1] : null;
  dgeChapterNavPrefix = prefix;
  dgeChapterNavIdx = idx;
  dgeChapterNavTotal = siblings.length;
  window.dgeRenderChapterNav();
};

// Re-renders just the LABEL TEXT of the already-computed nav (prev/next
// slugs don't change with script) -- called both from dgeInitChapterNav
// above and from renderStotraChrome() (core.js) whenever the display
// script changes, the same way that function already re-labels every
// other piece of chrome.
window.dgeRenderChapterNav = function() {
  const row = document.getElementById('chapterNavRow');
  if (!row || (!dgeChapterNavPrevSlug && !dgeChapterNavNextSlug)) return;
  const prefix = dgeChapterNavPrefix, idx = dgeChapterNavIdx, total = dgeChapterNavTotal;

  const prevBtn = document.getElementById('chapterNavPrevBtn');
  const nextBtn = document.getElementById('chapterNavNextBtn');
  const posEl = document.getElementById('chapterNavPosition');

  if (prevBtn) {
    if (dgeChapterNavPrevSlug) {
      prevBtn.style.visibility = 'visible';
      prevBtn.textContent = '❮ ' + dgeSegLabel(dgeChapterNavPrevSlug.split('/').pop());
    } else {
      prevBtn.style.visibility = 'hidden';
    }
  }
  if (nextBtn) {
    if (dgeChapterNavNextSlug) {
      nextBtn.style.visibility = 'visible';
      nextBtn.textContent = dgeSegLabel(dgeChapterNavNextSlug.split('/').pop()) + ' ❯';
    } else {
      nextBtn.style.visibility = 'hidden';
    }
  }
  if (posEl) {
    posEl.textContent = dgeToActiveScript(DGE_NUMBERED_PREFIXES[prefix]) + ' ' +
      dgeToActiveScript(dgeDevaNum(idx + 1)) + ' / ' + dgeToActiveScript(dgeDevaNum(total));
  }
  row.style.display = 'flex';
};

window.dgeGoToChapterSibling = function(dir) {
  const slug = dir === 'prev' ? dgeChapterNavPrevSlug : dgeChapterNavNextSlug;
  if (slug) window.dgeGoToGrantha(slug);
};
