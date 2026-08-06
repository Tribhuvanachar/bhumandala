// dge/js/config-editor.js — form-based editor for the site's editable
// text settings. Super-admin only.
//
// DESIGN DECISION: this never touches config.js.
//
// config.js is executable JavaScript containing structure, functions,
// comments and API wiring. A UI that rewrote it would risk corrupting
// working code on a bad edit — which is exactly why a config UI was
// deferred for so long. Instead this reads and writes a plain data file,
// dge/data/config-overrides.json, holding ONLY the fields exposed below.
// core.js merges it over the defaults at load. Consequences:
//   - a mistake can only ever change a piece of text, never break the app
//   - deleting the overrides file restores every default instantly
//   - config.js stays the single source of structure, hand-edited as before
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['config-editor.js'] = 'v1.0 (Form-based text settings editor writing to config-overrides.json)';

const DGE_CONFIG_OVERRIDES_PATH = 'dge/data/config-overrides.json';

// Only these are editable. Anything not listed here is untouchable from
// the UI by construction, not by validation — a field that isn't rendered
// can't be saved.
const DGE_EDITABLE_TEXT_FIELDS = [
  { key: 'appName', label: 'App name', hint: 'Shown in share images and page metadata.' },
  { key: 'designedBy', label: 'Credit line', hint: 'Shown under the title as "DESIGNED BY ...".' },
  { key: 'contactEmail', label: 'Contact email', hint: 'Used by the About modal and sponsor links.' },
  { key: 'sarvamoolaProjectText', label: 'Project support text', hint: 'Shown in the support banner.' }
];

let dgeConfigDraft = null;

function dgeEsc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

// Builds the draft from what's currently live in memory (defaults already
// merged with any existing overrides), so the form always shows what the
// site is actually using right now.
function dgeBuildDraft() {
  const app = window.appConfig || {};
  const sp = window.SPONSOR_CONFIG || {};
  const co = window.CONTRIBUTORS_CONFIG || {};
  const ks = window.KEY_SPONSORS_CONFIG || {};
  return {
    appConfig: {
      appName: app.appName || '',
      designedBy: app.designedBy || '',
      showDesignedBy: app.showDesignedBy !== false,
      contactEmail: app.contactEmail || '',
      sarvamoolaProjectText: app.sarvamoolaProjectText || ''
    },
    SPONSOR_CONFIG: {
      enabled: sp.enabled !== false,
      introText: sp.introText || '',
      contactForSponsorship: sp.contactForSponsorship || '',
      sponsorCategories: (sp.sponsorCategories || []).map(c => ({
        icon: c.icon || '', label: c.label || '',
        description: c.description || '', enabled: c.enabled !== false
      }))
    },
    CONTRIBUTORS_CONFIG: {
      enabled: co.enabled !== false,
      contributors: (co.contributors || []).map(c => ({ name: c.name || '', role: c.role || '' }))
    },
    KEY_SPONSORS_CONFIG: {
      enabled: ks.enabled !== false,
      sponsors: (ks.sponsors || []).map(s => ({ name: s.name || '', contribution: s.contribution || '' }))
    }
  };
}

function dgeField(path, value, label, hint, multiline) {
  const input = multiline
    ? `<textarea rows="3" oninput="window.dgeConfigSet('${path}', this.value)"
         style="width:100%; box-sizing:border-box; font-size:13px; padding:8px;
                border:1px solid var(--card-border); border-radius:6px;
                background:var(--bg-main); color:var(--text-primary);">${dgeEsc(value)}</textarea>`
    : `<input type="text" value="${dgeEsc(value)}" oninput="window.dgeConfigSet('${path}', this.value)"
         style="width:100%; box-sizing:border-box; font-size:13px; padding:8px;
                border:1px solid var(--card-border); border-radius:6px;
                background:var(--bg-main); color:var(--text-primary);">`;
  return `<div style="margin-bottom:12px;">
    <label style="display:block; font-size:11px; font-weight:700; text-transform:uppercase;
                  color:var(--muted-text); margin-bottom:4px;">${dgeEsc(label)}</label>
    ${input}
    ${hint ? `<div class="hint" style="font-size:10px; margin-top:3px;">${dgeEsc(hint)}</div>` : ''}
  </div>`;
}

function dgeToggle(path, value, label) {
  return `<label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer;">
    <input type="checkbox" ${value ? 'checked' : ''}
           onchange="window.dgeConfigSet('${path}', this.checked)"
           style="width:20px; height:20px;">
    <span style="font-size:13px;">${dgeEsc(label)}</span>
  </label>`;
}

