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
  // The index is 330 MB and lives on the "search-dist" branch, not in the
  // site: rebuilding it with the extract_text fix took the published site to
  // 1,013 MB against a 1 GB Pages ceiling. config.js sets
  // window.DGE_SEARCH_INDEX from appConfig; this constant is the same URL, so
  // a page that does not load config.js still finds it. Set the variable to
  // 'search_index' to read a local build instead.
  var CDN_INDEX = 'https://cdn.jsdelivr.net/gh/Tribhuvanachar/bhumandala@71b7c27bbda6060e3706ab2bd6ca57d72c91877b';
  var INDEX_BASE = window.DGE_SEARCH_INDEX || CDN_INDEX;
  var idxPromise = null, debounce = null;
  var currentScheme = 'auto'; // set by the scheme popup, read by queryOpts()

  // Post-search filters: narrow the results ALREADY fetched (never a new
  // network round trip -- a fresh query is already a 10+ second multi-shard
  // fetch through jsdelivr, see onType()'s own note; re-querying per filter
  // toggle would only make that worse). lastHits/lastQuery hold the most
  // recent completed search so filters + renderRows() can re-slice it.
  var lastHits = null, lastQuery = '';
  var filterState = { type: 'all', categories: {}, siddhanta: {}, keyword: '' };
  var CATEGORY_LABELS = {
    vedas: 'वेदाः', purana: 'पुराणानि', itihasa: 'इतिहासाः', darshana: 'दर्शनानि',
    smriti_dharma: 'स्मृतिधर्मशास्त्राणि', agama: 'आगमः', stotra: 'स्तोत्राणि',
    vedanga: 'वेदाङ्गानि', dasa_sahitya: 'दासस्ताहित्यम्', kavya_alankara: 'काव्यालङ्कारौ',
    dvaitavedanta: 'Dvaitavedanta', upaveda: 'उपवेदाः', nitishastra: 'नीतिशास्त्रम्', misc: 'अन्ये'
  };
  // Advaita/Dvaita/Vishishtadvaita aren't their own field on a hit (the
  // search index doesn't carry one) but this project's own taxonomy paths
  // already encode it unambiguously in the slug for anything under
  // darshana/vedanta/* or the separate top-level dvaitavedanta/* tree --
  // real signal, not a guess, just read from where it already lives rather
  // than duplicated into a new field.
  function siddhantaOf(slug) {
    if (/(^|\/)advaita(\/|$)/.test(slug)) return 'advaita';
    if (/(^|\/)vishishtadvaita(\/|$)/.test(slug)) return 'vishishtadvaita';
    if (/(^|\/)dvaita(\/|$)/.test(slug) || slug.indexOf('dvaitavedanta') === 0) return 'dvaita';
    return null;
  }
  var SIDDHANTA_LABELS = { advaita: 'अद्वैतम्', dvaita: 'द्वैतम्', vishishtadvaita: 'विशिष्टाद्वैतम्' };

  // Section slug -> display label, for the scope <select>. Falls back to a
  // title-cased, underscore-stripped version of the slug for anything not
  // listed here (see sectionLabel()), so a new section in the taxonomy shows
  // up usably without this map needing to be kept in lockstep.
  var SECTION_LABELS = {
    vedas: 'Vedas', vedanga: 'Vedāṅga', itihasa: 'Itihāsa', purana: 'Purāṇa',
    darshana: 'Darśana', dvaitavedanta: 'Dvaita Vedānta',
    kavya_alankara: 'Kāvya', smriti_dharma: 'Smṛti / Dharma',
    agama: 'Āgama', stotra: 'Stotra', dasa_sahitya: 'Dasa Sāhitya'
  };
  function sectionLabel(slug) {
    return SECTION_LABELS[slug] ||
      slug.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function css() {
    if (document.getElementById('dge-gs-css')) return;
    var s = document.createElement('style');
    s.id = 'dge-gs-css';
    // Colours read the app's real design tokens (css/main.css) so the search
    // UI themes with the rest of the site. The FAB sits ABOVE the bottom
    // toolbar (body reserves 126px for it) and above the toolbar z-index
    // (9999) so it is never hidden behind Filter/Tools; the overlay sits at
    // modal level (11000). The scheme <select> is styled to match the app's
    // controls (custom chevron, themed background) instead of the bare OS look.
    var ARROW = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%238a7a63' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";
    s.textContent = [
      '.dge-gs-fab{position:fixed;right:16px;bottom:calc(134px + env(safe-area-inset-bottom));z-index:10000;width:48px;height:48px;border-radius:50%;border:none;background:var(--accent-red,#7a3b1d);color:#fff;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}',
      '.dge-gs-overlay{position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.45);display:none}',
      '.dge-gs-overlay.open{display:block}',
      '.dge-gs-panel{max-width:720px;margin:6vh auto 0;background:var(--card-bg,#fff);color:var(--text-primary,#1a1a1a);border:1px solid var(--card-border,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;font-family:inherit}',
      '.dge-gs-top{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--card-border,rgba(0,0,0,.12));align-items:center}',
      '.dge-gs-input{flex:1;font-size:17px;padding:10px 12px;border:1px solid var(--card-border,rgba(0,0,0,.2));border-radius:8px;background:var(--card-bg,transparent);color:inherit}',
      // A custom popup (trigger button + a dropped-down option list), not a
      // native <select> -- a <select>'s OPEN list is drawn by the OS on
      // mobile and cannot be restyled, which is exactly what made this look
      // inconsistent with every other dropdown in the app (all of which are
      // this same button+popup-list shape; see #displayPopup in index.html).
      '.dge-gs-schemewrap{position:relative;flex:none}',
      '.dge-gs-schemebtn{border:1px solid var(--card-border,rgba(0,0,0,.2));border-radius:8px;background:var(--card-bg,#fff);color:var(--text-primary,inherit);padding:0 12px;height:40px;font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}',
      '.dge-gs-schemebtn:focus{outline:none;border-color:var(--accent-red,#7a3b1d)}',
      '.dge-gs-scheme-pop{position:absolute;top:calc(100% + 6px);right:0;background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(0,0,0,.15));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:6px;display:flex;flex-direction:column;gap:2px;min-width:110px;z-index:1;opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease,visibility .12s ease}',
      '.dge-gs-scheme-pop.show{opacity:1;visibility:visible;transform:translateY(0)}',
      '.dge-gs-scheme-opt{padding:8px 10px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;color:var(--text-primary,inherit)}',
      '.dge-gs-scheme-opt:hover{background:var(--card-border,rgba(0,0,0,.08))}',
      '.dge-gs-scheme-opt.active{background:var(--card-active,rgba(122,59,29,.12));color:var(--accent-red,#7a3b1d)}',
      '.dge-gs-x{border:1px solid var(--card-border,rgba(0,0,0,.2));background:var(--card-bg,#fff);color:var(--muted-text,#8a7a63);border-radius:8px;width:40px;height:40px;font-size:16px;cursor:pointer;flex:none}',
      '.dge-gs-x:hover{color:var(--accent-red,#7a3b1d);border-color:var(--accent-red,#7a3b1d)}',
      '.dge-gs-results{max-height:64vh;overflow:auto;padding:6px 0}',
      '.dge-gs-row{padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--card-border,rgba(0,0,0,.06))}',
      '.dge-gs-row:hover{background:var(--card-active,rgba(122,59,29,.08))}',
      '.dge-gs-meta{font-size:12px;opacity:.7;display:flex;gap:8px;flex-wrap:wrap}',
      '.dge-gs-snip{font-size:16px;margin-top:2px;line-height:1.5}',
      '.dge-gs-hl{background:rgba(232,178,77,.4);color:inherit;border-radius:3px;padding:0 1px;font-weight:700}',
      '.dge-gs-hint{padding:14px;opacity:.6;font-size:13px}',
      '.dge-gs-filterbar{padding:8px 12px;border-bottom:1px solid var(--card-border,rgba(0,0,0,.12));display:flex;flex-direction:column;gap:6px;}',
      '.dge-gs-frow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
      '.dge-gs-flabel{font-size:10.5px;opacity:.55;text-transform:uppercase;letter-spacing:.4px;flex:0 0 100%;margin-top:2px;}',
      '.dge-gs-flabel:first-child{margin-top:0;}',
      '.dge-gs-chip{border:1px solid var(--card-border,rgba(0,0,0,.2));background:var(--card-bg,#fff);color:var(--text-primary,inherit);border-radius:999px;padding:4px 11px;font-size:12px;cursor:pointer;white-space:nowrap;}',
      '.dge-gs-chip.active{background:var(--accent-red,#7a3b1d);border-color:var(--accent-red,#7a3b1d);color:#fff;}',
      '.dge-gs-kwbox{flex:1;min-width:120px;font-size:12px;padding:5px 9px;border:1px solid var(--card-border,rgba(0,0,0,.2));border-radius:8px;background:var(--card-bg,transparent);color:inherit;}',
      '.dge-gs-fcount{font-size:11px;opacity:.55;padding:0 4px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Guards against open() rebuilding the whole panel on every call: harmless
  // when there was nothing to populate post-load (the scheme <select> was
  // static markup), but the section <select> IS populated post-load from
  // the index's manifest, and a rebuilt duplicate got only "Everything" --
  // found by testing a second open() in the same page, not by inspection.
  function build() {
    if (document.getElementById('dge-gs-overlay')) return;
    css();
    var fab = document.createElement('button');
    fab.className = 'dge-gs-fab';
    fab.title = 'Search all texts (Ctrl/Cmd-K)';
    fab.textContent = '🔎';
    // Not `fab.onclick = open` — the DOM hands onclick the click's
    // PointerEvent as open()'s first argument, and since open() treats a
    // truthy `query` as prefill text, that event object landed in the
    // search box as the literal string "[object PointerEvent]".
    fab.onclick = function () { open(); };
    document.body.appendChild(fab);
    if (typeof window.dgeMakeFloatingDraggable === 'function') window.dgeMakeFloatingDraggable(fab, 'globalSearch');

    var ov = document.createElement('div');
    ov.className = 'dge-gs-overlay';
    ov.id = 'dge-gs-overlay';
    ov.innerHTML =
      '<div class="dge-gs-panel" role="dialog" aria-label="Global search">' +
        '<div class="dge-gs-top">' +
          '<input class="dge-gs-input" id="dge-gs-input" placeholder="Search all texts — Devanagari, IAST, HK, or SLP1…" autocomplete="off">' +
          '<div class="dge-gs-schemewrap">' +
            '<button type="button" class="dge-gs-schemebtn" id="dge-gs-scheme-btn" title="Input script">auto ▾</button>' +
            '<div class="dge-gs-scheme-pop" id="dge-gs-scheme-pop">' +
              '<div class="dge-gs-scheme-opt active" data-scheme="auto">auto</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="devanagari">देव</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="iast">IAST</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="hk">HK</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="slp1">SLP1</div>' +
            '</div>' +
          '</div>' +
          '<select class="dge-gs-scheme" id="dge-gs-section" title="Search scope">' +
            '<option value="">Everything</option>' +
          '</select>' +
          '<button class="dge-gs-x" id="dge-gs-x" title="Close (Esc)" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="dge-gs-filterbar" id="dge-gs-filterbar" style="display:none;"></div>' +
        '<div class="dge-gs-results" id="dge-gs-results"><div class="dge-gs-hint">Type a word or phrase in any script. Matching is sandhi/spelling tolerant.</div></div>' +
      '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);

    document.getElementById('dge-gs-x').addEventListener('click', close);
    document.getElementById('dge-gs-input').addEventListener('input', onType);
    // Changing scope re-runs the current query immediately -- no need to
    // retype for the search to reflect the new "Everything"/section choice.
    document.getElementById('dge-gs-section').addEventListener('change', function () {
      document.getElementById('dge-gs-input').dispatchEvent(new Event('input'));
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    });

    var schemeBtn = document.getElementById('dge-gs-scheme-btn');
    var schemePop = document.getElementById('dge-gs-scheme-pop');
    schemeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      schemePop.classList.toggle('show');
    });
    schemePop.addEventListener('click', function (e) {
      var opt = e.target.closest('.dge-gs-scheme-opt');
      if (!opt) return;
      currentScheme = opt.dataset.scheme;
      schemeBtn.textContent = (opt.textContent || currentScheme) + ' ▾';
      schemePop.querySelectorAll('.dge-gs-scheme-opt').forEach(function (o) { o.classList.toggle('active', o === opt); });
      schemePop.classList.remove('show');
      if (document.getElementById('dge-gs-input').value.trim()) onType();
    });
    // Same click-outside-closes convention as the overlay itself (line
    // above: `if (e.target === ov) close()`).
    document.addEventListener('click', function (e) {
      if (schemePop.classList.contains('show') && !e.target.closest('.dge-gs-schemewrap')) {
        schemePop.classList.remove('show');
      }
    });
  }

  function ensureIndex() {
    if (!idxPromise) {
      if (!window.DGESearch) { alert('Search scripts not loaded (need dge-search.js).'); return null; }
      idxPromise = window.DGESearch.create(INDEX_BASE).then(function (idx) {
        populateSections(idx.sections || []);
        return idx;
      }).catch(function (e) {
        idxPromise = null;
        document.getElementById('dge-gs-results').innerHTML =
          '<div class="dge-gs-hint">Could not load the search index at "' + INDEX_BASE + '". Generate it with build_search_index.py and commit dge/search_index/.</div>';
        throw e;
      });
    }
    return idxPromise;
  }

  // The section list only comes from the index's own manifest (it's not
  // known ahead of a fetch), so the <select> starts as just "Everything" and
  // fills in once ensureIndex() resolves. Guarded so a second open() in the
  // same page load doesn't duplicate the options.
  function populateSections(sections) {
    var sel = document.getElementById('dge-gs-section');
    if (!sel || sel.getAttribute('data-populated') || !sections.length) return;
    sel.setAttribute('data-populated', '1');
    sections.slice().sort(function (a, b) {
      return sectionLabel(a).localeCompare(sectionLabel(b));
    }).forEach(function (sec) {
      var opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sectionLabel(sec);
      sel.appendChild(opt);
    });
  }

  // `query` is optional. The word popover in intellisense.js passes the word
  // the reader tapped, so "where else does this occur" opens already
  // searching rather than asking them to retype it. Called with nothing, this
  // behaves exactly as before.
  function open(query) {
    build();
    document.getElementById('dge-gs-overlay').classList.add('open');
    ensureIndex();
    var input = document.getElementById('dge-gs-input');
    if (query && typeof query === 'string') {
      input.value = query;
      // onType is debounced against typing; dispatching the event it already
      // listens for keeps one code path for "the query changed".
      input.dispatchEvent(new Event('input'));
    }
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() { var o = document.getElementById('dge-gs-overlay'); if (o) o.classList.remove('open'); }

  function queryOpts(input) {
    if (/[ऀ-ॿ]/.test(input)) return { scheme: 'devanagari' };
    var scheme = currentScheme;
    if (scheme === 'auto') scheme = /[āīūṛṝḷṁṃḥśṣṅñṭḍṇ]/i.test(input) ? 'iast' : 'slp1';
    if (scheme === 'slp1' || scheme === 'devanagari') return { scheme: scheme };
    try { if (window.Sanscript) return { slp1: window.Sanscript.t(input, scheme, 'slp1') }; } catch (e) {}
    return { scheme: 'slp1' };
  }

  function go(slug, unit) {
    // ?path= is the READER's contract. From any other page carrying this
    // search (ashtadhyayi.html since the corpus-usage button), the result
    // must open in the reader — page-relative navigation would produce
    // ashtadhyayi.html?path=..., which that page ignores.
    var path = window.location.pathname;
    if (!/\/(index\.html)?$/.test(path)) {
      path = path.replace(/[^/]*$/, 'index.html');
    }
    var p = path + '?path=' + slug;
    if (unit) p += '&jumpShloka=' + encodeURIComponent(unit);
    window.location.href = p;
  }

  // A real query against this index is a manifest fetch plus several
  // postings-bucket and grantha-shard round trips through jsdelivr --
  // measured at 10+ seconds for a common word on a cold cache, not the
  // sub-second feel the debounce below implies. With no state shown while
  // that runs, the reader stares at the same "Type a word..." placeholder
  // the whole time, which reads as "this button does nothing" -- exactly
  // the bug report this responds to -- rather than as a slow search. The
  // "Searching..." line below is the fix; render()'s own "No matches."
  // already covers the empty-result end of this, so only the WAITING gap
  // was silent.
  function onType(e) {
    var q = e.target.value.trim();
    clearTimeout(debounce);
    var results = document.getElementById('dge-gs-results');
    if (!q) { results.innerHTML = '<div class="dge-gs-hint">Type a word or phrase in any script.</div>'; return; }
    results.innerHTML = '<div class="dge-gs-hint">Searching…</div>';
    debounce = setTimeout(function () {
      var p = ensureIndex(); if (!p) return;
      var section = (document.getElementById('dge-gs-section') || {}).value || undefined;
      p.then(function (idx) { return idx.search(q, Object.assign({ limit: 30, section: section }, queryOpts(q))); })
       .then(function (hits) { render(hits, q); })
       .catch(function () {
         // ensureIndex()'s own catch already writes a specific "could not
         // load the index" message and only fires on that one failure --
         // this covers every OTHER way the chain can reject (a posting or
         // shard fetch dying mid-search) so "Searching..." never just sits
         // there forever on a query that silently failed.
         var el = document.getElementById('dge-gs-results');
         if (el && el.innerHTML.indexOf('Searching') !== -1) {
           el.innerHTML = '<div class="dge-gs-hint">Search failed — check your connection and try again.</div>';
         }
       });
    }, 140);
  }

  // build_search_index.py now stores each unit's text up to 2000 chars
  // (was a fixed 140-char prefix), specifically so a match deeper into a
  // long commentary paragraph is actually IN the stored text somewhere —
  // but showing up to 2000 raw characters in one result row would be
  // unreadable. This slices a short, readable excerpt CENTERED on the
  // first place the query's own words actually appear, so what's shown is
  // the same text that gets highlighted, not an unrelated prefix. Falls
  // back to the plain prefix (today's behaviour) when no word is found in
  // this script — e.g. an IAST query against a Devanagari-only snippet,
  // a real but separate limitation this doesn't attempt to fix.
  function centerSnippet(text, q, radius) {
    radius = radius || 90;
    var words = (q || '').trim().split(/\s+/).filter(function (w) { return w.length >= 2; });
    var at = -1, matchLen = 0;
    for (var i = 0; i < words.length; i++) {
      var idx = text.toLowerCase().indexOf(words[i].toLowerCase());
      if (idx !== -1 && (at === -1 || idx < at)) { at = idx; matchLen = words[i].length; }
    }
    if (at === -1) return text.slice(0, radius * 2);
    var start = Math.max(0, at - radius);
    var end = Math.min(text.length, at + matchLen + radius);
    var out = text.slice(start, end);
    if (start > 0) out = '…' + out;
    if (end < text.length) out = out + '…';
    return out;
  }

  // Wraps whole-word, case-insensitive matches of the query's own words
  // (>=2 chars, so a stray single letter doesn't highlight half the
  // snippet) in <mark> — deliberately literal-substring, not aware of the
  // scheme normalization queryOpts() does for the search itself, since a
  // reader mainly wants to see the words they typed picked out of the
  // snippet they're already reading in that same script, not every
  // possible transliteration of a match found some other way.
  function highlightSnippet(escapedText, q) {
    var words = (q || '').trim().split(/\s+/).filter(function (w) { return w.length >= 2; });
    if (!words.length) return escapedText;
    var pattern = words.map(function (w) {
      return esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|');
    return escapedText.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark class="dge-gs-hl">$1</mark>');
  }

  // Escapes quotes too: the output goes into attributes (data-slug="…") as
  // well as text, and a value containing a quote would close the attribute
  // early and let what follows parse as markup. Same defect CodeQL found on
  // kosha.js's licence tooltip.
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Draws just the result rows for whatever hit list is passed (the full
  // search result, or a filtered slice of it) -- split out of render() so
  // the filter chips below can re-slice lastHits and redraw without a new
  // search.
  function renderRows(hits, q, emptyMessage) {
    var box = document.getElementById('dge-gs-results');
    if (!hits || !hits.length) {
      // Zero hits on a capped sweep is not proof of absence: one long word
      // whose trigrams are all common can crowd its true source out of the
      // shard budget entirely (see dge-search.js's note on `partial`), and
      // adding a second word genuinely fixes that — so say it.
      var msg = esc(emptyMessage || 'No matches.');
      if (lastHits && lastHits.partial && !emptyMessage) {
        msg += ' The search could not sweep the whole library for this — a single long word matches too much of it faintly. Adding one more word from the same line usually finds it.';
      }
      box.innerHTML = '<div class="dge-gs-hint">' + msg + '</div>';
      return;
    }
    // A common word matches most of the corpus; the search stops after the
    // best few dozen granthas rather than opening all of them. Say so, so a
    // reader does not take a capped list for the whole of it.
    var note = lastHits && lastHits.partial
      ? '<div class="dge-gs-hint">Best matches — the search stopped after the' +
        ' strongest few dozen texts rather than opening the whole library.' +
        ' A longer phrase narrows it.</div>'
      : '';
    box.innerHTML = note + hits.map(function (h) {
      return '<div class="dge-gs-row" data-slug="' + esc(h.grantha) + '" data-unit="' + esc(h.unit) + '">' +
        '<div class="dge-gs-meta"><b>' + esc(h.title) + '</b><span>' + esc(h.unit) + '</span><span>' + esc(h.category) + '</span><span>' + h.score.toFixed(2) + '</span></div>' +
        '<div class="dge-gs-snip">' + highlightSnippet(esc(centerSnippet(h.snippet, q)), q) + '</div></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.dge-gs-row'), function (row) {
      row.onclick = function (ev) {
        // A sutra reference inside the snippet (wired below) opens its own
        // popover on click; without this the row's own click-to-navigate
        // would also fire on the same tap, jumping to the grantha instead.
        if (ev.target.closest && ev.target.closest('.dge-sutra-ref')) return;
        go(row.getAttribute('data-slug'), row.getAttribute('data-unit'));
      };
    });
    // Sutra numbers appearing in a snippet get the same tappable popover
    // the reading view and Kosha already give them (js/intellisense.js) —
    // was Kosha-only; global corpus search snippets never got this.
    if (typeof window.dgeScanForSutras === 'function') {
      try { window.dgeScanForSutras(box); } catch (e) {}
    }
  }

  // Applies the current type/category/siddhanta/keyword filter state to
  // lastHits (never re-fetches -- see the comment on filterState above) and
  // redraws. Called on every filter chip click and every keystroke in the
  // refine box.
  function applyFilters() {
    if (!lastHits) return;
    var typeActive = filterState.type !== 'all';
    var catKeys = Object.keys(filterState.categories);
    var sidKeys = Object.keys(filterState.siddhanta);
    var kw = filterState.keyword.trim().toLowerCase();
    var out = lastHits.filter(function (h) {
      if (typeActive && h.contentType !== filterState.type) return false;
      if (catKeys.length && filterState.categories[h.category] !== true) return false;
      if (sidKeys.length && filterState.siddhanta[siddhantaOf(h.grantha)] !== true) return false;
      if (kw && (h.title + ' ' + h.snippet).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    });
    var anyFilterActive = typeActive || catKeys.length || sidKeys.length || kw;
    renderRows(out, lastQuery, anyFilterActive ? 'No results match these filters.' : 'No matches.');
    var fc = document.getElementById('dge-gs-fcount');
    if (fc) fc.textContent = anyFilterActive ? (out.length + ' of ' + lastHits.length) : '';
  }

  function filterChip(label, active, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'dge-gs-chip' + (active ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  // Rebuilds the filter bar's chip set from the CURRENT unfiltered result
  // set every time a new search completes -- a stale chip from the
  // previous query (a category with zero hits this time) would just be
  // confusing dead weight, so the bar always reflects what this result set
  // actually contains rather than every category the corpus could ever have.
  function buildFilterBar(hits) {
    var bar = document.getElementById('dge-gs-filterbar');
    if (!hits || !hits.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
    bar.innerHTML = '';
    bar.style.display = 'flex';

    var typeCounts = {};
    var catCounts = {};
    var sidCounts = {};
    hits.forEach(function (h) {
      typeCounts[h.contentType] = (typeCounts[h.contentType] || 0) + 1;
      catCounts[h.category] = (catCounts[h.category] || 0) + 1;
      var sid = siddhantaOf(h.grantha);
      if (sid) sidCounts[sid] = (sidCounts[sid] || 0) + 1;
    });

    // Row 1: content type (only worth showing when the result set actually
    // mixes types -- a pure Rigveda search is all "shloka" and the toggle
    // would have nothing to do).
    if ((typeCounts.shloka ? 1 : 0) + (typeCounts.commentary ? 1 : 0) + (typeCounts.prose ? 1 : 0) > 1) {
      var typeRow = document.createElement('div');
      typeRow.className = 'dge-gs-frow';
      var typeLabel = document.createElement('span');
      typeLabel.className = 'dge-gs-flabel'; typeLabel.textContent = 'Type';
      typeRow.appendChild(typeLabel);
      [['all', 'All'], ['shloka', 'Shlokas'], ['commentary', 'Commentary']].forEach(function (pair) {
        if (pair[0] !== 'all' && !typeCounts[pair[0]]) return;
        typeRow.appendChild(filterChip(pair[1], filterState.type === pair[0], function () {
          filterState.type = pair[0];
          buildFilterBar(hits); // re-render so the active chip highlight updates
          applyFilters();
        }));
      });
      bar.appendChild(typeRow);
    }

    // Row 2: category (multi-select toggle chips).
    var catKeys = Object.keys(catCounts).sort(function (a, b) { return catCounts[b] - catCounts[a]; });
    if (catKeys.length > 1) {
      var catRow = document.createElement('div');
      catRow.className = 'dge-gs-frow';
      var catLabel = document.createElement('span');
      catLabel.className = 'dge-gs-flabel'; catLabel.textContent = 'Category';
      catRow.appendChild(catLabel);
      catKeys.forEach(function (cat) {
        var label = (CATEGORY_LABELS[cat] || cat) + ' (' + catCounts[cat] + ')';
        catRow.appendChild(filterChip(label, filterState.categories[cat] === true, function () {
          if (filterState.categories[cat]) delete filterState.categories[cat];
          else filterState.categories[cat] = true;
          buildFilterBar(hits);
          applyFilters();
        }));
      });
      bar.appendChild(catRow);
    }

    // Row 3: siddhanta -- only when the result set actually has vedanta
    // hits carrying one, which most searches (any Veda/Itihasa/Purana/
    // Stotra text) will not.
    var sidKeys = Object.keys(sidCounts);
    if (sidKeys.length > 1 || (sidKeys.length === 1 && sidCounts[sidKeys[0]] < hits.length)) {
      var sidRow = document.createElement('div');
      sidRow.className = 'dge-gs-frow';
      var sidLabel = document.createElement('span');
      sidLabel.className = 'dge-gs-flabel'; sidLabel.textContent = 'सिद्धान्तः · Siddhānta';
      sidRow.appendChild(sidLabel);
      sidKeys.forEach(function (sid) {
        var label = (SIDDHANTA_LABELS[sid] || sid) + ' (' + sidCounts[sid] + ')';
        sidRow.appendChild(filterChip(label, filterState.siddhanta[sid] === true, function () {
          if (filterState.siddhanta[sid]) delete filterState.siddhanta[sid];
          else filterState.siddhanta[sid] = true;
          buildFilterBar(hits);
          applyFilters();
        }));
      });
      bar.appendChild(sidRow);
    }

    // Row 4: keyword refine + a live "N of M shown" count.
    var kwRow = document.createElement('div');
    kwRow.className = 'dge-gs-frow';
    var kwInput = document.createElement('input');
    kwInput.type = 'text';
    kwInput.className = 'dge-gs-kwbox';
    kwInput.placeholder = 'Refine within these results…';
    kwInput.value = filterState.keyword;
    kwInput.addEventListener('input', function (e) { filterState.keyword = e.target.value; applyFilters(); });
    kwRow.appendChild(kwInput);
    var fc = document.createElement('span');
    fc.className = 'dge-gs-fcount'; fc.id = 'dge-gs-fcount';
    kwRow.appendChild(fc);
    bar.appendChild(kwRow);
  }

  function render(hits, q) {
    lastHits = hits || [];
    lastQuery = q;
    filterState = { type: 'all', categories: {}, siddhanta: {}, keyword: '' };
    if (!hits || !hits.length) {
      document.getElementById('dge-gs-filterbar').style.display = 'none';
      renderRows([], q);
      return;
    }
    buildFilterBar(hits);
    applyFilters();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  window.DGEGlobalSearch = { open: open, close: close };
})();
