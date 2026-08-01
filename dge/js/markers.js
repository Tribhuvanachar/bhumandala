// js/markers.js
// Maps to F-010: Markers Engine
// Three independent marks per shloka:
//  - fav: boolean (Favorite)
//  - status: null -> 'pending' -> 'practice' -> 'done' -> null (cycles)
//  - doubt: boolean (needs revisiting / had a question)
// Surfaced through the unified Shloka Actions sheet (see js/actions.js)
// and filterable from the bottom-player Filter menu (see js/filter.js).

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['markers.js'] = 'v3.0 (Favorite + Status + Doubt)';

const STATUS_CYCLE = [null, 'pending', 'practice', 'done'];

function dgeEnsureMark(id) {
  if (!marks[id]) marks[id] = { fav: false, status: null, doubt: false };
  return marks[id];
}

function dgeAfterMarkChange(id) {
  // Drop empty records so marks stays small and filters don't misfire on
  // stale all-false entries.
  const m = marks[id];
  if (m && !m.fav && !m.status && !m.doubt) delete marks[id];

  if (typeof dgeSaveMarks === 'function') dgeSaveMarks();
  if (typeof renderList === 'function') renderList();
  if (window.currentActionsSheetId === id && typeof renderActionsSheetContent === 'function') {
    renderActionsSheetContent(id);
  }
}

window.toggleFavorite = function(id) {
  const m = dgeEnsureMark(id);
  m.fav = !m.fav;
  dgeAfterMarkChange(id);
};

window.cycleStatus = function(id) {
  const m = dgeEnsureMark(id);
  const idx = STATUS_CYCLE.indexOf(m.status);
  m.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  dgeAfterMarkChange(id);
};

window.toggleDoubt = function(id) {
  const m = dgeEnsureMark(id);
  m.doubt = !m.doubt;
  dgeAfterMarkChange(id);
};

// Kept for backward compatibility with any older code path that might
// still call the previous single-mark API.
window.toggleMark = function(id, type) {
  if (type === 'fav') return window.toggleFavorite(id);
  if (type === 'practice') {
    const m = dgeEnsureMark(id);
    m.status = m.status === 'practice' ? null : 'practice';
    dgeAfterMarkChange(id);
  }
};
