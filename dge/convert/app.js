// dge/convert/app.js — orchestration, window.DGE.App namespace
window.DGE = window.DGE || {};
window.DGE.App = (function () {
  const U = () => window.DGE.Utils;
  const IDB = () => window.DGE.IDB;
  const VisionMod = () => window.DGE.Vision;
  const GeminiMod = () => window.DGE.Gemini;
  const RendererMod = () => window.DGE.Renderer;
  const GitHubMod = () => window.DGE.GitHub;
  const MapperMod = () => window.DGE.Mapper;
  const UrlImportMod = () => window.DGE.UrlImport;
  const LoadersMod = () => window.DGE.Loaders;

  const DEFAULT_CHUNK_SIZE = 8;

  let ocrPages = [];
  let finalJson = null;
  let currentFileKey = null;
  let currentLoader = null; // whichever loader (PDF/Image/…) is handling the current source — see loaders.js
  let cancelRequested = false;
  let proofreadCancelRequested = false;
  let currentMappedJson = null;
  let libraryCatalog = null; // fetched once, cached for the session
  let lastProofreadMissingPages = []; // pages in the current selection with no proofread text — checked before schema build
  let wakeLock = null;
  const KNOWN_FILES_KEY = 'convert_known_files';
  const RETRY_DELAYS_MS = [5000, 15000, 45000]; // 3 automatic retries beyond the first attempt

  function $(id) { return document.getElementById(id); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

  // Runs fn() with up to RETRY_DELAYS_MS.length extra automatic attempts on
  // failure (4 attempts total by default), waiting a bit longer each time —
  // covers a transient network blip or a brief rate-limit window without
  // making the user manually re-click for every single failure. If every
  // attempt fails, the last error is re-thrown so the caller's existing
  // give-up-and-log path runs unchanged. shouldAbort() is checked before
  // each attempt and during each backoff wait so Cancel still works.
  async function withAutoRetry(fn, label, shouldAbort) {
    let lastErr;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (shouldAbort && shouldAbort()) throw lastErr || new Error('Cancelled.');
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (attempt === RETRY_DELAYS_MS.length) break; // out of automatic retries
        const delaySec = Math.round(RETRY_DELAYS_MS[attempt] / 1000);
        log(`${label} failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}): ${U().formatError(e)} — retrying automatically in ${delaySec}s…`);
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    throw lastErr;
  }

  // Screen Wake Lock — held only while a run is actively in progress, to
  // stop the phone screen from auto-locking (the most common everyday cause
  // of a run getting backgrounded and frozen by the OS/browser). This can't
  // help if the user deliberately switches to another app — no page-level
  // API can prevent that — only against idle-timeout screen lock.
  async function acquireWakeLock() {
    if (wakeLock || !('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) {
      // Not fatal — commonly refused if the tab isn't focused at request
      // time, or unsupported entirely. The run continues either way.
    }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  // Small manifest of files with saved OCR/proofread progress on this
  // device, so a returning user can see what's resumable instead of having
  // to remember (or guess, or redo work) — see renderKnownFilesHint().
  // Bounded to the most recent 15 so it can't grow without limit.
  function updateKnownFilesManifest(name, ocrDone, ocrTotal) {
    if (!currentFileKey) return;
    let list;
    try { list = JSON.parse(localStorage.getItem(KNOWN_FILES_KEY)) || []; } catch (e) { list = []; }
    list = list.filter(f => f.key !== currentFileKey);
    list.unshift({ key: currentFileKey, name, ocrDone, ocrTotal, updatedAt: Date.now() });
    list = list.slice(0, 15);
    try { localStorage.setItem(KNOWN_FILES_KEY, JSON.stringify(list)); } catch (e) { /* storage full — non-fatal */ }
  }
  function renderKnownFilesHint() {
    const el = $('knownFilesHint');
    if (!el) return;
    let list;
    try { list = JSON.parse(localStorage.getItem(KNOWN_FILES_KEY)) || []; } catch (e) { list = []; }
    if (!list.length) { el.style.display = 'none'; return; }
    const rows = list.map(f => {
      const when = new Date(f.updatedAt).toLocaleString();
      return `• ${f.name} — ${f.ocrDone}/${f.ocrTotal} page(s) OCR'd (${when})`;
    }).join('<br>');
    el.innerHTML = `<b>Files with saved progress on this device</b> — choose the same file again below to resume without redoing it:<br>${rows}`;
    el.style.display = 'block';
  }

  function getChunkSize() {
    const el = $('chunkSizeInput');
    const n = el ? parseInt(el.value, 10) : DEFAULT_CHUNK_SIZE;
    return (n && n > 0) ? n : DEFAULT_CHUNK_SIZE;
  }

  // Blank means "use gemini.js's own default" — same convention as
  // getTargetSlug's custom-path fallback below.
  function getGeminiModel() {
    const el = $('geminiModelInput');
    const v = el ? el.value.trim() : '';
    return v || undefined;
  }

  // Returns the full sorted page-number list this run should cover.
  // Blank/unparseable input means "every page" (the existing, unchanged
  // default) — see U().parsePageSelection for exactly how the text is read.
  function getPageSelection(total) {
    const el = $('pageSelectionInput');
    const parsed = U().parsePageSelection(el ? el.value : '');
    if (parsed === null) return Array.from({ length: total }, (_, i) => i + 1);
    return parsed.filter(p => p >= 1 && p <= total);
  }

  function copyLogToClipboard() {
    const btn = $('copyLogBtn');
    const text = $('logArea').textContent;
    const done = () => { if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Log'; }, 2000); } };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => setError('Could not copy the log.'));
      return;
    }
    // Fallback for browsers/contexts without the async Clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-999999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { setError('Could not copy the log.'); }
    ta.remove();
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
    const geminiModelEl = $('geminiModelInput');
    if (geminiModelEl) {
      geminiModelEl.value = localStorage.getItem('gemini_model') || '';
      geminiModelEl.addEventListener('input', () => localStorage.setItem('gemini_model', geminiModelEl.value));
    }
    const chunkSizeEl = $('chunkSizeInput');
    if (chunkSizeEl) {
      chunkSizeEl.value = localStorage.getItem('gemini_chunk_size') || String(DEFAULT_CHUNK_SIZE);
      chunkSizeEl.addEventListener('input', () => localStorage.setItem('gemini_chunk_size', chunkSizeEl.value));
    }
    const pageSelectionEl = $('pageSelectionInput');
    if (pageSelectionEl) {
      pageSelectionEl.value = localStorage.getItem('convert_page_selection') || '';
      pageSelectionEl.addEventListener('input', () => localStorage.setItem('convert_page_selection', pageSelectionEl.value));
    }

    renderKnownFilesHint();

    // Asks the browser not to silently evict this origin's IndexedDB/
    // localStorage under storage pressure — without this, saved OCR/
    // proofread progress for a long book can disappear after enough idle
    // time, especially on mobile. Not guaranteed (the browser can still
    // refuse), but there's no downside to asking.
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        log(granted
          ? 'Persistent storage granted — saved progress is protected from automatic eviction.'
          : 'Persistent storage was not granted by the browser — saved progress could still be cleared under storage pressure.');
      }).catch(() => {});
    }

    $('pdfFile').addEventListener('change', onFileSelected);
    $('importUrlBtn').addEventListener('click', handleUrlImport);
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
    $('copyLogBtn').addEventListener('click', copyLogToClipboard);
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
    if (lastProofreadMissingPages.length) {
      const proceed = confirm(
        `⚠ Risky: ${lastProofreadMissingPages.length} selected page(s) have no proofread text — ` +
        `${lastProofreadMissingPages.join(', ')}.\n\n` +
        `Building the schema now will produce an incomplete text with those pages simply absent. ` +
        `Proceed anyway?`
      );
      if (!proceed) {
        log(`Schema build cancelled — ${lastProofreadMissingPages.length} page(s) still missing: ${lastProofreadMissingPages.join(', ')}.`);
        return;
      }
      log(`Proceeding with schema build despite ${lastProofreadMissingPages.length} missing page(s) (user confirmed).`);
    }
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
    const files = e.target.files;
    if (!files || !files.length) return;

    let detected;
    try {
      detected = LoadersMod().detect(files);
    } catch (err) {
      setError(err.message);
      e.target.value = ''; // clear the picker so the same fix-and-reselect works cleanly
      return;
    }
    currentLoader = detected.loader;

    // Multi-file-safe key: joins every selected file's name+size so a
    // different set of images (even same count) gets its own saved
    // progress instead of colliding with an unrelated prior selection.
    currentFileKey = Array.from(files).map(f => f.name + '_' + f.size).join('|');
    ocrPages = [];
    finalJson = null;
    lastProofreadMissingPages = [];
    $('previewArea').innerHTML = '';
    setPreviewLabel('');
    $('logArea').textContent = '';
    $('resumeBar').style.display = 'none';
    $('proofreadResumeNote').textContent = '';
    if ($('ocrGapsText')) $('ocrGapsText').textContent = '';
    if ($('proofreadGapsText')) $('proofreadGapsText').textContent = '';

    try {
      log(`Loading ${detected.typeLabel}…`);
      const info = await currentLoader.load(files);
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

      updateKnownFilesManifest(info.name, ocrPages.length, info.numPages);
      renderKnownFilesHint();
    } catch (e) {
      setError(`Could not read this ${detected.typeLabel}: ` + U().formatError(e));
    }
  }

  async function handleUrlImport() {
    clearError();
    const url = $('importUrlInput').value.trim();
    if (!url) return setError('Paste a page URL first.');

    $('importUrlBtn').disabled = true;
    try {
      log('Fetching "' + url + '"…');
      const { title, text } = await UrlImportMod().fetchPageText(url);

      // Same reset + state shape as a fresh PDF upload, so everything
      // downstream (chunked proofread, resumability, schema map, push)
      // behaves identically regardless of source.
      currentFileKey = 'url_' + title.replace(/[^a-zA-Z0-9_-]/g, '_');
      ocrPages = UrlImportMod().splitIntoPages(text);
      finalJson = null;
      lastProofreadMissingPages = [];
      $('previewArea').innerHTML = '';
      setPreviewLabel('');
      $('resumeBar').style.display = 'none';
      $('proofreadResumeNote').textContent = '';
      if ($('ocrGapsText')) $('ocrGapsText').textContent = '';
      if ($('proofreadGapsText')) $('proofreadGapsText').textContent = '';

      await IDB().set(ocrDataKey(), { pages: ocrPages });
      await IDB().set(ocrProgressKey(), { lastPage: ocrPages.length });

      $('pageCountDisplay').textContent = `Fetched "${title}" — ${text.length.toLocaleString()} character(s), split into ${ocrPages.length} chunk(s) for proofreading.`;
      log(`Fetched "${title}" successfully — ${ocrPages.length} chunk(s) prepared. Ready for step 3 (Proofread) — no OCR needed.`);
      RendererMod().renderRawOcr(ocrPages, $('previewArea'));
      setPreviewLabel('Showing fetched page text — untouched, before Gemini proofreading.');
    } catch (e) {
      setError('Import failed: ' + U().formatError(e));
    } finally {
      $('importUrlBtn').disabled = false;
    }
  }
  async function runOcr(fromResume) {
    clearError();
    cancelRequested = false;
    const visionKey = $('visionKey').value.trim();
    if (!visionKey) return setError('Enter your Vision API key first.');

    if (!currentLoader) return setError('Load a PDF or image(s) first.');
    const total = currentLoader.getPageCount();
    if (!total) return setError('Load a PDF or image(s) first.');

    const selectedPages = getPageSelection(total);
    if (!selectedPages.length) return setError('The page selection above doesn\'t match any real page — check it or clear it to process all pages.');

    let startIdx = 0;
    if (fromResume) {
      const saved = await IDB().get(ocrProgressKey());
      const savedData = await IDB().get(ocrDataKey());
      if (saved && saved.lastPage) {
        // Position within the (possibly narrowed) selection, not a raw
        // page number — findIndex relies on selectedPages being sorted
        // ascending, which parsePageSelection guarantees.
        const idx = selectedPages.findIndex(p => p > saved.lastPage);
        startIdx = idx === -1 ? selectedPages.length : idx;
        ocrPages = (savedData && savedData.pages) || [];
        log(`Resuming OCR — ${startIdx} of ${selectedPages.length} selected page(s) already done.`);
      }
    } else {
      ocrPages = [];
      await IDB().del(ocrProgressKey());
      await IDB().del(ocrDataKey());
    }

    $('resumeBar').style.display = 'none';
    $('runOcrBtn').disabled = true;
    $('resumeBtn').disabled = true;
    await acquireWakeLock();

    for (let i = startIdx; i < selectedPages.length; i++) {
      const p = selectedPages[i];
      if (cancelRequested) {
        log(`Stopped by user after ${i} of ${selectedPages.length} selected page(s). Progress is saved — you can resume later.`);
        break;
      }
      $('progressText').textContent = `Page ${p} (${i + 1} / ${selectedPages.length} selected)`;
      try {
        const pageObj = await currentLoader.getPageImage(p);
        const text = await withAutoRetry(
          () => VisionMod().ocrImageBase64(pageObj.imageBase64, visionKey),
          `OCR on page ${p}`,
          () => cancelRequested
        );
        ocrPages.push({ page: p, text: text });
        await IDB().set(ocrProgressKey(), { lastPage: p });
        await IDB().set(ocrDataKey(), { pages: ocrPages });
        updateKnownFilesManifest(currentLoader.getDocumentName(), ocrPages.length, total);
      } catch (e) {
        setError(`Failed on page ${p} after ${RETRY_DELAYS_MS.length + 1} attempts: ${U().formatError(e)} — progress saved through the pages already done. Fix the issue and tap Resume.`);
        $('runOcrBtn').disabled = false;
        $('resumeBtn').disabled = false;
        releaseWakeLock();
        return;
      }
    }

    $('runOcrBtn').disabled = false;
    $('resumeBtn').disabled = false;
    releaseWakeLock();
    $('progressText').textContent = `Done — ${ocrPages.length} of ${selectedPages.length} selected page(s) processed.`;
    log('OCR pass complete.');
    renderKnownFilesHint();

    const ocrPageNums = new Set(ocrPages.map(p => p.page));
    const missing = selectedPages.filter(p => !ocrPageNums.has(p));
    const gapsEl = $('ocrGapsText');
    if (gapsEl) gapsEl.textContent = missing.length ? `⚠ ${missing.length} selected page(s) have no OCR text: ${missing.join(', ')}` : '';
    if (missing.length) log(`⚠ ${missing.length} selected page(s) still missing OCR text: ${missing.join(', ')}`);

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
  // Selected pages that end up with no proofread text — either because
  // they never got OCR text in the first place, or because the chunk
  // covering them hasn't completed successfully yet. Chunk granularity is
  // the finest we can track: Gemini's per-shloka output carries a verse
  // "number", not a source page, so a failed/incomplete chunk marks every
  // page it covers as missing, not just whichever page actually caused it.
  function updateProofreadGaps(chunks, savedChunks, ocrGapPages) {
    const chunkMissing = [];
    for (let i = 0; i < chunks.length; i++) {
      if (!savedChunks[i]) chunks[i].forEach(p => chunkMissing.push(p.page));
    }
    lastProofreadMissingPages = Array.from(new Set(ocrGapPages.concat(chunkMissing))).sort((a, b) => a - b);
    const el = $('proofreadGapsText');
    if (el) {
      el.textContent = lastProofreadMissingPages.length
        ? `⚠ ${lastProofreadMissingPages.length} selected page(s) will be missing from the proofread result: ${lastProofreadMissingPages.join(', ')}`
        : '';
    }
  }

  async function runProofread() {
    clearError();
    proofreadCancelRequested = false;
    const geminiKey = $('geminiKey').value.trim();
    if (!geminiKey) return setError('Enter your Gemini API key first.');
    if (!ocrPages.length) return setError('Run OCR first — nothing to proofread yet.');

    // Scope to the same page selection used for OCR (step 2) — narrowing
    // that box narrows this step too, per the same input.
    const pageSelectionEl = $('pageSelectionInput');
    const parsedSelection = U().parsePageSelection(pageSelectionEl ? pageSelectionEl.value : '');
    const selectedOcrPages = parsedSelection === null ? ocrPages : ocrPages.filter(p => parsedSelection.includes(p.page));
    if (!selectedOcrPages.length) return setError('The page selection above doesn\'t match any OCR\'d page — check it or clear it to proofread all pages.');
    const ocrGapPages = parsedSelection === null ? [] : parsedSelection.filter(p => !ocrPages.some(op => op.page === p));

    const chunkSize = getChunkSize();
    const chunks = buildChunks(selectedOcrPages, chunkSize);
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
    await acquireWakeLock();

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
          const chunkResult = await withAutoRetry(
            () => GeminiMod().proofread(ocrText, geminiKey, getGeminiModel()),
            `Proofreading chunk ${i + 1}/${totalChunks}`,
            () => proofreadCancelRequested
          );
          saved.chunks[i] = chunkResult;
          await IDB().set(proofreadDataKey(), saved);
          log(`Chunk ${i + 1}/${totalChunks} (pages ${first}–${last}) proofread and saved.`);
        } catch (e) {
          setError(`Proofreading failed on chunk ${i + 1}/${totalChunks} (pages ${first}–${last}) after ${RETRY_DELAYS_MS.length + 1} attempts: ${U().formatError(e)} — earlier chunks are saved, manual intervention needed. Tap "Proofread with Gemini" again to resume from this chunk once fixed (try a smaller chunk size above if this keeps happening on the same chunk).`);
          updateProofreadGaps(chunks, saved.chunks, ocrGapPages);
          return;
        }
      }

      const doneCount = Object.keys(saved.chunks).length;
      updateProofreadGaps(chunks, saved.chunks, ocrGapPages);
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
      log('Proofreading complete — all chunks merged.' + (lastProofreadMissingPages.length ? ` ⚠ ${lastProofreadMissingPages.length} selected page(s) missing: ${lastProofreadMissingPages.join(', ')}.` : ''));
    } finally {
      $('proofreadBtn').disabled = false;
      $('proofreadCancelBtn').style.display = 'none';
      releaseWakeLock();
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
    lastProofreadMissingPages = [];
    $('previewArea').innerHTML = '';
    setPreviewLabel('');
    $('proofreadResumeNote').textContent = '';
    $('resumeBar').style.display = 'none';
    $('progressText').textContent = '';
    if ($('ocrGapsText')) $('ocrGapsText').textContent = '';
    if ($('proofreadGapsText')) $('proofreadGapsText').textContent = '';
    let list;
    try { list = JSON.parse(localStorage.getItem(KNOWN_FILES_KEY)) || []; } catch (e) { list = []; }
    list = list.filter(f => f.key !== currentFileKey);
    try { localStorage.setItem(KNOWN_FILES_KEY, JSON.stringify(list)); } catch (e) { /* storage full — non-fatal */ }
    renderKnownFilesHint();
    log('Cleared saved progress for this file.');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { runOcr, runProofread };
})();
