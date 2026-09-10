/* =========================================================================
   book-ui.js — the "📖 Prepare book" sheet in the reader.

   Sits on top of book-builder.js and does only the picking: which verses,
   which commentaries, what the title page says. Kept apart from the builder
   so the builder stays a pure spec → HTML function that a server-side
   renderer can call later with no DOM at all.
   ========================================================================= */
(function () {
  'use strict';
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['book-ui.js'] = 'v1.0';

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function $(id) { return document.getElementById(id); }

  function availableCommentaries() {
    var meta = (window.stotraData && window.stotraData.metadata) || {};
    return meta.availableCommentaries || {};
  }

  function granthaTitle() {
    var meta = (window.stotraData && window.stotraData.metadata) || {};
    return meta.DisplayName || meta.displayName || meta.title || window.stotraCode || 'This text';
  }

  /* How many verses each source would contribute, worked out up front so the
     radio labels carry real numbers rather than making someone pick blind. */
  function counts() {
    var S = window.dgeBookSources;
    return {
      whole: S.whole().length,
      favourites: S.favourites().length,
      studied: S.studied().length
    };
  }

  window.dgeOpenBookBuilder = function () {
    if (!window.dgeMayPrepareBook()) {
      if (typeof showToast === 'function') {
        showToast('Preparing a book needs permission — ask an administrator to grant it.');
      }
      return;
    }
    if (!window.stotraData || !window.stotraData.shlokas) {
      if (typeof showToast === 'function') showToast('Open a grantha first, then prepare a book from it.');
      return;
    }
    var host = $('bookBuilderBody');
    if (!host) return;
    var c = counts();
    var comms = availableCommentaries();
    var ids = Object.keys(window.stotraData.shlokas).map(Number).filter(function (n) { return !isNaN(n); });
    var lo = ids.length ? Math.min.apply(null, ids) : 1;
    var hi = ids.length ? Math.max.apply(null, ids) : 1;

    host.innerHTML =
      '<div style="font-size:12px;color:var(--muted-text);margin:0 0 12px;">' +
      'Every page carries the Sarvamūla imprint and icon. The book opens in a new tab; ' +
      'use your browser’s <b>Save as PDF</b> from the print dialog there.</div>' +

      '<div class="dge-bb-group"><div class="dge-bb-label">Which verses</div>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSrc" value="whole" checked> ' +
        'The whole of ' + esc(granthaTitle()) + ' <span class="dge-bb-n">' + c.whole + '</span></label>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSrc" value="range"> A range ' +
        '<input type="number" id="bbFrom" value="' + lo + '" min="' + lo + '" max="' + hi + '" class="dge-bb-num"> to ' +
        '<input type="number" id="bbTo" value="' + hi + '" min="' + lo + '" max="' + hi + '" class="dge-bb-num"></label>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSrc" value="favourites"' + (c.favourites ? '' : ' disabled') + '> ' +
        'My starred verses <span class="dge-bb-n">' + c.favourites + '</span></label>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSrc" value="studied"' + (c.studied ? '' : ' disabled') + '> ' +
        'Verses I have marked as studied <span class="dge-bb-n">' + c.studied + '</span></label>' +
      '</div>' +

      '<div class="dge-bb-group"><div class="dge-bb-label">Commentaries to include</div>' +
      (Object.keys(comms).length
        ? Object.keys(comms).map(function (k) {
            return '<label class="dge-bb-row"><input type="checkbox" class="bbComm" value="' + esc(k) + '"> ' +
              esc(comms[k] || k) + '</label>';
          }).join('')
        : '<div class="dge-bb-row" style="opacity:.6">This text carries no commentary.</div>') +
      '<label class="dge-bb-row"><input type="checkbox" id="bbPada"> पदच्छेदः under each verse</label>' +
      '</div>' +

      '<div class="dge-bb-group"><div class="dge-bb-label">Title page</div>' +
      '<input class="dge-bb-in" id="bbTitle" placeholder="Title" value="' + esc(granthaTitle()) + '">' +
      '<input class="dge-bb-in" id="bbSubtitle" placeholder="Subtitle (optional)">' +
      '<input class="dge-bb-in" id="bbCompiler" placeholder="Compiled by (optional)">' +
      '<textarea class="dge-bb-in" id="bbDedication" rows="2" placeholder="Dedication (optional)"></textarea>' +
      '</div>' +

      '<div class="dge-bb-group"><div class="dge-bb-label">Format</div>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSize" value="a5" checked> A5 — book size</label>' +
      '<label class="dge-bb-row"><input type="radio" name="bbSize" value="a4"> A4 — reading copy</label>' +
      '<label class="dge-bb-row"><input type="checkbox" id="bbToc" checked> Table of contents</label>' +
      '<label class="dge-bb-row"><input type="checkbox" id="bbWatermark"> Diagonal watermark across every page ' +
        '<span class="dge-bb-hint">(for copies you would rather were not circulated)</span></label>' +
      '</div>' +

      '<button class="btn-sm" style="width:100%;margin-top:6px;" onclick="window.dgePrepareBookNow()">📖 Prepare</button>';

    if (typeof openModal === 'function') openModal('bookBuilderModal');
  };

  window.dgePrepareBookNow = function () {
    var srcEl = document.querySelector('input[name="bbSrc"]:checked');
    var src = srcEl ? srcEl.value : 'whole';
    var units;
    if (src === 'range') {
      units = window.dgeBookSources.range($('bbFrom') && $('bbFrom').value, $('bbTo') && $('bbTo').value);
    } else {
      units = window.dgeBookSources[src]();
    }
    if (!units.length) {
      if (typeof showToast === 'function') showToast('That selection has no verses in it.');
      return;
    }
    var sizeEl = document.querySelector('input[name="bbSize"]:checked');
    var spec = window.dgeBookDefaults();
    spec.title = ($('bbTitle') && $('bbTitle').value.trim()) || granthaTitle();
    spec.subtitle = ($('bbSubtitle') && $('bbSubtitle').value.trim()) || '';
    spec.compiler = ($('bbCompiler') && $('bbCompiler').value.trim()) || '';
    spec.dedication = ($('bbDedication') && $('bbDedication').value.trim()) || '';
    spec.pageSize = sizeEl ? sizeEl.value : 'a5';
    spec.toc = !!($('bbToc') && $('bbToc').checked);
    spec.watermark = !!($('bbWatermark') && $('bbWatermark').checked);
    spec.includePadaccheda = !!($('bbPada') && $('bbPada').checked);
    spec.includeCommentaries = Array.prototype.map.call(
      document.querySelectorAll('.bbComm:checked'), function (b) { return b.value; });

    var label = granthaTitle();
    if (src === 'range') label += ' · ' + $('bbFrom').value + '–' + $('bbTo').value;
    else if (src === 'favourites') label += ' · starred verses';
    else if (src === 'studied') label += ' · studied verses';
    spec.sections = [{ label: label, granthaSlug: window.currentGranthaSlug || '', units: units }];

    window.dgeOpenPreparedBook(spec, {
      commentaryNames: availableCommentaries(),
      // The generated document lives in about:blank, so its stylesheet and
      // icon have to be absolute — a relative href there resolves against
      // nothing and the book would print unstyled.
      baseUrl: new URL('.', window.location.href).href
    });
    if (typeof closeModal === 'function') closeModal('bookBuilderModal');
  };
})();
