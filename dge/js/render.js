// DGE Module: render.js
// js/render.js
// Maps to F-003 (Rendering) & F-007 (Commentary)
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['render.js'] = 'v4.2 (list ("Full List") mode now paginates at 50 shlokas/page with its own Prev/Next nav instead of building one DOM card per shloka unconditionally -- was the actual crash/freeze on a large grantha\'s Full List view, e.g. a 2000-shloka Rigveda mandala)';

function getText(id) {
  if (!stotraData || !stotraData.shlokas[id]) return `श्लोक ${id}`;
  // Safely check if transliteration module is loaded
  return typeof applyTransliteration === 'function' 
    ? applyTransliteration(stotraData.shlokas[id].sa, activeScript)
    : stotraData.shlokas[id].sa;
}

// renderList() in "Full List" (📜) mode used to build one full DOM card per
// matching shloka with no limit at all -- fine for something PNS-sized (43),
// but genuinely froze/crashed a phone on a large grantha (a 2000-shloka
// Rigveda maṇḍala's "Full List" view being the reported case). core.js
// already forces single-view as the DEFAULT for anything over 150 shlokas,
// but that is only a nudge: the reader can still tap "📜 Full List" in the
// Display menu and get the exact same unbounded render. This is the actual
// safety net -- list mode never builds more than LIST_PAGE_SIZE cards at
// once, with Prev/Next paging through the rest.
const LIST_PAGE_SIZE = 50;

window.currentSearchScope = 'all';
window.setSearchScope = function(scope, label, el) {
  window.currentSearchScope = scope;
  const btn = document.getElementById('searchScopeBtn');
  if (btn) btn.innerText = label;
  document.querySelectorAll('#searchScopePopup .pop-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');
  if (typeof togglePopup === 'function') togglePopup('searchScopePopup');
  if (typeof handleSearch === 'function') handleSearch();
};

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

// Builds a case-insensitive regex source from a query. For IAST, this
// tolerates both plain-letter-for-diacritic typing (a/ā, i/ī, u/ū, r/ṛ,
// n/ṅ/ñ/ṇ, t/ṭ, d/ḍ, s/ś/ṣ, m/ṃ, h/ḥ) AND common casual-romanization
// clusters (ch→c, sh→ś/ṣ, doubled vowels→long vowels, ri→ṛ) — so
// "uvacha", "uvaaca", or "uvaca" all match displayed "uvāca", and
// "krishna" matches "kṛṣṇa". Built as a single left-to-right scan
// (checking the longest cluster first at each position) rather than
// several chained string replacements, so substitutions never
// double-process each other's output. Covers common cases, not every
// possible spelling.
const IAST_SINGLE_TOLERANT = { a: 'aā', i: 'iī', u: 'uū', r: 'rṛṝ', l: 'lḷ', n: 'nṅñṇ', t: 'tṭ', d: 'dḍ', s: 'sśṣ', m: 'mṃ', h: 'hḥ' };
const IAST_CLUSTER_TOLERANT = [
  { pat: 'chh', out: '(?:chh|ch|c)' },
  { pat: 'ch', out: '(?:ch|c)' },
  { pat: 'sh', out: '(?:sh|ś|ṣ)' },
  { pat: 'aa', out: '(?:aa|ā|a)' },
  { pat: 'ii', out: '(?:ii|ī|i)' },
  { pat: 'uu', out: '(?:uu|ū|u)' },
  { pat: 'ri', out: '(?:ri|ṛ)' }
];
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/;

