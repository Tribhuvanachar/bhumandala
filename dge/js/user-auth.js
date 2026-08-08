// dge/js/user-auth.js — Firebase-backed user accounts & roles (basic
// version). See FIREBASE_SETUP.md for the console steps that have to
// happen outside this codebase first, and config.js's FIREBASE_CONFIG /
// AUTH_CONFIG for the switches this file reads.
//
// Deliberately inert whenever AUTH_CONFIG.enabled is false (the shipped
// default) — no Firebase network calls, no Account button shown, nothing
// in this file runs beyond the safety check at the bottom. Safe to ship
// on any deployment that hasn't gone through Firebase setup yet.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['user-auth.js'] = 'v1.0 (Google Sign-In + Firestore roles, basic version)';

window.dgeCurrentUser = null;      // Firebase Auth user object, or null
window.dgeCurrentUserRole = null;  // resolved role string, or null

let dgeAuth = null;
let dgeDb = null;
let dgeRecaptchaVerifier = null;   // phone auth only, created lazily
let dgeConfirmationResult = null;  // phone auth only, pending OTP confirmation

function dgeAuthReady() {
  return !!(window.AUTH_CONFIG && window.AUTH_CONFIG.enabled && typeof firebase !== 'undefined');
}

function dgeInitFirebase() {
  if (!dgeAuthReady() || dgeAuth) return dgeAuth;
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    dgeAuth = firebase.auth();
    dgeDb = firebase.firestore();
  } catch (e) {
    console.error('[Auth] Firebase init failed — check FIREBASE_CONFIG in config.js:', e);
    return null;
  }
  return dgeAuth;
}

// Ensures a Firestore profile doc exists for this user, creating one with
// the configured default role on first sign-in ONLY. A returning user's
// role — possibly changed by a superadmin since their last visit via
// user-roles.js — is authoritative and must never be reset here; this
// only ever touches lastLoginAt on an existing doc.
async function dgeEnsureUserProfile(user) {
  if (!dgeDb || !user) return null;
  const ref = dgeDb.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      displayName: user.displayName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: (window.AUTH_CONFIG && window.AUTH_CONFIG.defaultRole) || 'basic',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(profile);
    return profile;
  }
  await ref.update({ lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  return snap.data();
}

function dgeUpdateAccountUI() {
  const signedOutEl = document.getElementById('accountSignedOut');
  const signedInEl = document.getElementById('accountSignedIn');
  if (!signedOutEl || !signedInEl) return;

  if (window.dgeCurrentUser) {
    signedOutEl.style.display = 'none';
    signedInEl.style.display = 'block';
    const nameEl = document.getElementById('accountName');
    const roleEl = document.getElementById('accountRole');
    if (nameEl) nameEl.textContent = window.dgeCurrentUser.displayName || window.dgeCurrentUser.phoneNumber || window.dgeCurrentUser.email || 'Signed in';
    if (roleEl) roleEl.textContent = window.dgeCurrentUserRole || 'basic';
  } else {
    signedOutEl.style.display = 'block';
    signedInEl.style.display = 'none';
  }
}

window.openAccountModal = function() {
  dgeUpdateAccountUI();
  if (typeof openModal === 'function') openModal('accountModal');
};

window.dgeSignInWithGoogle = async function() {
  if (!dgeAuthReady()) { if (typeof showToast === 'function') showToast('Accounts are not set up yet on this deployment.'); return; }
  if (!dgeAuth) dgeInitFirebase();
  if (!dgeAuth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await dgeAuth.signInWithPopup(provider);
    // onAuthStateChanged below picks up the result — nothing else to do here.
  } catch (e) {
    console.error('[Auth] Google sign-in failed:', e);
    if (typeof showToast === 'function') showToast('Sign-in failed: ' + (e.message || e));
  }
};

window.dgeSignOut = async function() {
  if (!dgeAuth) return;
  try {
    await dgeAuth.signOut();
    if (typeof showToast === 'function') showToast('Signed out.');
  } catch (e) {
    console.error('[Auth] Sign-out failed:', e);
  }
};

// --- Phone OTP — Firebase-native path only ---------------------------
// Only reachable when enablePhoneAuth is true AND phoneOtpProvider is
// 'firebase'. The 'msg91' path (~5-6x cheaper for India — see
// AUTH_CONFIG's comment in config.js) has no client-side implementation
// here: it needs a Cloud Function to keep the MSG91 API key server-side,
// which needs real Firebase/MSG91 credentials to write and deploy
// against — see FIREBASE_SETUP.md for the exact shape that function
// needs. Selecting 'msg91' without one fails with a clear message below
// rather than silently doing nothing.

window.dgeSendPhoneOtp = async function(phoneNumberE164) {
  if (!dgeAuthReady() || !window.AUTH_CONFIG.enablePhoneAuth) {
    if (typeof showToast === 'function') showToast('Phone sign-in is not enabled on this deployment.');
    return false;
  }
  if (window.AUTH_CONFIG.phoneOtpProvider !== 'firebase') {
    if (typeof showToast === 'function') showToast(`This deployment is configured for the "${window.AUTH_CONFIG.phoneOtpProvider}" OTP provider, which isn't wired up yet — see FIREBASE_SETUP.md.`);
    return false;
  }
  if (!dgeAuth) dgeInitFirebase();
  if (!dgeAuth) return false;
  try {
    if (!dgeRecaptchaVerifier) {
      dgeRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', { size: 'invisible' });
    }
    dgeConfirmationResult = await dgeAuth.signInWithPhoneNumber(phoneNumberE164, dgeRecaptchaVerifier);
    return true;
  } catch (e) {
    console.error('[Auth] Sending OTP failed:', e);
    if (typeof showToast === 'function') showToast('Could not send code: ' + (e.message || e));
    return false;
  }
};

window.dgeConfirmPhoneOtp = async function(code) {
  if (!dgeConfirmationResult) {
    if (typeof showToast === 'function') showToast('Request a code first.');
    return false;
  }
  try {
    await dgeConfirmationResult.confirm(code);
    dgeConfirmationResult = null;
    return true;
  } catch (e) {
    console.error('[Auth] OTP confirmation failed:', e);
    if (typeof showToast === 'function') showToast('Incorrect or expired code.');
    return false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!dgeAuthReady()) return; // stays fully inert — no Account button, no network calls
  if (!dgeInitFirebase()) return;

  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) accountBtn.style.display = 'flex';

  if (window.AUTH_CONFIG.enablePhoneAuth) {
    const phoneSection = document.getElementById('phoneSignInSection');
    if (phoneSection) phoneSection.style.display = 'block';
  }

  dgeAuth.onAuthStateChanged(async (user) => {
    window.dgeCurrentUser = user;
    if (user) {
      const profile = await dgeEnsureUserProfile(user);
      window.dgeCurrentUserRole = profile ? profile.role : ((window.AUTH_CONFIG && window.AUTH_CONFIG.defaultRole) || 'basic');
    } else {
      window.dgeCurrentUserRole = null;
    }
    dgeUpdateAccountUI();
  });
});
