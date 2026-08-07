// DGE Module: audio.js
// js/audio.js
// Maps to F-004 (Audio Engine) & F-013 (Offline Cache)
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['audio.js'] = 'v3.0 (Speed memory, resume, progress, swipe nav, long-press word lookup)';

function formatTime(s) { 
  if (isNaN(s)) return "0:00.000"; 
  const m = Math.floor(s/60), sec = Math.floor(s%60), ms = Math.floor((s%1)*1000); 
  return m + ":" + (sec<10?"0":"") + sec + "." + String(ms).padStart(3,'0'); 
}

function updateRepeatDisplay() { 
  const repeatInput = document.getElementById('repeatInput');
  const repeatCounter = document.getElementById('repeatCounter');
  if (!repeatInput || !repeatCounter) return;
  
  const t = parseInt(repeatInput.value) || 1; 
  repeatCounter.innerText = (activeId && t > 1) ? `Loop ${currentLoopCount + 1}/${t}` : ""; 
}

function updatePlayUI() { 
  const playBtn = document.getElementById('playBtn');
  const readingCard = document.getElementById('readingCard');
  
  if (playBtn) playBtn.innerHTML = isPlaying ? '⏸' : '▶'; 
  if (activeId && readingCard) readingCard.classList.toggle('highlight', isPlaying); 
}

// Configurable Audio Source: swaps the shared host prefix stored in
// stotraData.metadata.archiveBaseUrl for whatever's currently effective
// (end-user override, then super-admin config, then the hardcoded
// default) — see dgeApplyAudioBaseUrlOverride in config.js. Every
// per-grantha identifier/folder after that prefix is untouched.
function dgeEffectiveArchiveBase() {
  const raw = stotraData.metadata.archiveBaseUrl;
  return (typeof window.dgeApplyAudioBaseUrlOverride === 'function') ? window.dgeApplyAudioBaseUrlOverride(raw) : raw;
}

async function resolveAudioSrc(id) {
  if (!stotraData || !stotraData.metadata) return "";

  const base = dgeEffectiveArchiveBase();
  const primary = `${base}${stotraData.metadata.filePrefix}${id}${stotraData.metadata.fileExtension}`;
  const alt = `${base}${stotraData.metadata.filePrefix}${id}%E2%80%8B${stotraData.metadata.fileExtension}`;
  
  if ('caches' in window) {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const hit = (await cache.match(primary)) || (await cache.match(alt));
      if (hit) { 
        const blob = await hit.blob(); 
        return URL.createObjectURL(blob); 
      }
    } catch (e) {
      console.warn("Offline cache read error:", e);
    }
  }
  return primary;
}

// Fills the thin progress bar under the N/total label — a quick visual
// sense of how far through the stotra the current verse is.
function dgeUpdateProgressIndicator(id, total) {
  const fill = document.getElementById('verseProgressFill');
  if (!fill || !total) return;
  const pct = Math.max(0, Math.min(100, (id / total) * 100));
  fill.style.width = pct + '%';
}
window.dgeUpdateProgressIndicator = dgeUpdateProgressIndicator;

