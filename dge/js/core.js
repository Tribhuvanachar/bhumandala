// DGE Module: core.js - Fixed Path Resolution
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['core.js'] = 'v2.6 (Fixed critical regression: ?path=stotras/<code> now resolves to the same stotraCode as legacy ?code=<code>, so the Library browser no longer orphans marks/notes/audio-cache under a different key)';

// Converts a library.json catalog path ("dge/data/x/y/data.json", always
// repo-root-relative for GitHub API use) into a slug ("x/y") and a
// fetch-relative path ("data/x/y/data.json", relative to this index.html
// which itself lives inside dge/). Shared with library.js (the browser
// modal), so both always agree on the same slug for the same file.
window.dgeLibraryPathToFetchPath = function(catalogPath) {
  return catalogPath.replace(/^dge\//, '');
};
window.dgeGranthaSlug = function(catalogPath) {
  return window.dgeLibraryPathToFetchPath(catalogPath).replace(/^data\//, '').replace(/\/data\.json$/, '');
};

// Fetched once, shared with library.js so the browser modal doesn't need
// a second network round trip for the same file.
window.dgeLibraryCatalogPromise = fetch('data/library.json')
  .then(res => res.ok ? res.json() : null)
  .catch(() => null);

document.addEventListener('DOMContentLoaded', () => {
  // 1. INITIALIZE GLOBAL DOM ELEMENTS
  window.els = {
    playBtn: document.getElementById('playBtn'),
    speedInput: document.getElementById('speedInput'),
    speedVal: document.getElementById('speedVal'),
    trackLabel: document.getElementById('trackLabel'),
    timeDisplay: document.getElementById('timeDisplay'),
    repeatCounter: document.getElementById('repeatCounter'),
    readingCard: document.getElementById('readingCard'),
    filterBtn: document.getElementById('filterBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    repeatInput: document.getElementById('repeatInput'),
    cacheBtn: document.getElementById('cacheBtn'),
    listEl: document.getElementById('shlokaList'),
    loopA: document.getElementById('loopA'),
    loopB: document.getElementById('loopB'),
    enableAB: document.getElementById('enableAB'),
    autoABToggle: document.getElementById('autoABToggle'),
    searchScope: document.getElementById('searchScopeBtn'),
    navContainer: document.getElementById('searchNavigator')
  };

  // 2. PARSE URL PARAMETERS
  const urlParams = new URLSearchParams(window.location.search);
  const explicitPath = urlParams.get('path'); // new general addressing, e.g. "vedas/rigveda/mandala_01"
  const explicitCode = urlParams.get('code'); // legacy addressing — always resolves under stotras/, unchanged behaviour

  const providedPass = urlParams.get('pass');
  const passkey = (window.appConfig && window.appConfig.secretPasskey) ? window.appConfig.secretPasskey : 'SHRI108';

  if (providedPass && providedPass.toUpperCase() === passkey.toUpperCase()) {
    localStorage.setItem('acharyaAuthorized', 'true');
  }

  // 3. RESOLVE WHICH GRANTHA TO LOAD
  // Any single-level "stotras/<code>" address — whether reached via the
  // legacy ?code=<code> param, no params at all (defaults to pns), OR the
  // newer ?path=stotras/<code> form — has ALWAYS used just <code> as its
  // storage/cache namespace; that convention predates the library catalog
  // entirely. This must hold regardless of how the page was reached: the
  // Library browser itself links to PNS via ?path=stotras/pns, and if
  // that used a different namespace it would silently orphan existing
  // users' marks/notes/audio-cache under a key they'd never see again —
  // not actual data loss (nothing is deleted), but functionally
  // indistinguishable from it. Only deeper category paths (vedas/...,
  // puranas/..., sarvamoola/..., etc.) use the full slug as the
  // namespace, since collision risk there is real (many granthas share a
  // generic last folder segment like "mula").
  const slug = explicitPath
    ? explicitPath.replace(/^\/+|\/+$/g, '')
    : `stotras/${explicitCode || 'pns'}`;
  const stotrasDirectChild = slug.match(/^stotras\/([^/]+)$/);

  window.stotraCode = stotrasDirectChild ? stotrasDirectChild[1] : slug.replace(/\//g, '__');
  window.currentGranthaSlug = slug;
  window.jsonFileName = `data/${slug}/data.json`; // overwritten below if the catalog has a more specific real path
  window.AUDIO_CACHE_NAME = `narasimha-audio-${window.stotraCode}`;

  // 4. RESOLVE VIA THE LIBRARY CATALOG, THEN FETCH THE GRANTHA DATASET
  window.dgeLibraryCatalogPromise.then(library => {
    let entry = null;
    if (library && Array.isArray(library.granthas)) {
      entry = library.granthas.find(g => window.dgeGranthaSlug(g.path) === slug);
    }
    if (entry) {
      window.jsonFileName = window.dgeLibraryPathToFetchPath(entry.path);
    }

    if (entry && entry.populated === false) {
      const titleEl = document.getElementById('stotraTitle');
      const cardEl = document.getElementById('readingCard');
      if (titleEl) titleEl.innerText = 'Not Yet Available';
      if (cardEl) cardEl.innerText = "This text hasn't been added to the library yet — check back soon.";
      return;
    }

    fetch(window.jsonFileName)
      .then(res => {
        if (!res.ok) throw new Error(`Could not find dataset at ${window.jsonFileName}`);
        return res.json();
      })
      .then(data => {
        window.stotraData = data;
        initApp();
      })
      .catch(err => {
        console.error("DGE Fetch Error:", err);
        const titleEl = document.getElementById('stotraTitle');
        const cardEl = document.getElementById('readingCard');
        if (titleEl) titleEl.innerText = "Data Not Found";
        if (cardEl) cardEl.innerText = `Error: Please ensure ${window.jsonFileName} is available in the repository.`;
      });
  });
});

function initApp() {
  if (typeof loadPersistedState === 'function') loadPersistedState();
  if (typeof restorePrefs === 'function') restorePrefs();
  if (typeof initAuthAndBranding === 'function') initAuthAndBranding();
  if (typeof applyFeatureFlags === 'function') applyFeatureFlags();

  window.renderStotraChrome();

  const cacheBtn = document.getElementById('cacheBtn');
  const cacheKey = window.nsKey ? window.nsKey('allCached') : `narasimha_allCached_${window.stotraCode}`;
  if (cacheBtn && localStorage.getItem(cacheKey) === 'true') {
    cacheBtn.innerText = `✅ All Cached`;
    cacheBtn.dataset.cached = "true";
    cacheBtn.style.background = "#e8f5e9"; 
    cacheBtn.style.color = "#2e7d32"; 
    cacheBtn.style.borderColor = "#c8e6c9";
  }

  // Pass control to the rendering pipeline
  if (typeof renderList === 'function') renderList();

  if (typeof dgeRestoreLastVerse === 'function') dgeRestoreLastVerse();
}

// Renders every piece of "chrome" (title, commentary list, search-scope
// options) that depends on the currently selected transliteration script.
// Called once on initial load, and again whenever the script changes, so
// the header title stays in sync instead of only updating on page refresh.
window.renderStotraChrome = function() {
  if (!(window.stotraData && window.stotraData.metadata)) return;

  const activeScript = window.activeScript || 'devanagari';
  const doTranslit = (text) => typeof applyTransliteration === 'function' ? applyTransliteration(text, activeScript) : text;

  const titleEl = document.getElementById('stotraTitle');
  if (titleEl) {
    titleEl.innerHTML = doTranslit(window.stotraData.metadata.title);
  }

  const rangeStart = document.getElementById('rangeStart');
  const rangeEnd = document.getElementById('rangeEnd');
  if (rangeStart) rangeStart.max = window.stotraData.metadata.totalShlokas || 43;
  if (rangeEnd) rangeEnd.max = window.stotraData.metadata.totalShlokas || 43;

  const dynamicList = document.getElementById('commentaryDynamicList');
  const searchScopeDynamicList = document.getElementById('searchScopeDynamicList');

  if (dynamicList && searchScopeDynamicList && window.stotraData.metadata.availableCommentaries) {
    dynamicList.innerHTML = '';
    searchScopeDynamicList.innerHTML = '';

    Object.entries(window.stotraData.metadata.availableCommentaries).forEach(([key, name]) => {
      const transName = doTranslit(name);
      dynamicList.innerHTML += `<div class="pop-item" onclick="setCommentaryView('${key}', this)">${transName}</div>`;
      searchScopeDynamicList.innerHTML += `<div class="pop-item" data-scope="${key}" onclick="window.setSearchScope('${key}', '${transName} Only', this)">${transName} Only</div>`;
    });
  }
};

function initAuthAndBranding() {
  const isAuthorized = localStorage.getItem('acharyaAuthorized') === 'true';
  if (isAuthorized) document.body.classList.add('is-authorized');
  
  const authorEl = document.getElementById('stotraAuthor');
  const designedBy = (window.appConfig && window.appConfig.designedBy) ? window.appConfig.designedBy : 'TRIBHUVAN ACHAR';
  if(authorEl) authorEl.innerText = `DESIGNED BY ${designedBy.toUpperCase()}`;
  
  const emailDisplay = document.getElementById('contactEmailDisplay');
  const contactEmail = (window.appConfig && window.appConfig.contactEmail) ? window.appConfig.contactEmail : 'sanatanavidyagurukulam@gmail.com';
  if(emailDisplay) emailDisplay.innerText = contactEmail;
  
  const emailLink = document.getElementById('configEmailLink');
  if(emailLink) {
      emailLink.href = `mailto:${contactEmail}`;
      emailLink.innerText = contactEmail;
  }
}

function restorePrefs() {
  const savedTheme = localStorage.getItem('app_theme');
  if (savedTheme && typeof applyTheme === 'function') {
    applyTheme(savedTheme);
  } else if (typeof applyTheme === 'function') {
    // One-time migration: honor a previously saved plain dark-mode flag.
    const wasDark = localStorage.getItem('app_darkMode') === 'true';
    applyTheme(wasDark ? 'darkglass' : 'traditional');
  }

  const savedFont = parseInt(localStorage.getItem('app_fontSize'), 10);
  if (!isNaN(savedFont) && typeof applyFontSize === 'function') applyFontSize(savedFont);

  const savedScript = localStorage.getItem('app_script');
  if (savedScript && typeof applyScript === 'function') applyScript(savedScript);
}
