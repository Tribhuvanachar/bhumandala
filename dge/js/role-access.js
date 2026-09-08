// dge/js/role-access.js — role-based content gating (8 Sep 2026).
//
// UI-level only, by explicit project-lead decision: this hides gated
// taxonomy paths from the reader's own navigation/search for anyone whose
// role doesn't clear the gate. It does NOT stop a determined visitor who
// already knows (or guesses) the direct file path from fetching the raw
// data.json — the corpus files stay public static assets on Hosting,
// exactly like the pre-existing admin/config/library-overrides.json
// "hidden" list this extends. Real per-request enforcement would mean
// serving corpus text through an authenticated proxy instead of static
// files, which is a materially different (and more expensive) hosting
// architecture — out of scope until asked for.
//
// Source of truth is Firestore (see firestore.rules' `config/{docId}`
// block: public read, superadmin-only write) rather than a committed
// static file, unlike library-overrides.json — so a superadmin's edits
// in admin/access-control.html take effect for every visitor immediately,
// no export/commit/push/deploy cycle. This is intentional: the whole
// point of that admin page is a fast create-role -> grant-access -> test
// loop, and Firestore is already loaded on every page view (see
// user-auth.js's DOMContentLoaded handler, which loads the SDK
// unconditionally whenever AUTH_CONFIG.enabled is true, whether or not
// the visitor signs in) so reading two small config docs costs nothing
// beyond what's already paid.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['role-access.js'] = 'v1.0 (Firestore-backed content gates + preview-as-role)';

// config/roles      -> { list: [{ id, label }, ...] }
// config/roleAccess  -> { gates: [{ prefix, allowRoles: [id, ...] }, ...] }
// Both documents are optional — an unconfigured deployment behaves exactly
// as before this file existed (no roles beyond AUTH_CONFIG.roles, no gates).
let dgeRoleAccessGates = [];   // [{ prefix, allowRoles }]
let dgeAllRoles = null;        // [{ id, label }] once loaded; null = not loaded yet
let dgeRoleAccessLoadPromise = null;

// The fixed tier every deployment ships with (AUTH_CONFIG.roles), plus the
// pseudo-role used for a visitor who hasn't signed in at all — distinct
// from 'basic' (a real, registered account) so a gate can require "signed
// in" without requiring any particular tier.
const DGE_ANONYMOUS_ROLE = 'anonymous';

function dgeFixedRoles() {
  const configured = (window.AUTH_CONFIG && Array.isArray(window.AUTH_CONFIG.roles)) ? window.AUTH_CONFIG.roles : ['basic'];
  return configured.map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));
}

/**
 * Pure, testable gate matcher — no Firestore, no DOM. Longest matching
 * path-prefix wins, mirroring dgeIsHiddenPath's own walk in library.js so
 * the two behave identically for "does this path fall under that prefix".
 * A path with no configured gate is open to everyone (gates are opt-in
 * restrictions, same direction library-overrides.json's hidden list takes).
 */
window.dgeMatchRoleGate = function(path, gates) {
  if (!path || !Array.isArray(gates) || !gates.length) return null;
  const parts = String(path).split('/');
  let matched = null;
  for (let i = 1; i <= parts.length; i++) {
    const prefix = parts.slice(0, i).join('/');
    const g = gates.find(g => g && g.prefix === prefix);
    if (g) matched = g; // a longer (deeper) match overrides a shorter one
  }
  return matched;
};

/**
 * True when `role` is blocked from `path` by `gates`. Pure function, unit
 * tested directly (see dge/firebase/tests/role-access.test.js) without any
 * Firebase or browser globals.
 */
window.dgeIsRoleGatedPath = function(path, role, gates) {
  const gate = window.dgeMatchRoleGate(path, gates);
  if (!gate) return false;
  const allow = Array.isArray(gate.allowRoles) ? gate.allowRoles : [];
  return allow.indexOf(role || DGE_ANONYMOUS_ROLE) < 0;
};

// --- Firestore loading --------------------------------------------------

/**
 * Loads config/roles + config/roleAccess once and caches the result;
 * concurrent callers share one load. Safe to call before Firebase has
 * initialized (waits on dgeEnsureFirebaseSdk, same lazy-load promise
 * user-auth.js's other consumers share) and safe to call when accounts
 * are switched off entirely (AUTH_CONFIG.enabled false) — resolves to the
 * fixed roles with no gates, i.e. unchanged behavior.
 */
window.dgeLoadRoleAccessConfig = function() {
  if (dgeRoleAccessLoadPromise) return dgeRoleAccessLoadPromise;
  dgeRoleAccessLoadPromise = (async () => {
    if (!window.AUTH_CONFIG || !window.AUTH_CONFIG.enabled) {
      dgeAllRoles = dgeFixedRoles();
      dgeRoleAccessGates = [];
      return;
    }
    try {
      if (typeof window.dgeEnsureFirebaseSdk === 'function') await window.dgeEnsureFirebaseSdk();
      if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        dgeAllRoles = dgeFixedRoles();
        dgeRoleAccessGates = [];
        return;
      }
      const db = firebase.firestore();
      const [rolesSnap, gatesSnap] = await Promise.all([
        db.collection('config').doc('roles').get(),
        db.collection('config').doc('roleAccess').get()
      ]);
      const rolesDoc = rolesSnap.exists ? rolesSnap.data() : null;
      const gatesDoc = gatesSnap.exists ? gatesSnap.data() : null;
      // Fixed roles always appear even if the config/roles doc hasn't been
      // saved yet (or is missing one) -- it only ever ADDS custom roles on
      // top, never hides a role the deployment itself defines.
      const fixed = dgeFixedRoles();
      const custom = (rolesDoc && Array.isArray(rolesDoc.list)) ? rolesDoc.list.filter(r => r && r.id && !fixed.some(f => f.id === r.id)) : [];
      dgeAllRoles = fixed.concat(custom);
      dgeRoleAccessGates = (gatesDoc && Array.isArray(gatesDoc.gates)) ? gatesDoc.gates : [];
    } catch (e) {
      console.error('[RoleAccess] Failed to load config/roles or config/roleAccess:', e);
      dgeAllRoles = dgeFixedRoles();
      dgeRoleAccessGates = [];
    }
  })();
  return dgeRoleAccessLoadPromise;
};

