# DGE Accounts, OTP & WhatsApp — Firebase Setup

_Originally written 10 Aug 2026 (Google Sign-In + Firebase phone OTP,
untested). Substantially revised 16 Aug 2026: added WhatsApp OTP and
broadcasts, tightened the security rules, and — for the first time —
tests. 219 of them now run without a Firebase project, credentials, or
money. See §10 for what still cannot be tested without live accounts._

## 1. What this is

User accounts, per-person roles (basic / subscriber / sponsor / admin /
superadmin / special), phone verification over three interchangeable
channels, and opt-in WhatsApp broadcasts — backed by Firebase. This is
the only backend DGE has; everything else remains a static site.

**It is OFF by default.** `AUTH_CONFIG.enabled` in `config.js` is `false`
out of the box — no Account button, no Firebase network calls, nothing
changes until you do the steps below AND flip that to `true`. There is a
test asserting exactly that, so it stays true.

Files involved, all deliberately isolated so a deployment that doesn't
want any of this can ignore them:

```
dge/js/user-auth.js          browser: sign-in, OTP, consent
dge/js/user-roles.js         browser: superadmin "Manage Users" screen
dge/js/config.js             FIREBASE_CONFIG + AUTH_CONFIG switches
dge/firebase/firestore.rules the real enforcement layer
dge/firebase/firebase.json   project config (emulators, hosting, functions)
dge/firebase/functions/      Cloud Functions: OTP, broadcasts, webhook
dge/firebase/tests/          219 tests — see tests/README.md
```

## 2. Cost — read this before enabling anything

**The pricing figures in the original brief for this work were wrong in
two places, both in the expensive direction.** Corrected here, with the
caveat that you should confirm current rates in your own console before
committing budget — these move.

| Thing | Reality (Aug 2026) |
|---|---|
| Google Sign-In | **Free**, any volume, no billing plan needed. |
| Firestore | Free tier: 50k reads / 20k writes per day, 1 GB. A profile doc is a few hundred bytes; 100k users is a few MB. |
| Firebase SMS OTP | **~$0.01 (~₹0.85) per verification in India.** Requires the Blaze plan. |
| WhatsApp auth template | **~₹0.145 (~$0.0017) per message in India** — roughly **6x cheaper than SMS**. |
| MSG91 SMS | ~₹0.15, comparable to WhatsApp; reaches non-WhatsApp users. |
| Cloud Functions | Free tier: 2M invocations/month. Requires Blaze. |
| Cloud Scheduler | 3 free jobs. This project uses 1. |
| Firebase Hosting | Free tier: 10 GB storage, 10 GB/month transfer, free SSL. |

Two corrections worth stating plainly, because they change decisions:

- **"Firebase Phone Auth is free for 10,000 SMS/month" is not true.** The
  free allowance is roughly **10 SMS per day** (~300/month), and phone
  auth requires Blaze regardless. Assume you pay from the first real
  user. At 100,000 verifications that is roughly **$1,000**.
- **"WhatsApp is free for the first 1,000 conversations/month" no longer
  applies to OTPs.** Since Meta's move to per-message pricing, *service*
  messages (user-initiated, inside the 24-hour window) are free, but
  **authentication, utility and marketing templates are billed per
  message**. An OTP is an authentication template — always paid. The good
  news is that it is still ~6x cheaper than SMS: the same 100,000
  verifications run roughly **₹14,500 (~$170)** instead of ~$1,000.

**Recommendation:** start with Google Sign-In only — free, no billing
setup, no Blaze. Add phone verification when you actually need it, and
when you do, prefer `whatsapp` over `firebase` for the cost difference.
Keep `msg91` in reserve for users who don't have WhatsApp.

## 3. Console steps (nobody but you can do these)

