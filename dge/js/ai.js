// DGE Module: ai.js
// Maps to F-014: AI Assistance
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['ai.js'] = 'v2.0 (Multi-Provider + Follow-up Chat)';

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

// 3. Multi-Provider AI Key Settings
function dgeCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
const AI_PROVIDER_IDS = ['gemini', 'openai', 'claude'];

window.openKeyModal = function() {
  AI_PROVIDER_IDS.forEach(id => {
    const keyInput = document.getElementById(`user${dgeCap(id)}KeyInput`);
    const modelInput = document.getElementById(`user${dgeCap(id)}ModelInput`);
    if (keyInput) keyInput.value = localStorage.getItem(`user_${id}_key`) || '';
    if (modelInput) modelInput.value = localStorage.getItem(`user_${id}_model`) || (window.AI_PROVIDERS && window.AI_PROVIDERS[id] ? window.AI_PROVIDERS[id].defaultModel : '') || '';
  });
  const parallelToggle = document.getElementById('aiParallelModeToggle');
  if (parallelToggle) parallelToggle.checked = localStorage.getItem('user_ai_parallel_mode') === 'true';
  if (typeof openModal === 'function') openModal('keyModal');
};

window.closeKeyModal = function() { 
  if (typeof closeModal === 'function') closeModal('keyModal'); 
};

window.saveAllApiKeys = function() {
  AI_PROVIDER_IDS.forEach(id => {
    const keyInput = document.getElementById(`user${dgeCap(id)}KeyInput`);
    const modelInput = document.getElementById(`user${dgeCap(id)}ModelInput`);
    const key = keyInput ? keyInput.value.trim() : '';
    const model = modelInput ? modelInput.value.trim() : '';
    if (key) localStorage.setItem(`user_${id}_key`, key); else localStorage.removeItem(`user_${id}_key`);
    if (model) localStorage.setItem(`user_${id}_model`, model); else localStorage.removeItem(`user_${id}_model`);
  });
  const parallelToggle = document.getElementById('aiParallelModeToggle');
  if (parallelToggle) localStorage.setItem('user_ai_parallel_mode', parallelToggle.checked ? 'true' : 'false');

  window.closeKeyModal();
  if (typeof showToast === 'function') showToast('AI settings saved.');
};

function dgeGetConfiguredProviders() {
  const out = [];
  AI_PROVIDER_IDS.forEach(id => {
    const key = localStorage.getItem(`user_${id}_key`);
    if (key) {
      const model = localStorage.getItem(`user_${id}_model`) || (window.AI_PROVIDERS && window.AI_PROVIDERS[id] ? window.AI_PROVIDERS[id].defaultModel : '') || '';
      out.push({ id, key, model });
    }
  });
  return out;
}

// --- Provider call adapters ---------------------------------------------
// Note: Gemini and OpenAI's chat/completions endpoints support direct
// browser calls out of the box. Anthropic's API requires the
// 'anthropic-dangerous-direct-browser-access' header to allow CORS from a
// browser context (a deliberate, documented opt-in on their side for
// "bring your own key" apps like this one) — without it, requests are
// rejected with a CORS/auth error.

async function dgeCallGemini(apiKey, model, systemPrompt, history) {
  const modelName = model || (typeof appConfig !== 'undefined' && appConfig.geminiModel) || 'gemini-3.6-flash';
  const contents = history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gemini request failed');
  return data.candidates[0].content.parts[0].text;
}

async function dgeCallOpenAI(apiKey, model, systemPrompt, history) {
  if (!model) throw new Error('No OpenAI model set — add one in 🔑 Key settings (e.g. a current GPT model name from your OpenAI account).');
  const messages = [{ role: 'system', content: systemPrompt }, ...history.map(m => ({ role: m.role, content: m.content }))];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'OpenAI request failed');
  return data.choices[0].message.content;
}

