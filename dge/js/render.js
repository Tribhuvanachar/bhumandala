// DGE Module: render.js
// js/render.js
// Maps to F-003 (Rendering) & F-007 (Commentary)

function getText(id) {
  if (!stotraData || !stotraData.shlokas[id]) return `श्लोक ${id}`;
  // Safely check if transliteration module is loaded
  return typeof applyTransliteration === 'function' 
    ? applyTransliteration(stotraData.shlokas[id].sa, activeScript)
    : stotraData.shlokas[id].sa;
}

function setCommentaryView(view, el) {
  selectedCommentaryView = view;
  document.querySelectorAll('#commentaryPopup .pop-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');
  if (typeof togglePopup === 'function') togglePopup('commentaryPopup');
  renderList();

  // renderList() just rebuilt the list at a new (shorter or taller) height,
  // so the old scroll position no longer points at the active shloka.
  // Re-anchor to it so collapsing/expanding commentary doesn't strand the
  // viewport wherever the old commentary block used to end.
  if (typeof activeId !== 'undefined' && activeId) {
    const ac = document.getElementById(`shloka-${activeId}`);
    if (ac) ac.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function highlightText(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})(?![^<]*>|[^<>]*<\\/)`, 'gi');
  return text.replace(regex, '<mark class="search-match">$1</mark>');
}

function renderList() {
  if(!stotraData) return;
  const listEl = document.getElementById('shlokaList');
  if(!listEl) return;
  
  listEl.innerHTML = '';
  
  // Fetch filtered list if filter.js is loaded, otherwise load all
  const fIds = typeof getFilteredIds === 'function' ? getFilteredIds() : Object.keys(stotraData.shlokas).map(Number);
  
  const searchInput = document.getElementById('searchInput');
  const searchScope = document.getElementById('searchScope');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const scope = searchScope ? searchScope.value : 'all';
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;

  window.searchMatches = [];
  window.currentMatchIdx = -1;

  for (let i = 1; i <= total; i++) {
    if (!fIds.includes(i)) continue;
    const shloka = stotraData.shlokas[i];
    if (!shloka) continue;

    let forceCommentaries = [];
    let hasMatch = false;

    if(query) {
      if(scope === 'all') {
        hasMatch = i.toString().includes(query) || shloka.sa.toLowerCase().includes(query);
        if (shloka.commentaries) {
          Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
            if (cText.toLowerCase().includes(query)) {
              forceCommentaries.push(cKey);
              hasMatch = true;
            }
          });
        }
      } else if(scope === 'mula') {
        hasMatch = i.toString().includes(query) || shloka.sa.toLowerCase().includes(query);
      } else if(shloka.commentaries && shloka.commentaries[scope]) {
        hasMatch = shloka.commentaries[scope].toLowerCase().includes(query);
        if(hasMatch) forceCommentaries.push(scope);
      }
      if(!hasMatch) continue;
    }

    const c = document.createElement('div');
    c.className = `shloka-card ${activeId===i ? 'active':''}`; 
    c.id = `shloka-${i}`;

    let cardActionsHtml = '';
    
    if (document.body.classList.contains('is-authorized')) {
      const isFav = typeof marks !== 'undefined' && marks[i] === 'fav';
      const isPractice = typeof marks !== 'undefined' && marks[i] === 'practice';
      const hasNote = typeof notes !== 'undefined' && !!notes[i];
      const snipCount = (typeof snippets !== 'undefined' && snippets[i]) ? snippets[i].length : 0;

      let chips = '';
      if (isFav) chips += `<span class="status-chip is-fav" title="Favorite">★</span>`;
      if (isPractice) chips += `<span class="status-chip is-practice" title="Needs practice">🚩</span>`;
      if (hasNote) chips += `<span class="status-chip has-note" title="Has a note">📝</span>`;
      if (snipCount > 0) chips += `<span class="status-chip" title="${snipCount} saved snippet(s)">🎯 ${snipCount}</span>`;

      cardActionsHtml = `<div class="card-actions">${chips}<button class="btn-icon" title="Favorite, note, snippets, share…" onclick="event.stopPropagation(); if(typeof openActionsSheet==='function') openActionsSheet(${i})">⋯</button></div>`;
    }

    let commentaryHtml = '';
    if (shloka.commentaries) {
      Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
        const isSelected = (selectedCommentaryView === 'all' || selectedCommentaryView === cKey);
        const isForcedBySearch = forceCommentaries.includes(cKey);

        if (isSelected || isForcedBySearch) {
          const name = stotraData.metadata.availableCommentaries[cKey] || cKey;
          let convertedText = typeof applyTransliteration === 'function' ? applyTransliteration(cText, activeScript) : cText;
          let convertedName = typeof applyTransliteration === 'function' ? applyTransliteration(name, activeScript) : name;
          commentaryHtml += `<div class="commentary-block" data-ckey="${cKey}"><div class="commentary-title">${convertedName}</div>${highlightText(convertedText, query)}</div>`;
        }
      });
    }

    c.innerHTML = `
      <div class="shloka-main-row">
        <div class="shloka-num">${i}</div>
        <div class="shloka-text" onclick="if(typeof playShloka==='function') playShloka(${i})">${highlightText(getText(i), query)}</div>
        ${cardActionsHtml}
      </div>
      ${commentaryHtml}`;
    listEl.appendChild(c);
  }

  window.searchMatches = Array.from(document.querySelectorAll('.search-match'));
  const navContainer = document.getElementById('searchNavigator');
  if (query && window.searchMatches.length > 0 && navContainer) {
    navContainer.style.display = 'flex';
    navSearch(1);
  } else if (navContainer) {
    navContainer.style.display = 'none';
  }
}

function navSearch(direction) {
  if (!window.searchMatches || window.searchMatches.length === 0) return;
  if(window.currentMatchIdx >= 0 && window.searchMatches[window.currentMatchIdx]) { 
    window.searchMatches[window.currentMatchIdx].classList.remove('active-match'); 
  }

  window.currentMatchIdx += direction;
  if (window.currentMatchIdx >= window.searchMatches.length) window.currentMatchIdx = 0;
  if (window.currentMatchIdx < 0) window.currentMatchIdx = window.searchMatches.length - 1;

  const target = window.searchMatches[window.currentMatchIdx];
  target.classList.add('active-match');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  const countEl = document.getElementById('searchMatchCount');
  if (countEl) countEl.innerText = `${window.currentMatchIdx + 1} / ${window.searchMatches.length}`;
}