// On load, shows the last-played verse's text in the reading-card (and
// updates the track label / progress bar) WITHOUT auto-playing audio —
// autoplay is broadly blocked by browsers anyway, and starting sound
// unexpectedly on load is poor manners even where it isn't. This just
// picks up the reading experience where it left off; tapping play then
// starts that same verse normally.
function dgeRestoreLastVerse() {
  if (!stotraData || activeId) return; // don't override an explicit selection
  const key = typeof nsKey === 'function' ? nsKey('lastVerse') : null;
  if (!key) return;
  const saved = parseInt(localStorage.getItem(key), 10);
  if (!saved || !stotraData.shlokas || !stotraData.shlokas[saved]) return;

  contextShlokaId = saved;
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;
  const trackLabel = document.getElementById('trackLabel');
  const readingCard = document.getElementById('readingCard');
  if (trackLabel) trackLabel.innerText = `${saved}/${total}`;
  dgeUpdateProgressIndicator(saved, total);
  if (readingCard && typeof getText === 'function') {
    readingCard.innerHTML = getText(saved);
    if (typeof wrapReadingCardWordsForSync === 'function') wrapReadingCardWordsForSync();
  }
}
// Long-press a word in the reading-card to select it and go straight to
// Word-level Ask Acharya analysis, without needing to manually drag-select
// on a touchscreen. Cancels itself if the finger moves (treating it as a
// scroll/selection-drag instead) or lifts before the hold threshold.
(function dgeSetupLongPressWordLookup() {
  let pressTimer = null;
  let startX = 0, startY = 0;
  const MOVE_THRESHOLD = 10;
  const PRESS_MS = 550;

  function getWordRangeAtPoint(x, y) {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      }
    }
    if (!range || !range.startContainer || range.startContainer.nodeType !== 3) return null;

    const textNode = range.startContainer;
    const text = textNode.textContent;
    let start = range.startOffset, end = range.startOffset;
    const isWordChar = (ch) => !!ch && /[^\s.,;:!?()'"।॥]/.test(ch);

    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
    if (start === end) return null;

    const wordRange = document.createRange();
    wordRange.setStart(textNode, start);
    wordRange.setEnd(textNode, end);
    return wordRange;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('readingCard');
    if (!card) return;

    card.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches.length) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const touchX = startX, touchY = startY;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        const wordRange = getWordRangeAtPoint(touchX, touchY);
        if (!wordRange) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(wordRange);
        if (navigator.vibrate) navigator.vibrate(15);
        window.lastSelectedText = wordRange.toString().trim();
        if (typeof askAcharya === 'function') askAcharya(null, 'grammar');
      }, PRESS_MS);
    }, { passive: true });

    const cancelPress = (e) => {
      if (!pressTimer) return;
      if (e.touches && e.touches.length) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx <= MOVE_THRESHOLD && dy <= MOVE_THRESHOLD) return;
      }
      clearTimeout(pressTimer);
      pressTimer = null;
    };
    card.addEventListener('touchmove', cancelPress, { passive: true });
    card.addEventListener('touchend', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
    card.addEventListener('touchcancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
  });
})();

window.dgeRestoreLastVerse = dgeRestoreLastVerse;

// Swipe left/right on the reading-card to go to the next/previous verse.
// Scoped to just this card (not the whole page) so it never fights with
// normal list scrolling. Distinguishes a real swipe from a text-selection
// drag by requiring a reasonably fast, mostly-horizontal gesture — a
// slow drag (typical of selecting text) won't cross the speed threshold.
(function dgeSetupSwipeNav() {
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('readingCard');
    if (!card) return;

    card.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches.length) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      if (!e.changedTouches || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      const isHorizontalEnough = Math.abs(dx) > Math.abs(dy) * 1.5;
      const isFarEnough = Math.abs(dx) > 60;
      const isFastEnough = dt < 500;

      if (isHorizontalEnough && isFarEnough && isFastEnough) {
        if (window.getSelection && window.getSelection().toString().length > 0) return; // don't hijack a selection
        if (dx < 0 && typeof playNextFiltered === 'function') playNextFiltered();
        else if (dx > 0 && typeof playPrevFiltered === 'function') playPrevFiltered();
      }
    }, { passive: true });
  });
})();

async function playShloka(id) {
  if (!stotraData) return;
  if (activeId === id && isPlaying) { 
    currentAudio.pause(); 
    return; 
  }
  
  activeId = id; 
  contextShlokaId = id; 
  currentLoopCount = 0; 
  audioRetryDone = false; 

  if (typeof nsKey === 'function') localStorage.setItem(nsKey('lastVerse'), String(id));
  if (typeof dgeLogReadingHistory === 'function') dgeLogReadingHistory(id);
  
  updateRepeatDisplay(); 
  if (typeof renderList === 'function') renderList();
  
  const ac = document.getElementById(`shloka-${id}`); 
  if (ac) ac.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;
  const trackLabel = document.getElementById('trackLabel');
  const readingCard = document.getElementById('readingCard');
  const timeDisplay = document.getElementById('timeDisplay');
  
  if (trackLabel) trackLabel.innerText = `${id}/${total}`; 
  if (typeof dgeUpdateProgressIndicator === 'function') dgeUpdateProgressIndicator(id, total);
  if (readingCard && typeof getText === 'function') {
    readingCard.innerHTML = getText(id);
    if (typeof wrapReadingCardWordsForSync === 'function') wrapReadingCardWordsForSync();
  }
  if (timeDisplay) timeDisplay.innerText = "0:00.000 / 0:00.000";
  
  currentAudio.src = await resolveAudioSrc(id);
  
  const speedInput = document.getElementById('speedInput');
  currentAudio.playbackRate = speedInput ? (parseFloat(speedInput.value) || 1.0) : 1.0;
  
  const loopA = document.getElementById('loopA');
  const loopB = document.getElementById('loopB');
  const enableAB = document.getElementById('enableAB');
  
  if (loopA) loopA.value = ""; 
  if (loopB) loopB.value = ""; 
  if (enableAB) enableAB.checked = false;
  
  currentAudio.play().catch(err => { 
    if(err.name !== 'AbortError') console.error("Playback error:", err); 
  });
}

