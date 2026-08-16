// Firestore security-rules tests — run against the REAL Firestore
// emulator, not a stub. These are the tests that matter most in this
// directory: the rules are the actual enforcement layer, and every
// client-side check in this app is bypassable by anyone willing to open
// a console and call Firestore directly.
//
// Run with:  npm run test:rules
// (which starts the emulator, runs this file, and shuts it down)
//
// Named .spec.js rather than .test.js on purpose: node's default test
// glob does NOT pick up this suffix, so a plain `npm test` runs the
// credential-free unit tests and leaves this one to the script that
// knows how to start an emulator for it. Running this file directly,
// without an emulator on 127.0.0.1:8080, will hang and then fail.
//
// Most of what follows asserts that something FAILS. A rules test suite
// that only checks the happy path would pass just as happily against
// `allow read, write: if true`.
'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

let testEnv;

const UID_BASIC = 'user_basic';
const UID_OTHER = 'user_other';
const UID_ADMIN = 'user_admin';
const UID_SUPER = 'user_super';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'dge-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080
    }
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed the four profiles the rules read to resolve caller roles.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`users/${UID_BASIC}`).set({ displayName: 'Basic', email: 'b@x.com', role: 'basic', whatsappOptIn: false });
    await db.doc(`users/${UID_OTHER}`).set({ displayName: 'Other', email: 'o@x.com', phoneNumber: '+919999999999', role: 'basic', whatsappOptIn: false });
    await db.doc(`users/${UID_ADMIN}`).set({ displayName: 'Admin', email: 'a@x.com', role: 'admin', whatsappOptIn: false });
    await db.doc(`users/${UID_SUPER}`).set({ displayName: 'Super', email: 's@x.com', role: 'superadmin', whatsappOptIn: false });
    await db.doc('otp_challenges/somehash').set({ codeHash: 'deadbeef', attempts: 0, expiresAt: Date.now() + 60000 });
    await db.doc('broadcasts/c1').set({ templateName: 'daily_shloka', status: 'scheduled' });
  });
});

const asUser = (uid) => testEnv.authenticatedContext(uid).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe('users — read access', () => {
  test('a signed-out visitor can read nothing', async () => {
    await assertFails(asAnon().doc(`users/${UID_BASIC}`).get());
  });

  test('a user can read their own profile', async () => {
    await assertSucceeds(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).get());
  });

  test("a user CANNOT read someone else's profile", async () => {
    // Profiles hold phone numbers and emails. Before this rule, any
    // signed-in account could read the entire user base's contact
    // details — the whole point of tightening it.
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_OTHER}`).get());
  });

  test('a user cannot list the whole users collection', async () => {
    await assertFails(asUser(UID_BASIC).collection('users').get());
  });

  test('an admin can read any profile (Manage Users)', async () => {
    await assertSucceeds(asUser(UID_ADMIN).doc(`users/${UID_OTHER}`).get());
  });

  test('an admin can LIST users — the Manage Users query itself', async () => {
    // Distinct from reading one document: Firestore evaluates a list
    // against the rule for every matched doc, so tightening the read
    // rule could have silently broken this screen. This is the exact
    // query user-roles.js runs.
    await assertSucceeds(
      asUser(UID_ADMIN).collection('users').orderBy('lastLoginAt', 'desc').limit(200).get()
    );
    await assertSucceeds(asUser(UID_SUPER).collection('users').get());
  });

  test('a superadmin can read any profile', async () => {
    await assertSucceeds(asUser(UID_SUPER).doc(`users/${UID_OTHER}`).get());
  });
});

describe('users — creating your own profile', () => {
  const NEW_UID = 'brand_new_user';

  test('a new user may create their own profile with the default role', async () => {
    await assertSucceeds(asUser(NEW_UID).doc(`users/${NEW_UID}`).set({
      displayName: 'New', email: 'n@x.com', role: 'basic', whatsappOptIn: false
    }));
  });

  test('a new user may NOT hand themselves superadmin on the way in', async () => {
    // The privilege-escalation case. Sign-in is the one moment a client
    // writes its own profile, so it is the one moment this must hold.
    for (const role of ['superadmin', 'admin', 'sponsor', 'subscriber', 'special']) {
      await assertFails(asUser(NEW_UID).doc(`users/${NEW_UID}`).set({
        displayName: 'New', email: 'n@x.com', role, whatsappOptIn: false
      }), `creating a profile with role "${role}" must be rejected`);
    }
  });

  test('a user may not create a profile under someone else\'s uid', async () => {
    await assertFails(asUser(UID_BASIC).doc('users/victim_uid').set({ role: 'basic' }));
  });

  test('a signed-out visitor may not create a profile', async () => {
    await assertFails(asAnon().doc('users/anon_uid').set({ role: 'basic' }));
  });

  test('a new profile may not arrive with WhatsApp consent pre-set', async () => {
    // Consent is an explicit later action, never assumed at sign-up —
    // WhatsApp policy requires opt-in collected as a deliberate act.
    await assertFails(asUser(NEW_UID).doc(`users/${NEW_UID}`).set({
      displayName: 'New', role: 'basic', whatsappOptIn: true
    }));
  });

  test('a new profile may omit the consent field entirely', async () => {
    await assertSucceeds(asUser(NEW_UID).doc(`users/${NEW_UID}`).set({
      displayName: 'New', role: 'basic'
    }));
  });
});

describe('users — updating your own profile', () => {
  test('a user may edit their own display name', async () => {
    await assertSucceeds(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ displayName: 'Renamed' }));
  });

  test('a user may grant and withdraw WhatsApp consent', async () => {
    await assertSucceeds(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappOptIn: true }));
    await assertSucceeds(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappOptIn: false }));
  });

  test('a user may NOT promote themselves', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ role: 'superadmin' }));
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ role: 'admin' }));
  });

  test('an admin may not promote themselves to superadmin', async () => {
    // An admin is still the owner of their own doc, so the self-update
    // rule applies to them exactly as it does to anyone else.
    await assertFails(asUser(UID_ADMIN).doc(`users/${UID_ADMIN}`).update({ role: 'superadmin' }));
  });

  test('a superadmin may not change their OWN role either', async () => {
    // Not a security boundary so much as a footgun guard: the only way
    // to lose the last superadmin is for one to demote themselves.
    await assertFails(asUser(UID_SUPER).doc(`users/${UID_SUPER}`).update({ role: 'basic' }));
  });

  test('a user may NOT rewrite the record of campaigns already sent', async () => {
    // Client-writable, this would let someone clear the dedupe record
    // and re-trigger paid broadcast messages to themselves.
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappCampaigns: {} }));
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ 'whatsappCampaigns.c1': null }));
  });

  test('a user may NOT clear their own undeliverable flag', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappUndeliverable: false }));
  });

  test('a user may NOT erase an opt-out recorded by the STOP webhook', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappOptOutAt: null }));
  });

  test('a user may NOT forge their broadcast frequency-cap timestamp', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({ whatsappLastBroadcastAt: 0 }));
  });

  test('an allowed field mixed with a forbidden one is rejected as a whole', async () => {
    // Rules evaluate the write, not each field, so a permitted change
    // cannot be used to smuggle a forbidden one alongside it.
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).update({
      displayName: 'Fine', whatsappUndeliverable: false
    }));
  });

  test("a user may not edit someone else's profile", async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_OTHER}`).update({ displayName: 'Hacked' }));
  });
});

