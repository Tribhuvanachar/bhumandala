// DGE Module: transliteration.js
// Maps to Feature F-006: DOM Text-Node Transliteration & Caching Engine
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v3.0 (DOM Text-Node & Cache Engine)';

const transliterationCache = {
  iast: {},
  kannada: {},
  telugu: {},
  tamil: {},
  malayalam: {},
  devanagari: {}
};

/**
 * Converts a raw string using caching and Sanscript.
 */
window.convertText = function(text, script) {
  const targetScript = script || window.activeScript || 'devanagari';
  if (!text || targetScript === 'devanagari') return text;
  
  if (transliterationCache[targetScript][text]) {
    return transliterationCache[targetScript][text];
  }
  
  if (typeof Sanscript === 'undefined') {
    console.error("Sanscript library not loaded.");
    return text;
  }
  
  try {
    const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const converted = Sanscript.t(cleanText, 'devanagari', targetScript);
    transliterationCache[targetScript][text] = converted;
    return converted;
  } catch (e) {
    console.error("Transliteration error:", e);
    return text;
  }
};

window.applyScript = function(code) {
  window.activeScript = code;
  document.querySelectorAll('#scriptPopup .pop-item').forEach(el => {
    if (el.dataset.script) {
      el.classList.toggle('active', el.dataset.script === code);
    }
  });
  if (code !== 'devanagari') {
    document.body.classList.add('non-devanagari');
  } else {
    document.body.classList.remove('non-devanagari');
  }
};

window.setScript = function(code, el) {
  window.applyScript(code);
  localStorage.setItem('app_script', code);
  
  if (typeof showToast === 'function') {
    showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
  }
  
  setTimeout(() => {
    if (typeof renderList === 'function') renderList();
    document.querySelectorAll('.popup').forEach(p => p.classList.remove('show'));
  }, 50);
};

// Auto-restore saved script preference on load
(function restoreScriptPref() {
  const savedScript = localStorage.getItem('app_script');
  if (savedScript) window.applyScript(savedScript);
})();
