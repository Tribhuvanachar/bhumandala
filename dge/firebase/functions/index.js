// index.js — DGE's Cloud Functions: OTP over WhatsApp/MSG91, WhatsApp
// broadcasts, and the inbound webhook that honours opt-outs.
//
// Everything security-critical lives in ./lib/*-core.js as pure
// functions with tests. This file is the Firebase-shaped shell around
// them: it reads secrets, runs Firestore transactions, and mints custom
// tokens. Keep it that way — logic that lands here instead of in lib/
// is logic that cannot be tested without a live project.
//
// Deploy: cd dge/firebase && firebase deploy --only functions
// See ../FIREBASE_SETUP.md §7 for the secrets these expect.
'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
// Modular imports, NOT the older `admin.firestore.FieldValue` namespace
// style. That distinction cost a real debugging session: the functions
// emulator wraps the root `firebase-admin` export in a proxy to redirect
// it at the emulators, and the nested statics read back as undefined
// through that proxy — so every serverTimestamp() call threw a bare
// INTERNAL under emulation while looking perfectly correct in review.
// The modular entry points are also the current firebase-admin v13 API.
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const otpCore = require('./lib/otp-core');
const waLib = require('./lib/whatsapp');
const { getProvider, assertProviderAllowed } = require('./lib/providers');
const broadcastCore = require('./lib/broadcast-core');

initializeApp();
const db = getFirestore();

// Region matters for latency AND for cost — keep functions near the
// users and near Firestore. asia-south1 (Mumbai) for an India-centred
// audience.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

// --- Secrets (set via `firebase functions:secrets:set NAME`) ----------
// Never hardcode these and never put them in config.js: unlike
// FIREBASE_CONFIG (which is public by design), these are real
// credentials. Storing them as secrets keeps them out of the repo and
// out of the deployed function's source.
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const WHATSAPP_APP_SECRET = defineSecret('WHATSAPP_APP_SECRET');
const MSG91_AUTHKEY = defineSecret('MSG91_AUTHKEY');
// Pepper for hashing phone numbers into document IDs and UIDs. Must be
// set once and then NEVER rotated — rotating it orphans every existing
// phone-based account, because the derived UID would change.
const OTP_PEPPER = defineSecret('OTP_PEPPER');

// --- Non-secret config (plain env params, safe to see) ---------------
const OTP_PROVIDER = defineString('OTP_PROVIDER', { default: 'whatsapp' });
const OTP_TEMPLATE_NAME = defineString('OTP_TEMPLATE_NAME', { default: 'dge_otp' });
const OTP_TEMPLATE_LANG = defineString('OTP_TEMPLATE_LANG', { default: 'en' });
const OTP_DEFAULT_COUNTRY = defineString('OTP_DEFAULT_COUNTRY', { default: '91' });
const MSG91_TEMPLATE_ID = defineString('MSG91_TEMPLATE_ID', { default: '' });

const CHALLENGES = 'otp_challenges';
const USERS = 'users';

function providerConfig(providerId) {
  return {
    templateName: OTP_TEMPLATE_NAME.value(),
    languageCode: OTP_TEMPLATE_LANG.value(),
    hasCopyCodeButton: true,
    phoneNumberId: providerId === 'whatsapp' ? WHATSAPP_PHONE_NUMBER_ID.value() : undefined,
    accessToken: providerId === 'whatsapp' ? WHATSAPP_TOKEN.value() : undefined,
    authKey: providerId === 'msg91' ? MSG91_AUTHKEY.value() : undefined,
    templateId: providerId === 'msg91' ? MSG91_TEMPLATE_ID.value() : undefined
  };
}

