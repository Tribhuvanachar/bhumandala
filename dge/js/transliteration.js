// DGE Module: transliteration.js
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v1.1 (Global State Fix)';

window.applyTransliteration = function(htmlText, script) {
  const targetScript = script || window.activeScript || 'devanagari';
  if (targetScript === 'devanagari' || !htmlText) return htmlText;
  
  if (typeof Sanscript === 'undefined') {
     console.error("Sanscript library not loaded.");
     return htmlText; 
  }
  
  try {
      const parts = htmlText.split(/(<[^>]+>)/g);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<')) {
          let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
          parts[i] = Sanscript.t(cleanText, 'devanagari', targetScript);
        }
      }
      return parts.join('');
  } catch (e) {
      console.error("Transliteration error:", e);
      return htmlText;
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
      if (window.activeId && window.els && window.els.readingCard) {
          window.els.readingCard.innerHTML = window.getText ? window.getText(window.activeId) : '';
      }
      if (typeof togglePopup === 'function') togglePopup('scriptPopup');
  }, 50);
};

// Auto-restore preferences on load
(function restoreScriptPref() {
  const savedScript = localStorage.getItem('app_script');
  if (savedScript) window.applyScript(savedScript);
})();
