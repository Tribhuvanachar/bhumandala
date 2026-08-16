// dge/js/user-auth.js — Firebase-backed user accounts, roles & consent.
// See FIREBASE_SETUP.md for the console steps that have to happen outside
// this codebase first, and config.js's FIREBASE_CONFIG / AUTH_CONFIG for
// the switches this file reads.
//
// Deliberately inert whenever AUTH_CONFIG.enabled is false (the shipped
// default) — no Firebase network calls, no Account button shown, nothing
// in this file runs beyond the safety check at the bottom. Safe to ship
// on any deployment that hasn't gone through Firebase setup yet.
//
// Phone sign-in routes through one of three transports (see
// AUTH_CONFIG.phoneOtpProvider):
//   'firebase'  — Firebase's own SMS. No backend, ~$0.01/verification.
//   'whatsapp'  — WhatsApp Cloud API via our Cloud Functions, ~6x cheaper.
//   'msg91'     — India SMS gateway via the same Cloud Functions.
// The last two share one backend and one code path here; they differ only
// in which channel the Cloud Function hands the code to.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['user-auth.js'] = 'v2.0 (Google + phone OTP over SMS/WhatsApp/MSG91, WhatsApp consent)';

window.dgeCurrentUser = null;      // Firebase Auth user object, or null
window.dgeCurrentUserRole = null;  // resolved role string, or null
window.dgeCurrentUserProfile = null; // cached Firestore profile doc

let dgeAuth = null;
let dgeDb = null;
let dgeFunctions = null;
let dgeRecaptchaVerifier = null;   // firebase-SMS transport only
let dgeConfirmationResult = null;  // firebase-SMS transport only
let dgePendingPhone = null;        // whatsapp/msg91 transports

function dgeAuthReady() {
  return !!(window.AUTH_CONFIG && window.AUTH_CONFIG.enabled && typeof firebase !== 'undefined');
}

function dgeToast(msg) {
  if (typeof showToast === 'function') showToast(msg);
  else console.log('[Auth]', msg);
}

function dgeInitFirebase() {
  if (!dgeAuthReady() || dgeAuth) return dgeAuth;
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    dgeAuth = firebase.auth();
    dgeDb = firebase.firestore();
    // Callable functions are only needed by the whatsapp/msg91
    // transports; guarded so a deployment that didn't load the functions
    // SDK still gets working Google sign-in rather than a hard failure.
    if (typeof firebase.functions === 'function') {
      const region = (window.AUTH_CONFIG && window.AUTH_CONFIG.functionsRegion) || 'asia-south1';
      dgeFunctions = firebase.app().functions(region);
    }
  } catch (e) {
    console.error('[Auth] Firebase init failed — check FIREBASE_CONFIG in config.js:', e);
    return null;
  }
  return dgeAuth;
}

/**
 * Which transport should carry the OTP. Split out from the send/verify
 * functions so the routing itself is testable without a Firebase SDK.
 */
window.dgeOtpTransportFor = function(providerId) {
  if (providerId === 'firebase') return 'firebase';
  if (providerId === 'whatsapp' || providerId === 'msg91') return 'functions';
  return null;
};

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
      // Must be 'basic' — the security rules reject a profile created
      // with any other role, which is what stops anyone handing
      // themselves elevated access on first sign-in.
      role: 'basic',
      // Signing in is not consent to be messaged on WhatsApp. This stays
      // false until the person explicitly ticks the box; the rules
      // reject a create that tries to set it true.
      whatsappOptIn: false,
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

    // WhatsApp consent row — only meaningful once we have a number to
    // message, so it stays hidden for an email-only account.
    const waRow = document.getElementById('whatsappOptInRow');
    const waBox = document.getElementById('whatsappOptInCheckbox');
    const hasPhone = !!(window.dgeCurrentUserProfile && window.dgeCurrentUserProfile.phoneNumber);
    if (waRow) waRow.style.display = (hasPhone && window.AUTH_CONFIG.enableWhatsappBroadcasts) ? 'flex' : 'none';
    if (waBox) waBox.checked = !!(window.dgeCurrentUserProfile && window.dgeCurrentUserProfile.whatsappOptIn);
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
  if (!dgeAuthReady()) { dgeToast('Accounts are not set up yet on this deployment.'); return; }
  if (!dgeAuth) dgeInitFirebase();
  if (!dgeAuth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await dgeAuth.signInWithPopup(provider);
    // onAuthStateChanged below picks up the result — nothing else to do here.
  } catch (e) {
    console.error('[Auth] Google sign-in failed:', e);
    // A popup the user themselves dismissed is not an error worth
    // shouting about.
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    dgeToast('Sign-in failed: ' + (e.message || e));
  }
};

window.dgeSignOut = async function() {
  if (!dgeAuth) return;
  try {
    await dgeAuth.signOut();
    window.dgeCurrentUserProfile = null;
    dgeToast('Signed out.');
  } catch (e) {
    console.error('[Auth] Sign-out failed:', e);
  }
};

// --- Phone OTP -------------------------------------------------------

window.dgeSendPhoneOtp = async function(phoneNumberE164) {
  if (!dgeAuthReady() || !window.AUTH_CONFIG.enablePhoneAuth) {
    dgeToast('Phone sign-in is not enabled on this deployment.');
    return false;
  }
  if (!dgeAuth) dgeInitFirebase();
  if (!dgeAuth) return false;

  const providerId = window.AUTH_CONFIG.phoneOtpProvider;
  const transport = window.dgeOtpTransportFor(providerId);
  if (!transport) {
    dgeToast(`Unknown OTP provider "${providerId}" — check AUTH_CONFIG in config.js.`);
    return false;
  }

  if (transport === 'firebase') return dgeSendOtpViaFirebase(phoneNumberE164);
  return dgeSendOtpViaFunctions(phoneNumberE164);
};

