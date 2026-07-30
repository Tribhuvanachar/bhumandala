// DGE Module: core.js
// js/core.js
// Maps to F-001: Bootstrap

document.addEventListener('DOMContentLoaded', () => {
  // 1. INITIALIZE GLOBAL ELEMENTS
  // Critical Fix: If this is missing, the toolbars, popups, and audio controls will crash.
  window.els = {
    playBtn: document.getElementById('playBtn'),
    speedInput: document.getElementById('speedInput'),
    speedVal: document.getElementById('speedVal'),
    trackLabel: document.getElementById('trackLabel'),
    timeDisplay: document.getElementById('timeDisplay'),
    repeatCounter: document.getElementById('repeatCounter'),
    readingCard: document.getElementById('readingCard'),
    markerMenu: document.getElementById('markerMenu'),
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
    searchScope: document.getElementById('searchScope'),
    navContainer: document.getElementById('searchNavigator')
  };

  // 2. PARSE URL PARAMETERS SAFELY
  const params = new URLSearchParams(window.location.search);
  window.stotraCode = params.get('code') || 'pns';
  
  const providedPass = params.get('pass');
  if (providedPass && window.appConfig && providedPass.toUpperCase() === window.appConfig.secretPasskey.toUpperCase()) {
    localStorage.setItem('acharyaAuthorized', 'true');
  }
  
  // 3. DYNAMIC PATH ROUTING
  // Adjusts dynamically based on the '?code=' URL parameter.
  // Note: Based on your repository structure, the file sits inside the 'mula' directory. 
  // If you moved it out of 'mula', change this to `data/stotras/${window.stotraCode}/data.json`
  window.jsonFileName = `data/stotras/${window.stotraCode}/data.json`;
  
  // 4. FETCH GRANTHA DATASET
  fetch(window.jsonFileName)
    .then(res => { 
        if(!res.ok) throw new Error(`Could not find dataset for ${window.stotraCode} at ${window.jsonFileName}`); 
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

function initApp() {
  if (typeof restorePrefs === 'function') restorePrefs();
  if (typeof initAuthAndBranding === 'function') initAuthAndBranding();
  
  if(window.stotraData && window.stotraData.metadata) {
    const titleEl = document.getElementById('stotraTitle');
    if (titleEl) {
        titleEl.innerHTML = typeof applyTransliteration === 'function' 
            ? applyTransliteration(window.stotraData.metadata.title, window.activeScript || 'devanagari') 
            : window.stotraData.metadata.title;
    }

    const rangeStart = document.getElementById('rangeStart');
    const rangeEnd = document.getElementById('rangeEnd');
    if (rangeStart) rangeStart.max = window.stotraData.metadata.totalShlokas || 43;
    if (rangeEnd) rangeEnd.max = window.stotraData.metadata.totalShlokas || 43;

    const dynamicList = document.getElementById('commentaryDynamicList');
    const searchScope = document.getElementById('searchScope');
    
    if (dynamicList && searchScope && window.stotraData.metadata.availableCommentaries) {
      dynamicList.innerHTML = '';
      searchScope.innerHTML = '<option value="all">Search All</option><option value="mula">Shloka Only</option>';
      
      Object.entries(window.stotraData.metadata.availableCommentaries).forEach(([key, name]) => {
        const transName = typeof applyTransliteration === 'function' ? applyTransliteration(name, window.activeScript || 'devanagari') : name;
        dynamicList.innerHTML += `<div class="pop-item" onclick="setCommentaryView('${key}', this)">${transName}</div>`;
        searchScope.innerHTML += `<option value="${key}">${transName} Only</option>`;
      });
    }
  }

  const cacheBtn = document.getElementById('cacheBtn');
  if (cacheBtn && localStorage.getItem(window.nsKey ? window.nsKey('allCached') : `narasimha_allCached_${window.stotraCode}`) === 'true') {
    cacheBtn.innerText = `✅ All Cached`;
    cacheBtn.dataset.cached = "true";
    cacheBtn.style.background = "#e8f5e9"; 
    cacheBtn.style.color = "#2e7d32"; 
    cacheBtn.style.borderColor = "#c8e6c9";
  }

  // Pass control to the rendering pipeline
  if (typeof renderList === 'function') renderList();
}

function initAuthAndBranding() {
  const isAuthorized = localStorage.getItem('acharyaAuthorized') === 'true';
  if (isAuthorized) document.body.classList.add('is-authorized');
  
  const authorEl = document.getElementById('stotraAuthor');
  if(authorEl && window.appConfig) authorEl.innerText = `DESIGNED BY ${window.appConfig.designedBy.toUpperCase()}`;
  
  const emailDisplay = document.getElementById('contactEmailDisplay');
  if(emailDisplay && window.appConfig) emailDisplay.innerText = window.appConfig.contactEmail;
  
  const emailLink = document.getElementById('configEmailLink');
  if(emailLink && window.appConfig) {
      emailLink.href = `mailto:${window.appConfig.contactEmail}`;
      emailLink.innerText = window.appConfig.contactEmail;
  }
}

function restorePrefs() {
  const isDark = localStorage.getItem('app_darkMode') === 'true';
  if(typeof applyDarkMode === 'function') applyDarkMode(isDark);
  
  const savedFont = parseInt(localStorage.getItem('app_fontSize'), 10);
  if (!isNaN(savedFont) && typeof applyFontSize === 'function') applyFontSize(savedFont);
  
  const savedScript = localStorage.getItem('app_script');
  if (savedScript && typeof applyScript === 'function') applyScript(savedScript);
}
