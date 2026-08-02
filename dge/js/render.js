// DGE Module: render.js
// js/render.js
// Maps to F-003 (Rendering) & F-007 (Commentary)
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['render.js'] = 'v3.0 (Inline chip toggles + native-script search fix + copy button)';

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

// Builds a case-insensitive regex source from a query. For IAST, each
// plain ASCII letter that has a diacritic'd counterpart (a/ā, i/ī, u/ū,
// r/ṛ, n/ṅ/ñ/ṇ, t/ṭ, d/ḍ, s/ś/ṣ, m/ṃ, h/ḥ) becomes a character class
// matching either form — there's no way to type diacritics on a normal
// keyboard, so a plain "uvaca" needs to match displayed "uvāca". This
// covers both "does it match" and "highlight the match" in one regex,
// rather than stripping accents (which finds the match but can't then
// highlight it back in the accented text).
const IAST_TOLERANT = { a: 'aā', i: 'iī', u: 'uū', r: 'rṛṝ', l: 'lḷ', n: 'nṅñṇ', t: 'tṭ', d: 'dḍ', s: 'sśṣ', m: 'mṃ', h: 'hḥ' };

function dgeBuildSearchPattern(query) {
  let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (window.activeScript === 'iast') {
    escaped = escaped.replace(/[aiurlndtsmh]/gi, (ch) => {
      const variants = IAST_TOLERANT[ch.toLowerCase()];
      return variants ? `[${variants}${variants.toUpperCase()}]` : ch;
    });
  }
  return escaped;
}

function dgeTextMatchesQuery(text, pattern) {
  if (!pattern) return false;
  try {
    return new RegExp(pattern, 'i').test(text || '');
  } catch (e) {
    return (text || '').toLowerCase().includes(pattern.toLowerCase());
  }
}

function highlightText(text, pattern) {
  if (!pattern) return text;
  try {
    const regex = new RegExp(`(${pattern})(?![^<]*>|[^<>]*<\\/)`, 'gi');
    return text.replace(regex, '<mark class="search-match">$1</mark>');
  } catch (e) {
    return text;
  }
}

window.copyShlokaText = async function(id) {
  const text = typeof getText === 'function' ? getText(id).replace(/<[^>]*>/g, '') : '';
  if (!text) return;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (typeof showToast === 'function') showToast(`Shloka ${id} copied to clipboard.`);
  } catch (e) {
    console.error('Copy failed', e);
    if (typeof showToast === 'function') showToast('Could not copy this text.');
  }
};