1. [console.firebase.google.com](https://console.firebase.google.com) → create a project.
2. **Authentication** → Sign-in method → enable **Google**.
3. **Firestore Database** → Create → **production mode** (not test mode — test mode ignores your rules for 30 days and then locks everything out).
4. **Firestore** → Rules → paste `dge/firebase/firestore.rules` → Publish. Or `cd dge/firebase && firebase deploy --only firestore:rules`.
5. **Project settings** → General → Your apps → Add app → Web (`</>`) → copy the `firebaseConfig` object.
6. **Authentication → Settings → Authorized domains** → add whichever domain actually serves the site. Today that is **`tribhuvanachar.github.io`**. When the custom domain goes live (expected 29 Aug 2026, or 18 Sep — see the checklist in `site.config.json`), **add `www.sarvamula.org` and `sarvamula.org` too**. Google Sign-In fails silently from an unauthorized domain: no error, no popup, nothing happens at all — which makes it one of the harder things to diagnose after a domain move. (`localhost` is authorized by default, so local testing needs nothing added.)

## 4. What to paste into this repo

In `dge/js/config.js`, replace every `REPLACE_WITH_...` in
`FIREBASE_CONFIG`, then set `AUTH_CONFIG.enabled = true`.

These values are **not secret** — Firebase's docs are explicit that this
object ships in client code; access control comes from the security
rules, not from hiding it. (The WhatsApp and MSG91 credentials in §7 are
a completely different matter and must never go in this file.)

That's all for Google Sign-In. Reload — a 👤 icon appears in the toolbar.
Signing in creates `users/<uid>` with `role: "basic"`.

**Becoming the first superadmin:** nobody starts as one, on purpose. Sign
in once, then in the Firestore console open `users/<your-uid>` and change
`role` to `superadmin` by hand. From then on you can promote others from
the in-app 👥 Manage Users screen.

## 5. Phone verification — picking a channel

Set `AUTH_CONFIG.enablePhoneAuth = true` and choose
`AUTH_CONFIG.phoneOtpProvider`:

- **`'firebase'`** — Firebase's own SMS. No backend needed; skip §6-7
  entirely. Enable **Phone** under Authentication → Sign-in method
  (requires Blaze). Uses an invisible reCAPTCHA, which can be finicky on
  `localhost` — test on the real domain if it misbehaves. Most expensive.
- **`'whatsapp'`** — WhatsApp Cloud API via our Cloud Functions. ~6x
  cheaper, arrives with a one-tap copy button. Needs §6 and §7.
- **`'msg91'`** — India SMS gateway via the same Cloud Functions. Needs
  §6, §7, and DLT registration.

The last two share one backend and one client code path. Switching
between them is one string here plus one env value on the deployed
functions.

## 6. Deploying the Cloud Functions

Needed only for the `whatsapp` and `msg91` channels, and for broadcasts.

```bash
cd dge/firebase
cp .firebaserc.example .firebaserc     # then put your project id in it
cd functions && npm install && cd ..
firebase deploy --only functions
```

The functions deploy to **asia-south1** (Mumbai). If you change that in
`functions/index.js`, change `AUTH_CONFIG.functionsRegion` to match, or
every call lands on a URL that does not exist.

Deploying functions requires the **Blaze** plan. Set a budget alert and a
low daily spend cap while you are still testing — the OTP rate limits in
`functions/lib/otp-core.js` (1 code per minute, 5 per hour per number)
are the code-level guard, but a billing cap is the one that cannot be
argued with.

## 7. WhatsApp Cloud API setup

1. Create a Meta Business account and a WhatsApp Business app at [developers.facebook.com](https://developers.facebook.com).
2. **WhatsApp → API Setup**: note the **Phone number ID** and generate a **permanent** access token (a System User token — the temporary 24-hour one is only useful for a first smoke test).
3. **WhatsApp Manager → Message templates** → create an **Authentication** template. Name it `dge_otp` (or set `OTP_TEMPLATE_NAME` to whatever you call it). Enable the **copy code** button — that button is the reason to use WhatsApp for OTP at all. Approval usually takes minutes to a few hours.
4. Create a **Utility** template for broadcasts, with whatever variables you need. Utility is the correct category for "here is today's shloka"; marketing costs more and is held to stricter rules.
5. Set the secrets:

```bash
cd dge/firebase
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN   # any random string you choose
firebase functions:secrets:set WHATSAPP_APP_SECRET     # Meta app → Settings → Basic
firebase functions:secrets:set OTP_PEPPER              # any long random string
# only if using msg91:
firebase functions:secrets:set MSG91_AUTHKEY
```

**`OTP_PEPPER` must be set once and never rotated.** Phone-based account
UIDs are derived from it; changing it orphans every existing phone
account, because the same person would derive a different UID.

6. Point Meta's webhook at the deployed `whatsappWebhook` URL, using the
   `WHATSAPP_VERIFY_TOKEN` you chose, and subscribe to the `messages`
   field. This is what honours **STOP** replies. It is not optional:
   ignoring opt-outs is a policy breach, and recipients blocking the
   number damages the sender quality rating that governs how much
   WhatsApp lets you send at all.

## 8. WhatsApp broadcasts

Set `AUTH_CONFIG.enableWhatsappBroadcasts = true` to show the consent
checkbox on the account screen. Nobody is messaged without ticking it —
consent starts `false`, the security rules reject a profile created with
it `true`, and the audience selector requires a literal `true`.

To schedule a message, add a document to the `broadcasts` collection
(superadmin only, per the rules):

```js
{
  templateName: "dge_daily_shloka",   // an approved Utility template
  languageCode: "en",
  bodyParams: ["Bhagavad Gita", "2.47"],
  status: "scheduled",
  sendAfter: <Timestamp>,
  roles: ["subscriber", "sponsor"],   // optional; omit for everyone
  minGapMs: 86400000,                 // optional floor between broadcasts
  maxPerRun: 500                      // optional cap per firing
}
```

`runWhatsAppBroadcast` fires daily at 07:00 IST, claims each due campaign
transactionally (so an overlapping run cannot double-send), records
delivery per user, and marks hard-bounced numbers so later campaigns skip
them. A campaign that exceeds `maxPerRun` stays `scheduled` and continues
on the next firing.

## 9. Hosting (optional, not done)

`firebase.json` declares a hosting config, but **the site still ships from
GitHub Pages** and nothing here changes that. Migrating is a separate
decision — the upside over Pages is mainly the custom-domain SSL and CDN
story, and this repo carries large binary assets that are worth thinking
about before pointing a CDN at them. If you do migrate: `firebase deploy
--only hosting`, then add the A/CNAME records Firebase gives you at your
registrar. SSL and custom domains are free either way.

## 10. What is and isn't tested

**Tested — 219 tests, no credentials, no cost** (`cd dge/firebase/tests
&& npm install && npm run test:all`):

- The OTP state machine: expiry to the millisecond, attempt caps
  (including that a correct code fails once the cap is hit), per-number
  rate limits, salted hashing, and that the plaintext code is never
  stored.
- The security rules, **against the real Firestore emulator**: privilege
  escalation at sign-up, self-promotion, admin-vs-superadmin separation,
  the OTP collection being sealed from every client, and that a user
  cannot rewrite the record of which paid broadcasts they already
  received.
- WhatsApp payload shapes, webhook signature forgery, and opt-out
  detection (including that "please don't stop sending these" does *not*
  unsubscribe someone).
- The browser flow with a stubbed SDK: transport routing, that a new
  profile is always created as `basic` with consent off even if
  `config.js` is tampered with, and that the whole feature stays inert
  when disabled.

**Not tested, and only observable against live accounts:**

- That Google/Meta/MSG91 accept our requests, that templates are
  approved, that messages actually arrive.
- reCAPTCHA behaviour for the `firebase` SMS channel.
- Real billing. Set a budget cap before the first real send.
- The `console` OTP provider refuses to run outside an emulator by
  design, so the whole flow runs locally without spending anything. This
  is now automated: `cd dge/firebase/functions && npm install`, then
  `cd ../tests && npm run test:e2e` starts the emulators, drives
  send → verify → custom token → profile creation through the real
  `index.js`, and shuts them down.

  Worth knowing why that suite exists: `index.js` was written, reviewed
  and committed without ever being executed, because it is the one file
  here that unit tests cannot reach. The first time it ran it failed
  immediately — `admin.firestore.FieldValue` reads back as `undefined`
  through the emulator's proxy of the `firebase-admin` root export, so
  every `serverTimestamp()` threw a bare `INTERNAL`, in `verifyOtp`, in
  the opt-out webhook, and throughout the broadcast sender. It is fixed
  (modular `firebase-admin/firestore` imports), but the lesson holds:
  code that has never been run is not code that works.

## 11. Deliberately not built

- **Unifying this with the existing localStorage passkey admin system.**
  The `?pass=`/`?superadmin=` system still works exactly as before, and
  runs in parallel with Firebase roles. Merging them would disrupt a
  working daily workflow while this is still new.
- **Pagination in Manage Users** — still the 200 most recently active.
- **App Check.** The OTP endpoints are protected by server-side rate
  limits, not by attestation. Worth adding if abuse ever shows up in the
  logs.
- **Delivery-status tracking.** The webhook parses inbound messages for
  opt-outs but ignores `statuses` callbacks; per-message delivery
  receipts are not recorded.
