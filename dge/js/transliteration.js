// js/transliteration.js
// Maps to F-006: ScriptTransliteration

function applyTransliteration(htmlText, script) {
  if (script === 'devanagari' || !htmlText) return htmlText;
  
  if (typeof Sanscript === 'undefined') {
     console.error("Transliteration engine failed to load. Check internet connection.");
     return htmlText; 
  }
  
  try {
      const parts = htmlText.split(/(<[^>]+>)/g);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<')) {
          let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
          parts[i] = Sanscript.t(cleanText, 'devanagari', script);
        }
      }
      return parts.join('');
  } catch (e) {
      console.error("Transliteration error:", e);
      return htmlText;
  }
}

function applyScript(code) {
  if (typeof activeScript !== 'undefined') {
      activeScript = code;
  }
  
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
}

function setScript(code, el) {
  applyScript(code);
  localStorage.setItem('app_script', code);
  
  if (typeof showToast === 'function') {
      showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
  }
  
  setTimeout(() => {
      if (typeof renderList === 'function') renderList();
      
      const readingCard = document.getElementById('readingCard');
      if (typeof activeId !== 'undefined' && activeId && readingCard && typeof getText === 'function') {
          readingCard.innerHTML = getText(activeId);
      }
      
      if (typeof togglePopup === 'function') togglePopup('scriptPopup');
  }, 50);
}
