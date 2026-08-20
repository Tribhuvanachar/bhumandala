/* =========================================================================
   DGE · instant Shabda lookup — the declension table in a popup, right
   where the reader is, instead of a page redirect.

   window.dgeShabdaQuick(word) -> Promise<boolean>
     true  = a matching Shabdapatha entry was found and the modal is open
     false = no match (the caller decides its own fallback — ai.js falls
             back to the old shabda.html tab, which also handles kridanta
             forms via its own reverse indexes)

   Data: dge/data/vedanga/vyakarana/shabdapatha/by_akshara/ — the 9,007-word
   Shabdapatha sharded by first akshara (tools/build_shabda_shards.py).
   Declension is suffixal, so the queried form's first character picks the
   shard (the vocative's हे is stripped first); one ~100 KB shard is
   fetched, cached, and scanned. Nothing else loads.
   ========================================================================= */
(function () {
  'use strict';

  var SELF = (document.currentScript && document.currentScript.src) || '';
  function dataUrl(rel) {
    try { return new URL('../data/vedanga/vyakarana/shabdapatha/by_akshara/' + rel, SELF).href; }
    catch (e) { return 'data/vedanga/vyakarana/shabdapatha/by_akshara/' + rel; }
  }
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var VIBH = ['प्रथमा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी', 'सम्बोधनम्'];
  var VAC = ['एक', 'द्वि', 'बहु'];
  var LINGA = { P: 'पुंल्लिङ्गम्', S: 'स्त्रीलिङ्गम्', N: 'नपुंसकलिङ्गम्', A: 'अव्ययम्' };

  var shardCache = {};
  function shard(ch) {
    var name = 'u' + ('0000' + ch.codePointAt(0).toString(16)).slice(-4) + '.json';
    if (!shardCache[name]) {
      shardCache[name] = fetch(dataUrl(name), { cache: 'force-cache' })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; })
        .catch(function () { return { items: [] }; });
    }
    return shardCache[name];
  }

  function cleanWord(w) {
    return String(w || '').trim()
      .replace(/^हे\s+/, '')
      .replace(/[।॥,;:!?"'()\[\]]+/g, '')
      .replace(/ऽ+$/, '').trim();
  }

  // cells: forms is 24 ;-separated cells (8 vibhakti x 3 vacana, row-major);
  // a cell can hold '-'-separated alternates ("आद्-आत्").
  function matchEntry(entry, w) {
    if (entry.word === w) return { cell: -1 };
    var cells = String(entry.forms || '').split(';');
    for (var i = 0; i < cells.length; i++) {
      var alts = cells[i].replace(/^हे\s+/, '').split(/[-,]/);
      for (var a = 0; a < alts.length; a++) {
        if (alts[a].trim() === w) return { cell: i };
      }
    }
    return null;
  }

  function ensureDom() {
    if (document.getElementById('dge-sq-overlay')) return;
    var css = document.createElement('style');
    css.textContent = [
      '#dge-sq-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:none;align-items:flex-end;justify-content:center}',
      '@media(min-width:700px){#dge-sq-overlay{align-items:center}}',
      '#dge-sq-overlay.open{display:flex}',
      '#dge-sq-box{background:var(--card-bg,#fff);color:var(--text-primary,#222);border-radius:16px 16px 0 0;max-height:84vh;width:100%;max-width:560px;overflow:auto;padding:16px 18px;position:relative;-webkit-overflow-scrolling:touch}',
      '@media(min-width:700px){#dge-sq-box{border-radius:16px}}',
      '#dge-sq-x{position:absolute;right:8px;top:6px;border:0;background:transparent;font-size:22px;color:var(--muted-text,#888);cursor:pointer;min-width:44px;min-height:44px}',
      '.dge-sq-word{font-size:22px;font-weight:700;margin:0 30px 2px 0}',
      '.dge-sq-meta{font-size:13px;color:var(--muted-text,#8a7a63);margin-bottom:8px}',
      '.dge-sq-artha{font-size:14px;margin-bottom:10px}',
      '.dge-sq-table{width:100%;border-collapse:collapse;font-size:14.5px}',
      '.dge-sq-table th,.dge-sq-table td{border-bottom:1px dashed var(--card-border,rgba(0,0,0,.12));padding:7px 6px;text-align:center}',
      '.dge-sq-table th{font-size:11.5px;color:var(--muted-text,#8a7a63);font-weight:600}',
      '.dge-sq-table td:first-child,.dge-sq-table th:first-child{text-align:left;font-size:11.5px;color:var(--muted-text,#8a7a63)}',
      '.dge-sq-hit{background:rgba(232,178,77,.35);border-radius:6px;font-weight:700}',
      '.dge-sq-more{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}',
      '.dge-sq-more a{border:1px solid var(--card-border,rgba(0,0,0,.2));border-radius:999px;padding:7px 13px;font-size:13px;text-decoration:none;color:inherit}',
      '.dge-sq-alt{margin-top:14px;padding-top:8px;border-top:1px solid var(--card-border,rgba(0,0,0,.12))}'
    ].join('\n');
    document.head.appendChild(css);
    var ov = document.createElement('div');
    ov.id = 'dge-sq-overlay';
    ov.innerHTML = '<div id="dge-sq-box"><button id="dge-sq-x" aria-label="close">×</button><div id="dge-sq-body"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.id === 'dge-sq-x') ov.classList.remove('open');
    });
  }

  function tableHtml(entry, hitCell) {
    var cells = String(entry.forms || '').split(';');
    var h = '<table class="dge-sq-table"><thead><tr><th></th>' +
      VAC.map(function (v) { return '<th>' + v + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var r = 0; r < 8; r++) {
      h += '<tr><td>' + VIBH[r] + '</td>';
      for (var c = 0; c < 3; c++) {
        var i = r * 3 + c;
        var val = (cells[i] || '—').split(/[-,]/).join(', ');
        h += '<td' + (i === hitCell ? ' class="dge-sq-hit"' : '') + '>' + esc(val) + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }

  function entryHtml(entry, hit, first) {
    var h = (first ? '' : '<div class="dge-sq-alt"></div>') +
      '<div class="dge-sq-word">' + esc(entry.word) + '</div>' +
      '<div class="dge-sq-meta">' + esc(LINGA[entry.linga] || entry.linga_iast || '') +
      (entry.id ? ' · शब्दपाठः' : '') + '</div>' +
      (entry.artha ? '<div class="dge-sq-artha">' + esc(entry.artha) +
        (entry.artha_eng ? ' · ' + esc(entry.artha_eng) : '') + '</div>' : '');
    if (entry.linga === 'A') {
      h += '<div class="dge-sq-meta">अव्ययम् — indeclinable</div>';
    } else {
      h += tableHtml(entry, hit.cell);
    }
    return h;
  }

  window.dgeShabdaQuick = function (word) {
    var w = cleanWord(word);
    if (!w) return Promise.resolve(false);
    return shard(w[0]).then(function (d) {
      var matches = [];
      (d.items || []).forEach(function (entry) {
        var hit = matchEntry(entry, w);
        if (hit) matches.push([entry, hit]);
      });
      if (!matches.length) return false;
      ensureDom();
      var body = document.getElementById('dge-sq-body');
      body.innerHTML = matches.slice(0, 4).map(function (m, i) {
        return entryHtml(m[0], m[1], i === 0);
      }).join('') +
        (matches.length > 4 ? '<div class="dge-sq-meta">+' + (matches.length - 4) + ' more — open the full Śabdapāṭha below.</div>' : '') +
        '<div class="dge-sq-more">' +
        '<a href="shabda.html?form=' + encodeURIComponent(w) + '" target="_blank" rel="noopener">शब्दपाठः ↗</a>' +
        '<a href="#" id="dge-sq-corpus">🔍 प्रयोगाः · corpus</a>' +
        '</div>';
      var co = document.getElementById('dge-sq-corpus');
      if (co) co.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('dge-sq-overlay').classList.remove('open');
        if (window.DGEGlobalSearch && window.DGEGlobalSearch.open) window.DGEGlobalSearch.open(w);
      });
      document.getElementById('dge-sq-overlay').classList.add('open');
      return true;
    });
  };
})();
