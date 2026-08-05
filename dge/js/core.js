// DGE Module: core.js - Fixed Path Resolution
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['core.js'] = 'v3.1 (Real fix for the Rigveda "totalShlokas" crash: adapts the vedic_text items[] schema into the same shape every other module already renders, instead of leaving it unhandled)';

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

// Forces a genuinely fresh reload — bypasses any browser/CDN caching of
// index.html, the JS files, and the content JSON, by navigating to a URL
// the browser has never seen before (same page, one changed query param).
// Only affects what gets fetched from GitHub; marks/notes/history/theme
// all live in localStorage and are completely unaffected.
// UI-discoverable alternative to manually typing ?pass=... into the URL —
// same validation, same effect, just reachable by tapping 🔑 instead of
// editing the address bar.
window.dgeShowAdminAccessPrompt = function() {
  const entered = prompt('Enter admin passkey:');
  if (!entered) return;
  const passkey = (window.appConfig && window.appConfig.secretPasskey) ? window.appConfig.secretPasskey : 'SHRI108';
  if (entered.toUpperCase() === passkey.toUpperCase()) {
    localStorage.setItem('acharyaAuthorized', 'true');
    if (typeof showToast === 'function') showToast('Admin access granted.');
    location.reload();
  } else {
    if (typeof showToast === 'function') showToast('Incorrect passkey.');
  }
};

window.dgeForceRefreshContent = function() {
  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', Date.now());
  window.location.href = url.toString();
};

// Fetched once, shared with library.js so the browser modal doesn't need
// a second network round trip for the same file. Cache-busted with both
// cache:'no-store' AND a timestamp query param — without this, a browser
// (or GitHub Pages' CDN) can keep serving library.json from BEFORE your
// most recent content update indefinitely, making newly-added/newly-
// populated granthas silently invisible even though the real files are
// correctly on GitHub.
window.dgeLibraryCatalogPromise = fetch('data/library.json?t=' + Date.now(), { cache: 'no-store' })
  .then(res => res.ok ? res.json() : null)
  .catch(() => null);

// Opts this page OUT of the browser's back/forward cache (bfcache).
// Without this, navigating between granthas (a real page load to the
// same index.html with a different ?path=) can sometimes have the
// browser restore a frozen snapshot of the PREVIOUS page instead of
// actually re-running this script — which is exactly what an "Error"
// message from an earlier grantha still showing under a new URL means.
// An empty pagehide/unload listener is the standard, reliable way to
// disable bfcache eligibility across browsers.
window.addEventListener('pagehide', function () {});

// Every other module in this app (render, audio, markers, notes, search,
// filter, ai) reads grantha data in ONE shape: {metadata, shlokas: {n:
// {sa, commentaries}}, totalShlokas}, with n a plain sequential integer.
// That shape matches PNS exactly, but the newer vedic_text schema
// (Rigveda etc.) uses a different shape: {schema, default_author,
// items: [{id, samhita_patha, rishi, devata, ...}]}. Rather than teaching
// every one of those modules a second data shape, this adapts new-schema
// data into the SAME old shape right after fetching, once, here — so
// everything downstream keeps working completely unchanged.
// This is what was actually throwing "Cannot read properties of
// undefined (reading 'totalShlokas')": stotraData.metadata didn't exist
// at all for this schema family, since it was never being adapted.
function dgeNormalizeGranthaData(data, granthaTitle) {
  if (!data) return data;
  if (data.shlokas) return data; // already the expected shape (e.g. PNS) -- nothing to do

  if (Array.isArray(data.items)) {
    const shlokas = {};
    data.items.forEach((item, idx) => {
      // Sequential 1..N internal key -- every other module assumes plain
      // integer indices. The real Vedic reference (e.g. "1.1.01") is kept
      // as a visible field (see the 'vedicId' extra field in config.js)
      // rather than used as the internal key.
      const n = idx + 1;
      shlokas[n] = {
        sa: item.samhita_patha || item.sa || '',
        vedicId: item.id || '',
        rishi: item.rishi || '',
        devata: item.devata || '',
        chandas: item.chandas || '',
        padapatha: item.pada_patha || '',
        commentaries: {} // none in this schema family yet
      };
    });
    return {
      metadata: {
        title: granthaTitle || data.schema || 'Untitled',
        author: data.default_author || '',
        totalShlokas: data.items.length,
        availableCommentaries: {}
      },
      shlokas,
      totalShlokas: data.items.length
    };
  }

  return data; // unrecognized shape -- nothing safe to adapt, let it fail downstream with a clearer error than before at least
}

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

    function fetchGranthaData(attempt) {
      // The timestamp query param alone already guarantees a fresh fetch
      // (it's a URL the browser has never cached) — cache:'no-store' on
      // top of that is stricter still and, for large files like a full
      // Rigveda maṇḍala (2MB+) on a mobile connection, gives zero
      // tolerance for an ordinary transient network hiccup. One retry
      // covers exactly that case without needing to know the real cause.
      return fetch(window.jsonFileName + '?t=' + Date.now())
        .then(res => {
          if (!res.ok) throw new Error(`Could not find dataset at ${window.jsonFileName} (HTTP ${res.status})`);
          return res.json();
        })
        .catch(err => {
          if (attempt < 1) {
            console.warn(`Grantha fetch failed, retrying once: ${err.message}`);
            return fetchGranthaData(attempt + 1);
          }
          throw err;
        });
    }

    fetchGranthaData(0)
      .then(data => {
        window.stotraData = dgeNormalizeGranthaData(data, entry ? entry.title : null);
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
  const showDesignedBy = !(window.appConfig && window.appConfig.showDesignedBy === false);
  if (authorEl) {
    if (!showDesignedBy) {
      authorEl.style.display = 'none';
    } else {
      const designedBy = (window.appConfig && window.appConfig.designedBy) ? window.appConfig.designedBy : 'TRIBHUVAN ACHAR';
      authorEl.innerText = `DESIGNED BY ${designedBy.toUpperCase()}`;
    }
  }
  
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

  const savedViewMode = localStorage.getItem('app_viewMode');
  window.viewMode = (savedViewMode === 'single') ? 'single' : 'list';
  if (window.viewMode === 'single') {
    const lastVerseKey = typeof nsKey === 'function' ? nsKey('lastVerse') : null;
    const savedLastVerse = lastVerseKey ? parseInt(localStorage.getItem(lastVerseKey), 10) : NaN;
    window.currentReadingId = !isNaN(savedLastVerse) ? savedLastVerse : 1;
  }
}