function renderList() {
  if(!stotraData) return;
  const listEl = document.getElementById('shlokaList');
  if(!listEl) return;
  
  listEl.innerHTML = '';
  
  // Fetch filtered list if filter.js is loaded, otherwise load all
  const fIds = typeof getFilteredIds === 'function' ? getFilteredIds() : Object.keys(stotraData.shlokas).map(Number);
  
  const searchInput = document.getElementById('searchInput');
  const searchScope = document.getElementById('searchScope');
  const rawQuery = searchInput ? searchInput.value.trim() : '';
  const pattern = dgeBuildSearchPattern(rawQuery);
  const scope = searchScope ? searchScope.value : 'all';
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;

  window.searchMatches = [];
  window.currentMatchIdx = -1;

  for (let i = 1; i <= total; i++) {
    if (!fIds.includes(i)) continue;
    const shloka = stotraData.shlokas[i];
    if (!shloka) continue;

    // Transliterate once per shloka, to whatever script is currently
    // active, and reuse for BOTH search matching and display — this is
    // the actual text on screen, which is what a search should match.
    const mulaDisplayText = getText(i);

    const convertedCommentaries = {};
    if (shloka.commentaries) {
      Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
        convertedCommentaries[cKey] = typeof applyTransliteration === 'function' ? applyTransliteration(cText, activeScript) : cText;
      });
    }

    let forceCommentaries = [];
    let hasMatch = false;

    if(rawQuery) {
      if(scope === 'all') {
        hasMatch = i.toString().includes(rawQuery) || dgeTextMatchesQuery(mulaDisplayText, pattern);
        Object.entries(convertedCommentaries).forEach(([cKey, cText]) => {
          if (dgeTextMatchesQuery(cText, pattern)) {
            forceCommentaries.push(cKey);
            hasMatch = true;
          }
        });
      } else if(scope === 'mula') {
        hasMatch = i.toString().includes(rawQuery) || dgeTextMatchesQuery(mulaDisplayText, pattern);
      } else if(scope === 'notes') {
        const noteArr = (typeof notes !== 'undefined' && notes[i]) ? notes[i] : [];
        hasMatch = noteArr.some(n => dgeTextMatchesQuery(n.text || '', pattern));
      } else if(convertedCommentaries[scope]) {
        hasMatch = dgeTextMatchesQuery(convertedCommentaries[scope], pattern);
        if(hasMatch) forceCommentaries.push(scope);
      }
      if(!hasMatch) continue;
    }

    const c = document.createElement('div');
    c.className = `shloka-card ${activeId===i ? 'active':''}`; 
    c.id = `shloka-${i}`;

    let cardActionsHtml = '';
    
    if (document.body.classList.contains('is-authorized')) {
      const flags = (typeof dgeGetEffectiveFeatureFlags === 'function') ? dgeGetEffectiveFeatureFlags() : {};
      const m = (typeof marks !== 'undefined') ? marks[i] : null;
      const isFav = !!(m && m.fav);
      const status = m ? m.status : null;
      const isDoubt = !!(m && m.doubt);
      const noteCount = (typeof notes !== 'undefined' && notes[i]) ? notes[i].length : 0;
      const snipCount = (typeof snippets !== 'undefined' && snippets[i]) ? snippets[i].length : 0;

      const statusIcons = { pending: '○', practice: '🚧', done: '✅' };
      const statusIcon = status ? statusIcons[status] : '○';
      const statusClass = status ? ` active-status-${status}` : '';

      let rowHtml = '';
      if (flags.showFavorite) rowHtml += `<button class="chip-toggle${isFav ? ' active-fav' : ''}" title="Favorite" onclick="event.stopPropagation(); window.toggleFavorite(${i})">${isFav ? '★' : '☆'}</button>`;
      if (flags.showStatus) rowHtml += `<button class="chip-toggle status-picker-btn${statusClass}" title="Set status" onclick="window.openStatusPicker(${i}, event)">${statusIcon}</button>`;
      if (flags.showDoubt) rowHtml += `<button class="chip-toggle${isDoubt ? ' active-doubt' : ''}" title="Doubt" onclick="event.stopPropagation(); window.toggleDoubt(${i})">❓</button>`;
      if (flags.showNotes && noteCount > 0) rowHtml += `<span class="status-chip has-note" title="${noteCount} note(s)">📝 ${noteCount}</span>`;
      if (flags.showSnippetTools && snipCount > 0) rowHtml += `<span class="status-chip" title="${snipCount} saved snippet(s)">🎯 ${snipCount}</span>`;
      rowHtml += `<button class="btn-icon" style="margin-left:auto;" title="Notes, snippets, share, download" onclick="event.stopPropagation(); if(typeof openActionsSheet==='function') openActionsSheet(${i})">⋯</button>`;

      cardActionsHtml = `<div class="shloka-status-row">${rowHtml}</div>`;
    }

    let commentaryHtml = '';
    if (shloka.commentaries) {
      Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
        const isSelected = (selectedCommentaryView === 'all' || selectedCommentaryView === cKey);
        const isForcedBySearch = forceCommentaries.includes(cKey);

        if (isSelected || isForcedBySearch) {
          const name = stotraData.metadata.availableCommentaries[cKey] || cKey;
          let convertedText = convertedCommentaries[cKey];
          let convertedName = typeof applyTransliteration === 'function' ? applyTransliteration(name, activeScript) : name;
          commentaryHtml += `<div class="commentary-block" data-ckey="${cKey}"><div class="commentary-title">${convertedName}</div>${highlightText(convertedText, pattern)}</div>`;
        }
      });
    }

    c.innerHTML = `
      ${cardActionsHtml}
      <div class="shloka-main-row">
        <div class="shloka-num">${i}</div>
        <div class="shloka-text" onclick="if(typeof playShloka==='function') playShloka(${i})">${highlightText(mulaDisplayText, pattern)}</div>
        <button class="btn-icon copy-shloka-btn" title="Copy shloka text" onclick="event.stopPropagation(); if(typeof copyShlokaText==='function') copyShlokaText(${i})">📋</button>
      </div>
      ${commentaryHtml}`;
    listEl.appendChild(c);
  }

  window.searchMatches = Array.from(document.querySelectorAll('.search-match'));
  const navContainer = document.getElementById('searchNavigator');
  if (rawQuery && window.searchMatches.length > 0 && navContainer) {
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

