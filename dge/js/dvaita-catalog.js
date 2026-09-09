/* =========================================================================
   dvaita-catalog.js — द्वैतवेदान्तग्रन्थानुक्रमणी.

   Reads the committed bibliography (dge/data/catalogs/
   dvaita_grantha_anukramani.json, built by
   tools/import_dvaita_grantha_anukramani.py) and lays an editable overlay
   over it. The import is never rewritten in place; every correction a
   scholar makes lands in a separate overrides file:

       dge/data/catalogs/dvaita_grantha_anukramani.overrides.json

   Edits are held in localStorage as a draft the moment they are made and
   go to GitHub only when someone presses Sync — same shape as
   admin/ocr-review.html, and the reason this page does NOT use Firestore:
   the master data belongs in the repo, reviewable in a diff, and the
   Firestore path made editing depend on a users/{uid} role document that
   a first-time signer-in on this page never had, so it just said no.

   Everything the page derives — canonical spellings, suggested parent
   links, cross-corpus matches — is a proposal shown for review. Accepting
   one writes it to the overrides; nothing is applied silently.
   ========================================================================= */
(function () {
  "use strict";

  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['dvaita-catalog.js'] = 'v2.0';

  var DATA_URL = "../data/catalogs/dvaita_grantha_anukramani.json";
  var OVERRIDES_PATH = "dge/data/catalogs/dvaita_grantha_anukramani.overrides.json";
  var OVERRIDES_URL = "../data/catalogs/dvaita_grantha_anukramani.overrides.json";
  var DRAFT_KEY = "dge.dvc.draft";
  var CHUNK = 250;

  var TAG_FIELDS = ["vibhaga", "vishayaVibhaga", "prasthana"];
  var FIELD_LABEL = {
    grantha: "ग्रन्थः · title", karta: "कर्तृ · author",
    vibhaga: "विभागः", vishayaVibhaga: "विषयविभागः", prasthana: "प्रस्थानम्",
    availability: "उपलब्धता", status: "स्थितिः", labels: "अङ्कनानि · labels",
    note: "टिप्पणम् · note"
  };
  // Columns the grid lets you edit. grantha/karta are editable too: a
  // misspelled title is exactly the kind of thing this page exists to fix.
  var EDITABLE = ["grantha", "karta", "vibhaga", "vishayaVibhaga", "prasthana",
                   "availability", "status", "labels", "note"];

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("dge.dvc." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("dge.dvc." + k, JSON.stringify(v)); } catch (e) {} }
  };

  var state = {
    items: [], byId: {}, masters: { categories: [], authors: [], titles: [] },
    suggestions: { parentLinks: [] }, crossLinks: {}, duplicates: {},
    catById: {}, authById: {}, titleById: {},
    ov: null,               // the overrides object being edited
    committedSha: null,     // GitHub blob sha of the committed overrides file
    dirty: false,
    view: LS.get("view", "tree"),
    tab: "catalogue",
    script: LS.get("script", "deva"),
    sort: LS.get("sort", "row"),
    q: "",
    tagFilters: { vibhaga: new Set(), vishayaVibhaga: new Set(), prasthana: new Set() },
    labelFilter: "",
    onlyFlag: "",
    expanded: {},           // id -> true, tree expansion
    view_ids: [],           // current filtered id list (flat views)
    shown: 0,
    children: {},           // effective parentId -> [childId...]
    roots: []
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* ---------------- overrides: the editable layer ---------------- */
  function emptyOverrides() {
    return {
      _readme: [
        "Scholar corrections layered over dge/data/catalogs/dvaita_grantha_anukramani.json.",
        "Written by dge/dvaita-grantha-anukramani/ (Sync to GitHub). The imported",
        "catalogue itself is never edited -- re-running the importer keeps every",
        "correction here intact.",
        "canonical: variant spelling -> the spelling to show everywhere, per kind.",
        "parents:   row id -> the row id that is really its parent.",
        "rows:      row id -> field overrides, labels and a note for that one row.",
        "review:    row id -> retain | delete | merge (duplicate decisions).",
        "links:     row/master id -> a confirmed cross-corpus match."
      ],
      version: 1, updatedAt: null,
      canonical: { category: {}, author: {}, title: {} },
      parents: {}, rows: {}, review: {}, links: {}
    };
  }

  function loadDraft() { try { var raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.ov)); } catch (e) {}
    state.dirty = true;
    updateSyncBar();
  }
  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    location.reload();
  }

  function countEdits() {
    if (!state.ov) return 0;
    var c = state.ov.canonical;
    return Object.keys(c.category).length + Object.keys(c.author).length + Object.keys(c.title).length
      + Object.keys(state.ov.parents).length + Object.keys(state.ov.rows).length
      + Object.keys(state.ov.review).length + Object.keys(state.ov.links).length;
  }

  /* ---------------- effective values ---------------- */
  // A displayed value is: this row's own override, else the canonical
  // spelling chosen for whatever the import holds, else the import's value.
  function canonicalOf(kind, value) {
    if (!value) return value;
    var map = state.ov && state.ov.canonical[kind];
    return (map && map[value]) || value;
  }
  function eff(item, field) {
    var rowOv = state.ov && state.ov.rows[item.id];
    if (rowOv && rowOv[field] != null && rowOv[field] !== '') return rowOv[field];
    var v = item[field] || '';
    if (TAG_FIELDS.indexOf(field) >= 0) return canonicalOf('category', v);
    if (field === 'karta') return canonicalOf('author', v);
    if (field === 'grantha') return canonicalOf('title', v);
    return v;
  }
  function effParent(item) {
    var p = state.ov && state.ov.parents[item.id];
    if (p !== undefined) return p || null;
    return item.parentId;
  }
  function labelsOf(item) {
    var rowOv = state.ov && state.ov.rows[item.id];
    return (rowOv && rowOv.labels) || [];
  }
  function reviewOf(id) { return (state.ov && state.ov.review[id]) || null; }

  // Romanised form for the IAST view and for roman sorting. Comes from the
  // master entry, which carries one IAST per canonical spelling, so the
  // page never needs a transliteration library at runtime.
  function iastOf(item, field) {
    var v = eff(item, field);
    if (!v) return '';
    var master = null;
    if (field === 'grantha') master = state.titleById[item.titleId];
    else if (field === 'karta') master = state.authById[item.kartaId];
    else if (TAG_FIELDS.indexOf(field) >= 0) master = state.catById[item[field + 'Id']];
    return (master && master.iast) || v;
  }
  function show(item, field) { return state.script === 'iast' ? iastOf(item, field) : eff(item, field); }
  function showTerm(master) { return state.script === 'iast' ? (master.iast || master.canonical) : master.canonical; }

  /* ---------------- data load ---------------- */
  function loadData() {
    return fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) {
      state.items = d.items || [];
      state.byId = {};
      state.items.forEach(function (it) { state.byId[it.id] = it; });
      state.masters = d.masters || { categories: [], authors: [], titles: [] };
      state.masters.categories.forEach(function (c) { state.catById[c.id] = c; });
      state.masters.authors.forEach(function (a) { state.authById[a.id] = a; });
      state.masters.titles.forEach(function (t) { state.titleById[t.id] = t; });
      state.suggestions = d.suggestions || { parentLinks: [] };
      state.crossLinks = d.crossLinks || {};
      state.duplicates = d.duplicates || {};
      $("#dvc-total").textContent = state.items.length.toLocaleString();
    });
  }

  // The committed overrides file, with any local draft laid over it.
  function loadOverrides() {
    return fetch(OVERRIDES_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (committed) {
        var base = committed || emptyOverrides();
        ['canonical', 'parents', 'rows', 'review', 'links'].forEach(function (k) {
          if (!base[k]) base[k] = (k === 'canonical') ? { category: {}, author: {}, title: {} } : {};
        });
        var draft = loadDraft();
        if (draft) { state.ov = draft; state.dirty = true; }
        else { state.ov = base; state.dirty = false; }
      });
  }

  /* ---------------- tree structure ---------------- */
  function rebuildTree() {
    state.children = {};
    state.roots = [];
    state.items.forEach(function (it) {
      if (reviewOf(it.id) === 'delete') return;
      var p = effParent(it);
      if (p && state.byId[p] && reviewOf(p) !== 'delete') {
        (state.children[p] = state.children[p] || []).push(it.id);
      } else {
        state.roots.push(it.id);
      }
    });
  }

  /* ---------------- filter + sort ---------------- */
  function sortKey(id) {
    var it = state.byId[id];
    switch (state.sort) {
      case 'title': return eff(it, 'grantha');
      case 'titleRoman': return iastOf(it, 'grantha').toLowerCase();
      case 'author': return eff(it, 'karta');
      case 'authorRoman': return iastOf(it, 'karta').toLowerCase();
      default: return null;
    }
  }
  function sortIds(ids) {
    if (state.sort === 'row') return ids.slice().sort(function (a, b) { return state.byId[a].row - state.byId[b].row; });
    var roman = state.sort.indexOf('Roman') > 0;
    return ids.slice().sort(function (a, b) {
      var ka = sortKey(a) || '', kb = sortKey(b) || '';
      // An empty title/author would otherwise head an A→Z list; the handful
      // of rows the sheet left unnamed belong at the end, not the top.
      if (!ka !== !kb) return ka ? -1 : 1;
      if (ka === kb) return state.byId[a].row - state.byId[b].row;
      // 'sa' collation orders Devanagari properly; roman keys are plain ASCII.
      return roman ? (ka < kb ? -1 : 1) : ka.localeCompare(kb, 'sa');
    });
  }

  function matches(it) {
    if (reviewOf(it.id) === 'delete') return false;
    for (var i = 0; i < TAG_FIELDS.length; i++) {
      var set = state.tagFilters[TAG_FIELDS[i]];
      if (set.size && !set.has(eff(it, TAG_FIELDS[i]))) return false;
    }
    if (state.labelFilter && labelsOf(it).indexOf(state.labelFilter) < 0) return false;
    if (state.onlyFlag) {
      if (state.onlyFlag === 'missingTags' && (eff(it, 'vibhaga') || eff(it, 'vishayaVibhaga') || eff(it, 'prasthana'))) return false;
      if (state.onlyFlag === 'missingKarta' && eff(it, 'karta')) return false;
      if (state.onlyFlag === 'noParent' && effParent(it)) return false;
      if (state.onlyFlag === 'unresolvedLink' && !it.unresolvedLink) return false;
      if (state.onlyFlag === 'edited' && !(state.ov.rows[it.id] || state.ov.parents[it.id])) return false;
    }
    var q = state.q.trim().toLowerCase();
    if (q) {
      var hay = (eff(it, 'grantha') + ' ' + eff(it, 'karta') + ' ' + it.breadcrumb + ' ' +
                 iastOf(it, 'grantha') + ' ' + iastOf(it, 'karta')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function recompute() {
    state.view_ids = sortIds(state.items.filter(matches).map(function (it) { return it.id; }));
    state.shown = 0;
    $("#dvc-count").textContent = state.view_ids.length.toLocaleString() + " / " + state.items.length.toLocaleString();
  }

  /* ---------------- TREE VIEW ---------------- */
  // When a search or filter is on, the tree shows every match plus the
  // ancestors needed to reach it, fully expanded -- otherwise a match three
  // levels down would simply not be on screen.
  function visibleSet() {
    var filtering = state.q.trim() || state.onlyFlag || state.labelFilter ||
      TAG_FIELDS.some(function (f) { return state.tagFilters[f].size; });
    if (!filtering) return null;
    var keep = {};
    state.items.forEach(function (it) {
      if (!matches(it)) return;
      keep[it.id] = true;
      var p = effParent(it), guard = 0;
      while (p && state.byId[p] && guard++ < 50) { keep[p] = 'ancestor'; p = effParent(state.byId[p]); }
    });
    return keep;
  }

  function nodeHTML(id, depth, keep) {
    var it = state.byId[id];
    var kids = (state.children[id] || []).filter(function (c) { return !keep || keep[c]; });
    var open = state.expanded[id] || (keep && keep[id] === 'ancestor');
    var caret = kids.length
      ? '<button class="dvc-caret" data-toggle="' + id + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + (open ? '▾' : '▸') + '</button>'
      : '<span class="dvc-caret dvc-caret-leaf">·</span>';
    var cat = eff(it, 'vishayaVibhaga') || eff(it, 'vibhaga');
    var catM = state.catById[it.vishayaVibhagaId] || state.catById[it.vibhagaId];
    var flags = '';
    if (it.exactDuplicateGroup) flags += '<span class="dvc-badge dvc-badge-dup" title="Exact duplicate">≡</span>';
    if (!effParent(it) && hasSuggestion(id)) flags += '<span class="dvc-badge dvc-badge-sugg" title="A parent is suggested for this row — see the Links tab">?</span>';
    if (it.unresolvedLink) flags += '<span class="dvc-badge dvc-badge-warn" title="Link names a title found nowhere in the sheet">⚠</span>';
    var lbl = labelsOf(it).map(function (l) { return '<span class="dvc-label">' + esc(l) + '</span>'; }).join('');
    var edited = (state.ov.rows[id] || state.ov.parents[id]) ? ' dvc-edited' : '';

    var html = '<div class="dvc-node' + edited + '" data-id="' + id + '" style="padding-left:' + (depth * 20) + 'px">' +
      caret +
      '<span class="dvc-node-title" data-open="' + id + '">' + esc(show(it, 'grantha') || '(अनाम)') + '</span>' +
      (cat ? '<span class="dvc-chip-cat">' + esc(catM && state.script === 'iast' ? catM.iast : cat) + '</span>' : '') +
      (eff(it, 'karta') ? '<span class="dvc-node-karta">' + esc(show(it, 'karta')) + '</span>' : '') +
      lbl + flags +
      (kids.length ? '<span class="dvc-kidcount">' + kids.length + '</span>' : '') +
      '<span class="dvc-node-row">#' + it.row + '</span>' +
      '</div>';
    if (open && kids.length) {
      html += sortIds(kids).map(function (c) { return nodeHTML(c, depth + 1, keep); }).join('');
    }
    return html;
  }

  var suggById = null;
  function hasSuggestion(id) {
    if (!suggById) {
      suggById = {};
      (state.suggestions.parentLinks || []).forEach(function (s) { suggById[s.id] = s; });
    }
    return suggById[id];
  }

  function renderTree(reset) {
    var box = $("#dvc-tree");
    var keep = visibleSet();
    var roots = state.roots.filter(function (r) { return !keep || keep[r]; });
    roots = sortIds(roots);
    if (reset) { box.innerHTML = ''; state.shown = 0; }
    if (!roots.length) { box.innerHTML = '<div class="dvc-empty-msg">No entries match.</div>'; $("#dvc-more").style.display = 'none'; return; }
    var end = Math.min(state.shown + CHUNK, roots.length);
    var html = '';
    for (var i = state.shown; i < end; i++) html += nodeHTML(roots[i], 0, keep);
    box.insertAdjacentHTML('beforeend', html);
    state.shown = end;
    $("#dvc-count").textContent = roots.length.toLocaleString() + " roots / " + state.items.length.toLocaleString() + " entries";
    $("#dvc-more").style.display = state.shown < roots.length ? 'block' : 'none';
    $("#dvc-more").textContent = "अधिकं · show more ▾ (" + (roots.length - state.shown).toLocaleString() + ")";
  }

  /* ---------------- TABLE VIEW ---------------- */
  function rowHTML(id) {
    var it = state.byId[id];
    var edited = (state.ov.rows[id] || state.ov.parents[id]) ? ' class="dvc-edited"' : '';
    return '<tr' + edited + ' data-id="' + id + '">' +
      '<td class="dvc-num">' + it.row + '</td>' +
      '<td class="dvc-grantha" title="' + esc(it.breadcrumb) + '"><span data-open="' + id + '">' + esc(show(it, 'grantha') || '(अनाम)') + '</span></td>' +
      '<td>' + esc(show(it, 'karta')) + '</td>' +
      TAG_FIELDS.map(function (f) { return '<td>' + esc(show(it, f) || '—') + '</td>'; }).join('') +
      '<td class="dvc-muted">' + esc(eff(it, 'availability')) + '</td>' +
      '<td class="dvc-muted">' + esc(eff(it, 'status')) + '</td>' +
      '</tr>';
  }
  function renderTable(reset) {
    var box = $("#dvc-tbody");
    if (reset) { box.innerHTML = ''; state.shown = 0; }
    if (!state.view_ids.length) { box.innerHTML = '<tr><td colspan="8" class="dvc-empty-msg">No entries match.</td></tr>'; $("#dvc-more").style.display = 'none'; return; }
    var end = Math.min(state.shown + CHUNK, state.view_ids.length);
    var html = '';
    for (var i = state.shown; i < end; i++) html += rowHTML(state.view_ids[i]);
    box.insertAdjacentHTML('beforeend', html);
    state.shown = end;
    $("#dvc-more").style.display = state.shown < state.view_ids.length ? 'block' : 'none';
    $("#dvc-more").textContent = "अधिकं · show more ▾ (" + (state.view_ids.length - state.shown).toLocaleString() + ")";
  }

  /* ---------------- GRID (spreadsheet) VIEW ---------------- */
  function gridCell(it, field, r, c) {
    var val = field === 'labels' ? labelsOf(it).join(', ')
            : field === 'note' ? ((state.ov.rows[it.id] || {}).note || '')
            : eff(it, field);
    var overridden = state.ov.rows[it.id] && state.ov.rows[it.id][field] != null;
    return '<td class="dvc-gcell' + (overridden ? ' dvc-gcell-edited' : '') + '" data-id="' + it.id +
      '" data-field="' + field + '" data-r="' + r + '" data-c="' + c + '" tabindex="-1">' + esc(val) + '</td>';
  }
  function renderGrid(reset) {
    var box = $("#dvc-gbody");
    if (reset) { box.innerHTML = ''; state.shown = 0; }
    if (!state.view_ids.length) { box.innerHTML = '<tr><td colspan="11" class="dvc-empty-msg">No entries match.</td></tr>'; $("#dvc-more").style.display = 'none'; return; }
    var end = Math.min(state.shown + CHUNK, state.view_ids.length);
    var html = '';
    for (var i = state.shown; i < end; i++) {
      var it = state.byId[state.view_ids[i]];
      html += '<tr data-id="' + it.id + '"><td class="dvc-num">' + it.row + '</td>' +
        EDITABLE.map(function (f, ci) { return gridCell(it, f, i, ci); }).join('') +
        '<td class="dvc-muted">' + esc(parentLabel(it)) + '</td></tr>';
    }
    box.insertAdjacentHTML('beforeend', html);
    state.shown = end;
    $("#dvc-more").style.display = state.shown < state.view_ids.length ? 'block' : 'none';
    $("#dvc-more").textContent = "अधिकं · show more ▾ (" + (state.view_ids.length - state.shown).toLocaleString() + ")";
  }
  function parentLabel(it) {
    var p = effParent(it);
    return p && state.byId[p] ? ('#' + state.byId[p].row + ' ' + eff(state.byId[p], 'grantha')) : '';
  }

  function datalistFor(field) {
    if (TAG_FIELDS.indexOf(field) >= 0) return 'dvc-dl-category';
    if (field === 'karta') return 'dvc-dl-author';
    return '';
  }

  function beginEdit(td) {
    if (td.querySelector('input')) return;
    var id = td.dataset.id, field = td.dataset.field;
    var cur = td.textContent;
    var list = datalistFor(field);
    td.innerHTML = '<input class="dvc-ginput" value="' + esc(cur) + '"' + (list ? ' list="' + list + '"' : '') + '>';
    var input = td.querySelector('input');
    input.focus(); input.select();
    var done = false;
    function commit(save) {
      if (done) return; done = true;
      var v = input.value.trim();
      if (save && v !== cur) setRowField(id, field, v);
      td.innerHTML = esc(save ? v : cur);
      td.classList.toggle('dvc-gcell-edited', !!(state.ov.rows[id] && state.ov.rows[id][field] != null));
    }
    input.addEventListener('blur', function () { commit(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { commit(true); focusCell(+td.dataset.r + 1, +td.dataset.c); e.preventDefault(); }
      else if (e.key === 'Escape') { commit(false); td.focus(); }
      else if (e.key === 'Tab') { commit(true); focusCell(+td.dataset.r, +td.dataset.c + (e.shiftKey ? -1 : 1)); e.preventDefault(); }
    });
  }
  function focusCell(r, c) {
    var td = $('td.dvc-gcell[data-r="' + r + '"][data-c="' + c + '"]');
    if (td) { td.focus(); td.scrollIntoView({ block: 'nearest' }); }
  }

  function setRowField(id, field, value) {
    var rows = state.ov.rows;
    if (!rows[id]) rows[id] = {};
    if (field === 'labels') {
      var arr = value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (arr.length) rows[id].labels = arr; else delete rows[id].labels;
    } else if (value === '') {
      delete rows[id][field];
    } else {
      rows[id][field] = value;
    }
    if (!Object.keys(rows[id]).length) delete rows[id];
    saveDraft();
  }

  /* ---------------- views + tabs ---------------- */
  function renderCurrentView(reset) {
    $("#dvc-tree").style.display = state.view === 'tree' ? '' : 'none';
    $("#dvc-tablewrap").style.display = state.view === 'table' ? '' : 'none';
    $("#dvc-gridwrap").style.display = state.view === 'grid' ? '' : 'none';
    if (state.view === 'tree') renderTree(reset);
    else if (state.view === 'table') renderTable(reset);
    else renderGrid(reset);
  }
  function rerender() { rebuildTree(); recompute(); renderCurrentView(true); }

  function showTab(tab) {
    state.tab = tab;
    ['catalogue', 'links', 'masters', 'duplicates', 'crosslinks', 'reports'].forEach(function (t) {
      var el = $("#dvc-panel-" + t);
      if (el) el.style.display = (t === tab) ? '' : 'none';
      var btn = $('.dvc-tab[data-tab="' + t + '"]');
      if (btn) btn.classList.toggle('on', t === tab);
    });
    if (tab === 'links') renderLinks();
    if (tab === 'masters') renderMasters();
    if (tab === 'duplicates') renderDuplicates();
    if (tab === 'crosslinks') renderCrossLinks();
    if (tab === 'reports') renderReports();
  }

  /* ---------------- LINKS tab ---------------- */
  function renderLinks() {
    var sugg = (state.suggestions.parentLinks || []).filter(function (s) {
      var it = state.byId[s.id];
      return it && !effParent(it) && reviewOf(s.id) !== 'delete';
    });
    var accepted = Object.keys(state.ov.parents).length;
    var orphans = state.items.filter(function (it) { return !effParent(it) && !hasSuggestion(it.id) && reviewOf(it.id) !== 'delete'; });
    var bad = state.items.filter(function (it) { return it.unresolvedLink; });

    var html = '<h3>सुझाव-सम्बन्धाः · Suggested parents <span class="dvc-muted">(' + sugg.length + ' open, ' + accepted + ' accepted)</span></h3>' +
      '<p class="dvc-hint">The sheet leaves the Link column empty on ' + orphans.length.toLocaleString() +
      '+ rows, yet many are plainly commentaries — a title that reads “&lt;a known work&gt; + टीका/टिप्पणी/व्याख्या/भाष्यम्/खण्डार्थः”. ' +
      'Each suggestion below is that reading, never applied on its own. Accepting one re-parents the row everywhere, including the tree.</p>';

    html += sugg.slice(0, 400).map(function (s) {
      var it = state.byId[s.id];
      return '<div class="dvc-suggrow">' +
        '<div class="dvc-suggmain"><b>#' + it.row + ' ' + esc(eff(it, 'grantha')) + '</b>' +
        '<span class="dvc-muted"> · ' + esc(eff(it, 'karta')) + '</span>' +
        '<div class="dvc-muted">suggested parent: ' + s.candidates.map(function (c) {
          var p = state.byId[c];
          return p ? '<button class="dvc-btn dvc-btn-sm" data-accept-parent="' + s.id + '" data-parent="' + c + '">✓ #' + p.row + ' ' + esc(eff(p, 'grantha')) + '</button>' : '';
        }).join(' ') + ' <span class="dvc-conf">(' + s.confidence + ', on “' + esc(s.suffix) + '”)</span></div></div>' +
        '<button class="dvc-btn dvc-btn-sm" data-reject-parent="' + s.id + '">✕ not a commentary</button>' +
        '</div>';
    }).join('') || '<p class="dvc-muted">none left to review</p>';
    if (sugg.length > 400) html += '<p class="dvc-muted">' + (sugg.length - 400) + ' more — accept some and they clear.</p>';

    html += '<h3>अनिर्दिष्ट-लिङ्काः · Link names a title that does not exist <span class="dvc-muted">(' + bad.length + ')</span></h3>';
    html += bad.length ? '<table class="dvc-minitable"><tbody>' + bad.map(function (it) {
      return '<tr><td>#' + it.row + '</td><td>' + esc(eff(it, 'grantha')) + '</td><td class="dvc-muted">Link: ' + esc(it.linkRaw) + '</td></tr>';
    }).join('') + '</tbody></table>' : '<p class="dvc-muted">none</p>';

    html += '<h3>अपितृकाः · Roots with no suggestion <span class="dvc-muted">(' + orphans.length.toLocaleString() + ')</span></h3>' +
      '<p class="dvc-hint">Standalone works, or commentaries whose base title is spelled differently. Set a parent for any of them from the grid view’s parent column, or fix the spelling in the Masters tab first.</p>';
    $("#dvc-links-body").innerHTML = html;
  }

  function acceptParent(childId, parentId) {
    state.ov.parents[childId] = parentId;
    saveDraft(); rerender(); renderLinks();
  }
  function rejectParent(childId) {
    // Recorded as an explicit "no parent" so the suggestion stops coming back.
    state.ov.parents[childId] = "";
    saveDraft(); rerender(); renderLinks();
  }

  /* ---------------- MASTERS tab ---------------- */
  function masterKinds() {
    return [
      { kind: 'category', label: 'वर्गाः · Categories', list: state.masters.categories,
        hint: 'One shared vocabulary for विभागः, विषयविभागः and प्रस्थानम् — the sheet uses the same terms across all three.' },
      { kind: 'author', label: 'कर्तारः · Authors', list: state.masters.authors,
        hint: 'Honorific and ending variants (श्रीजयतीर्थः / जयतीर्थः / जयतीर्थ) folded onto one person.' },
      { kind: 'title', label: 'ग्रन्थनामानि · Work titles', list: state.masters.titles,
        hint: 'Spelling variants of the same work — the ones to settle before parent links can resolve.' }
    ];
  }
  function renderMasters() {
    var onlyVariants = $("#dvc-masters-onlyvar") && $("#dvc-masters-onlyvar").checked;
    var q = ($("#dvc-masters-q") && $("#dvc-masters-q").value || '').trim().toLowerCase();
    var html = masterKinds().map(function (mk) {
      var list = mk.list.filter(function (m) {
        if (onlyVariants && m.variants.length < 2) return false;
        if (q && (m.canonical + ' ' + (m.iast || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      var withVar = mk.list.filter(function (m) { return m.variants.length > 1; }).length;
      return '<section class="dvc-masterblock"><h3>' + mk.label +
        ' <span class="dvc-muted">(' + mk.list.length + ' terms, ' + withVar + ' with more than one spelling)</span></h3>' +
        '<p class="dvc-hint">' + mk.hint + '</p>' +
        '<table class="dvc-minitable"><thead><tr><th>Canonical</th><th>IAST</th><th>Used</th><th>Spellings found</th></tr></thead><tbody>' +
        list.slice(0, 300).map(function (m) {
          var chosen = variantChosen(mk.kind, m);
          return '<tr><td><b>' + esc(chosen) + '</b></td><td class="dvc-muted">' + esc(m.iast || '') + '</td>' +
            '<td class="dvc-rnum">' + m.count + '</td><td>' +
            m.variants.map(function (v) {
              var isChosen = v.value === chosen;
              return '<button class="dvc-vchip' + (isChosen ? ' on' : '') + '" data-canon-kind="' + mk.kind +
                '" data-canon-key="' + esc(m.key) + '" data-canon-val="' + esc(v.value) + '" title="' +
                (isChosen ? 'This is the spelling shown everywhere' : 'Use this spelling everywhere instead') + '">' +
                esc(v.value) + ' <span class="dvc-muted">×' + v.count + '</span></button>';
            }).join('') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        (list.length > 300 ? '<p class="dvc-muted">' + (list.length - 300) + ' more — search above to narrow.</p>' : '') +
        '</section>';
    }).join('');
    $("#dvc-masters-body").innerHTML = html;
  }
  function variantChosen(kind, m) {
    var map = state.ov.canonical[kind] || {};
    for (var i = 0; i < m.variants.length; i++) {
      var mapped = map[m.variants[i].value];
      if (mapped) return mapped;
    }
    return m.canonical;
  }
  // Choosing a spelling maps EVERY other spelling of that term onto it, so
  // one click fixes every row that used a variant.
  function chooseCanonical(kind, key, value) {
    var list = kind === 'category' ? state.masters.categories : kind === 'author' ? state.masters.authors : state.masters.titles;
    var m = list.filter(function (x) { return x.key === key; })[0];
    if (!m) return;
    var map = state.ov.canonical[kind] = state.ov.canonical[kind] || {};
    m.variants.forEach(function (v) {
      if (v.value === value) delete map[v.value];
      else map[v.value] = value;
    });
    saveDraft(); rerender(); renderMasters();
  }

  /* ---------------- DUPLICATES tab ---------------- */
  function dupGroupHTML(g, showName) {
    return '<div class="dvc-dupgroup">' + (showName && g.name ? '<div class="dvc-dupname">' + esc(g.name) + '</div>' : '') +
      g.ids.map(function (id) {
        var it = state.byId[id];
        if (!it) return '';
        var st = reviewOf(id);
        return '<div class="dvc-duprow' + (st === 'delete' ? ' dvc-marked-delete' : '') + '">' +
          '<div class="dvc-dupinfo"><b>#' + it.row + '</b> ' + esc(it.breadcrumb) +
          '<span class="dvc-muted"> · ' + esc(eff(it, 'karta')) + '</span>' +
          (st ? ' <span class="dvc-statuspill">' + esc(st) + '</span>' : '') + '</div>' +
          '<div class="dvc-dupacts">' +
          '<button class="dvc-btn dvc-btn-sm" data-review="retain" data-id="' + id + '">keep</button>' +
          '<button class="dvc-btn dvc-btn-sm" data-review="delete" data-id="' + id + '">drop</button>' +
          (st ? '<button class="dvc-btn dvc-btn-sm" data-review="clear" data-id="' + id + '">undo</button>' : '') +
          '</div></div>';
      }).join('') + '</div>';
  }
  function renderDuplicates() {
    var d = state.duplicates;
    var ex = d.exactRowDuplicates || [], npk = d.nameParentKartaDuplicates || [], coll = d.nameCollisions || [];
    $("#dvc-dup-body").innerHTML =
      '<h3>ठीक समानाः · Exact duplicates <span class="dvc-muted">(' + ex.length + ' groups)</span></h3>' +
      '<p class="dvc-hint">Every column identical, same resolved parent — almost certainly one entry typed twice.</p>' +
      (ex.slice(0, 120).map(function (g) { return dupGroupHTML(g); }).join('') || '<p class="dvc-muted">none</p>') +
      '<h3>नाम+मूल+कर्तृ-साम्यम् <span class="dvc-muted">(' + npk.length + ')</span></h3>' +
      '<p class="dvc-hint">Title, parent and author match but something else differs — worth a look, not auto-mergeable.</p>' +
      (npk.map(function (g) { return dupGroupHTML(g); }).join('') || '<p class="dvc-muted">none</p>') +
      '<h3>नामसाम्यम् <span class="dvc-muted">(' + coll.length + ', informational)</span></h3>' +
      '<p class="dvc-hint">Same title, different work — normal for the दशप्रकरण, where one commentary title recurs once per mūla. Not a duplicate.</p>' +
      '<details><summary>show ' + coll.length + ' groups</summary>' +
      coll.slice(0, 150).map(function (g) { return dupGroupHTML(g, true); }).join('') + '</details>';
  }

  /* ---------------- CROSS-LINKS tab ---------------- */
  function renderCrossLinks() {
    var cl = state.crossLinks;
    var lib = cl.library || [], para = cl.parampara || [], alias = cl.authorAliases || [], dasa = cl.dasaSahitya || [];
    var paraAuthors = para.filter(function (p) { return p.kind === 'author'; });
    var paraWorks = para.filter(function (p) { return p.kind === 'work'; });

    var html = '<p class="dvc-hint">Candidate joins between this catalogue and the rest of the project, matched on a diacritic-free romanisation of both sides (one side is Devanagari, the other bare English or Kannada). Every one is a proposal — confirm the ones that are right.</p>';

    html += '<h3>पुस्तकालये विद्यमानाः · Already digitised in the library <span class="dvc-muted">(' + lib.length + ')</span></h3>' +
      '<table class="dvc-minitable"><thead><tr><th>#</th><th>Catalogue entry</th><th>library.json</th><th></th></tr></thead><tbody>' +
      lib.slice(0, 200).map(function (m) {
        var it = state.byId[m.id]; if (!it) return '';
        var done = state.ov.links[m.id];
        return '<tr><td>' + it.row + '</td><td>' + esc(eff(it, 'grantha')) + '</td><td class="dvc-muted">' +
          m.matches.map(function (x) { return esc(x.title) + (x.populated ? '' : ' <i>(empty)</i>'); }).join('<br>') + '</td>' +
          '<td>' + (done ? '<span class="dvc-statuspill">linked</span>' :
            '<button class="dvc-btn dvc-btn-sm" data-link-id="' + m.id + '" data-link-val="' + esc(m.matches[0].path) + '">✓ confirm</button>') + '</td></tr>';
      }).join('') + '</tbody></table>';

    html += '<h3>गुरुपरम्परा · Authors matched to a paramparā node <span class="dvc-muted">(' + paraAuthors.length + ')</span></h3>' +
      '<table class="dvc-minitable"><tbody>' + paraAuthors.map(function (p) {
        return '<tr><td>' + esc(p.canonical) + '</td><td class="dvc-muted">→ ' + esc(p.nodeId) + '</td></tr>';
      }).join('') + '</tbody></table>';

    html += '<h3>गुरुपरम्परायाः कृतयः · Works listed on a paramparā node <span class="dvc-muted">(' + paraWorks.length + ')</span></h3>' +
      '<p class="dvc-hint">Guru Paramparā records each ācārya’s works as free English text. These are the ones that also appear in this catalogue — the beginning of keeping the two in step.</p>' +
      '<table class="dvc-minitable"><tbody>' + paraWorks.slice(0, 100).map(function (p) {
        return '<tr><td>' + esc(p.canonical) + '</td><td class="dvc-muted">→ ' +
          p.matches.map(function (h) { return esc(h.node) + ': ' + esc(h.work); }).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table>';

    html += '<h3>author_aliases.json <span class="dvc-muted">(' + alias.length + ' of ' + state.masters.authors.length + ' authors)</span></h3>' +
      '<p class="dvc-hint">The project’s canonical person ids. Only ' + alias.length + ' of this catalogue’s ' +
      state.masters.authors.length + ' authors are known there yet — the rest are candidates to add, which is how that file is meant to grow.</p>' +
      '<table class="dvc-minitable"><tbody>' + alias.map(function (a) {
        return '<tr><td>' + esc(a.canonical) + '</td><td class="dvc-muted">→ ' + esc(a.personId) + '</td></tr>';
      }).join('') + '</tbody></table>';

    if (dasa.length) {
      html += '<h3>दाससाहित्यम् <span class="dvc-muted">(' + dasa.length + ')</span></h3><table class="dvc-minitable"><tbody>' +
        dasa.map(function (x) { return '<tr><td>' + esc(x.canonical) + '</td><td class="dvc-muted">→ ' + esc(x.composer || x.slug) + '</td></tr>'; }).join('') +
        '</tbody></table>';
    }
    $("#dvc-cross-body").innerHTML = html;
  }

  /* ---------------- REPORTS tab ---------------- */
  var REPORT_FIELDS = [
    { id: 'prasthana', label: 'प्रस्थानम्' }, { id: 'vibhaga', label: 'विभागः' },
    { id: 'vishayaVibhaga', label: 'विषयविभागः' }, { id: 'karta', label: 'कर्तृ · author' },
    { id: 'availability', label: 'उपलब्धता' }, { id: 'status', label: 'स्थितिः' },
    { id: '_depth', label: 'Depth in the tree' }, { id: '_hasParent', label: 'Has a parent?' },
    { id: '_labels', label: 'Label' }
  ];
  function reportValue(it, field) {
    if (field === '_depth') return String(treeDepth(it));
    if (field === '_hasParent') return effParent(it) ? 'yes' : 'no';
    if (field === '_labels') return labelsOf(it).join(', ') || '(none)';
    return eff(it, field) || '(रिक्तम्)';
  }
  function treeDepth(it) {
    var d = 0, p = effParent(it), guard = 0;
    while (p && state.byId[p] && guard++ < 50) { d++; p = effParent(state.byId[p]); }
    return d;
  }
  function buildReport() {
    var g1 = $("#dvc-rep-g1").value, g2 = $("#dvc-rep-g2").value;
    var rows = state.view_ids.map(function (id) { return state.byId[id]; });
    var counts = {};
    rows.forEach(function (it) {
      var k1 = reportValue(it, g1);
      var k2 = g2 ? reportValue(it, g2) : null;
      var key = JSON.stringify([k1, k2]);
      counts[key] = (counts[key] || 0) + 1;
    });
    var out = Object.keys(counts).map(function (k) {
      var parts = JSON.parse(k);
      return { a: parts[0], b: parts[1] || '', n: counts[k] };
    }).sort(function (x, y) { return y.n - x.n; });
    state.lastReport = { g1: g1, g2: g2, rows: out, total: rows.length };
    var head = '<tr><th>' + esc(labelOf(g1)) + '</th>' + (g2 ? '<th>' + esc(labelOf(g2)) + '</th>' : '') + '<th class="dvc-rnum">count</th></tr>';
    $("#dvc-rep-out").innerHTML = '<p class="dvc-hint">' + out.length + ' groups over ' + rows.length.toLocaleString() +
      ' entries in the current filter.</p><table class="dvc-minitable"><thead>' + head + '</thead><tbody>' +
      out.slice(0, 400).map(function (r) {
        return '<tr><td>' + esc(r.a) + '</td>' + (g2 ? '<td>' + esc(r.b) + '</td>' : '') + '<td class="dvc-rnum">' + r.n + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function labelOf(id) { var f = REPORT_FIELDS.filter(function (x) { return x.id === id; })[0]; return f ? f.label : id; }
  function exportReportCSV() {
    if (!state.lastReport) return;
    var r = state.lastReport;
    var lines = [[labelOf(r.g1)].concat(r.g2 ? [labelOf(r.g2)] : []).concat(['count']).join(',')];
    r.rows.forEach(function (x) { lines.push([csv(x.a)].concat(r.g2 ? [csv(x.b)] : []).concat([x.n]).join(',')); });
    download(lines.join('\r\n'), 'dvaita-report-' + r.g1 + (r.g2 ? '-by-' + r.g2 : '') + '.csv');
  }
  function renderReports() {
    var opts = function (sel, blank) {
      return (blank ? '<option value="">(none)</option>' : '') + REPORT_FIELDS.map(function (f) {
        return '<option value="' + f.id + '"' + (sel === f.id ? ' selected' : '') + '>' + esc(f.label) + '</option>';
      }).join('');
    };
    if (!$("#dvc-rep-g1")) {
      $("#dvc-reports-body").innerHTML =
        '<p class="dvc-hint">Build a report over whatever the catalogue filters are currently showing: pick one or two fields to group by. Everything here follows the filters at the top of the Catalogue tab.</p>' +
        '<div class="dvc-controls"><label>Group by <select id="dvc-rep-g1"></select></label>' +
        '<label>then by <select id="dvc-rep-g2"></select></label>' +
        '<button class="dvc-btn" id="dvc-rep-run">▶ Generate</button>' +
        '<button class="dvc-btn" id="dvc-rep-csv">⬇ Report CSV</button>' +
        '<button class="dvc-btn" id="dvc-rep-rowscsv">⬇ Rows CSV (current filter)</button></div>' +
        '<div id="dvc-rep-out"></div>';
      $("#dvc-rep-g1").innerHTML = opts('prasthana', false);
      $("#dvc-rep-g2").innerHTML = opts('', true);
      $("#dvc-rep-run").onclick = buildReport;
      $("#dvc-rep-csv").onclick = exportReportCSV;
      $("#dvc-rep-rowscsv").onclick = exportRowsCSV;
    }
    buildReport();
  }

  function csv(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(text, name) {
    var blob = new Blob(["﻿" + text], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function exportRowsCSV() {
    var cols = ['row', 'grantha', 'granthaIast', 'breadcrumb', 'karta', 'vibhaga', 'vishayaVibhaga',
                 'prasthana', 'availability', 'status', 'parent', 'labels'];
    var lines = [cols.join(',')];
    state.view_ids.forEach(function (id) {
      var it = state.byId[id];
      lines.push([it.row, csv(eff(it, 'grantha')), csv(iastOf(it, 'grantha')), csv(it.breadcrumb),
                  csv(eff(it, 'karta')), csv(eff(it, 'vibhaga')), csv(eff(it, 'vishayaVibhaga')),
                  csv(eff(it, 'prasthana')), csv(eff(it, 'availability')), csv(eff(it, 'status')),
                  csv(parentLabel(it)), csv(labelsOf(it).join(' '))].join(','));
    });
    download(lines.join('\r\n'), 'dvaita-grantha-anukramani-' + new Date().toISOString().slice(0, 10) + '.csv');
  }
  window.dvcExportCSV = exportRowsCSV; // used by the verification script

  /* ---------------- GitHub sync ---------------- */
  function ghCfg() { return window.GITHUB_REPO_CONFIG || { owner: 'Tribhuvanachar', repo: 'bhumandala', branch: 'main' }; }
  function ghToken() { try { return localStorage.getItem('github_admin_pat') || ''; } catch (e) { return ''; } }
  function b64(str) { return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(str))); }
  function ghApi(path, opts) {
    var c = ghCfg();
    return fetch('https://api.github.com/repos/' + c.owner + '/' + c.repo + path,
      Object.assign({ headers: { Authorization: 'token ' + ghToken(), Accept: 'application/vnd.github+json' } }, opts || {}))
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + (t || r.statusText)); });
        return r.json();
      });
  }
  function syncToGitHub() {
    if (!ghToken()) {
      syncSay('No GitHub token saved in this browser. Add one under Admin → AI Keys & Features (it is the same token the other admin pages use), then press Sync again.', true);
      return;
    }
    var c = ghCfg();
    syncSay('Reading the committed file…');
    // Re-read first so a sync never clobbers someone else's newer edits blindly.
    ghApi('/contents/' + OVERRIDES_PATH + '?ref=' + c.branch)
      .then(function (f) { return f.sha; })
      .catch(function () { return null; })
      .then(function (sha) {
        state.ov.updatedAt = new Date().toISOString();
        var body = { message: 'Grantha Anukramani: ' + countEdits() + ' curated corrections', content: b64(JSON.stringify(state.ov, null, 1) + '\n'), branch: c.branch };
        if (sha) body.sha = sha;
        return ghApi('/contents/' + OVERRIDES_PATH, { method: 'PUT', body: JSON.stringify(body) });
      })
      .then(function (res) {
        state.committedSha = res.content && res.content.sha;
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
        state.dirty = false;
        updateSyncBar();
        syncSay('Synced to GitHub — ' + countEdits() + ' corrections committed to ' + ghCfg().branch + '.');
      })
      .catch(function (e) { syncSay('Sync failed: ' + (e.message || e), true); });
  }
  function syncSay(msg, bad) {
    var el = $("#dvc-syncsay");
    if (el) { el.textContent = msg; el.className = bad ? 'dvc-err' : 'dvc-ok'; }
  }
  function updateSyncBar() {
    var n = countEdits();
    $("#dvc-editcount").textContent = n ? (n + ' correction' + (n === 1 ? '' : 's')) : 'no corrections yet';
    $("#dvc-dirty").style.display = state.dirty ? '' : 'none';
    $("#dvc-sync").disabled = !state.dirty;
  }

  /* ---------------- filter chips ---------------- */
  function buildChips() {
    TAG_FIELDS.forEach(function (col) {
      var wrap = $("#dvc-chips-" + col);
      if (!wrap) return;
      var counts = {};
      state.items.forEach(function (it) { var v = eff(it, col); if (v) counts[v] = (counts[v] || 0) + 1; });
      wrap.innerHTML = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (v) {
        return '<button type="button" class="dvc-chip' + (state.tagFilters[col].has(v) ? ' on' : '') +
          '" data-col="' + col + '" data-val="' + esc(v) + '">' + esc(v) + ' <span class="dvc-muted">' + counts[v] + '</span></button>';
      }).join('');
    });
    var labels = {};
    state.items.forEach(function (it) { labelsOf(it).forEach(function (l) { labels[l] = (labels[l] || 0) + 1; }); });
    var lw = $("#dvc-chips-labels");
    if (lw) {
      var keys = Object.keys(labels);
      lw.innerHTML = keys.length ? keys.map(function (l) {
        return '<button type="button" class="dvc-chip' + (state.labelFilter === l ? ' on' : '') + '" data-label="' + esc(l) + '">' + esc(l) + ' <span class="dvc-muted">' + labels[l] + '</span></button>';
      }).join('') : '<span class="dvc-muted">no labels yet — add them in the grid view’s labels column</span>';
    }
    var dl = $("#dvc-dl-category");
    if (dl) dl.innerHTML = state.masters.categories.map(function (m) { return '<option value="' + esc(variantChosen('category', m)) + '">'; }).join('');
    var da = $("#dvc-dl-author");
    if (da) da.innerHTML = state.masters.authors.slice(0, 900).map(function (m) { return '<option value="' + esc(variantChosen('author', m)) + '">'; }).join('');
  }

  /* ---------------- detail panel ---------------- */
  function openDetail(id) {
    var it = state.byId[id];
    if (!it) return;
    var kids = state.children[id] || [];
    var p = effParent(it);
    var libMatch = (state.crossLinks.library || []).filter(function (m) { return m.id === id; })[0];
    $("#dvc-detail").innerHTML =
      '<button class="dvc-btn dvc-btn-sm" id="dvc-detail-close" style="float:right">✕</button>' +
      '<h3>' + esc(eff(it, 'grantha') || '(अनाम)') + '</h3>' +
      '<div class="dvc-muted">' + esc(iastOf(it, 'grantha')) + ' · sheet row ' + it.row + '</div>' +
      '<table class="dvc-minitable"><tbody>' +
      ['karta', 'vibhaga', 'vishayaVibhaga', 'prasthana', 'availability', 'status'].map(function (f) {
        return '<tr><td class="dvc-muted">' + esc(FIELD_LABEL[f] || f) + '</td><td>' + esc(eff(it, f) || '—') + '</td></tr>';
      }).join('') +
      '<tr><td class="dvc-muted">मूलम् · parent</td><td>' + (p && state.byId[p] ? '<a href="#" data-open="' + p + '">' + esc(eff(state.byId[p], 'grantha')) + '</a>' : '—') + '</td></tr>' +
      '<tr><td class="dvc-muted">वंशः · lineage</td><td>' + esc(it.breadcrumb) + '</td></tr>' +
      (it.mention ? '<tr><td class="dvc-muted">note in sheet</td><td>' + esc(it.mention) + '</td></tr>' : '') +
      (libMatch ? '<tr><td class="dvc-muted">in the library</td><td>' + libMatch.matches.map(function (x) { return esc(x.title); }).join(', ') + '</td></tr>' : '') +
      '</tbody></table>' +
      (kids.length ? '<h4>' + kids.length + ' commentaries / dependent works</h4><ul class="dvc-kidlist">' +
        sortIds(kids).map(function (c) {
          var k = state.byId[c];
          return '<li><a href="#" data-open="' + c + '">' + esc(eff(k, 'grantha')) + '</a> <span class="dvc-muted">' + esc(eff(k, 'karta')) + '</span></li>';
        }).join('') + '</ul>' : '');
    $("#dvc-detail").style.display = '';
    $("#dvc-detail-close").onclick = function () { $("#dvc-detail").style.display = 'none'; };
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    $("#dvc-search").addEventListener('input', function (e) { state.q = e.target.value; rerender(); });
    $("#dvc-sort").addEventListener('change', function (e) { state.sort = e.target.value; LS.set('sort', state.sort); rerender(); });
    $("#dvc-onlyflag").addEventListener('change', function (e) { state.onlyFlag = e.target.value; rerender(); });
    $("#dvc-more").addEventListener('click', function () { renderCurrentView(false); });
    $("#dvc-export").addEventListener('click', exportRowsCSV);
    $("#dvc-sync").addEventListener('click', syncToGitHub);
    $("#dvc-discard").addEventListener('click', function () {
      if (confirm('Discard every unsynced correction in this browser?')) discardDraft();
    });
    $("#dvc-expandall").addEventListener('click', function () {
      state.items.forEach(function (it) { if ((state.children[it.id] || []).length) state.expanded[it.id] = true; });
      renderCurrentView(true);
    });
    $("#dvc-collapseall").addEventListener('click', function () { state.expanded = {}; renderCurrentView(true); });

    $all(".dvc-viewbtn").forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.dataset.view; LS.set('view', state.view);
        $all(".dvc-viewbtn").forEach(function (x) { x.classList.toggle('on', x === b); });
        $("#dvc-treectl").style.display = state.view === 'tree' ? '' : 'none';
        renderCurrentView(true);
      });
    });
    $all(".dvc-scriptbtn").forEach(function (b) {
      b.addEventListener('click', function () {
        state.script = b.dataset.script; LS.set('script', state.script);
        $all(".dvc-scriptbtn").forEach(function (x) { x.classList.toggle('on', x === b); });
        rerender(); if (state.tab !== 'catalogue') showTab(state.tab);
      });
    });
    $all(".dvc-tab").forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });

    document.addEventListener('click', function (e) {
      var t = e.target;
      var toggle = t.closest('[data-toggle]');
      if (toggle) { var id = toggle.dataset.toggle; state.expanded[id] = !state.expanded[id]; renderCurrentView(true); return; }
      var open = t.closest('[data-open]');
      if (open) { e.preventDefault(); openDetail(open.dataset.open); return; }
      var chip = t.closest('.dvc-chip');
      if (chip && chip.dataset.col) {
        var set = state.tagFilters[chip.dataset.col], v = chip.dataset.val;
        if (set.has(v)) set.delete(v); else set.add(v);
        chip.classList.toggle('on'); rerender(); return;
      }
      if (chip && chip.dataset.label) {
        state.labelFilter = state.labelFilter === chip.dataset.label ? '' : chip.dataset.label;
        buildChips(); rerender(); return;
      }
      var vchip = t.closest('[data-canon-kind]');
      if (vchip) { chooseCanonical(vchip.dataset.canonKind, vchip.dataset.canonKey, vchip.dataset.canonVal); return; }
      var acc = t.closest('[data-accept-parent]');
      if (acc) { acceptParent(acc.dataset.acceptParent, acc.dataset.parent); return; }
      var rej = t.closest('[data-reject-parent]');
      if (rej) { rejectParent(rej.dataset.rejectParent); return; }
      var rev = t.closest('[data-review]');
      if (rev) {
        var v2 = rev.dataset.review;
        if (v2 === 'clear') delete state.ov.review[rev.dataset.id]; else state.ov.review[rev.dataset.id] = v2;
        saveDraft(); rerender(); renderDuplicates(); return;
      }
      var lnk = t.closest('[data-link-id]');
      if (lnk) { state.ov.links[lnk.dataset.linkId] = lnk.dataset.linkVal; saveDraft(); renderCrossLinks(); return; }
    });

    // grid editing
    $("#dvc-gbody").addEventListener('dblclick', function (e) {
      var td = e.target.closest('.dvc-gcell'); if (td) beginEdit(td);
    });
    $("#dvc-gbody").addEventListener('click', function (e) {
      var td = e.target.closest('.dvc-gcell'); if (td) td.focus();
    });
    $("#dvc-gbody").addEventListener('keydown', function (e) {
      var td = e.target.closest && e.target.closest('.dvc-gcell');
      if (!td || td.querySelector('input')) return;
      var r = +td.dataset.r, c = +td.dataset.c;
      if (e.key === 'Enter' || e.key === 'F2') { beginEdit(td); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { focusCell(r + 1, c); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { focusCell(r - 1, c); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { focusCell(r, c + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { focusCell(r, c - 1); e.preventDefault(); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { beginEdit(td); td.querySelector('input').value = e.key; e.preventDefault(); }
    });
    // spreadsheet paste: TSV fills down/right from the focused cell
    document.addEventListener('paste', function (e) {
      if (state.view !== 'grid') return;
      var td = document.activeElement && document.activeElement.closest && document.activeElement.closest('.dvc-gcell');
      if (!td) return;
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      if (!text) return;
      e.preventDefault();
      var grid = text.replace(/\r/g, '').split('\n').map(function (l) { return l.split('\t'); });
      var r0 = +td.dataset.r, c0 = +td.dataset.c, n = 0;
      grid.forEach(function (vals, ri) {
        vals.forEach(function (val, ci) {
          var cell = $('td.dvc-gcell[data-r="' + (r0 + ri) + '"][data-c="' + (c0 + ci) + '"]');
          if (!cell) return;
          setRowField(cell.dataset.id, cell.dataset.field, val.trim());
          n++;
        });
      });
      renderCurrentView(true);
      syncSay('pasted ' + n + ' cells into the draft');
    });

    var mq = $("#dvc-masters-q"), mo = $("#dvc-masters-onlyvar");
    if (mq) mq.addEventListener('input', renderMasters);
    if (mo) mo.addEventListener('change', renderMasters);
    window.addEventListener('beforeunload', function (e) {
      if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ---------------- boot ---------------- */
  function init() {
    Promise.all([loadData(), loadOverrides()]).then(function () {
      $all(".dvc-viewbtn").forEach(function (b) { b.classList.toggle('on', b.dataset.view === state.view); });
      $all(".dvc-scriptbtn").forEach(function (b) { b.classList.toggle('on', b.dataset.script === state.script); });
      $("#dvc-sort").value = state.sort;
      $("#dvc-treectl").style.display = state.view === 'tree' ? '' : 'none';
      buildChips();
      wire();
      rerender();
      updateSyncBar();
    }).catch(function (e) {
      console.error('[dvaita-catalog] init failed', e);
      $("#dvc-tree").innerHTML = '<div class="dvc-empty-msg">Could not load the catalogue: ' + esc(e.message || e) + '</div>';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
