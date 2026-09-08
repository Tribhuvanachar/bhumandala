# DGE Accounts, OTP & WhatsApp — Firebase Setup

_Originally written 10 Aug 2026 (Google Sign-In + Firebase phone OTP,
untested). Substantially revised 16 Aug 2026: added WhatsApp OTP and
broadcasts, tightened the security rules, and — for the first time —
tests. 204 of them now run without a Firebase project, credentials, or
money. See §10 for what still cannot be tested without live accounts._

## 0. Where this stands (8 Sep 2026, ~10:20 am IST)

The lead created the Firebase project **`sarvamula-org`** and pasted its web config; it is now in
`dge/js/config.js` (`FIREBASE_CONFIG`) and `AUTH_CONFIG.enabled` is **true**. The three identifiers are
also GitHub secrets (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`) — harmless, but
only `FIREBASE_PROJECT_ID` is used by the deploy workflows; the web config is public by design (§4).

Probed from the public endpoints and re-tested 8 Sep 2026:

| Console step (§3) | State |
|---|---|
| Authorized domains | ✅ `tribhuvanachar.github.io`, `sarvamula.org`, `madhvacharya.in`, `sanatanavidyagurukulam.com`, the `*.web.app`/`*.firebaseapp.com` hosts, `localhost` |
| Verified emails only | ✅ 7 Sep 2026: `user-auth.js` stores an email only when the provider marks it verified (`dgeVerifiedEmail`), and captures a later-verified one on the next sign-in; `firestore.rules` `emailOk()`/`emailVerifiedFlagOk()` reject any other email on create or self-update (7 emulator tests); the Manage Users screen exports the verified list as CSV (`dgeExportVerifiedEmails`). There is no email/password sign-up in DGE, so `sendEmailVerification` is not needed today; if one is added, the same rule already gates it |
| Google sign-in provider | ✅ enabled by the lead (6 Sep 2026, ~9:40 pm IST) |
| Firestore database | ✅ **created by the lead, 8 Sep 2026** (production mode, per §3.3 below) — `firestore.rules` re-validated against the real emulator right after (47/47 tests pass, `npm run test:rules` in `dge/firebase/tests`), but **not yet published to the live database**: see the row below |
| `FIREBASE_SERVICE_ACCOUNT` secret | ✅ **added by the lead, 8 Sep 2026, ~10:11 am IST** — the workflows now parse it correctly (`service account: firebase-adminsdk-fbsvc@sarvamula-org.iam.gserviceaccount.com`); the earlier "no key found" blocker is resolved |
| Firestore rules + indexes deploy | ❌ **Identical 403 on THREE attempts** (10:15, 10:36, 10:50 am IST) with the same message every time: `Error: Request to https://firebaserules.googleapis.com/v1/projects/sarvamula-org:test had HTTP Error: 403, The caller does not have permission`. The two obvious suspects are both now independently confirmed fine — the lead verified in the Google Cloud console that (a) `firebase-adminsdk-fbsvc@sarvamula-org.iam.gserviceaccount.com` genuinely carries the "Firebase Admin" role (visible twice in the IAM principals list, next to the original SDK role), and (b) "Firebase Rules API" (`firebaserules.googleapis.com`) shows **API Enabled**. See §0.1a for what's suspected next: a Cloud Console banner reading "To avoid losing access to Google Cloud services, an administrator must verify th…" was visible on the API details page — this project's owner is a personal Gmail account (`jagadgurumadhvacharyaadmin@gmail.com`), not a Workspace/Cloud Identity org, and Google gates some API calls behind an account/billing verification step for exactly this kind of project even when IAM and API-enablement both look correct. Until this runs once, Firestore enforces **no rules at all** for a database just created in production mode (reads/writes denied by Firestore's own production-mode default, not by our rules); sign-in still works via the existing fallback (profile read/write failure → "signed in, default role") |
| Hosting deploy | ⏸ **Not yet re-tried** — hold until Firestore rules deploy actually succeeds once, since it needs the same service account and likely the same fix; re-dispatch right after, don't assume it's a separate issue until proven so |
| Cloud Functions (WhatsApp OTP + broadcasts) | ⏸ **Not started** — see §0.2 for the ordered checklist. Two workflows are ready: `Deploy — Firebase Functions` and `Push Firebase Functions secrets` (deploys `dge/firebase/functions`, pushes WhatsApp/MSG91/OTP_PEPPER secrets from GitHub into Firebase Secret Manager without them passing through chat). Both wait on the same IAM/API fix above, and functions (2nd-gen, Cloud Run-backed) may need further roles on top — read the exact 403 when it happens, same playbook, don't pre-grant a guessed bundle |

### 0.1 The IAM fix needed before either deploy workflow can succeed

The service-account key itself is fine — Adarsh generated a real key for the right project and it parses
correctly. What's missing is a **Google Cloud IAM role** on that service account. The default
`firebase-adminsdk-*` account Firebase auto-creates carries only **"Firebase Admin SDK Administrator
Service Agent"** (`roles/firebase.sdkAdminServiceAgent`) — built for the *Admin SDK* (a backend server
reading/writing Firestore/Auth data as an admin user), not for the *control plane* operations these
workflows do (publishing rules, building indexes, deploying hosting).

