// DGE Module: ai.js
// Maps to F-014: AI Assistance
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['ai.js'] = 'v1.3 (Explicit Global Binding)';

// 1. Text Selection & Tooltip Event Listener
document.addEventListener('selectionchange', () => {
  if (!document.body.classList.contains('is-authorized')) return;

  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (['INPUT', 'TEXTAREA'].includes(activeTag)) {
     const tooltip = document.getElementById('actionTooltip');
     const modalBtn = document.getElementById('modalAppendBtn');
     if (tooltip) tooltip.style.display = 'none';
     if (modalBtn) modalBtn.style.display = 'none';
     return;
  }

  clearTimeout(window.selectionTimeout);
  window.selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const txt = selection.toString().trim();
    const tooltip = document.getElementById('actionTooltip');
    const modalAppendBtn = document.getElementById('modalAppendBtn');

    if (!tooltip) return;

    const acharyaResEl = document.getElementById('acharyaResult');
    const isInsideAcharyaModal = acharyaResEl && acharyaResEl.contains(selection.anchorNode);

    const anchor = selection.anchorNode;
    const shlokaCard = anchor && anchor.nodeType === 3 ? anchor.parentElement.closest('.shloka-card') : (anchor && anchor.closest ? anchor.closest('.shloka-card') : null);
    
    if (shlokaCard) {
      window.contextShlokaId = parseInt(shlokaCard.id.split('-')[1]);
    } else if (!isInsideAcharyaModal) {
      window.contextShlokaId = null;
    }

    if (txt.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if(rect.top === 0 && rect.left === 0) return;

      if (isInsideAcharyaModal && modalAppendBtn) {
        window.modalSelectedText = txt;
        tooltip.style.display = 'none';
        modalAppendBtn.style.display = 'block';
        modalAppendBtn.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 50)}px`;
        modalAppendBtn.style.left = `${rect.left + (rect.width / 2)}px`;
      } else {
        window.lastSelectedText = txt;
        if (modalAppendBtn) modalAppendBtn.style.display = 'none';
        tooltip.style.display = 'flex';
        
        const tw = tooltip.offsetWidth || 260;
        let left = rect.left + (rect.width / 2);
        left = Math.max(tw/2 + 8, Math.min(left, window.innerWidth - tw/2 - 8));
        
        let yPos = rect.bottom + 8;
        if (yPos + 100 > window.innerHeight) { 
            yPos = rect.top - 95; 
        }
        
        tooltip.style.top = `${yPos}px`;
        tooltip.style.left = `${left}px`;
      }
    } else {
      tooltip.style.display = 'none';
      if (modalAppendBtn) modalAppendBtn.style.display = 'none';
    }
  }, 50);
});

// 2. Markdown Parser
function parseMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<div class="md-h3">$1</div>')
    .replace(/^## (.*$)/gim, '<div class="md-h2">$1</div>')
    .replace(/^\* (.*$)/gim, '<ul class="md-list"><li>$1</li></ul>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="md-strong">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/<\/ul>\n<ul class="md-list">/gim, '')
    .replace(/\n/g, '<br>');
}

// 3. Secret Key Modals & Settings
window.openKeyModal = function() { 
  const input = document.getElementById('userApiKeyInput');
  if (input) input.value = localStorage.getItem('user_gemini_key') || ''; 
  if (typeof openModal === 'function') openModal('keyModal');
};

window.closeKeyModal = function() { 
  if (typeof closeModal === 'function') closeModal('keyModal'); 
};

window.saveUserApiKey = function() {
  const input = document.getElementById('userApiKeyInput');
  const key = input ? input.value.trim() : '';
  if(key) { localStorage.setItem('user_gemini_key', key); } else { localStorage.removeItem('user_gemini_key'); }
  window.closeKeyModal();
};

// 4. Bhashya Picker Workflow
window.openBhashyaPicker = function(e) {
  if (e) e.preventDefault();
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';
  
  window.getSelection().removeAllRanges();

  const targetId = window.contextShlokaId || window.activeId || 1;
  window.currentAcharyaShlokaId = targetId;

  const shloka = window.stotraData ? window.stotraData.shlokas[targetId] : null;
  const container = document.getElementById('bhashyaOptionsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (shloka && shloka.commentaries && window.stotraData.metadata.availableCommentaries) {
    Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
      const name = window.stotraData.metadata.availableCommentaries[cKey] || cKey;
      const displayName = typeof applyTransliteration === 'function' ? applyTransliteration(name, window.activeScript || 'devanagari') : name;
      container.innerHTML += `
        <button class="bhashya-picker-btn" onpointerdown="window.executeBhashyaAnalysis('${cKey}')">
           <span>📖 ${displayName}</span>
           <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
        </button>`;
    });

    container.innerHTML += `
      <button class="bhashya-picker-btn" style="border-color: var(--accent-gold);" onpointerdown="window.executeBhashyaAnalysis('all')">
         <span>📚 All Available Commentaries Combined</span>
         <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
      </button>`;
  }

  container.innerHTML += `
    <button class="bhashya-picker-btn" style="background:transparent; border-style:dashed;" onpointerdown="window.executeBhashyaAnalysis('general')">
       <span>🌐 General Acharya Analysis (External Knowledge)</span>
       <span style="font-size:11px; opacity:0.6;">Analyze ➔</span>
    </button>`;

  if (typeof openModal === 'function') openModal('bhashyaPickerModal');
};

window.closeBhashyaPicker = function() {
  if (typeof closeModal === 'function') closeModal('bhashyaPickerModal');
};

window.executeBhashyaAnalysis = function(cKey) {
  window.closeBhashyaPicker();
  const targetId = window.currentAcharyaShlokaId || window.contextShlokaId || window.activeId || 1;
  const shloka = window.stotraData ? window.stotraData.shlokas[targetId] : null;

  let commentaryTextToFeed = "";
  let commTitle = "";

  if (cKey === 'all' && shloka && shloka.commentaries) {
    commTitle = "All Available Commentaries";
    Object.entries(shloka.commentaries).forEach(([k, v]) => {
       const name = window.stotraData.metadata.availableCommentaries[k] || k;
       commentaryTextToFeed += `\n--- Commentary: ${name} ---\n${v}\n`;
    });
  } else if (cKey !== 'general' && shloka && shloka.commentaries && shloka.commentaries[cKey]) {
    commTitle = window.stotraData.metadata.availableCommentaries[cKey] || cKey;
    commentaryTextToFeed = shloka.commentaries[cKey];
  }

  const payload = {
    type: 'commentary',
    selectedText: window.lastSelectedText,
    shlokaText: shloka ? shloka.sa : "",
    commentaryTitle: commTitle,
    commentaryText: commentaryTextToFeed
  };

  window.askAcharya(null, 'commentary', payload);
};

// 5. Core Ask Acharya Engine (Madhva Sampradaya Context)
window.askAcharya = async function(e, type, payload) {
  if (e) e.preventDefault();
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';

  window.currentAcharyaShlokaId = window.contextShlokaId || window.activeId;

  const apiKey = localStorage.getItem('user_gemini_key');
  if (!apiKey && document.body.classList.contains('is-authorized')) { 
      window.openKeyModal(); return; 
  } else if (!apiKey) {
      if (typeof openModal === 'function') openModal('acharyaModal');
      const loading = document.getElementById('acharyaLoading');
      const result = document.getElementById('acharyaResult');
      if (loading) loading.style.display = 'none';
      if (result) result.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>Please configure your Gemini API key via the Key Manager (🔑) in the top toolbar.`;
      return;
  }

  const text = payload ? payload.selectedText : (window.lastSelectedText || window.getSelection().toString().trim());
  if(!text && type !== 'commentary') return;
  window.getSelection().removeAllRanges();

  if (typeof openModal === 'function') openModal('acharyaModal');
  const loadingEl = document.getElementById('acharyaLoading');
  const resultEl = document.getElementById('acharyaResult');
  if (loadingEl) loadingEl.style.display = 'block';
  if (resultEl) resultEl.innerHTML = '';

  let targetLang = "English";
  if(window.activeScript === 'kannada') targetLang = "Kannada";
  if(window.activeScript === 'telugu') targetLang = "Telugu";
  if(window.activeScript === 'tamil') targetLang = "Tamil";
  if(window.activeScript === 'malayalam') targetLang = "Malayalam";

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
    const modelName = (window.appConfig && window.appConfig.geminiModel) ? window.appConfig.geminiModel : "gemini-3.6-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    const data = await response.json();
    if(data.error) throw new Error(data.error.message);

    let result = data.candidates[0].content.parts[0].text;
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.innerHTML = parseMarkdown(result);
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) {
      if (document.body.classList.contains('is-authorized')) {
         resultEl.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">Admin Debug Error:</span> ${err.message}`;
      } else {
         resultEl.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>The traditional text analysis engine is currently unavailable. Please try again later.`;
      }
    }
  }
};

window.shareAcharyaAnalysis = function() {
  const resEl = document.getElementById('acharyaResult');
  const resText = resEl ? resEl.innerText : '';
  if (!resText) return;
  if (navigator.share) {
    navigator.share({ title: `Acharya Analysis (Shloka ${window.currentAcharyaShlokaId || window.activeId || ''})`, text: resText }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(resText);
    if (typeof showToast === 'function') showToast("Analysis copied to clipboard!");
  }
};

window.closeAcharyaModal = function() { 
  if (typeof closeModal === 'function') closeModal('acharyaModal');
  const appendBtn = document.getElementById('modalAppendBtn');
  if (appendBtn) appendBtn.style.display = 'none';
  window.getSelection().removeAllRanges();
};
