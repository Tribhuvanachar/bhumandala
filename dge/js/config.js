// DGE Module: config.js
// js/config.js
// Maps to F-012: Preferences & Global State

const appConfig = {
  appName: "Bhagavata Digital Library",
  designedBy: "Tribhuvan Achar",
  contactEmail: "sanatanavidyagurukulam@gmail.com",
  geminiModel: "gemini-3.6-flash", 
  secretPasskey: "SHRI108",
  version: "v4.0 Generic Engine"
};

const urlParams = new URLSearchParams(window.location.search);
const stotraCode = urlParams.get('code') || 'pns';
const AUDIO_CACHE_NAME = `grantha-audio-${stotraCode}`;

const nsKey = (base) => `narasimha_${base}_${stotraCode}`;

// Global State Inventory
let stotraData = null;
let currentAudio = new Audio();
let activeId = null;
let contextShlokaId = null; 
let currentAcharyaShlokaId = null; 
let isPlaying = false;
let currentLoopCount = 0;
let currentFilter = 'all';
let activeScript = 'devanagari'; 
let selectedCommentaryView = 'none';
let lastSelectedText = "";
let modalSelectedText = "";
let targetNoteId = null;
let targetMenuId = null;
let audioRetryDone = false;
let searchDebounceTimer = null;

// Temporary Arrays
window.searchMatches = [];
window.currentMatchIdx = -1;

// Local Storage Initialization
let marks = JSON.parse(localStorage.getItem(nsKey('marks')) || '{}');
let notes = JSON.parse(localStorage.getItem(nsKey('notes')) || '{}');
let snippets = JSON.parse(localStorage.getItem(nsKey('snippets')) || '{}');