function togglePlay() {
  if (!stotraData) return;
  
  if (!activeId) { 
    const aIds = typeof getFilteredIds === 'function' ? getFilteredIds() : []; 
    if (aIds.length) playShloka(aIds[0]); 
  }
  else if (isPlaying) {
    currentAudio.pause();
    
    const autoABToggle = document.getElementById('autoABToggle');
    const loopA = document.getElementById('loopA');
    const loopB = document.getElementById('loopB');
    const enableAB = document.getElementById('enableAB');
    
    if (autoABToggle && autoABToggle.checked && loopA && loopB && enableAB) {
      const curr = currentAudio.currentTime.toFixed(1);
      if (!loopA.value) { 
        loopA.value = curr; 
      }
      else if (!loopB.value) { 
        loopB.value = curr; 
        enableAB.checked = true; 
        currentAudio.currentTime = parseFloat(loopA.value); 
        currentAudio.play(); 
      }
      else { 
        loopA.value = ""; 
        loopB.value = ""; 
        enableAB.checked = false; 
      }
    }
  } else { 
    currentAudio.play(); 
  }
}

function playNextFiltered() { 
  const ids = typeof getFilteredIds === 'function' ? getFilteredIds() : []; 
  if (!ids.length) return; 
  
  const idx = ids.indexOf(activeId); 
  if (idx !== -1 && idx < ids.length - 1) {
    playShloka(ids[idx + 1]); 
  } else { 
    currentAudio.pause(); 
    const repeatCounter = document.getElementById('repeatCounter');
    if (repeatCounter) repeatCounter.innerText = ""; 
  } 
}

function playPrevFiltered() { 
  const ids = typeof getFilteredIds === 'function' ? getFilteredIds() : []; 
  if (!ids.length) return; 
  
  const idx = ids.indexOf(activeId); 
  if (idx > 0) playShloka(ids[idx - 1]); 
  else playShloka(ids[ids.length - 1]); 
}

async function cacheAllAudio(btn) {
  if (!stotraData || btn.dataset.cached === "true") return;
  if (!('caches' in window)) { 
    alert('This browser does not support offline caching.'); 
    return; 
  }

  btn.innerText = "⏳ Preloading 0%"; 
  btn.disabled = true;
  
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const queue = Array.from({ length: total }, (_, i) => i + 1);
  let done = 0, success = 0;
  const CONCURRENCY = 4;

  const base = dgeEffectiveArchiveBase();
  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      const primary = `${base}${stotraData.metadata.filePrefix}${i}${stotraData.metadata.fileExtension}`;
      const alt = `${base}${stotraData.metadata.filePrefix}${i}%E2%80%8B${stotraData.metadata.fileExtension}`;
      try {
        let res = await fetch(primary);
        if (!res.ok) res = await fetch(alt);
        if (res.ok) { 
          await cache.put(res.url, res.clone()); 
          success++; 
        }
      } catch (e) { /* Skip track on strict failure */ }
      done++;
      btn.innerText = `⏳ Preloading ${Math.round((done/total)*100)}%`;
    }
  }
  
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (typeof nsKey === 'function') localStorage.setItem(nsKey('allCached'), 'true');
  btn.innerText = `✅ All Cached (${success}/${total})`;
  btn.dataset.cached = "true";
  btn.style.background = "#e8f5e9"; 
  btn.style.color = "#2e7d32"; 
  btn.style.borderColor = "#c8e6c9";
}

