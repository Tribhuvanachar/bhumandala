// js/ai.js
// Maps to F-014 (AI Assistance / Acharya)

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

function openKeyModal() { 
  document.getElementById('userApiKeyInput').value = localStorage.getItem('user_gemini_key') || ''; 
  if (typeof openModal === 'function') openModal('keyModal');
}

function closeKeyModal() { 
  if (typeof closeModal === 'function') closeModal('keyModal'); 
}

function saveUserApiKey() {
  const key = document.getElementById('userApiKeyInput').value.trim();
  if(key) { 
    localStorage.setItem('user_gemini_key', key); 
  } else { 
    localStorage.removeItem('user_gemini_key'); 
  }
  closeKeyModal();
}

function openBhashyaPicker(e) {
  if (e) e.preventDefault();
  
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';
  
  window.getSelection().removeAllRanges();

  const targetId = contextShlokaId || activeId || 1;
  currentAcharyaShlokaId = targetId;

  if (!stotraData || !stotraData.shlokas[targetId]) return;
  
  const shloka = stotraData.shlokas[targetId];
  const container = document.getElementById('bhashyaOptionsContainer');
  if (!container) return;
  
  container.innerHTML = '';

  if (shloka && shloka.commentaries) {
    Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
      const name = stotraData.metadata.availableCommentaries[cKey] || cKey;
      const displayName = typeof applyTransliteration === 'function' ? applyTransliteration(name, activeScript) : name;
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

  if (typeof openModal === 'function') openModal('bhashyaPickerModal');
}

function closeBhashyaPicker() {
  if (typeof closeModal === 'function') closeModal('bhashyaPickerModal');
}

function executeBhashyaAnalysis(cKey) {
  closeBhashyaPicker();
  const targetId = currentAcharyaShlokaId || contextShlokaId || activeId || 1;
  if (!stotraData || !stotraData.shlokas[targetId]) return;
  
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
  
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';

  currentAcharyaShlokaId = contextShlokaId || activeId;

  const apiKey = localStorage.getItem('user_gemini_key');
  if (!apiKey && document.body.classList.contains('is-authorized')) { 
      openKeyModal(); 
      return; 
  } else if (!apiKey) {
      if (typeof openModal === 'function') openModal('acharyaModal');
      document.getElementById('acharyaLoading').style.display = 'none';
      document.getElementById('acharyaResult').innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>The traditional text analysis engine is currently unavailable. Please try again later.`;
      return;
  }

  const text = payload ? payload.selectedText : (lastSelectedText || window.getSelection().toString().trim());
  if(!text && type !== 'commentary') return;
  window.getSelection().removeAllRanges();

  if (typeof openModal === 'function') openModal('acharyaModal');
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
    const modelName = (typeof appConfig !== 'undefined' && appConfig.geminiModel) ? appConfig.geminiModel : "gemini-3.6-flash";
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
    if (typeof showToast === 'function') showToast("Analysis copied to clipboard!");
  }
}

function closeAcharyaModal() { 
  if (typeof closeModal === 'function') closeModal('acharyaModal');
  const modalBtn = document.getElementById('modalAppendBtn');
  if (modalBtn) modalBtn.style.display = 'none';
  window.getSelection().removeAllRanges();
}
