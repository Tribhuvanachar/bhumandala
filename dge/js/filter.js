// js/filter.js
// Maps to Feature: Filter
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['filter.js'] = 'v3.0 (Multi-select checkbox filters)';

// Multiple mark-based criteria can now be active at once (checkbox-style,
// OR logic — a shloka shows if it matches ANY checked criterion), instead
// of the old single-select radio behavior. "Single Track" (no auto-advance
// to the next matching shloka) stays a separate toggle, tracked via the
// existing window.currentFilter — audio.js already checks for
// currentFilter === 'none' to skip auto-advance, so that's left as-is.
window.activeFilters = window.activeFilters || new Set();

// Phase 7 of the mobile UI overhaul: a "Negate this filter" mode for the
// checkbox mark-criteria, one of the ashtadhyayi.com-inspired features the
// project lead asked to add. Applies to the whole checked set at once
// (Match = show shlokas matching ANY checked criterion, Negate = show
// shlokas matching NONE of them) rather than a per-criterion negation --
// the existing activeFilters Set has no room for per-item state without a
// larger restructuring, and a single set-wide negation already covers the
// real use case ("show me everything except what I've marked done", say)
// without that added complexity.
window.negateMarkFilters = window.negateMarkFilters || false;
window.setMarkFilterMode = function (negate, btnEl) {
  window.negateMarkFilters = !!negate;
  const toggle = document.getElementById('markFilterModeToggle');
  if (toggle) toggle.querySelectorAll('.range-mode-btn').forEach(b => b.classList.toggle('active', b === btnEl));
  if (typeof renderList === 'function') renderList();
  dgeJumpToFirstFiltered();
};

function getFilteredIds() {
  if (!stotraData) return [];
  let ids = [];
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;
  
  const rangeStartEl = document.getElementById('rangeStart');
  const rangeEndEl = document.getElementById('rangeEnd');

  const rs = rangeStartEl ? parseInt(rangeStartEl.value) : NaN;
  const re = rangeEndEl ? parseInt(rangeEndEl.value) : NaN;
  const rm = window.currentRangeMode || 'include';
  const hasRange = !isNaN(rs) && !isNaN(re) && rs <= re;
  
  const filters = window.activeFilters || new Set();

  for (let i = 1; i <= total; i++) {
    if (filters.size > 0) {
      const m = (typeof marks !== 'undefined') ? marks[i] : null;
      let matchesAny = false;
      if (filters.has('fav') && m && m.fav) matchesAny = true;
      if (filters.has('pending') && m && m.status === 'pending') matchesAny = true;
      if (filters.has('practice') && m && m.status === 'practice') matchesAny = true;
      if (filters.has('done') && m && m.status === 'done') matchesAny = true;
      if (filters.has('doubt') && m && m.doubt) matchesAny = true;
      if (window.negateMarkFilters) matchesAny = !matchesAny;
      if (!matchesAny) continue;
    }
    
    if (hasRange) { 
      const inR = (i >= rs && i <= re); 
      if ((rm === 'include' && !inR) || (rm === 'exclude' && inR)) continue; 
    }
    ids.push(i);
  }
  return ids;
}

function clearRange() {
  const rangeStartEl = document.getElementById('rangeStart');
  const rangeEndEl = document.getElementById('rangeEnd');

  if (rangeStartEl) rangeStartEl.value = "";
  if (rangeEndEl) rangeEndEl.value = "";
  applyRangeFilter();
}

// Replaces the old native <select id="rangeMode"> with a two-button
// toggle matching the rest of the app's popup styling (native <select>
// dropdowns render as an OS picker on mobile, jarringly inconsistent with
// every other custom-styled option list in this popup).
window.currentRangeMode = 'include';
window.setRangeMode = function(mode, btnEl) {
  window.currentRangeMode = mode;
  const toggle = document.getElementById('rangeModeToggle');
  if (toggle) {
    toggle.querySelectorAll('.range-mode-btn').forEach(b => b.classList.toggle('active', b === btnEl));
  }
  applyRangeFilter();
};

function dgeJumpToFirstFiltered() {
  const aIds = getFilteredIds();
  if (aIds.length) {
    // Select and scroll to the first filtered shloka; do not start audio
    // as a side effect of toggling a mark filter.
    if (typeof loadShloka === 'function') loadShloka(aIds[0]);
  } else {
    if (typeof currentAudio !== 'undefined' && currentAudio) currentAudio.pause();
    if (typeof activeId !== 'undefined') activeId = null;
    if (typeof isPlaying !== 'undefined') isPlaying = false;
    if (typeof updatePlayUI === 'function') updatePlayUI();
  }
}

// Toggles one checkbox-style filter criterion on/off; any number can be
// active simultaneously (OR logic).
window.toggleFilterCriterion = function(type) {
  if (!window.activeFilters) window.activeFilters = new Set();
  if (window.activeFilters.has(type)) {
    window.activeFilters.delete(type);
  } else {
    window.activeFilters.add(type);
  }

  document.querySelectorAll('#filterPopup .filter-checkbox-item').forEach(el => {
    el.classList.toggle('active', window.activeFilters.has(el.dataset.filterType));
  });

  if (typeof renderList === 'function') renderList();
  dgeJumpToFirstFiltered();
};

window.clearAllFilterCriteria = function() {
  window.activeFilters = new Set();
  document.querySelectorAll('#filterPopup .filter-checkbox-item').forEach(el => el.classList.remove('active'));
  if (typeof renderList === 'function') renderList();
  dgeJumpToFirstFiltered();
};

// "Single Track" — a separate toggle for turning OFF auto-advance to the
// next filtered shloka, independent of which mark criteria are checked.
window.toggleSingleTrackMode = function() {
  const isSingleTrack = (typeof currentFilter !== 'undefined' && currentFilter === 'none');
  if (typeof currentFilter !== 'undefined') currentFilter = isSingleTrack ? 'all' : 'none';

  const btn = document.getElementById('opt-none');
  if (btn) btn.classList.toggle('active', !isSingleTrack);
};

// Kept for backward compatibility with any older direct call.
function setFilter(type) {
  if (type === 'none') { window.toggleSingleTrackMode(); return; }
  if (type === 'all') { window.clearAllFilterCriteria(); return; }
  window.toggleFilterCriterion(type);
}

function applyRangeFilter() {
  if (typeof renderList === 'function') renderList();
  const aIds = getFilteredIds();
  if (aIds.length && (typeof currentFilter === 'undefined' || currentFilter !== 'none')) {
      // Select, don't play — changing the range should not start audio.
      if (typeof loadShloka === 'function') loadShloka(aIds[0]);
  }
}
