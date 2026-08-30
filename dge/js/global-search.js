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
  var CDN_INDEX = 'https://cdn.jsdelivr.net/gh/Tribhuvanachar/bhumandala@0c63992dfc23a0242ffd25d51061498fb39876fd';
  var INDEX_BASE = window.DGE_SEARCH_INDEX || CDN_INDEX;
  var idxPromise = null, debounce = null;
  var currentScheme = 'auto'; // set by the scheme popup, read by queryOpts()
  var currentSection = ''; // set by the section popup, read directly by onType() -- '' means "Everything"

  // Post-search filters: narrow the results ALREADY fetched (never a new
  // network round trip -- a fresh query is already a 10+ second multi-shard
  // fetch through jsdelivr, see onType()'s own note; re-querying per filter
  // toggle would only make that worse). lastHits/lastQuery hold the most
  // recent completed search so filters + renderRows() can re-slice it.
  // lastQueryDeva is the SAME query converted to Devanagari (see
  // queryToDevanagari() below) rather than folded to SLP1 -- computed once
  // per search, read by applyFilters()'s "Exact spelling only" toggle.
  var lastHits = null, lastQuery = '', lastQueryDeva = '', lastSearchElapsedMs = null;
  // "Exact spelling only" is a reader preference, not a per-search result --
  // persisted the same way as the app's other standing preferences (theme,
  // script, selection mode: dge_vyakarana_dark, dge_lang_pref,
  // dge_selection_mode) so it survives a page reload instead of resetting
  // to off every time.
  var EXACT_STORAGE_KEY = 'dge_gs_exact_spelling';
  // Default ON (30 Aug 2026, project-lead ask: "if I search for Kanthaya,
  // only those results which has explicit Kanthaya in the text must be
  // returned" -- fuzzy/near matches should be something a reader opts INTO,
  // not something they have to opt OUT of every search to avoid). A reader
  // who has never touched the chip gets exact-only by default; one who has
  // explicitly turned it off (localStorage holds '0') keeps that choice, same
  // persistence as before -- only the UNSET default direction changed.
  function dgeGsLoadExact() {
    try {
      var v = localStorage.getItem(EXACT_STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch (e) { return true; }
  }
  function dgeGsSaveExact(v) {
    try { localStorage.setItem(EXACT_STORAGE_KEY, v ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  var filterState = { type: 'all', categories: {}, siddhanta: {}, keyword: '', exact: dgeGsLoadExact() };
  // Single canonical label source (24 Aug 2026 UI/UX pass): both the
  // category filter-chip row AND the corpus-scope dropdown used to carry
  // their OWN hardcoded label maps -- one mostly-Devanagari, one entirely
  // IAST -- so the same category ("Vedāṅga" vs "वेदाङ्गानि") read as two
  // different taxonomies depending on which control you looked at, and
  // neither responded to the script picker. Both now resolve through
  // library.js's window.dgeSegLabel(seg), the exact function the Library
  // tree already uses for every folder label: DGE_PATH_LABELS' Devanagari
  // name (source of truth) run through dgeToActiveScript() so it follows
  // the reader's own script preference, the same as every other label in
  // the app. A category/section this maps has NOTHING app-specific about
  // it here anymore -- taxonomyLabel() falls back to a plain title-cased
  // rendering only if library.js somehow didn't load (defensive, not the
  // normal path -- index.html always loads library.js before this file).
  function taxonomyLabel(seg) {
    if (typeof window.dgeSegLabel === 'function') return window.dgeSegLabel(seg);
    return String(seg || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  // Advaita/Dvaita/Vishishtadvaita aren't their own field on a hit (the
  // search index doesn't carry one) but this project's own taxonomy paths
  // already encode it unambiguously in the slug for anything under
  // darshana/vedanta/* -- real signal, not a guess, just read from where
  // it already lives rather than duplicated into a new field. The
  // dvaitavedanta prefix check is kept for hits from a not-yet-rebuilt
  // search index still carrying the pre-23-Aug-2026 top-level path.
  function siddhantaOf(slug) {
    if (/(^|\/)advaita(\/|$)/.test(slug)) return 'advaita';
    if (/(^|\/)vishishtadvaita(\/|$)/.test(slug)) return 'vishishtadvaita';
    if (/(^|\/)dvaita(\/|$)/.test(slug) || slug.indexOf('dvaitavedanta') === 0) return 'dvaita';
    return null;
  }

  // Section slug -> display label, for the scope popup. taxonomyLabel()
  // (see above) is the single source for this now; kept as its own function
  // only because callers below read sectionLabel() as a name.
  function sectionLabel(slug) { return taxonomyLabel(slug); }

  function css() {
    if (document.getElementById('dge-gs-css')) return;
    var s = document.createElement('style');
    s.id = 'dge-gs-css';
    // Colours read the app's real design tokens (css/main.css) so the search
    // UI themes with the rest of the site. The overlay sits at modal level
    // (11000). Both the input-script picker and the search-scope picker are
    // the same custom button+popup-list shape (styled to match the app's
    // other controls) instead of a native <select> -- see the
    // .dge-gs-schemewrap comment below for why.
    // 24 Aug 2026: this used to also define a .dge-gs-fab floating circle.
    // The project lead's direct follow-up report overrides the earlier
    // "keep both FABs, they're frequent enough" call: "let it not sit
    // there... go into some menu item." build() below no longer creates a
    // trigger button of its own -- index.html's #dge-qa-tab is the only
    // entry point left, calling window.DGEGlobalSearch.open() directly
    // (still the same real, already-exported API further down this file).
    s.textContent = [
      '.dge-gs-overlay{position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.45);display:none}',
      '.dge-gs-overlay.open{display:block}',
      '.dge-gs-panel{max-width:720px;margin:6vh auto 0;background:var(--card-bg,#fff);color:var(--text-primary,#1a1a1a);border:1px solid var(--card-border,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;font-family:inherit}',
      '.dge-gs-top{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--card-border,rgba(0,0,0,.12));align-items:center}',
      // min-width:0 overrides the flex-item default of auto (which resolves
      // to the input's intrinsic content width) -- without it, this input
      // refuses to shrink below that width on a narrow phone, pushing the
      // two flex:none schemewrap buttons (and their popups) past the
      // panel's right edge, where .dge-gs-panel{overflow:hidden} clips
      // them -- confirmed live: "Everything ▾" truncated to "Eve", the
      // opened scope popup's option labels all cut off mid-word.
      '.dge-gs-input{flex:1;min-width:0;font-size:17px;padding:10px 12px;border:1px solid var(--card-border,rgba(0,0,0,.2));border-radius:8px;background:var(--card-bg,transparent);color:inherit}',
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
      // Real taxonomy hierarchy per hit (see taxonomyCrumbsHtml()) — small
      // and muted so it reads as metadata, not competing with the title.
      '.dge-gs-crumbs{font-size:11px;margin-top:2px;display:flex;flex-wrap:wrap;align-items:center;gap:2px;opacity:.75}',
      '.dge-gs-crumb-seg{color:var(--accent-red,#7a3b1d);text-decoration:underline dotted;text-underline-offset:2px;cursor:pointer}',
      '.dge-gs-crumb-seg:hover,.dge-gs-crumb-seg:focus-visible{text-decoration-style:solid}',
      '.dge-gs-crumb-current{color:inherit;font-weight:600}',
      '.dge-gs-crumb-sep{opacity:.6}',
      '.dge-gs-snip{font-size:16px;margin-top:2px;line-height:1.5}',
      '.dge-gs-hl{background:rgba(232,178,77,.4);color:inherit;border-radius:3px;padding:0 1px;font-weight:700}',
      '.dge-gs-hint{padding:14px;opacity:.6;font-size:13px;display:flex;align-items:center;gap:8px}',
      // A cold-cache query is a manifest fetch plus several postings-bucket
      // and grantha-shard round trips through jsdelivr (see onType()'s own
      // comment) -- 10+ seconds is common. Confirmed live with a throttled
      // connection: the plain "Searching..." text alone sits completely
      // static that whole time, which reads as inert/stuck exactly like the
      // silent placeholder this hint was built to replace, just with one
      // more word on screen. This spinner keeps the modal visibly alive for
      // however long the wait actually is. Declares its own @keyframes
      // rather than reusing main.css's -- ashtadhyayi.html/dhatu.html load
      // this file too but style themselves with vyakarana-base.css instead
      // of main.css, so this file can't assume main.css's keyframe exists
      // (same self-contained-injection reasoning as this file's own header
      // comment gives for shipping its whole stylesheet inline).
      '.dge-gs-spinner{width:13px;height:13px;flex:none;border:2px solid var(--card-border,rgba(0,0,0,.2));border-top-color:var(--accent-red,#7a3b1d);border-radius:50%;animation:dge-gs-spin .7s linear infinite}',
      '@keyframes dge-gs-spin{100%{transform:rotate(360deg)}}',
      // Determinate readout under the spinner: dge-search.js's search() now
      // reports real "N of M index files fetched" / "N of M texts opened"
      // progress (both counts are known ahead of the fetch that reports
      // them -- see allWithProgress()'s own comment), so this shows that
      // instead of leaving the reader to guess how much longer a 10+ second
      // cold-cache query has left.
      '.dge-gs-progress{height:3px;margin:0 14px 10px;background:var(--card-border,rgba(0,0,0,.12));border-radius:2px;overflow:hidden}',
      '.dge-gs-progress-bar{display:block;height:100%;width:0%;background:var(--accent-red,#7a3b1d);transition:width .15s ease}',
      // Real elapsed seconds, ticking while a query runs (startElapsedTimer())
      // and a one-line final report once it lands (elapsedNoteHtml()) --
      // project-lead ask: "N of M" alone doesn't say how many actual SECONDS
      // this is taking. Tabular-nums so the width doesn't jitter as the digits change.
      '.dge-gs-elapsed{font-variant-numeric:tabular-nums;opacity:.7}',
      '.dge-gs-elapsed-note{padding-top:10px;font-size:12px;opacity:.55}',
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
    var ov = document.createElement('div');
    ov.className = 'dge-gs-overlay';
    ov.id = 'dge-gs-overlay';
    ov.innerHTML =
      '<div class="dge-gs-panel" role="dialog" aria-label="Global search">' +
        '<div class="dge-gs-top">' +
          '<input class="dge-gs-input" id="dge-gs-input" placeholder="Search all texts — Devanagari, IAST, HK, or SLP1…" autocomplete="off">' +
          '<div class="dge-gs-schemewrap" id="dge-gs-scheme-wrap">' +
            '<button type="button" class="dge-gs-schemebtn" id="dge-gs-scheme-btn" title="Input script">auto ▾</button>' +
            '<div class="dge-gs-scheme-pop" id="dge-gs-scheme-pop">' +
              '<div class="dge-gs-scheme-opt active" data-scheme="auto">auto</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="devanagari">देव</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="iast">IAST</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="hk">HK</div>' +
              '<div class="dge-gs-scheme-opt" data-scheme="slp1">SLP1</div>' +
            '</div>' +
          '</div>' +
          // Same custom button+popup-list shape as the input-script picker
          // just above, not a native <select> -- a <select>'s OPEN list is
          // drawn by the OS on mobile and cannot be restyled, which made
          // this the one light-themed, unstyleable dropdown left in an
          // otherwise fully dark, custom-styled UI (confirmed against a
          // live screenshot). The section list is only known once the
          // index's manifest loads, so this starts as just "Everything"
          // and fills in via populateSections() below, same as the <select>
          // it replaces did with <option>s.
          '<div class="dge-gs-schemewrap" id="dge-gs-section-wrap">' +
            '<button type="button" class="dge-gs-schemebtn" id="dge-gs-section-btn" title="Search scope">Everything ▾</button>' +
            '<div class="dge-gs-scheme-pop" id="dge-gs-section-pop">' +
              '<div class="dge-gs-scheme-opt active" data-section="">Everything</div>' +
            '</div>' +
          '</div>' +
          '<button class="dge-gs-x" id="dge-gs-x" title="Close (Esc)" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="dge-gs-filterbar" id="dge-gs-filterbar" style="display:none;"></div>' +
        '<div class="dge-gs-results" id="dge-gs-results"><div class="dge-gs-hint">Type a word or phrase in any script. Matching is sandhi/spelling tolerant.</div></div>' +
      '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);

    document.getElementById('dge-gs-x').addEventListener('click', close);
    document.getElementById('dge-gs-input').addEventListener('input', onType);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    });

    // Re-runs the current query immediately after either popup's choice
    // changes -- no need to retype for the search to reflect the new
    // script/scope. Dispatches a real Event so onType(e) gets a genuine
    // e.target to read (onType destructures e.target.value); a bare
    // onType() call here previously threw "Cannot read properties of
    // undefined (reading 'target')" and silently skipped the re-search --
    // a real bug, confirmed live (picking an input-script option while a
    // query was already typed), not something introduced by this change.
    function rerunIfQueried() {
      var input = document.getElementById('dge-gs-input');
      if (input.value.trim()) input.dispatchEvent(new Event('input'));
    }

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
      rerunIfQueried();
    });

    // Search-scope picker -- see the .dge-gs-schemewrap comment in css()
    // above for why this is the same shape as the scheme picker instead of
    // a native <select>. Options are added by populateSections() below
    // once the index's manifest loads; only "Everything" exists at build().
    var sectionBtn = document.getElementById('dge-gs-section-btn');
    var sectionPop = document.getElementById('dge-gs-section-pop');
    sectionBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      sectionPop.classList.toggle('show');
    });
    sectionPop.addEventListener('click', function (e) {
      var opt = e.target.closest('.dge-gs-scheme-opt');
      if (!opt) return;
      currentSection = opt.dataset.section;
      sectionBtn.textContent = (opt.textContent || 'Everything') + ' ▾';
      sectionPop.querySelectorAll('.dge-gs-scheme-opt').forEach(function (o) { o.classList.toggle('active', o === opt); });
      sectionPop.classList.remove('show');
      rerunIfQueried();
    });

    // Same click-outside-closes convention as the overlay itself (line
    // above: `if (e.target === ov) close()`). Scoped per popup by its own
    // wrapper id so clicking inside one never closes the other.
    document.addEventListener('click', function (e) {
      if (schemePop.classList.contains('show') && !e.target.closest('#dge-gs-scheme-wrap')) {
        schemePop.classList.remove('show');
      }
      if (sectionPop.classList.contains('show') && !e.target.closest('#dge-gs-section-wrap')) {
        sectionPop.classList.remove('show');
      }
    });
  }

  // populateSections is attached on EVERY call, not only the one that
  // actually creates idxPromise -- 24 Aug 2026, needed once prefetchManifest()
  // below could call this before build() has ever run (no #dge-gs-section-pop
  // to populate yet). Splitting "fetch and cache the index" from "populate
  // the (maybe not-yet-built) DOM" this way means a prefetch's own idle-time
  // call safely no-ops (populateSections' own data-populated/element-exists
  // guards handle that), and the LATER real call from open() -- after build()
  // has created the popup -- still populates it correctly, from the same
  // already-resolved, cached promise. Before this change populateSections
  // ran only once, tied to the original .then() chain, so an early prefetch
  // would have silently left the section popup permanently un-populated.
  function ensureIndex() {
    if (!idxPromise) {
      if (!window.DGESearch) { alert('Search scripts not loaded (need dge-search.js).'); return null; }
      idxPromise = window.DGESearch.create(INDEX_BASE).catch(function (e) {
        idxPromise = null;
        // Guarded: a prefetch call (see prefetchManifest()) can reach this
        // catch before build() has ever run, when #dge-gs-results doesn't
        // exist yet -- writing to it unconditionally would throw a second,
        // unrelated error on top of the real one.
        var el = document.getElementById('dge-gs-results');
        if (el) {
          el.innerHTML = '<div class="dge-gs-hint">Could not load the search index at "' + INDEX_BASE + '". Generate it with build_search_index.py and commit dge/search_index/.</div>';
        }
        throw e;
      });
    }
    return idxPromise.then(function (idx) {
      populateSections(idx.sections || []);
      return idx;
    });
  }

  // The section list only comes from the index's own manifest (it's not
  // known ahead of a fetch), so the popup starts as just "Everything" and
  // fills in once ensureIndex() resolves. Guarded so a second open() in the
  // same page load doesn't duplicate the options.
  function populateSections(sections) {
    var pop = document.getElementById('dge-gs-section-pop');
    if (!pop || pop.getAttribute('data-populated') || !sections.length) return;
    pop.setAttribute('data-populated', '1');
    sections.slice().sort(function (a, b) {
      return sectionLabel(a).localeCompare(sectionLabel(b));
    }).forEach(function (sec) {
      var opt = document.createElement('div');
      opt.className = 'dge-gs-scheme-opt';
      opt.dataset.section = sec;
      opt.textContent = sectionLabel(sec);
      pop.appendChild(opt);
    });
  }

  // `query` is optional. The word popover in intellisense.js passes the word
  // the reader tapped, so "where else does this occur" opens already
  // searching rather than asking them to retype it. Called with nothing, this
  // behaves exactly as before.
  // Reported live (screenshots): tapping "Search Library" from a word
  // selection did nothing on the first tap, then on the second tap the
  // overlay opened, results appeared for under a second, then the page
  // immediately navigated away to an unrelated grantha the reader never
  // clicked -- for the SAME query, every time. Root cause: the word-tools
  // buttons fire on pointerdown (see ai.js's own comment on
  // dgeApplyWordSelectionHighlight for the first-tap half of this same
  // report), so open() can run and a result row can render at that exact
  // screen position WHILE the triggering tap is still completing -- the
  // trailing compatibility click of that same physical gesture then lands
  // on whatever now occupies that spot, which is a real result row with a
  // real onclick. Guarding renderRows()'s row.onclick against firing within
  // this short a window of open() blocks exactly that stray same-gesture
  // click without adding any perceptible delay to a reader's own,
  // deliberate later tap.
  var lastOpenAt = 0;
  var GHOST_CLICK_GUARD_MS = 400;

  function open(query) {
    build();
    document.getElementById('dge-gs-overlay').classList.add('open');
    lastOpenAt = Date.now();
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

  // Detects which of the OTHER Brahmic scripts this app already offers as a
  // reading script (config.js's SCRIPT_OPTIONS -- Kannada/Telugu/Tamil/
  // Malayalam/Bengali/Odia) a query is written in, by Unicode block, the
  // same way the pre-existing Devanagari check above does. Project-lead
  // ask: a reader should be able to type a query in ANY of those scripts
  // (or English capitals/diacritics/plain SLP1) and "auto" should just work,
  // not silently mis-guess it as Roman IAST/SLP1 (which garbled anything
  // typed in an actual Indic script other than Devanagari -- confirmed live,
  // this used to hand Telugu/Tamil input straight to the SLP1 folder).
  // Sanscript.js already has real conversion tables for every one of these
  // (transliteration.js already round-trips through them for the reading
  // script itself) -- this only adds the DETECTION queryOpts()/
  // queryToDevanagari() were missing for a query, not a new engine.
  var BRAHMIC_SCRIPT_RANGES = [
    ['bengali', /[ঀ-৿]/],
    ['oriya', /[଀-୿]/],
    ['tamil', /[஀-௿]/],
    ['telugu', /[ఀ-౿]/],
    ['kannada', /[ಀ-೿]/],
    ['malayalam', /[ഀ-ൿ]/]
  ];
  function detectBrahmicScript(input) {
    for (var i = 0; i < BRAHMIC_SCRIPT_RANGES.length; i++) {
      if (BRAHMIC_SCRIPT_RANGES[i][1].test(input)) return BRAHMIC_SCRIPT_RANGES[i][0];
    }
    return null;
  }

  function queryOpts(input) {
    if (/[ऀ-ॿ]/.test(input)) return { scheme: 'devanagari' };
    var scheme = currentScheme;
    var detected = detectBrahmicScript(input);
    if (scheme === 'auto') scheme = detected || (/[āīūṛṝḷṁṃḥśṣṅñṭḍṇ]/i.test(input) ? 'iast' : 'slp1');
    if (scheme === 'slp1' || scheme === 'devanagari') return { scheme: scheme };
    try { if (window.Sanscript) return { slp1: window.Sanscript.t(input, scheme, 'slp1') }; } catch (e) {}
    return { scheme: 'slp1' };
  }

  // "Exact spelling only" (24 Aug 2026, the backlog item deferred when the
  // rest of this session's search work shipped -- the project lead's
  // go-ahead: "Sure. Go ahead. No problem."). The index itself only ever
  // stores trigrams over the PHONETICALLY FOLDED key (see
  // SEARCH_ARCHITECTURE.md/dge-normalize.js) -- there is no separate
  // literal-spelling index to query, and building one would mean
  // rebuilding the 330MB artifact, exactly the architecture change this
  // whole pass was told not to make. What the index DOES already store,
  // per unit, is the real Devanagari snippet text (row.s / h.snippet) --
  // so "exact" is implemented as a client-side POST-filter on the results
  // a normal fuzzy search already fetched, same as every other filter chip
  // in this file (type/category/siddhanta/keyword), never a new query.
  // Converts the query to Devanagari the same way queryOpts() above
  // detects its script, but to 'devanagari' instead of 'slp1' -- the
  // snippet's own stored script -- so the comparison is a literal
  // character-for-character containment check, not a folded one.
  function queryToDevanagari(input) {
    if (/[ऀ-ॿ]/.test(input)) return input.trim();
    var scheme = currentScheme;
    var detected = detectBrahmicScript(input);
    if (scheme === 'auto') scheme = detected || (/[āīūṛṝḷṁṃḥśṣṅñṭḍṇ]/i.test(input) ? 'iast' : 'slp1');
    try { if (window.Sanscript) return window.Sanscript.t(input, scheme, 'devanagari').trim(); } catch (e) {}
    return input.trim();
  }

  // Orthographic-equivalence normalization for the exact-spelling
  // comparison -- "exact" means the same WORD as written, not the same
  // bytes. Three folds, applied to BOTH sides in applyFilters() so none
  // can introduce a one-directional false negative:
  //  * NFC -- an Android IME can emit an unnormalized codepoint sequence
  //    visually identical to the composed form (reported live);
  //  * strip zero-width joiner/non-joiner (U+200D/U+200C) -- IME ligature
  //    hints, byte-different, invisible;
  //  * anusvara <-> homorganic class nasal (कान्ताय <-> कांताय): every
  //    Sanskrit editor treats these as interchangeable spellings of the
  //    SAME word, and hiding one from a query typed the other way is a
  //    false negative a reader experiences as a missing verse. Class
  //    nasal + virama before a consonant folds to anusvara (ं).
  // Everything else stays byte-strict: vowel length, sibilant identity
  // (श/ष/स), visarga, gemination -- those distinguish genuinely different
  // words, which is exactly what "Exact spelling only" promises to honor.
  function dgeGsExactNormalize(s) {
    return String(s || '').normalize('NFC').replace(/[‌‍]/g, '')
      .replace(/[ङञणनम]्(?=[क-ह])/g, 'ं');
  }

  // Shared by go() and the per-hit taxonomy crumbs below: the reader's own
  // URL from wherever this search happens to be running (ashtadhyayi.html
  // since the corpus-usage button, or any other page that loads this file)
  // — page-relative navigation would otherwise produce e.g.
  // ashtadhyayi.html?path=..., which that page ignores.
  function readerBase() {
    var path = window.location.pathname;
    if (!/\/(index\.html)?$/.test(path)) {
      path = path.replace(/[^/]*$/, 'index.html');
    }
    return path;
  }

  function go(slug, unit, hl) {
    // ?path= is the READER's contract.
    var p = readerBase() + '?path=' + slug;
    if (unit) p += '&jumpShloka=' + encodeURIComponent(unit);
    // core.js reads this as ?hl= (see dgeResolveQuickJumpTarget's caller) to
    // highlight the searched word/phrase on arrival -- Devanagari already,
    // same script the reader's own text is in, so it can be matched against
    // .dge-word spans without a scheme conversion on the far side. Reported
    // live: "that Vastu is not highlighted in any of the text" once a
    // search result was actually opened.
    if (hl) p += '&hl=' + encodeURIComponent(hl);
    window.location.href = p;
  }

  // Real taxonomy hierarchy per result (25 Aug 2026 project-lead ask: "in
  // the Kosha search, all sutras must be backlinked" turned out to have a
  // sibling ask already on record for global search too -- every hit's
  // title/category/score row said WHAT matched and roughly where, but
  // never showed or let a reader follow the actual taxonomy path a hit
  // lives at (h.grantha is that real path -- see taxonomyLabel()'s own
  // comment above for why the slug, not h.category, is the source of
  // truth). Every ancestor segment is a real link to the Library browser
  // drilled to that node (library.js's dgeOpenLibraryToPath, reached via
  // core.js's ?libraryPath= handling -- the SAME mechanism layer-stitch.js's
  // lineage strip now uses, not a second one invented here). The leaf
  // segment (the hit's own grantha) stays a plain "you are here" label,
  // matching that same convention -- the row itself is already the click
  // target to open it (see renderRows()'s own row.onclick).
  function taxonomyCrumbsHtml(grantha, title) {
    var segs = String(grantha || '').split('/').filter(Boolean);
    if (!segs.length) return '';
    var base = readerBase();
    var cum = '', out = [];
    segs.forEach(function (seg, i) {
      cum = cum ? cum + '/' + seg : seg;
      if (i === segs.length - 1) {
        out.push('<span class="dge-gs-crumb-current">' + esc(title || taxonomyLabel(seg)) + '</span>');
      } else {
        out.push('<a class="dge-gs-crumb-seg" href="' + esc(base + '?libraryPath=' + encodeURIComponent(cum)) + '">' + esc(taxonomyLabel(seg)) + '</a>');
      }
    });
    return '<div class="dge-gs-crumbs">' + out.join('<span class="dge-gs-crumb-sep">›</span>') + '</div>';
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
  // Real elapsed time, not just a step counter -- the project lead's explicit
  // complaint was that "N of M" alone doesn't say how many actual SECONDS a
  // cold-cache query (10+, see this function's own header comment) is
  // taking, which reads as stalled rather than slow. Ticks the visible label
  // independently of onProgress's own updates (which only fire when a fetch
  // batch settles, sometimes seconds apart) so the clock itself never looks
  // frozen. One live timer at a time -- clearElapsedTimer() is called before
  // starting a new one and on every terminal state (success or failure) so a
  // stale interval from a replaced query can't keep ticking into a label
  // that no longer belongs to it.
  var elapsedTimer = null;
  function clearElapsedTimer() { if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; } }
  function startElapsedTimer(results) {
    clearElapsedTimer();
    var startedAt = Date.now();
    elapsedTimer = setInterval(function () {
      var el = results.querySelector('.dge-gs-elapsed');
      if (!el) { clearElapsedTimer(); return; }
      el.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + 's';
    }, 100);
    return startedAt;
  }

  function onType(e) {
    var q = e.target.value.trim();
    clearTimeout(debounce);
    clearElapsedTimer();
    var results = document.getElementById('dge-gs-results');
    if (!q) { results.innerHTML = '<div class="dge-gs-hint">Type a word or phrase in any script.</div>'; return; }
    results.innerHTML = '<div class="dge-gs-hint"><span class="dge-gs-spinner" aria-hidden="true"></span>' +
      '<span class="dge-gs-searching-label">Searching…</span>' +
      ' <span class="dge-gs-elapsed">0.0s</span></div>' +
      '<div class="dge-gs-progress"><i class="dge-gs-progress-bar"></i></div>';
    startElapsedTimer(results);
    debounce = setTimeout(function () {
      var p = ensureIndex(); if (!p) return;
      var section = currentSection || undefined;
      lastQueryDeva = queryToDevanagari(q);
      var searchStartedAt = startElapsedTimer(results); // real search work starts now, not at the first keystroke
      // Two real stages, in order: fetching the rarest trigrams' postings
      // buckets, then opening the candidate granthas' unit shards -- see
      // dge-search.js's search()/allWithProgress(). Split the bar 50/50
      // between them (their relative sizes aren't comparable -- one counts
      // small index files, the other whole grantha shards -- so weighting
      // by byte size isn't something either side knows); each stage still
      // reports its own real "done of total" underneath the label. A stale
      // callback from a query the reader has since replaced finds its
      // elements already gone (results redrawn) and is a no-op.
      var onProgress = function (stage, done, total) {
        var label = results.querySelector('.dge-gs-searching-label');
        var bar = results.querySelector('.dge-gs-progress-bar');
        if (!label || !bar) return;
        var half = total ? (done / total) * 50 : 0;
        if (stage === 'postings') {
          label.textContent = 'Searching… fetching index (' + done + ' of ' + total + ')';
          bar.style.width = half + '%';
        } else {
          label.textContent = 'Searching… opening texts (' + done + ' of ' + total + ')';
          bar.style.width = (50 + half) + '%';
        }
      };
      // Reported live: कान्ताय's only genuine exact matches in the whole
      // corpus sit under DvaitaVedanta, which render() below already hides
      // post hoc from a non-admin reader -- but by then the shard-open
      // budget (dge-search.js's MAX_SHARDS/MAX_EXACT_SHARDS) had already
      // been spent opening those same granthas' shards, leaving no room for
      // a genuinely visible match elsewhere to even be considered. Passing
      // the same admin-only prefixes through as excludeGranthaPrefixes lets
      // dge-search.js drop them BEFORE they count against that budget, for
      // a reader who won't see them rendered anyway.
      var excludePrefixes = dgeSearchIsAdmin() ? [] : ADMIN_ONLY_GRANTHA_PREFIXES;
      var searchOpts = Object.assign({ limit: 30, section: section, onProgress: onProgress, excludeGranthaPrefixes: excludePrefixes }, queryOpts(q));
      // "Exact spelling only" ON (the default) routes through the word-level
      // EXACT index (dge-search.js searchExact()) -- a direct word->units
      // lookup with no shard-open budget and no candidate ties, the answer
      // to the reported "कान्ताय exists verbatim in Sumadhva Vijaya but an
      // unscoped search never returns it" (its trigram fragments tie with
      // ~48k unrelated units; no budget reaches the real one). The trigram
      // fuzzy path stays for exact=OFF, typo-tolerance being its actual
      // job. If the published index predates the words/ tree entirely,
      // searchExact finds no bucket files and returns [] -- fall back to
      // the fuzzy path rather than showing a false "no matches".
      var useExact = filterState.exact;
      p.then(function (idx) {
         if (!useExact) return idx.search(q, searchOpts);
         return idx.searchExact(q, searchOpts).then(function (hits) {
           if (hits.length) return hits;
           return idx.search(q, searchOpts);
         });
       })
       .then(function (hits) {
         clearElapsedTimer();
         lastSearchElapsedMs = Date.now() - searchStartedAt;
         render(hits, q);
       })
       .catch(function () {
         clearElapsedTimer();
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
  // "Found in 3.2s" / "Searched in 8.7s" -- shown once, on the render that
  // just completed a real search (not on a filter-chip re-render of the
  // same lastHits, which doesn't re-search and has nothing new to time).
  // Reset to null right after use so it can't get attached to a LATER
  // re-render of the same result set.
  function elapsedNoteHtml(zeroHits) {
    if (lastSearchElapsedMs == null) return '';
    var s = (lastSearchElapsedMs / 1000).toFixed(1) + 's';
    lastSearchElapsedMs = null;
    return '<div class="dge-gs-hint dge-gs-elapsed-note">' + (zeroHits ? 'Searched' : 'Found') + ' in ' + s + '.</div>';
  }

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
      box.innerHTML = elapsedNoteHtml(true) + '<div class="dge-gs-hint">' + msg + '</div>';
      return;
    }
    // A common word matches most of the corpus; the search stops after the
    // best few dozen granthas rather than opening all of them. Say so, so a
    // reader does not take a capped list for the whole of it.
    var note = elapsedNoteHtml(false) + (lastHits && lastHits.partial
      ? '<div class="dge-gs-hint">Best matches — the search stopped after the' +
        ' strongest few dozen texts rather than opening the whole library.' +
        ' A longer phrase narrows it.</div>'
      : '');
    box.innerHTML = note + hits.map(function (h) {
      // h.unit is a raw source-importer id (unit_0370, DV_5752, a verse
      // number...) -- real navigation state (kept in data-unit, below, for
      // go()/jumpShloka), but not something a reader needs to see, and the
      // project lead has separately asked that the app's own internal
      // references not surface the original source's own numbering
      // verbatim in the UI. No longer shown in the row itself.
      return '<div class="dge-gs-row" data-slug="' + esc(h.grantha) + '" data-unit="' + esc(h.unit) + '">' +
        '<div class="dge-gs-meta"><b>' + esc(h.title) + '</b><span>' + esc(h.category) + '</span><span>' + h.score.toFixed(2) + '</span></div>' +
        taxonomyCrumbsHtml(h.grantha, h.title) +
        '<div class="dge-gs-snip">' + highlightSnippet(esc(centerSnippet(h.snippet, q)), q) + '</div></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.dge-gs-row'), function (row) {
      row.onclick = function (ev) {
        // See open()'s own comment on lastOpenAt/GHOST_CLICK_GUARD_MS: a
        // click landing here within this many ms of the overlay opening is
        // the trailing compatibility click of the SAME physical tap that
        // opened it, not a reader deliberately tapping a result row that
        // didn't exist yet when their gesture began.
        if (Date.now() - lastOpenAt < GHOST_CLICK_GUARD_MS) return;
        // A sutra reference inside the snippet (wired below) opens its own
        // popover on click; without this the row's own click-to-navigate
        // would also fire on the same tap, jumping to the grantha instead.
        if (ev.target.closest && ev.target.closest('.dge-sutra-ref')) return;
        // Same reasoning for a taxonomy crumb link: it's a real <a href>
        // navigating to the Library browser, not a proxy for "open this
        // hit" — letting the row handler also fire would race its own
        // window.location.href against the anchor's native navigation.
        if (ev.target.closest && ev.target.closest('.dge-gs-crumbs')) return;
        go(row.getAttribute('data-slug'), row.getAttribute('data-unit'), lastQueryDeva || q);
      };
    });
    // Sutra numbers appearing in a snippet get the same tappable popover
    // the reading view and Kosha already give them (js/intellisense.js) —
    // was Kosha-only; global corpus search snippets never got this.
    // entity-linker.js's cross-reference scan runs first for the same
    // "work name + number becomes one span" reason documented in its own
    // header comment and in render.js's equivalent pairing.
    if (typeof window.dgeScanForEntities === 'function') {
      try { window.dgeScanForEntities(box); } catch (e) {}
    }
    if (typeof window.dgeScanForSutras === 'function') {
      // Per-row, not once over the whole results box: intellisense.js's own
      // "always link, no cue word needed" trust list (CFG.alwaysLinkIn)
      // keys off window.currentGranthaSlug, which is what the READER is
      // showing -- meaningless here, since one results box mixes hits from
      // many granthas at once. Each row already carries its own hit's slug
      // (data-slug, used by the click-to-navigate handler above), so that's
      // checked per row instead. Same 'vedanga/vyakarana' prefix
      // intellisense.js trusts elsewhere -- a hit from Kāśikā or the
      // Aṣṭādhyāyī's own sūtrapāṭha cites bare "1.1.1"-shaped numbers with
      // no "सूत्र"/"पाणिनि" cue word nearby, same gap as Kosha's cards.
      Array.prototype.forEach.call(box.querySelectorAll('.dge-gs-row'), function (row) {
        var slug = row.getAttribute('data-slug') || '';
        try { window.dgeScanForSutras(row, { always: slug.indexOf('vedanga/vyakarana') === 0 }); } catch (e) {}
      });
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
    // Only actually filters when there's a real Devanagari string to check
    // against (lastQueryDeva) -- guards the edge case where conversion
    // failed and fell back to empty, which would otherwise hide everything.
    var exactActive = filterState.exact && !!lastQueryDeva;
    // Reported live: a query typed directly in Devanagari via an Android
    // IME still came back "No exact spelling matches" against results the
    // search itself had genuinely found containing that literal text --
    // confirmed live against the published index, several of the returned
    // hits DID contain the query as a byte-exact substring. An IME
    // composing conjuncts can emit a different (but visually identical)
    // codepoint sequence than the same text typed another way -- an
    // unnormalized Unicode form, or a stray zero-width joiner/non-joiner
    // used to force a particular conjunct rendering. Normalizing both
    // sides through the same NFC + zero-width-strip pass before comparing
    // makes the check robust to exactly that, without weakening what
    // "exact" means (still a real, literal, character-for-character
    // containment check -- just on the canonical form of both sides).
    var qExact = dgeGsExactNormalize(lastQueryDeva);
    var out = lastHits.filter(function (h) {
      if (typeActive && h.contentType !== filterState.type) return false;
      if (catKeys.length && filterState.categories[h.category] !== true) return false;
      if (sidKeys.length && filterState.siddhanta[siddhantaOf(h.grantha)] !== true) return false;
      if (kw && (h.title + ' ' + h.snippet).toLowerCase().indexOf(kw) === -1) return false;
      if (exactActive && (!h.snippet || dgeGsExactNormalize(h.snippet).indexOf(qExact) === -1)) return false;
      return true;
    });
    var anyFilterActive = typeActive || catKeys.length || sidKeys.length || kw || exactActive;
    var emptyMsg = 'No matches.';
    if (anyFilterActive) {
      emptyMsg = exactActive
        ? 'No exact spelling matches among these results — try turning off "Exact spelling only" to see near matches too.'
        : 'No results match these filters.';
      // Reported live: कान्ताय genuinely occurs verbatim in Sumadhva Vijaya
      // (confirmed directly against the published index), but an UNSCOPED
      // search for it never opens that grantha's shard at all -- its own
      // interior trigrams are shared by ~48,000 units corpus-wide, so the
      // shard-open budget (dge-search.js's MAX_SHARDS/MAX_EXACT_SHARDS,
      // needed to keep a common query fast) is spent on other, arbitrarily-
      // tied candidates first. lastHits.partial (dge-search.js's own
      // "the sweep wasn't exhaustive" flag) is exactly the signal that this
      // happened -- scoping to one section (the picker next to the input)
      // searches only that section's much smaller candidate pool, so the
      // SAME exact match the unscoped sweep never reached opens in under a
      // second. Only worth saying when nothing is scoped yet and there's
      // somewhere narrower to go.
      if (exactActive && !out.length && lastHits.partial && !currentSection) {
        emptyMsg += ' A search across the whole library can miss a real match' +
          ' buried in a very common word’s ties — narrowing the scope' +
          ' (the "Everything" picker above) searches that section directly' +
          ' and usually finds it.';
      }
    }
    renderRows(out, lastQuery, emptyMsg);
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
        var label = taxonomyLabel(cat) + ' (' + catCounts[cat] + ')';
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
        var label = taxonomyLabel(sid) + ' (' + sidCounts[sid] + ')';
        sidRow.appendChild(filterChip(label, filterState.siddhanta[sid] === true, function () {
          if (filterState.siddhanta[sid]) delete filterState.siddhanta[sid];
          else filterState.siddhanta[sid] = true;
          buildFilterBar(hits);
          applyFilters();
        }));
      });
      bar.appendChild(sidRow);
    }

    // Row 4: exact-spelling toggle -- own row, since it's a mode the reader
    // opts into (see queryToDevanagari()'s comment above), not tied to this
    // result set's own contents the way type/category/siddhanta are. Only
    // shown when there's an actual Devanagari form of the query to check
    // against (see applyFilters()'s own guard) -- a dead toggle that can
    // never filter anything would just be confusing chrome.
    if (lastQueryDeva) {
      var exactRow = document.createElement('div');
      exactRow.className = 'dge-gs-frow';
      exactRow.appendChild(filterChip('Exact spelling only', filterState.exact, function () {
        filterState.exact = !filterState.exact;
        dgeGsSaveExact(filterState.exact);
        buildFilterBar(hits);
        applyFilters();
      }));
      bar.appendChild(exactRow);
    }

    // Row 5: keyword refine + a live "N of M shown" count.
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

  // 23 Aug 2026: DvaitaVedanta (dge/data/darshana/vedanta/dvaita/DvaitaVedanta/)
  // is admin-only -- not linked in the Library nav, and per the project lead's
  // explicit ask, should not surface in search results for anyone else
  // either. The 330 MB CDN search index (see INDEX_BASE above) is a separate,
  // offline-built artifact this session can't rebuild, so a stale copy may
  // still carry old-path hits from before this restructure; filtering here,
  // on every hit this UI ever renders regardless of index freshness, is the
  // one place that reliably holds regardless of what the index contains.
  // Not real access control -- same caveat as admin-gate.js: this hides the
  // hit from the UI, it does not restrict the underlying static JSON file.
  var ADMIN_ONLY_GRANTHA_PREFIXES = ['darshana/vedanta/dvaita/DvaitaVedanta', 'dvaitavedanta'];
  function dgeSearchIsAdmin() {
    try {
      return localStorage.getItem('acharyaAuthorized') === 'true' ||
             localStorage.getItem('is_superadmin') === 'true';
    } catch (e) { return false; }
  }
  function dgeSearchIsAdminOnlyHit(h) {
    var g = h && h.grantha || '';
    return ADMIN_ONLY_GRANTHA_PREFIXES.some(function (p) { return g.indexOf(p) === 0; });
  }

  function render(hits, q) {
    hits = (hits || []).filter(function (h) { return dgeSearchIsAdmin() || !dgeSearchIsAdminOnlyHit(h); });
    lastHits = hits;
    lastQuery = q;
    // type/category/siddhanta/keyword reset every search since they're
    // built from THIS result set's own contents (a category chip from the
    // last query may not even exist in this one). "Exact spelling only" is
    // different -- a mode the reader explicitly opted into, not tied to any
    // one result set -- so it persists across searches, same as the
    // scheme/section pickers already do.
    filterState = { type: 'all', categories: {}, siddhanta: {}, keyword: '', exact: filterState.exact };
    if (!hits || !hits.length) {
      document.getElementById('dge-gs-filterbar').style.display = 'none';
      renderRows([], q);
      return;
    }
    buildFilterBar(hits);
    applyFilters();
  }

  // Idle-time manifest prefetch (24 Aug 2026, project lead's "make search
  // lightning fast" directive) -- by the time a reader actually opens
  // search and types, the index object may already exist, saving a
  // manifest fetch + parse off the critical path of their FIRST query.
  // Deliberately NOT an eager/blocking fetch: manifest.json can be several
  // MB, and most readers on this page never open search at all -- costing
  // every one of them that bandwidth just to shave a round trip off the
  // minority who do would be the wrong trade for a mobile-first app that
  // already goes out of its way to keep data costs down elsewhere (offline
  // mode, lazy per-query shard/posting fetches). requestIdleCallback
  // (falling back to a plain timeout on a browser without it, e.g. Safari)
  // only runs this once the browser has nothing more pressing to do, and
  // it's skipped outright on a data-saver/slow connection -- exactly the
  // audience this restraint exists for.
  function prefetchManifest() {
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    } catch (e) { /* navigator.connection isn't universally supported -- proceed as normal */ }
    var run = function () { ensureIndex(); };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 5000 });
    } else {
      setTimeout(run, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { build(); prefetchManifest(); });
  } else { build(); prefetchManifest(); }
  window.DGEGlobalSearch = { open: open, close: close };
})();