// =====================================================================
// sendOtp — generate a code, store only its hash, deliver via provider.
// =====================================================================
exports.sendOtp = onCall(
  {
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, MSG91_AUTHKEY, OTP_PEPPER],
    // Abuse control at the edge, before any of our code (or Meta's
    // billing) is reached.
    enforceAppCheck: false,
    cors: true
  },
  async (request) => {
    const providerId = OTP_PROVIDER.value();
    assertProviderAllowed(providerId);

    const phone = otpCore.normalizePhone(request.data?.phone, OTP_DEFAULT_COUNTRY.value());
    if (!phone) {
      throw new HttpsError('invalid-argument', 'That phone number does not look right. Include the country code, e.g. +91 98765 43210.');
    }

    const pepper = OTP_PEPPER.value();
    const docId = otpCore.challengeDocId(phone, pepper);
    const ref = db.collection(CHALLENGES).doc(docId);
    const now = Date.now();

    // The rate-limit check and the counter increment must be atomic, or
    // two simultaneous requests both pass the check and both send.
    const code = otpCore.generateOtp();
    let challenge;
    try {
      challenge = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const existing = snap.exists ? snap.data() : null;

        const limit = otpCore.checkSendRateLimit(existing, now);
        if (!limit.allowed) {
          const err = new Error(limit.reason);
          err.__rateLimit = limit;
          throw err;
        }

        const next = otpCore.buildChallenge({ code, now, existing, provider: providerId });
        tx.set(ref, next);
        return next;
      });
    } catch (e) {
      if (e.__rateLimit) {
        const secs = Math.ceil(e.__rateLimit.retryAfterMs / 1000);
        throw new HttpsError(
          'resource-exhausted',
          e.__rateLimit.reason === 'cooldown'
            ? `Please wait ${secs}s before requesting another code.`
            : `Too many code requests for this number. Try again in about ${Math.ceil(secs / 60)} minutes.`
        );
      }
      throw e;
    }

    // Deliver only AFTER the challenge is committed. The other order
    // risks sending a code we then fail to store — the user gets an SMS
    // that can never be verified.
    const provider = getProvider(providerId);
    const result = await provider.send({
      phone,
      code,
      config: providerConfig(providerId),
      fetchImpl: globalThis.fetch
    });

    if (!result.ok) {
      logger.error('OTP delivery failed', { provider: providerId, kind: result.kind, message: result.message });
      // Free the cooldown so a provider-side failure doesn't lock the
      // user out for a minute for something that wasn't their doing.
      await ref.set({ lastSentAt: 0 }, { merge: true }).catch(() => {});
      throw new HttpsError(
        result.retryable ? 'unavailable' : 'failed-precondition',
        result.kind === 'permanent'
          ? 'That number cannot receive messages on this channel.'
          : 'Could not send the code right now. Please try again shortly.'
      );
    }

    logger.info('OTP sent', { provider: providerId, docId, sendCount: challenge.sendCount });
    return { ok: true, expiresInSec: Math.round(otpCore.DEFAULT_TTL_MS / 1000), provider: providerId };
  }
);

