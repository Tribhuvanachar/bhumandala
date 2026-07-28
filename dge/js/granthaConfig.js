// granthaConfig.js
// Mechanical extraction of application configuration and shared state
// from PrahladaKrutaNarasimhaStotra.html

export const urlParams = new URLSearchParams(window.location.search);

export const appConfig = {
    version: "10.1.0",
    designedBy: "Unknown",
    secretPasskey: "",
    contactEmail: "",
    geminiModel: "gemini-3.6-flash"
};

export const stotraCode = urlParams.get("code") || "pns";

export const jsonFileName = `data_${stotraCode}.json`;

export const AUDIO_CACHE_NAME = `narasimha-audio-${stotraCode}`;

export function nsKey(base) {
    return `narasimha_${base}_${stotraCode}`;
}

export const state = {
    stotraData: null,

    currentAudio: new Audio(),

    activeId: null,
    contextShlokaId: null,
    currentAcharyaShlokaId: null,

    isPlaying: false,
    currentLoopCount: 0,

    currentFilter: "all",

    activeScript: "devanagari",

    selectedCommentaryView: "none",

    lastSelectedText: "",
    modalSelectedText: "",

    targetNoteId: null,
    targetMenuId: null,

    audioRetryDone: false,

    searchDebounceTimer: null
};

export let marks =
    JSON.parse(localStorage.getItem(nsKey("marks")) || "{}");

export let notes =
    JSON.parse(localStorage.getItem(nsKey("notes")) || "{}");

export let snippets =
    JSON.parse(localStorage.getItem(nsKey("snippets")) || "{}");

export const els = {

    playBtn: document.getElementById("playBtn"),
    speedInput: document.getElementById("speedInput"),
    speedVal: document.getElementById("speedVal"),
    trackLabel: document.getElementById("trackLabel"),
    timeDisplay: document.getElementById("timeDisplay"),
    repeatCounter: document.getElementById("repeatCounter"),

    readingCard: document.getElementById("readingCard"),

    markerMenu: document.getElementById("markerMenu"),

    filterBtn: document.getElementById("filterBtn"),

    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    searchScope: document.getElementById("searchScope"),
    navContainer: document.getElementById("searchNavigator"),

    repeatInput: document.getElementById("repeatInput"),

    cacheBtn: document.getElementById("cacheBtn"),

    listEl: document.getElementById("shlokaList"),

    loopA: document.getElementById("loopA"),
    loopB: document.getElementById("loopB"),
    enableAB: document.getElementById("enableAB"),

    autoABToggle: document.getElementById("autoABToggle")
};