// ==========================================
// Native Audio Event Listeners
// ==========================================
if (currentAudio) {
  currentAudio.addEventListener('playing', () => { 
    isPlaying = true; 
    updatePlayUI(); 
  });
  
  currentAudio.addEventListener('pause', () => { 
    isPlaying = false; 
    updatePlayUI(); 
  });
  
  currentAudio.addEventListener('loadedmetadata', () => { 
    const speedInput = document.getElementById('speedInput');
    currentAudio.playbackRate = speedInput ? (parseFloat(speedInput.value) || 1.0) : 1.0; 
    
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) timeDisplay.innerText = `0:00.000 / ${formatTime(currentAudio.duration)}`; 
    updateRepeatDisplay(); 

    const seekSlider = document.getElementById('seekSlider');
    const seekSliderTotal = document.getElementById('seekSliderTotal');
    if (seekSlider && !isNaN(currentAudio.duration)) {
      seekSlider.max = currentAudio.duration;
      seekSlider.value = 0;
    }
    if (seekSliderTotal) seekSliderTotal.innerText = formatTime(currentAudio.duration);
  });

  currentAudio.addEventListener('error', () => {
    if (!activeId || !stotraData) return;
    const timeDisplay = document.getElementById('timeDisplay');
    
    if (audioRetryDone) { 
      if (timeDisplay) timeDisplay.innerText = "Audio unavailable"; 
      return; 
    }
    
    audioRetryDone = true;
    currentAudio.src = `${dgeEffectiveArchiveBase()}${stotraData.metadata.filePrefix}${activeId}%E2%80%8B${stotraData.metadata.fileExtension}`;
    currentAudio.load();
    currentAudio.play().then(() => { 
      isPlaying = true; 
      updatePlayUI(); 
    }).catch(()=>{});
  });

  currentAudio.addEventListener('timeupdate', () => {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) timeDisplay.innerText = `${formatTime(currentAudio.currentTime)} / ${formatTime(currentAudio.duration)}`;
    
    const enableAB = document.getElementById('enableAB');
    const loopA = document.getElementById('loopA');
    const loopB = document.getElementById('loopB');
    
    if (enableAB && enableAB.checked && loopB && loopA) { 
      const end = parseFloat(loopB.value);
      const start = parseFloat(loopA.value) || 0; 
      if (end && currentAudio.currentTime >= end) currentAudio.currentTime = start; 
    }

    if (!window._dgeSeekDragging) {
      const seekSlider = document.getElementById('seekSlider');
      if (seekSlider) seekSlider.value = currentAudio.currentTime;
      const seekSliderCurrent = document.getElementById('seekSliderCurrent');
      if (seekSliderCurrent) seekSliderCurrent.innerText = formatTime(currentAudio.currentTime);
    }

    if (typeof updateReadingCardSyncHighlight === 'function') updateReadingCardSyncHighlight();
  });

  currentAudio.addEventListener('ended', () => {
    const repeatInput = document.getElementById('repeatInput');
    const tRep = repeatInput ? (parseInt(repeatInput.value) || 1) : 1;
    
    if (++currentLoopCount < tRep) { 
      const loopA = document.getElementById('loopA');
      currentAudio.currentTime = loopA ? (parseFloat(loopA.value) || 0) : 0; 
      updateRepeatDisplay(); 
      currentAudio.play(); 
    } else { 
      currentLoopCount = 0; 
      updateRepeatDisplay(); 
      if (typeof currentFilter !== 'undefined' && currentFilter === 'none') { 
        isPlaying = false; 
        updatePlayUI(); 
        return; 
      } 
      playNextFiltered(); 
    }
  });
}

// UI Speed Controller Binding
document.addEventListener('DOMContentLoaded', () => {
    const speedInput = document.getElementById('speedInput');
    if (speedInput) {
        const savedSpeed = parseFloat(localStorage.getItem('app_playback_speed'));
        if (!isNaN(savedSpeed)) {
            speedInput.value = savedSpeed;
            const speedVal = document.getElementById('speedVal');
            if (speedVal) speedVal.innerText = savedSpeed.toFixed(1);
        }
        speedInput.addEventListener('input', (e) => { 
            const speedVal = document.getElementById('speedVal');
            if (speedVal) speedVal.innerText = parseFloat(e.target.value).toFixed(1); 
            if (currentAudio) currentAudio.playbackRate = e.target.value; 
            localStorage.setItem('app_playback_speed', e.target.value);
        });
    }
});

// ==========================================
// Approximate reading-along highlight
// ==========================================
// There's no per-word timestamp data for these recordings, so this is an
// ESTIMATE. Each word's on-screen time slice is weighted by its character
// length (a long compound gets proportionally more time than a short
// word like "na") rather than dividing time equally per word — equal
// division was visibly outrunning the audio on longer words. This is
// still an approximation, not true karaoke-style sync — real word-level
// sync would need timestamped audio data, which isn't available.
function wrapReadingCardWordsForSync() {
  const readingCard = document.getElementById('readingCard');
  if (!readingCard) return;
  const text = readingCard.textContent || '';
  const tokens = text.split(/(\s+)/);
  let html = '';
  let wordIndex = 0;
  const wordLengths = [];

  tokens.forEach(tok => {
    if (tok.trim().length === 0) { html += tok; return; }
    html += `<span class="sync-word" data-widx="${wordIndex}">${tok}</span>`;
    wordLengths.push(Math.max(tok.length, 2)); // floor so short words still get a fair minimum
    wordIndex++;
  });

  window._dgeSyncWordCount = wordIndex;

  const totalWeight = wordLengths.reduce((a, b) => a + b, 0) || 1;
  let cumulative = 0;
  window._dgeSyncWordBoundaries = wordLengths.map(len => {
    cumulative += len;
    return cumulative / totalWeight;
  });

  readingCard.innerHTML = html;
}

