// grantha-reader.js — the work.json-aware reader for grantha_work_v2
// families (tools/reports/grantha_data_architecture.md). Additive preview
// beside the classic reader, per the kosha2 precedent: replaces nothing
// until the project lead signs off.
(function () {
  'use strict';
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['grantha-reader.js'] =
    'v1.1 (adhikarana navigation: filter select + section dividers from the sutra layer\'s adhikarana field · layer chips WRAP so every commentary is visible — the field report showed off-screen chips read as missing; v1.0: chain-depth chips, lazy layers, pada nav, #ref links)';

  // v2 families available to this reader. Paths are relative to dge/.
  var REGISTRY = {
    brahma_sutra: {
      path: 'data/darshana/vedanta/dvaita/DvaitaVedanta/sutra_prasthana/brahma_sutra',
      base_label: 'सूत्रम्'
    },
    anuvyakhyana_sudha: {
      path: 'data/darshana/vedanta/dvaita/DvaitaVedanta/sutra_prasthana/anuvyakhyana_sudha',
      base_label: 'अनुव्याख्यानम्'
    }
  };
  var ADH_NAME = ['मङ्गलम्', 'प्रथमाध्यायः', 'द्वितीयाध्यायः', 'तृतीयाध्यायः', 'चतुर्थाध्यायः'];
  var PAD_NAME = ['', 'प्रथमः पादः', 'द्वितीयः पादः', 'तृतीयः पादः', 'चतुर्थः पादः'];

  var state = {
    work: '', root: '', wj: null,
    base: '',                  // base layer slug (first in work.json)
    depth: {},                 // slug -> chain depth (0 = base)
    enabled: [],               // enabled layer slugs, persisted
    loaded: {},                // slug -> { byRef: {ref:[units]}, order:[refs] }
    loading: {},
    padas: [],                 // ["1.1", ...] from base layer
    pada: '', hlRef: '',
    adhik: ''                  // '' = whole pada; else filter to one adhikarana
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function lsKey() { return 'grantha2_layers_' + state.work; }
  function refKey(r) { return r.split('.').map(Number); }
  function toast(msg) {
    var t = $('#g2Toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2000);
  }

  function fetchLayer(slug) {
    if (state.loaded[slug]) return Promise.resolve(state.loaded[slug]);
    if (state.loading[slug]) return state.loading[slug];
    state.loading[slug] = fetch(state.root + '/' + slug + '/data.json')
      .then(function (r) { if (!r.ok) throw new Error(slug + ' HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var byRef = {}, order = [];
        (d.units || []).forEach(function (u) {
          if (!byRef[u.ref]) { byRef[u.ref] = []; order.push(u.ref); }
          byRef[u.ref].push(u);
        });
        state.loaded[slug] = { byRef: byRef, order: order };
        delete state.loading[slug];
        return state.loaded[slug];
      });
    return state.loading[slug];
  }

  function chainDepth() {
    var by = {};
    (state.wj.layers || []).forEach(function (L) { by[L.slug] = L; });
    function d(slug, seen) {
      var L = by[slug];
      if (!L || slug === state.base) return 0;
      var co = L.commentary_on;
      if (!co || !by[co] || seen[slug]) return 1;   // unverified chain: level 1
      seen[slug] = 1;
      return 1 + d(co, seen);
    }
    (state.wj.layers || []).forEach(function (L) { state.depth[L.slug] = d(L.slug, {}); });
  }

  // ---- header / controls --------------------------------------------------
  function renderChips() {
    var el = $('#g2Layers');
    el.innerHTML = (state.wj.layers || []).map(function (L) {
      var on = state.enabled.indexOf(L.slug) >= 0;
      var depth = state.depth[L.slug] || 0;
      return '<button data-layer="' + esc(L.slug) + '" class="' + (on ? 'on' : '') +
        ' d' + Math.min(depth, 3) + '" title="' + esc(L.author || '') +
        (L.commentary_on ? ' · on ' + esc(L.commentary_on) : '') + '">' +
        (depth ? '<span class="tw">' + '›'.repeat(depth) + '</span>' : '') +
        '<span lang="sa">' + esc(L.title) + '</span>' +
        '<span class="n">' + (L.units || '') + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-layer]').forEach(function (b) {
      b.onclick = function () { toggleLayer(b.dataset.layer); };
    });
  }

  function toggleLayer(slug) {
    var i = state.enabled.indexOf(slug);
    if (i >= 0) {
      if (slug === state.base) { toast('मूलपाठं न निवार्यते — the base text stays on'); return; }
      state.enabled.splice(i, 1);
      finishToggle();
    } else {
      state.enabled.push(slug);
      toast('Loading ' + slug + '…');
      fetchLayer(slug).then(finishToggle).catch(function (e) {
        state.enabled = state.enabled.filter(function (s) { return s !== slug; });
        toast(String(e.message || e));
        renderChips();
      });
    }
    function finishToggle() {
      try { localStorage.setItem(lsKey(), JSON.stringify(state.enabled)); } catch (e) {}
      renderChips(); renderPada();
    }
  }

  function padaAdhikaranas(p) {
    // adhikaranas of a pada, in first-appearance order, with sutra counts
    var base = state.loaded[state.base];
    var out = [], idx = {};
    if (!base) return out;
    base.order.forEach(function (r) {
      if (r.indexOf(p + '.') !== 0) return;
      (base.byRef[r] || []).forEach(function (u) {
        var a = u.adhikarana;
        if (!a) return;
        if (!(a in idx)) { idx[a] = out.length; out.push({ name: a, n: 0 }); }
        out[idx[a]].n++;
      });
    });
    return out;
  }

  function renderNav() {
    var sel = $('#g2Pada');
    sel.innerHTML = state.padas.map(function (p) {
      var ap = p.split('.');
      var label = ap[0] === '0' ? ADH_NAME[0]
        : ADH_NAME[+ap[0]] + ' · ' + PAD_NAME[+ap[1]];
      return '<option value="' + p + '"' + (p === state.pada ? ' selected' : '') + '>' +
        label + ' (' + p + ')</option>';
    }).join('');
    sel.onchange = function () { gotoPada(sel.value); };
    var asel = $('#g2Adhik');
    var adhs = padaAdhikaranas(state.pada);
    asel.hidden = !adhs.length;
    asel.innerHTML = '<option value="">सर्वाणि अधिकरणानि (' + adhs.length + ')</option>' +
      adhs.map(function (a) {
        return '<option value="' + esc(a.name) + '"' +
          (a.name === state.adhik ? ' selected' : '') + '>' +
          esc(a.name) + ' · ' + a.n + '</option>';
      }).join('');
    asel.onchange = function () { state.adhik = asel.value; renderPada(); window.scrollTo(0, 0); };
    $('#g2Prev').onclick = function () { step(-1); };
    $('#g2Next').onclick = function () { step(1); };
    function step(d) {
      var i = state.padas.indexOf(state.pada) + d;
      if (i >= 0 && i < state.padas.length) gotoPada(state.padas[i]);
    }
  }

  function gotoPada(p, hlRef) {
    state.pada = p; state.hlRef = hlRef || '';
    state.adhik = '';            // a fresh pada starts unfiltered
    renderNav(); renderPada();
    if (!hlRef) window.scrollTo(0, 0);
  }

  // ---- content ------------------------------------------------------------
  function unitsAt(slug, ref) {
    var L = state.loaded[slug];
    return (L && L.byRef[ref]) || [];
  }

  function layerBlock(L, ref) {
    var us = unitsAt(L.slug, ref);
    if (!us.length) return '';
    var depth = Math.min(state.depth[L.slug] || 1, 3);
    return '<section class="g2-layer d' + depth + '">' +
      '<div class="g2-lname"><span lang="sa">' + esc(L.title) + '</span>' +
      (L.author ? '<span class="au" lang="sa">' + esc(L.author) + '</span>' : '') + '</div>' +
      us.map(function (u) {
        return '<p class="g2-para" id="u-' + esc(u.id) + '" lang="sa">' +
          esc(u.text).replace(/\n/g, '<br>') +
          '<button class="g2-pid" data-copyid="' + esc(u.id) + '" title="Copy paragraph link">¶' +
          esc(u.id.split('.').pop().slice(1)) + '</button></p>';
      }).join('') + '</section>';
  }

  function renderPada() {
    var main = $('#g2Main');
    var base = state.loaded[state.base];
    if (!base) { main.innerHTML = '<div class="g2-empty">Loading…</div>'; return; }
    var others = (state.wj.layers || []).filter(function (L) {
      return L.slug !== state.base && state.enabled.indexOf(L.slug) >= 0;
    });
    // refs are the UNION across enabled layers: the mangala pada (0.0) has
    // commentary units with no base sutra, and a tika can gloss a ref the
    // base skips — those cards must still render
    var seen = {};
    var refs = [];
    [state.base].concat(others.map(function (L) { return L.slug; }))
      .forEach(function (slug) {
        var Ld = state.loaded[slug];
        if (!Ld) return;
        Ld.order.forEach(function (r) {
          if (r.indexOf(state.pada + '.') === 0 && !seen[r]) { seen[r] = 1; refs.push(r); }
        });
      });
    refs.sort(function (a, b) {
      var ka = refKey(a), kb = refKey(b);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
    });
    var lastAdhik = null;
    main.innerHTML = refs.map(function (ref) {
      var bu = base.byRef[ref] || [];
      var adhik = bu.map(function (u) { return u.adhikarana || ''; }).filter(Boolean)[0] || '';
      if (state.adhik && adhik !== state.adhik) return '';
      var divider = '';
      if (adhik && adhik !== lastAdhik) {
        lastAdhik = adhik;
        divider = '<div class="g2-adhik-head" lang="sa">' + esc(adhik) +
          '<span class="n">' + esc(ref) + '–</span></div>';
      }
      var topic = bu.map(function (u) { return u.topic || ''; }).filter(Boolean)[0];
      return divider + '<article class="g2-card' + (ref === state.hlRef ? ' hl' : '') +
        '" id="ref-' + esc(ref) + '">' +
        '<header class="g2-chead"><span class="g2-ref">' + esc(ref) + '</span>' +
        (topic ? '<span class="g2-topic" lang="sa">' + esc(topic) + '</span>' : '') +
        '<button class="g2-linkbtn" data-reflink="' + esc(ref) + '" title="Copy link">🔗</button></header>' +
        (bu.length ? '<div class="g2-base" lang="sa">' + bu.map(function (u) {
          return esc(u.text).replace(/\n/g, '<br>');
        }).join('<br>') + '</div>' : '') +
        others.map(function (L) { return layerBlock(L, ref); }).join('') +
        '</article>';
    }).join('') || '<div class="g2-empty">No units here.</div>';
    if (state.adhik && !main.querySelector('.g2-card')) {
      main.innerHTML = '<div class="g2-empty">इदम् अधिकरणम् अस्मिन् पादे नास्ति।</div>';
    }

    main.querySelectorAll('[data-reflink]').forEach(function (b) {
      b.onclick = function () { copyLink('#ref=' + b.dataset.reflink); };
    });
    main.querySelectorAll('[data-copyid]').forEach(function (b) {
      b.onclick = function () { copyLink('#unit=' + b.dataset.copyid); };
    });
    if (state.hlRef) {
      var el = document.getElementById('ref-' + state.hlRef);
      if (el) el.scrollIntoView({ block: 'start' });
    }
  }

  function copyLink(hash) {
    var url = location.origin + location.pathname + '?work=' + encodeURIComponent(state.work) + hash;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(function () { toast('Link copied'); })
      .catch(function () { toast(url); });
  }

  // ---- boot ---------------------------------------------------------------
  function pickWork() {
    var main = $('#g2Main');
    main.innerHTML = '<div class="g2-empty">ग्रन्थं वृणुत — choose a work</div>' +
      '<div class="g2-pick">' + Object.keys(REGISTRY).map(function (w) {
        return '<a href="?work=' + esc(w) + '">' + esc(w) + '</a>';
      }).join('') + '</div>';
  }

  function boot() {
    var q = new URLSearchParams(location.search);
    var w = q.get('work') || '';
    if (!REGISTRY[w]) { pickWork(); return; }
    state.work = w;
    state.root = REGISTRY[w].path;
    fetch(state.root + '/work.json')
      .then(function (r) { return r.json(); })
      .then(function (wj) {
        state.wj = wj;
        state.base = (wj.layers && wj.layers[0] && wj.layers[0].slug) || 'mula';
        chainDepth();
        $('#g2Title').innerHTML = '<span lang="sa">' + esc(wj.title || w) + '</span>';
        document.title = (wj.title || w) + ' · DGE';
        try {
          state.enabled = JSON.parse(localStorage.getItem(lsKey()) || 'null') || [];
        } catch (e) { state.enabled = []; }
        if (!state.enabled.length) {
          // default view: the base text plus its first direct commentary
          state.enabled = [state.base];
          var first = (wj.layers || []).filter(function (L) {
            return L.commentary_on === state.base;
          })[0];
          if (first) state.enabled.push(first.slug);
        }
        if (state.enabled.indexOf(state.base) < 0) state.enabled.unshift(state.base);
        var m = location.hash.match(/(?:ref|unit)=([\d.]+)/);
        var target = m ? m[1] : '';
        var targetPada = target ? target.split('.').slice(0, 2).join('.') : '';
        return Promise.all(state.enabled.map(fetchLayer)).then(function () {
          // work.json carries the pada union across ALL layers (the mangala
          // pada 0.0 exists only in the commentaries); fall back to deriving
          // from the base layer for older manifests
          var baseL = state.loaded[state.base];
          var seen = {};
          state.padas = (wj.padas && wj.padas.length) ? wj.padas.slice()
            : baseL.order.map(function (r) {
              return r.split('.').slice(0, 2).join('.');
            }).filter(function (p) { return seen[p] ? 0 : (seen[p] = 1); })
              .sort(function (a, b) {
                var ka = a.split('.').map(Number), kb = b.split('.').map(Number);
                return ka[0] - kb[0] || ka[1] - kb[1];
              });
          renderChips();
          var startPada = state.padas.indexOf(targetPada) >= 0 ? targetPada
            : (state.padas[0] === '0.0' && state.padas.length > 1 ? state.padas[1] : state.padas[0]);
          gotoPada(startPada, target ? target.split('.').slice(0, 3).join('.') : '');
        });
      })
      .catch(function (e) {
        $('#g2Main').innerHTML = '<div class="g2-empty">Could not load this work (' +
          esc(String(e.message || e)) + ').</div>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
