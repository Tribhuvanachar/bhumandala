# DGE Donations, Payments & Supporters — Foundation

_Written 8 Sep 2026. Phase 1 foundation only — no real payment gateway
credentials exist anywhere in this repo, no rupee has moved, and nothing
here is deployed. See §0 for exactly what that means._

## 0. Where this stands

The lead asked for the donation/payment/supporter system to be built on
**this project's existing Firebase stack** (Cloud Functions + Firestore +
Firebase Auth) rather than the Cloudflare Workers + Supabase architecture
that was independently proposed — see §1 for why that's the better fit
here. The actual payment gateway (Cashfree, Razorpay, or otherwise) is
**explicitly deferred**; the lead's own words: "let's keep the end payment
gateway... we'll decide it later. But what else all is required?" This
document, and the code it describes, is the answer to that question.

| Piece | State |
|---|---|
| Firestore schema (§3) | ✅ built — 8 collections, integer money, security rules |
| `lib/donation-core.js` (validation, sanitization, reference generation) | ✅ built, 33 unit tests |
| `lib/payment-state.js` (the status state machine) | ✅ built, 12 unit tests |
| `lib/payment-providers.js` (gateway adapter registry) | ✅ built — `mock` only; a real gateway is one new entry away, see §4 |
| `lib/receipt-core.js` (receipt numbering + email content) | ✅ built, 9 unit tests |
| `lib/email-providers.js` | ✅ built — `console` only (logs instead of sending); a real provider is a later decision, same shape as the gateway |
| `createDonation` / `paymentWebhook` / `getDonationStatus` Cloud Functions | ✅ built, exercised end to end against the `mock` gateway (§6) |
| Firestore rules for the 8 new collections | ✅ built, 21 rules-emulator tests |
| **A real payment gateway** | ❌ not started — the lead's decision, see §4 |
| Donation frontend page (`dge/donate.html` or similar) | ❌ not started |
| Real transactional email | ❌ not started — `console` provider only |
| Rate limiting on `createDonation`/`paymentWebhook` | ❌ not started — flagged as a gap, see §8 |
| Supporter magic-link auth, entitlements actually granted | ❌ not started — Phase 3/4, deliberately deferred |
| Admin donations dashboard | ❌ not started — deliberately deferred (§21 of the spec this implements says the same) |
| Compliance sign-off (12A/80G/FCRA/gateway merchant approval) | ❌ the lead's own action item, not something this session can do — see §9 |

## 1. Architecture decision: Firebase-native, not Cloudflare Workers + Supabase

A detailed Cloudflare Workers + Supabase architecture was proposed
alongside this task. It's a reasonable design in isolation, but not the
right one **for this repository specifically**, and the lead confirmed
Firebase-native when asked directly:

- **This project already has a working Firebase deploy pipeline** —
  Firestore rules, Hosting, and Cloud Functions all deploy through
  GitHub Actions as of this same session (`FIREBASE_SETUP.md` §0). A
  second serverless runtime (Cloudflare Workers) means a second set of
  secrets, a second deploy pipeline, and a second thing that can be
  half-configured.
- **One identity system, not two.** Firebase Auth (Google sign-in, phone
  OTP) already exists with a working role system
  (`dge/firebase/firestore.rules`' `callerRole()`). Supabase Auth would
  be a second, parallel notion of "who is this person" that has to be
  reconciled with the first the moment a donor is also a signed-in
  reader — which is exactly what Phase 3 (magic-link supporter accounts)
  needs to do.
- **Firestore already holds this app's `users`, `broadcasts`, and
  `workflow_dispatches` collections**, with the exact security-rules
  pattern (public read where appropriate, Admin-SDK-only writes,
  role-gated admin reads) this feature reuses verbatim in §3 below.
- The one thing Postgres genuinely offers that Firestore doesn't — real
  SQL for settlement reconciliation (§7 of the pasted proposal) — is not
  needed for Phase 1. Firestore's collections here already model the
  join structure a reconciliation report needs (`payments.donationId`,
  `donations.donorId`); a CSV export or a small script that reads
  Firestore is enough until real settlement volume says otherwise. If it
  ever doesn't, adding Postgres for the money tables ONLY (not for auth,
  not as the API layer) is a smaller, later, well-justified step — not a
  Phase 1 decision.

**Net result**: `GitHub Pages (frontend, once built) → Firebase Cloud
Functions (API) → Firestore`. One deploy pipeline, one identity system,
one set of secrets. This is the same shape `sendOtp`/`verifyOtp` and the
admin workflow-dispatch functions already use — donations are one more
feature in the same house style, not a parallel system next to it.

## 2. Money is stored as integer minor units, never a float

