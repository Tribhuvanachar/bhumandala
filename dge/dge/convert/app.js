// dge/convert/app.js — orchestration, window.DGE.App namespace
window.DGE = window.DGE || {};
window.DGE.App = (function () {
  const U = () => window.DGE.Utils;
  const PDFMod = () => window.DGE.PDF;
  const VisionMod = () => window.DGE.Vision;
  const GeminiMod = () => window.DGE.Gemini;
  const RendererMod = () => window.DGE.Renderer;

  let ocrPages = [];
  let finalJson = null;
  let currentFileKey = null;
  let cancelRequested = false;

  function $(id) { return document.getElementById(id); }

  function log(msg) {
    const el = $('logArea');
    if (el) el.textContent += msg + '\n';
    console.log('[DGE Convert]', msg);
  }

  function setError(msg) {
    const el = $('errorBox');
    if (el) { el.style.display = 'block'; el.textContent = '⚠ ' + msg; }
    log('ERROR: ' + msg);
  }

  function clearError() {
    const el = $('errorBox');
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  }

  function progressKey() { return 'dge_convert_progress_' + currentFileKey; }
  function ocrDataKey() { return 'dge_convert_ocrdata_' + currentFileKey; }

  function init() {
    const visionKeyEl = $('visionKey');
    const geminiKeyEl = $('geminiKey');
    if (visionKeyEl) {
      visionKeyEl.value = localStorage.getItem('vision_api_key') || '';
      visionKeyEl.addEventListener('input', () => localStorage.setItem('vision_api_key', visionKeyEl.value));
    }
    if (geminiKeyEl) {
      geminiKeyEl.value = localStorage.getItem('gemini_api_key') || '';
      geminiKeyEl.addEventListener('input', () => localStorage.setItem('gemini_api_key', geminiKeyEl.value));
    }

    $('pdfFile').addEventListener('change', onFileSelected);
    $('runOcrBtn').addEventListener('click', () => runOcr(false));
    $('resumeBtn').addEventListener('click', () => runOcr(true));
    $('cancelBtn').addEventListener('click', () => {
      cancelRequested = true;
      log('Cancel requested — will stop after the current page finishes.');
    });
    $('proofreadBtn').addEventListener('click', runProofread);
    $('downloadOcrBtn').addEventListener('click', () => {
      if (!ocrPages.length) return setError('No OCR data yet — run OCR first.');
      U().downloadJson({ pages: ocrPages }, 'ocr.json');
    });
    $('downloadFinalBtn').addEventListener('click', () => {
      if (!finalJson) return setError('No proofread JSON yet — run Proofread first.');
      U().downloadJson(finalJson, 'final.json');
    });

    console.log('DGE Convert');
    console.log('Version', window.DGE_CONVERT_VERSION || '(unknown)');
    console.log('Build', window.DGE_CONVERT_BUILD || '(unknown)');
  }

  async function onFileSelected(e) {
    clearError();
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('That doesn\'t look like a PDF file.');
      return;
    }

    currentFileKey = file.name + '_' + file.size;
    ocrPages = [];
    finalJson = null;
    $('previewArea').innerHTML = '';
    $('logArea').textContent = '';
    $('resumeBar').style.display = 'none';

    try {
      log('Loading PDF…');
      const info = await PDFMod().loadPdf(file);
      log(`Loaded "${info.name}" — ${info.numPages} page(s).`);
      $('pageCountDisplay').textContent = info.numPages + ' page(s) detected';

      const saved = U().loadProgress(progressKey());
      if (saved && saved.lastPage && saved.lastPage < info.numPages) {
        const resumeBar = $('resumeBar');
        resumeBar.style.display = 'block';
        $('resumeText').textContent = `Resume from page ${saved.lastPage + 1}?`;
      }
    } catch (e) {
      setError('Could not read this PDF: ' + U().formatError(e));
    }
  }

  async function runOcr(fromResume) {
    clearError();
    cancelRequested = false;
    const visionKey = $('visionKey').value.trim();
    if (!visionKey) return setError('Enter your Vision API key first.');

    const total = PDFMod().getPageCount();
    if (!total) return setError('Load a PDF first.');

    let startPage = 1;
    if (fromResume) {
      const saved = U().loadProgress(progressKey());
      const savedData = U().loadProgress(ocrDataKey());
      if (saved && saved.lastPage) {
        startPage = saved.lastPage + 1;
        ocrPages = (savedData && savedData.pages) || [];
        log('Resuming from page ' + startPage + '.');
      }
    } else {
      ocrPages = [];
      U().clearProgress(progressKey());
      U().clearProgress(ocrDataKey());
    }

    $('resumeBar').style.display = 'none';
    $('runOcrBtn').disabled = true;
    $('resumeBtn').disabled = true;

    for (let p = startPage; p <= total; p++) {
      if (cancelRequested) {
        log('Stopped by user after page ' + (p - 1) + '. Progress is saved — you can resume later.');
        break;
      }
      $('progressText').textContent = `Page ${p} / ${total}`;
      try {
        const base64 = await PDFMod().renderPageToPngBase64(p, 2.0);
        const text = await VisionMod().ocrImageBase64(base64, visionKey);
        ocrPages.push({ page: p, text: text });
        U().saveProgress(progressKey(), { lastPage: p });
        U().saveProgress(ocrDataKey(), { pages: ocrPages });
      } catch (e) {
        setError(`Failed on page ${p}: ${U().formatError(e)} — progress saved through page ${p - 1}. Fix the issue and tap Resume.`);
        $('runOcrBtn').disabled = false;
        $('resumeBtn').disabled = false;
        return;
      }
    }

    $('runOcrBtn').disabled = false;
    $('resumeBtn').disabled = false;
    $('progressText').textContent = `Done — ${ocrPages.length} of ${total} page(s) processed.`;
    log('OCR pass complete.');
  }

  async function runProofread() {
    clearError();
    const geminiKey = $('geminiKey').value.trim();
    if (!geminiKey) return setError('Enter your Gemini API key first.');
    if (!ocrPages.length) return setError('Run OCR first — nothing to proofread yet.');

    $('proofreadBtn').disabled = true;
    $('progressText').textContent = 'Proofreading with Gemini…';

    try {
      const ocrText = ocrPages.map(p => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
      finalJson = await GeminiMod().proofread(ocrText, geminiKey);
      RendererMod().renderPreview(finalJson, $('previewArea'));
      $('progressText').textContent = 'Proofreading complete — see preview below.';
      log('Proofreading complete.');
    } catch (e) {
      setError('Proofreading failed: ' + U().formatError(e) + ' (for a very long book, this single-request approach may need chunking — flag this if it happens).');
    } finally {
      $('proofreadBtn').disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { runOcr, runProofread };
})();
