// js/kosha.js — DGE Kosha (multilingual dictionary) lookup.
// ADDITIVE + self-injecting. Adds a floating "कोश" button, an overlay search
// UI, fuzzy SLP1 headword lookup, per-dictionary result cards, per-language
// grouping, and a cross-language translate pivot (BYOK Gemini, reusing the
// app's existing 'gemini_api_key'/'gemini_model' localStorage keys).
// Loads its data from data/kosha/** produced by the importer. Touches no
// existing file or global beyond reading window.Sanscript.
(function () {
  'use strict';
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['kosha.js'] = 'v1.2';

  // Citation-form normalizer: strip a trailing visarga (H) / anusvara (M) from
  // an SLP1 headword so dictionaries that cite the nominative (रामः = rAmaH) or
  // accusative (रामं = rAmaM) group with the bare stem (राम = rAma). Vowel
  // length is preserved, so रम (rama) stays distinct from राम (rAma). This is
  // why Śabdakalpadruma/Vācaspatyam (which list रामः, not राम) now appear under
  // a "राम" search instead of looking absent.
  function gkey(s) { s = s || ''; var t = s.replace(/[HM]+$/, ''); return t || s; }

  // Data can live in-repo (data/kosha) or in a separate repo served over a CDN.
  // Set window.KOSHA_DATA_BASE (e.g. a jsDelivr /gh/…/data/koshas URL) to point
  // the app at the full external corpus once it outgrows the Pages repo.
  var BASE = (window.KOSHA_DATA_BASE || 'data/kosha').replace(/\/+$/, '');
  var V = '?v=1.2';
  var PREF_LANG = (localStorage.getItem('app_kosha_pref_lang') || 'kn'); // user's language (Kannada)
  var LANG_NAME = { sa: 'संस्कृतम्', kn: 'ಕನ್ನಡ', en: 'English', hi: 'हिन्दी',
                    bn: 'বাংলা', te: 'తెలుగు', ta: 'தமிழ்', fr: 'Français', de: 'Deutsch' };
  var cache = {}, manifest = null;

  // ---- admin-controlled visibility (respected at query time) ----------------
  // The Kosha admin dashboard (admin/kosha.html) writes a list of dictionary
  // slugs to hide from search WITHOUT deleting their data. We read it fresh on
  // every query so a change in the admin tab takes effect on the next search.
  function hiddenDicts() {
    try { var a = JSON.parse(localStorage.getItem('kosha_hidden_dicts') || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }

  // ---- BYOK Gemini credentials (shared with the rest of the app) ------------
  // The key/model are set in the main app (⚙️ Settings → Gemini) as
  // user_gemini_key / user_gemini_model, or on the Ashtadhyayi page as
  // dge.ash.gkey / dge.ash.gmodel (JSON-encoded). Older builds used the bare
  // gemini_api_key / gemini_model names. We accept all three so the pivot works
  // no matter where the user saved their key. (Bug: the old code read ONLY the
  // bare names, which nothing in the app ever writes, so it always failed.)
  function lsRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsJSON(k) { try { var v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
  function geminiKey() {
    return (lsRaw('user_gemini_key') || lsJSON('dge.ash.gkey') || lsRaw('gemini_api_key') || '').toString().trim();
  }
  function geminiModel() {
    return (lsRaw('user_gemini_model') || (window.appConfig && window.appConfig.geminiModel) ||
            lsJSON('dge.ash.gmodel') || lsRaw('gemini_model') || '').toString().trim();
  }

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
  // Return the SLP1 candidate spellings for a raw query. For Latin-script
  // input we try IAST/HK/ITRANS/SLP1 AND a lower-cased pass, because a casual
  // user typing "Madh"/"Rama" title-cased does NOT mean the SLP1/HK special
  // meanings that capitals carry (capital M = anusvara ṃ, capital H = visarga,
  // etc.). We then DROP any candidate that begins with anusvara ('M') or
  // visarga ('H') in SLP1 — no Sanskrit word can start with either, so such a
  // candidate is always a mis-parse. That was the "Madh → न-words" bug: "Madh"
  // was read as ṃ+a+dh → folded to n-initial → searched the wrong shard.
  function toSLP1list(q) {
    q = (q || '').trim(); if (!q) return [];
    var S = window.Sanscript, out = [];
    if (!S) return [q];
    try {
      if (/[ऀ-ॿ]/.test(q)) out.push(S.t(q, 'devanagari', 'slp1'));
      else if (/[ಀ-೿]/.test(q)) out.push(S.t(q, 'kannada', 'slp1'));
      else {
        var ql = q.toLowerCase();
        var variants = (ql === q) ? [q] : [q, ql];
        variants.forEach(function (qq) {
          ['iast', 'hk', 'itrans', 'slp1'].forEach(function (sc) {
            try { out.push(S.t(qq, sc, 'slp1')); } catch (e) {} });
        });
      }
    } catch (e) { out.push(q); }
    var seen = {}, res = [];
    out.forEach(function (x) {
      if (x && !seen[x] && !/^[MH]/.test(x)) { seen[x] = 1; res.push(x); }
    });
    return res;
  }

  // ---- search ---------------------------------------------------------------
  // Returns { list, exact, q }:
  //   list  — ranked result groups (each group = one headword across dicts)
  //   exact — true if at least one result's exact SLP1 spelling equals what the
  //           user typed (used to decide whether to show a "nearest match" note)
  function search(query) {
    return (manifest ? Promise.resolve(manifest) : j(BASE + '/_index/manifest.json')
        .then(function (m) { manifest = m; return m; }))
      .then(function (m) {
        if (!m) return { list: [], exact: false, q: query };
        var raw = toSLP1list(query);            // exact SLP1 spellings the user meant
        var rawSet = {}; raw.forEach(function (x) { rawSet[x] = 1; });
        var foldSet = {}, folds = [];
        raw.map(fold).forEach(function (f) { if (f && !foldSet[f]) { foldSet[f] = 1; folds.push(f); } });
        if (!folds.length) return { list: [], exact: false, q: query };
        var hidden = {}; hiddenDicts().forEach(function (s) { hidden[s] = 1; });
        var buckets = {};
        folds.forEach(function (qf) {
          var two = qf.slice(0, 2);
          m.buckets.forEach(function (b) { if (b === two || (qf.length < 2 && b[0] === qf[0])) buckets[b] = 1; });
        });
        var need = Object.keys(buckets);
        if (!need.length) return { list: [], exact: false, q: query };
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
            // Group by citation-normalized key (gkey) so रामः/रामं fold in with
            // राम. Skip records from admin-hidden dictionaries. Each group keeps
            // its member index-records (with their own fold + headword) so the
            // detail view can fetch every form.
            var groups = {};
            Object.keys(byFold).sort().forEach(function (fk) {
              byFold[fk].forEach(function (rec) {
                if (hidden[rec.d]) return;
                var gk = gkey(rec.s);
                var g = groups[gk] || (groups[gk] = { gkey: gk, members: [], dictSet: {},
                                                       hwCounts: {}, slps: {}, langs: {} });
                rec.fold = fk;
                g.members.push(rec);
                g.dictSet[rec.d] = 1;
                g.hwCounts[rec.h] = (g.hwCounts[rec.h] || 0) + 1;
                g.slps[rec.s] = 1;
                (rec.l || []).forEach(function (l) { g.langs[l] = 1; });
              });
            });
            var arr = Object.keys(groups).map(function (k) {
              var g = groups[k];
              // Display headword: prefer the bare-stem form (slp1 === gkey), else
              // the most-cited spelling, else the shortest.
              var base = g.members.filter(function (m) { return m.s === g.gkey; });
              g.hw = base.length ? base[0].h
                   : Object.keys(g.hwCounts).sort(function (a, b) {
                       return g.hwCounts[b] - g.hwCounts[a] || a.length - b.length; })[0];
              g.slp1 = g.gkey;
              g.dicts = g.members;                       // for the "N कोश" count
              g.dictCount = Object.keys(g.dictSet).length;
              g.exactSLP1 = Object.keys(g.slps).some(function (s) { return rawSet[s]; });
              g.foldExact = g.members.some(function (m) { return foldSet[m.fold]; });
              return g;
            });
            // Ranking: exact-SLP1 (राम beats रम when you typed राम) → exact-fold
            // → shorter headword → alphabetical.
            arr.sort(function (a, b) {
              var sa = a.exactSLP1 ? 0 : 1, sb = b.exactSLP1 ? 0 : 1;
              if (sa !== sb) return sa - sb;
              var ea = a.foldExact ? 0 : 1, eb = b.foldExact ? 0 : 1;
              if (ea !== eb) return ea - eb;
              return a.hw.length - b.hw.length || a.hw.localeCompare(b.hw);
            });
            return { list: arr.slice(0, 60), exact: arr.some(function (g) { return g.exactSLP1; }), q: query };
          });
      });
  }

  // ---- full entry (tier-2) --------------------------------------------------
  // A result group may span several headword-forms (राम, रामः, रामं) across
  // several dictionaries. Fetch each distinct (dict, fold, headword) member and
  // merge the items per dictionary.
  function loadEntry(group) {
    var dicts = manifest.dictionaries;
    var eLen = manifest.entry_shard_len || 3;
    var hidden = {}; hiddenDicts().forEach(function (s) { hidden[s] = 1; });
    var seen = {}, tasks = [];
    (group.members || []).forEach(function (m) {
      if (hidden[m.d] || !dicts[m.d]) return;
      var key = m.d + '|' + m.fold + '|' + m.h; if (seen[key]) return; seen[key] = 1;
      tasks.push(m);
    });
    return Promise.all(tasks.map(function (m) {
      var cat = dicts[m.d].category, bucket = m.fold.slice(0, eLen);
      return j(BASE + '/' + cat + '/' + m.d + '/e/' + safeBucket(bucket) + '.json')
        .then(function (sh) {
          if (!sh || !sh[m.fold]) return null;
          var items = sh[m.fold].filter(function (it) { return it.headword === m.h; });
          return items.length ? { slug: m.d, items: items } : null;
        });
    })).then(function (a) {
      var bySlug = {}, order = [];
      a.filter(Boolean).forEach(function (r) {
        if (!bySlug[r.slug]) { bySlug[r.slug] = { slug: r.slug, meta: dicts[r.slug], items: [] }; order.push(r.slug); }
        bySlug[r.slug].items.push.apply(bySlug[r.slug].items, r.items);
      });
      return order.map(function (s) { return bySlug[s]; });
    });
  }

  // ---- BYOK Gemini translate pivot -----------------------------------------
  // Delegates to the shared window.DGEGemini client (js/gemini.js) for human
  // error messages (quota/permission/etc.) and a one-step lighter-model
  // fallback -- same reasoning as Ashtadhyayi's AI tutor.
  function translate(text, fromLang, toLang) {
    var key = geminiKey();
    if (!key) return Promise.reject(new Error(
      'No Gemini API key found. Add one in the main app under ⚙️ Settings → Gemini (or on the अष्टाध्यायी page), then reopen कोश.'));
    var model = geminiModel();
    var prompt = 'Translate this ' + (LANG_NAME[fromLang] || fromLang) + ' dictionary gloss of a Sanskrit word into ' +
      (LANG_NAME[toLang] || toLang) + '. Output only the translation, no notes:\n\n' + text;
    return window.DGEGemini.generate({ prompt: prompt, apiKey: key, model: model || undefined })
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

  function renderResults(result, resBox, detail) {
    var list = result.list || [];
    resBox.innerHTML = '';
    if (!list.length) { resBox.appendChild(el('div', 'kosha-empty', 'No headwords found.')); return; }
    // If nothing matches the exact spelling typed, say so rather than letting a
    // near-neighbour (e.g. रम for राम) look like the answer.
    if (!result.exact && result.q) {
      resBox.appendChild(el('div', 'kosha-nearest',
        'No exact headword for “' + esc(tl(result.q)) + '”. Showing the nearest matches:'));
    }
    list.forEach(function (g) {
      var row = el('div', 'kosha-hit');
      var chips = Object.keys(g.langs).map(function (l) {
        return '<span class="kosha-chip">' + (LANG_NAME[l] || l) + '</span>'; }).join('');
      row.innerHTML = '<span class="kosha-hw">' + esc(tl(g.hw)) + '</span>' +
        '<span class="kosha-count">' + (g.dictCount || g.dicts.length) + ' कोश</span>' + chips;
      row.onclick = function () { openEntry(g, detail); };
      resBox.appendChild(row);
    });
  }

  function openEntry(g, detail) {
    detail.innerHTML = '<div class="kosha-loading">…</div>';
    loadEntry(g).then(function (perDict) {
      detail.innerHTML = '';
      detail.appendChild(el('h2', 'kosha-title', esc(tl(g.hw)) + ' <span class="kosha-slp1">' + esc(g.slp1) + '</span>'));
      if (!perDict.length) { detail.appendChild(el('div', 'kosha-empty', 'No full entry found.')); return; }
      perDict.forEach(function (d) {
        var card = el('div', 'kosha-card');
        var lic = d.meta.license && d.meta.license.indexOf('CC-BY') === 0;
        card.appendChild(el('div', 'kosha-src',
          esc(d.meta.name) + ' <span class="kosha-lic' + (lic ? ' ok' : '') + '">' + esc(d.meta.license || '') + '</span>'));
        d.items.forEach(function (it) {
          // when a dict's form differs from the group headword (रामः under राम), label it
          if (it.headword && it.headword !== g.hw) card.appendChild(el('div', 'kosha-altform', esc(tl(it.headword))));
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
              var label = '→ ' + (LANG_NAME[target] || target);
              var btn = el('button', 'kosha-xl', label);
              btn.onclick = function () {
                var old = sd.querySelector('.kosha-xl-err'); if (old) old.remove();
                btn.disabled = true; btn.textContent = '…';
                translate(s.gloss, glossLang, target).then(function (t) {
                  var out = el('div', 'kosha-xl-out', '<span class="kosha-lang">' + (LANG_NAME[target] || target) + ' *</span> ' + esc(t));
                  sd.appendChild(out); btn.remove();
                }).catch(function (e) {
                  btn.disabled = false; btn.textContent = label;
                  var err = el('div', 'kosha-xl-err', '⚠ ' + esc(e && e.message ? e.message : 'Translation failed.'));
                  sd.appendChild(err);
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
      '.kosha-altform{font-size:14px;font-weight:600;color:var(--muted-text,#8a5a2b);margin:6px 0 0}',
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
      '.kosha-xl-err{font-size:13px;margin:4px 0;padding:6px 8px;background:rgba(170,51,51,.08);border:1px solid #d99;border-radius:8px;color:#a33}',
      '.kosha-nearest{font-size:12.5px;padding:9px 12px;color:var(--muted-text,#8b7c66);background:var(--card-active,#f6f1ea);border-bottom:1px solid var(--card-border,#eee)}',
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
        search(q).then(function (result) {
          renderResults(result, res, detail);
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
