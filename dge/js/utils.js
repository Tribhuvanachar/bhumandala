window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['utils.js'] = 'v1.2';

window.applyDarkMode = function(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.innerText = isDark ? '🌙' : '☀️';
  const meta = document.getElementById('themeColorMeta');
  if (meta) meta.setAttribute('content', isDark ? '#18120E' : '#FFFDF9');
};

window.toggleDarkMode = function() {
  const isDark = !document.body.classList.contains('dark-mode');
  window.applyDarkMode(isDark);
  localStorage.setItem('app_darkMode', isDark ? 'true' : 'false');
};

window.applyFontSize = function(px) {
  document.documentElement.style.setProperty('--font-multiplier', px + 'px');
  document.querySelectorAll('#fontPopup .pop-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.size, 10) === px);
  });
};

window.setFontSize = function(px, el) {
  window.applyFontSize(px);
  localStorage.setItem('app_fontSize', String(px));
  if (typeof window.togglePopup === 'function') window.togglePopup('fontPopup');
};

window.showToast = function(msg) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
};

// --- DYNAMIC DEV LOGGER WITH COPY / MINIMIZE / CLOSE ---
(function initDevLogger() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true';
    
    const legacyLog = document.getElementById('mobileDebugLog');
    if (legacyLog) legacyLog.remove();

    if (!isDev) return;

    const EXPANDED_HEIGHT = 180;

    const dgeLog = document.createElement('div');
    dgeLog.id = 'dgeMobileLogContainer';
    dgeLog.style.cssText = 'display: block; position: fixed; left: 0; width: 100%; background: rgba(0,0,0,0.95); color: #0f0; font-family: monospace; font-size: 11px; z-index: 999999; max-height: ' + EXPANDED_HEIGHT + 'px; overflow-y: auto; box-sizing: border-box; border-top: 2px solid #0f0; touch-action: pan-y; overscroll-behavior: contain; pointer-events: auto; transition: max-height 0.15s ease;';

    // Header bar: title + Minimize + Close (always visible, even when minimized)
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; background: rgba(0,0,0,0.95); position: sticky; top: 0; border-bottom: 1px solid rgba(0,255,0,0.3); z-index: 2;';

    const title = document.createElement('strong');
    title.innerText = '📱 DGE Dev Logger';
    title.style.cssText = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

    const btnRowStyle = 'background: #333; color: #fff; border: 1px solid #0f0; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer; flex-shrink: 0;';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = '📋 Copy';
    copyBtn.style.cssText = btnRowStyle;

    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerText = '▁ Min';
    minimizeBtn.style.cssText = btnRowStyle;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = btnRowStyle + ' border-color:#ff5555;';

    header.appendChild(title);
    header.appendChild(copyBtn);
    header.appendChild(minimizeBtn);
    header.appendChild(closeBtn);

    // Small reopen tab shown after closing
    const reopenBtn = document.createElement('button');
    reopenBtn.id = 'dgeLogReopenBtn';
    reopenBtn.innerText = '🐞 Logs';
    reopenBtn.style.cssText = 'display:none; position: fixed; left: 10px; background: #111; color: #0f0; border: 1px solid #0f0; padding: 6px 10px; font-size: 11px; font-weight: bold; border-radius: 20px; z-index: 999999; cursor: pointer;';

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
        minimizeBtn.innerText = min ? '▔ Max' : '▁ Min';
    }
    minimizeBtn.onclick = () => setMinimized(!isMinimized);

    closeBtn.onclick = () => {
        dgeLog.style.display = 'none';
        reopenBtn.style.display = 'block';
        positionAboveBottomPlayer();
    };
    reopenBtn.onclick = () => {
        dgeLog.style.display = 'block';
        reopenBtn.style.display = 'none';
        positionAboveBottomPlayer();
    };

    dgeLog.appendChild(header);
    dgeLog.appendChild(logTextContainer);
    document.body.appendChild(dgeLog);
    document.body.appendChild(reopenBtn);

    // Keep the log panel (and the reopen tab) sitting ABOVE the bottom
    // player toolbar instead of overlapping/hiding its controls.
    function positionAboveBottomPlayer() {
        const player = document.querySelector('.bottom-player');
        const playerHeight = player ? player.getBoundingClientRect().height : 0;
        dgeLog.style.bottom = playerHeight + 'px';
        reopenBtn.style.bottom = (playerHeight + 10) + 'px';
    }
    positionAboveBottomPlayer();
    window.addEventListener('resize', positionAboveBottomPlayer);
    window.addEventListener('orientationchange', positionAboveBottomPlayer);

    const oldLog = console.log;
    const oldErr = console.error;

    console.log = function(...args) {
        oldLog(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        logTextContainer.innerHTML += `<span style="color:#0f0;">> ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };

    console.error = function(...args) {
        oldErr(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        logTextContainer.innerHTML += `<span style="color:#ff5555;">> [ERR] ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };
    
    window.onerror = function(msg, url, line) {
        console.error(`Uncaught Error: ${msg} (Line ${line})`);
    };
    
})();

console.log("[Init] utils.js loaded successfully.");