Every amount in this feature (`amountMinor` on `donations`/`payments`,
never `amount`) is an **integer number of paise**, not a decimal rupee
value. Firestore has no fixed-point decimal type — only IEEE-754
doubles — so a `numeric(18,2)` column (which the SQL version of this
schema used, and which is fine in Postgres) would be a silent rounding
bug waiting to happen in Firestore. `lib/donation-core.js`'s
`majorToMinor()` is the one place a client-typed amount like `"1001.50"`
becomes `100150` — it rejects (does not round) anything with more than 2
decimal places, `NaN`, `Infinity`, or a non-positive value.

## 3. Firestore schema

All eight collections and their security rules live in
`dge/firebase/firestore.rules`; the write side lives entirely in
`dge/firebase/functions/index.js` using the Admin SDK, which bypasses
rules — **no client, not even a superadmin, may write any of these
collections directly.** That's not an oversight to fix later; it's the
whole point. `createDonation` and `paymentWebhook` are the only code
that may ever set a donation's amount or move it to `SUCCESS`.

| Collection | Doc ID | Client read | Notes |
|---|---|---|---|
| `donors` | auto | superadmin only | name, email, phone, PAN — the most sensitive PII here |
| `donations` | auto | admin | `amountMinor`, `status`, `contributionType`, `donorId` reference (no raw PII) |
| `payments` | auto | admin | gateway order/payment IDs, no PII |
| `payment_events` | `{gateway}_{gatewayEventId}` | **nobody** | sealed like `otp_challenges` — the doc ID itself IS the webhook-idempotency uniqueness constraint |
| `receipts` | `{donationId}` | admin | receipt number, email-sent status |
| `receipt_counters` | `{year}` | **nobody** | an atomic sequence Firestore transaction increments; a client that could write this could mint its own receipt numbers |
| `supporter_entitlements` | `{donorId}_{entitlementCode}` | admin (for now) | Phase 4 — nothing grants one yet; will become `isOwner(donorId) \|\| isAdmin()` once Phase 3 links a donor to a signed-in uid |
| `public_supporters` | `{donationId}` | **everyone** | the Supporters Wall — only `displayName`/`amountMinor` (nullable)/`currency`/`paidAt`/`donationReference`; never email, phone, PAN, or the raw `donorId` |

Two Firestore-native simplifications versus the originally-pasted SQL
schema, both deliberate:
- `payment_events`' doc ID *is* `gateway + gatewayEventId` — Postgres
  needed a separate `unique(gateway, gateway_event_id)` constraint;
  Firestore doc IDs are unique by construction, so the ID does that job.
- `receipts` and `supporter_entitlements` use composite/foreign doc IDs
  (`{donationId}`, `{donorId}_{entitlementCode}`) for the same reason —
  no separate unique index needed.

## 4. Adding a real payment gateway later

`dge/firebase/functions/lib/payment-providers.js` is a small registry —
the exact shape `lib/providers.js` already uses for OTP delivery
channels (WhatsApp/MSG91/console). Today it holds exactly one entry,
`mock`, which is **refused outside a Firebase emulator**
(`assertGatewayAllowed`) so it can never be mistaken for a production
gateway the way `providers.js`'s `console` OTP channel already can't be.

Adding Cashfree, Razorpay, or anything else means adding ONE more entry
with the same four members `mock` has:

```js
cashfree: {
  id: 'cashfree',
  async createOrder({ donationReference, amountMinor, currency, customer, returnUrl }) { ... },
  verifyWebhookSignature(rawBody, headers, secret) { ... },
  parseWebhookEvent(rawBody, headers) { ... } // normalized to payment-state.js's ALL_STATUSES
}
```

Nothing else changes: `createDonation`, `paymentWebhook`,
`payment-state.js`'s state machine, the receipt pipeline, and the
Supporters Wall are already built and tested against `mock` and will
work identically against a real gateway the moment `PAYMENT_GATEWAY` is
set to its id.