async function dgeSendOtpViaFirebase(phoneNumberE164) {
  try {
    if (!dgeRecaptchaVerifier) {
      dgeRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', { size: 'invisible' });
    }
    dgeConfirmationResult = await dgeAuth.signInWithPhoneNumber(phoneNumberE164, dgeRecaptchaVerifier);
    return true;
  } catch (e) {
    console.error('[Auth] Sending OTP failed:', e);
    dgeToast('Could not send code: ' + (e.message || e));
    // A spent reCAPTCHA cannot be reused; drop it so the next attempt
    // builds a fresh one instead of failing identically forever.
    dgeRecaptchaVerifier = null;
    return false;
  }
}

async function dgeSendOtpViaFunctions(phoneNumberE164) {
  if (!dgeFunctions) {
    dgeToast('Messaging backend is unavailable — the Cloud Functions SDK did not load.');
    return false;
  }
  try {
    const call = dgeFunctions.httpsCallable('sendOtp');
    await call({ phone: phoneNumberE164 });
    // Remembered so verify doesn't depend on the input field still
    // holding the same text the code was actually sent to.
    dgePendingPhone = phoneNumberE164;
    return true;
  } catch (e) {
    console.error('[Auth] Sending OTP failed:', e);
    // Callable errors carry the server's message; it is written to be
    // shown to a person (cooldown seconds, "try again in N minutes").
    dgeToast(e.message || 'Could not send the code.');
    return false;
  }
}

window.dgeConfirmPhoneOtp = async function(code) {
  const providerId = window.AUTH_CONFIG && window.AUTH_CONFIG.phoneOtpProvider;
  const transport = window.dgeOtpTransportFor(providerId);

  if (transport === 'firebase') {
    if (!dgeConfirmationResult) { dgeToast('Request a code first.'); return false; }
    try {
      await dgeConfirmationResult.confirm(code);
      dgeConfirmationResult = null;
      return true;
    } catch (e) {
      console.error('[Auth] OTP confirmation failed:', e);
      dgeToast('Incorrect or expired code.');
      return false;
    }
  }

  if (!dgePendingPhone) { dgeToast('Request a code first.'); return false; }
  if (!dgeFunctions) { dgeToast('Messaging backend is unavailable.'); return false; }
  try {
    const call = dgeFunctions.httpsCallable('verifyOtp');
    const res = await call({ phone: dgePendingPhone, code });
    const token = res && res.data && res.data.token;
    if (!token) { dgeToast('Verification failed.'); return false; }
    // The custom token is what actually signs the person in — the Cloud
    // Function minted it only after checking the code server-side.
    await dgeAuth.signInWithCustomToken(token);
    dgePendingPhone = null;
    return true;
  } catch (e) {
    console.error('[Auth] OTP confirmation failed:', e);
    dgeToast(e.message || 'Incorrect or expired code.');
    return false;
  }
};

// --- WhatsApp broadcast consent --------------------------------------
// Recorded as a deliberate act by the person themselves. WhatsApp policy
// requires opt-in collected outside WhatsApp, and this checkbox — plus
// the whatsappOptInAt timestamp — is the record of it.
window.dgeSetWhatsappOptIn = async function(optIn) {
  if (!window.dgeCurrentUser || !dgeDb) { dgeToast('Sign in first.'); return false; }
  try {
    const patch = { whatsappOptIn: !!optIn };
    if (optIn) patch.whatsappOptInAt = firebase.firestore.FieldValue.serverTimestamp();
    await dgeDb.collection('users').doc(window.dgeCurrentUser.uid).update(patch);
    if (window.dgeCurrentUserProfile) window.dgeCurrentUserProfile.whatsappOptIn = !!optIn;
    dgeToast(optIn ? 'Subscribed to WhatsApp updates.' : 'Unsubscribed from WhatsApp updates.');
    return true;
  } catch (e) {
    console.error('[Auth] Consent update failed:', e);
    dgeToast('Could not save that preference.');
    // Re-sync the checkbox with what is actually stored, so the UI never
    // claims a preference the database rejected.
    dgeUpdateAccountUI();
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

    // Only Firebase's own SMS transport needs the reCAPTCHA widget; the
    // Cloud-Function transports are protected server-side by the rate
    // limits in otp-core.js instead.
    const recaptcha = document.getElementById('recaptchaContainer');
    if (recaptcha && window.AUTH_CONFIG.phoneOtpProvider !== 'firebase') recaptcha.style.display = 'none';

    const label = document.getElementById('phoneOtpChannelLabel');
    if (label) {
      label.textContent = window.AUTH_CONFIG.phoneOtpProvider === 'whatsapp'
        ? 'We will send a code to your WhatsApp.'
        : 'We will send a code by SMS.';
    }
  }

  dgeAuth.onAuthStateChanged(async (user) => {
    window.dgeCurrentUser = user;
    if (user) {
      const profile = await dgeEnsureUserProfile(user);
      window.dgeCurrentUserProfile = profile;
      window.dgeCurrentUserRole = profile ? profile.role : 'basic';
    } else {
      window.dgeCurrentUserRole = null;
      window.dgeCurrentUserProfile = null;
    }
    dgeUpdateAccountUI();
  });
});
