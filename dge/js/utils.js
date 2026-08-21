window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['utils.js'] = 'v2.4 (new window.dgeMakeFloatingDraggable(el, storageKey) -- shared drag-to-reposition + collapse-to-a-dot for position:fixed floating buttons, used by the कोश and global-search FABs)';

window.DGE_THEMES = ['vandana', 'traditional', 'minimal', 'vibrant', 'darkglass'];
window.DGE_THEME_META_COLORS = {
  vandana: '#0B0907',
  traditional: '#FFFDF9',
  minimal: '#FBFBFA',
  vibrant: '#FFF6E8',
  darkglass: '#0E0C0B'
};

window.applyTheme = function(theme) {
  if (window.DGE_THEMES.indexOf(theme) === -1) theme = 'vandana';
  window.activeTheme = theme;

  window.DGE_THEMES.forEach(t => document.body.classList.remove('theme-' + t));
  document.body.classList.add('theme-' + theme);

  // 'dark-mode' is kept as an alias so the couple of legacy selectors that
  // still key off it (search highlight, commentary block tint) stay correct.
  document.body.classList.toggle('dark-mode', theme === 'darkglass' || theme === 'vandana');

  document.querySelectorAll('#displayPopup .pop-item[data-theme]').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === theme);
  });

  const meta = document.getElementById('themeColorMeta');
  if (meta) meta.setAttribute('content', window.DGE_THEME_META_COLORS[theme] || '#FFFDF9');
};

window.setTheme = function(theme, el) {
  window.applyTheme(theme);
  localStorage.setItem('app_theme', theme);
  // (see note in transliteration.js — Display popup stays open)
};

// Legacy aliases kept so nothing that still calls these (or a bookmarked
// console command) throws — they now just map onto the theme system.
window.applyDarkMode = function(isDark) {
  window.applyTheme(isDark ? 'darkglass' : 'traditional');
};
window.toggleDarkMode = function() {
  window.setTheme(window.activeTheme === 'darkglass' ? 'traditional' : 'darkglass');
};

window.applyFontSize = function(px) {
  document.documentElement.style.setProperty('--font-multiplier', px + 'px');
  document.querySelectorAll('#displayPopup .pop-item[data-size]').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.size, 10) === px);
  });
};

// Applies the (possibly per-device overridden) feature flags — hides the
// theme/script picker buttons and the A-B/snippet tools section when
// their flag is off. Chip-level flags (favorite/status/doubt/notes/
// snippet-count) are read directly by render.js on every renderList() call
// instead, since those need to react per-card rather than as a one-time
// show/hide.
window.applyFeatureFlags = function() {
  const flags = (typeof dgeGetEffectiveFeatureFlags === 'function') ? dgeGetEffectiveFeatureFlags() : (window.FEATURE_FLAGS || {});

  const themeBtn = document.getElementById('activeThemeBtn');
  const themeWrap = themeBtn ? themeBtn.closest('div') : null;
  if (themeWrap) themeWrap.style.display = flags.showThemePicker ? '' : 'none';

  const scriptBtn = document.getElementById('activeScriptBtn');
  const scriptWrap = scriptBtn ? scriptBtn.closest('div') : null;
  if (scriptWrap) scriptWrap.style.display = flags.showScriptPicker ? '' : 'none';

  const abSection = document.getElementById('abSnippetToolsSection');
  if (abSection) abSection.style.display = flags.showSnippetTools ? '' : 'none';

  const speedRow = document.getElementById('speedControlRow');
  if (speedRow) speedRow.style.display = flags.showSpeedControl ? '' : 'none';

  const cacheBtn = document.getElementById('cacheBtn');
  if (cacheBtn) cacheBtn.style.display = flags.showPreloadButton ? '' : 'none';

  // Which scripts/languages show up in the 🔠 picker
  const scriptOptions = (typeof dgeGetEffectiveScriptOptions === 'function') ? dgeGetEffectiveScriptOptions() : (window.SCRIPT_OPTIONS || []);
  scriptOptions.forEach(opt => {
    const el = document.querySelector(`#displayPopup .pop-item[data-script][data-script="${opt.id}"]`);
    if (el) el.style.display = opt.enabled ? '' : 'none';
  });

  if (typeof renderList === 'function') renderList();
};

window.setFontSize = function(px, el) {
  window.applyFontSize(px);
  localStorage.setItem('app_fontSize', String(px));
  // (see note in transliteration.js — Display popup stays open)
};

window.showToast = function(msg) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
};

