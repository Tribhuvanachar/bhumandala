# DGE User Accounts & Roles — Firebase Setup

_Written 10 Aug 2026. This is a "basic version" — see §6 for what's
deliberately not built yet. Nothing in this document has been tested
against a real Firebase project; the admin doing these steps is the
first real test of the whole flow, since none of it can be exercised
without live credentials this AI session never had access to._

## 1. What this actually is

User accounts (Google Sign-In + optional phone OTP) and per-person roles
(basic / subscriber / sponsor / admin / superadmin / special), backed by
Firebase — the first real backend this project has ever had. Everything
else in DGE is still a static site with no backend; this one feature is
the exception, deliberately isolated to its own files
(`js/user-auth.js`, `js/user-roles.js`, `firebase/firestore.rules`) so it
can be ignored entirely on any deployment that doesn't want it.

**It is OFF by default.** `AUTH_CONFIG.enabled` in `config.js` is `false`
out of the box — no Account button shows, no Firebase network calls
happen, nothing changes about how the site behaves until you do the
steps below AND flip that to `true`.

## 2. Cost — read this before enabling anything

- **Google Sign-In: free, no matter how many people use it.** No billing
  plan required for this alone.
- **Firestore** (where user profiles/roles live): free tier covers 50,000
  reads / 20,000 writes per day and 1GB storage. 100,000 small profile
  documents is a few MB — storage is a non-issue at that scale. Cost only
  shows up under heavy daily active usage, and even then it's fractions
  of a cent per 1,000 operations.
- **Phone/SMS OTP: never free, and requires upgrading to Firebase's paid
  Blaze plan** (mandatory for phone auth specifically, regardless of who
  actually sends the SMS). Two options, both supported by the config
  (`AUTH_CONFIG.phoneOtpProvider`), only one actually built:
  - `'firebase'` — **built and working** (assuming you complete the setup
    below). Zero extra backend code. Best available estimate for India:
    **~$0.01 per verification** — Google's own pricing page would not
    fully load while writing this, so treat that number as "verify in
    your own console before committing budget," not a guarantee.
  - `'msg91'` — **not built.** Roughly 5-6x cheaper for India (~₹0.15 ≈
    $0.0018 per OTP, no forex surcharge, INR billing) but needs a small
    Cloud Function so the MSG91 API key never touches client code — see
    §6.

**Recommendation**: start with Google Sign-In only (`enablePhoneAuth:
false`, the shipped default). It costs nothing and needs no billing
setup at all. Add phone auth later once you've decided which of the two
providers above you want, and accepted that it costs real money at scale
(100,000 phone sign-ups via Firebase's own SMS would run somewhere around
$1,000; the same volume via MSG91 would run closer to ₹15,000/~$180 —
these are estimates, not quotes).

## 3. Console steps (you have to do these — no AI session can)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), create a new project (or use an existing Google Cloud project).
2. **Authentication** → Sign-in method → enable **Google**. (Enable **Phone** too, later, only once you've read §2 and decided to accept the cost — enabling it requires switching the project to the **Blaze** (pay-as-you-go) plan first; Spark (free) plan does not support phone auth at all.)
3. **Firestore Database** → Create database → start in **production mode** (not test mode — production mode actually enforces the rules in §4, test mode ignores them for 30 days and then locks everything out).
4. **Firestore Database** → Rules → paste the entire contents of `dge/firebase/firestore.rules` in this repo → Publish.
5. **Project settings** (gear icon) → General → scroll to "Your apps" → Add app → Web (`</>`) → register it (nickname doesn't matter) → copy the `firebaseConfig` object it shows you.
6. Add your site's actual domain (e.g. `tribhuvanachar.github.io`) under **Authentication → Settings → Authorized domains** — Google Sign-In will silently fail from an unauthorized domain.

## 4. What to paste into this repo

Open `dge/js/config.js`, find `FIREBASE_CONFIG`, and replace every
`REPLACE_WITH_...` placeholder with the matching value from the object
you copied in step 5 above. Then set `AUTH_CONFIG.enabled = true`.

That's it for Google Sign-In. Reload the site — a 👤 icon should appear
in the top toolbar. Signing in should create a document under
`users/<their-uid>` in Firestore with `role: "basic"`.

To become the first superadmin (nobody starts as one — the default role
is always `basic`, on purpose, so nobody can grant themselves elevated
access): sign in once via the app, then in the Firestore console, open
`users/<your-uid>` and manually change `role` to `superadmin`. After
that, you (and anyone you promote from the in-app "👥 Manage Users"
screen, reachable from the 🛡️ Admin menu once `is_superadmin` is set on
your device the usual way) can change anyone else's role from the app
itself.

## 5. Enabling phone auth (Firebase's own, once you've accepted the cost)

Set `AUTH_CONFIG.enablePhoneAuth = true` (leave `phoneOtpProvider` as
`'firebase'`). Make sure the project is on the Blaze plan and Phone is
enabled under Authentication → Sign-in method (step 2 above). The
Account modal will then show a phone number field. Firebase requires an
invisible reCAPTCHA for phone auth — already wired up
(`#recaptchaContainer` in `index.html`) — but reCAPTCHA can be finicky on
`localhost` during testing; test against the real deployed domain if it
misbehaves locally.

## 6. What's deliberately not built yet

- **MSG91 (or any non-Firebase) OTP provider.** The cheaper path for
  India. Needs a Cloud Function that: (a) receives a phone number from
  the client, (b) calls MSG91's send-OTP API server-side (API key never
  in client code), (c) on a matching verify call, mints a [Firebase
  custom token](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
  for that phone number's UID, which the client then signs in with via
  `firebase.auth().signInWithCustomToken()`. `phoneOtpProvider: 'msg91'`
  is already a recognized config value — `dgeSendPhoneOtp` in
  `user-auth.js` already checks for it and fails with a clear message
  rather than silently doing nothing, specifically so this isn't a
  landmine if someone flips it on before the function exists.
- **Pagination** in Manage Users — currently loads the 200
  most-recently-active accounts. Fine to start; will need real
  pagination once the user base is large enough that 200 doesn't cover
  "the person I'm looking for."
- **Drag-and-drop / more visual role management UI.** The original
  request described something more elaborate ("draggable and portable
  and selectable display"); this version is a plain searchable list with
  a per-row dropdown. Functional first, polish later.
- **Unifying this with the existing localStorage passkey admin system.**
  They now run in parallel — the original `?pass=`/`?superadmin=`
  passkey system (unchanged, still works exactly as before) and this new
  Firebase-role system are two independent ways to be recognized as an
  admin. Not merged into one system in this pass, to avoid disrupting
  the admin's existing daily workflow while this is still new and
  untested against a real project.
- **Any actual testing against a live Firebase project.** Every piece of
  this was written against Firebase's documented compat-SDK API surface
  and tested for internal logic (role-gating, rule structure, UI
  rendering) with a stubbed SDK — but the real sign-in flow, the
  Firestore rules' actual behavior, and the Manage Users screen have
  never run against a real project. Expect to find and report real
  issues once you go through §3-4 for the first time.
