// dge/js/user-roles.js — Superadmin "Manage Users" list (basic version).
// Client-side gate mirrors the is_superadmin localStorage check used
// everywhere else in this app; the REAL enforcement is Firestore
// security rules (dge/firebase/firestore.rules) — this UI physically
// cannot write a role change the rules reject, regardless of what runs
// here. No pagination yet (loads up to 200 most-recently-active users) —
// fine to start with, revisit once real volume makes that a problem.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['user-roles.js'] = 'v1.1 (10 Sep 2026: custom roles in the dropdown, a spreadsheet round-trip -- copy the sheet out, paste email\u2192role back in) \u00b7 v1.0 (List + search + change role)';

function dgeRolesEsc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

window.openUserRolesModal = async function() {
  if (localStorage.getItem('is_superadmin') !== 'true') {
    if (typeof showToast === 'function') showToast('Super admin access required.');
    return;
  }
  if (!window.AUTH_CONFIG || !window.AUTH_CONFIG.enabled) {
    if (typeof showToast === 'function') showToast('Accounts are not set up yet on this deployment.');
    return;
  }
  // The SDK is loaded on demand (see user-auth.js). Normally it is
  // already there by the time an admin opens this screen, but awaiting
  // it keeps this page working if it is ever reached before startup
  // finished.
  if (typeof window.dgeEnsureFirebaseSdk === 'function') await window.dgeEnsureFirebaseSdk();
  if (typeof openModal === 'function') openModal('userRolesModal');
  await dgeRenderUserRolesList();
};

async function dgeRenderUserRolesList(filterText) {
  const body = document.getElementById('userRolesBody');
  if (!body) return;
  body.innerHTML = `<p style="font-size:12px; color:var(--muted-text);">Loading users…</p>`;

  let db;
  try {
    db = firebase.firestore();
  } catch (e) {
    body.innerHTML = `<p style="font-size:12px; color:var(--accent-red);">Firebase isn't initialized.</p>`;
    return;
  }

  try {
    const snap = await db.collection('users').orderBy('lastLoginAt', 'desc').limit(200).get();
    // Every role this deployment knows -- the fixed tiers in AUTH_CONFIG AND
    // any custom role created in admin/access-control.html. Until 10 Sep 2026
    // this read AUTH_CONFIG alone, so a role someone had just created to gate
    // a section with could not actually be granted to anybody from here: it
    // simply was not in the dropdown.
    if (typeof window.dgeLoadRoleAccessConfig === 'function') {
      try { await window.dgeLoadRoleAccessConfig(); } catch (e) { /* fall through to the fixed list */ }
    }
    const roles = (typeof window.dgeAllRoleIds === 'function' ? window.dgeAllRoleIds() : null)
      || (window.AUTH_CONFIG && window.AUTH_CONFIG.roles) || ['basic'];
    dgeUserRolesKnown = roles;
    const filter = (filterText || '').trim().toLowerCase();

    const rows = [];
    snap.forEach(doc => {
      const u = doc.data();
      const haystack = `${u.displayName || ''} ${u.email || ''} ${u.phoneNumber || ''}`.toLowerCase();
      if (filter && !haystack.includes(filter)) return;
      rows.push(Object.assign({ id: doc.id }, u));
    });

    if (!rows.length) {
      body.innerHTML = `<p style="font-size:12px; color:var(--muted-text);">${filter ? 'No users match that search.' : 'No users yet.'}</p>`;
      return;
    }

    // 7 Sep 2026: the verified-email list, as CSV — the "export" half of the
    // lead's ask. Only rows whose email the provider verified (emailVerified
    // true, or a legacy Google profile whose email predates the flag).
    const exportable = rows.filter(u => u.email && (u.emailVerified === true || u.emailVerified === undefined));
    body.innerHTML = `<div style="display:flex; gap:8px; align-items:center; margin:0 0 8px;">
        <span style="font-size:11px; color:var(--muted-text);">${rows.length} shown · ${exportable.length} with a verified email</span>
        <button class="btn-sm" style="margin-left:auto; font-size:11px;" onclick="window.dgeExportUserRolesTsv()" title="Everyone shown, as tab-separated text — paste straight into a spreadsheet">⬇ Sheet (TSV)</button>
        <button class="btn-sm" style="font-size:11px;" onclick="window.dgeOpenBulkRolePaste()" title="Paste an email/role column back from your spreadsheet">📋 Paste roles</button>
        <button class="btn-sm" style="font-size:11px;" onclick="window.dgeExportVerifiedEmails()" title="CSV of every listed user with a verified email">⬇ Emails (CSV)</button>
      </div>` + rows.map(u => `
      <div style="border-top:1px dashed var(--card-border); padding:10px 0; display:flex; align-items:center; gap:8px;">
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${dgeRolesEsc(u.displayName || u.email || u.phoneNumber || u.id)}</div>
          <div style="font-size:11px; color:var(--muted-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${dgeRolesEsc(u.email || u.phoneNumber || '')}</div>
        </div>
        <select style="flex:none; font-size:12px; padding:6px; border-radius:6px; border:1px solid var(--card-border); background:var(--bg-main); color:var(--text-primary);"
                onchange="window.dgeChangeUserRole('${u.id}', this.value)">
          ${roles.map(r => `<option value="${dgeRolesEsc(r)}" ${r === u.role ? 'selected' : ''}>${dgeRolesEsc(r)}</option>`).join('')}
        </select>
      </div>`).join('');
  } catch (e) {
    console.error('[UserRoles] Failed to load users:', e);
    body.innerHTML = `<p style="font-size:12px; color:var(--accent-red);">Couldn't load users: ${dgeRolesEsc(e.message || e)}</p>`;
  }
}

