// DGE Module: ai.js
// Maps to F-014: AI Assistance
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['ai.js'] = 'v3.11 (merge of two v3.10 lines: shabda modal returns the prakriya -- the matched declension cell renders its sutra-by-sutra subanta derivation automatically via js/subanta-steps.js, every cell tappable, plus a "where else in the library" corpus-search link; AND the Dhatu word-tool instant in-page modal with the root\'s step-by-step derivation, plus Sandhi/Samasa word-tool buttons running a focused Ask Acharya (AI) query with an on-screen AI-only note)';

// Appends a language directive read from onboarding.js's saved preference
// (dge_lang_pref: en/kn/sa), so every dgeCallProvider() call answers in the
// language the visitor picked, without the visitor having to ask for it
// every time. Empty string (no line added) when unset or English, since
// English is the model's natural default anyway.
function dgeLangInstruction() {
  var lang;
  try { lang = localStorage.getItem('dge_lang_pref'); } catch (e) { lang = null; }
  var line = { kn: 'Answer in Kannada (ಕನ್ನಡ) unless the user writes in a different language.',
               sa: 'Answer in simple Sanskrit (संस्कृतम्) unless the user writes in a different language.' }[lang];
  return line ? (' ' + line) : '';
}

// 1. Text Selection & Tooltip Event Listener
//
// No longer gated on is-authorized (admin AI-key unlock): the Shabda/Dhātu/
// Where-else word tools (#wordToolsRow) need no AI at all and are this
// app's own structured-data lookups, and askAcharya() already handles the
// no-key-configured case on its own (a friendly "configure a key" message,
// not a crash) -- so there was never a reason a plain reader couldn't even
// SEE this tooltip. Previously this returned before the tooltip could ever
// show for anyone without acharyaAuthorized set, which silently hid the
// word tools from every ordinary visitor, not just Ask Acharya.
document.addEventListener('selectionchange', () => {
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
        modalAppendBtn.style.display = 'flex';
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
// Line-based rather than the old chained-regex version, which only handled
// ##/### headers and single-* bullets, left numbered lists as plain text,
// and joined every line with <br> instead of real paragraph spacing — a
// Gemini reply with a numbered list or a top-level # heading rendered as a
// wall of text with literal "1." and "#" characters in it. Shared by every
// AI surface that renders a model reply (Ask Acharya here, and the Kosha
// quick actions in kosha.js), so the fix applies everywhere at once.
function parseMarkdown(md) {
  if (!md) return '';
  function inline(s) {
    return s
      .replace(/\*\*(.*?)\*\*/g, '<strong class="md-strong">$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  }
  var lines = String(md).replace(/\r\n/g, '\n').split('\n');
  var html = '', listTag = null;
  function closeList() { if (listTag) { html += '</' + listTag + '>'; listTag = null; } }
  lines.forEach(function (line) {
    var h = line.match(/^(#{1,3})\s+(.*)$/);
    var ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    var ul = line.match(/^\s*[*\-]\s+(.*)$/);
    if (h) {
      closeList();
      var cls = h[1].length === 1 ? 'md-h1' : h[1].length === 2 ? 'md-h2' : 'md-h3';
      html += '<div class="' + cls + '">' + inline(h[2]) + '</div>';
    } else if (ol) {
      if (listTag !== 'ol') { closeList(); html += '<ol class="md-list">'; listTag = 'ol'; }
      html += '<li>' + inline(ol[1]) + '</li>';
    } else if (ul) {
      if (listTag !== 'ul') { closeList(); html += '<ul class="md-list">'; listTag = 'ul'; }
      html += '<li>' + inline(ul[1]) + '</li>';
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList();
      html += '<p class="md-p">' + inline(line) + '</p>';
    }
  });
  closeList();
  return html;
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

  const audioBaseUrlInput = document.getElementById('userAudioBaseUrlInput');
  if (audioBaseUrlInput) audioBaseUrlInput.value = localStorage.getItem('audio_base_url_override') || '';
  const audioBaseUrlDefaultHint = document.getElementById('audioBaseUrlDefaultHint');
  if (audioBaseUrlDefaultHint) audioBaseUrlDefaultHint.textContent = (window.appConfig && window.appConfig.audioBaseUrl) || 'https://archive.org/download/';

  dgeRenderAcharyaSettingsUI();
  dgeLoadFeatureFlagsIntoUI();
  dgeLoadShlokaFieldsIntoUI();
  dgeLoadShareTemplateIntoUI();
  dgeRestoreSettingsSectionPins();
  if (typeof openModal === 'function') openModal('keyModal');
};

// Every settings section is collapsed by default. Pinning a section (📌
// in its header) keeps it expanded across future openings; anything
// left unpinned auto-collapses again as soon as Settings is closed, so
// it never silently accumulates as "always open" clutter.
function dgeGetPinnedSettingsSections() {
  try {
    return JSON.parse(localStorage.getItem('pinned_settings_sections') || '[]');
  } catch (e) {
    return [];
  }
}

function dgeRestoreSettingsSectionPins() {
  const pinned = new Set(dgeGetPinnedSettingsSections());
  document.querySelectorAll('#keyModal details[data-section-id]').forEach(details => {
    const id = details.dataset.sectionId;
    const pinBtn = details.querySelector('.settings-pin-btn');
    const isPinned = pinned.has(id);
    if (pinBtn) pinBtn.classList.toggle('pinned', isPinned);
    details.open = isPinned;
  });
}

window.dgeToggleSectionPin = function(btn) {
  const details = btn.closest('details');
  if (!details) return;
  const id = details.dataset.sectionId;
  if (!id) return;
  const pinned = new Set(dgeGetPinnedSettingsSections());
  if (pinned.has(id)) pinned.delete(id); else pinned.add(id);
  localStorage.setItem('pinned_settings_sections', JSON.stringify([...pinned]));
  btn.classList.toggle('pinned');
};

window.closeKeyModal = function() { 
  const pinned = new Set(dgeGetPinnedSettingsSections());
  document.querySelectorAll('#keyModal details[data-section-id]').forEach(details => {
    if (!pinned.has(details.dataset.sectionId)) details.open = false;
  });
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

  const audioBaseUrlInput = document.getElementById('userAudioBaseUrlInput');
  if (audioBaseUrlInput) {
    let url = audioBaseUrlInput.value.trim();
    if (url && !url.endsWith('/')) url += '/'; // must end with / — concatenated directly with each grantha's identifier folder
    if (url) { localStorage.setItem('audio_base_url_override', url); audioBaseUrlInput.value = url; }
    else localStorage.removeItem('audio_base_url_override');
  }

  dgeSaveAcharyaSettingsFromUI();
  dgeSaveFeatureFlagsFromUI();
  dgeSaveShlokaFieldsFromUI();
  dgeSaveShareTemplateFromUI();

  window.closeKeyModal();
  if (typeof showToast === 'function') showToast('Settings saved.');
};

// --- Feature Visibility (🎛️) ---------------------------------------

const FEATURE_FLAG_CHECKBOX_IDS = {
  showFavorite: 'flagShowFavorite',
  showStatus: 'flagShowStatus',
  showDoubt: 'flagShowDoubt',
  showNotes: 'flagShowNotes',
  showSnippetTools: 'flagShowSnippetTools',
  showThemePicker: 'flagShowThemePicker',
  showScriptPicker: 'flagShowScriptPicker',
  showPreloadButton: 'flagShowPreloadButton',
  showSpeedControl: 'flagShowSpeedControl'
};

const SCRIPT_OPTION_CHECKBOX_IDS = {
  devanagari: 'scriptOptDevanagari',
  iast: 'scriptOptIast',
  kannada: 'scriptOptKannada',
  telugu: 'scriptOptTelugu',
  tamil: 'scriptOptTamil',
  malayalam: 'scriptOptMalayalam'
};

function dgeLoadFeatureFlagsIntoUI() {
  const flags = (typeof dgeGetEffectiveFeatureFlags === 'function') ? dgeGetEffectiveFeatureFlags() : (window.FEATURE_FLAGS || {});
  Object.entries(FEATURE_FLAG_CHECKBOX_IDS).forEach(([flagKey, elId]) => {
    const el = document.getElementById(elId);
    if (el) el.checked = flags[flagKey] !== false;
  });

  const masterEl = document.getElementById('flagShowAllMarkers');
  if (masterEl) {
    const markerFlags = ['showFavorite', 'showStatus', 'showDoubt', 'showNotes', 'showSnippetTools'];
    masterEl.checked = markerFlags.every(f => flags[f] !== false);
  }

  const scriptOptions = (typeof dgeGetEffectiveScriptOptions === 'function') ? dgeGetEffectiveScriptOptions() : (window.SCRIPT_OPTIONS || []);
  scriptOptions.forEach(opt => {
    const elId = SCRIPT_OPTION_CHECKBOX_IDS[opt.id];
    const el = elId ? document.getElementById(elId) : null;
    if (el) el.checked = opt.enabled !== false;
  });
}

window.dgeToggleAllMarkers = function(checked) {
  ['flagShowFavorite', 'flagShowStatus', 'flagShowDoubt', 'flagShowNotes', 'flagShowSnippetTools'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
};

function dgeSaveFeatureFlagsFromUI() {
  const override = {};
  let any = false;
  Object.entries(FEATURE_FLAG_CHECKBOX_IDS).forEach(([flagKey, elId]) => {
    const el = document.getElementById(elId);
    if (el) { override[flagKey] = el.checked; any = true; }
  });
  if (any) localStorage.setItem('feature_flags_override', JSON.stringify(override));

  const scriptOverride = {};
  let anyScript = false;
  Object.entries(SCRIPT_OPTION_CHECKBOX_IDS).forEach(([scriptId, elId]) => {
    const el = document.getElementById(elId);
    if (el) { scriptOverride[scriptId] = el.checked; anyScript = true; }
  });
  if (anyScript) localStorage.setItem('script_options_override', JSON.stringify(scriptOverride));

  if (typeof applyFeatureFlags === 'function') applyFeatureFlags();
}

window.resetAudioBaseUrlToDefault = function() {
  localStorage.removeItem('audio_base_url_override');
  const input = document.getElementById('userAudioBaseUrlInput');
  if (input) input.value = '';
  if (typeof showToast === 'function') showToast('Audio source reset to the project default.');
};

window.resetFeatureFlagsToDefault = function() {
  localStorage.removeItem('feature_flags_override');
  localStorage.removeItem('script_options_override');
  dgeLoadFeatureFlagsIntoUI();
  if (typeof applyFeatureFlags === 'function') applyFeatureFlags();
  if (typeof showToast === 'function') showToast('Feature visibility reset to defaults.');
};

// --- Shloka Fields (🧩) — Padaccheda, Anvaya, Vrutta, etc. -------------

const SHLOKA_FIELD_CHECKBOX_IDS = {
  padaccheda: 'fieldPadaccheda',
  anvaya: 'fieldAnvaya',
  pratipadartha: 'fieldPratipadartha',
  tatparya: 'fieldTatparya',
  vyakarana: 'fieldVyakarana',
  vrutta: 'fieldVrutta',
  alankara: 'fieldAlankara',
  crossReferences: 'fieldCrossReferences'
};

function dgeLoadShlokaFieldsIntoUI() {
  const fields = (typeof dgeGetEffectiveShlokaFields === 'function') ? dgeGetEffectiveShlokaFields() : (window.SHLOKA_EXTRA_FIELDS || []);
  fields.forEach(f => {
    const elId = SHLOKA_FIELD_CHECKBOX_IDS[f.id];
    const el = elId ? document.getElementById(elId) : null;
    if (el) el.checked = f.enabled !== false;
  });
}

function dgeSaveShlokaFieldsFromUI() {
  const override = {};
  let any = false;
  Object.entries(SHLOKA_FIELD_CHECKBOX_IDS).forEach(([fieldId, elId]) => {
    const el = document.getElementById(elId);
    if (el) { override[fieldId] = el.checked; any = true; }
  });
  if (any) localStorage.setItem('shloka_extra_fields_override', JSON.stringify(override));
  if (typeof renderList === 'function') renderList();
}

window.resetShlokaFieldsToDefault = function() {
  localStorage.removeItem('shloka_extra_fields_override');
  dgeLoadShlokaFieldsIntoUI();
  if (typeof renderList === 'function') renderList();
  if (typeof showToast === 'function') showToast('Shloka field visibility reset to defaults.');
};

// --- Share Image Template (🖼️) ------------------------------------

window.selectShareTemplate = function(id) {
  localStorage.setItem('default_share_template', id);
  document.querySelectorAll('#defaultShareTemplateGrid .share-tpl-thumb').forEach(el => {
    el.classList.toggle('selected', el.dataset.tplId === id);
  });
};

async function dgeLoadShareTemplateIntoUI() {
  const grid = document.getElementById('defaultShareTemplateGrid');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column: 1 / -1; font-size:11px; color:var(--muted-text); padding:8px 0;">Loading templates…</div>`;

  const templates = (typeof dgeDiscoverShareTemplates === 'function') ? await dgeDiscoverShareTemplates() : [];
  const current = localStorage.getItem('default_share_template') || 'plain';

  grid.innerHTML = templates.map(t => {
    const thumb = t.filename
      ? `<img src="images/${t.filename}" alt="" style="width:100%; height:100%; object-fit:cover;">`
      : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--card-bg); color:var(--muted-text); font-size:10px;">Plain</div>`;
    return `
      <button type="button" class="share-tpl-thumb${t.id === current ? ' selected' : ''}" data-tpl-id="${t.id}" onclick="window.selectShareTemplate('${t.id}')">
        <div class="share-tpl-thumb-img">${thumb}</div>
        <div class="share-tpl-thumb-label">${t.label}</div>
      </button>`;
  }).join('') + `<button type="button" class="btn-sm" style="grid-column: 1 / -1;" onclick="window.refreshShareTemplates()">↻ Refresh (check for new uploads)</button>`;
}

window.refreshShareTemplates = async function() {
  if (typeof dgeDiscoverShareTemplates === 'function') await dgeDiscoverShareTemplates(true);
  dgeLoadShareTemplateIntoUI();
  if (typeof showToast === 'function') showToast('Template list refreshed.');
};

function dgeSaveShareTemplateFromUI() {
  // selection is already saved live by selectShareTemplate() on tap —
  // nothing further needed here, kept only so the shared Save flow can
  // still call it without checking whether it exists.
}

// Resolves the ACHARYA_QUERY_TYPES list with any per-device overrides (from
// the ⚙️ Ask Acharya Settings section below) layered on top of the shipped
// defaults in config.js.
function dgeGetEffectiveQueryTypes() {
  const defaults = window.ACHARYA_QUERY_TYPES || [];
  let override = null;
  try { override = JSON.parse(localStorage.getItem('acharya_query_config') || 'null'); } catch (e) { /* ignore */ }

  return defaults.map(def => {
    const o = (override && Array.isArray(override)) ? override.find(x => x.id === def.id) : null;
    const presetOverrides = (o && o.presetOverrides) || {};
    const presets = (def.presets || []).map(p => ({
      ...p,
      enabled: presetOverrides[p.id] !== undefined ? presetOverrides[p.id] : p.default
    }));
    return {
      ...def,
      presets,
      customNotes: (o && o.customNotes !== undefined) ? o.customNotes : def.customNotes,
      depth: (o && o.depth) || def.depth
    };
  });
}
window.dgeGetEffectiveQueryTypes = dgeGetEffectiveQueryTypes;

// Builds the actual numbered "provide:" list sent to Acharya for a given
// (effective, override-aware) type config — enabled presets first (fixed
// wording, can't be typo'd), then the free-text custom notes appended
// last if present.
function dgeBuildFieldsForType(typeConfig) {
  const out = (typeConfig.presets || []).filter(p => p.enabled !== false).map(p => p.label);
  if (typeConfig.customNotes && typeConfig.customNotes.trim()) {
    out.push(typeConfig.customNotes.trim());
  }
  return out;
}
window.dgeBuildFieldsForType = dgeBuildFieldsForType;

// Renders the entire "⚙️ Ask Acharya Settings" body from config — a
// checkbox per preset (fixed label, can't be mistyped) plus one free-text
// "additional instructions" box per type. Bhashya also gets its depth
// selector above its checkboxes.
function dgeRenderAcharyaSettingsUI() {
  const container = document.getElementById('acharyaSettingsContainer');
  if (!container) return;
  const types = dgeGetEffectiveQueryTypes();

  let html = '';
  types.forEach(t => {
    html += `<div class="provider-key-row">`;
    html += `<label>${t.icon} ${t.label} — fields to include</label>`;

    if (t.id === 'bhashya') {
      html += `<div style="margin:8px 0;">`;
      html += `<div style="font-size:11px; font-weight:700; color:var(--muted-text); margin-bottom:4px;">Analysis depth</div>`;
      html += `<select class="modal-input" data-acharya-depth="${t.id}" style="margin:0;">`;
      ['summary', 'sentence', 'word'].forEach(d => {
        const dLabel = d === 'summary' ? 'Summary' : d === 'sentence' ? 'Sentence-by-sentence' : 'Word-by-word';
        html += `<option value="${d}" ${t.depth === d ? 'selected' : ''}>${dLabel}</option>`;
      });
      html += `</select></div>`;
    }

    (t.presets || []).forEach(p => {
      html += `<label class="flex-row" style="gap:8px; cursor:pointer; font-size:12px; font-weight:500; margin:6px 0; align-items:flex-start;">
        <input type="checkbox" data-acharya-preset="${t.id}::${p.id}" ${p.enabled !== false ? 'checked' : ''} style="margin:2px 0 0 0; width:14px; height:14px; flex-shrink:0;">
        <span>${p.label}</span>
      </label>`;
    });

    html += `<div style="font-size:11px; font-weight:700; color:var(--muted-text); margin-top:8px;">Additional instructions${t.id === 'translate' ? ' (this IS the whole instruction for Custom)' : ' (optional, free text)'}</div>`;
    html += `<textarea class="modal-input" data-acharya-notes="${t.id}" style="height:70px; margin-top:4px; font-size:12px;">${(t.customNotes || '').replace(/</g, '&lt;')}</textarea>`;
    html += `</div>`;
  });

  container.innerHTML = html;
}

window.resetAcharyaFieldsToDefault = function() {
  localStorage.removeItem('acharya_query_config');
  dgeRenderAcharyaSettingsUI();
  if (typeof showToast === 'function') showToast('Ask Acharya settings reset to defaults.');
};

function dgeSaveAcharyaSettingsFromUI() {
  const container = document.getElementById('acharyaSettingsContainer');
  if (!container) return;

  const types = window.ACHARYA_QUERY_TYPES || [];
  const override = types.map(t => {
    const presetOverrides = {};
    container.querySelectorAll(`input[data-acharya-preset^="${t.id}::"]`).forEach(cb => {
      const presetId = cb.dataset.acharyaPreset.split('::')[1];
      presetOverrides[presetId] = cb.checked;
    });
    const notesEl = container.querySelector(`textarea[data-acharya-notes="${t.id}"]`);
    const depthEl = container.querySelector(`select[data-acharya-depth="${t.id}"]`);
    return {
      id: t.id,
      presetOverrides,
      customNotes: notesEl ? notesEl.value : undefined,
      depth: depthEl ? depthEl.value : undefined
    };
  });

  localStorage.setItem('acharya_query_config', JSON.stringify(override));
  renderAcharyaQueryButtons();
}

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

// Delegates network + error classification to the shared window.DGEGemini
// client (js/gemini.js) so a quota/permission/network failure reads as
// plain English with an actual next step instead of a raw API message, and
// gets one automatic retry on a lighter model first. The function's own
// contract (resolve to the answer text, throw Error on failure) is kept
// unchanged so dgeCallProvider()'s uniform dispatch across Gemini/OpenAI/
// Claude -- and the Promise.allSettled multi-provider flow above it --
// don't need to change.
async function dgeCallGemini(apiKey, model, systemPrompt, history) {
  const modelName = model || (typeof appConfig !== 'undefined' && appConfig.geminiModel) || 'gemini-3.6-flash';
  const contents = history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await window.DGEGemini.generate({ contents, system: systemPrompt, apiKey, model: modelName });
  if (!r.ok) throw new Error(r.error.title + ' — ' + r.error.message + ' ' + r.error.action);
  return r.fellBack ? `[${r.notice}]\n\n${r.text}` : r.text;
}

async function dgeCallOpenAI(apiKey, model, systemPrompt, history) {
  if (!model) throw new Error('No OpenAI model set — add one in ⚙️ Settings (e.g. a current GPT model name from your OpenAI account).');
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
  if (!model) throw new Error('No Claude model set — add one in ⚙️ Settings (e.g. a current Claude model name from your Anthropic console).');
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
       <span>📖 Commentary-Style Analysis (No specific source)</span>
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
    if (resultEl) resultEl.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>Please add at least one AI key via the Settings (⚙️) in the top toolbar.`;
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
        ? `<span style="color:var(--accent-red); font-weight:bold;">All configured providers failed.</span> Check the API key(s) and model name(s) in ⚙️ Settings, and the browser console for details.`
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

// Per-card entry point — lets Ask Acharya be triggered directly from a
// shloka's card/actions-sheet without first selecting any text. "Shloka"
// and "Native Meaning" fall back to the full verse text automatically
// (see askAcharya above); "Word" isn't offered here since it needs an
// actual word selection to mean anything.
window.askAcharyaForShloka = function(id, type) {
  window.contextShlokaId = id;
  window.lastSelectedText = '';
  window.askAcharya(null, type);
};

window.openBhashyaPickerForShloka = function(id) {
  window.contextShlokaId = id;
  window.openBhashyaPicker(null);
};

window.askAcharya = async function(e, type, payload) {
  if (e) e.preventDefault();
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';

  window.currentAcharyaShlokaId = window.contextShlokaId || window.activeId;

  // Sandhi/Samasa have no Vidyut-precomputed data behind them (unlike
  // Shabda/Dhātu) -- this is a plain LLM call, so say so up front rather
  // than let it look like the same kind of structured lookup. Set before
  // the no-providers check below so it still shows on the "configure a
  // key" message, which is exactly where a Sandhi/Samasa visitor most
  // needs the explanation of why a key is required at all.
  const aiOnlyNote = document.getElementById('acharyaAiOnlyNote');
  if (aiOnlyNote) aiOnlyNote.style.display = (type === 'sandhi' || type === 'samasa') ? 'block' : 'none';

  const providers = dgeGetConfiguredProviders();
  if (providers.length === 0) {
    if (document.body.classList.contains('is-authorized')) { window.openKeyModal(); return; }
    if (typeof openModal === 'function') openModal('acharyaModal');
    const loading = document.getElementById('acharyaLoading');
    const result = document.getElementById('acharyaResult');
    if (loading) loading.style.display = 'none';
    if (result) result.innerHTML = `<span style="color:var(--accent-red); font-weight:bold;">आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).</span><br><br>Please configure at least one AI key via the Settings (⚙️) in the top toolbar.`;
    dgeShowFollowUpBox(false);
    return;
  }

  const text0 = payload ? payload.selectedText : (window.lastSelectedText || window.getSelection().toString().trim());
  let text = text0;

  // "Shloka" always means the WHOLE verse — a selection (or none at all)
  // only tells us WHICH shloka, not how much of it to analyze. Selecting
  // a single word and tapping Shloka still gets the full-verse analysis.
  if (type === 'shloka' && window.currentAcharyaShlokaId && typeof getText === 'function') {
    text = getText(window.currentAcharyaShlokaId).replace(/<[^>]*>/g, '');
  }

  // "Word", "Sandhi" and "Samasa" genuinely need a specific selection —
  // can't run without one.
  if ((type === 'grammar' || type === 'sandhi' || type === 'samasa') && !text) {
    if (typeof closeModal === 'function') closeModal('acharyaModal');
    if (typeof showToast === 'function') showToast('Select a specific word first to ask for word-level analysis.');
    return;
  }

  // "Native Meaning" works with or without a selection — falls back to
  // the whole shloka if nothing specific was highlighted.
  if (type === 'translate' && !text && window.currentAcharyaShlokaId && typeof getText === 'function') {
    text = getText(window.currentAcharyaShlokaId).replace(/<[^>]*>/g, '');
  }

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

  const effectiveTypes = dgeGetEffectiveQueryTypes();
  const typeConfig = effectiveTypes.find(q => q.id === type);

  const externalLinksNote = window.AI_ALLOW_EXTERNAL_LINKS
    ? ' If you are confident a specific external resource exists for this (e.g. a well-known Sanskrit text repository), you may include one plain hyperlink.'
    : ' Do not include any hyperlinks or URLs.';

  let promptText = "";
  if (type === 'shloka' || type === 'grammar') {
      const fieldsList = dgeBuildFieldsForType(typeConfig || {});
      const persona = type === 'shloka'
        ? "You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta)."
        : "You are a traditional Vyakarana Acharya.";
      const fieldsPrompt = (fieldsList.length ? fieldsList : ['Word Meaning']).map((f, i) => `${i + 1}. ${f}`).join('\n');
      promptText = `${persona} For the text: "${text}", provide:\n${fieldsPrompt}\nFormat using clean markdown headings.${externalLinksNote}`;
  } else if (type === 'commentary') {
      const depth = (typeConfig && typeConfig.depth) || 'summary';
      const depthInstruction = {
        summary: 'Provide a concise overall summary of the philosophical Siddhanta.',
        sentence: 'Provide a sentence-by-sentence breakdown and explanation.',
        word: 'Provide a detailed word-by-word meaning and analysis.'
      }[depth] || 'Provide a concise overall summary of the philosophical Siddhanta.';

      const extraFields = dgeBuildFieldsForType(typeConfig || {});
      const extraFieldsPrompt = extraFields.length ? extraFields.map((f, i) => `${i + 4}. ${f}`).join('\n') + '\n' : '';

      if (payload && payload.commentaryText) {
          promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). Analyze ONLY the supplied commentary text provided below. Do NOT hallucinate external commentaries.

Mula Shloka: "${payload.shlokaText}"
Commentary Name: "${payload.commentaryTitle}"
Commentary Text: "${payload.commentaryText}"
Highlighted Fragment: "${payload.selectedText}"

Provide a detailed scholarly breakdown in clean markdown:
1. ${depthInstruction}
2. Pramana & Citation Expansion: Identify every scriptural quote (Shruti, Smriti, Gita, Amarakosha, etc.) cited in this text. Provide the FULL Sanskrit quote, source attribution, and precise meaning.
3. Philosophical Siddhanta strictly according to Sri Madhvacharya's Dvaita philosophy derived from this commentary.
${extraFieldsPrompt}${externalLinksNote}`;
      } else {
          promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). Analyze this commentary excerpt: "${text}". ${depthInstruction} Also provide Purvapaksha & Siddhanta (strictly according to Sri Madhvacharya), and Pramana/Citations expanded with full quotes.
${extraFieldsPrompt}Format using clean markdown.${externalLinksNote}`;
      }
  } else if (type === 'translate') {
      const fieldsList = dgeBuildFieldsForType(typeConfig || {});
      const fieldsPrompt = (fieldsList.length ? fieldsList : ['A natural translation']).map((f, i) => `${i + 1}. ${f}`).join('\n');
      promptText = `For this Sanskrit text: "${text}" (target language: ${targetLang} where relevant), provide:\n${fieldsPrompt}\nFormat cleanly using markdown.${externalLinksNote}`;
  } else if (type === 'sandhi' || type === 'samasa') {
      // Dedicated word-tool buttons (wordToolsRow), not one of the
      // configurable Ask Acharya categories -- fixed instruction, no
      // preset/customNotes layering. Vidyut has no precomputed sandhi or
      // samasa data (see intellisense.js's own note that it "resolves
      // inflected forms, not sandhi-joined ones"), so this is the LLM's
      // own analysis; askAcharya() above shows acharyaAiOnlyNote to say so.
      const instruction = type === 'sandhi'
        ? 'Provide its Sandhi-vichcheda (sandhi split) into the original constituent words, naming the sandhi rule(s) involved and citing the Ashtadhyayi sutra number if you can identify one confidently. If no sandhi applies here, say so plainly.'
        : 'Determine whether this is a Samasa (compound). If so, provide the Samasa-Vigraha: the Vigrahavakya (expanded phrase), the Samasta-pada, and the type of samasa (Tatpurusha, Dvandva, Bahuvrihi, Karmadharaya, Avyayibhava, Dvigu, etc). If it is not a compound, say so plainly.';
      promptText = `You are a traditional Vyakarana Acharya. For this Sanskrit word: "${text}", ${instruction} Format using clean markdown.${externalLinksNote}`;
  }

  // Fresh top-level question — start a new conversation thread. Also
  // clear any leftover follow-up text from a PREVIOUS analysis, which was
  // otherwise staying populated when switching to a different button.
  window.acharyaHistory = [];
  const staleFollowUpInput = document.getElementById('acharyaFollowUpInput');
  if (staleFollowUpInput) staleFollowUpInput.value = '';
  window.acharyaSystemPrompt = "You are Acharya, embedded in a Vedic text reading app. If the user asks a follow-up question, continue this conversation naturally and stay consistent with your earlier answers, in the philosophical tradition of Sri Madhvacharya (Dvaita Vedanta) unless asked otherwise. IMPORTANT FORMATTING RULE: never use LaTeX or math notation of any kind (no $...$, \\sqrt{}, \\text{}, \\rightarrow, or similar). This app only renders plain text and basic markdown (headings, bold, italic, lists) — LaTeX shows up as broken literal text. Write all derivations in plain prose instead: e.g. write 'root labh (bhvādi-gaṇa, 1st class)' instead of '$\\sqrt{\\text{labh}}$', and 'X + Y becomes Z' instead of an arrow/equation." + dgeLangInstruction();

  await dgeRunAcharyaQuery(promptText);
};

// Nested Ask Acharya: selecting text INSIDE Acharya's own analysis offers
// this alongside "Add to Notes". Rather than reusing the Shloka/Word/
// Bhashya buttons (which are built around the ORIGINAL verse, not
// Acharya's own explanatory prose), this pre-fills the existing follow-up
// box with the selection — the follow-up mechanism already carries the
// full conversation history, so the AI has real context for what's being
// asked about. Pre-filling (not auto-sending) lets the user edit the
// question before it goes out.
window.askFurtherAboutSelection = function(e) {
  if (e) e.preventDefault();
  const modalBtn = document.getElementById('modalAppendBtn');
  if (modalBtn) modalBtn.style.display = 'none';
  if (window.getSelection) window.getSelection().removeAllRanges();

  const selectedText = window.modalSelectedText;
  if (!selectedText) return;

  const input = document.getElementById('acharyaFollowUpInput');
  if (input) {
    input.value = `Please go deeper on this part: "${selectedText}"`;
    input.focus();
  }
  if (typeof showToast === 'function') showToast('Edit the question if needed, then tap Ask.');
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
  // Always English — see the identical fix and its reasoning in voice.js's
  // startSearchVoiceInput.
  dgeFollowUpRecognition.lang = 'en-IN';
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
  const followUpInput = document.getElementById('acharyaFollowUpInput');
  if (followUpInput) followUpInput.value = '';
};

// 6. Render the (globally configurable) Ask Acharya query-type buttons
function renderAcharyaQueryButtons() {
  const row = document.getElementById('acharyaQueryButtonsRow');
  const fullContainer = document.getElementById('acharyaFullWidthButtons');
  const types = dgeGetEffectiveQueryTypes();
  if (!row || !fullContainer || !types) return;

  row.innerHTML = '';
  fullContainer.innerHTML = '';

  const enabled = types.filter(q => q.enabled);
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

// Word-level tools on the selection tooltip: unlike the AI "Word" button
// above (which asks an LLM), these navigate to this app's own real,
// structured data for the selected word rather than generating an answer.
function dgeSelectedWordText() {
  try { return (window.getSelection().toString() || '').trim(); }
  catch (e) { return ''; }
}
function dgeHideActionTooltip() {
  const tooltip = document.getElementById('actionTooltip');
  if (tooltip) tooltip.style.display = 'none';
}

// Instant Śabda lookup modal: this used to open shabda.html in a new tab --
// a full page navigation (blank paint, the whole declension-browser UI,
// then a scroll-into-view) just to answer "what does this inflected form
// decline from?". The reader never needed the browser UI for that, only
// the one answer, so this fetches the same data directly and renders it
// in a modal without leaving the page. A kṛdanta (verb-derived) match now
// renders its real step-by-step derivation inline too, not just a link to
// go read it elsewhere -- see dgeRenderShabdaKrt below.
const DGE_SHABDA_MODAL_ID = 'dgeShabdaModal';
let DGE_SHABDA_CACHE = null; // the parsed shabdapatha item list, fetched once per page load
const DGE_KRT_NAME = { kta:'क्त', ktavatu:'क्तवतु', ktvA:'क्त्वा', tumun:'तुमुन्', Satf:'शतृ', SAnac:'शानच्', tavya:'तव्य', anIyar:'अनीयर्', yat:'यत्', Rvul:'ण्वुल्', tfc:'तृच्', lyuw:'ल्युट्' };
const DGE_KRT_NAME_EN = { kta:'past passive participle', ktavatu:'past active participle', ktvA:'absolutive', tumun:'infinitive', Satf:'present participle, parasmaipada', SAnac:'present participle, ātmanepada', tavya:'gerundive', anIyar:'gerundive', yat:'gerundive', Rvul:'agent noun', tfc:'agent noun', lyuw:'action noun' };
const DGE_VIBHAKTI = ["प्रथमा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","सम्बोधनम्"];

function dgeShabdaEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

// Shared by every "instant word-tool" modal (Śabda, Dhātu, and any future
// one) -- a single class-scoped stylesheet rather than one copy per modal
// ID, so a second modal (dgeDhatuModal) built the same way gets the same
// look for free instead of duplicating this block.
function dgeEnsureWordModalStyle() {
  if (document.getElementById('dgeWordModalStyle')) return;
  const style = document.createElement('style');
  style.id = 'dgeWordModalStyle';
  style.textContent = [
    '.dge-word-modal .dsm-word{font-size:22px;font-weight:700;color:var(--accent-red);margin:0 0 2px;}',
    '.dge-word-modal .dsm-sub{font-size:12px;color:var(--muted-text);margin-bottom:14px;}',
    '.dge-word-modal .dsm-kv{display:flex;gap:8px;padding:4px 0;font-size:13px;border-bottom:1px dashed var(--card-border);}',
    '.dge-word-modal .dsm-kk{flex:0 0 100px;color:var(--muted-text);font-size:11px;text-transform:uppercase;letter-spacing:.4px;padding-top:2px;}',
    '.dge-word-modal .dsm-kvv{flex:1;}',
    '.dge-word-modal table.dsm-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;}',
    '.dge-word-modal table.dsm-table th,.dge-word-modal table.dsm-table td{padding:6px 8px;text-align:center;border-bottom:1px dashed var(--card-border);}',
    '.dge-word-modal table.dsm-table th{color:var(--muted-text);font-size:10.5px;font-weight:700;}',
    '.dge-word-modal table.dsm-table td:first-child,.dge-word-modal table.dsm-table th:first-child{text-align:left;color:var(--muted-text);}',
    '.dge-word-modal table.dsm-table td.dsm-hl{background:rgba(226,102,74,.28);font-weight:700;border-radius:6px;}',
    '.dge-word-modal .dsm-steps{list-style:none;margin:8px 0 0;padding:0;}',
    '.dge-word-modal .dsm-steps li{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px dashed var(--card-border);font-size:13px;}',
    '.dge-word-modal .dsm-code{flex:0 0 62px;font-family:monospace;color:var(--muted-text);font-size:11px;}',
    '.dge-word-modal .dsm-result{flex:1;font-size:15px;}',
    '.dge-word-modal .dsm-loading{padding:24px 0;text-align:center;color:var(--muted-text);}',
    '.dge-word-modal .dsm-empty{padding:12px 0;color:var(--muted-text);font-size:13px;line-height:1.6;}',
    '.dge-word-modal .dsm-empty a{color:var(--accent-red);}',
    '.dge-word-modal .dsm-full-link{display:block;text-align:center;margin-top:14px;font-size:12px;color:var(--muted-text);}'
  ].join('\n');
  document.head.appendChild(style);
}

// Builds (once) a modal-overlay/modal-content/modal-body shell in the
// shared word-modal shape, and returns its body element for the caller to
// fill in. `id` is the overlay's element id, `bodyId` the id given to its
// body element, `headerHtml` the header <h3> content.
function dgeEnsureWordModalShell(id, bodyId, headerHtml) {
  if (document.getElementById(id)) return document.getElementById(bodyId);
  dgeEnsureWordModalStyle();
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" id="' + id + '">' +
      '<div class="modal-content dge-word-modal" style="max-width:420px;">' +
        '<div class="modal-header-sticky">' +
          '<h3 style="margin:0; color:var(--accent-red); font-size:16px;">' + headerHtml + '</h3>' +
          '<button class="btn-sm" onclick="window.closeModal(\'' + id + '\')" style="font-size:11px;">✖ Close</button>' +
        '</div>' +
        '<div class="modal-body" id="' + bodyId + '"></div>' +
      '</div>' +
    '</div>');
  return document.getElementById(bodyId);
}

function dgeEnsureShabdaModal() {
  dgeEnsureWordModalShell(DGE_SHABDA_MODAL_ID, 'dgeShabdaModalBody', '🔤 शब्दः · Śabda');
  return document.getElementById(DGE_SHABDA_MODAL_ID);
}

function dgeFetchShabdaData(word) {
  // Sharded by the word's first character (tools/build_shabda_shards.py):
  // declension is suffixal, so a form's first akshara is its stem's --
  // one ~100 KB shard answers instead of the whole 7.6 MB file. The full
  // file remains the fallback for a missing shard (and for callers that
  // pass no word).
  const ch = String(word || '').trim()[0];
  if (ch) {
    const name = 'u' + ch.codePointAt(0).toString(16).padStart(4, '0') + '.json';
    DGE_SHABDA_SHARDS = DGE_SHABDA_SHARDS || {};
    if (!DGE_SHABDA_SHARDS[name]) {
      DGE_SHABDA_SHARDS[name] =
        fetch('data/vedanga/vyakarana/shabdapatha/by_akshara/' + name)
          .then(r => r.ok ? r.json() : null)
          .then(d => d ? (d.items || []) : null)
          .catch(() => null);
    }
    return DGE_SHABDA_SHARDS[name].then(items =>
      items !== null ? items : dgeFetchShabdaData());
  }
  if (DGE_SHABDA_CACHE) return Promise.resolve(DGE_SHABDA_CACHE);
  return fetch('data/vedanga/vyakarana/shabdapatha/data.json')
    .then(r => r.ok ? r.json() : { items: [] })
    .then(d => { DGE_SHABDA_CACHE = d.items || []; return DGE_SHABDA_CACHE; })
    .catch(() => { DGE_SHABDA_CACHE = []; return DGE_SHABDA_CACHE; });
}
let DGE_SHABDA_SHARDS = null;

// Same exact-cell reverse lookup as shabda.js's findFormLocation, kept as
// its own small copy since shabda.js's version lives inside that page's
// own closure and this page (index.html) doesn't load shabda.js at all.
function dgeFindShabdaForm(items, surface) {
  const target = String(surface || '').trim();
  for (let i = 0; i < items.length; i++) {
    const cells = String(items[i].forms || '').split(';');
    for (let c = 0; c < cells.length && c < 24; c++) {
      const variants = (cells[c] || '').split('-');
      for (let v = 0; v < variants.length; v++) {
        if (variants[v].trim() === target) return { item: items[i], cellIndex: c };
      }
    }
  }
  return null;
}

function dgeShabdaDeclTable(forms, hlIdx) {
  const cells = String(forms || '').split(';');
  while (cells.length < 24) cells.push('');
  let h = '<table class="dsm-table"><thead><tr><th></th><th class="deva">एक.</th><th class="deva">द्वि.</th><th class="deva">बहु.</th></tr></thead><tbody>';
  for (let vb = 0; vb < 8; vb++) {
    h += '<tr><th class="deva">' + DGE_VIBHAKTI[vb] + '</th>';
    for (let n = 0; n < 3; n++) {
      const idx = vb * 3 + n;
      const hl = (hlIdx != null && idx === hlIdx);
      const has = !!(cells[idx] || '').trim();
      h += '<td class="deva' + (hl ? ' dsm-hl' : '') + (has ? ' sst-cell-hint' : '') + '"' +
        (has ? ' data-ci="' + idx + '" title="रूपसिद्धिः — tap for the derivation"' : '') + '>' +
        dgeShabdaEsc((cells[idx] || '').split('-').join(', ')) + '</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

function dgeShabdaStepsHtml(steps) {
  let last = '';
  return '<ol class="dsm-steps">' + steps.map(function (st) {
    const code = st[0];
    if (st.length > 1) last = st[1];
    return '<li><span class="dsm-code">' + dgeShabdaEsc(code) + '</span><span class="dsm-result deva">' + dgeShabdaEsc(last) + '</span></li>';
  }).join('') + '</ol>';
}

// "Where else does this word occur" (§5.2): closes the shabda modal and
// opens the global corpus search already searching for the surface form the
// reader looked up. Rendered only when global-search.js is actually loaded
// on this page, so the link can never be a dead end.
function dgeShabdaWhereElseLink(surface) {
  if (!(window.DGEGlobalSearch && window.DGEGlobalSearch.open)) return '';
  return '<a class="dsm-full-link" href="#" data-dsm-where="' + dgeShabdaEsc(surface) + '">🔍 साहित्ये अन्यत्र — where else in the library ↗</a>';
}
function dgeShabdaWireWhereElse(body) {
  const a = body.querySelector('[data-dsm-where]');
  if (!a) return;
  a.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof closeModal === 'function') closeModal(DGE_SHABDA_MODAL_ID);
    window.DGEGlobalSearch.open(a.getAttribute('data-dsm-where'));
  });
}

// The matched (or tapped) declension cell's step-by-step subanta prakriyā,
// via js/subanta-steps.js — the "Shabda must return the prakriyā" ask.
// Degrades silently to the plain table when that script isn't loaded or the
// engine can't load: the lookup's own answer never depends on it.
function dgeShabdaSubantaSteps(body, item, ci) {
  const S = window.DGESubantaSteps, box = body.querySelector('#dsmSteps');
  if (!S || !box || ci == null || ci < 0) return;
  const vb = Math.floor(ci / 3), vc = ci % 3;
  S.css();
  body.querySelectorAll('td.sst-cell-on').forEach(td => td.classList.remove('sst-cell-on'));
  const cell = body.querySelector('td[data-ci="' + ci + '"]');
  if (cell) cell.classList.add('sst-cell-on');
  box.className = 'sst-panel';
  box.innerHTML = '<div class="sst-loading">रूपसिद्धिः सज्जीक्रियते…</div>';
  const expected = String(item.forms || '').split(';')[ci] || '';
  S.derive(item.word, item.linga, vb, vc).then(function (results) {
    if (!box.isConnected) return;
    box.innerHTML = S.panelHtml(item.word, item.linga, vb, vc, results, expected);
  }).catch(function () {
    if (!box.isConnected) return;
    box.innerHTML = '<p class="sst-note">Could not load the derivation engine — the forms above are unaffected.</p>';
  });
}

function dgeShowShabdaNotFound(body, surface) {
  body.innerHTML = '<div class="dsm-empty">No exact form found for "' + dgeShabdaEsc(surface) + '". ' +
    'It may still be findable in the full word list — <a href="shabda.html?q=' + encodeURIComponent(surface) + '" target="_blank">search the full शब्दपाठः ↗</a>, or ' +
    '<a href="#" id="dsmReportMissing">report this as missing</a>.</div>' +
    dgeShabdaWhereElseLink(surface);
  dgeShabdaWireWhereElse(body);
  const rep = document.getElementById('dsmReportMissing');
  if (rep) rep.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.dgeReportMissingForm === 'function') window.dgeReportMissingForm(surface, 'shabda-modal');
  });
}

// A form the Śabdapāṭha (fixed nominal stems) genuinely has no entry for
// may still be a kṛdanta -- a word derived from a verb root (लभ्यः, from
// लभ्+यत्) via tools/build_krt_form_index.py's reverse index. Renders the
// real step-by-step derivation right here (Category 5's "Prakriya
// integration in the modal"), fetched from the same per-root JSON
// prakriya.js's krdanta.html view uses, not just a link to go read it on
// another page.
function dgeRenderShabdaKrt(body, surface, hit) {
  const code = hit.c, krtKey = hit.k, rootPart = code.split('.')[0];
  fetch('data/vedanga/vyakarana/prakriya/' + rootPart + '/' + code + '.json')
    .then(r => r.ok ? r.json() : null)
    .then(function (d) {
      const k = d && d.krt && d.krt.find(x => x.k === krtKey);
      if (!k) { dgeShowShabdaNotFound(body, surface); return; }
      body.innerHTML =
        '<div class="dsm-word deva">' + dgeShabdaEsc(surface) + '</div>' +
        '<div class="dsm-sub">कृदन्तः · ' + dgeShabdaEsc(DGE_KRT_NAME[krtKey] || krtKey) + ' (' + dgeShabdaEsc(DGE_KRT_NAME_EN[krtKey] || '') + ') · from <span class="deva">' + dgeShabdaEsc(d.dhatu) + '</span> "' + dgeShabdaEsc(d.artha || '') + '"</div>' +
        dgeShabdaStepsHtml(k.s) +
        '<a class="dsm-full-link" href="krdanta.html#' + dgeShabdaEsc(code) + ':' + dgeShabdaEsc(krtKey) + '" target="_blank">View in full कृदन्त browser ↗</a>' +
        dgeShabdaWhereElseLink(surface);
      dgeShabdaWireWhereElse(body);
    })
    .catch(() => dgeShowShabdaNotFound(body, surface));
}

window.dgeOpenShabdaForSelection = function(e) {
  if (e) e.preventDefault();
  const word = dgeSelectedWordText();
  if (!word) { if (typeof showToast === 'function') showToast('Select a word first.'); return; }
  dgeHideActionTooltip();
  dgeEnsureShabdaModal();
  window.openModal(DGE_SHABDA_MODAL_ID);
  const body = document.getElementById('dgeShabdaModalBody');
  body.innerHTML = '<div class="dsm-loading">खोजयति… searching “' + dgeShabdaEsc(word) + '”…</div>';
  dgeFetchShabdaData(word).then(function (items) {
    const loc = dgeFindShabdaForm(items, word);
    if (loc) {
      const it = loc.item;
      const krtTag = (it.krt || '').split(',').filter(Boolean)
        .map(k => DGE_KRT_NAME[k] || k).join(', ');
      let h = '<div class="dsm-word deva">' + dgeShabdaEsc(it.word) + '</div>' +
        '<div class="dsm-sub">' + dgeShabdaEsc(it.linga_iast || '') +
        (krtTag ? ' · <span class="deva">' + dgeShabdaEsc(krtTag) + 'प्रत्ययान्तः</span>' : '') + '</div>';
      if (it.artha) h += '<div class="dsm-kv"><div class="dsm-kk">अर्थः</div><div class="dsm-kvv deva">' + dgeShabdaEsc(it.artha) + '</div></div>';
      if (it.artha_hin) h += '<div class="dsm-kv"><div class="dsm-kk">हिन्दी</div><div class="dsm-kvv">' + dgeShabdaEsc(it.artha_hin) + '</div></div>';
      if (it.artha_eng) h += '<div class="dsm-kv"><div class="dsm-kk">English</div><div class="dsm-kvv">' + dgeShabdaEsc(it.artha_eng) + '</div></div>';
      h += dgeShabdaDeclTable(it.forms, loc.cellIndex);
      h += '<div id="dsmSteps"></div>';
      h += '<a class="dsm-full-link" href="shabda.html#' + dgeShabdaEsc(it.id) + '" target="_blank">View in full शब्दपाठः browser ↗</a>';
      h += dgeShabdaWhereElseLink(word);
      body.innerHTML = h;
      dgeShabdaWireWhereElse(body);
      // The looked-up form's own step-by-step prakriyā renders right away
      // (js/subanta-steps.js, the rupasiddhi WASM engine loaded lazily);
      // any other cell in the table is tappable for its derivation too.
      dgeShabdaSubantaSteps(body, it, loc.cellIndex);
      body.querySelectorAll('td[data-ci]').forEach(function (td) {
        td.addEventListener('click', function () {
          dgeShabdaSubantaSteps(body, it, parseInt(td.dataset.ci, 10));
        });
      });
      return;
    }
    const cp = word.codePointAt(0).toString(16).toLowerCase().padStart(4, '0');
    fetch('data/vedanga/vyakarana/prakriya/krtindex/' + cp + '.json')
      .then(r => r.ok ? r.json() : null)
      .then(function (m) {
        const hit = m && m[word];
        if (hit) dgeRenderShabdaKrt(body, word, hit);
        else dgeShowShabdaNotFound(body, word);
      })
      .catch(() => dgeShowShabdaNotFound(body, word));
  }).catch(() => dgeShowShabdaNotFound(body, word));
};

// Instant Dhātu lookup modal, same reasoning as the Śabda one above: this
// used to open dhatu.html/prakriya.html in a new tab for what is usually
// just "which root, which form is this" -- now answered in a modal without
// leaving the page, real step-by-step derivation included, not a link to
// go read it elsewhere.
//
// Which lakara/purusha/vacana cell a surface form (e.g. उवाच) belongs to
// isn't decidable client-side without scanning all ~2200 per-root prakriya
// files (262 MB total), so tools/build_prakriya_form_index.py precomputes
// a reverse index, sharded by the form's first Devanagari codepoint so a
// single word-click only fetches one small shard.
function dgeFindDhatuFormHit(word) {
  const w = String(word || '').trim();
  if (!w) return Promise.resolve(null);
  const cp = w.codePointAt(0).toString(16).toLowerCase().padStart(4, '0');
  return fetch('data/vedanga/vyakarana/prakriya/formindex/' + cp + '.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { return (m && m[w]) || null; })
    .catch(function () { return null; });
}

const DGE_DHATU_MODAL_ID = 'dgeDhatuModal';
// Same lakara/puruṣa/vacana naming as prakriya.js's own LAKARA/PURUSHA/
// VACANA -- duplicated rather than shared because that file's copies live
// inside its own closure and this page doesn't load prakriya.js at all
// (same reasoning as DGE_KRT_NAME above). Key order (0/1/2 for
// prathama/madhyama/uttama puruṣa) matches tools/build_prakriya.py's own
// "<lakara>.<purusha><vacana>" cell-key convention.
const DGE_LAKARA = { Lat:'लट्', Lit:'लिट्', Lut:'लुट्', Lrt:'लृट्', Lot:'लोट्', Lan:'लङ्', VidhiLin:'विधिलिङ्', Lun:'लुङ्' };
const DGE_LAKARA_EN = { Lat:'present', Lit:'perfect', Lut:'periphrastic future', Lrt:'future', Lot:'imperative', Lan:'imperfect', VidhiLin:'optative', Lun:'aorist' };
const DGE_PURUSHA = ['प्रथमपुरुषः', 'मध्यमपुरुषः', 'उत्तमपुरुषः'];
const DGE_VACANA = ['एकवचनम्', 'द्विवचनम्', 'बहुवचनम्'];

function dgeEnsureDhatuModal() {
  dgeEnsureWordModalShell(DGE_DHATU_MODAL_ID, 'dgeDhatuModalBody', '📚 धातुः · Dhātu');
  return document.getElementById(DGE_DHATU_MODAL_ID);
}

function dgeShowDhatuNotFound(body, surface) {
  body.innerHTML = '<div class="dsm-empty">No exact verb form found for "' + dgeShabdaEsc(surface) + '". ' +
    'It may still be findable in the full धातुपाठः browser — <a href="dhatu.html?q=' + encodeURIComponent(surface) + '" target="_blank">search धातुपाठः ↗</a>, or ' +
    '<a href="#" id="ddmReportMissing">report this as missing</a>.</div>';
  const rep = document.getElementById('ddmReportMissing');
  if (rep) rep.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.dgeReportMissingForm === 'function') window.dgeReportMissingForm(surface, 'dhatu-modal');
  });
}

window.dgeOpenDhatuForSelection = function(e) {
  if (e) e.preventDefault();
  const word = dgeSelectedWordText();
  if (!word) { if (typeof showToast === 'function') showToast('Select a word first.'); return; }
  dgeHideActionTooltip();
  dgeEnsureDhatuModal();
  window.openModal(DGE_DHATU_MODAL_ID);
  const body = document.getElementById('dgeDhatuModalBody');
  body.innerHTML = '<div class="dsm-loading">खोजयति… searching “' + dgeShabdaEsc(word) + '”…</div>';

  dgeFindDhatuFormHit(word).then(function (hit) {
    if (!hit) { dgeShowDhatuNotFound(body, word); return; }
    const rootPart = hit.c.split('.')[0];
    fetch('data/vedanga/vyakarana/prakriya/' + rootPart + '/' + hit.c + '.json')
      .then(r => r.ok ? r.json() : null)
      .then(function (d) {
        const step = d && d.steps && d.steps[hit.k] && d.steps[hit.k][0];
        if (!d || !step) { dgeShowDhatuNotFound(body, word); return; }
        const parts = hit.k.split('.');
        const lakara = parts[0];
        const purusha = parseInt(parts[1][0], 10);
        const vacana = parseInt(parts[1][1], 10);
        body.innerHTML =
          '<div class="dsm-word deva">' + dgeShabdaEsc(word) + '</div>' +
          '<div class="dsm-sub">from <span class="deva">' + dgeShabdaEsc(d.dhatu) + '</span> "' + dgeShabdaEsc(d.artha || '') + '" · गणः ' + dgeShabdaEsc(d.gana != null ? d.gana : '') + ' · ' + dgeShabdaEsc(d.pada || '') + '</div>' +
          '<div class="dsm-kv"><div class="dsm-kk">रूपम्</div><div class="dsm-kvv deva">' +
            dgeShabdaEsc(DGE_LAKARA[lakara] || lakara) + ' (' + dgeShabdaEsc(DGE_LAKARA_EN[lakara] || '') + ') · ' +
            dgeShabdaEsc(DGE_PURUSHA[purusha] || '') + ' · ' + dgeShabdaEsc(DGE_VACANA[vacana] || '') + '</div></div>' +
          dgeShabdaStepsHtml(step.s) +
          '<a class="dsm-full-link" href="prakriya.html#' + dgeShabdaEsc(hit.c) + ':' + dgeShabdaEsc(hit.k) + '" target="_blank">View in full प्रक्रिया browser ↗</a>';
      })
      .catch(() => dgeShowDhatuNotFound(body, word));
  });
};

// "Intelligence mapping" -- where else the word appears in the corpus
// (including which section, e.g. Vedanga), reusing the same corpus-wide
// search dhatu.js's own "corpus occurrences" button already opens rather
// than building a second index that would drift from it.
window.dgeOpenCorpusSearchForSelection = function(e) {
  if (e) e.preventDefault();
  const word = dgeSelectedWordText();
  if (!word) { if (typeof showToast === 'function') showToast('Select a word first.'); return; }
  dgeHideActionTooltip();
  if (typeof window.DGEGlobalSearch === 'object' && window.DGEGlobalSearch.open) window.DGEGlobalSearch.open(word);
};
