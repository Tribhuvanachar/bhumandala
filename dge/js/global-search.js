/*
 * global-search.js — corpus-wide Sanskrit-aware fuzzy search UI for DGE.
 *
 * Self-injecting and additive: adding this one <script> tag is the ONLY change
 * to index.html. It builds its own launcher (a 🔎 button + Cmd/Ctrl-K) and an
 * overlay, so it won't collide with the existing in-grantha search or any
 * parallel edits to the page. Depends on dge-normalize.js + dge-search.js
 * (load those first) and reuses the Sanscript engine already on the page for
 * non-Devanagari input.
 *
 * The static index is generated offline by build_search_index.py into
 * dge/search_index/. Override the path by setting window.DGE_SEARCH_INDEX.
 */
(function () {
  'use strict';
  var INDEX_BASE = window.DGE_SEARCH_INDEX || 'search_index';
  var idxPromise = null, debounce = null;

  function css() {
    if (document.getElementById('dge-gs-css')) return;
    var s = document.createElement('style');
    s.id = 'dge-gs-css';
    s.textContent = [
      '.dge-gs-fab{position:fixed;right:16px;bottom:16px;z-index:9998;width:48px;height:48px;border-radius:50%;border:none;background:#7a3b1d;color:#fff;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}',
      '.dge-gs-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:none}',
      '.dge-gs-overlay.open{display:block}',
      '.dge-gs-panel{max-width:720px;margin:6vh auto 0;background:var(--card-bg,#fff);color:var(--text,#1a1a1a);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;font-family:inherit}',
      '.dge-gs-top{display:flex;gap:8px;padding:12px;border-bottom:1px solid rgba(0,0,0,.12)}',
      '.dge-gs-input{flex:1;font-size:17px;padding:10px 12px;border:1px solid rgba(0,0,0,.2);border-radius:8px;background:transparent;color:inherit}',
      '.dge-gs-scheme{border:1px solid rgba(0,0,0,.2);border-radius:8px;background:transparent;color:inherit;padding:0 6px}',
      '.dge-gs-results{max-height:64vh;overflow:auto;padding:6px 0}',
      '.dge-gs-row{padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.06)}',
      '.dge-gs-row:hover{background:rgba(122,59,29,.08)}',
      '.dge-gs-meta{font-size:12px;opacity:.7;display:flex;gap:8px;flex-wrap:wrap}',
      '.dge-gs-snip{font-size:16px;margin-top:2px;line-height:1.5}',
      '.dge-gs-hint{padding:14px;opacity:.6;font-size:13px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function build() {
    css();
    var fab = document.createElement('button');
    fab.className = 'dge-gs-fab';
    fab.title = 'Search all texts (Ctrl/Cmd-K)';
    fab.textContent = '🔎';
    fab.onclick = open;
    document.body.appendChild(fab);

    var ov = document.createElement('div');
    ov.className = 'dge-gs-overlay';
    ov.id = 'dge-gs-overlay';
    ov.innerHTML =
      '<div class="dge-gs-panel" role="dialog" aria-label="Global search">' +
        '<div class="dge-gs-top">' +
          '<input class="dge-gs-input" id="dge-gs-input" placeholder="Search all texts — Devanagari, IAST, HK, or SLP1…" autocomplete="off">' +
          '<select class="dge-gs-scheme" id="dge-gs-scheme">' +
            '<option value="auto">auto</option><option value="devanagari">देव</option>' +
            '<option value="iast">IAST</option><option value="hk">HK</option><option value="slp1">SLP1</option>' +
          '</select>' +
        '</div>' +
        '<div class="dge-gs-results" id="dge-gs-results"><div class="dge-gs-hint">Type a word or phrase in any script. Matching is sandhi/spelling tolerant.</div></div>' +
      '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);

    document.getElementById('dge-gs-input').addEventListener('input', onType);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    });
  }

  function ensureIndex() {
    if (!idxPromise) {
      if (!window.DGESearch) { alert('Search scripts not loaded (need dge-search.js).'); return null; }
      idxPromise = window.DGESearch.create(INDEX_BASE).catch(function (e) {
        idxPromise = null;
        document.getElementById('dge-gs-results').innerHTML =
          '<div class="dge-gs-hint">Could not load the search index at "' + INDEX_BASE + '". Generate it with build_search_index.py and commit dge/search_index/.</div>';
        throw e;
      });
    }
    return idxPromise;
  }

  function open() { build(); document.getElementById('dge-gs-overlay').classList.add('open'); ensureIndex(); setTimeout(function () { document.getElementById('dge-gs-input').focus(); }, 30); }
  function close() { var o = document.getElementById('dge-gs-overlay'); if (o) o.classList.remove('open'); }

  function queryOpts(input) {
    if (/[ऀ-ॿ]/.test(input)) return { scheme: 'devanagari' };
    var scheme = document.getElementById('dge-gs-scheme').value;
    if (scheme === 'auto') scheme = /[āīūṛṝḷṁṃḥśṣṅñṭḍṇ]/i.test(input) ? 'iast' : 'slp1';
    if (scheme === 'slp1' || scheme === 'devanagari') return { scheme: scheme };
    try { if (window.Sanscript) return { slp1: window.Sanscript.t(input, scheme, 'slp1') }; } catch (e) {}
    return { scheme: 'slp1' };
  }

  function go(slug, unit) {
    var p = window.location.pathname + '?path=' + slug;
    if (unit) p += '&jumpShloka=' + encodeURIComponent(unit);
    window.location.href = p;
  }

  function onType(e) {
    var q = e.target.value.trim();
    clearTimeout(debounce);
    if (!q) { document.getElementById('dge-gs-results').innerHTML = '<div class="dge-gs-hint">Type a word or phrase in any script.</div>'; return; }
    debounce = setTimeout(function () {
      var p = ensureIndex(); if (!p) return;
      p.then(function (idx) { return idx.search(q, Object.assign({ limit: 30 }, queryOpts(q))); })
       .then(render).catch(function () {});
    }, 140);
  }

  function esc(s) { return (s || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function render(hits) {
    var box = document.getElementById('dge-gs-results');
    if (!hits || !hits.length) { box.innerHTML = '<div class="dge-gs-hint">No matches.</div>'; return; }
    box.innerHTML = hits.map(function (h) {
      return '<div class="dge-gs-row" data-slug="' + esc(h.grantha) + '" data-unit="' + esc(h.unit) + '">' +
        '<div class="dge-gs-meta"><b>' + esc(h.title) + '</b><span>' + esc(h.unit) + '</span><span>' + esc(h.category) + '</span><span>' + h.score.toFixed(2) + '</span></div>' +
        '<div class="dge-gs-snip">' + esc(h.snippet) + '</div></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.dge-gs-row'), function (row) {
      row.onclick = function () { go(row.getAttribute('data-slug'), row.getAttribute('data-unit')); };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  window.DGEGlobalSearch = { open: open, close: close };
})();