// Reading-card minimize — it's now pinned (sticky) at the top of the
// scrolling list, so this lets it be collapsed to a slim strip instead of
// permanently taking up a big block of vertical space.
window.toggleReadingCardMinimize = function() {
  const wrap = document.getElementById('readingCardWrap');
  const btn = document.getElementById('readingCardToggleBtn');
  if (!wrap) return;
  const isMin = wrap.classList.toggle('minimized');
  if (btn) btn.innerText = isMin ? '⌃' : '⌄';
  localStorage.setItem('readingCardMinimized', isMin ? 'true' : 'false');
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('readingCardMinimized') === 'true') {
    const wrap = document.getElementById('readingCardWrap');
    const btn = document.getElementById('readingCardToggleBtn');
    if (wrap) wrap.classList.add('minimized');
    if (btn) btn.innerText = '⌃';
  }
});

// --- DYNAMIC DEV LOGGER WITH COPY / MINIMIZE / CLOSE ---
(function initDevLogger() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true' || localStorage.getItem('is_superadmin') === 'true';
    
    const legacyLog = document.getElementById('mobileDebugLog');
    if (legacyLog) legacyLog.remove();

    if (!isDev) return;

    const EXPANDED_HEIGHT = 180;

    // Small helper: makes targetEl repositionable anywhere on screen by
    // dragging handleEl, remembering the chosen position across reloads.
    // Pointer Events cover touch and mouse with the same code.
    function makeDraggable(handleEl, targetEl, storageKey) {
        let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (saved) {
                targetEl.style.left = saved.left + 'px';
                targetEl.style.top = saved.top + 'px';
                targetEl.style.right = 'auto';
                targetEl.style.bottom = 'auto';
            }
        } catch (e) { /* ignore, use default position */ }

        handleEl.style.cursor = 'move';
        handleEl.style.touchAction = 'none';

        handleEl.addEventListener('pointerdown', (e) => {
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = targetEl.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            handleEl.setPointerCapture(e.pointerId);
        });

        handleEl.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            let newLeft = startLeft + (e.clientX - startX);
            let newTop = startTop + (e.clientY - startY);
            // Keep at least 40px of the panel reachable on-screen either way.
            newLeft = Math.max(-targetEl.offsetWidth + 40, Math.min(newLeft, window.innerWidth - 40));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
            targetEl.style.left = newLeft + 'px';
            targetEl.style.top = newTop + 'px';
            targetEl.style.right = 'auto';
            targetEl.style.bottom = 'auto';
        });

        handleEl.addEventListener('pointerup', () => {
            if (!dragging) return;
            dragging = false;
            try {
                const rect = targetEl.getBoundingClientRect();
                localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
            } catch (e) { /* ignore */ }
        });
    }

    const dgeLog = document.createElement('div');
    dgeLog.id = 'dgeMobileLogContainer';
    dgeLog.style.cssText = 'display: none; position: fixed; right: 10px; top: 70px; width: min(320px, 90vw); background: rgba(0,0,0,0.95); color: #0f0; font-family: monospace; font-size: 11px; z-index: 999999; max-height: ' + EXPANDED_HEIGHT + 'px; overflow-y: auto; box-sizing: border-box; border: 2px solid #0f0; border-radius: 8px; touch-action: pan-y; overscroll-behavior: contain; pointer-events: auto; transition: max-height 0.15s ease;';

    // Header bar: title + Minimize + Close (always visible, even when minimized)
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; background: rgba(0,0,0,0.95); position: sticky; top: 0; border-bottom: 1px solid rgba(0,255,0,0.3); z-index: 2;';

    const title = document.createElement('strong');
    title.innerText = '📱 DGE Dev Logger';
    title.style.cssText = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

    // Dedicated drag handle — a separate small element with NO click
    // behavior at all, so there's no ambiguity between "tap" and "drag"
    // to get wrong (that ambiguity on the header itself, even after
    // excluding button taps, was still unreliable).
    const dragHandle = document.createElement('span');
    dragHandle.innerText = '✥';
    dragHandle.title = 'Drag to move';
    dragHandle.style.cssText = 'flex-shrink: 0; padding: 2px 8px; font-size: 14px; touch-action: none; cursor: move;';

    const btnRowStyle = 'background: #333; color: #fff; border: 1px solid #0f0; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer; flex-shrink: 0; touch-action: manipulation;';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = '📋 Copy';
    copyBtn.style.cssText = btnRowStyle;

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerText = '⛶ Full';
    fullscreenBtn.style.cssText = btnRowStyle;

    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerText = '▁ Min';
    minimizeBtn.style.cssText = btnRowStyle;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = btnRowStyle + ' border-color:#ff5555;';

    header.appendChild(dragHandle);
    header.appendChild(title);
    header.appendChild(copyBtn);
    header.appendChild(fullscreenBtn);
    header.appendChild(minimizeBtn);
    header.appendChild(closeBtn);

    // Small reopen tab shown after closing
    const reopenBtn = document.createElement('button');
    reopenBtn.id = 'dgeLogReopenBtn';
    reopenBtn.innerText = '🐞 Logs';
    reopenBtn.style.cssText = 'display:block; position: fixed; top: 8px; background: #111; color: #0f0; border: 1px solid #0f0; padding: 6px 10px; font-size: 11px; font-weight: bold; border-radius: 20px; z-index: 999999; cursor: pointer;';

    // Docked next to the "‹ Library" title rather than top-center — centering
    // put it right on top of the commentary selector and other action-row
    // popups, which is what a reader mistook for the tool being broken.
    // Recentered on every popup open (see togglePopup in modals.js) — manual
    // drags are honoured until the next popup open snaps it back. Pages with
    // no top-bar title fall back to the old top-center placement.
    function dgeRecenterLogPill() {
        const titleEl = document.querySelector('.top-bar-title');
        const titleRect = titleEl && titleEl.getBoundingClientRect();
        if (titleRect && titleRect.width) {
            reopenBtn.style.left = Math.min(
                window.innerWidth - reopenBtn.offsetWidth - 8,
                titleRect.right + 8
            ) + 'px';
            reopenBtn.style.top = Math.max(4,
                titleRect.top + (titleRect.height - reopenBtn.offsetHeight) / 2) + 'px';
        } else {
            reopenBtn.style.left = Math.max(8, (window.innerWidth - reopenBtn.offsetWidth) / 2) + 'px';
            reopenBtn.style.top = '8px';
        }
        reopenBtn.style.right = 'auto';
        reopenBtn.style.bottom = 'auto';
        try {
            const r = reopenBtn.getBoundingClientRect();
            localStorage.setItem('dgeLogReopenPos_v3', JSON.stringify({ left: r.left, top: r.top }));
        } catch (e) { /* ignore */ }
    }

    // Text container to isolate content for copying
    const logTextContainer = document.createElement('div');
    logTextContainer.style.cssText = 'padding: 8px; user-select: text; -webkit-user-select: text;';

    copyBtn.onclick = () => {
        const textToCopy = logTextContainer.innerText;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerText = '✅ Copied!';
                setTimeout(() => copyBtn.innerText = '📋 Copy', 2000);
            });
        } else {
            // Fallback for older mobile browsers
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                copyBtn.innerText = '✅ Copied!';
                setTimeout(() => copyBtn.innerText = '📋 Copy', 2000);
            } catch (err) {
                console.error("Copy fallback failed", err);
            }
            textArea.remove();
        }
    };

    let isMinimized = false;
    function setMinimized(min) {
        isMinimized = min;
        logTextContainer.style.display = min ? 'none' : 'block';
        dgeLog.style.maxHeight = min ? 'auto' : EXPANDED_HEIGHT + 'px';
        dgeLog.style.overflowY = min ? 'visible' : 'auto';
        dgeLog.style.width = min ? 'auto' : 'min(320px, 90vw)';
        // Copy/Full aren't meaningful without the log actually open, and
        // hiding them (not just shrinking via width:auto, which alone
        // barely helps with 4 buttons' worth of content still in the row)
        // is what actually makes the collapsed footprint small.
        copyBtn.style.display = min ? 'none' : 'inline-block';
        fullscreenBtn.style.display = min ? 'none' : 'inline-block';
        minimizeBtn.innerText = min ? '▔ Max' : '▁ Min';
    }
    minimizeBtn.onclick = () => setMinimized(!isMinimized);
    // Start collapsed AND narrow so it doesn't dominate the screen on
    // load — previously it kept the full expanded width even while
    // "minimized", which is why it still looked like it was in the way.
    setMinimized(true);

    let isFullscreen = false;
    let preFullscreenStyle = '';
    fullscreenBtn.onclick = () => {
        isFullscreen = !isFullscreen;
        if (isFullscreen) {
            preFullscreenStyle = dgeLog.style.cssText;
            dgeLog.style.cssText = 'display: block; position: fixed; left: 8px; right: 8px; top: 8px; bottom: 8px; width: auto; background: rgba(0,0,0,0.97); color: #0f0; font-family: monospace; font-size: 12px; z-index: 999999; max-height: none; overflow-y: auto; box-sizing: border-box; border: 2px solid #0f0; border-radius: 8px;';
            if (isMinimized) setMinimized(false);
            fullscreenBtn.innerText = '⛶ Exit';
        } else {
            dgeLog.style.cssText = preFullscreenStyle;
            fullscreenBtn.innerText = '⛶ Full';
        }
    };

    closeBtn.onclick = () => {
        dgeLog.style.display = 'none';
        reopenBtn.style.display = 'block';
    };
    reopenBtn.onclick = () => {
        dgeLog.style.display = 'block';
        reopenBtn.style.display = 'none';
    };

    dgeLog.appendChild(header);
    dgeLog.appendChild(logTextContainer);
    document.body.appendChild(dgeLog);
    document.body.appendChild(reopenBtn);

    // Floats anywhere on screen now instead of being docked full-width to
    // the bottom — drag via the dedicated ✥ handle (or the small pill
    // when minimized to reopen-tab form), position remembered across
    // reloads.
    makeDraggable(dragHandle, dgeLog, 'dgeLogPanelPos_v3');
    makeDraggable(reopenBtn, reopenBtn, 'dgeLogReopenPos_v3');
    // Overrides whatever makeDraggable just restored from a stale saved
    // position — the pill always starts centered on a fresh load; a saved
    // off-center spot from dragging earlier in THIS session is only
    // meaningful until the next popup open snaps it back anyway.
    dgeRecenterLogPill();

    const oldLog = console.log;
    const oldWarn = console.warn;
    const oldErr = console.error;

    // JSON.stringify on a genuine Error object produces "{}" — its
    // message/stack are non-enumerable own properties, so they get
    // silently dropped, hiding the actual reason behind every error this
    // panel shows. Extracting .message explicitly for Error objects (and
    // falling back to normal string/JSON handling for everything else)
    // fixes that for all three console overrides below.
    function dgeFormatLogArg(a) {
        if (a instanceof Error) return a.message || String(a);
        return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }

    console.log = function(...args) {
        oldLog(...args);
        const msg = args.map(dgeFormatLogArg).join(' ');
        logTextContainer.innerHTML += `<span style="color:#0f0;">> ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };

    console.warn = function(...args) {
        oldWarn(...args);
        const msg = args.map(dgeFormatLogArg).join(' ');
        logTextContainer.innerHTML += `<span style="color:#ffcc00;">> [WARN] ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };

    console.error = function(...args) {
        oldErr(...args);
        const msg = args.map(dgeFormatLogArg).join(' ');
        logTextContainer.innerHTML += `<span style="color:#ff5555;">> [ERR] ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };
    
    window.onerror = function(msg, url, line) {
        console.error(`Uncaught Error: ${msg} (Line ${line})`);
    };

    // Several features added recently (Ask Acharya, snippet download/share,
    // audio caching) are async functions. A thrown error inside one of
    // those becomes an unhandled promise rejection, which window.onerror
    // does NOT catch — only this listener does.
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const msg = (reason && reason.message) ? reason.message : String(reason);
        console.error(`Unhandled Promise Rejection: ${msg}`);
    });

    // Public API so other modules (e.g. dev.js) can feed content into THIS
    // single log panel instead of creating their own separate overlay.
    window.DGE_DEV_LOG = {
        appendHTML: function(html) {
            logTextContainer.innerHTML += html;
            dgeLog.scrollTop = dgeLog.scrollHeight;
        },
        // Called from togglePopup() (modals.js) whenever any dropdown/popup
        // opens, so the pill can never end up sitting on top of it.
        recenterPill: dgeRecenterLogPill
    };

})();

// Shared drag-to-reposition + collapse-to-a-dot behaviour for every
// position:fixed floating action button (कोश, global search 🔎) -- was
// each independently a plain fixed-position button with no way to move it
// out from behind content it happened to land on, and no way to shrink it
// out of the way on a small screen. One shared implementation so a fix to
// the drag logic (see content-inline.js's own wireDrag, which this mirrors
// for its document-level pointer tracking and click-vs-drag threshold)
// benefits every floating button at once instead of drifting between
// separately-maintained copies.
window.dgeMakeFloatingDraggable = function (el, storageKey) {
    var POS_KEY = 'dge.fabPos.' + storageKey;
    var COLLAPSE_KEY = 'dge.fabCollapsed.' + storageKey;

    function loadPos() {
        try {
            var p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
            if (p && typeof p.xFrac === 'number' && typeof p.yFrac === 'number') return p;
        } catch (e) { /* fall through to default (the button's own CSS position) */ }
        return null;
    }
    function savePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } }
    function loadCollapsed() { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (e) { return false; } }
    function saveCollapsed(v) { try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch (e) { /* ignore */ } }

    function clampToViewport(left, top) {
        var r = el.getBoundingClientRect();
        var w = r.width || 56, h = r.height || 56;
        return {
            left: Math.min(Math.max(left, 4), window.innerWidth - w - 4),
            top: Math.min(Math.max(top, 4), window.innerHeight - h - 4)
        };
    }

    var pos = loadPos();
    if (pos) {
        var abs = clampToViewport(pos.xFrac * window.innerWidth, pos.yFrac * window.innerHeight);
        el.style.left = abs.left + 'px'; el.style.top = abs.top + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
    }
    el.style.position = 'fixed';

    // A small always-present corner handle collapses the button to a dot at
    // its current position -- deliberately a separate element from the fab
    // itself (rather than, say, a long-press on the fab) so it never
    // conflicts with the fab's own click-to-open behaviour or the drag
    // threshold below.
    var collapseBtn = document.createElement('span');
    collapseBtn.textContent = '−';
    collapseBtn.title = 'Collapse';
    collapseBtn.setAttribute('aria-label', 'Collapse');
    collapseBtn.style.cssText = 'position:absolute; top:-6px; right:-6px; width:18px; height:18px; ' +
        'line-height:17px; text-align:center; border-radius:50%; background:var(--card-bg,#fff); ' +
        'color:var(--text-primary,#333); font-size:14px; font-weight:700; box-shadow:0 1px 4px rgba(0,0,0,.35); ' +
        'cursor:pointer; z-index:1;';
    el.appendChild(collapseBtn);

    function setCollapsed(v) {
        el.classList.toggle('dge-fab-collapsed', v);
        el.style.transform = v ? 'scale(0.42)' : '';
        el.style.opacity = v ? '0.5' : '';
        collapseBtn.style.display = v ? 'none' : '';
        saveCollapsed(v);
    }
    setCollapsed(loadCollapsed());
    collapseBtn.addEventListener('click', function (ev) {
        ev.stopPropagation(); ev.preventDefault();
        setCollapsed(true);
    });

    // Dragging and collapse-state interact: while collapsed, a tap anywhere
    // on the (now tiny) button should re-expand it rather than triggering
    // whatever the button's own click handler normally does -- opening
    // Kosha/search on a button the reader deliberately shrank out of the
    // way would be a worse surprise than just needing a second tap.
    var dragging = false, moved = false, justDragged = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    el.addEventListener('click', function (ev) {
        if (el.classList.contains('dge-fab-collapsed')) {
            ev.stopImmediatePropagation(); ev.preventDefault();
            setCollapsed(false);
            return;
        }
        if (justDragged) { ev.stopImmediatePropagation(); ev.preventDefault(); }
    }, true);
    el.addEventListener('pointerdown', function (ev) {
        if (ev.target === collapseBtn) return;
        dragging = true; moved = false;
        startX = ev.clientX; startY = ev.clientY;
        var r = el.getBoundingClientRect();
        startLeft = r.left; startTop = r.top;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });
    function onMove(ev) {
        if (!dragging) return;
        var dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 6) return; // still within click/tap tolerance
        moved = true;
        var clamped = clampToViewport(startLeft + dx, startTop + dy);
        el.style.left = clamped.left + 'px'; el.style.top = clamped.top + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
    }
    function onUp() {
        if (!dragging) return;
        dragging = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (!moved) return; // a plain tap -- let the button's own click handler run
        moved = false;
        justDragged = true;
        setTimeout(function () { justDragged = false; }, 0); // cleared after this tick's click, if any, is swallowed
        var r = el.getBoundingClientRect();
        savePos({ xFrac: r.left / window.innerWidth, yFrac: r.top / window.innerHeight });
    }
    // A saved position from a wider/taller viewport (rotated phone, resized
    // window) could otherwise sit off-screen or under the notch.
    window.addEventListener('resize', function () {
        var r = el.getBoundingClientRect();
        var clamped = clampToViewport(r.left, r.top);
        if (clamped.left !== r.left || clamped.top !== r.top) {
            el.style.left = clamped.left + 'px'; el.style.top = clamped.top + 'px';
        }
    });
};

console.log("[Init] utils.js loaded successfully.");