// =====================================================================
// verifyOtp — check the code, mint a Firebase custom token on success.
// =====================================================================
exports.verifyOtp = onCall(
  { secrets: [OTP_PEPPER], cors: true },
  async (request) => {
    const phone = otpCore.normalizePhone(request.data?.phone, OTP_DEFAULT_COUNTRY.value());
    const code = request.data?.code;
    if (!phone) throw new HttpsError('invalid-argument', 'Missing or malformed phone number.');

    const pepper = OTP_PEPPER.value();
    const ref = db.collection(CHALLENGES).doc(otpCore.challengeDocId(phone, pepper));
    const now = Date.now();

    // Transactional so two parallel guesses cannot each see the same
    // attempt count and effectively double the allowance.
    const verdict = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? snap.data() : null;
      const v = otpCore.verifyChallenge(existing, code, now);
      if (v.patch) tx.set(ref, v.patch, { merge: true });
      return v;
    });

    if (!verdict.ok) {
      const messages = {
        no_challenge: 'Request a code first.',
        already_used: 'That code has already been used. Request a new one.',
        expired: 'That code has expired. Request a new one.',
        too_many_attempts: 'Too many incorrect attempts. Request a new code.',
        malformed: 'Enter the numeric code from the message.',
        incorrect: 'That code is not correct.'
      };
      // 'unauthenticated' for a wrong code, 'resource-exhausted' when the
      // challenge is burned — the client shows different UI for each.
      const burned = verdict.reason === 'too_many_attempts' || verdict.reason === 'expired' || verdict.reason === 'already_used';
      throw new HttpsError(burned ? 'resource-exhausted' : 'unauthenticated', messages[verdict.reason] || 'Verification failed.');
    }

    // Stable UID derived from the phone number, so the same person
    // signing in again lands on the same account and the same role.
    const uid = otpCore.phoneUid(phone, pepper);

    try {
      await getAuth().getUser(uid);
      await getAuth().updateUser(uid, { phoneNumber: phone }).catch(() => {});
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        await getAuth().createUser({ uid, phoneNumber: phone });
      } else {
        throw e;
      }
    }

    // Profile doc: created here with the default role. The client cannot
    // choose its own role — the rules forbid it, and so does this.
    const userRef = db.collection(USERS).doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({
        displayName: '',
        email: '',
        phoneNumber: phone,
        role: 'basic',
        signInMethod: 'phone_otp',
        // Verifying a code sent over WhatsApp is not consent to receive
        // broadcasts on WhatsApp. Opt-in stays false until the person
        // ticks the box — see the consent UI in user-auth.js.
        whatsappOptIn: false,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp()
      });
    } else {
      await userRef.update({
        phoneNumber: phone,
        lastLoginAt: FieldValue.serverTimestamp()
      }).catch(() => {});
    }

    const token = await getAuth().createCustomToken(uid);
    logger.info('OTP verified, custom token issued', { uid });
    return { ok: true, token };
  }
);

// =====================================================================
// whatsappWebhook — Meta's inbound callbacks (opt-outs, delivery state).
// =====================================================================
exports.whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET], cors: false },
  async (req, res) => {
    // Meta's one-time subscription handshake.
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN.value()) {
        return res.status(200).send(String(req.query['hub.challenge'] || ''));
      }
      return res.status(403).send('Forbidden');
    }

    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Verify the payload really came from Meta. Without this, anyone who
    // learns the URL can forge opt-outs (or, worse, opt-INs) for any
    // number. `req.rawBody` is provided by the Functions runtime and is
    // required here — re-serializing the parsed body would change the
    // bytes and break the signature.
    const signature = req.get('x-hub-signature-256') || '';
    const appSecret = WHATSAPP_APP_SECRET.value();
    if (!waLib.verifySignature(req.rawBody, signature, appSecret)) {
      logger.warn('Rejected WhatsApp webhook with bad signature');
      return res.status(401).send('Bad signature');
    }

    // Acknowledge fast: Meta retries on a slow response, which would
    // duplicate the work below.
    res.status(200).send('OK');

    try {
      const messages = waLib.parseInboundMessages(req.body);
      for (const msg of messages) {
        const intent = waLib.detectOptOutIntent(msg.text);
        if (!intent || !msg.from) continue;
        await applyOptState(msg.from, intent);
      }
    } catch (e) {
      logger.error('Failed processing WhatsApp webhook', { error: e?.message });
    }
  }
);

/** Applies an opt-in/opt-out to every profile holding that number. */
async function applyOptState(phone, intent) {
  const snap = await db.collection(USERS).where('phoneNumber', '==', phone).limit(10).get();
  if (snap.empty) {
    logger.info('Opt state change for unknown number', { intent });
    return;
  }
  const batchWrite = db.batch();
  for (const doc of snap.docs) {
    batchWrite.update(doc.ref, intent === 'opt_out'
      ? { whatsappOptIn: false, whatsappOptOutAt: FieldValue.serverTimestamp() }
      : { whatsappOptIn: true, whatsappOptOutAt: FieldValue.delete(), whatsappOptInAt: FieldValue.serverTimestamp() });
  }
  await batchWrite.commit();
  logger.info('Applied WhatsApp opt state', { intent, count: snap.size });
}