function dgeSection(title, body) {
  return `<div style="margin-bottom:18px; padding:12px; border:1px solid var(--card-border);
                      border-radius:8px; background:var(--card-bg);">
    <div style="font-size:12px; font-weight:800; text-transform:uppercase;
                color:var(--accent-red); margin-bottom:10px;">${dgeEsc(title)}</div>
    ${body}
  </div>`;
}

window.dgeConfigSet = function(path, value) {
  if (!dgeConfigDraft) return;
  const parts = path.split('.');
  let node = dgeConfigDraft;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
    node = node[k];
    if (!node) return;
  }
  const last = parts[parts.length - 1];
  node[/^\d+$/.test(last) ? parseInt(last, 10) : last] = value;
};

window.dgeConfigAddRow = function(listPath, template) {
  const parts = listPath.split('.');
  let node = dgeConfigDraft;
  parts.forEach(p => { node = node[p]; });
  node.push(JSON.parse(template));
  dgeRenderConfigEditor();
};

window.dgeConfigRemoveRow = function(listPath, idx) {
  if (!confirm('Remove this entry?')) return;
  const parts = listPath.split('.');
  let node = dgeConfigDraft;
  parts.forEach(p => { node = node[p]; });
  node.splice(idx, 1);
  dgeRenderConfigEditor();
};

function dgeRenderConfigEditor() {
  const el = document.getElementById('configEditorBody');
  if (!el || !dgeConfigDraft) return;
  const d = dgeConfigDraft;

  const general = DGE_EDITABLE_TEXT_FIELDS.map(f =>
    dgeField('appConfig.' + f.key, d.appConfig[f.key], f.label, f.hint,
             f.key === 'sarvamoolaProjectText')
  ).join('') + dgeToggle('appConfig.showDesignedBy', d.appConfig.showDesignedBy, 'Show the credit line');

  const sponsorRows = d.SPONSOR_CONFIG.sponsorCategories.map((c, i) => `
    <div style="border-top:1px dashed var(--card-border); padding-top:10px; margin-top:10px;">
      <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
        <input type="text" value="${dgeEsc(c.icon)}"
               oninput="window.dgeConfigSet('SPONSOR_CONFIG.sponsorCategories.${i}.icon', this.value)"
               style="width:52px; text-align:center; font-size:16px; padding:6px;
                      border:1px solid var(--card-border); border-radius:6px;
                      background:var(--bg-main); color:var(--text-primary);">
        <input type="text" value="${dgeEsc(c.label)}"
               oninput="window.dgeConfigSet('SPONSOR_CONFIG.sponsorCategories.${i}.label', this.value)"
               style="flex:1; font-size:13px; padding:6px; border:1px solid var(--card-border);
                      border-radius:6px; background:var(--bg-main); color:var(--text-primary);">
        <button class="btn-sm" style="color:var(--accent-red);"
                onclick="window.dgeConfigRemoveRow('SPONSOR_CONFIG.sponsorCategories', ${i})">🗑️</button>
      </div>
      <textarea rows="2"
        oninput="window.dgeConfigSet('SPONSOR_CONFIG.sponsorCategories.${i}.description', this.value)"
        style="width:100%; box-sizing:border-box; font-size:12px; padding:6px;
               border:1px solid var(--card-border); border-radius:6px;
               background:var(--bg-main); color:var(--text-primary);">${dgeEsc(c.description)}</textarea>
      ${dgeToggle(`SPONSOR_CONFIG.sponsorCategories.${i}.enabled`, c.enabled, 'Visible')}
    </div>`).join('');

  const contribRows = d.CONTRIBUTORS_CONFIG.contributors.map((c, i) => `
    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <input type="text" value="${dgeEsc(c.name)}" placeholder="Name"
             oninput="window.dgeConfigSet('CONTRIBUTORS_CONFIG.contributors.${i}.name', this.value)"
             style="flex:1; font-size:13px; padding:6px; border:1px solid var(--card-border);
                    border-radius:6px; background:var(--bg-main); color:var(--text-primary);">
      <input type="text" value="${dgeEsc(c.role)}" placeholder="Role (optional)"
             oninput="window.dgeConfigSet('CONTRIBUTORS_CONFIG.contributors.${i}.role', this.value)"
             style="flex:1; font-size:13px; padding:6px; border:1px solid var(--card-border);
                    border-radius:6px; background:var(--bg-main); color:var(--text-primary);">
      <button class="btn-sm" style="color:var(--accent-red);"
              onclick="window.dgeConfigRemoveRow('CONTRIBUTORS_CONFIG.contributors', ${i})">🗑️</button>
    </div>`).join('');

  const keySponsorRows = d.KEY_SPONSORS_CONFIG.sponsors.map((s, i) => `
    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <input type="text" value="${dgeEsc(s.name)}" placeholder="Name"
             oninput="window.dgeConfigSet('KEY_SPONSORS_CONFIG.sponsors.${i}.name', this.value)"
             style="flex:1; font-size:13px; padding:6px; border:1px solid var(--card-border);
                    border-radius:6px; background:var(--bg-main); color:var(--text-primary);">
      <input type="text" value="${dgeEsc(s.contribution)}" placeholder="What they cover"
             oninput="window.dgeConfigSet('KEY_SPONSORS_CONFIG.sponsors.${i}.contribution', this.value)"
             style="flex:2; font-size:13px; padding:6px; border:1px solid var(--card-border);
                    border-radius:6px; background:var(--bg-main); color:var(--text-primary);">
      <button class="btn-sm" style="color:var(--accent-red);"
              onclick="window.dgeConfigRemoveRow('KEY_SPONSORS_CONFIG.sponsors', ${i})">🗑️</button>
    </div>`).join('');

  el.innerHTML =
    `<p class="hint" style="margin-top:0;">These settings are saved to
      <code>data/config-overrides.json</code>, a plain data file — never to
      <code>config.js</code>. A mistake here can only change text, never break
      the app, and "Reset all" restores every default.</p>` +
    dgeSection('General', general) +
    dgeSection('Support / Sponsorship',
      dgeToggle('SPONSOR_CONFIG.enabled', d.SPONSOR_CONFIG.enabled, 'Show the Support section') +
      dgeField('SPONSOR_CONFIG.introText', d.SPONSOR_CONFIG.introText, 'Intro text', '', true) +
      dgeField('SPONSOR_CONFIG.contactForSponsorship', d.SPONSOR_CONFIG.contactForSponsorship, 'Sponsorship contact email', '') +
      `<div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--muted-text); margin-top:10px;">Ways to sponsor</div>` +
      sponsorRows +
      `<button class="btn-sm" style="margin-top:10px;"
        onclick='window.dgeConfigAddRow("SPONSOR_CONFIG.sponsorCategories", ${JSON.stringify(JSON.stringify({icon:'🙏',label:'New category',description:'',enabled:true}))})'>➕ Add category</button>`) +
    dgeSection('Contributors',
      dgeToggle('CONTRIBUTORS_CONFIG.enabled', d.CONTRIBUTORS_CONFIG.enabled, 'Show the Contributors section') +
      contribRows +
      `<button class="btn-sm" style="margin-top:6px;"
        onclick='window.dgeConfigAddRow("CONTRIBUTORS_CONFIG.contributors", ${JSON.stringify(JSON.stringify({name:'',role:''}))})'>➕ Add contributor</button>`) +
    dgeSection('Key Sponsors',
      dgeToggle('KEY_SPONSORS_CONFIG.enabled', d.KEY_SPONSORS_CONFIG.enabled, 'Show the Key Sponsors section') +
      keySponsorRows +
      `<button class="btn-sm" style="margin-top:6px;"
        onclick='window.dgeConfigAddRow("KEY_SPONSORS_CONFIG.sponsors", ${JSON.stringify(JSON.stringify({name:'',contribution:''}))})'>➕ Add sponsor</button>`);
}