/** Every role id known to this deployment: fixed tiers + any custom ones. */
window.dgeAllRoleIds = function() {
  return (dgeAllRoles || dgeFixedRoles()).map(r => r.id);
};
window.dgeAllRoleDefs = function() {
  return (dgeAllRoles || dgeFixedRoles()).slice();
};
window.dgeFixedRoleIds = function() {
  return dgeFixedRoles().map(r => r.id);
};
/** The currently cached gate list -- call dgeLoadRoleAccessConfig() first. */
window.dgeCurrentRoleGates = function() {
  return dgeRoleAccessGates.slice();
};

/**
 * Writes config/roles + config/roleAccess. Firestore rules (see
 * firestore.rules' config/{docId} block) reject this unless the caller is
 * actually signed in with role 'superadmin' -- the client-side
 * is_superadmin flag that gates admin/access-control.html's own UI is
 * convenience only, exactly like every other admin passkey in this app;
 * this call is the real check, enforced server-side regardless of what
 * this function's caller believes about itself.
 */
window.dgeSaveRoleAccessConfig = async function(customRoles, gates) {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
    throw new Error('Firebase is not initialized.');
  }
  const db = firebase.firestore();
  const fixed = dgeFixedRoles();
  const list = fixed.concat((Array.isArray(customRoles) ? customRoles : []).filter(r => r && r.id && !fixed.some(f => f.id === r.id)));
  const cleanGates = (Array.isArray(gates) ? gates : []).filter(g => g && g.prefix).map(g => ({
    prefix: String(g.prefix),
    allowRoles: Array.isArray(g.allowRoles) ? g.allowRoles.slice() : []
  }));
  await db.collection('config').doc('roles').set({ list, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await db.collection('config').doc('roleAccess').set({ gates: cleanGates, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  dgeAllRoles = list;
  dgeRoleAccessGates = cleanGates;
};

// --- Preview-as-role (superadmin testing) -------------------------------
//
// The "test it in a cycle" ask: a superadmin can simulate any role's view
// of the reader without a second real account. Session-scoped (one tab,
// cleared on close) and gated on the REAL role, not the previewed one, so
// previewing 'basic' can never itself grant more than the actual
// signed-in account already has, and a person who is not actually a
// superadmin cannot grant themselves a preview by poking sessionStorage —
// dgeIsHiddenByRoleGate below reads the real role first and only consults
// the preview when that real check already passed.
const DGE_PREVIEW_ROLE_KEY = 'dge.previewRole';

// Deliberately reads localStorage directly rather than calling the
// library.js-defined dgeIsSuperAdmin() -- this file is loaded on
// admin/access-control.html too, which never loads library.js, and this
// check has to work there without depending on script load order across
// files that otherwise have nothing to do with each other.
function dgeRoleAccessIsSuperAdmin() {
  try { return localStorage.getItem('is_superadmin') === 'true'; } catch (e) { return false; }
}

window.dgeSetPreviewRole = function(role) {
  if (!dgeRoleAccessIsSuperAdmin()) { if (typeof showToast === 'function') showToast('Super admin access required.'); return; }
  try { sessionStorage.setItem(DGE_PREVIEW_ROLE_KEY, role || ''); } catch (e) { /* private mode etc. */ }
};
window.dgeClearPreviewRole = function() {
  try { sessionStorage.removeItem(DGE_PREVIEW_ROLE_KEY); } catch (e) { /* ignore */ }
};
window.dgeGetPreviewRole = function() {
  if (!dgeRoleAccessIsSuperAdmin()) return null; // a stale flag from a former superadmin session never leaks a preview to anyone else
  try { return sessionStorage.getItem(DGE_PREVIEW_ROLE_KEY) || null; } catch (e) { return null; }
};

// --- The actual gate check library.js hooks into ------------------------

/**
 * Effective role for gating purposes: the preview role while one is set
 * (superadmin only, see above), else the real signed-in role, else the
 * anonymous pseudo-tier for a signed-out visitor.
 */
window.dgeEffectiveGatingRole = function() {
  const preview = window.dgeGetPreviewRole();
  if (preview) return preview;
  return window.dgeCurrentUserRole || DGE_ANONYMOUS_ROLE;
};

/**
 * The single call library.js's dgeIsHiddenPath makes. A real admin or
 * superadmin (not previewing) always passes -- the same bypass
 * dgeIsAdminOnlyGrantha already gives them elsewhere, so curating a gate
 * can never accidentally lock its own author out of the content they're
 * configuring. Previewing deliberately does NOT bypass: that's the whole
 * point of the preview, so a superadmin can see exactly what the role
 * they're testing would see.
 */
window.dgeIsHiddenByRoleGate = function(path) {
  const preview = window.dgeGetPreviewRole();
  if (preview) return window.dgeIsRoleGatedPath(path, preview, dgeRoleAccessGates);
  if (typeof dgeIsAdmin === 'function' && dgeIsAdmin()) return false;
  return window.dgeIsRoleGatedPath(path, window.dgeEffectiveGatingRole(), dgeRoleAccessGates);
};