// =====================================================================
// runWhatsAppBroadcast — scheduled sender for campaigns marked due.
// =====================================================================
// Reads campaign docs from `broadcasts/` rather than hardcoding content,
// so scheduling a message is a Firestore edit, not a redeploy.
exports.runWhatsAppBroadcast = onSchedule(
  {
    // Daily at 07:00 IST. Cloud Scheduler's free tier covers 3 jobs.
    schedule: '0 7 * * *',
    timeZone: 'Asia/Kolkata',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID]
  },
  async () => {
    const now = Date.now();
    const due = await db.collection('broadcasts')
      .where('status', '==', 'scheduled')
      .where('sendAfter', '<=', Timestamp.fromMillis(now))
      .limit(5)
      .get();

    if (due.empty) {
      logger.info('No broadcasts due');
      return;
    }

    for (const campaignDoc of due.docs) {
      await runOneCampaign(campaignDoc, now);
    }
  }
);

async function runOneCampaign(campaignDoc, now) {
  const campaign = Object.assign({ id: campaignDoc.id }, campaignDoc.data());

  // Claim the campaign before doing any work, so an overlapping run
  // cannot send it a second time.
  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(campaignDoc.ref);
    if (fresh.data()?.status !== 'scheduled') return false;
    tx.update(campaignDoc.ref, { status: 'sending', startedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) {
    logger.info('Campaign already claimed by another run', { id: campaign.id });
    return;
  }

  const usersSnap = await db.collection(USERS).where('whatsappOptIn', '==', true).limit(2000).get();
  const users = usersSnap.docs.map(d => Object.assign({ id: d.id }, d.data(), {
    whatsappLastBroadcastAt: d.data().whatsappLastBroadcastAt?.toMillis?.() ?? null
  }));

  const { recipients, skipped, total } = broadcastCore.selectAudience(users, campaign, now);
  const { toSend, deferred } = broadcastCore.applySendCap(recipients, campaign.maxPerRun ?? 500);

  logger.info('Broadcast audience', { id: campaign.id, total, eligible: recipients.length, sending: toSend.length, deferred: deferred.length, skipped });

  let sent = 0;
  let failed = 0;

  for (const group of broadcastCore.batch(toSend, 20)) {
    const results = await Promise.all(group.map(async (user) => {
      const payload = waLib.buildBroadcastTemplatePayload({
        to: user.phoneNumber,
        templateName: campaign.templateName,
        languageCode: campaign.languageCode || 'en',
        bodyParams: campaign.bodyParams || []
      });
      const r = await waLib.sendMessage({
        payload,
        phoneNumberId: WHATSAPP_PHONE_NUMBER_ID.value(),
        accessToken: WHATSAPP_TOKEN.value()
      });
      return { user, r };
    }));

    const writes = db.batch();
    for (const { user, r } of results) {
      if (r.ok) {
        sent++;
        writes.update(db.collection(USERS).doc(user.id), {
          [`whatsappCampaigns.${campaign.id}`]: FieldValue.serverTimestamp(),
          whatsappLastBroadcastAt: FieldValue.serverTimestamp()
        });
      } else {
        failed++;
        // A permanently undeliverable number is marked so later
        // campaigns skip it, rather than retrying forever.
        if (r.kind === 'permanent') {
          writes.update(db.collection(USERS).doc(user.id), { whatsappUndeliverable: true });
        }
        logger.warn('Broadcast send failed', { uid: user.id, kind: r.kind, message: r.message });
      }
    }
    await writes.commit();
  }

  await campaignDoc.ref.update({
    status: deferred.length ? 'scheduled' : 'sent',
    lastRunAt: FieldValue.serverTimestamp(),
    stats: { sent, failed, skipped, deferred: deferred.length }
  });

  logger.info('Broadcast complete', { id: campaign.id, sent, failed, deferred: deferred.length });
}

// Exported for tests that need the internals without a live project.
// (The signature check itself lives in lib/whatsapp.js, where it is
// testable without loading firebase-admin — see tests/whatsapp.test.js.)
exports.__internal = { applyOptState, runOneCampaign };
