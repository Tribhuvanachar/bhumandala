  function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    document.body.classList.add('modal-open'); 
  }

  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.body.classList.remove('modal-open'); 
  }

  function initAuthAndBranding() {
    const isAuthorized = localStorage.getItem('acharyaAuthorized') === 'true';
    if (isAuthorized) { document.body.classList.add('is-authorized'); }
    document.getElementById('stotraAuthor').innerText = `DESIGNED BY ${appConfig.designedBy.toUpperCase()}`;
    document.getElementById('contactEmailDisplay').innerText = appConfig.contactEmail;
    document.getElementById('configEmailLink').href = `mailto:${appConfig.contactEmail}`;
    document.getElementById('configEmailLink').innerText = appConfig.contactEmail;
    document.getElementById('appFooter').innerText = `${appConfig.version} · Designed by ${appConfig.designedBy}`;
  }

  function nsKey(base) { return `narasimha_${base}_${stotraCode}`; }

  function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.getElementById('darkModeBtn').innerText = isDark ? '🌙' : '☀️';
    const meta = document.getElementById('themeColorMeta');
    if (meta) meta.setAttribute('content', isDark ? '#18120E' : '#FFFDF9');
  }

  function toggleDarkMode() {
    const isDark = !document.body.classList.contains('dark-mode');
    applyDarkMode(isDark);
    localStorage.setItem('app_darkMode', isDark ? 'true' : 'false');
  }

  function applyFontSize(px) {
    document.documentElement.style.setProperty('--font-multiplier', px + 'px');
    document.querySelectorAll('#fontPopup .pop-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.size, 10) === px);
    });
  }

  function setFontSize(px, el) {
    applyFontSize(px);
    localStorage.setItem('app_fontSize', String(px));
    togglePopup('fontPopup');
  }

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
            // FIX: Strip invisible zero-width characters that break transliterators
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
    activeScript = code;
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
    
    showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
    
    setTimeout(() => {
        renderList();
        if (activeId) els.readingCard.innerHTML = getText(activeId);
        togglePopup('scriptPopup');
    }, 50);
  }

  (function restorePrefs() {
    applyDarkMode(localStorage.getItem('app_darkMode') === 'true');
    const savedFont = parseInt(localStorage.getItem('app_fontSize'), 10);
    if (!isNaN(savedFont)) applyFontSize(savedFont);
    const savedScript = localStorage.getItem('app_script');
    if (savedScript) applyScript(savedScript);
  })();

  function initApp() {
    document.getElementById('stotraTitle').innerHTML = applyTransliteration(stotraData.metadata.title, activeScript);
    document.getElementById('rangeStart').max = stotraData.metadata.totalShlokas || 43;
    document.getElementById('rangeEnd').max = stotraData.metadata.totalShlokas || 43;

    const dynamicList = document.getElementById('commentaryDynamicList');
    dynamicList.innerHTML = '';
    els.searchScope.innerHTML = '<option value="all">Search All</option><option value="mula">Shloka Only</option>';

    if(stotraData.metadata.availableCommentaries) {
      Object.entries(stotraData.metadata.availableCommentaries).forEach(([key, name]) => {
        dynamicList.innerHTML += `<div class="pop-item" onclick="setCommentaryView('${key}', this)">${applyTransliteration(name, activeScript)}</div>`;
        els.searchScope.innerHTML += `<option value="${key}">${applyTransliteration(name, activeScript)} Only</option>`;
      });
    }

    if (localStorage.getItem(nsKey('allCached')) === 'true') {
      els.cacheBtn.innerText = `✅ All Cached`;
      els.cacheBtn.dataset.cached = "true";
      els.cacheBtn.style.background = "#e8f5e9"; els.cacheBtn.style.color = "#2e7d32"; els.cacheBtn.style.borderColor = "#c8e6c9";
    }

    renderList();
  }

  function getText(id) {
    if (!stotraData || !stotraData.shlokas[id]) return `श्लोक ${id}`;
    return applyTransliteration(stotraData.shlokas[id].sa, activeScript);
  }

  function formatTime(s) { if (isNaN(s)) return "0:00.000"; const m = Math.floor(s/60), sec = Math.floor(s%60), ms = Math.floor((s%1)*1000); return m + ":" + (sec<10?"0":"") + sec + "." + String(ms).padStart(3,'0'); }

  function updateRepeatDisplay() { const t = parseInt(els.repeatInput.value) || 1; els.repeatCounter.innerText = (activeId && t > 1) ? `Loop ${currentLoopCount + 1}/${t}` : ""; }

  function getFilteredIds() {
    if(!stotraData) return [];
    let ids = [];
    const total = stotraData.metadata.totalShlokas || 43;
    const rs = parseInt(document.getElementById('rangeStart').value), re = parseInt(document.getElementById('rangeEnd').value);
    const rm = document.getElementById('rangeMode').value, hasRange = !isNaN(rs) && !isNaN(re) && rs <= re;
    for (let i = 1; i <= total; i++) {
      if (currentFilter === 'fav' && marks[i] !== 'fav') continue;
      if (currentFilter === 'practice' && marks[i] !== 'practice') continue;
      if (hasRange) { const inR = (i >= rs && i <= re); if ((rm === 'include' && !inR) || (rm === 'exclude' && inR)) continue; }
      ids.push(i);
    }
    return ids;
  }

  function clearRange() { document.getElementById('rangeStart').value = ""; document.getElementById('rangeEnd').value = ""; applyRangeFilter(); }

  function setFilter(type) {
    currentFilter = type; document.getElementById('filterPopup').classList.remove('show');
    document.querySelectorAll('#filterPopup .pop-item').forEach(el => el.classList.remove('active')); document.getElementById(`opt-${type}`).classList.add('active');
    renderList();
    if (type !== 'none') { const aIds = getFilteredIds(); if (aIds.length) playShloka(aIds[0]); else { currentAudio.pause(); activeId = null; isPlaying = false; updatePlayUI(); } }
  }

  function applyRangeFilter() { renderList(); const aIds = getFilteredIds(); if (aIds.length && currentFilter !== 'none') playShloka(aIds[0]); }

  function handleSearch() {
    els.clearSearchBtn.style.display = els.searchInput.value ? 'block' : 'none';
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderList, 120);
  }

  function clearSearch() { els.searchInput.value = ''; els.navContainer.style.display = 'none'; handleSearch(); }

  function highlightText(text, query) {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})(?![^<]*>|[^<>]*<\\/)`, 'gi');
    return text.replace(regex, '<mark class="search-match">$1</mark>');
  }

  function renderList() {
    if(!stotraData) return;
    els.listEl.innerHTML = '';
    const fIds = getFilteredIds();
    const query = els.searchInput.value.toLowerCase().trim();
    const scope = els.searchScope.value;
    const total = stotraData.metadata.totalShlokas || 43;

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
      c.className = `shloka-card ${activeId===i ? 'active':''}`; c.id = `shloka-${i}`;

      let cardActionsHtml = '';
      let badgeHtml = '';
      if (document.body.classList.contains('is-authorized')) {
        let mClass = "btn-icon", mIcon = "⋮";
        if (marks[i] === 'fav') { mClass += " is-fav"; mIcon = "★"; } else if (marks[i] === 'practice') { mClass += " is-practice"; mIcon = "🚩"; }
        const nClass = notes[i] ? "btn-icon has-note" : "btn-icon";
        badgeHtml = (snippets[i] && snippets[i].length > 0) ? `<div class="snippet-badge" onclick="openSnippetModal(${i}, event)">🎯 ${snippets[i].length}</div>` : '';
        cardActionsHtml = `<div class="card-actions"><button class="${nClass}" onclick="openNote(${i})">📝</button><button class="${mClass}" onclick="openMarkerMenu(event, ${i})">${mIcon}</button></div>`;
      }

      let commentaryHtml = '';
      if (shloka.commentaries) {
        Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
          const isSelected = (selectedCommentaryView === 'all' || selectedCommentaryView === cKey);
          const isForcedBySearch = forceCommentaries.includes(cKey);

          if (isSelected || isForcedBySearch) {
            const name = stotraData.metadata.availableCommentaries[cKey] || cKey;
            let convertedText = applyTransliteration(cText, activeScript);
            let convertedName = applyTransliteration(name, activeScript);
            commentaryHtml += `<div class="commentary-block" data-ckey="${cKey}"><div class="commentary-title">${convertedName}</div>${highlightText(convertedText, query)}</div>`;
          }
        });
      }

      c.innerHTML = `
        <div class="shloka-main-row">
          <div class="shloka-num">${i}</div>
          <div class="shloka-text" onclick="playShloka(${i})">${highlightText(getText(i), query)} ${badgeHtml}</div>
          ${cardActionsHtml}
        </div>
        ${commentaryHtml}`;
      els.listEl.appendChild(c);
    }

    window.searchMatches = Array.from(document.querySelectorAll('.search-match'));
    if (query && window.searchMatches.length > 0) {
      els.navContainer.style.display = 'flex';
      navSearch(1);
    } else {
      els.navContainer.style.display = 'none';
    }
  }

  function navSearch(direction) {
    if (!window.searchMatches || window.searchMatches.length === 0) return;
    if(window.currentMatchIdx >= 0 && window.searchMatches[window.currentMatchIdx]) { window.searchMatches[window.currentMatchIdx].classList.remove('active-match'); }

    window.currentMatchIdx += direction;
    if (window.currentMatchIdx >= window.searchMatches.length) window.currentMatchIdx = 0;
    if (window.currentMatchIdx < 0) window.currentMatchIdx = window.searchMatches.length - 1;

    const target = window.searchMatches[window.currentMatchIdx];
    target.classList.add('active-match');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('searchMatchCount').innerText = `${window.currentMatchIdx + 1} / ${window.searchMatches.length}`;
  }

  function updatePlayUI() { els.playBtn.innerHTML = isPlaying ? '⏸' : '▶'; if(activeId) els.readingCard.classList.toggle('highlight', isPlaying); }

  async function resolveAudioSrc(id) {
    const primary = `${stotraData.metadata.archiveBaseUrl}${stotraData.metadata.filePrefix}${id}${stotraData.metadata.fileExtension}`;
    const alt = `${stotraData.metadata.archiveBaseUrl}${stotraData.metadata.filePrefix}${id}%E2%80%8B${stotraData.metadata.fileExtension}`;
    if ('caches' in window) {
      try {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const hit = (await cache.match(primary)) || (await cache.match(alt));
        if (hit) { const blob = await hit.blob(); return URL.createObjectURL(blob); }
      } catch (e) {}
    }
    return primary;
  }

  async function playShloka(id) {
    if (!stotraData) return;
    if (activeId === id && isPlaying) { currentAudio.pause(); return; }
    activeId = id; contextShlokaId = id; currentLoopCount = 0; audioRetryDone = false; updateRepeatDisplay(); renderList();
    const ac = document.getElementById(`shloka-${id}`); if (ac) ac.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const total = stotraData.metadata.totalShlokas || 43;
    els.trackLabel.innerText = `${id}/${total}`; els.readingCard.innerHTML = getText(id); els.timeDisplay.innerText = "0:00.000 / 0:00.000";
    currentAudio.src = await resolveAudioSrc(id);
    currentAudio.playbackRate = parseFloat(els.speedInput.value) || 1.0;
    els.loopA.value = ""; els.loopB.value = ""; els.enableAB.checked = false;
    currentAudio.play().catch(err => { if(err.name !== 'AbortError') console.error(err); });
  }

  function togglePlay() {
    if (!stotraData) return;
    if (!activeId) { const aIds = getFilteredIds(); if(aIds.length) playShloka(aIds[0]); }
    else if (isPlaying) {
      currentAudio.pause();
      if (els.autoABToggle.checked) {
        const curr = currentAudio.currentTime.toFixed(1);
        if (!els.loopA.value) { els.loopA.value = curr; }
        else if (!els.loopB.value) { els.loopB.value = curr; els.enableAB.checked = true; currentAudio.currentTime = parseFloat(els.loopA.value); currentAudio.play(); }
        else { els.loopA.value = ""; els.loopB.value = ""; els.enableAB.checked = false; }
      }
    } else { currentAudio.play(); }
  }

  function playNextFiltered() { const ids = getFilteredIds(); if (!ids.length) return; const idx = ids.indexOf(activeId); if (idx !== -1 && idx < ids.length - 1) playShloka(ids[idx + 1]); else { currentAudio.pause(); els.repeatCounter.innerText = ""; } }

  function playPrevFiltered() { const ids = getFilteredIds(); if (!ids.length) return; const idx = ids.indexOf(activeId); if (idx > 0) playShloka(ids[idx - 1]); else playShloka(ids[ids.length - 1]); }

  function setCommentaryView(view, el) {
    selectedCommentaryView = view;
    document.querySelectorAll('#commentaryPopup .pop-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    togglePopup('commentaryPopup');
    renderList();
  }

  function parseMarkdown(md) {
    return md
      .replace(/^### (.*$)/gim, '<div class="md-h3">$1</div>')
      .replace(/^## (.*$)/gim, '<div class="md-h2">$1</div>')
      .replace(/^\* (.*$)/gim, '<ul class="md-list"><li>$1</li></ul>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="md-strong">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<\/ul>\n<ul class="md-list">/gim, '')
      .replace(/\n/g, '<br>');
  }

  function appendSelectedTextToNote(e) {
    if (e) e.preventDefault();

    document.getElementById('modalAppendBtn').style.display = 'none';
    window.getSelection().removeAllRanges();

    const targetId = currentAcharyaShlokaId || contextShlokaId || activeId;

    if (!targetId) {
      showToast("Please tap on a Shloka card first to make it active before appending notes.");
      return;
    }

    if (!modalSelectedText) return;

    const existingNote = notes[targetId] || "";
    const updatedNote = existingNote ? `${existingNote}\n\n[Acharya Excerpt]:\n${modalSelectedText}` : `[Acharya Excerpt]:\n${modalSelectedText}`;
    notes[targetId] = updatedNote;
    localStorage.setItem(nsKey('notes'), JSON.stringify(notes));

    renderList();
    showToast(`Successfully appended excerpt to Shloka ${targetId} notes!`);
  }

  function openKeyModal() { 
      document.getElementById('userApiKeyInput').value = localStorage.getItem('user_gemini_key') || ''; 
      openModal('keyModal');
  }

  function closeKeyModal() { closeModal('keyModal'); }

  function saveUserApiKey() {
    const key = document.getElementById('userApiKeyInput').value.trim();
    if(key) { localStorage.setItem('user_gemini_key', key); } else { localStorage.removeItem('user_gemini_key'); }
    closeKeyModal();
  }

  function openBhashyaPicker(e) {
    if (e) e.preventDefault();
    document.getElementById('actionTooltip').style.display = 'none';
    
    // FIX: Force Android Native Toolbar Dismissal
    window.getSelection().removeAllRanges();

    const targetId = contextShlokaId || activeId || 1;
    currentAcharyaShlokaId = targetId;

    const shloka = stotraData.shlokas[targetId];
    const container = document.getElementById('bhashyaOptionsContainer');
    container.innerHTML = '';

    if (shloka && shloka.commentaries) {
      Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
        const name = stotraData.metadata.availableCommentaries[cKey] || cKey;
        const displayName = applyTransliteration(name, activeScript);
        container.innerHTML += `
          <button class="bhashya-picker-btn" onpointerdown="executeBhashyaAnalysis('${cKey}')">
             <span>📖 ${displayName}</span>
             <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
          </button>`;
      });

      container.innerHTML += `
        <button class="bhashya-picker-btn" style="border-color: var(--accent-gold);" onpointerdown="executeBhashyaAnalysis('all')">
           <span>📚 All Available Commentaries Combined</span>
           <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
        </button>`;
    }

    container.innerHTML += `
      <button class="bhashya-picker-btn" style="background:transparent; border-style:dashed;" onpointerdown="executeBhashyaAnalysis('general')">
         <span>🌐 General Acharya Analysis (External Knowledge)</span>
         <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
      </button>`;

    openModal('bhashyaPickerModal');
  }

  function closeBhashyaPicker() {
    closeModal('bhashyaPickerModal');
  }

  function executeBhashyaAnalysis(cKey) {
    closeBhashyaPicker();
    const targetId = currentAcharyaShlokaId || contextShlokaId || activeId || 1;
    const shloka = stotraData.shlokas[targetId];

    let commentaryTextToFeed = "";
    let commTitle = "";

    if (cKey === 'all') {
      commTitle = "All Available Commentaries";
      Object.entries(shloka.commentaries).forEach(([k, v]) => {
         const name = stotraData.metadata.availableCommentaries[k] || k;
         commentaryTextToFeed += `\n--- Commentary: ${name} ---\n${v}\n`;
      });
    } else if (cKey !== 'general' && shloka.commentaries && shloka.commentaries[cKey]) {
      commTitle = stotraData.metadata.availableCommentaries[cKey] || cKey;
      commentaryTextToFeed = shloka.commentaries[cKey];
    }

    const payload = {
      type: 'commentary',
      selectedText: lastSelectedText,
      shlokaText: shloka ? shloka.sa : "",
      commentaryTitle: commTitle,
      commentaryText: commentaryTextToFeed
    };

    askAcharya(null, 'commentary', payload);
  }

  async function askAcharya(e, type, payload) {
    if (e) e.preventDefault();
    document.getElementById('actionTooltip').style.display = 'none';

    currentAcharyaShlokaId = contextShlokaId || activeId;

    const apiKey = localStorage.getItem('user_gemini_key');
    if (!apiKey && document.body.classList.contains('is-authorized')) { 
        openKeyModal(); return; 
    } else if (!apiKey) {
        openModal('acharyaModal');
        document.getElementById('acharyaLoading').style.display = 'none';
        document.getElementById('acharyaResult').innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>The traditional text analysis engine is currently unavailable. Please try again later.`;
        return;
    }

    const text = payload ? payload.selectedText : (lastSelectedText || window.getSelection().toString().trim());
    if(!text && type !== 'commentary') return;
    window.getSelection().removeAllRanges();

    openModal('acharyaModal');
    document.getElementById('acharyaLoading').style.display = 'block';
    document.getElementById('acharyaResult').innerHTML = '';

    let targetLang = "English";
    if(activeScript === 'kannada') targetLang = "Kannada";
    if(activeScript === 'telugu') targetLang = "Telugu";
    if(activeScript === 'tamil') targetLang = "Tamil";
    if(activeScript === 'malayalam') targetLang = "Malayalam";

    let promptText = "";
    if (type === 'shloka') {
        promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). For the verse: "${text}", provide: 1. Padachheda (Word-by-word split) 2. Anvaya (Prose word order) 3. Word Meaning 4. Bhavartha (Overarching theme strictly according to Sri Madhvacharya's philosophy). Format using clean markdown headings.`;
    } else if (type === 'grammar') {
        promptText = `You are a traditional Vyakarana Acharya. For the text: "${text}", provide: 1. Dhatu & Gana (if verb) 2. Pratyaya (Krt/Taddhita/Tin) 3. Vibhakti & Linga (if noun) 4. Samasa Vigraha (if compound). Format using clean markdown.`;
    } else if (type === 'commentary') {
        if (payload && payload.commentaryText) {
            promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). Analyze ONLY the supplied commentary text provided below. Do NOT hallucinate external commentaries.

Mula Shloka: "${payload.shlokaText}"
Commentary Name: "${payload.commentaryTitle}"
Commentary Text: "${payload.commentaryText}"
Highlighted Fragment: "${payload.selectedText}"

Provide a detailed scholarly breakdown in clean markdown:
1. Sentence-by-Sentence Breakdown & Word-by-Word Meaning of this supplied commentary fragment.
2. Pramana & Citation Expansion: Identify every scriptural quote (Shruti, Smriti, Gita, Amarakosha, etc.) cited in this text. Provide the FULL Sanskrit quote, source attribution, and precise meaning.
3. Philosophical Siddhanta strictly according to Sri Madhvacharya's Dvaita philosophy derived from this commentary.`;
        } else {
            promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). Analyze this commentary excerpt: "${text}". Provide: 1. Sentence Breakdown 2. Purvapaksha & Siddhanta (strictly according to Sri Madhvacharya) 3. Pramana/Citations expanded with full quotes. Format using clean markdown.`;
        }
    } else if (type === 'translate') {
        promptText = `Translate and explain the meaning of this Sanskrit text: "${text}" into ${targetLang}. Provide a natural translation and a brief summary of its philosophical significance according to the Madhva Sampradaya (Dvaita philosophy). Format cleanly using markdown.`;
    }

    try {
      const modelName = appConfig.geminiModel || "gemini-3.6-flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error.message);

      let result = data.candidates[0].content.parts[0].text;
      document.getElementById('acharyaLoading').style.display = 'none';
      document.getElementById('acharyaResult').innerHTML = parseMarkdown(result);
    } catch (err) {
      document.getElementById('acharyaLoading').style.display = 'none';
      if (document.body.classList.contains('is-authorized')) {
         document.getElementById('acharyaResult').innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">Admin Debug Error:</span> ${err.message}`;
      } else {
         document.getElementById('acharyaResult').innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>The traditional text analysis engine is currently unavailable. Please try again later.`;
      }
    }
  }

  function shareAcharyaAnalysis() {
    const resText = document.getElementById('acharyaResult').innerText;
    if (!resText) return;
    if (navigator.share) {
      navigator.share({ title: `Acharya Analysis (Shloka ${currentAcharyaShlokaId || activeId || ''})`, text: resText }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(resText);
      showToast("Analysis copied to clipboard!");
    }
  }

  function closeAcharyaModal() { 
    closeModal('acharyaModal');
    document.getElementById('modalAppendBtn').style.display = 'none';
    window.getSelection().removeAllRanges();
  }

  function saveSnippet() {
    if(!activeId) return alert("Select a shloka first.");
    const a = parseFloat(els.loopA.value), b = parseFloat(els.loopB.value);
    if(isNaN(a) || isNaN(b)) return alert("Set Start and End times in the A-B Loop first.");
    if(!snippets[activeId]) snippets[activeId] = [];
    snippets[activeId].push({ start: a, end: b });
    localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets));
    renderList();
  }

  function openSnippetModal(id, e) {
    e.stopPropagation(); targetSnipId = id;
    document.getElementById('snipShlokaNum').innerText = id;
    const container = document.getElementById('snippetListContainer'); container.innerHTML = '';

    if(snippets[id] && snippets[id].length > 0) {
      snippets[id].forEach((snip, index) => {
        container.innerHTML += `
          <div class="snip-list-item">
            <div><strong>Loop ${index + 1}:</strong> ${snip.start}s to ${snip.end}s</div>
            <div><button class="btn-sm" style="color:var(--accent-red); margin-right:4px;" onclick="playSnippet(${id}, ${snip.start}, ${snip.end})">▶ Play</button><button class="btn-sm" onclick="deleteSnippet(${id}, ${index})">🗑</button></div>
          </div>`;
      });
    } else { container.innerHTML = "<p style='font-size:12px; color:#8a7a63;'>No snippets saved.</p>"; }
    openModal('snippetModal');
  }

  function closeSnippetModal() { closeModal('snippetModal'); }

  function playSnippet(id, start, end) { closeSnippetModal(); if(activeId !== id) { playShloka(id); } els.loopA.value = start; els.loopB.value = end; els.enableAB.checked = true; currentAudio.currentTime = start; currentAudio.play(); }

  function deleteSnippet(id, index) { snippets[id].splice(index, 1); if(snippets[id].length === 0) delete snippets[id]; localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets)); renderList(); openSnippetModal(id, {stopPropagation:()=>{}}); }

  function togglePopup(id) { document.querySelectorAll('.popup').forEach(p => { if(p.id !== id) p.classList.remove('show'); }); document.getElementById(id).classList.toggle('show'); }

  function openMarkerMenu(e, id) {
    targetMenuId = id;
    const menu = els.markerMenu;
    menu.classList.add('show');
    const rect = menu.getBoundingClientRect();
    let x = e.clientX - 130, y = e.clientY - 40;
    x = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  function setMark(type) { if (type === 'none') delete marks[targetMenuId]; else marks[targetMenuId] = type; localStorage.setItem(nsKey('marks'), JSON.stringify(marks)); els.markerMenu.classList.remove('show'); renderList(); }

  async function cacheAllAudio(btn) {
    if(!stotraData || btn.dataset.cached === "true") return;
    if (!('caches' in window)) { alert('This browser does not support offline caching.'); return; }

    btn.innerText = "⏳ Preloading 0%"; btn.disabled = true;
    const total = stotraData.metadata.totalShlokas || 43;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const queue = Array.from({ length: total }, (_, i) => i + 1);
    let done = 0, success = 0;
    const CONCURRENCY = 4;

    async function worker() {
      while (queue.length) {
        const i = queue.shift();
        const primary = `${stotraData.metadata.archiveBaseUrl}${stotraData.metadata.filePrefix}${i}${stotraData.metadata.fileExtension}`;
        const alt = `${stotraData.metadata.archiveBaseUrl}${stotraData.metadata.filePrefix}${i}%E2%80%8B${stotraData.metadata.fileExtension}`;
        try {
          let res = await fetch(primary);
          if (!res.ok) res = await fetch(alt);
          if (res.ok) { await cache.put(res.url, res.clone()); success++; }
        } catch (e) { /* skip this track */ }
        done++;
        btn.innerText = `⏳ Preloading ${Math.round((done/total)*100)}%`;
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    localStorage.setItem(nsKey('allCached'), 'true');
    btn.innerText = `✅ All Cached (${success}/${total})`;
    btn.dataset.cached = "true";
    btn.style.background = "#e8f5e9"; btn.style.color = "#2e7d32"; btn.style.borderColor = "#c8e6c9";
  }

  function openNoteModal() {
     openModal('noteModal');
  }

  function closeNoteModal() {
     closeModal('noteModal');
     document.getElementById('noteModalBox').classList.remove('fullscreen');
     document.getElementById('maxNoteBtn').innerText = '⛶ Expand';
  }

  function openNote(id) { 
    targetNoteId = id; 
    document.getElementById('noteShlokaNum').innerText = id; 
    document.getElementById('noteText').value = notes[id] || ""; 
    openNoteModal();
  }

  function saveNote() { 
    const txt = document.getElementById('noteText').value.trim(); 
    if(txt) notes[targetNoteId] = txt; else delete notes[targetNoteId]; 
    localStorage.setItem(nsKey('notes'), JSON.stringify(notes)); 
    closeNoteModal(); 
    renderList(); 
    showToast(`Saved notes for Shloka ${targetNoteId}!`);
  }

  function clearNote() {
    if (confirm("Are you sure you want to clear all notes for this Shloka?")) {
        document.getElementById('noteText').value = "";
    }
  }

  function toggleMaximizeNote() {
    const box = document.getElementById('noteModalBox');
    const btn = document.getElementById('maxNoteBtn');
    box.classList.toggle('fullscreen');
    if (box.classList.contains('fullscreen')) {
        btn.innerText = '🗗 Minimize';
    } else {
        btn.innerText = '⛶ Expand';
    }
  }