function updateReadingCardSyncHighlight() {
  if (!window._dgeSyncWordCount || !window._dgeSyncWordBoundaries || !currentAudio || isNaN(currentAudio.duration) || currentAudio.duration <= 0) return;

  const frac = Math.min(1, Math.max(0, currentAudio.currentTime / currentAudio.duration));
  const boundaries = window._dgeSyncWordBoundaries;
  let activeIdx = boundaries.findIndex(b => frac <= b);
  if (activeIdx === -1) activeIdx = boundaries.length - 1;

  const readingCard = document.getElementById('readingCard');
  if (!readingCard) return;

  const prev = readingCard.querySelector('.sync-word.active');
  if (prev && parseInt(prev.dataset.widx, 10) === activeIdx) return;
  if (prev) prev.classList.remove('active');

  const next = readingCard.querySelector(`.sync-word[data-widx="${activeIdx}"]`);
  if (next) {
    next.classList.add('active');

    // When minimized (a short fixed-height strip with overflow hidden),
    // the highlighted word can end up several lines down and clipped out
    // of view. Scroll the card's own content so it stays visible instead
    // of only ever showing the first line.
    const wrap = document.getElementById('readingCardWrap');
    if (wrap && wrap.classList.contains('minimized')) {
      const cardRect = readingCard.getBoundingClientRect();
      const wordRect = next.getBoundingClientRect();
      const delta = (wordRect.top - cardRect.top) - (readingCard.clientHeight / 2) + (wordRect.height / 2);
      readingCard.scrollTo({ top: Math.max(0, readingCard.scrollTop + delta), behavior: 'smooth' });
    }
  }
}
window.wrapReadingCardWordsForSync = wrapReadingCardWordsForSync;
window.updateReadingCardSyncHighlight = updateReadingCardSyncHighlight;

// ==========================================
// Seek slider (scrubber) with adjustable precision
// ==========================================
const SEEK_PRECISIONS = [
  { step: 1, label: '1s' },
  { step: 0.1, label: '0.1s' },
  { step: 0.01, label: '10ms' }
];
window._dgeSeekPrecisionIdx = 0;
window._dgeSeekDragging = false;

window.toggleSeekPrecision = function() {
  window._dgeSeekPrecisionIdx = (window._dgeSeekPrecisionIdx + 1) % SEEK_PRECISIONS.length;
  const p = SEEK_PRECISIONS[window._dgeSeekPrecisionIdx];
  const seekSlider = document.getElementById('seekSlider');
  const btn = document.getElementById('seekPrecisionBtn');
  if (seekSlider) seekSlider.step = p.step;
  if (btn) btn.innerText = p.label;
};

window.onSeekSliderInput = function(value) {
  if (!currentAudio) return;
  currentAudio.currentTime = parseFloat(value);
  const seekSliderCurrent = document.getElementById('seekSliderCurrent');
  if (seekSliderCurrent) seekSliderCurrent.innerText = formatTime(currentAudio.currentTime);
};

document.addEventListener('DOMContentLoaded', () => {
  const seekSlider = document.getElementById('seekSlider');
  if (seekSlider) {
    ['pointerdown', 'touchstart'].forEach(evt => seekSlider.addEventListener(evt, () => { window._dgeSeekDragging = true; }));
    ['pointerup', 'touchend', 'change'].forEach(evt => seekSlider.addEventListener(evt, () => { window._dgeSeekDragging = false; }));
  }

  // Enter in the Start/End (loop A/B) boxes seeks + plays from that point,
  // instead of only taking effect once a snippet is saved.
  const loopA = document.getElementById('loopA');
  const loopB = document.getElementById('loopB');
  [loopA, loopB].forEach(input => {
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!currentAudio || !activeId) return;
      const t = parseFloat(input.value);
      if (isNaN(t)) return;
      currentAudio.currentTime = Math.max(0, t);
      currentAudio.play().catch(() => {});
      input.blur();
    });
  });
});