//: Filled by the list render; the paste parser validates against it so a
//: typo becomes a reported row rather than a role nobody can ever match.
let dgeUserRolesKnown = [];
/**
 * Parse a block pasted out of a spreadsheet into {email, role} rows.
 *
 * Pure and exported so it can be tested without Firebase. Deliberately
 * generous about SHAPE and strict about CONTENT: a spreadsheet copy arrives
 * tab-separated, a hand-typed list comma-separated, and either may or may not
 * carry the header row this tool exported. Extra columns (displayName, the
 * old role) are ignored -- which is what makes "export the sheet, edit the
 * role column, paste it back" work without deleting anything first.
 */
window.dgeParseRolePaste = function(text, knownRoles) {
  const known = (knownRoles || []).map(r => String(r).toLowerCase());
  const rows = [];
  String(text || '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split(/\t|,/).map(c => c.trim().replace(/^"|"$/g, ''));
    const email = (cells.find(c => c.indexOf('@') > 0) || '').toLowerCase();
    // The role is the last cell that names a role we actually know. Taking
    // "the last cell" outright would pick up a trailing timestamp column.
    let role = null;
    for (let k = cells.length - 1; k >= 0; k--) {
      if (known.indexOf(cells[k].toLowerCase()) >= 0) { role = cells[k].toLowerCase(); break; }
    }
    if (!email && !role) return;                       // blank or a header line
    rows.push({ line: i + 1, email: email, role: role, raw: line.trim() });
  });
  return rows;
};

