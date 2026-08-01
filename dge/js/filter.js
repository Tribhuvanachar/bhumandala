// js/filter.js
// Maps to Feature: Filter 

function getFilteredIds() {
  if (!stotraData) return [];
  let ids = [];
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;
  
  const rangeStartEl = document.getElementById('rangeStart');
  const rangeEndEl = document.getElementById('rangeEnd');
  const rangeModeEl = document.getElementById('rangeMode');
  
  const rs = rangeStartEl ? parseInt(rangeStartEl.value) : NaN;
  const re = rangeEndEl ? parseInt(rangeEndEl.value) : NaN;
  const rm = rangeModeEl ? rangeModeEl.value : 'include';
  const hasRange = !isNaN(rs) && !isNaN(re) && rs <= re;
  
  for (let i = 1; i <= total; i++) {
    if (typeof currentFilter !== 'undefined' && currentFilter !== 'all' && currentFilter !== 'none') {
      const m = (typeof marks !== 'undefined') ? marks[i] : null;
      if (currentFilter === 'fav' && !(m && m.fav)) continue;
      if (currentFilter === 'pending' && !(m && m.status === 'pending')) continue;
      if (currentFilter === 'practice' && !(m && m.status === 'practice')) continue;
      if (currentFilter === 'done' && !(m && m.status === 'done')) continue;
      if (currentFilter === 'doubt' && !(m && m.doubt)) continue;
    }
    
    if (hasRange) { 
      const inR = (i >= rs && i <= re); 
      if ((rm === 'include' && !inR) || (rm === 'exclude' && inR)) continue; 
    }
    ids.push(i);
  }
  return ids;
}

function clearRange() { 
  const rangeStartEl = document.getElementById('rangeStart');
  const rangeEndEl = document.getElementById('rangeEnd');
  
  if (rangeStartEl) rangeStartEl.value = ""; 
  if (rangeEndEl) rangeEndEl.value = ""; 
  applyRangeFilter(); 
}

function setFilter(type) {
  if (typeof currentFilter !== 'undefined') currentFilter = type; 
  
  const popup = document.getElementById('filterPopup');
  if (popup) popup.classList.remove('show');
  
  document.querySelectorAll('#filterPopup .pop-item').forEach(el => el.classList.remove('active')); 
  
  const optEl = document.getElementById(`opt-${type}`);
  if (optEl) optEl.classList.add('active');
  
  if (typeof renderList === 'function') renderList();
  
  if (type !== 'none') { 
    const aIds = getFilteredIds(); 
    if (aIds.length) {
        if (typeof playShloka === 'function') playShloka(aIds[0]); 
    } else { 
        if (typeof currentAudio !== 'undefined' && currentAudio) currentAudio.pause(); 
        if (typeof activeId !== 'undefined') activeId = null; 
        if (typeof isPlaying !== 'undefined') isPlaying = false; 
        if (typeof updatePlayUI === 'function') updatePlayUI(); 
    } 
  }
}

function applyRangeFilter() { 
  if (typeof renderList === 'function') renderList(); 
  const aIds = getFilteredIds(); 
  if (aIds.length && (typeof currentFilter === 'undefined' || currentFilter !== 'none')) {
      if (typeof playShloka === 'function') playShloka(aIds[0]); 
  }
}
