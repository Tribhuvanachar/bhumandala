// DGE Module: transliteration.js
// Maps to Feature F-006: Aksharamukha Transliteration Engine
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v2.1 (Aksharamukha DOM & Cache Engine)';

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
 * Transliterates container contents in-place by walking DOM text nodes via Aksharamukha.
 */
window.applyDOMTransliteration = async function(rootElement, targetScript) {
  const script = targetScript || window.activeScript || 'devanagari';
  if (!rootElement || script === 'devanagari') return;

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
      // Convert via Aksharamukha API / Global function if available
      let converted = cleanText;
      if (typeof Aksharamukha !== 'undefined' && Aksharamukha.transliterate) {
        converted = await Aksharamukha.transliterate({
          text: cleanText,
          from: 'Devanagari',
          to: script.charAt(0).toUpperCase() + script.slice(1)
        });
      }
      
      transliterationCache[script][originalText] = converted;
      node.nodeValue = converted;
    } catch (e) {
      console.error("Aksharamukha transliteration error:", e);
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

window.setScript = async function(code, el) {
  window.applyScript(code);
  localStorage.setItem('app_script', code);
  
  if (typeof showToast === 'function') {
    showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
  }
  
  setTimeout(async () => {
    if (typeof renderList === 'function') renderList();
    if (window.activeId && window.els && window.els.readingCard) {
      window.els.readingCard.innerHTML = window.getText ? window.getText(window.activeId) : '';
      await window.applyDOMTransliteration(window.els.readingCard, code);
    }
    if (typeof togglePopup === 'function') togglePopup('scriptPopup');
  }, 50);
};

// Auto-restore saved script preference on boot
(function restoreScriptPref() {
  const savedScript = localStorage.getItem('app_script');
  if (savedScript) window.applyScript(savedScript);
})();
