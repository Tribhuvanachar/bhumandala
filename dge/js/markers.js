// js/markers.js
// Maps to F-010: Markers Engine — favorite / "needs practice" flag state.
// Surfaced through the unified Shloka Actions sheet (see js/actions.js)
// instead of a standalone context menu.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['markers.js'] = 'v2.0 (Unified Actions Sheet)';

// Tapping a mark that's already active clears it; otherwise sets it.
window.toggleMark = function(id, type) {
  if (typeof marks === 'undefined') return;

  if (marks[id] === type) {
    delete marks[id];
  } else {
    marks[id] = type;
  }

  if (typeof nsKey === 'function') {
    localStorage.setItem(nsKey('marks'), JSON.stringify(marks));
  }

  if (typeof renderList === 'function') renderList();
  if (window.currentActionsSheetId === id && typeof renderActionsSheetContent === 'function') {
    renderActionsSheetContent(id);
  }
};
