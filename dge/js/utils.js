window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['utils.js'] = 'v1.1';

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
  
  setTimeout(() => { 
      toast.style.display = 'none'; 
  }, 3000);
};

// --- DYNAMIC DEV LOGGER FIX ---
// Automatically evaluates ?dev=true without rendering hardcoded UI blocks.
(function initDevLogger() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true';
    
    // Safety check to remove any legacy hardcoded HTML containers
    const legacyLog = document.getElementById('mobileDebugLog');
    if (legacyLog) legacyLog.remove();

    if (!isDev) return;

    // Create an isolated container only when active
    const dgeLog = document.createElement('div');
    dgeLog.id = 'dgeMobileLogContainer';
    dgeLog.style.cssText = 'display: block; position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.95); color: #0f0; font-family: monospace; font-size: 11px; padding: 10px; z-index: 999999; max-height: 150px; overflow-y: auto; box-sizing: border-box; border-top: 2px solid #0f0; pointer-events: none;';
    dgeLog.innerHTML = '<strong>📱 DGE Dev Logger Active</strong><br>';
    document.body.appendChild(dgeLog);

    const oldLog = console.log;
    const oldErr = console.error;

    console.log = function(...args) {
        oldLog(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        dgeLog.innerHTML += `<span style="color:#0f0;">> ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };

    console.error = function(...args) {
        oldErr(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        dgeLog.innerHTML += `<span style="color:#ff5555;">> [ERR] ${msg}</span><br>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };
    
    window.onerror = function(msg, url, line) {
        console.error(`Uncaught Error: ${msg} (Line ${line})`);
    };
    
    console.log("Logger successfully initialized via URL parameters.");
})();
