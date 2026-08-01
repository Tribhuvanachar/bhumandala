// js/voice.js
// Maps to F-015: Voice Search
// Speech-to-text for the search box using the Web Speech API. Works well
// on Chrome/Android (webkitSpeechRecognition); largely unsupported on
// Firefox and has limited support on iOS Safari — the mic button just
// hides itself if the API isn't available rather than showing something
// broken.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['voice.js'] = 'v1.0';

let dgeRecognition = null;
let dgeListening = false;

function dgeGetSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

window.startSearchVoiceInput = function() {
  const Ctor = dgeGetSpeechRecognitionCtor();
  const micBtn = document.getElementById('searchMicBtn');
  const searchInput = document.getElementById('searchInput');
  if (!Ctor || !searchInput) return;

  if (dgeListening && dgeRecognition) {
    dgeRecognition.stop();
    return;
  }

  dgeRecognition = new Ctor();
  dgeRecognition.lang = document.documentElement.lang || 'en-IN';
  dgeRecognition.interimResults = true;
  dgeRecognition.maxAlternatives = 1;

  dgeRecognition.onstart = () => {
    dgeListening = true;
    if (micBtn) micBtn.classList.add('mic-listening');
  };

  dgeRecognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    searchInput.value = transcript;
    if (typeof window.handleSearch === 'function') window.handleSearch();
  };

  dgeRecognition.onerror = (event) => {
    if (typeof showToast === 'function') {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        showToast('Microphone access was blocked — allow it in your browser settings to use voice search.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        showToast("Couldn't hear that — try again.");
      }
    }
  };

  dgeRecognition.onend = () => {
    dgeListening = false;
    if (micBtn) micBtn.classList.remove('mic-listening');
  };

  try {
    dgeRecognition.start();
  } catch (e) {
    console.warn('Speech recognition failed to start:', e);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const micBtn = document.getElementById('searchMicBtn');
  if (micBtn && !dgeGetSpeechRecognitionCtor()) {
    micBtn.style.display = 'none';
  }
});
