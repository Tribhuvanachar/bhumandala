/**
 * ============================================================
 * DGE/js/core.js
 * Phase 2 - Modular Architecture Baseline (Refined)
 * 
 * Responsibilities:
 *   - Shared State Management (DGE.State)
 *   - DOM Caching
 *   - Application Bootstrap & Lifecycle
 *   - Preferences management (Dark Mode, Font Size, Script)
 * ============================================================
 */

(function (global) {
    "use strict";

    // Setup namespace
    global.DGE = global.DGE || {};
    global.DGE.Core = global.DGE.Core || {};
    
    // ------------------------------------------------------------------------
    // Shared Application State
    // ------------------------------------------------------------------------
    global.DGE.State = global.DGE.State || {};
    const State = global.DGE.State;

    Object.assign(State, {
        stotraData: State.stotraData ?? null,
        activeScript: State.activeScript ?? "devanagari",
        activeId: State.activeId ?? null,
        stotraCode: State.stotraCode ?? (global.stotraCode || "default"),
        jsonFileName: State.jsonFileName ?? (global.jsonFileName || "data.json"),
        els: State.els ?? {}
    });

    const Core = global.DGE.Core;

    // Initialization flag
    Core.started = false;

    /**
     * ------------------------------------------------------------
     * Private Helpers
     * ------------------------------------------------------------
     */

    function applyDarkMode(isDark) {
        document.body.classList.toggle("dark-mode", isDark);

        const btn = document.getElementById("darkModeBtn");
        if (btn) btn.innerText = isDark ? "🌙" : "☀️";

        const meta = document.getElementById("themeColorMeta");
        if (meta) meta.setAttribute("content", isDark ? "#18120E" : "#FFFDF9");
    }

    function applyFontSize(px) {
        document.documentElement.style.setProperty("--font-multiplier", px + "px");

        document.querySelectorAll("#fontPopup .pop-item").forEach((el) => {
            el.classList.toggle("active", parseInt(el.dataset.size, 10) === px);
        });
    }

    function applyScript(code) {
        State.activeScript = code;

        document.querySelectorAll("#scriptPopup .pop-item").forEach((el) => {
            if (el.dataset.script) {
                el.classList.toggle("active", el.dataset.script === code);
            }
        });

        if (code !== "devanagari") {
            document.body.classList.add("non-devanagari");
        } else {
            document.body.classList.remove("non-devanagari");
        }
    }

    // Export helpers for internal use by toggle methods
    Core._applyDarkMode = applyDarkMode;
    Core._applyFontSize = applyFontSize;
    Core._applyScript = applyScript;

    /**
     * ------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------
     */

    function nsKey(base) {
        return `narasimha_${base}_${State.stotraCode}`;
    }

    function restorePrefs() {
        applyDarkMode(localStorage.getItem("app_darkMode") === "true");

        const savedFont = parseInt(localStorage.getItem("app_fontSize"), 10);
        if (!isNaN(savedFont)) applyFontSize(savedFont);

        const savedScript = localStorage.getItem("app_script");
        if (savedScript) applyScript(savedScript);
    }

    function toggleDarkMode() {
        const isDark = !document.body.classList.contains("dark-mode");
        applyDarkMode(isDark);
        localStorage.setItem("app_darkMode", isDark ? "true" : "false");
    }

    function setFontSize(px, el) { 
        applyFontSize(px);
        localStorage.setItem("app_fontSize", String(px));

        if (global.DGE.Modals) {
            global.DGE.Modals.togglePopup("fontPopup");
        } else if (typeof togglePopup === "function") {
            togglePopup("fontPopup"); // Legacy fallback
        }
    }

    function setScript(code, el) { 
        applyScript(code);
        localStorage.setItem("app_script", code);

        if (typeof showToast === "function") {
            showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
        }

        setTimeout(() => {
            if (global.DGE.Render) {
                global.DGE.Render.renderList();

                if (State.activeId && State.els.readingCard) {
                    State.els.readingCard.innerHTML = global.DGE.Render.getText(State.activeId);
                }
            } else if (typeof renderList === "function") {
                renderList(); // Legacy fallback
            }

            if (global.DGE.Modals) {
                global.DGE.Modals.togglePopup("scriptPopup");
            } else if (typeof togglePopup === "function") {
                togglePopup("scriptPopup"); // Legacy fallback
            }
        }, 50);
    }

    function applyTransliteration(htmlText, script) {
        if (script === "devanagari" || !htmlText) return htmlText;

        if (typeof Sanscript === "undefined") {
            console.error("Transliteration engine failed to load. Check internet connection.");
            return htmlText;
        }

        try {
            const parts = htmlText.split(/(<[^>]+>)/g);

            for (let i = 0; i < parts.length; i++) {
                if (!parts[i].startsWith("<")) {
                    let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, "");
                    parts[i] = Sanscript.t(cleanText, "devanagari", script);
                }
            }
            return parts.join("");
        } catch (e) {
            console.error("Transliteration error:", e);
            return htmlText;
        }
    }

    function initAuthAndBranding() {
        const isAuthorized = localStorage.getItem("acharyaAuthorized") === "true";
        if (isAuthorized) document.body.classList.add("is-authorized");

        if (global.appConfig) {
            const authorEl = document.getElementById("stotraAuthor");
            if (authorEl) authorEl.innerText = `DESIGNED BY ${global.appConfig.designedBy.toUpperCase()}`;

            const emailDisplayEl = document.getElementById("contactEmailDisplay");
            if (emailDisplayEl) emailDisplayEl.innerText = global.appConfig.contactEmail;

            const emailLinkEl = document.getElementById("configEmailLink");
            if (emailLinkEl) {
                emailLinkEl.href = `mailto:${global.appConfig.contactEmail}`;
                emailLinkEl.innerText = global.appConfig.contactEmail;
            }

            const footerEl = document.getElementById("appFooter");
            if (footerEl) footerEl.innerText = `${global.appConfig.version} · Designed by ${global.appConfig.designedBy}`;
        }
    }

    /**
     * Note: In the upcoming UI module refactoring, this rendering logic 
     * will be delegated entirely to DGE.Render.init().
     */
    function initApp() {
        const titleEl = document.getElementById("stotraTitle");
        if (titleEl && State.stotraData && State.stotraData.metadata) {
            titleEl.innerHTML = applyTransliteration(
                State.stotraData.metadata.title,
                State.activeScript
            );
        }

        const totalShlokas = State.stotraData?.metadata?.totalShlokas || 43;
        if (State.els.rangeStart) State.els.rangeStart.max = totalShlokas;
        if (State.els.rangeEnd) State.els.rangeEnd.max = totalShlokas;

        const dynamicList = document.getElementById("commentaryDynamicList");
        if (dynamicList) dynamicList.innerHTML = "";

        if (State.els.searchScope) {
            State.els.searchScope.innerHTML =
                '<option value="all">Search All</option>' +
                '<option value="mula">Shloka Only</option>';
        }

        if (State.stotraData?.metadata?.availableCommentaries) {
            Object.entries(State.stotraData.metadata.availableCommentaries).forEach(([key, name]) => {
                if (dynamicList) {
                    dynamicList.innerHTML +=
                        `<div class="pop-item" onclick="setCommentaryView('${key}', this)">` +
                        `${applyTransliteration(name, State.activeScript)}</div>`;
                }
                if (State.els.searchScope) {
                    State.els.searchScope.innerHTML +=
                        `<option value="${key}">${applyTransliteration(name, State.activeScript)} Only</option>`;
                }
            });
        }

        if (State.els.cacheBtn && localStorage.getItem(nsKey("allCached")) === "true") {
            State.els.cacheBtn.innerText = "✅ All Cached";
            State.els.cacheBtn.dataset.cached = "true";
            State.els.cacheBtn.style.background = "#e8f5e9";
            State.els.cacheBtn.style.color = "#2e7d32";
            State.els.cacheBtn.style.borderColor = "#c8e6c9";
        }

        if (global.DGE.Render) {
            global.DGE.Render.renderList();
        } else if (typeof renderList === "function") {
            renderList(); // Legacy fallback
        }
    }

    /**
     * ------------------------------------------------------------
     * Loaders & Core Lifecycle
     * ------------------------------------------------------------
     */

    async function loadConfig() {
        try {
            const response = await fetch("config.json");
            if (response.ok) {
                const cfg = await response.json();
                global.appConfig = global.appConfig || {};
                Object.assign(global.appConfig, cfg);
            }
        } catch (err) {
            console.warn("Config.json not found. Using defaults.");
        }

        const params = new URLSearchParams(window.location.search);
        const pass = params.get("pass");

        if (
            pass &&
            global.appConfig?.secretPasskey &&
            pass.toUpperCase() === global.appConfig.secretPasskey.toUpperCase()
        ) {
            localStorage.setItem("acharyaAuthorized", "true");
        }

        initAuthAndBranding();
    }

    function cacheDOM() {
        // Cache all elements required by Core and legacy startup. 
        // Use Object.assign to preserve references set by other modules.
        Object.assign(State.els, {
            readingCard: document.getElementById("readingCard"),
            searchScope: document.getElementById("searchScope"),
            cacheBtn: document.getElementById("cacheBtn"),
            searchInput: document.getElementById("searchInput"),
            clearSearchBtn: document.getElementById("clearSearchBtn"),
            rangeStart: document.getElementById("rangeStart"),
            rangeEnd: document.getElementById("rangeEnd")
        });
    }

    async function loadGrantha() {
        try {
            const response = await fetch(State.jsonFileName);
            if (!response.ok) throw new Error(State.jsonFileName);

            State.stotraData = await response.json();
            initApp();
        } catch (err) {
            const titleEl = document.getElementById("stotraTitle");
            if (titleEl) titleEl.innerText = "Data Not Found";

            if (State.els.readingCard) {
                State.els.readingCard.innerText = `Unable to load ${State.jsonFileName}`;
            }
            console.error(err);
        }
    }

    /**
     * Note: In Phase 2, this centralized wiring will eventually disappear.
     * Every module (Theme, Audio, Search, Render, etc.) will expose an .init() 
     * method and manage its own event listeners.
     */
    function wireEvents() {
        /* ---------- Theme ---------- */
        const darkBtn = document.getElementById("darkModeBtn");
        if (darkBtn) darkBtn.addEventListener("click", toggleDarkMode);

        /* ---------- Search ---------- */
        if (State.els.searchInput) {
            if (global.DGE.Search && global.DGE.Search.handleSearch) {
                State.els.searchInput.addEventListener("input", global.DGE.Search.handleSearch);
            } else if (typeof handleSearch === "function") {
                State.els.searchInput.addEventListener("input", handleSearch);
            }
        }

        if (State.els.clearSearchBtn) {
            if (global.DGE.Search && global.DGE.Search.clearSearch) {
                State.els.clearSearchBtn.addEventListener("click", global.DGE.Search.clearSearch);
            } else if (typeof clearSearch === "function") {
                State.els.clearSearchBtn.addEventListener("click", clearSearch);
            }
        }

        /* ---------- Audio ---------- */
        if (State.currentAudio && typeof updatePlayUI === "function") {
            State.currentAudio.addEventListener("play", updatePlayUI);
            State.currentAudio.addEventListener("pause", updatePlayUI);
        }

        /* ---------- Safety / UI ---------- */
        document.addEventListener("click", function (e) {
            if (!e.target.closest(".popup-toggle")) {
                document.querySelectorAll(".popup").forEach(p => p.classList.remove("show"));
            }
        });
    }

    async function start() {
        if (Core.started) return;
        Core.started = true;

        restorePrefs();
        await loadConfig();
        cacheDOM();
        await loadGrantha();
        wireEvents();
    }

    /**
     * ------------------------------------------------------------
     * Exports
     * ------------------------------------------------------------
     */

    Core.nsKey = nsKey;
    Core.restorePrefs = restorePrefs;
    Core.toggleDarkMode = toggleDarkMode;
    Core.setFontSize = setFontSize;
    Core.setScript = setScript;
    Core.applyTransliteration = applyTransliteration;
    Core.initAuthAndBranding = initAuthAndBranding;
    Core.initApp = initApp;
    Core.loadConfig = loadConfig;
    Core.cacheDOM = cacheDOM;
    Core.loadGrantha = loadGrantha;
    Core.wireEvents = wireEvents;
    Core.start = start;

    /**
     * ------------------------------------------------------------
     * Auto-Boot
     * ------------------------------------------------------------
     */

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            Core.start();
        }, { once: true });
    } else {
        Core.start();
    }

})(window);

