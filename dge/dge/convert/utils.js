// dge/convert/utils.js — shared helpers, window.DGE.Utils namespace
window.DGE = window.DGE || {};
window.DGE.Utils = (function () {

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.substring(reader.result.indexOf(',') + 1));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function saveProgress(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/unavailable — non-fatal */ }
  }
  function loadProgress(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function clearProgress(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // LLMs sometimes wrap JSON output in ```json fences or add stray text
  // despite instructions not to — this strips fences first, then falls
  // back to extracting the outermost {...} block before giving up.
  function parseJsonLoose(text) {
    let cleaned = String(text).trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e2) { /* fall through */ }
      }
      throw new Error('Could not parse JSON from the model\'s response: ' + e.message);
    }
  }

  function formatError(e) {
    if (e && e.message) return e.message;
    return String(e);
  }

  return { fileToBase64, downloadJson, saveProgress, loadProgress, clearProgress, parseJsonLoose, formatError };
})();