function dgeBuildSearchPattern(query) {
  if (window.activeScript !== 'iast') {
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  let out = '';
  let i = 0;
  while (i < query.length) {
    const rest = query.slice(i).toLowerCase();
    const cluster = IAST_CLUSTER_TOLERANT.find(c => rest.startsWith(c.pat));
    if (cluster) {
      out += cluster.out;
      i += cluster.pat.length;
      continue;
    }
    const ch = query[i];
    const lower = ch.toLowerCase();
    if (IAST_SINGLE_TOLERANT[lower]) {
      const variants = IAST_SINGLE_TOLERANT[lower];
      out += `[${variants}${variants.toUpperCase()}]`;
    } else if (REGEX_SPECIAL_CHARS.test(ch)) {
      out += '\\' + ch;
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
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
  const rawQuery = searchInput ? searchInput.value.trim() : '';
  const pattern = dgeBuildSearchPattern(rawQuery);
  const scope = window.currentSearchScope || 'all';
  const total = stotraData.metadata.totalShlokas || Object.keys(stotraData.shlokas).length;

  window.searchMatches = [];
  window.currentMatchIdx = -1;

  const singleMode = window.viewMode === 'single';

  // See the LIST_PAGE_SIZE comment above -- only paginate list mode, and
  // only once there's actually more than one page's worth to show.
  const needsPaging = !singleMode && fIds.length > LIST_PAGE_SIZE;
  let pageIdSet = null;
  if (needsPaging) {
    const maxPage = Math.max(0, Math.ceil(fIds.length / LIST_PAGE_SIZE) - 1);
    window.dgeListPage = Math.min(Math.max(window.dgeListPage || 0, 0), maxPage);
    const start = window.dgeListPage * LIST_PAGE_SIZE;
    pageIdSet = new Set(fIds.slice(start, start + LIST_PAGE_SIZE));
  }

  for (let i = 1; i <= total; i++) {
    if (!fIds.includes(i)) continue;
    if (pageIdSet && !pageIdSet.has(i)) continue;
    if (singleMode && i !== window.currentReadingId) continue;
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

      const iconImg = (name, size) => `<img src="images/icon-${name}.png" width="${size}" height="${size}" alt="" style="display:block;">`;
      const statusIconFiles = { pending: 'status-pending', practice: 'status-practice', done: 'status-done' };
      const statusIconFile = status ? statusIconFiles[status] : 'status-none';
      const statusClass = status ? ` active-status-${status}` : '';

      let rowHtml = '';
      if (flags.showFavorite) rowHtml += `<button class="chip-toggle${isFav ? ' active-fav' : ''}" title="Favorite" onclick="event.stopPropagation(); window.toggleFavorite(${i})">${iconImg(isFav ? 'star-filled' : 'star-outline', 10)}</button>`;
      if (flags.showStatus) rowHtml += `<button class="chip-toggle status-picker-btn${statusClass}" title="Set status" onclick="window.openStatusPicker(${i}, event)">${iconImg(statusIconFile, 11)}</button>`;
      if (flags.showDoubt) rowHtml += `<button class="chip-toggle${isDoubt ? ' active-doubt' : ''}" title="Doubt" onclick="event.stopPropagation(); window.toggleDoubt(${i})">${iconImg(isDoubt ? 'question-filled' : 'question-outline', 10)}</button>`;
      if (flags.showNotes && noteCount > 0) rowHtml += `<span class="status-chip has-note" title="${noteCount} note(s)">${iconImg('note', 9)} ${noteCount}</span>`;
      if (flags.showSnippetTools && snipCount > 0) rowHtml += `<span class="status-chip" title="${snipCount} saved snippet(s)">${iconImg('snippet', 9)} ${snipCount}</span>`;
      rowHtml += `<button class="btn-icon" style="margin-left:auto;" title="Notes, snippets, share, download" onclick="event.stopPropagation(); if(typeof openActionsSheet==='function') openActionsSheet(${i})">${iconImg('more', 10)}</button>`;

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

    // Additional structured fields (Padaccheda, Anvaya, Vrutta, etc.) —
    // shown independent of which commentary is selected, since these are
    // grammatical/analytical rather than per-commentary. Only renders for
    // fields that are both enabled AND actually present in this shloka's
    // data — silently absent otherwise, so this is safe to ship even
    // before any shloka has this data populated.
    let extraFieldsHtml = '';
    const effectiveExtraFields = (typeof dgeGetEffectiveShlokaFields === 'function') ? dgeGetEffectiveShlokaFields() : (window.SHLOKA_EXTRA_FIELDS || []);
    effectiveExtraFields.forEach(f => {
      if (!f.enabled) return;
      const raw = shloka[f.dataKey];
      if (!raw || (Array.isArray(raw) && raw.length === 0)) return;
      const displayText = Array.isArray(raw) ? raw.join(', ') : raw;
      const converted = typeof applyTransliteration === 'function' ? applyTransliteration(displayText, activeScript) : displayText;
      extraFieldsHtml += `<div class="commentary-block" data-field="${f.id}"><div class="commentary-title">${f.icon} ${f.label}</div>${highlightText(converted, pattern)}</div>`;
    });

    // Vedic content stores padas (quarter-verses) separated by " / " —
    // scoped to just that content (detected via vedicId, which only the
    // Vedic-schema normalizer in core.js sets) so this can't affect PNS
    // or any other text that might use "/" for something else. Applied
    // AFTER highlightText() so a search match spanning a pada boundary
    // still highlights correctly first.
    // Gemini-enrichment footnotes (see dge/js/footnote-engine.js) are only
    // meaningful against the Devanagari the enrichment was computed from —
    // quoted_text/segments are stored verbatim in Devanagari, so on any
    // other display script this falls back to plain highlighted text rather
    // than risk mismatched markers.
    let footnoteResult = null;
    if (shloka.geminiEnrichment && (!window.activeScript || window.activeScript === 'devanagari') &&
        typeof window.DGEFootnotes !== 'undefined') {
      footnoteResult = window.DGEFootnotes.render(shloka.geminiEnrichment);
    }

    let mulaHtml = highlightText(footnoteResult ? footnoteResult.html : mulaDisplayText, pattern);
    if (shloka.vedicId) {
      mulaHtml = mulaHtml.replace(/\s*\/\s*/g, '<br>');
    }
    const footnoteListHtml = footnoteResult
      ? `<div class="dge-fn-block">${footnoteResult.footnotesHtml}</div>` : '';

    c.innerHTML = `
      ${cardActionsHtml}
      <div class="shloka-main-row">
        <div class="shloka-num">${i}</div>
        <div class="shloka-text" onclick="if(!window.dgeContentEditMode && typeof loadShloka==='function') loadShloka(${i})">${mulaHtml}</div>
        ${window.dgeContentEditMode ? `<button class="btn-icon" title="Edit this shloka's text" onclick="event.stopPropagation(); window.dgeInlineEditShloka(${i})">✏️</button>` : ''}
        <button class="btn-icon copy-shloka-btn" title="Copy shloka text" onclick="event.stopPropagation(); if(typeof copyShlokaText==='function') copyShlokaText(${i})">📋</button>
      </div>
      ${footnoteListHtml}
      ${extraFieldsHtml}
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

  dgeUpdateSingleViewNav(fIds);
  dgeUpdateListViewNav(fIds, needsPaging);
}

function dgeUpdateListViewNav(fIds, needsPaging) {
  const nav = document.getElementById('listViewNav');
  if (!nav) return;
  if (!needsPaging) { nav.style.display = 'none'; return; }
  const total = fIds.length;
  const maxPage = Math.max(0, Math.ceil(total / LIST_PAGE_SIZE) - 1);
  const page = window.dgeListPage || 0;
  const startN = page * LIST_PAGE_SIZE + 1;
  const endN = Math.min((page + 1) * LIST_PAGE_SIZE, total);
  nav.style.display = 'flex';
  nav.innerHTML = `
    <button class="btn-sm" onclick="window.dgeListViewStep(-1)" ${page <= 0 ? 'disabled' : ''}>⟨ Prev</button>
    <span style="font-weight:700; font-size:13px;">${startN}–${endN} of ${total.toLocaleString()} (page ${page + 1}/${maxPage + 1})</span>
    <button class="btn-sm" onclick="window.dgeListViewStep(1)" ${page >= maxPage ? 'disabled' : ''}>Next ⟩</button>
  `;
}

window.dgeListViewStep = function(dir) {
  window.dgeListPage = (window.dgeListPage || 0) + dir;
  renderList();
  const nav = document.getElementById('listViewNav');
  if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ---------------------------------------------------------------
// Single-shloka "one at a time" view mode — a separate reading position
// (currentReadingId) from the audio-playback position (activeId), so
// paging through verses to READ never jumps the currently playing audio
// around while it's actually playing. Tapping a shloka's text or paging
// with Prev/Next both call loadShloka() (select + sync the player's own
// track counter, never start playback) — audio only ever starts via an
// explicit Play tap; this only controls which card(s) renderList
// actually builds.
// ---------------------------------------------------------------
function dgeUpdateSingleViewNav(fIds) {
  const nav = document.getElementById('singleViewNav');
  if (!nav) return;
  if (window.viewMode !== 'single' || !stotraData) { nav.style.display = 'none'; return; }

  const ids = fIds || (typeof getFilteredIds === 'function' ? getFilteredIds() : Object.keys(stotraData.shlokas).map(Number));
  const idx = ids.indexOf(window.currentReadingId);
  nav.style.display = 'flex';
  nav.innerHTML = `
    <button class="btn-sm" onclick="window.dgeSingleViewStep(-1)" ${idx <= 0 ? 'disabled' : ''}>⟨ Prev</button>
    <span style="font-weight:700; font-size:13px;">${idx + 1} / ${ids.length}</span>
    <button class="btn-sm" onclick="window.dgeSingleViewStep(1)" ${(idx === -1 || idx >= ids.length - 1) ? 'disabled' : ''}>Next ⟩</button>
  `;
}

window.dgeSetViewMode = function(mode) {
  window.viewMode = (mode === 'single') ? 'single' : 'list';
  localStorage.setItem('app_viewMode', window.viewMode);
  document.querySelectorAll('#displayPopup .pop-item[data-viewmode]').forEach(el => {
    el.classList.toggle('active', el.dataset.viewmode === window.viewMode);
  });
  if (window.viewMode === 'single' && !window.currentReadingId) {
    const fIds = typeof getFilteredIds === 'function' ? getFilteredIds() : (stotraData ? Object.keys(stotraData.shlokas).map(Number) : []);
    window.currentReadingId = (typeof activeId !== 'undefined' && activeId) || fIds[0] || 1;
  }
  if (typeof renderList === 'function') renderList();
};

// Scrolls a card to sit just below the sticky header stack (top bar +
// reading-card-wrap), using their ACTUAL current rendered height rather
// than a guessed CSS scroll-margin-top — that guess was tuned for one
// layout state and went stale (visible as a scroll-then-correct jump)
// once the header's real height changed with the nav bar move.
function dgeScrollCardIntoView(cardEl) {
  if (!cardEl) return;
  const topBar = document.querySelector('.top-bar');
  const readingWrap = document.getElementById('readingCardWrap');
  const topBarHeight = topBar ? topBar.getBoundingClientRect().height : 0;
  const wrapHeight = readingWrap ? readingWrap.getBoundingClientRect().height : 0;
  const targetY = window.scrollY + cardEl.getBoundingClientRect().top - topBarHeight - wrapHeight - 10;
  // Instant, not smooth — an animated scroll visibly moves through the
  // space between old and new position before settling, which for a
  // quick Prev/Next tap can look exactly like "the page jumped and then
  // readjusted" even when it's working correctly. An instant jump has no
  // visible in-between motion to be misread that way.
  window.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
}

window.dgeSingleViewStep = function(direction) {
  if (!stotraData) return;
  const fIds = typeof getFilteredIds === 'function' ? getFilteredIds() : Object.keys(stotraData.shlokas).map(Number);
  const idx = fIds.indexOf(window.currentReadingId);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= fIds.length) return;
  window.currentReadingId = fIds[newIdx];
  // Keep the audio player's own track counter following the reader's
  // position too — but only when nothing is actually playing, so paging
  // to read never interrupts or retargets audio already underway.
  if (!(typeof isPlaying !== 'undefined' && isPlaying) && typeof loadShloka === 'function') loadShloka(window.currentReadingId);
  renderList();
  // Deferred a frame: reading layout (getBoundingClientRect) immediately
  // after renderList's DOM rebuild can catch the browser mid-reflow and
  // return a stale position, which is what a visible "jump then correct"
  // looks like — waiting for the next frame means layout has actually
  // finished settling before anything gets measured.
  requestAnimationFrame(() => {
    dgeScrollCardIntoView(document.getElementById(`shloka-${window.currentReadingId}`));
  });
};

// Used by TOC quick-jump: in single-view mode, jumping shows/reads that
// verse without forcing audio playback (list mode's jump-and-play
// behaviour via playShloka is untouched).
window.dgeSetSingleViewId = function(id) {
  window.currentReadingId = id;
  renderList();
  requestAnimationFrame(() => {
    dgeScrollCardIntoView(document.getElementById(`shloka-${window.currentReadingId}`));
  });
};

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