**Important — do not trust a pasted API description, including the one
that prompted this document.** The proposal that led to this foundation
asserted specific current details about Cashfree (a `payment_session_id`
returned from `POST /pg/orders`, an API version string `2026-01-01`, an
`x-idempotency-key` header, specific webhook versions). None of that was
verified against Cashfree's own live documentation in this session —
this document deliberately does not repeat those specifics as fact.
Whoever implements the `cashfree` (or any other) entry above must pull
the exact request/response shape, the current API version header, and
the webhook signature scheme from that gateway's OWN current docs at
implementation time, the same discipline this repo already applies
elsewhere (`FIREBASE_SETUP.md`'s own history is a good example of why —
three of its four real deploy blockers were things that LOOKED right
from memory and weren't).

## 5. FCRA / foreign-contribution boundary

`createDonation` hardcodes every donation to `contributionType:
'DOMESTIC'`, `fcraApplicable: false`, **regardless of the donor's own
country field**, until a human decides otherwise. This is intentional
and conservative: the code does not attempt to classify a donation as an
accepted "foreign contribution" for compliance purposes, because that
classification is a legal one this session cannot make. See
`dge/firebase/functions/index.js`'s `createDonation` for the exact
comment marking where donor-country-aware classification would go once
the Trust's FCRA registration/permission status and banking arrangement
are confirmed (Phase 5 in §8 below) — not before.

## 6. Testing this feature

```bash
cd dge/firebase/tests
npm test                    # pure-function unit tests (this feature: 63 of them,
                             # across donation-core/payment-state/payment-providers/receipt-core)
npm run test:rules          # Firestore rules, real emulator (this feature: 21 tests)
npm run test:donations-e2e  # real Functions + Firestore emulators, the `mock` gateway,
                             # end to end: createDonation -> signed webhook -> SUCCESS ->
                             # receipt -> Supporters Wall entry -> idempotent replay ->
                             # a stale out-of-order event rejected
```

`test:donations-e2e` needs `dge/firebase/functions/.secret.local`
(gitignored, never committed — same convention `FIREBASE_SETUP.md`
already documents for `.env.local`) holding a `PAYMENT_WEBHOOK_SECRET`
line; any value works since the `mock` gateway is the only thing that
ever reads it.

What these tests actually prove, concretely: amount tampering is
rejected before any gateway call; a name that is pure markup sanitizes
to nothing and is rejected; the browser's return URL is never trusted —
`getDonationStatus` is the only source of truth a success page may show;
a webhook with a bad or missing signature is rejected; a replayed
webhook event never mints a second receipt or a duplicate Supporters
Wall entry; a stale/out-of-order event (e.g. a late `PENDING` arriving
after `SUCCESS`) can never walk a donation backwards; the public
Supporters Wall entry never carries PAN, email, phone, or the donor's
internal ID.

## 7. What is NOT tested or built yet — be honest about this before real money moves

- **No rate limiting** on `createDonation` or `paymentWebhook`. `sendOtp`
  has one (`otp-core.js`'s cooldown + per-hour cap); this feature needs
  the equivalent before it is reachable by the public internet with a
  real gateway behind it — otherwise a script can open unlimited PENDING
  donations (cheap, but pollutes the data) or hammer the webhook
  endpoint.
- **No refund/partial-refund code path is implemented** — the state
  machine (`payment-state.js`) allows the `SUCCESS -> REFUNDED` and
  `SUCCESS -> PARTIALLY_REFUNDED` transitions and is tested for them, but
  nothing in `index.js` yet calls a gateway's refund API or exposes an
  admin action to trigger one.
- **No donation frontend.** `createDonation`/`getDonationStatus` are
  callable functions with no UI in front of them yet.
- **No real email provider** — receipts are logged, not sent.
- **No admin dashboard** — deliberately, per §21 of the original spec;
  Firestore's own console (superadmin-only collections) covers
  operational inspection until real volume justifies building one.

## 8. Phases (what's built vs. what's still ahead)

| Phase | Status |
|---|---|
| **0 — Compliance** (legal entity, PAN, bank account, 12A/80G, FCRA status, gateway merchant approval) | ❌ the lead's own action items — nothing here can substitute for them, see §9 |
| **1 — Domestic payment foundation** (schema, validation, state machine, gateway adapter pattern, webhook idempotency, receipts, tests) | ✅ this document |
| **1b — A real gateway wired in, INR only, plus rate limiting and a donation UI** | ❌ next, once the lead picks a gateway |
| **2 — Supporters Wall UI** (the `public_supporters` collection already exists and is tested; a page rendering it does not) | ❌ not started |
| **3 — Supporter magic-link auth** (Firebase Auth already supports this pattern; linking a `donorId` to a `uid` is the new part) | ❌ not started |
| **4 — Entitlements actually granted** (`supporter_entitlements` collection and `maybeGrantEntitlements()` hook exist; no entitlement is defined yet) | ❌ not started |
| **5 — International / FCRA-aware contributions** | ❌ not started, and must not start before §0 compliance is confirmed |

## 9. Before any of this touches a real rupee

This is the lead's checklist, not something an AI session can complete:

- [ ] Trust legal entity, PAN, and bank account verified
- [ ] 12A/12AB status confirmed (if applicable)
- [ ] 80G status confirmed (if applicable) — **this repo's receipt email
      template deliberately makes no tax-deductibility claim** until
      this is confirmed, see `receipt-core.js`'s own comment on that
- [ ] FCRA status and, if applicable, the FCRA-designated bank account
      confirmed against the Trust's actual registration — never assumed
      from a payment gateway's own marketing copy
- [ ] A payment gateway chosen and its merchant/KYC approval completed
- [ ] International payment capability, if wanted, separately approved
      by that gateway — never enabled by frontend code alone
