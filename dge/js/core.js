/**
 * DGE/js/core.js
 * Phase 1 migration
 * Source: functions.js
 *
 * Migrated:
 *   - nsKey()
 *   - restorePrefs()
 *   - initAuthAndBranding()
 *   - required private helpers:
 *       applyDarkMode()
 *       applyFontSize()
 *       applyScript()
 *
 * Behavior intentionally preserved 1:1.
 */

(function (global) {
  "use strict";

  /**
   * ------------------------------------------------------------
   * Private Helpers
   * ------------------------------------------------------------
   */

  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark-mode", isDark);

    const btn = document.getElementById("darkModeBtn");
    if (btn) {
      btn.innerText = isDark ? "🌙" : "☀️";
    }

    const meta = document.getElementById("themeColorMeta");
    if (meta) {
      meta.setAttribute("content", isDark ? "#18120E" : "#FFFDF9");
    }
  }

  function applyFontSize(px) {
    document.documentElement.style.setProperty(
      "--font-multiplier",
      px + "px"
    );

    document
      .querySelectorAll("#fontPopup .pop-item")
      .forEach((el) => {
        el.classList.toggle(
          "active",
          parseInt(el.dataset.size, 10) === px
        );
      });
  }

  function applyScript(code) {
    global.activeScript = code;

    document
      .querySelectorAll("#scriptPopup .pop-item")
      .forEach((el) => {
        if (el.dataset.script) {
          el.classList.toggle(
            "active",
            el.dataset.script === code
          );
        }
      });

    if (code !== "devanagari") {
      document.body.classList.add("non-devanagari");
    } else {
      document.body.classList.remove("non-devanagari");
    }
  }

  /**
   * ------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------
   */

  function nsKey(base) {
    return `narasimha_${base}_${global.stotraCode}`;
  }

  function initAuthAndBranding() {
    const isAuthorized =
      localStorage.getItem("acharyaAuthorized") === "true";

    if (isAuthorized) {
      document.body.classList.add("is-authorized");
    }

    document.getElementById("stotraAuthor").innerText =
      `DESIGNED BY ${global.appConfig.designedBy.toUpperCase()}`;

    document.getElementById("contactEmailDisplay").innerText =
      global.appConfig.contactEmail;

    document.getElementById("configEmailLink").href =
      `mailto:${global.appConfig.contactEmail}`;

    document.getElementById("configEmailLink").innerText =
      global.appConfig.contactEmail;

    document.getElementById("appFooter").innerText =
      `${global.appConfig.version} · Designed by ${global.appConfig.designedBy}`;
  }

  function restorePrefs() {
    applyDarkMode(
      localStorage.getItem("app_darkMode") === "true"
    );

    const savedFont = parseInt(
      localStorage.getItem("app_fontSize"),
      10
    );

    if (!isNaN(savedFont)) {
      applyFontSize(savedFont);
    }

    const savedScript =
      localStorage.getItem("app_script");

    if (savedScript) {
      applyScript(savedScript);
    }
  }

  /**
   * Preserve original Phase-1 startup behavior.
   */
  restorePrefs();

  /**
   * ------------------------------------------------------------
   * Exports
   * ------------------------------------------------------------
   */

  global.DGE = global.DGE || {};
  global.DGE.Core = global.DGE.Core || {};

  global.DGE.Core.nsKey = nsKey;
  global.DGE.Core.restorePrefs = restorePrefs;
  global.DGE.Core.initAuthAndBranding = initAuthAndBranding;

})(window);

/**
 * ------------------------------------------------------------------
 * Phase 1 Migration – Part 2
 *
 * Migrated:
 *   • applyTransliteration()
 *   • setScript()
 *   • toggleDarkMode()
 *   • setFontSize()
 *   • initApp()
 *
 * Depends on:
 *   • nsKey()
 *   • restorePrefs()
 *   • initAuthAndBranding()
 *   • applyDarkMode()
 *   • applyFontSize()
 *   • applyScript()
 *
 * Behaviour preserved exactly from Phase 1.
 * ------------------------------------------------------------------
 */

