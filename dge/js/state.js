// js/state.js
// Maps to Feature F-001/F-012: Dynamic Global State Management

// Extract the URL parameters to determine which Grantha to load
window.urlParams = new URLSearchParams(window.location.search);
window.stotraCode = window.urlParams.get('code') || 'pns';
window.AUDIO_CACHE_NAME = `grantha-audio-${window.stotraCode}`;

// Helper to generate namespaced keys for local storage
window.nsKey = function(base) { 
    return `grantha_${base}_${window.stotraCode}`; 
};

// Global Application Variables
window.stotraData = null;
window.currentAudio = new Audio();
window.activeId = null;
window.contextShlokaId = null; 
window.currentAcharyaShlokaId = null; 
window.isPlaying = false;
window.currentLoopCount = 0;
window.currentFilter = 'all';
window.activeScript = 'devanagari'; 
window.selectedCommentaryView = 'none';

// Ephemeral tracking variables
window.lastSelectedText = "";
window.modalSelectedText = "";
window.targetNoteId = null;
window.targetMenuId = null;
window.audioRetryDone = false;
window.searchDebounceTimer = null;

// Search tracking arrays
window.searchMatches = [];
window.currentMatchIdx = -1;

// Persistent User Data (Loaded from Local Storage)
window.marks = JSON.parse(localStorage.getItem(window.nsKey('marks')) || '{}');
window.notes = JSON.parse(localStorage.getItem(window.nsKey('notes')) || '{}');
window.snippets = JSON.parse(localStorage.getItem(window.nsKey('snippets')) || '{}');