window.openConfigEditor = function() {
  if (localStorage.getItem('is_superadmin') !== 'true') {
    if (typeof showToast === 'function') showToast('Super admin access required.');
    return;
  }
  dgeConfigDraft = dgeBuildDraft();
  if (typeof openModal === 'function') openModal('configEditorModal');
  dgeRenderConfigEditor();
};

window.dgeSaveConfigOverrides = async function() {
  if (!dgeConfigDraft) return;
  if (typeof dgeAdminUpsertFile !== 'function') {
    if (typeof showToast === 'function') showToast('Admin editor not loaded — cannot save.');
    return;
  }
  const btn = document.getElementById('configSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const json = JSON.stringify(dgeConfigDraft, null, 2);
    // dgeAdminUpsertFile expects base64. btoa() alone breaks on non-Latin1
    // characters, and these fields routinely hold Devanagari and emoji —
    // so encode to UTF-8 bytes first, then base64 those.
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);
    await dgeAdminUpsertFile(DGE_CONFIG_OVERRIDES_PATH, base64,
      dgeAdminBuildCommitMessage('Update site config'));
    if (typeof showToast === 'function') showToast('Saved. Reloading to apply…');
    setTimeout(() => location.reload(), 900);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Save failed: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
  }
};

window.dgeResetConfigOverrides = async function() {
  if (!confirm('Reset ALL settings to their defaults?\n\nThis deletes the overrides file. Nothing in config.js is touched, so every default comes straight back.')) return;
  try {
    await dgeAdminDelete(DGE_CONFIG_OVERRIDES_PATH, 'file');
    if (typeof showToast === 'function') showToast('Reset. Reloading…');
    setTimeout(() => location.reload(), 900);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Reset failed (the file may not exist yet): ' + e.message);
  }
};