window.dgeExportUserRolesTsv = async function() {
  try {
    const db = firebase.firestore();
    const snap = await db.collection('users').orderBy('lastLoginAt', 'desc').limit(1000).get();
    // Tab-separated, not comma: pasting TSV into Excel/Sheets lands in
    // columns with no import dialogue, which is the whole point of offering
    // it beside the CSV export.
    const lines = ['email\tdisplayName\trole\tphone\tlastLogin'];
    snap.forEach(doc => {
      const u = doc.data();
      const last = u.lastLoginAt && u.lastLoginAt.toDate ? u.lastLoginAt.toDate().toISOString().slice(0, 10) : '';
      lines.push([u.email || '', u.displayName || '', u.role || '', u.phoneNumber || '', last]
        .map(v => String(v).replace(/[\t\r\n]/g, ' ')).join('\t'));
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/tab-separated-values' }));
    a.download = 'dge-users-' + new Date().toISOString().slice(0, 10) + '.tsv';
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof showToast === 'function') showToast((lines.length - 1) + ' user(s) exported. Edit the role column and paste it back.');
  } catch (e) {
    console.error('[UserRoles] TSV export failed:', e);
    if (typeof showToast === 'function') showToast('Export failed: ' + (e.message || e));
  }
};

window.dgeOpenBulkRolePaste = function() {
  const body = document.getElementById('userRolesBody');
  if (!body) return;
  const known = dgeUserRolesKnown.length ? dgeUserRolesKnown
    : ((window.AUTH_CONFIG && window.AUTH_CONFIG.roles) || ['basic']);
  body.innerHTML = `
    <div style="font-size:12px; color:var(--muted-text); margin-bottom:8px;">
      Paste rows copied from your spreadsheet — one person per line, with the email
      and the role in any two columns. Tabs or commas both work, a header row is
      ignored, and extra columns are left alone. Nothing is written until you press Apply.
    </div>
    <div style="font-size:11px; color:var(--muted-text); margin-bottom:8px;">
      Roles you can use: ${known.map(r => `<code>${dgeRolesEsc(r)}</code>`).join(' ')}
    </div>
    <textarea id="dgeBulkRoleText" rows="9" placeholder="someone@example.com&#9;Ravi&#9;subscriber"
      style="width:100%; box-sizing:border-box; font:12px/1.4 ui-monospace,monospace; padding:8px;
             border:1px solid var(--card-border); border-radius:6px;
             background:var(--bg-main); color:var(--text-primary);"></textarea>
    <div style="display:flex; gap:8px; margin-top:8px;">
      <button class="btn-sm" onclick="window.dgeApplyBulkRolePaste()">✔ Apply</button>
      <button class="btn-sm" onclick="window.dgeRenderUserRolesListPublic()">Cancel</button>
    </div>
    <div id="dgeBulkRoleResult" style="margin-top:10px; font-size:12px;"></div>`;
};

window.dgeApplyBulkRolePaste = async function() {
  const ta = document.getElementById('dgeBulkRoleText');
  const out = document.getElementById('dgeBulkRoleResult');
  if (!ta || !out) return;
  const known = dgeUserRolesKnown.length ? dgeUserRolesKnown
    : ((window.AUTH_CONFIG && window.AUTH_CONFIG.roles) || ['basic']);
  const rows = window.dgeParseRolePaste(ta.value, known);
  if (!rows.length) { out.innerHTML = '<span style="color:var(--accent-red);">Nothing to apply.</span>'; return; }

  // Resolve emails to uids from the LIVE collection rather than the last
  // render: the paste may name someone who signed in since the list loaded.
  let byEmail = {};
  try {
    const db = firebase.firestore();
    const snap = await db.collection('users').orderBy('lastLoginAt', 'desc').limit(1000).get();
    snap.forEach(doc => {
      const e = (doc.data().email || '').toLowerCase();
      if (e) byEmail[e] = doc.id;
    });
  } catch (e) {
    out.innerHTML = '<span style="color:var(--accent-red);">Could not read the user list: ' + dgeRolesEsc(e.message || e) + '</span>';
    return;
  }

  const results = [];
  let applied = 0;
  for (const r of rows) {
    if (!r.email) { results.push([r.line, r.raw, 'no email in this line']); continue; }
    if (!r.role) { results.push([r.line, r.raw, 'no role I recognise in this line']); continue; }
    const uid = byEmail[r.email];
    if (!uid) { results.push([r.line, r.email, 'no account with that email has signed in yet']); continue; }
    try {
      await firebase.firestore().collection('users').doc(uid).update({ role: r.role });
      applied++;
      results.push([r.line, r.email, '→ ' + r.role, true]);
    } catch (e) {
      results.push([r.line, r.email, 'refused: ' + (e.message || e)]);
    }
  }
  out.innerHTML =
    `<div style="font-weight:700; margin-bottom:6px;">${applied} of ${rows.length} applied.</div>` +
    results.map(x => `<div style="padding:2px 0; color:${x[3] ? 'inherit' : 'var(--accent-red)'};">
        <span style="opacity:.6;">line ${x[0]}</span> ${dgeRolesEsc(x[1])} — ${dgeRolesEsc(x[2])}</div>`).join('') +
    `<button class="btn-sm" style="margin-top:10px;" onclick="window.dgeRenderUserRolesListPublic()">← Back to the list</button>`;
};

window.dgeRenderUserRolesListPublic = function() { dgeRenderUserRolesList(); };

window.dgeExportVerifiedEmails = async function() {
  try {
    const db = firebase.firestore();
    const snap = await db.collection('users').orderBy('lastLoginAt', 'desc').limit(1000).get();
    const lines = ['email,displayName,role,phoneNumber,createdAt'];
    snap.forEach(doc => {
      const u = doc.data();
      if (!u.email || !(u.emailVerified === true || u.emailVerified === undefined)) return;
      const created = u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toISOString() : '';
      lines.push([u.email, u.displayName || '', u.role || '', u.phoneNumber || '', created].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
    a.download = 'dge-verified-emails-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof showToast === 'function') showToast((lines.length - 1) + ' verified email(s) exported.');
  } catch (e) {
    console.error('[UserRoles] Export failed:', e);
    if (typeof showToast === 'function') showToast('Export failed: ' + (e.message || e));
  }
};

window.dgeSearchUserRoles = function(text) {
  dgeRenderUserRolesList(text);
};

window.dgeChangeUserRole = async function(uid, newRole) {
  try {
    const db = firebase.firestore();
    await db.collection('users').doc(uid).update({ role: newRole });
    if (typeof showToast === 'function') showToast('Role updated.');
  } catch (e) {
    console.error('[UserRoles] Role change failed:', e);
    if (typeof showToast === 'function') showToast('Could not change role: ' + (e.message || e));
    await dgeRenderUserRolesList(); // re-render so the dropdown reflects what's actually stored, not the rejected attempt
  }
};