async function dgeCallClaude(apiKey, model, systemPrompt, history) {
  if (!model) throw new Error('No Claude model set — add one in 🔑 Key settings (e.g. a current Claude model name from your Anthropic console).');
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model, max_tokens: 1500, system: systemPrompt, messages })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Claude request failed');
  return (data.content || []).map(b => b.text || '').join('');
}

async function dgeCallProvider(p, systemPrompt, history) {
  if (p.id === 'gemini') return dgeCallGemini(p.key, p.model, systemPrompt, history);
  if (p.id === 'openai') return dgeCallOpenAI(p.key, p.model, systemPrompt, history);
  if (p.id === 'claude') return dgeCallClaude(p.key, p.model, systemPrompt, history);
  throw new Error('Unknown provider: ' + p.id);
}

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
function dgeShowFollowUpBox(visible) {
  const box = document.getElementById('acharyaFollowUpBox');
  if (box) box.style.display = visible ? 'flex' : 'none';
}

async function dgeRunAcharyaQuery(promptText) {
  const resultEl = document.getElementById('acharyaResult');
  const loadingEl = document.getElementById('acharyaLoading');
  const providers = dgeGetConfiguredProviders();

  if (providers.length === 0) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>Please add at least one AI key via the Key Manager (🔑) in the top toolbar.`;
    dgeShowFollowUpBox(false);
    return;
  }

  window.acharyaHistory = window.acharyaHistory || [];
  window.acharyaHistory.push({ role: 'user', content: promptText });

  if (loadingEl) loadingEl.style.display = 'block';
  dgeShowFollowUpBox(false);

  const parallelMode = localStorage.getItem('user_ai_parallel_mode') === 'true';
  const activeProviders = parallelMode ? providers : providers.slice(0, 1);

  const settled = await Promise.allSettled(
    activeProviders.map(p => dgeCallProvider(p, window.acharyaSystemPrompt || '', window.acharyaHistory))
  );

  const succeeded = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') succeeded.push({ provider: activeProviders[i], text: r.value });
    else console.error(`${activeProviders[i].id} failed:`, r.reason);
  });

  if (loadingEl) loadingEl.style.display = 'none';

  if (succeeded.length === 0) {
    window.acharyaHistory.pop();
    if (resultEl) {
      const isAuth = document.body.classList.contains('is-authorized');
      resultEl.innerHTML = isAuth
        ? `<span style="color:var(--accent-red); font-weight:bold;">All configured providers failed.</span> Check the API key(s) and model name(s) in 🔑, and the browser console for details.`
        : `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>The traditional text analysis engine is currently unavailable. Please try again later.`;
    }
    dgeShowFollowUpBox(true);
    return;
  }

  let finalReplyForHistory;
  let html = '';

  if (succeeded.length === 1) {
    finalReplyForHistory = succeeded[0].text;
    html = parseMarkdown(finalReplyForHistory);
  } else {
    succeeded.forEach(s => {
      const label = (window.AI_PROVIDERS && window.AI_PROVIDERS[s.provider.id]) ? window.AI_PROVIDERS[s.provider.id].label : s.provider.id;
      html += `<div class="provider-answer"><div class="provider-answer-label">${label}</div>${parseMarkdown(s.text)}</div>`;
    });

    try {
      const summaryPrompt = `Here are ${succeeded.length} independent AI responses to the same question: "${promptText}"\n\n` +
        succeeded.map((s, i) => `Response ${i + 1} (${s.provider.id}):\n${s.text}`).join('\n\n---\n\n') +
        `\n\nSynthesize these into ONE combined answer, noting any point where they meaningfully disagree. Format using clean markdown.`;
      finalReplyForHistory = await dgeCallProvider(succeeded[0].provider, window.acharyaSystemPrompt || '', [{ role: 'user', content: summaryPrompt }]);
      html = `<div class="provider-summary"><div class="provider-answer-label">🧭 Combined Summary</div>${parseMarkdown(finalReplyForHistory)}</div>` + html;
    } catch (e) {
      console.error('Summary generation failed', e);
      finalReplyForHistory = succeeded[0].text;
    }
  }

  window.acharyaHistory.push({ role: 'assistant', content: finalReplyForHistory });
  if (resultEl) resultEl.innerHTML = html;
  dgeShowFollowUpBox(true);
}

window.askAcharya = async function(e, type, payload) {
  if (e) e.preventDefault();
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';

  window.currentAcharyaShlokaId = window.contextShlokaId || window.activeId;

  const providers = dgeGetConfiguredProviders();
  if (providers.length === 0) {
    if (document.body.classList.contains('is-authorized')) { window.openKeyModal(); return; }
    if (typeof openModal === 'function') openModal('acharyaModal');
    const loading = document.getElementById('acharyaLoading');
    const result = document.getElementById('acharyaResult');
    if (loading) loading.style.display = 'none';
    if (result) result.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>Please configure at least one AI key via the Key Manager (🔑) in the top toolbar.`;
    dgeShowFollowUpBox(false);
    return;
  }

  const text = payload ? payload.selectedText : (window.lastSelectedText || window.getSelection().toString().trim());
  if(!text && type !== 'commentary') return;
  window.getSelection().removeAllRanges();

  if (typeof openModal === 'function') openModal('acharyaModal');
  const resultEl = document.getElementById('acharyaResult');
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

  // Fresh top-level question — start a new conversation thread.
  window.acharyaHistory = [];
  window.acharyaSystemPrompt = "You are Acharya, embedded in a Vedic text reading app. If the user asks a follow-up question, continue this conversation naturally and stay consistent with your earlier answers, in the philosophical tradition of Sri Madhvacharya (Dvaita Vedanta) unless asked otherwise.";

  await dgeRunAcharyaQuery(promptText);
};

