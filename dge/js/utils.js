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

// --- DYNAMIC DEV LOGGER WITH COPY FUNCTIONALITY ---
(function initDevLogger() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true';
    
    const legacyLog = document.getElementById('mobileDebugLog');
    if (legacyLog) legacyLog.remove();

    if (!isDev) return;

    const dgeLog = document.createElement('div');
    dgeLog.id = 'dgeMobileLogContainer';
    dgeLog.style.cssText = 'display: block; position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.95); color: #0f0; font-family: monospace; font-size: 11px; padding: 10px; z-index: 999999; max-height: 180px; overflow-y: auto; box-sizing: border-box; border-top: 2px solid #0f0; touch-action: pan-y; overscroll-behavior: contain; pointer-events: auto;';
    
    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.innerText = '📋 Copy Logs';
    copyBtn.style.cssText = 'position: absolute; top: 8px; right: 12px; background: #333; color: #fff; border: 1px solid #0f0; padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer; z-index: 1000000;';
    
    // Text container to isolate content for copying
    const logTextContainer = document.createElement('div');
    logTextContainer.style.cssText = 'margin-top: 30px; user-select: text; -webkit-user-select: text; padding-bottom: 20px;';
    logTextContainer.innerHTML = '<strong>📱 DGE Dev Logger Active</strong><br>';

    copyBtn.onclick = () => {
        const textToCopy = logTextContainer.innerText;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerText = '✅ Copied!';
                setTimeout(() => copyBtn.innerText = '📋 Copy Logs', 2000);
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
                setTimeout(() => copyBtn.innerText = '📋 Copy Logs', 2000);
            } catch (err) {
                console.error("Copy fallback failed", err);
            }
            textArea.remove();
        }
    };

    dgeLog.appendChild(copyBtn);
    dgeLog.appendChild(logTextContainer);
    document.body.appendChild(dgeLog);

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
