// js/search.js
// Maps to F-005: Search & Highlighting
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['search.js'] = 'v1.1 (Removed duplicate highlightText/navSearch)';

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

// highlightText() and navSearch() live in render.js — they operate on
// window.searchMatches / window.currentMatchIdx, which render.js owns.
// (A duplicate copy used to live here too; since both were plain function
// declarations sharing one global scope, whichever script ran last simply
// overwrote the other with no error — fragile and confusing, so removed.)
