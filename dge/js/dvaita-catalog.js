/* =========================================================================
   dvaita-catalog.js — द्वैतवेदान्तग्रन्थानुक्रमणी catalogue page.

   Loads the static, committed bibliography (dge/data/catalogs/
   dvaita_grantha_anukramani.json — imported from a scholar's Excel by
   tools/import_dvaita_grantha_anukramani.py) and layers a thin, editable
   overlay from Firestore on top of it (catalog_dvaita_entries/{rowId} for
   per-row tag corrections and review decisions; catalog_dvaita_master/
   {listId} for the controlled-vocabulary dropdowns). The static JSON is
   never rewritten by this page -- only the overlay is, and only by a
   signed-in admin (firestore.rules enforces that for real; see this repo's
   admin/access-control.html for the identical minimal-Firebase-glue
   pattern this file follows for auth).

   Browsing, filtering, sorting, the duplicates/missing-tags reports, and
   CSV export all work for every visitor, signed in or not -- this is a
   real public catalogue, not just an admin tool. Only cell editing, the
   duplicate-review actions, and the master-list editor require the admin
   role.
   ========================================================================= */
(function () {
  "use strict";

  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['dvaita-catalog.js'] = 'v1.0';

  var DATA_URL = "../data/catalogs/dvaita_grantha_anukramani.json";
  var CHUNK = 200;
  var TAG_COLS = ["vibhaga", "vishayaVibhaga", "prasthana"];
  var COL_LABEL = { vibhaga: "विभागः", vishayaVibhaga: "विषयविभागः", prasthana: "प्रस्थानम्" };

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("dge.dvc." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("dge.dvc." + k, JSON.stringify(v)); } catch (e) {} }
  };

  var state = {
    all: [],            // raw items from the static JSON, indexed by id
    byId: {},
    overlay: {},         // rowId -> {tags:{}, reviewStatus, mergeIntoId, note}
    duplicates: { exactRowDuplicates: [], nameParentKartaDuplicates: [], nameCollisions: [] },
    vocab: {},
    master: {},           // listId -> [values...]
    view: [],              // filtered+sorted array of ids
    shown: 0,
    q: "",
    tagFilters: { vibhaga: new Set(), vishayaVibhaga: new Set(), prasthana: new Set() },
    onlyFlag: LS.get("onlyFlag", ""),  // "" | missingTags | missingKarta | unresolvedLink
    sort: LS.get("sort", "row"),
    tab: "catalog",
    isAdmin: false,
    auth: null, db: null,
    sel: null,              // {r1,c1,r2,c2} over EDITABLE_ROWS x TAG_COLS, by view index
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* ---------- data load ---------- */
  function loadStatic() {
    return fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) {
      state.all = d.items || [];
      state.byId = {};
      state.all.forEach(function (it) { state.byId[it.id] = it; });
      state.vocab = d.vocab || {};
      state.duplicates = d.duplicates || { exactRowDuplicates: [], nameParentKartaDuplicates: [], nameCollisions: [] };
      $("#dvc-total").textContent = state.all.length.toLocaleString();
    });
  }

  function loadOverlay() {
    if (!state.db) return Promise.resolve();
    return state.db.collection('catalog_dvaita_entries').get().then(function (snap) {
      var overlay = {};
      snap.forEach(function (doc) { overlay[doc.id] = doc.data(); });
      state.overlay = overlay;
    }).catch(function (e) { console.warn('[dvaita-catalog] overlay load failed', e); });
  }

  function loadMaster() {
    if (!state.db) return Promise.resolve();
    return state.db.collection('catalog_dvaita_master').get().then(function (snap) {
      var master = {};
      snap.forEach(function (doc) { master[doc.id] = (doc.data().values || []); });
      state.master = master;
    }).catch(function (e) { console.warn('[dvaita-catalog] master load failed', e); });
  }

  /* effective (merged) field value: overlay tag correction wins over the
     static import, so a scholar's fix is what everyone sees immediately. */
  function eff(item, field) {
    var ov = state.overlay[item.id];
    if (ov && ov.tags && ov.tags[field] != null && ov.tags[field] !== '') return ov.tags[field];
    return item[field] || '';
  }
  function reviewOf(id) {
    var ov = state.overlay[id];
    return ov && ov.reviewStatus ? ov.reviewStatus : null;
  }

  /* ---------- filter + sort ---------- */
  function recompute() {
    var q = state.q.trim().toLowerCase();
    state.view = state.all.filter(function (it) {
      if (reviewOf(it.id) === 'delete') return false;
      for (var i = 0; i < TAG_COLS.length; i++) {
        var col = TAG_COLS[i], set = state.tagFilters[col];
        if (set.size && !set.has(eff(it, col))) return false;
      }
      if (state.onlyFlag) {
        if (state.onlyFlag === 'missingTags' && !(!eff(it, 'vibhaga') && !eff(it, 'vishayaVibhaga') && !eff(it, 'prasthana'))) return false;
        if (state.onlyFlag === 'missingKarta' && it.karta) return false;
        if (state.onlyFlag === 'unresolvedLink' && !it.unresolvedLink) return false;
      }
      if (q) {
        var hay = (it.grantha + ' ' + it.karta + ' ' + it.breadcrumb).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).map(function (it) { return it.id; });

    var s = state.sort;
    state.view.sort(function (a, b) {
      var ia = state.byId[a], ib = state.byId[b];
      if (s === 'grantha') return ia.grantha.localeCompare(ib.grantha, 'sa');
      if (s === 'karta') return (ia.karta || '').localeCompare(ib.karta || '', 'sa');
      if (s === 'prasthana') { var pa = eff(ia, 'prasthana'), pb = eff(ib, 'prasthana'); if (pa !== pb) return pa.localeCompare(pb, 'sa'); return ia.row - ib.row; }
      return ia.row - ib.row;
    });
    state.shown = 0;
    $("#dvc-count").textContent = state.view.length.toLocaleString() + " / " + state.all.length.toLocaleString();
  }

  /* ---------- render: catalog table ---------- */
  function cellHTML(item, col, viewIdx, colIdx) {
    var val = eff(item, col);
    var editable = state.isAdmin;
    var sel = state.sel && viewIdx >= Math.min(state.sel.r1, state.sel.r2) && viewIdx <= Math.max(state.sel.r1, state.sel.r2)
      && colIdx >= Math.min(state.sel.c1, state.sel.c2) && colIdx <= Math.max(state.sel.c1, state.sel.c2);
    return '<td class="dvc-cell' + (editable ? ' dvc-editable' : '') + (sel ? ' dvc-selected' : '') + (!val ? ' dvc-empty' : '') +
      '" data-id="' + item.id + '" data-col="' + col + '" data-r="' + viewIdx + '" data-c="' + colIdx + '">' +
      (esc(val) || '<span class="dvc-blank">—</span>') + '</td>';
  }

  function rowHTML(id, viewIdx) {
    var it = state.byId[id];
    var indent = Math.min(it.depth, 6);
    var dupBadge = it.exactDuplicateGroup ? '<span class="dvc-badge dvc-badge-dup" title="Exact duplicate — see the Duplicates tab">≡</span>'
      : it.nameParentKartaGroup ? '<span class="dvc-badge dvc-badge-npk" title="Likely duplicate — see the Duplicates tab">≈</span>' : '';
    var linkBadge = it.unresolvedLink ? '<span class="dvc-badge dvc-badge-warn" title="Link column names a title not found anywhere in the sheet">⚠</span>' : '';
    var tds = TAG_COLS.map(function (col, ci) { return cellHTML(it, col, viewIdx, ci); }).join('');
    return '<tr data-row-id="' + it.id + '">' +
      '<td class="dvc-num">' + it.row + '</td>' +
      '<td class="dvc-grantha" style="padding-left:' + (10 + indent * 14) + 'px" title="' + esc(it.breadcrumb) + '">' +
        (indent ? '<span class="dvc-tree">↳ </span>' : '') + esc(it.grantha || '(अनाम)') + dupBadge + linkBadge + '</td>' +
      '<td class="dvc-karta">' + esc(it.karta || '') + '</td>' +
      tds +
      '<td class="dvc-avail">' + esc(it.availability || '') + '</td>' +
      '<td class="dvc-status">' + esc(it.status || '') + '</td>' +
    '</tr>';
  }

  function render(reset) {
    var box = $("#dvc-tbody");
    if (reset) { box.innerHTML = ""; state.shown = 0; }
    if (!state.view.length) { box.innerHTML = '<tr><td colspan="8" class="dvc-empty-msg">No rows match these filters.</td></tr>'; $("#dvc-more").style.display = "none"; return; }
    var end = Math.min(state.shown + CHUNK, state.view.length);
    var html = "";
    for (var i = state.shown; i < end; i++) html += rowHTML(state.view[i], i);
    box.insertAdjacentHTML("beforeend", html);
    state.shown = end;
    $("#dvc-more").style.display = state.shown < state.view.length ? "block" : "none";
    $("#dvc-more").textContent = "अधिकं दर्शय · show more ▾  (" + (state.view.length - state.shown).toLocaleString() + " left)";
  }

  function rerender() { recompute(); render(true); }

  /* ---------- filter chip UI ---------- */
  function buildFilterChips() {
    TAG_COLS.forEach(function (col) {
      var wrap = $("#dvc-chips-" + col);
      if (!wrap) return;
      var vocabList = (state.vocab[col] || []).map(function (v) { return v.value; });
      // fold in any brand-new values a scholar has added via cell edits
      Object.keys(state.overlay).forEach(function (id) {
        var v = state.overlay[id].tags && state.overlay[id].tags[col];
        if (v && vocabList.indexOf(v) < 0) vocabList.push(v);
      });
      wrap.innerHTML = vocabList.map(function (v) {
        var on = state.tagFilters[col].has(v);
        return '<button type="button" class="dvc-chip' + (on ? ' on' : '') + '" data-col="' + col + '" data-val="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('');
    });
  }

  /* ---------- duplicates tab ---------- */
  function groupRowsHTML(ids) {
    return ids.map(function (id) {
      var it = state.byId[id];
      if (!it) return '';
      var status = reviewOf(id);
      return '<div class="dvc-duprow' + (status === 'delete' ? ' dvc-marked-delete' : '') + '">' +
        '<div class="dvc-dupinfo"><b>#' + it.row + '</b> ' + esc(it.breadcrumb) + ' <span class="dvc-muted">· ' + esc(it.karta || '') + '</span>' +
        (status ? ' <span class="dvc-statuspill">' + esc(status) + (status === 'merge' && state.overlay[id].mergeIntoId ? ' → #' + esc(state.byId[state.overlay[id].mergeIntoId] ? state.byId[state.overlay[id].mergeIntoId].row : state.overlay[id].mergeIntoId) : '') + '</span>' : '') +
        '</div>' +
        (state.isAdmin ? '<div class="dvc-dupacts">' +
          '<button class="dvc-btn" data-act="retain" data-id="' + id + '">Retain</button>' +
          '<button class="dvc-btn" data-act="delete" data-id="' + id + '">Delete</button>' +
          '<button class="dvc-btn" data-act="merge" data-id="' + id + '">Merge into…</button>' +
        '</div>' : '') +
      '</div>';
    }).join('');
  }

  function renderDuplicates() {
    var box = $("#dvc-dup-body");
    var exact = state.duplicates.exactRowDuplicates || [];
    var npk = state.duplicates.nameParentKartaDuplicates || [];
    var coll = state.duplicates.nameCollisions || [];
    var html = '';
    html += '<h3>ठीक समान पङ्क्तयः · Exact duplicates <span class="dvc-muted">(' + exact.length + ' groups)</span></h3>' +
      '<p class="dvc-hint">Every column is identical — almost certainly the same catalogue entry typed twice.</p>';
    html += exact.map(function (g) { return '<div class="dvc-dupgroup">' + groupRowsHTML(g.ids) + '</div>'; }).join('') || '<p class="dvc-muted">none</p>';
    html += '<h3>नाम-मूल-कर्तृ-साम्यम् · Same title + parent + author <span class="dvc-muted">(' + npk.length + ' groups)</span></h3>' +
      '<p class="dvc-hint">Title, parent work and author all match but something else (availability, a note) differs — worth a look, not auto-mergeable.</p>';
    html += npk.map(function (g) { return '<div class="dvc-dupgroup">' + groupRowsHTML(g.ids) + '</div>'; }).join('') || '<p class="dvc-muted">none</p>';
    html += '<h3>नामसाम्यम् (सूचनार्थम्) · Same title, different work <span class="dvc-muted">(' + coll.length + ' groups, informational)</span></h3>' +
      '<p class="dvc-hint">Same title but a different author or parent — normal for the दशप्रकरण, where a commentary title like जयतीर्थीय-टीका repeats once per mūla. Not flagged as a likely duplicate.</p>';
    html += '<details><summary>' + coll.length + ' name-collision groups</summary>' +
      coll.map(function (g) { return '<div class="dvc-dupgroup"><div class="dvc-dupname">' + esc(g.name) + '</div>' + groupRowsHTML(g.ids) + '</div>'; }).join('') + '</details>';
    box.innerHTML = html;
  }

  /* ---------- missing-tags tab ---------- */
  function renderMissing() {
    var box = $("#dvc-missing-body");
    var noTags = state.all.filter(function (it) { return !eff(it, 'vibhaga') && !eff(it, 'vishayaVibhaga') && !eff(it, 'prasthana') && reviewOf(it.id) !== 'delete'; });
    var noKarta = state.all.filter(function (it) { return !it.karta && reviewOf(it.id) !== 'delete'; });
    var badLink = state.all.filter(function (it) { return it.unresolvedLink && reviewOf(it.id) !== 'delete'; });
    function list(items, cols) {
      if (!items.length) return '<p class="dvc-muted">none</p>';
      return '<table class="dvc-minitable"><thead><tr><th>#</th><th>ग्रन्थः</th><th>कर्तृ</th>' + (cols || []).map(function(c){return '<th>'+esc(c)+'</th>';}).join('') + '</tr></thead><tbody>' +
        items.slice(0, 500).map(function (it) {
          return '<tr><td>' + it.row + '</td><td title="' + esc(it.breadcrumb) + '">' + esc(it.grantha || '(अनाम)') + '</td><td>' + esc(it.karta || '') + '</td>' +
            (cols || []).map(function (c) { return '<td>' + esc(it[c] || '') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>' + (items.length > 500 ? '<p class="dvc-muted">' + (items.length - 500) + ' more not shown — filter first, or export CSV.</p>' : '');
    }
    box.innerHTML =
      '<h3>त्रयाणां टैग्-स्तम्भानां रिक्तता · No tags at all <span class="dvc-muted">(' + noTags.length + ')</span></h3>' + list(noTags) +
      '<h3>कर्तृ-रहितम् · No author <span class="dvc-muted">(' + noKarta.length + ')</span></h3>' + list(noKarta) +
      '<h3>अनिर्दिष्ट-लिङ्कः · Unresolved parent link <span class="dvc-muted">(' + badLink.length + ')</span></h3>' + list(badLink, ['linkRaw']);
  }

  /* ---------- master lists tab ---------- */
  function renderMaster() {
    var box = $("#dvc-master-body");
    var lists = TAG_COLS.concat(['karta']);
    box.innerHTML = lists.map(function (col) {
      var seeded = (state.vocab[col] || []).map(function (v) { return v.value; });
      var curated = state.master[col] || [];
      var all = curated.length ? curated : seeded;
      return '<div class="dvc-masterpanel">' +
        '<h3>' + (COL_LABEL[col] || 'कर्तृ') + ' <span class="dvc-muted">(' + all.length + (curated.length ? ' curated' : ' seeded from import') + ')</span></h3>' +
        '<div class="dvc-masterchips" id="dvc-masterchips-' + col + '">' +
          all.map(function (v) { return '<span class="dvc-mchip">' + esc(v) + (state.isAdmin ? '<button class="dvc-mchip-x" data-list="' + col + '" data-val="' + esc(v) + '">×</button>' : '') + '</span>'; }).join('') +
        '</div>' +
        (state.isAdmin ? '<div class="dvc-addform"><input type="text" class="dvc-master-add-input" data-list="' + col + '" placeholder="नूतनं मूल्यम् जोडयतु · add a canonical value"><button class="dvc-btn" data-master-add="' + col + '">➕ Add</button></div>' : '') +
      '</div>';
    }).join('');
  }

  /* ---------- reports tab ---------- */
  function renderReports() {
    var box = $("#dvc-reports-body");
    var byField = {};
    ['prasthana', 'vibhaga', 'vishayaVibhaga'].forEach(function (f) {
      var counts = {};
      state.view.forEach(function (id) { var v = eff(state.byId[id], f) || '(रिक्तम्)'; counts[v] = (counts[v] || 0) + 1; });
      byField[f] = Object.keys(counts).map(function (k) { return { value: k, count: counts[k] }; }).sort(function (a, b) { return b.count - a.count; });
    });
    var kartaCounts = {};
    state.view.forEach(function (id) { var k = state.byId[id].karta; if (k) kartaCounts[k] = (kartaCounts[k] || 0) + 1; });
    var topKarta = Object.keys(kartaCounts).map(function (k) { return { value: k, count: kartaCounts[k] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 30);

    function table(title, rows) {
      return '<div class="dvc-reportcol"><h3>' + title + '</h3><table class="dvc-minitable"><tbody>' +
        rows.map(function (r) { return '<tr><td>' + esc(r.value) + '</td><td class="dvc-rnum">' + r.count.toLocaleString() + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    }
    box.innerHTML = '<p class="dvc-hint">Computed live over the ' + state.view.length.toLocaleString() + ' rows in the current filter — change the filters above, this updates. Export the same view as CSV with the button below.</p>' +
      '<div class="dvc-reportgrid">' +
        table('प्रस्थानम् · Prasthāna', byField.prasthana) +
        table('विभागः · Division', byField.vibhaga) +
        table('विषयविभागः · Subject', byField.vishayaVibhaga) +
        table('शीर्ष-कर्तारः (३०) · Top authors', topKarta) +
      '</div>';
  }

  function csvEscape(v) {
    v = v == null ? '' : String(v);
    if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function exportCSV() {
    var cols = ['row', 'grantha', 'breadcrumb', 'karta', 'vibhaga', 'vishayaVibhaga', 'prasthana', 'availability', 'status', 'linkRaw'];
    var header = cols.join(',');
    var lines = [header];
    state.view.forEach(function (id) {
      var it = state.byId[id];
      var row = cols.map(function (c) {
        if (TAG_COLS.indexOf(c) >= 0) return csvEscape(eff(it, c));
        return csvEscape(it[c]);
      });
      lines.push(row.join(','));
    });
    var blob = new Blob(["﻿" + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'dvaita-grantha-anukramani-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  window.dvcExportCSV = exportCSV; // exposed for verification tooling

  /* ---------- overlay writes ---------- */
  function saveOverlay(id, patch) {
    if (!state.db || !state.isAdmin) return Promise.reject(new Error('not signed in as admin'));
    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    patch.updatedBy = (state.auth && state.auth.currentUser && (state.auth.currentUser.email || state.auth.currentUser.uid)) || 'unknown';
    state.overlay[id] = Object.assign({}, state.overlay[id], patch, {
      tags: Object.assign({}, (state.overlay[id] && state.overlay[id].tags), patch.tags)
    });
    return state.db.collection('catalog_dvaita_entries').doc(id).set(state.overlay[id], { merge: true });
  }

  function setTag(id, col, val) {
    var patch = { tags: {} };
    patch.tags[col] = val;
    return saveOverlay(id, patch);
  }

  function setReview(id, status, mergeIntoId) {
    var patch = { reviewStatus: status };
    if (status === 'merge') patch.mergeIntoId = mergeIntoId || null;
    return saveOverlay(id, patch);
  }

  /* ---------- cell selection + copy/paste ---------- */
  var dragging = false;
  function cellAt(r, c) { return $('td[data-r="' + r + '"][data-c="' + c + '"]'); }
  function applySelClasses() {
    $all('.dvc-selected').forEach(function (td) { td.classList.remove('dvc-selected'); });
    if (!state.sel) return;
    var r1 = Math.min(state.sel.r1, state.sel.r2), r2 = Math.max(state.sel.r1, state.sel.r2);
    var c1 = Math.min(state.sel.c1, state.sel.c2), c2 = Math.max(state.sel.c1, state.sel.c2);
    for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) { var td = cellAt(r, c); if (td) td.classList.add('dvc-selected'); }
  }

  function wireGrid() {
    var tbody = $("#dvc-tbody");
    tbody.addEventListener('mousedown', function (e) {
      var td = e.target.closest('.dvc-editable');
      if (!td) return;
      dragging = true;
      state.sel = { r1: +td.dataset.r, c1: +td.dataset.c, r2: +td.dataset.r, c2: +td.dataset.c };
      applySelClasses();
    });
    tbody.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var td = e.target.closest('.dvc-editable');
      if (!td || !state.sel) return;
      state.sel.r2 = +td.dataset.r; state.sel.c2 = +td.dataset.c;
      applySelClasses();
    });
    document.addEventListener('mouseup', function () { dragging = false; });

    tbody.addEventListener('dblclick', function (e) {
      var td = e.target.closest('.dvc-editable');
      if (!td || td.querySelector('input')) return;
      startInlineEdit(td);
    });

    document.addEventListener('copy', function (e) {
      if (!state.sel) return;
      if (!document.activeElement || !document.activeElement.closest || !document.activeElement.closest('#dvc-panel-catalog')) return;
      var r1 = Math.min(state.sel.r1, state.sel.r2), r2 = Math.max(state.sel.r1, state.sel.r2);
      var c1 = Math.min(state.sel.c1, state.sel.c2), c2 = Math.max(state.sel.c1, state.sel.c2);
      var rows = [];
      for (var r = r1; r <= r2; r++) {
        var cells = [];
        for (var c = c1; c <= c2; c++) { var id = state.view[r]; cells.push(id ? eff(state.byId[id], TAG_COLS[c]) : ''); }
        rows.push(cells.join('\t'));
      }
      e.clipboardData.setData('text/plain', rows.join('\n'));
      e.preventDefault();
    });

    document.addEventListener('paste', function (e) {
      if (!state.sel || !state.isAdmin) return;
      if (!document.activeElement || !document.activeElement.closest || !document.activeElement.closest('#dvc-panel-catalog')) return;
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      if (!text) return;
      e.preventDefault();
      var grid = text.replace(/\r/g, '').split('\n').map(function (l) { return l.split('\t'); });
      var r0 = Math.min(state.sel.r1, state.sel.r2), c0 = Math.min(state.sel.c1, state.sel.c2);
      var writes = [];
      grid.forEach(function (rowVals, ri) {
        rowVals.forEach(function (val, ci) {
          var r = r0 + ri, c = c0 + ci;
          if (r >= state.view.length || c >= TAG_COLS.length) return;
          var id = state.view[r], col = TAG_COLS[c];
          writes.push(setTag(id, col, val.trim()));
        });
      });
      Promise.all(writes).then(function () { rerender(); buildFilterChips(); flashSaveState('pasted ' + writes.length + ' cells'); })
        .catch(function (e2) { flashSaveState('paste failed: ' + (e2.message || e2), true); });
    });
  }

  function startInlineEdit(td) {
    var id = td.dataset.id, col = td.dataset.col;
    var cur = eff(state.byId[id], col);
    var listId = 'dvc-dl-' + col;
    td.innerHTML = '<input type="text" list="' + listId + '" value="' + esc(cur) + '" class="dvc-inline-input">';
    var input = td.querySelector('input');
    input.focus(); input.select();
    function commit() {
      var val = input.value.trim();
      setTag(id, col, val).then(function () { buildFilterChips(); }).catch(function (e) { flashSaveState('save failed: ' + (e.message || e), true); });
      td.classList.toggle('dvc-empty', !val);
      td.innerHTML = esc(val) || '<span class="dvc-blank">—</span>';
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { td.innerHTML = esc(cur) || '<span class="dvc-blank">—</span>'; } });
  }

  function refreshDatalists() {
    TAG_COLS.forEach(function (col) {
      var dl = $('#dvc-dl-' + col);
      if (!dl) return;
      var vals = (state.master[col] && state.master[col].length ? state.master[col] : (state.vocab[col] || []).map(function (v) { return v.value; }));
      dl.innerHTML = vals.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('');
    });
  }

  function flashSaveState(msg, isError) {
    var el = $("#dvc-savestate");
    if (!el) return;
    el.textContent = msg; el.className = isError ? 'dvc-err' : 'dvc-ok';
    setTimeout(function () { el.textContent = ''; }, 4000);
  }

  /* ---------- tabs ---------- */
  function showTab(tab) {
    state.tab = tab;
    ['catalog', 'duplicates', 'missing', 'master', 'reports'].forEach(function (t) {
      $("#dvc-panel-" + t).style.display = (t === tab) ? '' : 'none';
      var btn = $('.dvc-tab[data-tab="' + t + '"]');
      if (btn) btn.classList.toggle('on', t === tab);
    });
    if (tab === 'duplicates') renderDuplicates();
    if (tab === 'missing') renderMissing();
    if (tab === 'master') renderMaster();
    if (tab === 'reports') renderReports();
  }

  /* ---------- wiring ---------- */
  function wireControls() {
    $("#dvc-search").addEventListener('input', function (e) { state.q = e.target.value; rerender(); });
    $("#dvc-sort").value = state.sort;
    $("#dvc-sort").addEventListener('change', function (e) { state.sort = e.target.value; LS.set('sort', state.sort); rerender(); });
    $("#dvc-more").addEventListener('click', function () { render(false); });
    $all(".dvc-tab").forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });
    $("#dvc-export").addEventListener('click', exportCSV);
    $("#dvc-onlyflag").addEventListener('change', function (e) { state.onlyFlag = e.target.value; LS.set('onlyFlag', state.onlyFlag); rerender(); });

    document.addEventListener('click', function (e) {
      var chip = e.target.closest('.dvc-chip');
      if (chip) {
        var col = chip.dataset.col, val = chip.dataset.val, set = state.tagFilters[col];
        if (set.has(val)) set.delete(val); else set.add(val);
        chip.classList.toggle('on');
        rerender();
        return;
      }
      var dupBtn = e.target.closest('[data-act]');
      if (dupBtn) {
        var id = dupBtn.dataset.id, act = dupBtn.dataset.act;
        if (act === 'merge') {
          var target = prompt('पङ्क्ति-सङ्ख्या (row #) to merge into:');
          if (!target) return;
          var targetItem = state.all.filter(function (it) { return String(it.row) === String(target).trim(); })[0];
          if (!targetItem) { alert('No row with that number.'); return; }
          setReview(id, 'merge', targetItem.id).then(function () { renderDuplicates(); flashSaveState('marked as merge → #' + target); });
        } else {
          setReview(id, act).then(function () { renderDuplicates(); flashSaveState('marked ' + act); if (act === 'delete') rerender(); });
        }
        return;
      }
      var mx = e.target.closest('.dvc-mchip-x');
      if (mx) {
        var listId = mx.dataset.list, val2 = mx.dataset.val;
        var cur = (state.master[listId] || (state.vocab[listId] || []).map(function (v) { return v.value; })).filter(function (v) { return v !== val2; });
        state.master[listId] = cur;
        state.db.collection('catalog_dvaita_master').doc(listId).set({ values: cur }, { merge: true })
          .then(function () { renderMaster(); refreshDatalists(); });
        return;
      }
      var addBtn = e.target.closest('[data-master-add]');
      if (addBtn) {
        var lid = addBtn.dataset.masterAdd;
        var input = $('.dvc-master-add-input[data-list="' + lid + '"]');
        var v = input.value.trim();
        if (!v) return;
        var curList = (state.master[lid] || (state.vocab[lid] || []).map(function (x) { return x.value; })).slice();
        if (curList.indexOf(v) < 0) curList.push(v);
        state.master[lid] = curList;
        state.db.collection('catalog_dvaita_master').doc(lid).set({ values: curList }, { merge: true })
          .then(function () { input.value = ''; renderMaster(); refreshDatalists(); });
      }
    });

    // Ctrl/Cmd+A inside the grid selects the whole visible tag-column block
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement && document.activeElement.closest && document.activeElement.closest('#dvc-panel-catalog') && !document.activeElement.matches('input,textarea')) {
        if (!state.view.length) return;
        e.preventDefault();
        state.sel = { r1: 0, c1: 0, r2: Math.min(state.shown, state.view.length) - 1, c2: TAG_COLS.length - 1 };
        applySelClasses();
      }
    });
  }

  /* ---------- minimal Firebase glue (mirrors admin/access-control.html) ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src; el.async = false;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(el);
    });
  }

  // A visitor's browsing/filtering/sorting of the public catalogue must
  // never depend on Firebase actually loading -- an ad-blocker, a flaky
  // network, or (as this project has hit before) a sandboxed dev proxy
  // dropping the gstatic.com connection can otherwise hang the *entire*
  // page indefinitely, since a <script> tag's connection being reset
  // rather than cleanly failing does not always fire its onerror. This
  // races the real init against a timeout so the page always settles one
  // way or the other -- worst case, a visitor just can't sign in to edit.
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        console.warn('[dvaita-catalog] ' + label + ' timed out after ' + ms + 'ms');
        resolve();
      }, ms);
      promise.then(function () { if (done) return; done = true; clearTimeout(timer); resolve(); },
                    function (e) { if (done) return; done = true; clearTimeout(timer); console.warn('[dvaita-catalog] ' + label + ' failed', e); resolve(); });
    });
  }

  function initFirebase() {
    if (!window.AUTH_CONFIG || !window.AUTH_CONFIG.enabled) return Promise.resolve();
    var base = window.AUTH_CONFIG.sdkBase || 'https://www.gstatic.com/firebasejs/12.17.1/';
    var ready = loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () { return loadScript(base + 'firebase-firestore-compat.js'); })
      .then(function () {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        state.auth = firebase.auth();
        state.db = firebase.firestore();
        return new Promise(function (resolve) {
          state.auth.onAuthStateChanged(function (user) {
            if (!user) { state.isAdmin = false; updateAuthUI(null); resolve(); return; }
            state.db.collection('users').doc(user.uid).get().then(function (snap) {
              var role = snap.exists ? (snap.data().role || 'basic') : 'basic';
              state.isAdmin = (role === 'admin' || role === 'superadmin');
              updateAuthUI(user, role);
              resolve();
            }).catch(function () { state.isAdmin = false; updateAuthUI(user, null); resolve(); });
          });
        });
      });
    return withTimeout(ready, 8000, 'Firebase init');
  }

  function updateAuthUI(user, role) {
    var el = $("#dvc-authstate");
    if (!el) return;
    if (!user) {
      el.innerHTML = window.AUTH_CONFIG && window.AUTH_CONFIG.enabled ? 'Not signed in — <button class="dvc-btn" id="dvc-signin">Sign in</button> to edit' : '';
      var b = $("#dvc-signin");
      if (b) b.onclick = function () { state.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) { if (e.code !== 'auth/popup-closed-by-user') alert('Sign-in failed: ' + e.message); }); };
    } else {
      el.innerHTML = 'Signed in as <b>' + esc(user.displayName || user.email || 'user') + '</b>' + (role ? ' · role: ' + esc(role) : '') +
        (state.isAdmin ? '' : ' <span class="dvc-muted">(admin role needed to edit)</span>') + ' <button class="dvc-btn" id="dvc-signout">Sign out</button>';
      $("#dvc-signout").onclick = function () { state.auth.signOut(); };
    }
    document.body.classList.toggle('dvc-is-admin', state.isAdmin);
  }

  /* ---------- boot ---------- */
  function init() {
    loadStatic().then(function () {
      // Render straight away from the static import -- every visitor gets a
      // working, filterable, sortable, exportable catalogue immediately,
      // whether or not Firebase ever loads.
      buildFilterChips();
      refreshDatalists();
      wireControls();
      wireGrid();
      rerender();
      render(true);

      // Firebase (auth + the edit overlay + master lists) upgrades the page
      // in the background: once it resolves (or times out), re-render so
      // any signed-in admin's edits and edit controls appear.
      initFirebase().then(function () { return Promise.all([loadOverlay(), loadMaster()]); }).then(function () {
        buildFilterChips();
        refreshDatalists();
        document.body.classList.toggle('dvc-is-admin', state.isAdmin);
        rerender();
        render(true);
      });
    }).catch(function (e) {
      console.error('[dvaita-catalog] init failed', e);
      $("#dvc-tbody").innerHTML = '<tr><td colspan="8">Could not load the catalogue: ' + esc(e.message || e) + '</td></tr>';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
