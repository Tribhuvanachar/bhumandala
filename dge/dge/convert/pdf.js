// dge/convert/pdf.js — PDF.js integration, window.DGE.PDF namespace.
// Deliberately renders ONE page at a time and lets the canvas be
// released immediately after — this app is primarily used on a phone,
// and holding many rendered canvases in memory simultaneously for a
// large scanned book is a real crash risk on mobile.
window.DGE = window.DGE || {};
window.DGE.PDF = (function () {
  let currentDoc = null;

  async function loadPdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js failed to load — check your internet connection and reload the page.');
    }
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (e) {
      throw new Error('Could not read the selected file.');
    }
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      currentDoc = await loadingTask.promise;
    } catch (e) {
      throw new Error('This doesn\'t look like a valid, readable PDF (it may be corrupted, password-protected, or a different file type): ' + (e.message || e));
    }
    return { numPages: currentDoc.numPages, name: file.name };
  }

  async function renderPageToPngBase64(pageNum, scale) {
    if (!currentDoc) throw new Error('No PDF loaded.');
    const page = await currentDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale || 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    const base64 = canvas.toDataURL('image/png').substring('data:image/png;base64,'.length);
    // Explicitly drop canvas dimensions to encourage prompt GC of the
    // (potentially large) pixel buffer before the next page renders.
    canvas.width = 0;
    canvas.height = 0;
    return base64;
  }

  function getPageCount() {
    return currentDoc ? currentDoc.numPages : 0;
  }

  return { loadPdf, renderPageToPngBase64, getPageCount };
})();
