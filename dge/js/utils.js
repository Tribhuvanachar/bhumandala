// js/utils.js
// Maps to Feature: Theme & Utilities

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['utils.js'] = 'v1.1';

function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.innerText = isDark ? '🌙' : '☀️';
    
    const meta = document.getElementById('themeColorMeta');
    if (meta) meta.setAttribute('content', isDark ? '#18120E' : '#FFFDF9');
}

function toggleDarkMode() {
    const isDark = !document.body.classList.contains('dark-mode');
    applyDarkMode(isDark);
    localStorage.setItem('app_darkMode', isDark ? 'true' : 'false');
}

function applyFontSize(px) {
    document.documentElement.style.setProperty('--font-multiplier', px + 'px');
    document.querySelectorAll('#fontPopup .pop-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.size, 10) === px);
    });
}

function setFontSize(px, el) {
    applyFontSize(px);
    localStorage.setItem('app_fontSize', String(px));
    if (typeof togglePopup === 'function') togglePopup('fontPopup');
}

function showToast(msg) {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    
    toast.innerText = msg;
    toast.style.display = 'block';
    
    setTimeout(() => { 
        toast.style.display = 'none'; 
    }, 3000);
}

// Dev Logger Guardrail Initialization
(function initDevLogger() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true';
    
    // Force hide any legacy mobile log containers that might be injected by older scripts
    const legacyLog = document.getElementById('mobileLogContainer');
    if (legacyLog) legacyLog.style.display = 'none !important';

    if (!isDev) return;

    // Initialize an isolated DGE logger
    let dgeLog = document.getElementById('dgeMobileLogContainer');
    if (!dgeLog) {
        dgeLog = document.createElement('div');
        dgeLog.id = 'dgeMobileLogContainer';
        document.body.appendChild(dgeLog);
    }
    
    dgeLog.style.display = 'block';
    dgeLog.style.cssText = 'position:fixed; bottom:0; left:0; width:100%; height:200px; background:rgba(0,0,0,0.95); color:#0f0; overflow-y:auto; z-index:2147483647; font-family:monospace; font-size:11px; padding:10px; border-top:2px solid #0f0; box-sizing:border-box; word-wrap:break-word; pointer-events:auto;';
    
    const oldLog = console.log;
    const oldErr = console.error;
    
    console.log = function(...args) {
        oldLog(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        dgeLog.innerHTML += `<div style="margin-bottom:4px;">[LOG] ${msg}</div>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };
    
    console.error = function(...args) {
        oldErr(...args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        dgeLog.innerHTML += `<div style="margin-bottom:4px; color:#ff5555;">[ERR] ${msg}</div>`;
        dgeLog.scrollTop = dgeLog.scrollHeight;
    };
    
    console.log("DGE Dev Logger Initialized.");
})();
