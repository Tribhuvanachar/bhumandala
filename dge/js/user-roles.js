// dge/js/user-roles.js — Superadmin "Manage Users" list (basic version).
// Client-side gate mirrors the is_superadmin localStorage check used
// everywhere else in this app; the REAL enforcement is Firestore
// security rules (dge/firebase/firestore.rules) — this UI physically
// cannot write a role change the rules reject, regardless of what runs
// here. No pagination yet (loads up to 200 most-recently-active users) —
// fine to start with, revisit once real volume makes that a problem.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['user-roles.js'] = 'v1.0 (List + search + change role, basic version)';

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
    const roles = (window.AUTH_CONFIG && window.AUTH_CONFIG.roles) || ['basic'];
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

    body.innerHTML = rows.map(u => `
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
