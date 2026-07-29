// DGE Module: core.js
// js/core.js
// Maps to F-001: Bootstrap

document.addEventListener('DOMContentLoaded', () => {
  const providedPass = urlParams.get('pass');
  if (providedPass && providedPass.toUpperCase() === appConfig.secretPasskey.toUpperCase()) {
    localStorage.setItem('acharyaAuthorized', 'true');
  }
  
  // Dynamically load the dataset based on the URL parameter (e.g., ?code=pns)
  fetch(`data/${stotraCode}/data.json`)
    .then(res => { 
        if(!res.ok) throw new Error(`Could not find dataset for ${stotraCode}`); 
        return res.json(); 
    })
    .then(data => { 
        stotraData = data; 
        initApp(); 
    })
    .catch(err => {
      console.error(err);
      const titleEl = document.getElementById('stotraTitle');
      const cardEl = document.getElementById('readingCard');
      if (titleEl) titleEl.innerText = "Data Not Found";
      if (cardEl) cardEl.innerText = `Error: Please ensure data/${stotraCode}/data.json is available in the repository.`;
    });
});

function initApp() {
  restorePrefs();
  initAuthAndBranding();
  
  if(stotraData && stotraData.metadata) {
    const titleEl = document.getElementById('stotraTitle');
    if (titleEl) {
        titleEl.innerHTML = typeof applyTransliteration === 'function' 
            ? applyTransliteration(stotraData.metadata.title, activeScript) 
            : stotraData.metadata.title;
    }

    const rangeStart = document.getElementById('rangeStart');
    const rangeEnd = document.getElementById('rangeEnd');
    if (rangeStart) rangeStart.max = stotraData.metadata.totalShlokas || 43;
    if (rangeEnd) rangeEnd.max = stotraData.metadata.totalShlokas || 43;

    const dynamicList = document.getElementById('commentaryDynamicList');
    const searchScope = document.getElementById('searchScope');
    
    if (dynamicList && searchScope && stotraData.metadata.availableCommentaries) {
      dynamicList.innerHTML = '';
      searchScope.innerHTML = '<option value="all">Search All</option><option value="mula">Shloka Only</option>';
      
      Object.entries(stotraData.metadata.availableCommentaries).forEach(([key, name]) => {
        const transName = typeof applyTransliteration === 'function' ? applyTransliteration(name, activeScript) : name;
        dynamicList.innerHTML += `<div class="pop-item" onclick="setCommentaryView('${key}', this)">${transName}</div>`;
        searchScope.innerHTML += `<option value="${key}">${transName} Only</option>`;
      });
    }
  }

  const cacheBtn = document.getElementById('cacheBtn');
  if (cacheBtn && localStorage.getItem(nsKey('allCached')) === 'true') {
    cacheBtn.innerText = `✅ All Cached`;
    cacheBtn.dataset.cached = "true";
    cacheBtn.style.background = "#e8f5e9"; 
    cacheBtn.style.color = "#2e7d32"; 
    cacheBtn.style.borderColor = "#c8e6c9";
  }

  // Pass control to the rendering pipeline (if it has been migrated)
  if (typeof renderList === 'function') renderList();
}

function initAuthAndBranding() {
  const isAuthorized = localStorage.getItem('acharyaAuthorized') === 'true';
  if (isAuthorized) document.body.classList.add('is-authorized');
  
  const authorEl = document.getElementById('stotraAuthor');
  if(authorEl) authorEl.innerText = `DESIGNED BY ${appConfig.designedBy.toUpperCase()}`;
  
  const emailDisplay = document.getElementById('contactEmailDisplay');
  if(emailDisplay) emailDisplay.innerText = appConfig.contactEmail;
  
  const emailLink = document.getElementById('configEmailLink');
  if(emailLink) {
      emailLink.href = `mailto:${appConfig.contactEmail}`;
      emailLink.innerText = appConfig.contactEmail;
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

