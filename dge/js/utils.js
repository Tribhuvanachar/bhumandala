// js/utils.js
// Maps to Feature: Theme & Utilities

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['utils.js'] = 'v1.0';
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
