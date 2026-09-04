/* =========================================================================
   DGE · छन्दोविश्लेषणम् — classical (laukika) metre analyzer.

   Input: a verse (1, 2 or 4 lines, Devanagari). Output: per-syllable
   laghu/guru weights, 3-syllable gana segmentation, and the identified
   vrutta with its gana formula, yati and syllable/matra counts — matched
   against the 245-vrutta database this repo already carries
   (data/vedanga/chandas/data.json, from the Chandojnanam project,
   AGPL-3.0; see that file's own notes). The analyzer itself is written
   fresh for this page: prosody rules only —

     guru  = long vowel · or vowel followed by anusvara/visarga
             · or vowel followed by a consonant cluster (samyoga-para)
     laghu = everything else; a pada-final laghu may count guru (vā).

   anushtup (the shloka) has no fixed pattern and is matched by its own
   rule: 8 syllables a pada, 5th laghu and 6th guru in every pada, 7th
   laghu in the even padas (pathyā). Vedic chandas is out of scope here —
   a separate, unsolved problem (see PENDING.md).
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ---- syllabification ------------------------------------------------- */
  // Written with \\u escapes, not literal characters: the nukta letters
  // (U+0958-095F) NFC-decompose to base + U+093C nukta, which silently
  // corrupts a literal character class ("range out of order").
  //   consonants  \u0915-\u0939 (+ nukta forms \u0958-\u095F)
  //   matras      \u093E-\u094C (+ vocalic \u0962 \u0963)
  //   marks       \u0901 candrabindu, \u0902 anusvara, \u0903 visarga
  //   virama      \u094D; independent vowels \u0904-\u0914 + \u0960 \u0961 + \u0950 om
  var AK = /(?:[\u0915-\u0939\u0958-\u095F]\u094D)*[\u0915-\u0939\u0958-\u095F][\u093E-\u094C\u0962\u0963]?[\u0901-\u0903]?\u094D?|[\u0904-\u0914\u0950\u0960\u0961][\u0901-\u0903]?/g;
  var ONSET = /[\u0915-\u0939\u0958-\u095F]\u094D/g;
  var LONG_M = 'ािीुूृॄेैोौ';           // matras; ा ी ू ॄ े ै ो ौ long, ि ु ृ short
  var LONG_MATRA = 'ाीूॄेैोौ';
  var LONG_INDEP = 'आईऊॠॡएऐओऔॐ';
  function syllabify(line) {
    // strip everything that is not devanagari text (dandas, digits, spaces)
    var m = line.match(AK) || [];
    var out = [];
    for (var i = 0; i < m.length; i++) {
      var ak = m[i];
      // ends in virama = a bare final consonant, not a syllable: attach it
      // to the previous syllable as a closing consonant (makes it heavy
      // only as part of a cluster with what follows; line-final it is
      // conventionally guru-making — handled below via cluster count)
      if (/्$/.test(ak) && out.length) { out[out.length - 1].coda += ak; continue; }
      var long_ = LONG_INDEP.indexOf(ak[0]) !== -1;
      for (var c = 0; c < ak.length; c++) {
        if (LONG_MATRA.indexOf(ak[c]) !== -1) long_ = true;
      }
      var nasal = /[ंः]/.test(ak);
      out.push({ text: ak, long: long_, nasal: nasal, coda: '' });
    }
    // weight: long, nasal, or followed by a consonant cluster
    for (var j = 0; j < out.length; j++) {
      var s = out[j];
      var clusterAfter = (s.coda ? 1 : 0);
      if (j + 1 < out.length) {
        var nx = out[j + 1].text;
        var onset = (nx.match(ONSET) || []).length + 1; // conjunct pieces + head
        clusterAfter += onset - 1 + (s.coda ? 1 : 0);
        if (s.coda) clusterAfter = 2; // coda + next onset is already a cluster
        else clusterAfter = onset - 1;
        // onset of 2+ written consonants = cluster
        if (onset >= 2) clusterAfter = 2;
      } else if (s.coda) {
        clusterAfter = 2; // line-final consonant: conventionally heavy
      }
      s.guru = s.long || s.nasal || clusterAfter >= 2;
    }
    return out;
  }
  function pattern(sylls) {
    return sylls.map(function (s) { return s.guru ? 'ग' : 'ल'; }).join('');
  }

  /* ---- gana segmentation ------------------------------------------------ */
  var GANA = { 'लगग': 'य', 'गगग': 'म', 'गगल': 'त', 'गलग': 'र',
               'लगल': 'ज', 'गलल': 'भ', 'ललल': 'न', 'ललग': 'स' };
  function ganas(pat) {
    var out = [];
    for (var i = 0; i + 3 <= pat.length; i += 3) out.push(GANA[pat.substr(i, 3)] || '?');
    var rest = pat.length % 3;
    if (rest) out.push(pat.slice(-rest));
    return out.join('');
  }

  /* ---- matching --------------------------------------------------------- */
  var DB = null;
  function padaMatches(pat, lak, isPadaEnd) {
    if (pat.length !== lak.length) return false;
    for (var i = 0; i < pat.length; i++) {
      if (pat[i] === lak[i]) continue;
      // pada-final laghu may count as guru
      if (isPadaEnd && i === pat.length - 1 && pat[i] === 'ल' && lak[i] === 'ग') continue;
      return false;
    }
    return true;
  }
  function diffCount(pat, lak) {
    if (pat.length !== lak.length) return 99;
    var d = 0;
    for (var i = 0; i < pat.length; i++) if (pat[i] !== lak[i]) d++;
    return d;
  }
  function jaatiName(n) {
    if (!DB) return '';
    var j = DB.akshara_jaati.find(function (x) { return x.akshara_sankhya === n; });
    return j ? j.jaati : '';
  }
  function matchAnushtup(pats) {
    if (pats.length !== 4 || pats.some(function (p) { return p.length !== 8; })) return null;
    for (var i = 0; i < 4; i++) {
      if (pats[i][4] !== 'ल' || pats[i][5] !== 'ग') return null;
    }
    var pathya = pats[1][6] === 'ल' && pats[3][6] === 'ल';
    return {
      names: ['अनुष्टुप् (श्लोकः)' + (pathya ? ' — पथ्या' : ' — विपुला/अन्यथा')],
      kind: 'छन्दः',
      lakshana: 'श्लोके षष्ठं गुरु ज्ञेयं सर्वत्र लघु पञ्चमम् ।\nद्विचतुष्पादयोर्ह्रस्वं सप्तमं दीर्घमन्ययोः ॥',
      detail: '8 अक्षराणि प्रतिपादम् · पञ्चमं लघु, षष्ठं गुरु' + (pathya ? ', सम-पादयोः सप्तमं लघु' : '')
    };
  }
  function matchVrutta(pats) {
    if (!DB || !pats.length) return null;
    var an = matchAnushtup(pats);
    if (an) return an;
    var res;
    // sama: every pada the same vrutta
    if (pats.every(function (p) { return p.length === pats[0].length; })) {
      res = DB.sama_vrutta.find(function (v) {
        return pats.every(function (p, i) {
          return padaMatches(p, v.lakshana, true);
        });
      });
      if (res) return { names: res.vrutta_names, kind: 'समवृत्तम्', gana: res.gana,
                        yati: res.yati, aksh: res.akshara_sankhya, matra: res.matra };
    }
    if (pats.length === 4) {
      // ardhasama: 1,3 and 2,4
      res = DB.ardhasama_vrutta.find(function (v) {
        return padaMatches(pats[0], v.padas[0].lakshana_raw, true) &&
               padaMatches(pats[2], v.padas[0].lakshana_raw, true) &&
               padaMatches(pats[1], v.padas[1].lakshana_raw, true) &&
               padaMatches(pats[3], v.padas[1].lakshana_raw, true);
      });
      if (res) return { names: res.vrutta_names, kind: 'अर्धसमवृत्तम्' };
      // upajati combinations, then vishama
      res = DB.upajati_vrutta.find(function (v) {
        return v.padas.length === 4 && pats.every(function (p, i) {
          return padaMatches(p, v.padas[i].lakshana_raw, true);
        });
      });
      if (res) return { names: res.vrutta_names, kind: 'उपजातिः' };
      res = DB.vishama_vrutta.find(function (v) {
        return v.padas.length === 4 && pats.every(function (p, i) {
          return padaMatches(p, v.padas[i].lakshana_raw, true);
        });
      });
      if (res) return { names: res.vrutta_names, kind: 'विषमवृत्तम्' };
      // matra vrutta (arya family): matra counts per pada
      var matras = pats.map(function (p) {
        var m = 0;
        for (var i = 0; i < p.length; i++) m += p[i] === 'ग' ? 2 : 1;
        return m;
      });
      res = DB.matra_vrutta.find(function (v) {
        return v.matra_per_pada.length === 4 &&
               v.matra_per_pada.every(function (m, i) { return m === matras[i]; });
      });
      if (res) return { names: res.vrutta_names, kind: 'मात्रावृत्तम् (जातिः)',
                        detail: 'मात्राः: ' + matras.join(' · ') };
    }
    // half-verse / single-line sama match
    if (pats.length < 4) {
      res = DB.sama_vrutta.find(function (v) {
        return pats.every(function (p) { return padaMatches(p, v.lakshana, true); });
      });
      if (res) return { names: res.vrutta_names, kind: 'समवृत्तम्', gana: res.gana,
                        yati: res.yati, aksh: res.akshara_sankhya, matra: res.matra,
                        partial: true };
    }
    // fuzzy: nearest sama vrttas (<=2 differences on the first pada)
    var near = [];
    DB.sama_vrutta.forEach(function (v) {
      var d = diffCount(pats[0], v.lakshana);
      if (d > 0 && d <= 2) near.push({ v: v, d: d });
    });
    near.sort(function (a, b) { return a.d - b.d; });
    if (near.length) {
      return { names: [], kind: 'अज्ञातम्',
               near: near.slice(0, 3).map(function (n) {
                 return n.v.vrutta_names[0] + ' (' + n.d + ' भेदौ)';
               }) };
    }
    return { names: [], kind: 'अज्ञातम्' };
  }

  /* ---- pada assembly ---------------------------------------------------- */
  function toPadas(lines) {
    var sy = lines.map(syllabify).filter(function (s) { return s.length; });
    if (sy.length === 2) {
      // a half-verse per line: split each at the midpoint (even counts only)
      if (sy[0].length % 2 === 0 && sy[1].length % 2 === 0 &&
          sy[0].length === sy[1].length) {
        var h = sy[0].length / 2;
        return [sy[0].slice(0, h), sy[0].slice(h), sy[1].slice(0, h), sy[1].slice(h)];
      }
    }
    return sy;
  }

  /* ---- render ----------------------------------------------------------- */
  function gridHtml(sylls, yati) {
    var nums = '', row = '', marks = '';
    var yset = {};
    (yati || []).reduce(function (acc, y) { yset[acc + y] = true; return acc + y; }, 0);
    for (var i = 0; i < sylls.length; i++) {
      var s = sylls[i];
      var ycls = yset[i + 1] ? ' ch-yati' : '';
      nums += '<div class="ch-n">' + (i + 1) + '</div>';
      row += '<div class="ch-s deva' + (s.guru ? ' ch-guru' : '') + ycls + '">' + esc(s.text + (s.coda || '')) + '</div>';
      marks += '<div class="ch-m' + ycls + '">' + (s.guru ? 'ऽ' : '।') + '</div>';
    }
    return '<div class="ch-grid" style="grid-template-columns:repeat(' + sylls.length + ',minmax(34px,1fr))">' +
      nums + row + marks + '</div>';
  }
  function analyze() {
    var txt = $('#ch-input').value || '';
    var lines = txt.split(/[\n।॥]+/).map(function (l) { return l.trim(); })
      .filter(Boolean);
    var out = $('#ch-out');
    if (!lines.length) { out.innerHTML = ''; return; }
    var padas = toPadas(lines);
    var pats = padas.map(pattern);
    var match = matchVrutta(pats);
    var h = '';
    if (match) {
      h += '<section class="rs-box ch-id">' +
        '<div class="ch-kind deva">' + esc(match.kind) + (match.partial ? ' <small>(एकपादेन निर्णीतम्)</small>' : '') + '</div>' +
        (match.names.length ? '<h2 class="deva">' + match.names.map(esc).join(' / ') + '</h2>' : '') +
        (match.gana ? '<div class="ch-meta deva">गणाः: ' + esc(match.gana) +
          (match.yati && match.yati.length ? ' · यतिः: ' + match.yati.join(', ') : '') +
          (match.aksh ? ' · अक्षराणि: ' + match.aksh : '') +
          (match.matra ? ' · मात्राः: ' + match.matra : '') + '</div>' : '') +
        (match.detail ? '<div class="ch-meta deva">' + esc(match.detail) + '</div>' : '') +
        (match.lakshana ? '<div class="ch-lak deva">' + esc(match.lakshana).replace(/\n/g, '<br>') + '</div>' : '') +
        (match.near ? '<div class="ch-meta deva">समीपवर्तीनि: ' + match.near.map(esc).join(', ') + '</div>' : '') +
        ((match.aksh || padas[0]) ? '<div class="ch-meta deva">जातिः (अक्षरसंख्यया): ' +
          esc(jaatiName((match.aksh || padas[0].length))) + '</div>' : '') +
        '</section>';
    }
    h += padas.map(function (sy, i) {
      return '<section class="rs-box"><div class="ch-padah deva">पादः ' + (i + 1) +
        ' · ' + sy.length + ' अक्षराणि · <span class="ch-pat">' + esc(pattern(sy)) + '</span>' +
        ' · गणाः <b class="deva">' + esc(ganas(pattern(sy))) + '</b></div>' +
        gridHtml(sy, match && match.yati) + '</section>';
    }).join('');
    out.innerHTML = h;
  }

  /* ---- shared engine API -------------------------------------------------
     The reader's per-shloka "chandas check" (js/chandas-check.js) runs THIS
     same analyzer — one scansion implementation for the whole site. Pure
     functions only; loadDB(base) points at dge/ ("" from dge pages, "../"
     from vyakarana/). */
  window.DGEChandas = {
    syllabify: syllabify,
    pattern: pattern,
    ganas: ganas,
    toPadas: toPadas,
    matchVrutta: matchVrutta,
    jaatiName: jaatiName,
    ready: function () { return !!DB; },
    loadDB: function (base) {
      if (DB) return Promise.resolve(DB);
      return fetch((base || '') + 'data/vedanga/chandas/data.json')
        .then(function (r) { return r.json(); })
        .then(function (d) { DB = d; return d; });
    },
    analyzeText: function (txt) {
      var lines = String(txt || '').split(/[\n।॥]+/)
        .map(function (l) { return l.trim(); }).filter(Boolean);
      var padas = toPadas(lines);
      var pats = padas.map(pattern);
      return {
        padas: padas.map(function (sy) {
          return { sylls: sy, pattern: pattern(sy), ganas: ganas(pattern(sy)),
                   aksharas: sy.length,
                   matras: pattern(sy).split('').reduce(function (m, c) { return m + (c === 'ग' ? 2 : 1); }, 0) };
        }),
        match: DB ? matchVrutta(pats) : null
      };
    }
  };

  /* ---- boot ------------------------------------------------------------- */
  function boot() {
    var themeBtn = $('#themeBtn');
    if (localStorage.getItem('dge_vyakarana_dark') === '1') document.body.classList.add('dark');
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var dark = document.body.classList.toggle('dark');
      localStorage.setItem('dge_vyakarana_dark', dark ? '1' : '0');
    });
    if (!$('#ch-go')) return;   // engine-only load (the reader) — no page UI
    $('#ch-go').addEventListener('click', analyze);
    $('#ch-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyze();
    });
    document.querySelectorAll('[data-ch-sample]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#ch-input').value = b.dataset.chSample;
        analyze();
      });
    });
    // Page-relative to dge/vyakarana/chandas.html (Phase 10: moved one
    // directory deeper than dge/ -- ../ reaches dge/data/).
    fetch('../data/vedanga/chandas/data.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        DB = d;
        $('#ch-status').textContent = '';
        // ?q=<verse> prefills (the kavya page links here per shloka)
        var q = new URLSearchParams(location.search).get('q');
        if (q) { $('#ch-input').value = q; analyze(); }
      })
      .catch(function () {
        $('#ch-status').textContent = 'वृत्तकोशः न प्राप्तः — serve from the dge/ folder.';
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