To fix, in the **Google Cloud Console** (console.cloud.google.com — a different console from
Firebase's), not the Firebase console:

1. Select project **`sarvamula-org`** (top bar, same as Firebase).
2. Go to **IAM & Admin → IAM** in the left sidebar.
3. Find the row for **`firebase-adminsdk-fbsvc@sarvamula-org.iam.gserviceaccount.com`**.
4. Click the pencil (edit) icon on that row.
5. Click **Add another role**, search for **"Firebase Admin"**, select it (`roles/firebase.admin`).
6. Click **Save**.

That one role is broad enough to cover rules, indexes, and hosting deploys together, so it only needs to
be done once. After saving, tell the next session (or re-dispatch `Deploy — Firestore rules & indexes`
directly) — IAM changes apply within a minute or two, no redeploy of anything else needed.

### 0.1a Both fixes confirmed correct, error unchanged — suspect account verification, not IAM

Three deploy attempts (10:15, 10:36, 10:50 am IST) all failed with the exact same 403 from
`firebaserules.googleapis.com`, and the lead has since verified in the console that the role is genuinely
attached to the service account and the Rules API is genuinely enabled — so neither of those, individually
or together, is the actual cause.

One thing stands out: a Google Cloud Console banner appeared reading **"To avoid losing access to Google
Cloud services, an administrator must verify th…"** (cut off in the screenshot). This project's owner
(`jagadgurumadhvacharyaadmin@gmail.com`) is a personal Gmail account, not a Workspace / Cloud Identity
organization — Google puts an account-or-billing-verification gate on some projects created this way, and
that gate can block specific API calls with a permission-looking 403 even when IAM and per-API enablement
are both correct, because the check happens at a layer above ordinary IAM.

**Lead, next step:** open that banner (it's likely visible from the Google Cloud Console home page or the
API details page it appeared on) and read the full text — it should link straight to whatever needs
verifying (usually a billing account re-verification or an identity check). Complete whatever it asks for,
then tell the next session to retry. If the banner doesn't lead anywhere actionable, the next thing to try
is `gcloud auth application-default login` locally as the project **owner** account (not the service
account) and running `firebase deploy --only firestore:rules --project sarvamula-org` from a machine you
control — if that also 403s, the problem is confirmed to be at the project/account level, not the service
account's permissions, and is worth a message to Google Cloud support or Firebase support directly.

### 0.2 Phone OTP + WhatsApp — the ordered path to turning it on

Read §2 first (cost) and §5 (channel tradeoffs) if you haven't. Recommendation there stands: prefer
`'whatsapp'` over `'firebase'` once you're ready for phone verification, for the ~6x cost difference.
This is the actual sequence, in order — each step names who does it:

1. **You: decide the channel.** `'whatsapp'`, `'msg91'`, or stay on Google-only for now. The rest of
   this list assumes `'whatsapp'`; `'msg91'` needs the same Cloud Functions plus DLT registration (§7
   doesn't cover DLT — that's an MSG91-side process).
2. **You: get Firestore rules deploying** (§0/§0.1 above) — Cloud Functions read the same project and
   the same rules govern `broadcasts`/`users` writes, so this has to work first.
3. **Me, once (2) is green: dispatch `Deploy — Firebase Functions`.** This deploys everything in
   `dge/firebase/functions` (`requestOtp`, `verifyOtp`, `whatsappWebhook`, `runWhatsAppBroadcast`, the
   admin workflow-dispatch functions). The functions that need WhatsApp secrets will exist but error
   when called until step 5 — that's expected, it doesn't block this deploy. If this 403s, it's very
   likely a *further* IAM role (2nd-gen functions deploy to Cloud Run under the hood and are more
   permission-hungry than Hosting/Firestore) — the workflow's header explains what to look for; read
   the actual error and grant only what it names, same playbook as §0.1.
4. **You: set up Meta.** Nobody but you (or Adarsh) can do this part:
   - Create a Meta Business account and a WhatsApp Business app at developers.facebook.com.
   - WhatsApp → API Setup: note the **Phone number ID**, generate a **permanent** (System User) access
     token — not the 24-hour temporary one.
   - WhatsApp Manager → Message templates → create an **Authentication** template named `dge_otp`
     with the **copy code** button enabled. Approval is usually minutes to a few hours.
   - Create a **Utility** template for broadcasts (e.g. the daily shloka), with whatever variables you
     want to fill in per message.
   - Meta app → Settings → Basic: note the **App Secret**.
   - Pick any long random string for `OTP_PEPPER` (a password manager's generator is fine) — **write
     it down somewhere durable**, see the warning in step 5.
5. **You: add six GitHub repository secrets** (same screen as `FIREBASE_SERVICE_ACCOUNT` — Settings →
   Secrets and variables → Actions → Repository secrets): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_VERIFY_TOKEN` (any random string you choose — Meta will ask for this exact value in step
   6), `WHATSAPP_APP_SECRET`, `OTP_PEPPER`, and `MSG91_AUTHKEY` only if using that channel instead.
   **`OTP_PEPPER` is written once, ever.** Phone-account UIDs are derived from it — changing it later
   orphans every existing phone account. `push-firebase-function-secrets.yml` refuses to overwrite an
   existing `OTP_PEPPER` version unless you explicitly tick `rotate_otp_pepper`, precisely to prevent
   that by accident.
6. **Me, once (5) is done: dispatch `Push Firebase Functions secrets`.** Pushes each one from GitHub
   into Firebase's own Secret Manager, where the functions actually read them — never through this
   chat, never committed. I'll report which names were pushed (never the values).
7. **You: point Meta's webhook** at the deployed `whatsappWebhook` function URL (printed in the step-4
   deploy log, or Firebase Console → Functions → `whatsappWebhook` → copy the trigger URL), using the
   `WHATSAPP_VERIFY_TOKEN` from step 5, and subscribe to the `messages` field. This is what honours
   **STOP** replies — not optional, ignoring opt-outs is a Meta policy breach and damages the sender
   quality rating that governs how much WhatsApp lets the account send at all.
8. **Me: flip the switches in `dge/js/config.js`** and merge: `AUTH_CONFIG.enablePhoneAuth = true`,
   `phoneOtpProvider = 'whatsapp'`, and — only once you're ready for broadcasts specifically —
   `enableWhatsappBroadcasts = true`. These can land in one commit or two; broadcasts don't require
   phone auth to be on, they're independent (§8).
9. **Both: test end to end.** Sign in with a real phone number, confirm the WhatsApp OTP arrives with
   the copy-code button, confirm a wrong code is rejected and rate limits hold (1/minute, 5/hour per
   number — `functions/lib/otp-core.js`). For broadcasts, add one test document to the `broadcasts`
   collection with `sendAfter` a minute out and confirm it fires and marks itself delivered (§8 has the
   exact document shape).

Nothing in steps 1, 4, 5, 7 can be done by an AI session — they're either a decision only you can make,
or require Meta Business Manager / GitHub settings access. Steps 3, 6, 8 are mine once their
prerequisites land; tell me when each is ready rather than waiting for all of them at once.

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
dge/firebase/tests/          234 tests — see tests/README.md
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

**Tested — 249 tests, no credentials, no cost** (`cd dge/firebase/tests
&& npm install && npm run test:all` — `test:all` also needs `cd
../functions && npm install` once, for the end-to-end suite):

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
- The workflow buttons' allowlist: that a workflow not on the list, an
  input the workflow does not declare, a caller-supplied branch, or an
  admin reaching for a super-admin job are all refused.
- The browser flow with a stubbed SDK: transport routing, that a new
  profile is always created as `basic` with consent off even if
  `config.js` is tampered with, and that the whole feature stays inert
  when disabled.
- **`index.js` itself, end to end, against the real functions + Firestore
  + auth emulators** (`npm run test:e2e`, `dge/firebase/tests/e2e.spec.js`):
  send → store hashed → verify → mint a custom token → create the profile
  document, the resend cooldown, the attempt cap, replay protection, and
  the webhook's signature/handshake checks — all through the deployed
  function code, not a stub. This is the one file the rest of the suite
  cannot reach (it's the Firebase-shaped shell around the tested logic:
  secrets, transactions, custom tokens), and the one time it was written
  without ever being run, it failed immediately — `admin.firestore.
  FieldValue` reads back as `undefined` through the functions emulator's
  proxy of the `firebase-admin` root export, so every `serverTimestamp()`
  threw. Fixed by moving to the modular `firebase-admin/{app,firestore,
  auth}` imports, which don't go through that proxy. See
  `dge/firebase/tests/README.md` for what `test:e2e` needs locally
  (`functions/.secret.local`, git-ignored, for the `defineSecret()`
  params it can't reach without `firebase login`).

**Not tested, and only observable against live accounts:**

- That Google/Meta/MSG91 accept our requests, that templates are
  approved, that messages actually arrive.
- reCAPTCHA behaviour for the `firebase` SMS channel.
- Real billing. Set a budget cap before the first real send.

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

## 12. The workflow buttons (`admin/workflows.html`)

The site is static on GitHub Pages: a page cannot start a job by itself, and
it must never hold a token that could — anything shipped to a browser is
readable by whoever opens it. So the panel talks to two Cloud Functions,
`listWorkflows` and `runWorkflow`, which hold the token and check the caller.

```
admin/workflows.html  ──▶  runWorkflow  ──▶  GitHub API
(admin latch +             (holds the token as     (workflow_dispatch,
 Firebase Auth)             a secret; reads the     ref: main, always)
                            caller's role from
                            Firestore, not from
                            anything the browser said)
```

**Until this is deployed the panel still works** — it lists the same five
workflows and every button opens the GitHub Actions page instead. That is not
a degraded mode so much as the same capability one tab away, and it is what
the page shows today, because `AUTH_CONFIG.enabled` is still `false`.

### What has to be true before it can be deployed

1. **The Blaze plan.** A Function on the free Spark plan cannot make an
   outbound call to a non-Google host, and `api.github.com` is one. Set a
   budget cap at the same time; these two functions cost effectively nothing
   (a handful of invocations a month), but a cap is what stops a mistake
   elsewhere from becoming a bill.
2. **A fine-grained token.** GitHub → Settings → Developer settings →
   Personal access tokens → **Fine-grained tokens**:
   - Repository access: **Only select repositories** → `bhumandala`, and
     nothing else.
   - Permissions: **Actions: Read and write**. Nothing else. Not `contents`,
     not `workflows`, not organisation permissions.
   - An expiry you will actually notice — 90 days, with a reminder.

   A classic PAT with `repo` scope would work and must not be used: it can
   read and write every repository the account can reach, and it would be
   sitting in a service whose whole job is to accept requests from a browser.
   If the token below is ever leaked, the worst it can do is start one of
   five workflows in one repository.

### Deploying it

```bash
cd dge/firebase
firebase functions:secrets:set GITHUB_DISPATCH_TOKEN     # paste the token
firebase deploy --only functions:listWorkflows,functions:runWorkflow
firebase deploy --only firestore:indexes,firestore:rules
```

The repository defaults to `Tribhuvanachar/bhumandala`; override it with the
`GITHUB_REPO` env param if that ever changes.

### What the panel can and cannot do

- **Only the five workflows in `functions/workflows.json`.** A caller cannot
  name a workflow file, invent an input, or choose a branch: `ref` is always
  `main`, set in code, because a caller-supplied ref is arbitrary code
  execution by another name.
- **Roles are read server-side.** `is_superadmin` in localStorage decides
  what the UI *shows*; the Function reads `users/{uid}.role` from Firestore
  and decides what actually runs. Jobs that republish text a reader will see
  (`import-kavya`, `publish-wordnet`) need `superadmin`; the reporting and
  tracker jobs accept `admin`.
- **Every press is recorded** in the `workflow_dispatches` collection — who,
  which workflow, which inputs, and whether GitHub accepted it. Written by
  the Admin SDK, readable by admins, writable by no client.
- **One minute between presses** of the same workflow by the same account, so
  a double-click cannot open two pull requests.

The allowlist, the role rules and the input validation are all in
`functions/lib/workflows-core.js`, with 30 tests in
`tests/workflows-core.test.js` that run with no credentials and no cost.
