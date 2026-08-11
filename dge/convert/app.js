// dge/convert/app.js — orchestration, window.DGE.App namespace
window.DGE = window.DGE || {};
window.DGE.App = (function () {
  const U = () => window.DGE.Utils;
  const IDB = () => window.DGE.IDB;
  const VisionMod = () => window.DGE.Vision;
  const TesseractCheckMod = () => window.DGE.TesseractCheck;
  const ReviewClassifierMod = () => window.DGE.ReviewClassifier;
  const ReviewUIMod = () => window.DGE.ReviewUI;
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
  // A 429/RESOURCE_EXHAUSTED is a per-minute (or per-day) rate window, not a
  // transient blip — retrying after 5s almost always just hits the same
  // window again. Give it real room: 65s clears a per-minute cap outright;
  // if it's still failing after that, it's more likely a per-day cap or a
  // genuinely-exhausted balance, which no amount of waiting fixes, so the
  // schedule still gives up after the same number of attempts as any other
  // error rather than retrying forever.
  const QUOTA_RETRY_DELAYS_MS = [65000, 90000, 120000];

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
        const isQuota = e && e.kind === 'quota';
        const delayMs = isQuota ? QUOTA_RETRY_DELAYS_MS[attempt] : RETRY_DELAYS_MS[attempt];
        const delaySec = Math.round(delayMs / 1000);
        log(`${label} failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}): ${U().formatError(e)} — retrying automatically in ${delaySec}s${isQuota ? ' (rate-limit backoff — this is a per-minute/per-day cap on your key, not your prepaid balance)' : ''}…`);
        await sleep(delayMs);
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
    el.innerHTML = '';
    const label = document.createElement('div');
    label.innerHTML = '<b>Files with saved progress on this device</b> — tap one to resume Proofread/Review/Push on what\'s already OCR\'d, without re-uploading. Re-selecting the actual file below is still needed only if you want to OCR additional new pages.';
    el.appendChild(label);
    list.forEach(f => {
      const when = new Date(f.updatedAt).toLocaleString();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'known-file-btn';
      btn.textContent = `${f.name} — ${f.ocrDone}/${f.ocrTotal} page(s) OCR'd (${when})`;
      btn.addEventListener('click', () => resumeFromKnownFile(f.key));
      el.appendChild(btn);
    });
    el.style.display = 'block';
  }

  // Loads a previously-saved file's OCR/proofread progress directly from
  // this device's storage, without needing the original file re-selected —
  // possible because ocrPages/proofread chunks are looked up purely by
  // currentFileKey (name_size), and runProofread() only ever reads
  // ocrPages, never the actual File object. Only OCR'ing genuinely NEW
  // pages still needs the real file (to render page images), which this
  // can't provide — made explicit in the log line below rather than left
  // to guesswork.
  async function resumeFromKnownFile(key) {
    clearError();
    let list;
    try { list = JSON.parse(localStorage.getItem(KNOWN_FILES_KEY)) || []; } catch (e) { list = []; }
    const entry = list.find(f => f.key === key);
    if (!entry) return;

    currentFileKey = key;
    currentLoader = null;
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
    if ($('reviewSummary')) $('reviewSummary').textContent = 'Run Proofread first.';
    if ($('reviewDetailArea')) $('reviewDetailArea').innerHTML = '';

    const savedOcrData = await IDB().get(ocrDataKey());
    if (savedOcrData && savedOcrData.pages && savedOcrData.pages.length) {
      ocrPages = savedOcrData.pages;
    }
    $('pageCountDisplay').textContent = `${entry.name} — ${ocrPages.length}/${entry.ocrTotal || '?'} page(s) OCR'd (loaded from saved progress, no file re-selected).`;
    log(`Loaded ${ocrPages.length} previously-OCR'd page(s) for "${entry.name}" without re-selecting the file — Proofread/Review/Push are ready to use. To OCR additional new pages for this file, re-select it above first.`);

    const savedProofread = await IDB().get(proofreadDataKey());
    if (savedProofread && savedProofread.chunks) {
      const doneCount = Object.keys(savedProofread.chunks).length;
      if (doneCount) {
        $('proofreadResumeNote').textContent =
          `${doneCount} of ${savedProofread.totalChunks || '?'} proofread chunk(s) already saved for this file — tapping Proofread will resume from where it left off.`;
      }
    }
  }

  function getChunkSize() {
    const el = $('chunkSizeInput');
    const n = el ? parseInt(el.value, 10) : DEFAULT_CHUNK_SIZE;
    return (n && n > 0) ? n : DEFAULT_CHUNK_SIZE;
  }

  // Proactive spacing between successful chunks, on top of (not instead of)
  // the reactive backoff above -- a burst of back-to-back requests can trip
  // a per-minute rate cap even when every individual request would have
  // succeeded on its own. Default 3s; 0 disables it for anyone who's sure
  // their tier can take it.
  const DEFAULT_CHUNK_DELAY_SEC = 3;
  function getChunkDelayMs() {
    const el = $('chunkDelayInput');
    const n = el ? parseFloat(el.value) : DEFAULT_CHUNK_DELAY_SEC;
    return (Number.isFinite(n) && n >= 0) ? Math.min(n, 60) * 1000 : DEFAULT_CHUNK_DELAY_SEC * 1000;
  }

  // Blank means "use gemini.js's own default" — same convention as
  // getTargetSlug's custom-path fallback below. "__custom__" in the select
  // means the model isn't in the fetched list (or the list was never
  // fetched) — fall through to the free-text field next to it.
  function getGeminiModel() {
    const sel = $('geminiModelSelect');
    const v = sel ? sel.value.trim() : '';
    if (v === '__custom__') {
      const customEl = $('geminiModelCustom');
      const cv = customEl ? customEl.value.trim() : '';
      return cv || undefined;
    }
    return v || undefined;
  }

  const GEMINI_MODELS_CACHE_KEY = 'gemini_models_cache'; // { keyFingerprint, ts, models: [{id,displayName}] }

  // Cheap non-cryptographic fingerprint so the cache is scoped to "this API
  // key" without storing the raw key a second time anywhere (it's already
  // in 'gemini_api_key' by itself) — good enough to detect "the user pasted
  // a different key" and refetch, not intended as a security boundary.
  function keyFingerprint(k) {
    let h = 0;
    for (let i = 0; i < k.length; i++) { h = (h * 31 + k.charCodeAt(i)) | 0; }
    return String(h);
  }

  function populateModelSelect(models) {
    const sel = $('geminiModelSelect');
    if (!sel) return;
    const prevValue = sel.value;
    sel.innerHTML = '<option value="">(default)</option>';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.displayName && m.displayName !== m.id ? `${m.displayName} (${m.id})` : m.id;
      sel.appendChild(opt);
    });
    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = 'Other (type below)…';
    sel.appendChild(customOpt);
    // Restore whatever was selected before, if it still exists in the new list.
    if (prevValue && Array.from(sel.options).some(o => o.value === prevValue)) sel.value = prevValue;
  }

  async function refreshGeminiModels() {
    const apiKey = $('geminiKey') ? $('geminiKey').value.trim() : '';
    if (!apiKey) { $('modelsHint').textContent = 'Enter your Gemini API key above first.'; return; }
    $('refreshModelsBtn').disabled = true;
    $('modelsHint').textContent = 'Loading available models…';
    try {
      const models = await GeminiMod().listModels(apiKey);
      populateModelSelect(models);
      const cache = { keyFingerprint: keyFingerprint(apiKey), ts: Date.now(), models };
      try { localStorage.setItem(GEMINI_MODELS_CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* storage full — non-fatal */ }
      $('modelsHint').textContent = `${models.length} model(s) available to this key, loaded just now.`;
    } catch (e) {
      $('modelsHint').textContent = 'Could not load models: ' + U().formatError(e) + ' — you can still type a model name below manually.';
    } finally {
      $('refreshModelsBtn').disabled = false;
    }
  }

  function initGeminiModelPicker() {
    const sel = $('geminiModelSelect');
    const customEl = $('geminiModelCustom');
    if (!sel) return;
    sel.addEventListener('change', () => {
      customEl.style.display = sel.value === '__custom__' ? 'block' : 'none';
      localStorage.setItem('gemini_model_select', sel.value);
    });
    if (customEl) {
      customEl.value = localStorage.getItem('gemini_model_custom') || '';
      customEl.addEventListener('input', () => localStorage.setItem('gemini_model_custom', customEl.value));
    }
    $('refreshModelsBtn').addEventListener('click', refreshGeminiModels);

    // Restore a cached list from the last time this exact key was used, so
    // a returning user sees real model names immediately without an extra
    // API call — refetch is one tap away if they want a fresh list.
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    try {
      const cache = JSON.parse(localStorage.getItem(GEMINI_MODELS_CACHE_KEY) || 'null');
      if (cache && apiKey && cache.keyFingerprint === keyFingerprint(apiKey) && Array.isArray(cache.models)) {
        populateModelSelect(cache.models);
        const savedSelect = localStorage.getItem('gemini_model_select');
        if (savedSelect) sel.value = savedSelect;
        if (customEl) customEl.style.display = sel.value === '__custom__' ? 'block' : 'none';
        $('modelsHint').textContent = `${cache.models.length} model(s) from a cached list (loaded ${new Date(cache.ts).toLocaleString()}) — tap "Load available models" for a fresh one.`;
      }
    } catch (e) { /* ignore a corrupt cache */ }
  }

  // Comma-separated BCP-47/ISO language codes (e.g. "kn" or "kn,sa") to bias
  // Vision's script/language detection — blank means auto-detect, unchanged
  // default. Matters most for Kannada and other scripts that can otherwise
  // get misdetected, especially on pages mixing Sanskrit-in-Kannada-script
  // with plain Kannada.
  function getLanguageHints() {
    const el = $('languageHintsInput');
    const v = el ? el.value.trim() : '';
    return v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  }

  // Quick-pick chips beside the language-hint field — one-tap toggle for
  // the codes this project's texts actually use, so nobody has to
  // remember/look up a BCP-47 code before running OCR.
  const LANG_CHIPS = [
    { code: 'sa', label: 'Sanskrit' }, { code: 'kn', label: 'Kannada' },
    { code: 'te', label: 'Telugu' }, { code: 'ta', label: 'Tamil' },
    { code: 'ml', label: 'Malayalam' }, { code: 'bn', label: 'Bengali' },
    { code: 'hi', label: 'Hindi' }, { code: 'en', label: 'English' }
  ];
  function renderLangChips() {
    const row = $('langChipRow');
    const input = $('languageHintsInput');
    if (!row || !input) return;
    row.innerHTML = '';
    LANG_CHIPS.forEach(({ code, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-chip';
      btn.textContent = `${label} (${code})`;
      btn.dataset.code = code;
      btn.addEventListener('click', () => {
        const codes = input.value.split(',').map(s => s.trim()).filter(Boolean);
        const idx = codes.indexOf(code);
        if (idx >= 0) codes.splice(idx, 1); else codes.push(code);
        input.value = codes.join(',');
        localStorage.setItem('vision_language_hints', input.value);
        syncLangChips();
      });
      row.appendChild(btn);
    });
    syncLangChips();
  }
  function syncLangChips() {
    const row = $('langChipRow');
    const input = $('languageHintsInput');
    if (!row || !input) return;
    const codes = input.value.split(',').map(s => s.trim()).filter(Boolean);
    row.querySelectorAll('.lang-chip').forEach(btn => {
      btn.classList.toggle('on', codes.includes(btn.dataset.code));
    });
  }

  // 'vision' | 'tesseract' | 'both' — replaces the old crossCheckEnabled
  // boolean so "Tesseract only" (skip Vision entirely, no API key needed)
  // is a real first-class option, not just a checkbox bolted onto Vision.
  function getOcrEngine() {
    const el = $('ocrEngineSelect');
    return (el && el.value) || 'vision';
  }

  // Optional free-text context anchor (e.g. "Bhagavad Gita Chapter 1,
  // Bhavadipa commentary") passed to Gemini so it can resolve ambiguous
  // OCR errors using real context. Blank = same prompt as always.
  function getProofreadContext() {
    const el = $('proofreadContextInput');
    const v = el ? el.value.trim() : '';
    return v || undefined;
  }

  function getReadingOrderFix() {
    const el = $('readingOrderFix');
    return !!(el && el.checked);
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
    initGeminiModelPicker();
    const languageHintsEl = $('languageHintsInput');
    if (languageHintsEl) {
      languageHintsEl.value = localStorage.getItem('vision_language_hints') || '';
      languageHintsEl.addEventListener('input', () => {
        localStorage.setItem('vision_language_hints', languageHintsEl.value);
        syncLangChips();
      });
    }
    renderLangChips();
    const chunkDelayEl = $('chunkDelayInput');
    if (chunkDelayEl) {
      chunkDelayEl.value = localStorage.getItem('gemini_chunk_delay_sec') || '3';
      chunkDelayEl.addEventListener('input', () => localStorage.setItem('gemini_chunk_delay_sec', chunkDelayEl.value));
    }
    const proofreadContextEl = $('proofreadContextInput');
    if (proofreadContextEl) {
      proofreadContextEl.value = localStorage.getItem('convert_proofread_context') || '';
      proofreadContextEl.addEventListener('input', () => localStorage.setItem('convert_proofread_context', proofreadContextEl.value));
    }
    const ocrEngineEl = $('ocrEngineSelect');
    if (ocrEngineEl) {
      ocrEngineEl.value = localStorage.getItem('convert_ocr_engine') || 'vision';
      ocrEngineEl.addEventListener('change', () => localStorage.setItem('convert_ocr_engine', ocrEngineEl.value));
    }
    const readingOrderEl = $('readingOrderFix');
    if (readingOrderEl) {
      readingOrderEl.checked = localStorage.getItem('convert_reading_order_fix') === 'true';
      readingOrderEl.addEventListener('change', () => localStorage.setItem('convert_reading_order_fix', readingOrderEl.checked));
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
    const targetSlugSearchEl = $('targetSlugSearch');
    if (targetSlugSearchEl) {
      targetSlugSearchEl.addEventListener('input', () => renderTargetSlugResults(targetSlugSearchEl.value));
      targetSlugSearchEl.addEventListener('focus', () => renderTargetSlugResults(targetSlugSearchEl.value));
    }
    const targetSlugUseOtherEl = $('targetSlugUseOther');
    if (targetSlugUseOtherEl) {
      targetSlugUseOtherEl.addEventListener('click', () => {
        chosenTargetSlug = '';
        $('targetSlugResults').style.display = 'none';
        $('targetSlugChosen').style.display = 'none';
        $('targetSlugCustom').style.display = 'block';
        $('targetSlugCustom').focus();
      });
    }
    loadLibraryCatalog();

    $('openReviewBtn').addEventListener('click', () => {
      ReviewUIMod().open($('reviewDetailArea'), $('reviewIncludeC').checked, () => ReviewUIMod().renderSummary($('reviewSummary')));
    });

    $('buildSchemaBtn').addEventListener('click', buildSchemaPreview);
    $('pushToGithubBtn').addEventListener('click', pushToGithub);

    console.log('DGE Convert');
    console.log('Version', window.DGE_CONVERT_VERSION || '(unknown)');
    console.log('Build', window.DGE_CONVERT_BUILD || '(unknown)');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // {slug, title} for every not-yet-populated catalog entry — built once
  // from library.json, then filtered client-side as the admin types. A
  // flat hundreds-of-entries <select> (the previous approach) is unusable
  // once the catalog has more than a screenful of grantha slugs in it.
  let targetSlugEntries = [];
  let chosenTargetSlug = '';

  async function loadLibraryCatalog() {
    const searchEl = $('targetSlugSearch');
    try {
      const res = await fetch('../data/library.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      libraryCatalog = await res.json();
      const granthas = (libraryCatalog && libraryCatalog.granthas) || [];
      targetSlugEntries = granthas.filter(g => !g.populated).map(g => ({
        slug: g.path.replace(/^dge\//, '').replace(/^data\//, '').replace(/\/data\.json$/, ''),
        title: g.title || ''
      }));
      if (searchEl) searchEl.placeholder = `Type to search ${targetSlugEntries.length} unpopulated grantha(s) — e.g. "yajurveda" or "grihyasutra"…`;
    } catch (e) {
      log('Could not load the library catalog: ' + U().formatError(e) + ' — you can still type a path manually.');
      targetSlugEntries = [];
      if (searchEl) searchEl.placeholder = 'Catalog failed to load — use "Use a path not in the catalog" below.';
    }
  }

  const MAX_TARGET_SLUG_RESULTS = 40;

  function renderTargetSlugResults(query) {
    const resultsEl = $('targetSlugResults');
    if (!resultsEl) return;
    const q = String(query || '').trim().toLowerCase();
    if (!q) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; return; }
    const matches = targetSlugEntries.filter(e =>
      e.slug.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    ).slice(0, MAX_TARGET_SLUG_RESULTS);
    if (!matches.length) {
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = '<div class="target-slug-result">No catalog match — try a different term, or "Use a path not in the catalog" below.</div>';
      return;
    }
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = matches.map(e => {
      const crumb = e.slug.split('/').map(escapeHtml).join('<span class="sep">›</span>');
      return `<div class="target-slug-result" data-slug="${escapeHtml(e.slug)}" tabindex="0">` +
        `<div class="target-slug-result-title">${escapeHtml(e.title || e.slug)}</div>` +
        `<div class="target-slug-result-path">${crumb}</div></div>`;
    }).join('');
    resultsEl.querySelectorAll('.target-slug-result[data-slug]').forEach(row => {
      row.addEventListener('click', () => pickTargetSlug(row.getAttribute('data-slug')));
    });
  }

  function pickTargetSlug(slug) {
    const entry = targetSlugEntries.find(e => e.slug === slug);
    chosenTargetSlug = slug;
    $('targetSlugSearch').value = '';
    $('targetSlugResults').style.display = 'none';
    $('targetSlugCustom').style.display = 'none';
    const chosenEl = $('targetSlugChosen');
    const crumb = slug.split('/').map(escapeHtml).join('<span class="sep">›</span>');
    chosenEl.innerHTML = `<div class="target-slug-chosen-box">Selected: <strong>${escapeHtml((entry && entry.title) || slug)}</strong><br>` +
      `<span class="target-slug-result-path">${crumb}</span> ` +
      `<button type="button" id="targetSlugClearBtn" style="margin-left:6px;">Change</button></div>`;
    chosenEl.style.display = 'block';
    $('targetSlugClearBtn').addEventListener('click', () => {
      chosenTargetSlug = '';
      chosenEl.style.display = 'none';
      $('targetSlugSearch').focus();
    });
  }

  function getTargetSlug() {
    if (chosenTargetSlug) return chosenTargetSlug;
    const custom = $('targetSlugCustom');
    return custom ? custom.value.trim().replace(/^\/+|\/+$/g, '') : '';
  }

  function buildSchemaPreview() {
    clearError();
    if (!finalJson) return setError('No proofread JSON yet — run Proofread first.');
    const reviewSummary = ReviewUIMod().summary();
    const unreviewed = reviewSummary.flaggedTotal - reviewSummary.flaggedReviewed;
    if (unreviewed > 0) {
      const proceed = confirm(
        `⚠ Risky: ${unreviewed} unit(s) are flagged (class C/D/E) with no recorded human decision yet.\n\n` +
        `Building the schema now uses Gemini's text for those as-is, unreviewed. Use "4. Review Flagged Units" ` +
        `above first if you want to check them, or proceed anyway.`
      );
      if (!proceed) {
        log(`Schema build cancelled — ${unreviewed} flagged unit(s) still unreviewed.`);
        return;
      }
      log(`Proceeding with schema build despite ${unreviewed} unreviewed flagged unit(s) (user confirmed).`);
    }
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
    if ($('reviewSummary')) $('reviewSummary').textContent = 'Run Proofread first.';
    if ($('reviewDetailArea')) $('reviewDetailArea').innerHTML = '';

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
    const engine = getOcrEngine();
    const visionKey = $('visionKey').value.trim();
    if (engine !== 'tesseract' && !visionKey) return setError('Enter your Vision API key first (or switch OCR engine to "Tesseract.js only" above, which needs no key).');
    if (engine !== 'vision') {
      const tessLangCheck = TesseractCheckMod().mapLanguageHints(getLanguageHints());
      if (tessLangCheck === 'eng' && !(getLanguageHints() || []).includes('en')) {
        return setError(
          'Tesseract needs a language hint to read anything but English — it can\'t auto-detect script the way Vision can. ' +
          'Set the language hint(s) field above (e.g. "sa" for Sanskrit, "kn" for Kannada) before running Tesseract, or it will ' +
          'silently produce garbage on non-Latin text.'
        );
      }
    }

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
        const tessLang = engine === 'vision' ? null : TesseractCheckMod().mapLanguageHints(getLanguageHints());

        let primary; // whichever engine's result is the page's authoritative text
        let ocrEntry;
        if (engine === 'tesseract') {
          primary = await withAutoRetry(
            () => TesseractCheckMod().recognizeBase64Png(pageObj.imageBase64, tessLang),
            `Tesseract OCR on page ${p}`,
            () => cancelRequested
          );
          ocrEntry = {
            page: p,
            text: primary.text,
            avgConfidence: null, // Tesseract's per-word confidence isn't rescaled/summarized the way Vision's is (see tesseract-check.js) — not claiming a number we haven't actually computed
            lowConfidenceWords: [],
            words: primary.words,
            engine: 'tesseract',
            masterImage: pageObj.imageBase64
          };
        } else {
          primary = await withAutoRetry(
            () => VisionMod().ocrImageBase64(pageObj.imageBase64, visionKey, getLanguageHints()),
            `OCR on page ${p}`,
            () => cancelRequested
          );
          // masterImage is the immutable evidence of record for this page —
          // stored alongside every OCR candidate so a human (or a later re-run
          // with a better engine) always has the actual source to check
          // against, not just whatever text an engine claimed was on the page.
          ocrEntry = {
            page: p,
            text: primary.text,
            avgConfidence: primary.avgConfidence,
            lowConfidenceWords: primary.lowConfidenceWords,
            words: primary.words,
            engine: 'vision',
            masterImage: pageObj.imageBase64
          };
          if (primary.lowConfidenceWords && primary.lowConfidenceWords.length) {
            log(`Page ${p}: ${primary.lowConfidenceWords.length} low-confidence word(s) — worth a manual check (avg confidence ${Math.round(primary.avgConfidence * 100)}%).`);
          }

          // Free independent second opinion, opt-in only — a failure here
          // must never take down the primary OCR run, since Vision's result
          // is already the authoritative one being saved either way.
          if (engine === 'both') {
            try {
              const tessResult = await TesseractCheckMod().recognizeBase64Png(pageObj.imageBase64, tessLang);
              const sim = TesseractCheckMod().similarity(primary.text, tessResult.text);
              ocrEntry.crossCheck = { text: tessResult.text, words: tessResult.words, similarity: sim };
              log(`Page ${p}: Tesseract cross-check ${Math.round(sim * 100)}% similar to Vision.` + (sim < 0.7 ? ' Low agreement — worth a manual check.' : ''));
            } catch (e) {
              log(`Page ${p}: Tesseract cross-check failed (non-fatal, Vision result kept): ${U().formatError(e)}`);
            }
          }
        }

        if (getReadingOrderFix() && ocrEntry.words && ocrEntry.words.length) {
          ocrEntry.text = U().reconstructReadingOrder(ocrEntry.words);
        }

        ocrPages.push(ocrEntry);
        await IDB().set(ocrProgressKey(), { lastPage: p });
        await IDB().set(ocrDataKey(), { pages: ocrPages });
        updateKnownFilesManifest(currentLoader.getDocumentName(), ocrPages.length, total);
      } catch (e) {
        setError(`Failed on page ${p} after ${RETRY_DELAYS_MS.length + 1} attempts: ${U().formatError(e)} — progress saved through the pages already done. Fix the issue and tap Resume.`);
        $('runOcrBtn').disabled = false;
        $('resumeBtn').disabled = false;
        releaseWakeLock();
        await TesseractCheckMod().terminate();
        return;
      }
    }

    $('runOcrBtn').disabled = false;
    $('resumeBtn').disabled = false;
    releaseWakeLock();
    await TesseractCheckMod().terminate();
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
        // Pages that had the Tesseract cross-check run show BOTH candidates,
        // labeled, so Gemini compares rather than blindly rewriting Vision's
        // text alone — see the prompt in gemini.js for how it's told to use
        // this. Pages without a cross-check show just the one reading,
        // unlabeled, exactly as before.
        const ocrText = chunks[i].map(p => {
          const body = p.crossCheck
            ? `[Vision]\n${p.text}\n\n[Tesseract]\n${p.crossCheck.text}`
            : p.text;
          return `--- Page ${p.page} ---\n${body}`;
        }).join('\n\n');
        try {
          const chunkResult = await withAutoRetry(
            () => GeminiMod().proofread(ocrText, geminiKey, getGeminiModel(), getProofreadContext()),
            `Proofreading chunk ${i + 1}/${totalChunks}`,
            () => proofreadCancelRequested
          );
          saved.chunks[i] = chunkResult;
          await IDB().set(proofreadDataKey(), saved);
          log(`Chunk ${i + 1}/${totalChunks} (pages ${first}–${last}) proofread and saved.`);
          const chunkDelayMs = getChunkDelayMs();
          if (chunkDelayMs > 0 && i < totalChunks - 1 && !proofreadCancelRequested) await sleep(chunkDelayMs);
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

      // Review class (A-E): combines Gemini's self-reported classification
      // with the source page's Vision confidence / Tesseract agreement —
      // see review-classifier.js. Looked up by the "page" field Gemini now
      // echoes back per shloka; legacy data without it just gets classified
      // on classification alone (page-level signals unavailable).
      const ocrPageByNum = {};
      ocrPages.forEach(p => { ocrPageByNum[p.page] = p; });
      const classCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      mergedShlokas.forEach(s => {
        const srcPage = ocrPageByNum[s.page];
        s.reviewClass = ReviewClassifierMod().classify({
          classification: s.classification,
          avgConfidence: srcPage ? srcPage.avgConfidence : null,
          crossCheckSimilarity: srcPage && srcPage.crossCheck ? srcPage.crossCheck.similarity : null
        });
        classCounts[s.reviewClass]++;
      });

      finalJson = { shlokas: mergedShlokas };
      RendererMod().renderPreview(finalJson, $('previewArea'));
      setPreviewLabel('Showing Gemini-proofread text.');
      $('progressText').textContent = `Proofreading complete — ${totalChunks} chunk(s), ${mergedShlokas.length} entries.`;
      const classSummary = Object.keys(classCounts).map(k => `${k}:${classCounts[k]}`).join(' ');
      log(`Proofreading complete — all chunks merged. Review classes — ${classSummary} (D+E = ${classCounts.D + classCounts.E} unit(s) needing a human look).` + (lastProofreadMissingPages.length ? ` ⚠ ${lastProofreadMissingPages.length} selected page(s) missing: ${lastProofreadMissingPages.join(', ')}.` : ''));
      ReviewUIMod().renderSummary($('reviewSummary'));
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
    if ($('reviewSummary')) $('reviewSummary').textContent = 'Run Proofread first.';
    if ($('reviewDetailArea')) $('reviewDetailArea').innerHTML = '';
    let list;
    try { list = JSON.parse(localStorage.getItem(KNOWN_FILES_KEY)) || []; } catch (e) { list = []; }
    list = list.filter(f => f.key !== currentFileKey);
    try { localStorage.setItem(KNOWN_FILES_KEY, JSON.stringify(list)); } catch (e) { /* storage full — non-fatal */ }
    renderKnownFilesHint();
    log('Cleared saved progress for this file.');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { runOcr, runProofread, getFinalJson: () => finalJson, getOcrPages: () => ocrPages };
})();