describe('users — role management by admins', () => {
  test('a superadmin may change another user\'s role', async () => {
    await assertSucceeds(asUser(UID_SUPER).doc(`users/${UID_BASIC}`).update({ role: 'sponsor' }));
  });

  test('a plain admin may NOT change roles', async () => {
    // Reading the user list and rewriting it are deliberately different
    // privileges.
    await assertFails(asUser(UID_ADMIN).doc(`users/${UID_BASIC}`).update({ role: 'sponsor' }));
  });

  test('a basic user may not change anyone\'s role', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_OTHER}`).update({ role: 'admin' }));
  });

  test('a signed-out visitor may not change roles', async () => {
    await assertFails(asAnon().doc(`users/${UID_BASIC}`).update({ role: 'admin' }));
  });
});

describe('users — deletes', () => {
  test('nobody may delete a profile, not even a superadmin', async () => {
    await assertFails(asUser(UID_BASIC).doc(`users/${UID_BASIC}`).delete());
    await assertFails(asUser(UID_SUPER).doc(`users/${UID_BASIC}`).delete());
    await assertFails(asAnon().doc(`users/${UID_BASIC}`).delete());
  });
});

describe('otp_challenges — sealed from every client', () => {
  // Only the Admin SDK inside Cloud Functions touches this collection.
  // A client that could read it could time a brute force against the
  // attempt counter; one that could write it could reset that counter
  // and guess forever.
  test('a signed-out visitor can neither read nor write', async () => {
    await assertFails(asAnon().doc('otp_challenges/somehash').get());
    await assertFails(asAnon().doc('otp_challenges/somehash').set({ attempts: 0 }));
  });

  test('a signed-in user can neither read nor write', async () => {
    await assertFails(asUser(UID_BASIC).doc('otp_challenges/somehash').get());
    await assertFails(asUser(UID_BASIC).doc('otp_challenges/somehash').set({ attempts: 0 }));
  });

  test('even a superadmin cannot read or reset a challenge', async () => {
    await assertFails(asUser(UID_SUPER).doc('otp_challenges/somehash').get());
    await assertFails(asUser(UID_SUPER).doc('otp_challenges/somehash').update({ attempts: 0 }));
  });

  test('nobody can list the collection', async () => {
    await assertFails(asUser(UID_SUPER).collection('otp_challenges').get());
  });
});

describe('broadcasts — admin-only operational data', () => {
  test('a basic user cannot read campaigns', async () => {
    await assertFails(asUser(UID_BASIC).doc('broadcasts/c1').get());
  });

  test('a signed-out visitor cannot read campaigns', async () => {
    await assertFails(asAnon().doc('broadcasts/c1').get());
  });

  test('an admin can read campaigns', async () => {
    await assertSucceeds(asUser(UID_ADMIN).doc('broadcasts/c1').get());
  });

  test('an admin cannot schedule a campaign', async () => {
    // Reading the schedule and spending money on it are different
    // privileges.
    await assertFails(asUser(UID_ADMIN).doc('broadcasts/c2').set({ templateName: 't', status: 'scheduled' }));
  });

  test('a superadmin can create, update and delete campaigns', async () => {
    await assertSucceeds(asUser(UID_SUPER).doc('broadcasts/c2').set({ templateName: 't', status: 'scheduled' }));
    await assertSucceeds(asUser(UID_SUPER).doc('broadcasts/c2').update({ status: 'paused' }));
    await assertSucceeds(asUser(UID_SUPER).doc('broadcasts/c2').delete());
  });

  test('a basic user cannot create a campaign', async () => {
    await assertFails(asUser(UID_BASIC).doc('broadcasts/c3').set({ templateName: 't' }));
  });
});

describe('unlisted collections are denied by default', () => {
  test('an arbitrary collection is closed to everyone', async () => {
    await assertFails(asUser(UID_SUPER).doc('random_stuff/x').set({ a: 1 }));
    await assertFails(asUser(UID_BASIC).doc('random_stuff/x').get());
    await assertFails(asAnon().doc('random_stuff/x').get());
  });
});
