// DGE Module: transliteration.js
// Maps to Feature F-006: Transliteration Engine
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v2.0 (DOM Text-Node & Cache Engine)';

// Cache layer to store converted text per script and avoid redundant conversions
const transliterationCache = {
  iast: {},
  kannada: {},
  telugu: {},
  tamil: {},
  malayalam: {},
  devanagari: {}
};

/**
 * Transliterates container contents in-place by walking DOM text nodes.
 * Avoids innerHTML regex replacement and preserves active event listeners/DOM state.
 */
window.applyDOMTransliteration = function(rootElement, targetScript) {
  const script = targetScript || window.activeScript || 'devanagari';
  if (!rootElement) return;

  if (script === 'devanagari') {
    // Restore original text if available or skip
    return; 
  }

  if (typeof Sanscript === 'undefined') {
    console.error("Sanscript library not loaded.");
    return;
  }

  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
  let node;
  
  while ((node = walker.nextNode())) {
    const originalText = node.nodeValue;
    if (!originalText || !originalText.trim()) continue;

    // Check cache first
    if (transliterationCache[script][originalText]) {
      node.nodeValue = transliterationCache[script][originalText];
      continue;
    }

    try {
      const cleanText = originalText.replace(/[\u200B-\u200D\uFEFF]/g, '');
      const converted = Sanscript.t(cleanText, 'devanagari', script);
      
      // Store in cache
      transliterationCache[script][originalText] = converted;
      node.nodeValue = converted;
    } catch (e) {
      console.error("Transliteration error on node:", e);
    }
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
      window.applyDOMTransliteration(window.els.readingCard, code);
    }
    if (typeof togglePopup === 'function') togglePopup('scriptPopup');
  }, 50);
};

// Auto-restore saved script preference on boot
(function restoreScriptPref() {
  const savedScript = localStorage.getItem('app_script');
  if (savedScript) window.applyScript(savedScript);
})();
