// dge/convert/app.js — orchestration, window.DGE.App namespace
window.DGE = window.DGE || {};
window.DGE.App = (function () {
  const U = () => window.DGE.Utils;
  const IDB = () => window.DGE.IDB;
  const PDFMod = () => window.DGE.PDF;
  const VisionMod = () => window.DGE.Vision;
  const GeminiMod = () => window.DGE.Gemini;
  const RendererMod = () => window.DGE.Renderer;
  const GitHubMod = () => window.DGE.GitHub;
  const MapperMod = () => window.DGE.Mapper;

  const DEFAULT_CHUNK_SIZE = 8;

  let ocrPages = [];
  let finalJson = null;
  let currentFileKey = null;
  let cancelRequested = false;
  let proofreadCancelRequested = false;
  let currentMappedJson = null;
  let libraryCatalog = null; // fetched once, cached for the session

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

  function setPreviewLabel(msg) {
    const el = $('previewLabel');
    if (el) el.textContent = msg;
  }

  function ocrProgressKey() { return 'ocr_progress:' + currentFileKey; }
  function ocrDataKey() { return 'ocr_data:' + currentFileKey; }
  function proofreadDataKey() { return 'proofread_data:' + currentFileKey; }

  function getChunkSize() {
    const el = $('chunkSizeInput');
    const n = el ? parseInt(el.value, 10) : DEFAULT_CHUNK_SIZE;
    return (n && n > 0) ? n : DEFAULT_CHUNK_SIZE;
  }

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
    const chunkSizeEl = $('chunkSizeInput');
    if (chunkSizeEl) {
      chunkSizeEl.value = localStorage.getItem('gemini_chunk_size') || String(DEFAULT_CHUNK_SIZE);
      chunkSizeEl.addEventListener('input', () => localStorage.setItem('gemini_chunk_size', chunkSizeEl.value));
    }

    $('pdfFile').addEventListener('change', onFileSelected);
    $('runOcrBtn').addEventListener('click', () => runOcr(false));
    $('resumeBtn').addEventListener('click', () => runOcr(true));
    $('cancelBtn').addEventListener('click', () => {
      cancelRequested = true;
      log('Cancel requested — will stop after the current page finishes.');
    });
    $('proofreadBtn').addEventListener('click', runProofread);
    $('proofreadCancelBtn').addEventListener('click', () => {
      proofreadCancelRequested = true;
      log('Cancel requested — will stop after the current chunk finishes.');
    });
    $('clearProgressBtn').addEventListener('click', clearAllProgressForFile);
    $('previewRawBtn').addEventListener('click', () => {
      if (!ocrPages.length) return setError('No OCR data yet — run OCR first.');
      clearError();
      RendererMod().renderRawOcr(ocrPages, $('previewArea'));
      setPreviewLabel('Showing raw OCR text — untouched, before Gemini proofreading.');
    });
    $('previewProofreadBtn').addEventListener('click', () => {
      if (!finalJson) return setError('No proofread JSON yet — run Proofread first.');
      clearError();
      RendererMod().renderPreview(finalJson, $('previewArea'));
      setPreviewLabel('Showing Gemini-proofread text.');
    });
    $('downloadOcrBtn').addEventListener('click', () => {
      if (!ocrPages.length) return setError('No OCR data yet — run OCR first.');
      U().downloadJson({ pages: ocrPages }, 'ocr.json');
    });
    $('downloadFinalBtn').addEventListener('click', () => {
      if (!finalJson) return setError('No proofread JSON yet — run Proofread first.');
      U().downloadJson(finalJson, 'final.json');
    });

    const githubTokenEl = $('githubTokenInput');
    if (githubTokenEl) {
      githubTokenEl.value = GitHubMod().getToken();
      githubTokenEl.addEventListener('input', () => GitHubMod().setToken(githubTokenEl.value));
    }
    const targetSlugSelect = $('targetSlugSelect');
    if (targetSlugSelect) {
      targetSlugSelect.addEventListener('change', () => {
        $('targetSlugCustom').style.display = (targetSlugSelect.value === '__other__') ? 'block' : 'none';
      });
    }
    loadLibraryCatalog();

    $('buildSchemaBtn').addEventListener('click', buildSchemaPreview);
    $('pushToGithubBtn').addEventListener('click', pushToGithub);

    console.log('DGE Convert');
    console.log('Version', window.DGE_CONVERT_VERSION || '(unknown)');
    console.log('Build', window.DGE_CONVERT_BUILD || '(unknown)');
  }

  // Populates the target-grantha dropdown from the main app's own
  // data/library.json (fetched relative to this page, one level up) —
  // deliberately lists only NOT-yet-populated entries as the default,
  // safe targets, plus an "Other / new path" escape hatch for a grantha
  // not in the catalog yet.
  async function loadLibraryCatalog() {
    const select = $('targetSlugSelect');
    try {
      const res = await fetch('../data/library.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      libraryCatalog = await res.json();
      const granthas = (libraryCatalog && libraryCatalog.granthas) || [];
      const unpopulated = granthas.filter(g => !g.populated);
      let html = unpopulated.map(g => {
        const slug = g.path.replace(/^dge\//, '').replace(/^data\//, '').replace(/\/data\.json$/, '');
        return `<option value="${slug}">${slug}</option>`;
      }).join('');
      html += `<option value="__other__">Other / new path…</option>`;
      select.innerHTML = html;
    } catch (e) {
      log('Could not load the library catalog: ' + U().formatError(e) + ' — you can still type a path manually.');
      select.innerHTML = `<option value="__other__">Other / new path…</option>`;
      select.value = '__other__';
      $('targetSlugCustom').style.display = 'block';
    }
  }

  function getTargetSlug() {
    const select = $('targetSlugSelect');
    if (select && select.value && select.value !== '__other__') return select.value;
    const custom = $('targetSlugCustom');
    return custom ? custom.value.trim().replace(/^\/+|\/+$/g, '') : '';
  }

  function buildSchemaPreview() {
    clearError();
    if (!finalJson) return setError('No proofread JSON yet — run Proofread first.');
    const slug = getTargetSlug();
    if (!slug) return setError('Choose or type a target grantha path first.');

    const profile = {
      title: $('granthaTitleInput').value.trim(),
      author: $('granthaAuthorInput').value.trim(),
      slug: slug,
      commentaryKey: $('commentaryKeyInput').value.trim(),
      commentaryLabel: $('commentaryLabelInput').value.trim()
    };
    if (!profile.title) return setError('Enter a grantha title first — it\'s needed for the schema.');

    currentMappedJson = MapperMod().buildGranthaJson(finalJson, profile);
    RendererMod().renderSchemaMapEditable(currentMappedJson, $('schemaPreviewArea'));
    log(`Schema preview built for "${slug}" — ${Object.keys(currentMappedJson.shlokas).length} shloka(s). Review and edit below before pushing.`);
  }

  async function pushToGithub() {
    clearError();
    if (!currentMappedJson) return setError('Build the schema preview first.');
    const slug = getTargetSlug();
    if (!slug) return setError('Choose or type a target grantha path first.');
    if (!GitHubMod().getToken()) return setError('Paste your GitHub token above first.');

    const commentaryKey = $('commentaryKeyInput').value.trim();
    const editedShlokas = RendererMod().collectEditedShlokas($('schemaPreviewArea'), commentaryKey);

    const granthaJson = {
      metadata: Object.assign({}, currentMappedJson.metadata, { totalShlokas: Object.keys(editedShlokas).length }),
      shlokas: editedShlokas
    };
    const granthaPath = `dge/data/${slug}/data.json`;

    $('pushStatusText').textContent = 'Checking library catalog…';
    $('pushToGithubBtn').disabled = true;

    try {
      // Fetch library.json fresh right before pushing — not relying on
      // whatever was cached at page load, in case it changed meanwhile.
      const libText = await GitHubMod().getFileText('dge/data/library.json');
      const lib = JSON.parse(libText);
      const catalogPath = `dge/${granthaPath.replace(/^dge\//, '')}`;
      let entry = lib.granthas.find(g => g.path === catalogPath);

      if (entry && entry.populated) {
        const proceed = confirm(`"${slug}" already has content on GitHub. Push anyway and overwrite it?`);
        if (!proceed) { $('pushStatusText').textContent = 'Cancelled.'; return; }
      }

      if (entry) {
        entry.title = granthaJson.metadata.title;
        entry.populated = true;
      } else {
        lib.granthas.push({ path: catalogPath, title: granthaJson.metadata.title, populated: true });
      }

      $('pushStatusText').textContent = 'Pushing to GitHub…';
      const result = await GitHubMod().commitFiles(
        [
          { path: granthaPath, text: JSON.stringify(granthaJson, null, 2) },
          { path: 'dge/data/library.json', text: JSON.stringify(lib, null, 2) }
        ],
        `Add/update grantha "${slug}" via Convert — ${Object.keys(editedShlokas).length} shloka(s)`
      );

      if (result.uploaded === 0) {
        $('pushStatusText').textContent = 'Nothing to push — content already matched what\'s on GitHub.';
      } else {
        $('pushStatusText').textContent = `Pushed — ${result.uploaded} file(s) committed (${granthaPath} + library.json catalog entry).`;
      }
      log($('pushStatusText').textContent);
    } catch (e) {
      setError('Push failed: ' + U().formatError(e));
      $('pushStatusText').textContent = '';
    } finally {
      $('pushToGithubBtn').disabled = false;
    }
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
    setPreviewLabel('');
    $('logArea').textContent = '';
    $('resumeBar').style.display = 'none';
    $('proofreadResumeNote').textContent = '';

    try {
      log('Loading PDF…');
      const info = await PDFMod().loadPdf(file);
      log(`Loaded "${info.name}" — ${info.numPages} page(s).`);
      $('pageCountDisplay').textContent = info.numPages + ' page(s) detected';

      const savedOcrProgress = await IDB().get(ocrProgressKey());
      if (savedOcrProgress && savedOcrProgress.lastPage && savedOcrProgress.lastPage < info.numPages) {
        const resumeBar = $('resumeBar');
        resumeBar.style.display = 'block';
        $('resumeText').textContent = `Resume OCR from page ${savedOcrProgress.lastPage + 1}?`;
      }

      // Restore any OCR already done for this exact file in a previous
      // session, so Proofread and the raw preview both work without
      // re-running OCR.
      const savedOcrData = await IDB().get(ocrDataKey());
      if (savedOcrData && savedOcrData.pages && savedOcrData.pages.length) {
        ocrPages = savedOcrData.pages;
        log(`Restored ${ocrPages.length} previously-OCR'd page(s) from this device's storage.`);
      }

      const savedProofread = await IDB().get(proofreadDataKey());
      if (savedProofread && savedProofread.chunks) {
        const doneCount = Object.keys(savedProofread.chunks).length;
        if (doneCount) {
          $('proofreadResumeNote').textContent =
            `${doneCount} of ${savedProofread.totalChunks || '?'} proofread chunk(s) already saved for this file — tapping Proofread will resume from where it left off.`;
        }
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
      const saved = await IDB().get(ocrProgressKey());
      const savedData = await IDB().get(ocrDataKey());
      if (saved && saved.lastPage) {
        startPage = saved.lastPage + 1;
        ocrPages = (savedData && savedData.pages) || [];
        log('Resuming OCR from page ' + startPage + '.');
      }
    } else {
      ocrPages = [];
      await IDB().del(ocrProgressKey());
      await IDB().del(ocrDataKey());
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
        await IDB().set(ocrProgressKey(), { lastPage: p });
        await IDB().set(ocrDataKey(), { pages: ocrPages });
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
    if (ocrPages.length) {
      RendererMod().renderRawOcr(ocrPages, $('previewArea'));
      setPreviewLabel('Showing raw OCR text — untouched, before Gemini proofreading.');
    }
  }

  function buildChunks(pages, chunkSize) {
    const chunks = [];
    for (let i = 0; i < pages.length; i += chunkSize) {
      chunks.push(pages.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Proofreading is chunked (default 8 pages/request, adjustable) rather
  // than sent as one request for the whole book — a single giant request
  // is both far more likely to produce a malformed/truncated response and,
  // for anything book-length, will exceed Gemini's per-request token
  // limits outright. Each chunk's result is saved to IndexedDB the moment
  // it completes, so this function is naturally resumable: re-running it
  // (even after closing the tab) skips every already-done chunk and
  // continues from the first undone one — no separate "resume" button
  // needed for this part.
  async function runProofread() {
    clearError();
    proofreadCancelRequested = false;
    const geminiKey = $('geminiKey').value.trim();
    if (!geminiKey) return setError('Enter your Gemini API key first.');
    if (!ocrPages.length) return setError('Run OCR first — nothing to proofread yet.');

    const chunkSize = getChunkSize();
    const chunks = buildChunks(ocrPages, chunkSize);
    const totalChunks = chunks.length;

    let saved = await IDB().get(proofreadDataKey());
    if (!saved || saved.chunkSize !== chunkSize || saved.totalChunks !== totalChunks) {
      // Chunk size or page count changed since any earlier run — old
      // chunk boundaries no longer line up, so start clean instead of
      // silently mixing incompatible cached chunks.
      saved = { chunkSize, totalChunks, chunks: {} };
    }

    $('proofreadBtn').disabled = true;
    $('proofreadCancelBtn').style.display = 'inline-block';
    $('proofreadResumeNote').textContent = '';

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (proofreadCancelRequested) {
          log(`Proofreading stopped by user after chunk ${i} of ${totalChunks}. Progress is saved — tap Proofread again to resume.`);
          break;
        }
        if (saved.chunks[i]) continue; // already done previously — no API call

        const first = chunks[i][0].page, last = chunks[i][chunks[i].length - 1].page;
        $('progressText').textContent = `Proofreading chunk ${i + 1} / ${totalChunks} (pages ${first}–${last})…`;
        const ocrText = chunks[i].map(p => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
        try {
          const chunkResult = await GeminiMod().proofread(ocrText, geminiKey);
          saved.chunks[i] = chunkResult;
          await IDB().set(proofreadDataKey(), saved);
          log(`Chunk ${i + 1}/${totalChunks} (pages ${first}–${last}) proofread and saved.`);
        } catch (e) {
          setError(`Proofreading failed on chunk ${i + 1}/${totalChunks} (pages ${first}–${last}): ${U().formatError(e)} — earlier chunks are saved. Tap "Proofread with Gemini" again to resume from this chunk once fixed (try a smaller chunk size above if this keeps happening on the same chunk).`);
          return;
        }
      }

      const doneCount = Object.keys(saved.chunks).length;
      if (doneCount < totalChunks) {
        $('progressText').textContent = `Proofreading paused — ${doneCount} of ${totalChunks} chunk(s) done so far.`;
        return;
      }

      // All chunks done — merge in chunk order. Gemini re-starts its own
      // "number" field from scratch inside every chunk (it has no memory
      // of earlier chunks), so that field can repeat across the merged
      // result — kept as-is (it may reflect a real verse number printed
      // on the page) alongside a guaranteed-unique, guaranteed-ordered
      // "index" field for anything downstream that needs one.
      const mergedShlokas = [];
      let seq = 1;
      for (let i = 0; i < totalChunks; i++) {
        const c = saved.chunks[i];
        if (c && Array.isArray(c.shlokas)) {
          c.shlokas.forEach(s => mergedShlokas.push(Object.assign({ index: seq++ }, s)));
        }
      }
      finalJson = { shlokas: mergedShlokas };
      RendererMod().renderPreview(finalJson, $('previewArea'));
      setPreviewLabel('Showing Gemini-proofread text.');
      $('progressText').textContent = `Proofreading complete — ${totalChunks} chunk(s), ${mergedShlokas.length} entries.`;
      log('Proofreading complete — all chunks merged.');
    } finally {
      $('proofreadBtn').disabled = false;
      $('proofreadCancelBtn').style.display = 'none';
    }
  }

  async function clearAllProgressForFile() {
    if (!currentFileKey) return setError('No file loaded — nothing to clear.');
    if (!confirm('Clear all saved OCR and proofread progress for this file? This can\'t be undone — the next run starts over from page 1.')) return;
    await IDB().del(ocrProgressKey());
    await IDB().del(ocrDataKey());
    await IDB().del(proofreadDataKey());
    ocrPages = [];
    finalJson = null;
    $('previewArea').innerHTML = '';
    setPreviewLabel('');
    $('proofreadResumeNote').textContent = '';
    $('resumeBar').style.display = 'none';
    $('progressText').textContent = '';
    log('Cleared saved progress for this file.');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { runOcr, runProofread };
})();
