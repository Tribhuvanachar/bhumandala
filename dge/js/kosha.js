// js/kosha.js — DGE Kosha (multilingual dictionary) lookup.
// ADDITIVE + self-injecting. Adds a floating "कोश" button, an overlay search
// UI, fuzzy SLP1 headword lookup, per-dictionary result cards, per-language
// grouping, and a cross-language translate pivot (BYOK Gemini, reusing the
// app's existing 'gemini_api_key'/'gemini_model' localStorage keys).
// Loads its data from data/koshas/** produced by the importer. Touches no
// existing file or global beyond reading window.Sanscript.
(function () {
  'use strict';
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['kosha.js'] = 'v1.0';

  var BASE = 'data/koshas';
  var V = '?v=1.0';
  var PREF_LANG = (localStorage.getItem('app_kosha_pref_lang') || 'kn'); // user's language (Kannada)
  var LANG_NAME = { sa: 'संस्कृतम्', kn: 'ಕನ್ನಡ', en: 'English', hi: 'हिन्दी',
                    bn: 'বাংলা', te: 'తెలుగు', ta: 'தமிழ்', fr: 'Français', de: 'Deutsch' };
  var cache = {}, manifest = null;

  function j(path) {
    if (cache[path]) return cache[path];
    cache[path] = fetch(path + V).then(function (r) { return r.ok ? r.json() : null; })
                                 .catch(function () { return null; });
    return cache[path];
  }
  function safeBucket(b) { return b.replace(/[^0-9A-Za-z_]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).padStart(2, '0'); }) || '_'; }

  // ---- SLP1 + fold (mirrors the importer / the app's search spine) ----------
  function fold(s) {
    s = s.replace(/'/g, '');
    s = s.replace(/A/g, 'a').replace(/I/g, 'i').replace(/U/g, 'u').replace(/F/g, 'f').replace(/X/g, 'x');
    s = s.replace(/S/g, 's').replace(/z/g, 's');
    s = s.replace(/M/g, 'n').replace(/~/g, 'n');
    return s.replace(/(.)\1+/g, '$1');
  }
  function toSLP1list(q) {
    q = (q || '').trim(); if (!q) return [];
    var S = window.Sanscript, out = [];
    if (!S) return [q];
    try {
      if (/[ऀ-ॿ]/.test(q)) out.push(S.t(q, 'devanagari', 'slp1'));
      else if (/[ಀ-೿]/.test(q)) out.push(S.t(q, 'kannada', 'slp1'));
      else { ['iast', 'hk', 'itrans', 'slp1'].forEach(function (sc) {
        try { out.push(S.t(q, sc, 'slp1')); } catch (e) {} }); }
    } catch (e) { out.push(q); }
    return out.filter(Boolean);
  }

  // ---- search ---------------------------------------------------------------
  function search(query) {
    return (manifest ? Promise.resolve(manifest) : j(BASE + '/_index/manifest.json')
        .then(function (m) { manifest = m; return m; }))
      .then(function (m) {
        if (!m) return [];
        var folds = toSLP1list(query).map(fold).filter(Boolean);
        if (!folds.length) return [];
        var buckets = {};
        folds.forEach(function (qf) {
          var two = qf.slice(0, 2);
          m.buckets.forEach(function (b) { if (b === two || (qf.length < 2 && b[0] === qf[0])) buckets[b] = 1; });
        });
        var need = Object.keys(buckets);
        if (!need.length) return [];
        return Promise.all(need.map(function (b) { return j(BASE + '/_index/' + safeBucket(b) + '.json'); }))
          .then(function (shards) {
            var byFold = {};
            shards.forEach(function (sh) {
              if (!sh) return;
              Object.keys(sh).forEach(function (fk) {
                var hit = folds.some(function (qf) { return fk === qf || fk.indexOf(qf) === 0; });
                if (hit) (byFold[fk] = byFold[fk] || []).push.apply(byFold[fk], sh[fk]);
              });
            });
            // group by (fold, headword)
            var groups = {};
            Object.keys(byFold).sort().forEach(function (fk) {
              byFold[fk].forEach(function (rec) {
                var key = fk + '|' + rec.h;
                (groups[key] = groups[key] || { fold: fk, hw: rec.h, slp1: rec.s, hl: rec.hl, dicts: [], langs: {} })
                  .dicts.push(rec);
                (rec.l || []).forEach(function (l) { groups[key].langs[l] = 1; });
              });
            });
            var arr = Object.keys(groups).map(function (k) { return groups[k]; });
            // exact-fold matches first, then by headword length
            arr.sort(function (a, b) {
              var ea = folds.indexOf(a.fold) >= 0 ? 0 : 1, eb = folds.indexOf(b.fold) >= 0 ? 0 : 1;
              return ea - eb || a.hw.length - b.hw.length || a.hw.localeCompare(b.hw);
            });
            return arr.slice(0, 60);
          });
      });
  }

  // ---- full entry (tier-2) --------------------------------------------------
  function loadEntry(fold, headword) {
    var bucket = fold.slice(0, (manifest.entry_shard_len || 3));
    var dicts = manifest.dictionaries;
    return Promise.all(Object.keys(dicts).map(function (slug) {
      var cat = dicts[slug].category;
      return j(BASE + '/' + cat + '/' + slug + '/e/' + safeBucket(bucket) + '.json')
        .then(function (sh) {
          if (!sh || !sh[fold]) return null;
          var items = sh[fold].filter(function (it) { return it.headword === headword; });
          return items.length ? { slug: slug, meta: dicts[slug], items: items } : null;
        });
    })).then(function (a) { return a.filter(Boolean); });
  }

  // ---- BYOK Gemini translate pivot -----------------------------------------
  // Delegates to the shared window.DGEGemini client (js/gemini.js) for human
  // error messages (quota/permission/etc.) and a one-step lighter-model
  // fallback -- same reasoning as Ashtadhyayi's AI tutor. Key/model still
  // read from Kosha's own existing localStorage keys, passed as per-call
  // overrides.
  function translate(text, fromLang, toLang) {
    var key = localStorage.getItem('gemini_api_key');
    if (!key) return Promise.reject(new Error('Set your Gemini API key in the Convert tool first (stored as gemini_api_key).'));
    var model = localStorage.getItem('gemini_model') || 'gemini-3.6-flash';
    var prompt = 'Translate this ' + (LANG_NAME[fromLang] || fromLang) + ' dictionary gloss of a Sanskrit word into ' +
      (LANG_NAME[toLang] || toLang) + '. Output only the translation, no notes:\n\n' + text;
    return window.DGEGemini.generate({ prompt: prompt, apiKey: key, model: model })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error.title + ' — ' + r.error.message + ' ' + r.error.action);
        if (!r.text) throw new Error('No translation returned.');
        return (r.fellBack ? '[' + r.notice + ']\n' : '') + r.text.trim();
      });
  }

  // ---- rendering ------------------------------------------------------------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return (s || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function tl(s) { // transliterate Devanagari to the app's active script, if available
    try { return (window.applyTransliteration && window.activeScript && window.activeScript !== 'devanagari')
      ? window.applyTransliteration(s, window.activeScript) : s; } catch (e) { return s; }
  }

  function renderResults(list, resBox, detail) {
    resBox.innerHTML = '';
    if (!list.length) { resBox.appendChild(el('div', 'kosha-empty', 'No headwords found.')); return; }
    list.forEach(function (g) {
      var row = el('div', 'kosha-hit');
      var chips = Object.keys(g.langs).map(function (l) {
        return '<span class="kosha-chip">' + (LANG_NAME[l] || l) + '</span>'; }).join('');
      row.innerHTML = '<span class="kosha-hw">' + esc(tl(g.hw)) + '</span>' +
        '<span class="kosha-count">' + g.dicts.length + ' कोश</span>' + chips;
      row.onclick = function () { openEntry(g, detail); };
      resBox.appendChild(row);
    });
  }

  function openEntry(g, detail) {
    detail.innerHTML = '<div class="kosha-loading">…</div>';
    loadEntry(g.fold, g.hw).then(function (perDict) {
      detail.innerHTML = '';
      detail.appendChild(el('h2', 'kosha-title', esc(tl(g.hw)) + ' <span class="kosha-slp1">' + esc(g.slp1) + '</span>'));
      if (!perDict.length) { detail.appendChild(el('div', 'kosha-empty', 'No full entry found.')); return; }
      perDict.forEach(function (d) {
        var card = el('div', 'kosha-card');
        var lic = d.meta.license && d.meta.license.indexOf('CC-BY') === 0;
        card.appendChild(el('div', 'kosha-src',
          esc(d.meta.name) + ' <span class="kosha-lic' + (lic ? ' ok' : '') + '">' + esc(d.meta.license || '') + '</span>'));
        d.items.forEach(function (it) {
          it.senses.forEach(function (s, i) {
            var sd = el('div', 'kosha-sense');
            var glossLang = s.gloss_language || d.meta.gloss_language;
            var head = '<span class="kosha-lang">' + (LANG_NAME[glossLang] || glossLang) + '</span>';
            if (s.pos) head += ' <span class="kosha-pos">' + esc(s.pos) + '</span>';
            sd.appendChild(el('div', 'kosha-sense-head', head));
            var gloss = el('div', 'kosha-gloss', esc(s.gloss || '').replace(/\n/g, '<br>'));
            sd.appendChild(gloss);
            if (s.etymology) sd.appendChild(el('div', 'kosha-ety', '<b>व्युत्पत्तिः:</b> ' + esc(tl(s.etymology))));
            if (s.note) sd.appendChild(el('div', 'kosha-note', esc(tl(s.note)).replace(/\n/g, '<br>')));
            (s.citations || []).forEach(function (c) {
              sd.appendChild(el('div', 'kosha-cite', '“' + esc(tl(c.text)) + '”')); });
            // cross-language pivot: offer translation into the user's language + English
            [PREF_LANG, 'en'].forEach(function (target) {
              if (glossLang === target || !s.gloss) return;
              var btn = el('button', 'kosha-xl', '→ ' + (LANG_NAME[target] || target));
              btn.onclick = function () {
                btn.disabled = true; btn.textContent = '…';
                translate(s.gloss, glossLang, target).then(function (t) {
                  var out = el('div', 'kosha-xl-out', '<span class="kosha-lang">' + (LANG_NAME[target] || target) + ' *</span> ' + esc(t));
                  sd.appendChild(out); btn.remove();
                }).catch(function (e) {
                  // Previously left the failure reason only in a hover
                  // tooltip on a bare "⚠" glyph -- confirmed for real that
                  // no one finds it there. Show it inline instead, same
                  // pattern as a successful translation's own output block.
                  var out = el('div', 'kosha-xl-out', '<span class="kosha-lang" style="background:var(--muted-text,#999)">⚠</span> ' + esc(e.message));
                  sd.appendChild(out); btn.remove();
                });
              };
              sd.appendChild(btn);
            });
            card.appendChild(sd);
          });
        });
        detail.appendChild(card);
      });
      detail.appendChild(el('div', 'kosha-foot', '* machine translation (BYOK Gemini) — verify against the original gloss.'));
    });
  }

  // ---- overlay + styles -----------------------------------------------------
  function injectCSS() {
    if (document.getElementById('kosha-css')) return;
    var css = document.createElement('style'); css.id = 'kosha-css';
    // Fallbacks below map to the app's real design tokens (css/main.css) so
    // the Kosha overlay themes with the rest of the site instead of using
    // hard-coded colours. FAB sits ABOVE the bottom toolbar (body reserves
    // 126px for it) and above the toolbar's z-index (9999) so it is never
    // hidden behind Filter/Tools; the overlay sits at modal level (11000).
    css.textContent = [
      '#kosha-fab{position:fixed;right:16px;bottom:calc(192px + env(safe-area-inset-bottom));z-index:10000;background:var(--accent-red,#8a5a2b);color:#fff;border:none;border-radius:28px;padding:12px 18px;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,.3);cursor:pointer}',
      '#kosha-ov{position:fixed;inset:0;z-index:11000;background:var(--bg-main,#fff);color:var(--text-primary,#111);display:none;flex-direction:column}',
      '#kosha-ov.open{display:flex}',
      '.kosha-bar{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--card-border,#ddd);align-items:center}',
      '.kosha-bar input{flex:1;font-size:18px;padding:10px 12px;border:1px solid var(--card-border,#ccc);border-radius:8px;background:var(--card-bg,#fff);color:inherit}',
      '.kosha-bar button{background:none;border:none;font-size:22px;cursor:pointer;color:inherit;padding:6px 10px}',
      '.kosha-body{flex:1;display:flex;min-height:0}',
      '.kosha-res{width:38%;max-width:340px;overflow:auto;border-right:1px solid var(--card-border,#eee)}',
      '.kosha-detail{flex:1;overflow:auto;padding:16px}',
      '@media(max-width:640px){.kosha-res{width:100%;max-width:none;border-right:none}.kosha-detail{display:none}#kosha-ov.showdetail .kosha-res{display:none}#kosha-ov.showdetail .kosha-detail{display:block}}',
      '.kosha-hit{padding:10px 12px;border-bottom:1px solid var(--card-border,#f0f0f0);cursor:pointer}',
      '.kosha-hit:hover{background:var(--card-active,#f6f1ea)}',
      '.kosha-hw{font-size:19px;font-weight:600;margin-right:8px}',
      '.kosha-count{font-size:12px;color:var(--muted-text,#888);margin-right:6px}',
      '.kosha-chip{display:inline-block;font-size:11px;background:var(--card-active,#efe7dc);border-radius:10px;padding:1px 7px;margin:1px 2px}',
      '.kosha-title{font-size:26px;margin:0 0 10px}',
      '.kosha-slp1{font-size:14px;color:var(--muted-text,#999);font-weight:400}',
      '.kosha-card{border:1px solid var(--card-border,#e6ddcf);border-radius:10px;padding:12px;margin:0 0 14px}',
      '.kosha-src{font-weight:600;margin-bottom:8px}',
      '.kosha-lic{font-size:11px;color:#a33;border:1px solid #d99;border-radius:8px;padding:0 6px;margin-left:6px;font-weight:400}',
      '.kosha-lic.ok{color:#286;border-color:#8c9}',
      '.kosha-sense{padding:6px 0;border-top:1px dashed var(--card-border,#eee)}',
      '.kosha-sense-head{margin-bottom:2px}',
      '.kosha-lang{font-size:11px;background:var(--accent-red,#8a5a2b);color:#fff;border-radius:8px;padding:1px 7px}',
      '.kosha-pos{font-size:12px;color:var(--muted-text,#888);font-style:italic}',
      '.kosha-gloss{font-size:17px;margin:2px 0}',
      '.kosha-ety,.kosha-note,.kosha-cite{font-size:14px;color:var(--muted-text,#666);margin:2px 0}',
      '.kosha-cite{font-style:italic}',
      '.kosha-xl{font-size:12px;margin:4px 6px 0 0;background:var(--card-active,#efe7dc);border:none;border-radius:8px;padding:3px 8px;cursor:pointer;color:inherit}',
      '.kosha-xl-out{font-size:15px;margin:4px 0;padding:6px 8px;background:var(--card-active,#f6f1ea);border-radius:8px}',
      '.kosha-empty,.kosha-loading,.kosha-foot{padding:14px;color:var(--muted-text,#999)}',
      '.kosha-foot{font-size:12px;border-top:1px solid var(--card-border,#eee);margin-top:12px}'
    ].join('\n');
    document.head.appendChild(css);
  }

  function build() {
    injectCSS();
    var fab = el('button'); fab.id = 'kosha-fab'; fab.textContent = 'कोश';
    var ov = el('div'); ov.id = 'kosha-ov';
    ov.innerHTML =
      '<div class="kosha-bar"><input id="kosha-q" placeholder="Search a word (Devanagari / IAST / Kannada)…" autocomplete="off">' +
      '<button id="kosha-close" title="Close">✕</button></div>' +
      '<div class="kosha-body"><div class="kosha-res" id="kosha-res"></div><div class="kosha-detail" id="kosha-detail">' +
      '<div class="kosha-empty">Type a headword to look it up across every dictionary.</div></div></div>';
    document.body.appendChild(fab); document.body.appendChild(ov);
    var input = ov.querySelector('#kosha-q'), res = ov.querySelector('#kosha-res'), detail = ov.querySelector('#kosha-detail');
    fab.onclick = function () { ov.classList.add('open'); input.focus(); };
    ov.querySelector('#kosha-close').onclick = function () {
      if (ov.classList.contains('showdetail')) ov.classList.remove('showdetail'); else ov.classList.remove('open'); };
    var t;
    input.oninput = function () {
      clearTimeout(t); var q = input.value;
      t = setTimeout(function () {
        if (!q.trim()) { res.innerHTML = ''; return; }
        search(q).then(function (list) {
          renderResults(list, res, detail);
          // on mobile, reveal detail pane when a hit is chosen
          res.querySelectorAll('.kosha-hit').forEach(function (r) {
            r.addEventListener('click', function () { ov.classList.add('showdetail'); }); });
        });
      }, 160);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  console.log('[Init] kosha.js loaded.');
})();
