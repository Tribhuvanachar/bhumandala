// js/search.js
// Maps to F-005: Search & Highlighting
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['search.js'] = 'v1.0';

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  if (clearSearchBtn && searchInput) {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
  }
  
  if (typeof searchDebounceTimer !== 'undefined') {
    clearTimeout(searchDebounceTimer);
  }
  
  searchDebounceTimer = setTimeout(() => {
    if (typeof renderList === 'function') renderList();
  }, 120);
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  const navContainer = document.getElementById('searchNavigator');
  
  if (searchInput) searchInput.value = '';
  if (navContainer) navContainer.style.display = 'none';
  
  handleSearch();
}

function highlightText(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})(?![^<]*>|[^<>]*<\\/)`, 'gi');
  return text.replace(regex, '<mark class="search-match">$1</mark>');
}

function navSearch(direction) {
  if (!window.searchMatches || window.searchMatches.length === 0) return;
  
  if (window.currentMatchIdx >= 0 && window.searchMatches[window.currentMatchIdx]) { 
    window.searchMatches[window.currentMatchIdx].classList.remove('active-match'); 
  }

  window.currentMatchIdx += direction;
  if (window.currentMatchIdx >= window.searchMatches.length) window.currentMatchIdx = 0;
  if (window.currentMatchIdx < 0) window.currentMatchIdx = window.searchMatches.length - 1;

  const target = window.searchMatches[window.currentMatchIdx];
  if (target) {
    target.classList.add('active-match');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  const countEl = document.getElementById('searchMatchCount');
  if (countEl) {
    countEl.innerText = `${window.currentMatchIdx + 1} / ${window.searchMatches.length}`;
  }
}
