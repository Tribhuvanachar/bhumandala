// dge/convert/renderer.js — preview rendering, window.DGE.Renderer namespace
window.DGE = window.DGE || {};
window.DGE.Renderer = (function () {

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderPreview(dgeJson, containerEl) {
    if (!containerEl) return;
    if (!dgeJson || !Array.isArray(dgeJson.shlokas) || !dgeJson.shlokas.length) {
      containerEl.innerHTML = '<p>No shloka data to preview yet.</p>';
      return;
    }
    let html = '';
    dgeJson.shlokas.forEach(function (s) {
      html += '<div class="preview-shloka">';
      html += '<div class="preview-num">Shloka ' + (s.number != null ? s.number : (s.index != null ? s.index : '')) + '</div>';
      html += '<div class="preview-sa">' + escapeHtml(s.sa || '') + '</div>';
      if (s.commentary) {
        html += '<div class="preview-commentary">' + escapeHtml(s.commentary) + '</div>';
      }
      html += '</div>';
    });
    containerEl.innerHTML = html;
  }

  function renderRawOcr(ocrPages, containerEl) {
    if (!containerEl) return;
    if (!ocrPages || !ocrPages.length) {
      containerEl.innerHTML = '<p>No OCR data to preview yet.</p>';
      return;
    }
    let html = '';
    ocrPages.forEach(function (p) {
      html += '<div class="preview-raw-page">';
      html += '<div class="preview-num">Page ' + (p.page != null ? p.page : '') + '</div>';
      html += '<div class="preview-raw-text">' + escapeHtml(p.text || '(no text detected)') + '</div>';
      html += '</div>';
    });
    containerEl.innerHTML = html;
  }

  // Renders the mapped grantha schema as an EDITABLE table — one row per
  // shloka, Sanskrit and commentary each in their own textarea — so the
  // admin can fix anything before it's pushed to GitHub. Deliberately
  // editable rather than read-only: this is the last checkpoint before
  // content goes live.
  function renderSchemaMapEditable(mappedJson, containerEl) {
    if (!containerEl) return;
    const keys = Object.keys(mappedJson.shlokas || {}).sort((a, b) => Number(a) - Number(b));
    if (!keys.length) {
      containerEl.innerHTML = '<p>Nothing to preview — build the schema first.</p>';
      return;
    }
    let html = '';
    keys.forEach(function (k) {
      const s = mappedJson.shlokas[k];
      const cKeys = Object.keys(s.commentaries || {});
      const commentaryText = cKeys.length ? s.commentaries[cKeys[0]] : '';
      html += '<div class="schema-row" data-key="' + escapeHtml(k) + '">';
      html += '<div class="preview-num">Shloka ' + escapeHtml(k) + '</div>';
      html += '<label class="hint">Sanskrit</label>';
      html += '<textarea class="schema-sa-input" rows="2">' + escapeHtml(s.sa || '') + '</textarea>';
      html += '<label class="hint">Commentary</label>';
      html += '<textarea class="schema-commentary-input" rows="3">' + escapeHtml(commentaryText) + '</textarea>';
      html += '</div>';
    });
    containerEl.innerHTML = html;
  }

  // Reads the (possibly admin-edited) textareas back out of the DOM into
  // the real shlokas object shape — this is what actually gets pushed,
  // not the original un-edited mapper output.
  function collectEditedShlokas(containerEl, commentaryKey) {
    const rows = containerEl.querySelectorAll('.schema-row');
    const shlokas = {};
    rows.forEach(function (row) {
      const key = row.getAttribute('data-key');
      const sa = row.querySelector('.schema-sa-input').value;
      const commentary = row.querySelector('.schema-commentary-input').value;
      const commentaries = {};
      if (commentaryKey && commentary) commentaries[commentaryKey] = commentary;
      shlokas[key] = { sa: sa, commentaries: commentaries };
    });
    return shlokas;
  }

  return { renderPreview, renderRawOcr, renderSchemaMapEditable, collectEditedShlokas };
})();
