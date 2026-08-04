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

  return { renderPreview, renderRawOcr };
})();