window.sendAcharyaFollowUp = async function() {
  const input = document.getElementById('acharyaFollowUpInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  await dgeRunAcharyaQuery(q);
};

// Follow-up mic input (independent tiny SpeechRecognition instance so it
// doesn't collide with the search box's listener in voice.js).
let dgeFollowUpRecognition = null;
window.startFollowUpVoiceInput = function() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const input = document.getElementById('acharyaFollowUpInput');
  if (!Ctor || !input) return;

  dgeFollowUpRecognition = new Ctor();
  dgeFollowUpRecognition.lang = document.documentElement.lang || 'en-IN';
  dgeFollowUpRecognition.interimResults = true;
  dgeFollowUpRecognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    input.value = transcript;
  };
  dgeFollowUpRecognition.onerror = () => {};
  try { dgeFollowUpRecognition.start(); } catch (e) { /* ignore */ }
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
  dgeShowFollowUpBox(false);
  window.acharyaHistory = [];
};

// 6. Render the (globally configurable) Ask Acharya query-type buttons
function renderAcharyaQueryButtons() {
  const row = document.getElementById('acharyaQueryButtonsRow');
  const fullContainer = document.getElementById('acharyaFullWidthButtons');
  if (!row || !fullContainer || !window.ACHARYA_QUERY_TYPES) return;

  row.innerHTML = '';
  fullContainer.innerHTML = '';

  const enabled = window.ACHARYA_QUERY_TYPES.filter(q => q.enabled);
  enabled.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'tooltip-btn';
    btn.innerText = `${q.icon} ${q.label}`;
    if (q.style === 'full') {
      btn.style.cssText = 'width:100%; text-align:center; background: rgba(226, 102, 74, 0.2);';
    }
    btn.addEventListener('pointerdown', (e) => {
      if (q.action === 'bhashya') window.openBhashyaPicker(e);
      else window.askAcharya(e, q.id);
    });
    (q.style === 'full' ? fullContainer : row).appendChild(btn);
  });

  if (fullContainer.children.length > 0) {
    fullContainer.insertAdjacentHTML('afterbegin', '<div style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>');
  }
}
document.addEventListener('DOMContentLoaded', renderAcharyaQueryButtons);
