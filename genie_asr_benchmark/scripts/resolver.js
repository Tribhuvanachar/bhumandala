// DGE semantic resolver — turns a (possibly messy) ASR transcript into a
// structured DGE command intent, resolved against the REAL corpus metadata
// (library.json / taxonomy.json / parampara.json), not a hardcoded lookup
// table. Deliberately has ZERO DOM/browser dependency so it runs identically
// under Node (for the benchmark harness and its tests) and, unmodified, if
// dropped into dge/js/ later as a <script> — see intent-action-map.js in
// this same directory for how each intent maps to the DGE UI once resolved.
//
// Design mirrors two real functions already in dge/js/library.js:
// dgeNormalizeForMatch() (strip separators/case) and dgeFuzzyMatchGrantha()
// (require every query word present in the normalized slug+title, score by
// specificity) — reused here so behavior matches production, then extended
// with an ASR confusion layer and an alias table since spoken input is
// noisier than typed search-box input.
//
// Works in both CommonJS (Node) and as a plain global (browser <script>).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DgeResolver = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Indic-script transliteration — added after real Sarvam kn-IN/sa-IN/
  // hi-IN transcripts (28 Aug 2026 real-audio benchmark run) showed the
  // resolver was completely blind to non-Latin script: every one of
  // those transcripts came back in Devanagari or Kannada script (even for
  // Hindi/mixed manifest entries whose *written* transcript_text had been
  // Latin — the real ASR output wasn't), and normalize() was silently
  // discarding every non-ASCII character, leaving nothing to match
  // against except any digits that happened to survive.
  //
  // Devanagari and Kannada are both abugidas with the same structure:
  // a consonant carries an inherent "a" unless followed by a vowel sign
  // (matra, which replaces it) or a virama (which suppresses it for
  // consonant conjuncts). This is a mechanical per-codepoint
  // transliteration covering that structure for the two scripts this
  // corpus's real ASR output actually uses — NOT a general/scholarly
  // IAST transliteration library. Retroflex/dental/sibilant collapse to
  // the same Latin letters (ट/त → "ta", श/ष/स → "sa") is deliberate: it
  // matches the ASR-confusion philosophy already used elsewhere in this
  // file (a rough phonetic match is what downstream fuzzy matching is
  // built to tolerate), not a transliteration bug.
  // ---------------------------------------------------------------------
  var DEVANAGARI_MAP = {
    // Independent vowels
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
    'ऋ': 'ri', 'ॠ': 'rii', 'ऌ': 'li', 'ए': 'e', 'ऐ': 'ai',
    'ओ': 'o', 'औ': 'au',
    // Anusvara / visarga / candrabindu
    'ं': 'm', 'ः': 'h', 'ँ': 'm',
    // Consonants (inherent "a" included; matra/virama logic strips it)
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'ळ': 'la', 'व': 'va',
    'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    // Vowel signs (matras) — replace the preceding consonant's inherent "a"
    'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
    'ृ': 'ri', 'ॄ': 'rii', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    '्': ' VIRAMA ',
    // Digits
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  var KANNADA_MAP = {
    'ಅ': 'a', 'ಆ': 'aa', 'ಇ': 'i', 'ಈ': 'ii', 'ಉ': 'u', 'ಊ': 'uu',
    'ಋ': 'ri', 'ಎ': 'e', 'ಏ': 'ee', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'oo', 'ಔ': 'au',
    'ಂ': 'm', 'ಃ': 'h',
    'ಕ': 'ka', 'ಖ': 'kha', 'ಗ': 'ga', 'ಘ': 'gha', 'ಙ': 'nga',
    'ಚ': 'cha', 'ಛ': 'chha', 'ಜ': 'ja', 'ಝ': 'jha', 'ಞ': 'nya',
    'ಟ': 'ta', 'ಠ': 'tha', 'ಡ': 'da', 'ಢ': 'dha', 'ಣ': 'na',
    'ತ': 'ta', 'ಥ': 'tha', 'ದ': 'da', 'ಧ': 'dha', 'ನ': 'na',
    'ಪ': 'pa', 'ಫ': 'pha', 'ಬ': 'ba', 'ಭ': 'bha', 'ಮ': 'ma',
    'ಯ': 'ya', 'ರ': 'ra', 'ಱ': 'ra', 'ಲ': 'la', 'ಳ': 'la', 'ವ': 'va',
    'ಶ': 'sha', 'ಷ': 'sha', 'ಸ': 'sa', 'ಹ': 'ha',
    'ಾ': 'aa', 'ಿ': 'i', 'ೀ': 'ii', 'ು': 'u', 'ೂ': 'uu',
    'ೃ': 'ri', 'ೆ': 'e', 'ೇ': 'ee', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'oo', 'ೌ': 'au',
    '್': ' VIRAMA ',
    '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4',
    '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9'
  };

  var VIRAMA_MARKER = ' VIRAMA ';
  // Vowel-sign (matra) characters -- these REPLACE the inherent "a" the
  // preceding consonant already emitted, rather than appending after it.
  var MATRA_CHARS = 'ािीुूृॄेैोौಾಿೀುೂೃೆೇೈೊೋೌ';

  // True for any character this module knows how to transliterate (i.e.
  // Devanagari U+0900-097F or Kannada U+0C80-0CFF) -- used only to decide
  // whether transliteration is worth attempting at all.
  function hasIndicScript(s) {
    return /[ऀ-ॿಀ-೿]/.test(s);
  }

  function transliterateIndicScript(s) {
    if (!hasIndicScript(s)) return s;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      var mapped = DEVANAGARI_MAP[ch] || KANNADA_MAP[ch];
      if (mapped === undefined) {
        out += ch; // ASCII, digits, punctuation, danda, whitespace -- pass through
        continue;
      }
      if (mapped === VIRAMA_MARKER) {
        // Suppress the inherent "a" the preceding consonant already
        // appended, joining this consonant directly onto the next one
        // (e.g. "dha" + virama + "va" -> "dh" + "va" = "dhva").
        if (out.charAt(out.length - 1) === 'a') out = out.slice(0, -1);
      } else if (MATRA_CHARS.indexOf(ch) !== -1 && out.charAt(out.length - 1) === 'a') {
        out = out.slice(0, -1) + mapped;
      } else {
        out += mapped;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Normalization — same rule as dgeNormalizeForMatch in dge/js/library.js,
  // plus the Indic-script transliteration above run first.
  // ---------------------------------------------------------------------
  function normalize(s) {
    // A period between two digits ("1.1") is a reference separator, not
    // punctuation — protect it from the alnum strip below (three-step:
    // stash it behind a letters-only placeholder that survives the strip,
    // then restore it) so extractReference() still sees "1.1" downstream
    // instead of a collapsed "11".
    return transliterateIndicScript(String(s || ''))
      .toLowerCase()
      .replace(/[_/]+/g, ' ')
      .replace(/(\d)\.(?=\d)/g, '$1zzdotzz')
      .replace(/'s\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/zzdotzz/g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------------------------------------------------------------------
  // ASR confusion normalization — collapses known mis-transcriptions of
  // Sanskrit/Indic proper names into a canonical spelling BEFORE fuzzy
  // matching runs, so "Sumatra Vijaya" / "Sumadha Vijaya" / "Sumadhwa
  // Vijaya" / "Sumadhvijaya" all normalize toward the same token stream.
  // This list is seeded from the two real Sarvam transcripts already
  // observed (see CLAUDE.md section 2) plus general phonetic patterns
  // common to ASR-on-Sanskrit (retroflex/dental collapse, aspirate drop,
  // vowel-length collapse) — it is expected to grow as real benchmark
  // audio surfaces more confusions, not a closed set.
  var ASR_CONFUSIONS = [
    // [pattern, replacement] — applied on the normalized (lowercased,
    // space-separated) string, longest patterns first so multi-word
    // confusions don't get shadowed by a shorter partial match.
    [/\bsumatra\b/g, 'sumadhva'],
    [/\bsumadha\b/g, 'sumadhva'],
    [/\bsumadhwa\b/g, 'sumadhva'],
    [/\bsumadhvijaya\b/g, 'sumadhva vijaya'],
    // "sumadhvavijaya" (joined, no space) is real Sarvam kn-IN output —
    // via transliterateIndicScript() on "ಸುಮಧ್ವವಿಜಯ" (28 Aug 2026 real
    // audio benchmark), distinct from the already-handled "sumadhvijaya".
    [/\bsumadhvavijaya\b/g, 'sumadhva vijaya'],
    // Real Sarvam en-IN transcripts of "Harikathamrutasara" split it into
    // 2 or 3 words ("Hari Kathamrita Sara" / "Harikathamrita Sara") —
    // matched as multi-word sequences, not the old single-word
    // \bharikathamrita\b rule, which used to leave a duplicate trailing
    // "sara" when the real transcript already had its own "sara".
    [/\bhari\s+kathamrita\s+sara\b/g, 'harikathamrutasara'],
    [/\bharikathamrita\s+sara\b/g, 'harikathamrutasara'],
    [/\bharikathamritasara\b/g, 'harikathamrutasara'],
    [/\brig veda\b/g, 'rigveda'],
    [/\brikveda\b/g, 'rigveda'],
    [/\bjaya tirtha\b/g, 'jayatirtha'],
    [/\bjaytirth\b/g, 'jayatirtha'],
    [/\bvyasa tirtha\b/g, 'vyasatirtha'],
    [/\bvyas tirth\b/g, 'vyasatirtha'],
    [/\braghavendra swami\b/g, 'raghavendra'],
    [/\bpurandar das\b/g, 'purandara dasa'],
    [/\bpurandaradasa\b/g, 'purandara dasa'],
    [/\bkanaka das\b/g, 'kanaka dasa'],
    [/\bkanakadasa\b/g, 'kanaka dasa'],
    // Real grantha slug is "dasa_sahitya/composers/vijaya_dasaru"
    // (title "Vijaya Dasaru") -- "vijayadasara" (joined, "-dasara"
    // honorific spelling) is the realistic spoken/ASR form.
    [/\bvijaya das\b/g, 'vijaya dasaru'],
    [/\bvijayadasara\b/g, 'vijaya dasaru'],
    [/\bvijayadasa\b/g, 'vijaya dasaru'],
    [/\bmadhwa\b/g, 'madhvacharya'],
    [/\bmadva\b/g, 'madhvacharya'],
    // Bare "Madhva" is the common short form of the sampradaya founder's
    // full parampara-node name "Madhvacharya" — mapped only as a whole
    // word (the \b's here matter) so it does NOT touch "Sumadhva" (one
    // token, no internal word break) or "Madhvacharya" itself (already
    // correct).
    [/\bmadhva\b/g, 'madhvacharya'],
    [/\bashtadhyayi\b/g, 'ashtadhyayi'],
    [/\bashtadhyai\b/g, 'ashtadhyayi'],
    [/\bkaumudi\b/g, 'kaumudi'],
    [/\bpadchhed\b/g, 'padaccheda'],
    [/\bpadachheda\b/g, 'padaccheda'],
    // The remaining entries below are all from real Sarvam transcripts in
    // the 28 Aug 2026 audio benchmark (post-transliteration Devanagari/
    // Kannada output) — vowel-length and phonetic-loanword variants a
    // straight per-codepoint transliteration can't itself resolve, since
    // it has no notion of "this long vowel is an ASR quirk, not the real
    // word." Kept narrow (whole-word) rather than a general vowel-length
    // collapse rule, which risked conflating genuinely different words.
    [/\bjayatiirthaa\b/g, 'jayatirtha'],
    [/\bjayatiirtha\b/g, 'jayatirtha'],
    [/\bjayateertha\b/g, 'jayatirtha'],
    [/\bkamemtrii\b/g, 'commentary'],
    [/\bselekta\b/g, 'select'],
    [/\bkanakadaasaa\b/g, 'kanaka dasa'],
    [/\bsarcha\b/g, 'search'],
    [/\bkarpasa\b/g, 'corpus'],
    [/\bpadachchhedaa\b/g, 'padaccheda'],
    // Real Sarvam transcripts split some single-word slugs/triggers into
    // two words ("Shishupala Vadha" for the grantha "shishupalavadha",
    // "Dhatu Patha" for the DGE_SPECIAL_PAGES slug "dhatupatha") — joined
    // back so whole-word matching still finds them. "Shabda Patha" wasn't
    // observed split in this session's real audio but is the same
    // tokenization pattern for the sibling "shabdapatha" special page,
    // added pre-emptively.
    [/\bshishupala\s+vadha\b/g, 'shishupalavadha'],
    [/\bdhatu\s+patha\b/g, 'dhatupatha'],
    [/\bshabda\s+patha\b/g, 'shabdapatha'],
    // "एक्सप्लेन" (Devanagari phonetic respelling of English "explain")
    // transliterates to this via transliterateIndicScript() — a
    // real Sarvam sa-IN transcript, not a guessed spelling.
    [/\beksaplena\b/g, 'explain']
  ];

  function applyAsrConfusions(normalizedText) {
    var out = ' ' + normalizedText + ' ';
    // Re-normalize spacing around word-boundary regexes by padding, then
    // trim — lets \b patterns match at the string edges too.
    ASR_CONFUSIONS.forEach(function (pair) {
      out = out.replace(pair[0], ' ' + pair[1].replace(/ /g, ' ') + ' ').replace(/\s+/g, ' ');
    });
    return out.trim();
  }

  // ---------------------------------------------------------------------
  // Corpus index — built once from library.json / taxonomy.json /
  // parampara.json (caller supplies parsed JSON; this module does no I/O
  // so it works identically loaded via require() in Node or fetch() in a
  // browser). Adds a lightweight alias table on top of realSlug/title,
  // since library.json currently has no "aliases" field (verified against
  // the live data — every entry checked has only path/title/facets), only
  // the taxonomy-path-derived realSlug and whatever title an importer
  // happened to write (often Devanagari or an importer's own English
  // rendering, per the comment already in dge/js/library.js).
  // ---------------------------------------------------------------------
  function buildCorpusIndex(data) {
    data = data || {};
    var library = data.library || { granthas: [] };
    var parampara = data.parampara || { nodes: [] };

    var granthaEntries = (library.granthas || [])
      .filter(function (g) { return g.populated && !isAdminOnly(g); })
      .map(function (g) {
        var realSlug = granthaSlug(g.path);
        var haystack = normalize(realSlug + ' ' + (g.title || ''));
        return {
          kind: 'grantha',
          realSlug: realSlug,
          title: g.title || '',
          path: g.path,
          haystack: haystack,
          words: haystack ? haystack.split(' ') : []
        };
      })
      .filter(function (e) { return e.haystack; });

    var personEntries = (parampara.nodes || []).map(function (n) {
      var names = [n.name].concat(n.titles || []).filter(Boolean).join(' ');
      var haystack = normalize(names);
      return {
        kind: 'person',
        id: n.id,
        name: n.name,
        matha: n.matha,
        haystack: haystack,
        words: haystack ? haystack.split(' ') : []
      };
    }).filter(function (e) { return e.haystack; });

    return { granthaEntries: granthaEntries, personEntries: personEntries };
  }

  function isAdminOnly(g) {
    // Mirrors dgeIsAdminOnlyGrantha's intent (excluded from library UI) —
    // this module has no access to that runtime helper, so it re-derives
    // the same signal from the data actually available offline: entries
    // under a path segment literally called "admin" or "internal".
    return /\/(admin|internal)\//.test(String(g.path || ''));
  }

  function granthaSlug(path) {
    // dge/data/<realSlug>/data.json -> <realSlug>, matching
    // window.dgeGranthaSlug's contract in dge/js/core.js.
    return String(path || '')
      .replace(/^dge\/data\//, '')
      .replace(/\/data\.json$/, '');
  }

  // ---------------------------------------------------------------------
  // Fuzzy entity match — starts from dgeFuzzyMatchGrantha's rule ("every
  // query word must appear somewhere in the slug/title text") but relaxes
  // it three ways a voice command needs and a typed search box never has
  // to tolerate:
  //   1. WORD match must be a whole word (qWords.indexOf via e.words),
  //      never a raw substring — "madhva" must NOT match inside
  //      "sumadhva" or "madhvacharya". A numeric token is the one
  //      exception (haystack substring), so "2" still matches inside a
  //      zero-padded slug segment like "mandala_02".
  //   2. QUERY-SIDE ratio — code-switched filler this module's trigger/
  //      filler-word lists don't yet know about ("Open kijiye Rigveda
  //      mandala 2" — 'kijiye' is Hindi for "please") no longer sinks an
  //      otherwise-clean match; MATCH_RATIO_THRESHOLD of the query's own
  //      words is enough.
  //   3. ENTITY-SIDE coverage — the reverse problem: a parampara node's
  //      display name often carries a parenthetical epithet nobody says
  //      out loud ("Jayatirtha (Tikacharya)"), so requiring the query to
  //      cover the WHOLE haystack fails a perfectly clear "Jayatirtha".
  //      A single long, distinctive matched word (>=6 chars — long enough
  //      that it isn't a generic function word) is accepted on its own;
  //      the safety net for how often that alone should have won is the
  //      confidence/ambiguity scoring downstream, not this filter.
  // ---------------------------------------------------------------------
  var MATCH_RATIO_THRESHOLD = 0.6;
  var DISTINCTIVE_WORD_MIN_LENGTH = 6;

  function fuzzyMatchEntities(entries, queryNormalized) {
    var qWords = queryNormalized.split(' ').filter(Boolean);
    if (!qWords.length) return [];
    var scored = [];
    entries.forEach(function (e) {
      var matchedWords = qWords.filter(function (w) {
        if (e.words.indexOf(w) !== -1) return true;
        // Numeric tokens match by substring (handles zero-padded slug
        // segments like "2" inside "mandala_02"); a spoken number WORD
        // ("two") is converted to its digit form first so "chapter two"
        // matches the same way "chapter 2" already does.
        var asDigit = /^\d+$/.test(w) ? w : (wordToNum(w) != null ? String(wordToNum(w)) : null);
        return asDigit != null && e.haystack.indexOf(asDigit) !== -1;
      });
      if (!matchedWords.length) return;

      var queryRatio = matchedWords.length / qWords.length;
      var entityWordsFound = e.words.filter(function (w) { return qWords.indexOf(w) !== -1; }).length;
      var entityCoverage = e.words.length ? entityWordsFound / e.words.length : 0;
      var strongEntityCoverage = entityCoverage >= 0.9 && entityWordsFound >= 2;
      // Restricted to PERSON entries only: parampara.json is a few
      // hundred curated names where one long first/proper name is
      // genuinely disambiguating. Grantha titles are the opposite — a
      // "distinctive-looking" word like "vijaya" (Sanskrit "victory")
      // recurs across dozens of unrelated kavya titles, so allowing this
      // for granthas made an unrelated same-word title win outright
      // instead of correctly falling back to ambiguous.
      var hasDistinctiveMatch = e.kind === 'person' && matchedWords.some(function (w) { return w.length >= DISTINCTIVE_WORD_MIN_LENGTH; });

      if (queryRatio < MATCH_RATIO_THRESHOLD && !strongEntityCoverage && !hasDistinctiveMatch) return;

      var ratio = Math.max(queryRatio, strongEntityCoverage ? entityCoverage : 0, hasDistinctiveMatch ? 0.6 : 0);
      var score = (100 - Math.min(99, e.haystack.length - queryNormalized.length)) * ratio;
      if (e.haystack === queryNormalized) score += 1000;
      else if (e.haystack.indexOf(queryNormalized) === 0) score += 200;
      scored.push({ entry: e, score: score, matchRatio: ratio });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  function confidenceFromScores(scored) {
    if (!scored.length) return 0;
    if (scored.length === 1) return Math.min(0.99, 0.55 + scored[0].score / 2000);
    // Two candidates close in score = genuine ambiguity, confidence drops.
    var top = scored[0].score, second = scored[1].score;
    var gap = top - second;
    var base = Math.min(0.95, 0.5 + top / 2000);
    return gap < 50 ? Math.max(0.3, base - 0.3) : base;
  }

  // ---------------------------------------------------------------------
  // Reference-number extraction — "1.1", "chapter 3 verse 5", "sarga 1",
  // "adhyaya 2 shloka 10". Kept intentionally small: exact grammar for
  // every text family (Ashtadhyayi sutra numbers, Vedic mandala.sukta.
  // mantra, kanda/sarga/shloka, parva/adhyaya/shloka...) is a taxonomy-
  // aware problem belonging to dge's own QUICK_SEARCH_ABBREVIATIONS
  // resolvers (dge/js/config.js) — this module recognizes the common
  // shapes and hands the rest through as a free-text reference for the
  // caller (the real DGE UI, via dgeQuickJump / dgeGoToGrantha) to
  // interpret using its own per-text logic.
  // ---------------------------------------------------------------------
  var REF_WORD_NUMBERS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  function extractReference(text) {
    var t = ' ' + normalize(text) + ' ';
    // "1.1.3" / "1.1" dotted numeric — the common Vedic/general shape.
    var dotted = t.match(/\b(\d+(?:\.\d+){1,2})\b/);
    if (dotted) return dotted[1];

    // "chapter 3 verse 5" / "adhyaya 2 shloka 10" / "sarga 1 shloka 2".
    var labeled = t.match(/\b(?:adhyaya|chapter|kanda|sarga|parva|mandala)\s+(\d+|[a-z]+)\D+(?:shloka|verse|sukta|mantra|sutra)\s+(\d+|[a-z]+)\b/);
    if (labeled) {
      var a = wordToNum(labeled[1]), b = wordToNum(labeled[2]);
      if (a != null && b != null) return a + '.' + b;
    }

    // A single bare "shloka 5" / "verse 5" / "sutra 5".
    var single = t.match(/\b(?:shloka|verse|sutra|sukta|mantra)\s+(\d+|[a-z]+)\b/);
    if (single) {
      var n = wordToNum(single[1]);
      if (n != null) return String(n);
    }
    return null;
  }

  function wordToNum(w) {
    if (/^\d+$/.test(w)) return parseInt(w, 10);
    return Object.prototype.hasOwnProperty.call(REF_WORD_NUMBERS, w) ? REF_WORD_NUMBERS[w] : null;
  }

  // Strips a recognized reference substring back out of the text so what
  // remains is cleaner for entity matching (e.g. "Open Rigveda 1.1" ->
  // "Open Rigveda" once "1.1" is pulled out as the reference).
  function stripReference(text, reference) {
    if (!reference) return text;
    var escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text
      .replace(new RegExp('\\b(?:adhyaya|chapter|kanda|sarga|parva|mandala)\\D*\\b', 'i'), ' ')
      .replace(new RegExp('\\b(?:shloka|verse|sutra|sukta|mantra)\\D*\\b', 'i'), ' ')
      .replace(new RegExp(escaped), ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------------------------------------------------------------------
  // Intent classification — small ordered set of trigger-phrase rules per
  // intent (English + transliterated Kannada/Hindi/Sanskrit phrasings the
  // mission brief's own examples use), checked in priority order. This is
  // deliberately NOT a statistical classifier: DGE's command vocabulary is
  // small and closed, and a transparent rule table is what lets a wrong
  // match be debugged and fixed by editing one line, per the "don't let
  // fuzzy matching silently trigger a wrong action" requirement.
  // ---------------------------------------------------------------------
  var INTENT_RULES = [
    { intent: 'open_section', triggers: ['jump to', 'go to section', 'take me to section', 'open section'] },
    { intent: 'open_text', triggers: ['open', 'read', 'show me', 'take me to', 'padi', 'kholo'] },
    { intent: 'search_dhatu', triggers: ['find this dhatu', 'search dhatu', 'find dhatu', 'dhatu paatha', 'dhatupatha'] },
    { intent: 'search_kosha', triggers: ['look up', 'kosha', 'dictionary', 'meaning of', 'what does', 'shabdakosha'] },
    { intent: 'search_corpus', triggers: ['search for', 'search corpus', 'find in the corpus', 'search the corpus'] },
    // A commentator's name is almost always wedged BETWEEN the verb and
    // the object ("select Jayatirtha commentary"), and word order isn't
    // fixed either ("Jayatirtha ki commentary select karo" — Hindi verb
    // trailing) — so a contiguous phrase trigger like 'select commentary'
    // won't match, and worse, if it did, stripping that phrase back out
    // would strip the entity name with it. Matched by two independent
    // word-presence patterns instead (order doesn't matter); stripWords
    // removes only the individual verb/object words, leaving the entity
    // name untouched.
    { intent: 'select_commentary', patterns: [/\b(select|show|switch|choose|pick)\b/, /\b(commentary|bhashya)\b/], stripWords: ['select', 'show', 'switch', 'choose', 'pick', 'commentary', 'bhashya'] },
    { intent: 'padaccheda', triggers: ['padaccheda', 'give me the padaccheda', 'word split', 'pada chheda'] },
    { intent: 'compare', triggers: ['compare', 'compare with', 'side by side'] },
    { intent: 'explain', triggers: ['explain', 'what does this mean', 'ask acharya', 'tell me about this shloka'] },
    { intent: 'audio_action', triggers: ['play the audio', 'play audio', 'pause audio', 'pause the audio', 'stop audio', 'play', 'pause'] },
    { intent: 'renderer_action', triggers: ['show one shloka at a time', 'single view', 'list view', 'grid view', 'one shloka at a time', 'expand all', 'collapse all'] },
    { intent: 'settings_action', triggers: ['change the theme', 'dark mode', 'light mode', 'switch theme', 'change script', 'font size'] },

    // --- Added 28 Aug 2026: real command types the project lead named
    // from actual usage ("search kAntAya", "shabda nIvAra", "bhobhUyate
    // dhAtu rUpa", "sandhi of ityukte", "samAsa of chakrapani", "chandas
    // of this shloka", "download this shloka", "share this text"). All
    // placed AFTER the existing rules above so none of them can shadow
    // already-working behavior — they only catch input none of the
    // original rules recognized. See intent_action_map.js for exactly
    // which of these have a real DGE function behind them (several
    // don't — marked STUB there, not faked as WIRED here). ---

    // "shabda nIvāra" (word BEFORE, no "rupa") vs a hypothetical "shabda
    // rupa of X" (word after) — real examples use different word orders,
    // which is exactly why this uses stripWords (order-independent)
    // rather than a fixed phrase. Deliberately does NOT also require
    // absence of "patha"/"kosha": those already match an EARLIER rule
    // (open_section's "jump to"/"open section", search_kosha's "kosha")
    // before classifyIntent ever reaches this one, so there's no
    // shadowing risk from being permissive here.
    { intent: 'shabda_rupa', patterns: [/\bshabda\b/], stripWords: ['shabda', 'rupa', 'of', 'declension', 'table'] },

    // "bhobhūyate dhātu rūpa" (word BEFORE "dhatu rupa") — requires BOTH
    // words present (unlike shabda_rupa) since "dhatu" alone is already
    // claimed by the earlier search_dhatu rule for its own trigger
    // phrases; this only fires when "rupa" is ALSO present, i.e. never
    // shadows search_dhatu's "find this dhatu" etc.
    { intent: 'dhatu_rupa', patterns: [/\bdhatu\b/, /\brupa\b/], stripWords: ['dhatu', 'rupa', 'of', 'conjugation', 'form', 'table'] },

    // "sandhi of ityukte" / real UI label "Sandhi (Live)".
    { intent: 'sandhi_analysis', patterns: [/\bsandhi\b/], stripWords: ['sandhi', 'of', 'live', 'analysis'] },

    // "samāsa of chakrapani" — NOTE: verified against dge/js/ai.js that
    // NO samasa/compound-analysis function exists in the codebase at
    // all (unlike the other grammar tools above, which at least have a
    // real selection-only entry point) — this rule only lets the
    // resolver correctly NAME the intent; intent_action_map.js marks it
    // STUB, not a real gap in this resolver.
    { intent: 'samasa_analysis', patterns: [/\bsam[aā]sa\b/], stripWords: ['samasa', 'samāsa', 'of', 'compound', 'analysis'] },

    // "chandas of this shloka" — operates on current reader context, no
    // named entity, unlike the four rules above.
    { intent: 'chandas_identify', triggers: ['chandas of this shloka', 'identify the meter', 'what meter is this', 'chandas of this', 'chandas'] },

    // "download this shloka" / "share this text" / "share the audio" /
    // "preview and share image" / "copy this shloka" — all real Shloka
    // Actions panel functions (copyShlokaText/shareShlokaAudio/
    // shareShlokaTextOnly/openShareImagePreview in dge/js/render.js,
    // snippets.js, screenshot.js), one intent covering all of them since
    // they're all "act on the CURRENT shloka" the same way audio_action/
    // renderer_action already do — parameters.action carries which one,
    // same pattern as settings_action's theme dark/light disambiguation.
    { intent: 'shloka_share_action', triggers: ['download this shloka', 'download the shloka', 'share this text', 'share the text', 'share the audio', 'share audio', 'copy this shloka', 'copy the shloka', 'preview and share image', 'share text only', 'share image'] },

    // "make this content correction ... they will talk something to be
    // transcribed and added as correction" — a NEW two-turn flow (this
    // rule only recognizes turn 1: the request to start a correction; a
    // separate resolveCorrectionSubmission() below handles turn 2, the
    // actual spoken correction text). See reports/findings.md for the
    // full design and why this stays STUB in intent_action_map.js — no
    // submission/moderation infrastructure exists anywhere in the repo
    // to wire this to yet (verified: dge/js/notes.js is local-storage
    // only, no server-side queue of any kind exists).
    { intent: 'content_correction', triggers: ['content correction', 'make a correction', 'make this content correction', 'submit a correction', 'report an error in this section', 'suggest a correction'] },

    // Bare "search <word>" with no "for"/"corpus" context — the real
    // example given was "search kAntAya" (a kosha word lookup) with
    // none of search_kosha's existing trigger words ('look up'/'kosha'/
    // 'dictionary'/etc) present at all. Placed LAST/after search_corpus's
    // own more specific triggers ('search for', 'search corpus', etc.,
    // checked earlier above) so an utterance that actually mentions the
    // corpus still correctly goes to search_corpus; only a bare "search
    // <word>" with no corpus context falls through to here.
    // Negative lookahead excludes anything that also mentions "corpus"
    // anywhere — that signals search_corpus even when its own trigger
    // phrases aren't contiguous ("search kijiye for X in the corpus"),
    // and this bare fallback must not silently steal that case (a real
    // regression caught by this manifest's own 05_mixed_001 entry).
    { intent: 'search_kosha', patterns: [/\bsearch\b(?!.*\bcorpus\b)/], stripWords: ['search'] }
  ];

  function classifyIntent(normalizedConfusedText) {
    for (var i = 0; i < INTENT_RULES.length; i++) {
      var rule = INTENT_RULES[i];
      if (rule.patterns) {
        if (rule.patterns.every(function (p) { return p.test(normalizedConfusedText); })) {
          return { intent: rule.intent, trigger: null, stripWords: rule.stripWords };
        }
        continue;
      }
      for (var j = 0; j < rule.triggers.length; j++) {
        if (normalizedConfusedText.indexOf(rule.triggers[j]) !== -1) {
          return { intent: rule.intent, trigger: rule.triggers[j], stripWords: null };
        }
      }
    }
    return null;
  }

  // Filler/preposition words tied to OUR OWN trigger vocabulary above
  // ("search for X IN THE corpus", "switch TO X's commentary", "explain
  // THIS shloka") — safe to strip generically since they're common
  // English/Sanskrit-loanword function words, not plausible entity names.
  var FILLER_WORDS = ['the', 'a', 'an', 'please', 'for me', 'open', 'show', 'kannada', 'sanskrit', 'hindi', 'in', 'corpus', 'to', 'this', 'that', 'shloka', 'verse', 'about', 'with', 'other', 'kosha', 'dictionary'];

  // Strips the matched trigger (a contiguous phrase, or — for pattern-
  // matched rules where an entity name can be wedged between verb and
  // object, in either order — a set of individual words found anywhere)
  // plus generic filler words, so the remainder is a cleaner
  // entity-search query. Uses word-boundary matching throughout so a
  // short trigger like 'padi' can't mangle it mid-word inside an
  // unrelated word (e.g. Hindi 'padhiye').
  function stripTrigger(text, classified) {
    var out = text;
    if (classified.stripWords) {
      classified.stripWords.forEach(function (w) {
        out = out.replace(new RegExp('\\b' + w + '\\b', 'g'), ' ');
      });
    } else if (classified.trigger) {
      out = out.replace(new RegExp('\\b' + classified.trigger.replace(/ /g, '\\s+') + '\\b'), ' ');
    }
    FILLER_WORDS.forEach(function (w) {
      out = out.replace(new RegExp('\\b' + w.replace(/ /g, '\\s+') + '\\b', 'g'), ' ');
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  // ---------------------------------------------------------------------
  // Sibling-number disambiguation — many DGE texts are split across
  // several grantha files by sarga/kanda/parva/adhyaya/mandala (verified:
  // Sumadhva Vijaya alone is 16 separate sarga_1..sarga_16 data.json
  // files sharing the identical "sumadhva vijaya" title words, so a bare
  // fuzzy match ties across all 16 with zero score gap). When the intent
  // carries a reference like "1.1", its leading component almost always
  // names which sibling was meant ("Sumadhwa Vijaya 1.1" -> sarga 1). If
  // exactly that subset of the tied candidates matches a "..._<n>" path
  // segment for the reference's first component, narrow to it instead of
  // reporting the whole tied family as ambiguous.
  // ---------------------------------------------------------------------
  function disambiguateBySiblingNumber(scored, reference) {
    if (!reference || scored.length < 2) return scored;
    var firstPart = reference.split('.')[0];
    if (!/^\d+$/.test(firstPart)) return scored;
    var pattern = new RegExp('_0*' + firstPart + '($|/)');
    var narrowed = scored.filter(function (m) {
      return m.entry.realSlug && pattern.test(m.entry.realSlug);
    });
    return narrowed.length ? narrowed : scored;
  }

  var CONFIDENCE_THRESHOLD = 0.55;

  // ---------------------------------------------------------------------
  // Top-level entry point.
  // ---------------------------------------------------------------------
  function resolve(transcript, corpusIndex) {
    var raw = String(transcript || '');
    var normalized = normalize(raw);
    var confused = applyAsrConfusions(normalized);

    var classified = classifyIntent(confused);
    if (!classified) {
      // No verb/command word at all — mirrors dgeQuickJump's own UX
      // contract (dge/js/library.js): a bare "rv1.1.3" or a bare title
      // with no "open"/"read"/etc. in front of it is still a valid jump
      // target, so a bare reference number or a text/person name that
      // actually matches the corpus is treated as an implicit open_text,
      // NOT as unknown. Genuinely unrecognized speech (no reference, no
      // corpus match) still falls through to unknown below.
      var bareReference = extractReference(confused);
      var bareQuery = stripReference(confused, bareReference);
      var bareGrantha = bareQuery ? fuzzyMatchEntities(corpusIndex.granthaEntries, bareQuery) : [];
      if (bareReference || bareGrantha.length) {
        classified = { intent: 'open_text', trigger: '', stripWords: null };
      } else {
        return { intent: 'unknown', target: null, parameters: {}, confidence: 0, transcript: raw };
      }
    }

    var remainder = stripTrigger(confused, classified);
    var reference = extractReference(remainder);
    var entityQuery = stripReference(remainder, reference);

    var result = {
      intent: classified.intent,
      target: null,
      parameters: {},
      confidence: 0,
      transcript: raw
    };
    if (reference) result.parameters.reference = reference;

    var DETERMINISTIC = ['renderer_action', 'audio_action', 'settings_action', 'padaccheda', 'chandas_identify', 'shloka_share_action', 'content_correction'];
    var FREE_QUERY = ['search_kosha', 'search_dhatu', 'explain', 'compare', 'shabda_rupa', 'dhatu_rupa', 'sandhi_analysis', 'samasa_analysis'];
    // open_text, open_section, search_corpus, select_commentary fall
    // through to corpus-entity resolution below — these are the intents
    // where getting the WRONG specific text/person is an actual mistake
    // (open the wrong grantha, select the wrong commentator's view), so
    // they're the only ones worth the ambiguity/confidence machinery.

    if (DETERMINISTIC.indexOf(classified.intent) !== -1) {
      // No corpus concept at all (theme/renderer/audio/field-visibility
      // toggles) — that's the whole point of keeping them off the
      // entity-matching + Gemini-fallback path (CLAUDE.md section 7).
      result.confidence = 0.9;
      result.parameters.action = entityQuery || classified.trigger;
      if (classified.intent === 'content_correction') {
        // Turn 1 of 2 (see resolveCorrectionSubmission below): this only
        // ever recognizes the REQUEST to start a correction. The app
        // layer is expected to prompt for and capture the actual spoken
        // correction as a second transcript, not encoded in this result.
        result.parameters.stage = 'awaiting_correction_text';
      }
      return result;
    }

    if (FREE_QUERY.indexOf(classified.intent) !== -1) {
      // Kosha/dhatu lookups take ANY word — the DGE dictionary/dhatu
      // browser does its own matching, so there's nothing for this
      // resolver to validate against the grantha/parampara corpus index.
      // explain/compare usually operate on the CURRENTLY OPEN
      // shloka/commentary with no named target at all ("explain this
      // shloka"), so an empty query here means "use current context",
      // not "ambiguous" — hence the higher floor confidence than the
      // corpus-entity branch below gives a same-shaped empty query.
      result.confidence = entityQuery ? 0.8 : 0.6;
      if (entityQuery) result.target = entityQuery;
      return result;
    }

    if (!entityQuery) {
      // e.g. bare "open library" with no specific title mentioned.
      result.confidence = classified.intent === 'open_text' ? 0.4 : 0.5;
      return result;
    }

    var personMatches = fuzzyMatchEntities(corpusIndex.personEntries, entityQuery);
    var granthaMatches = fuzzyMatchEntities(corpusIndex.granthaEntries, entityQuery);

    // Prefer whichever candidate pool actually produced a match; grantha
    // wins ties since open_text/open_section/search_* usually target a
    // text, not a person (an author name alone routes to their works via
    // search_corpus, handled by the caller/UI, not resolved to a single
    // grantha here) — EXCEPT select_commentary, which always names a
    // commentator (a person), not a text, so a person match must win even
    // when the same name also happens to match a grantha path segment
    // (e.g. "jayatirtha" is both a parampara node AND a path segment of
    // several tika_jayatirtha commentary texts).
    var best = classified.intent === 'select_commentary'
      ? (personMatches.length ? personMatches : granthaMatches)
      : (granthaMatches.length ? granthaMatches : personMatches);
    best = disambiguateBySiblingNumber(best, reference);
    if (!best.length) {
      result.confidence = 0.2;
      result.parameters.rawQuery = entityQuery;
      return result;
    }

    var top = best[0].entry;
    result.target = top.kind === 'grantha' ? top.realSlug : top.name;
    result.parameters.matchedTitle = top.kind === 'grantha' ? top.title : top.name;
    result.parameters.entityKind = top.kind;
    result.confidence = confidenceFromScores(best);

    if (result.confidence < CONFIDENCE_THRESHOLD) {
      // Ambiguous / low-confidence — surface candidates instead of
      // silently acting, per CLAUDE.md section 6's explicit requirement.
      result.parameters.candidates = best.slice(0, 3).map(function (m) {
        return m.entry.kind === 'grantha' ? m.entry.realSlug : m.entry.name;
      });
    }

    return result;
  }

  // ---------------------------------------------------------------------
  // Turn 2 of the content_correction flow: after resolve() recognizes
  // "make this content correction" (turn 1) and the app layer prompts
  // the user to speak the actual correction, THIS packages that second
  // transcript as a submission payload. Deliberately does no validation
  // or corpus matching — a correction can say anything — and does NOT
  // submit anywhere: there is no real submission endpoint to call yet
  // (verified: no moderation queue or correction-workflow infrastructure
  // exists anywhere in this repo — see reports/findings.md's design
  // section for what's proposed). This function exists so the resolver
  // layer has a defined, testable shape for turn 2 even though execution
  // is unimplemented.
  // ---------------------------------------------------------------------
  function resolveCorrectionSubmission(correctionText, context) {
    return {
      intent: 'content_correction',
      stage: 'submitted',
      correctionText: String(correctionText || '').trim(),
      context: context || null, // caller-supplied: {grantha, shlokaId, selectedText, ...}
      status: 'pending_review' // see findings.md — moderation queue design, not yet built
    };
  }

  return {
    normalize: normalize,
    resolveCorrectionSubmission: resolveCorrectionSubmission,
    applyAsrConfusions: applyAsrConfusions,
    buildCorpusIndex: buildCorpusIndex,
    fuzzyMatchEntities: fuzzyMatchEntities,
    extractReference: extractReference,
    classifyIntent: classifyIntent,
    resolve: resolve,
    CONFIDENCE_THRESHOLD: CONFIDENCE_THRESHOLD
  };
});
