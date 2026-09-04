/* guru-data.js — ONE central data layer for every Guru Parampara view
   (guru1 / guru2 / guru3 and the admin editor's preview).

   Canonical store: dge/guru-parampara/data/parampara.json (215 nodes; the
   split people/mathas/places.json are GENERATED from it by
   tools/build_guru_parampara_entities.py — never hand-edit those).

   A superadmin with a pending admin draft (localStorage guru_admin_draft,
   written by admin/guru.html) sees the draft overlaid, so edits can be
   previewed in every layout before the exported JSON is committed. */
(function () {
  'use strict';
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['guru-data.js'] =
    'v1.0 (central parampara adapter: canonical nodes + matha palette + succession orders + gps links + admin-draft overlay for superadmins)';

  // stable colours for every matha key in matha_labels (fallback hashes hue)
  var PALETTE = {
    mula: '#8a7a68', core: '#b3541e', lay: '#7d7d7d',
    uttaradi: '#2a6f97', vyasaraja: '#3d8b5a', raghavendra: '#c25b32',
    sripadaraja: '#7a4a9a', haridasa: '#c9a227',
    kashi: '#3d887d', gokarna: '#5f9e8f',
    palimaru: '#a15d82', adamaru: '#b27638', krishnapura: '#596f98',
    puttige: '#8b7040', shirur: '#4d858f', sode: '#a25d49',
    kaniyooru: '#6c7c47', pejawara: '#795a8e', peripheral: '#888'
  };
  var UDUPI_ASHTA = ['palimaru', 'adamaru', 'krishnapura', 'puttige',
                     'shirur', 'sode', 'kaniyooru', 'pejawara'];

  function colorOf(matha) {
    if (PALETTE[matha]) return PALETTE[matha];
    var h = 0; String(matha).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; });
    return 'hsl(' + h + ',45%,50%)';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var cache = null;
  function load() {
    if (cache) return cache;
    cache = Promise.all([
      fetch('data/parampara.json').then(function (r) { return r.json(); }),
      fetch('data/places.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0], placesDoc = res[1];
      var nodes = (d.nodes || []).map(function (n) { return Object.assign({}, n); });

      // superadmin draft overlay (admin/guru.html) — preview before commit
      var draft = null;
      try {
        var sa = localStorage.getItem('is_superadmin') === 'true' || localStorage.getItem('dge.admin.ok') === '1';
        if (sa) draft = JSON.parse(localStorage.getItem('guru_admin_draft') || 'null');
      } catch (e) {}
      var draftBadge = {};
      if (draft && draft.nodes) {
        var byIdTmp = {};
        nodes.forEach(function (n, i) { byIdTmp[n.id] = i; });
        Object.keys(draft.nodes).forEach(function (id) {
          var dn = draft.nodes[id];
          if (byIdTmp[id] !== undefined) nodes[byIdTmp[id]] = Object.assign({}, nodes[byIdTmp[id]], dn);
          else nodes.push(Object.assign({ id: id }, dn));
          draftBadge[id] = 1;
        });
        (draft.deleted || []).forEach(function (id) {
          nodes = nodes.filter(function (n) { return n.id !== id; });
        });
      }

      var byId = {}, children = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      nodes.forEach(function (n) {
        if (n.guru && byId[n.guru]) (children[n.guru] = children[n.guru] || []).push(n.id);
      });

      // node id -> gps + place label, via places.json people lists
      var geo = {};
      var places = (placesDoc && placesDoc.places) || placesDoc || [];
      (Array.isArray(places) ? places : Object.values(places)).forEach(function (p) {
        (p.people || []).forEach(function (pid) {
          if (!geo[pid]) geo[pid] = { label: p.label, gps: p.gps || null };
        });
      });

      function succession(matha) {
        var keys = matha === 'udupi' ? UDUPI_ASHTA : [matha];
        var set = nodes.filter(function (n) { return keys.indexOf(n.matha) >= 0; });
        var ids = {}; set.forEach(function (n) { ids[n.id] = 1; });
        var indeg = {}; set.forEach(function (n) { indeg[n.id] = 0; });
        set.forEach(function (n) { if (n.guru && ids[n.guru]) indeg[n.id]++; });
        var q = set.filter(function (n) { return indeg[n.id] === 0; }).map(function (n) { return n.id; });
        var order = [];
        while (q.length) {
          var id = q.shift(); order.push(id);
          (children[id] || []).forEach(function (c) {
            if (ids[c] && --indeg[c] === 0) q.push(c);
          });
        }
        set.forEach(function (n) { if (order.indexOf(n.id) < 0) order.push(n.id); });
        return order;
      }

      function centuryOf(n) {
        if (n.b == null && n.d == null) return 'timeless';
        var y = (n.b != null ? n.b : n.d);
        return Math.floor(y / 100) * 100;
      }

      function mapsLink(id) {
        // node-level gps (set through admin/guru.html) wins; the generated
        // places.json geo is the fallback once places are geocoded
        var n = byId[id];
        var gps = (n && n.gps) || (geo[id] && geo[id].gps) || null;
        if (!gps) return null;
        var ll = Array.isArray(gps) ? gps.join(',')
          : String(gps.lat) + ',' + (gps.lng != null ? gps.lng : gps.lon);
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ll);
      }

      return {
        nodes: nodes, byId: byId, children: children,
        mathaLabels: d.matha_labels || {},
        images: d.brindavana_images || {},
        meta: d.meta || {},
        geo: geo, mapsLink: mapsLink,
        succession: succession, centuryOf: centuryOf,
        colorOf: colorOf, esc: esc,
        udupiAshta: UDUPI_ASHTA,
        draftIds: draftBadge,
        hasDraft: !!(draft && draft.nodes && Object.keys(draft.nodes).length)
      };
    });
    return cache;
  }

  window.DGE_GURU = { load: load, colorOf: colorOf, esc: esc, UDUPI_ASHTA: UDUPI_ASHTA };
})();