(function (global) {
    "use strict";

    const Core = global.DGE.Core;

    function toggleDarkMode() {
        const isDark = !document.body.classList.contains("dark-mode");
        Core._applyDarkMode(isDark);
        localStorage.setItem(
            "app_darkMode",
            isDark ? "true" : "false"
        );
    }

    function setFontSize(px, el) { // el intentionally retained for compatibility
        Core._applyFontSize(px);
        localStorage.setItem("app_fontSize", String(px));
        togglePopup("fontPopup");
    }

    function applyTransliteration(htmlText, script) {
        if (script === "devanagari" || !htmlText) {
            return htmlText;
        }

        if (typeof Sanscript === "undefined") {
            console.error(
                "Transliteration engine failed to load. Check internet connection."
            );
            return htmlText;
        }

        try {
            const parts = htmlText.split(/(<[^>]+>)/g);

            for (let i = 0; i < parts.length; i++) {
                if (!parts[i].startsWith("<")) {
                    let cleanText = parts[i].replace(
                        /[\u200B-\u200D\uFEFF]/g,
                        ""
                    );

                    parts[i] = Sanscript.t(
                        cleanText,
                        "devanagari",
                        script
                    );
                }
            }

            return parts.join("");
        } catch (e) {
            console.error("Transliteration error:", e);
            return htmlText;
        }
    }

    function setScript(code, el) { // el retained intentionally
        Core._applyScript(code);

        localStorage.setItem("app_script", code);

        showToast(
            "आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)"
        );

        setTimeout(() => {
            renderList();

            if (activeId) {
                els.readingCard.innerHTML = getText(activeId);
            }

            togglePopup("scriptPopup");
        }, 50);
    }

    function initApp() {
        document.getElementById("stotraTitle").innerHTML =
            applyTransliteration(
                stotraData.metadata.title,
                activeScript
            );

        document.getElementById("rangeStart").max =
            stotraData.metadata.totalShlokas || 43;

        document.getElementById("rangeEnd").max =
            stotraData.metadata.totalShlokas || 43;

        const dynamicList =
            document.getElementById(
                "commentaryDynamicList"
            );

        dynamicList.innerHTML = "";

        els.searchScope.innerHTML =
            '<option value="all">Search All</option>' +
            '<option value="mula">Shloka Only</option>';

        if (stotraData.metadata.availableCommentaries) {
            Object.entries(
                stotraData.metadata.availableCommentaries
            ).forEach(([key, name]) => {
                dynamicList.innerHTML +=
                    `<div class="pop-item" onclick="setCommentaryView('${key}', this)">` +
                    `${applyTransliteration(name, activeScript)}` +
                    `</div>`;

                els.searchScope.innerHTML +=
                    `<option value="${key}">` +
                    `${applyTransliteration(name, activeScript)}` +
                    ` Only</option>`;
            });
        }

        if (
            localStorage.getItem(
                Core.nsKey("allCached")
            ) === "true"
        ) {
            els.cacheBtn.innerText = "✅ All Cached";
            els.cacheBtn.dataset.cached = "true";
            els.cacheBtn.style.background = "#e8f5e9";
            els.cacheBtn.style.color = "#2e7d32";
            els.cacheBtn.style.borderColor = "#c8e6c9";
        }

        renderList();
    }

    Core.toggleDarkMode = toggleDarkMode;
    Core.setFontSize = setFontSize;
    Core.applyTransliteration = applyTransliteration;
    Core.setScript = setScript;
    Core.initApp = initApp;

})(window);

/**
 * ------------------------------------------------------------
 * Phase 1 Migration – Part 3
 *
 * Bootstrap & Startup Lifecycle
 *
 * Responsibilities:
 *   • One-time application startup
 *   • DOM event wiring
 *   • Module initialization order
 *   • Preserve legacy Phase-1 startup behaviour
 * ------------------------------------------------------------
 */

(function (global) {
    "use strict";

    const Core = global.DGE.Core;

    let initialized = false;

    /**
     * ------------------------------------------------------------
     * Attach all startup event listeners.
     * Each module owns its implementation;
     * Core only wires everything together.
     * ------------------------------------------------------------
     */
    function wireEvents() {

        /* ---------- Theme ---------- */

        const darkBtn = document.getElementById("darkModeBtn");
        if (darkBtn) {
            darkBtn.addEventListener("click", Core.toggleDarkMode);
        }

        /* ---------- Search ---------- */

        if (els.searchInput) {
            els.searchInput.addEventListener("input", handleSearch);
        }

        if (els.clearSearchBtn) {
            els.clearSearchBtn.addEventListener("click", clearSearch);
        }

        /* ---------- Audio ---------- */

        currentAudio.addEventListener("play", updatePlayUI);

        currentAudio.addEventListener("pause", updatePlayUI);

        /*
         * The remaining listeners (timeupdate,
         * loadedmetadata, ended, error etc.)
         * remain exactly as implemented in
         * Audio.js and should be registered there
         * or migrated unchanged later.
         */

        /* ---------- Safety ---------- */

        document.addEventListener("click", function (e) {

            if (!e.target.closest(".popup-toggle")) {
                document
                    .querySelectorAll(".popup")
                    .forEach(p => p.classList.remove("show"));
            }

        });

    }

    /**
     * ------------------------------------------------------------
     * One-time application bootstrap.
     * ------------------------------------------------------------
     */
    function bootstrap() {

        if (initialized) {
            return;
        }

        initialized = true;

        /*
         * Restore user preferences.
         */
        Core.restorePrefs();

        /*
         * Initialize branding.
         */
        Core.initAuthAndBranding();

        /*
         * Initialize application.
         */
        Core.initApp();

        /*
         * Attach event listeners.
         */
        wireEvents();

    }

    /**
     * ------------------------------------------------------------
     * Public exports
     * ------------------------------------------------------------
     */

    Core.bootstrap = bootstrap;
    Core.wireEvents = wireEvents;

    /**
     * ------------------------------------------------------------
     * Preserve legacy startup behaviour.
     * ------------------------------------------------------------
     */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            bootstrap,
            { once: true }
        );

    } else {

        bootstrap();

    }

})(window);
/**
 * ============================================================
 * Core Lifecycle
 * ============================================================
 */

async function loadConfig() {

    try {

        const response = await fetch("config.json");

        if (response.ok) {

            const cfg = await response.json();

            Object.assign(appConfig, cfg);

        }

    } catch (err) {

        console.warn("Config.json not found. Using defaults.");

    }

    const params = new URLSearchParams(window.location.search);

    const pass = params.get("pass");

    if (
        pass &&
        appConfig.secretPasskey &&
        pass.toUpperCase() === appConfig.secretPasskey.toUpperCase()
    ) {
        localStorage.setItem("acharyaAuthorized", "true");
    }

    Core.initAuthAndBranding();

}


async function loadGrantha() {

    try {

        const response = await fetch(jsonFileName);

        if (!response.ok) {

            throw new Error(jsonFileName);

        }

        stotraData = await response.json();

        Core.initApp();

    } catch (err) {

        document.getElementById("stotraTitle").innerText =
            "Data Not Found";

        els.readingCard.innerText =
            `Unable to load ${jsonFileName}`;

        console.error(err);

    }

}


async function start() {

    if (Core.started) {
        return;
    }

    Core.started = true;

    Core.restorePrefs();

    await loadConfig();

    await loadGrantha();

    Core.wireEvents();

}

































