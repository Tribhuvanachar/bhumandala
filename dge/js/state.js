// DGE Module: state.js
window.activeScript = localStorage.getItem('app_script') || 'devanagari';
window.activeId = null;
window.stotraData = null;
window.currentAudio = new Audio();
window.isPlaying = false;
window.currentFilter = 'all';
window.selectedCommentaryView = 'none';
window.marks = JSON.parse(localStorage.getItem('narasimha_marks_pns') || '{}');
window.notes = JSON.parse(localStorage.getItem('narasimha_notes_pns') || '{}');
window.snippets = JSON.parse(localStorage.getItem('narasimha_snippets_pns') || '{}');
