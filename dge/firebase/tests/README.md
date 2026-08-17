# Firebase layer — tests

192 tests, none of which need a Firebase project, credentials, a phone
number, or money.

```bash
cd dge/firebase/tests
npm install          # once
npm test             # 152 unit tests, no emulator needed
npm run test:rules   # 40 security-rules tests against the real emulator
npm run test:all     # both
```

`test:rules` starts the Firestore emulator (Java 11+ required), runs the
rules against it, and shuts it down. It is the one suite that exercises
real Firebase behaviour rather than a stub.

## What each file covers

| File | Tests | What it pins down |
|---|---|---|
| `otp-core.test.js` | 49 | Phone normalization, code generation, salted hashing, expiry, attempt caps, per-number rate limits. |
| `whatsapp.test.js` | 38 | Cloud API payload shapes, error classification, webhook signature verification, opt-out intent detection. |
| `broadcast-core.test.js` | 25 | Who receives a broadcast and — mostly — who must not. |
| `user-auth.test.js` | 40 | The browser half: transport routing, profile defaults, OTP flows, consent, inertness when disabled. |
| `rules.spec.js` | 40 | Firestore security rules, against the emulator. |

Most assertions are that something **fails**. A suite that only checked
happy paths would pass just as happily against `allow read, write: if
true`.

## Naming

`rules.spec.js` uses `.spec.js` deliberately: node's default test glob
matches `*.test.js` but not `*.spec.js`, so a plain `npm test` skips the
file that needs an emulator instead of failing on it. Run it via
`npm run test:rules`.

## What these tests cannot tell you

They verify our logic and our security rules. They cannot verify that
Google, Meta, or MSG91 accept our requests — the SDK is stubbed in
`helpers/fake-env.js`, and the Graph API calls go to a fake `fetch`.
Delivery, template approval, reCAPTCHA behaviour, and real billing are
only observable against live accounts. See `../../FIREBASE_SETUP.md` §10
for what to check the first time this runs for real.
