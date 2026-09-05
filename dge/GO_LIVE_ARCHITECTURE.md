# Go-Live Architecture — staging pipeline, access control, and content governance

Status: **proposal for the project lead's decision.** Nothing here is implemented yet.
Written 5 Sep 2026. Every "today" claim below was verified against the working tree
and, where marked ✔live, against the running site by anonymous request.

---

## 0. Read this first — three findings that change the plan

### 0.1 A private repository will not hide your licensed content

The plan assumed that moving DvaitaVedanta / Anandamakaranda / Advaita Sharada into a
private or non-public repository keeps them from the public. **It does not.** The site is
100% static: every corpus read is a plain relative `fetch()` of a static JSON file with no
credential of any kind (`dge/js/core.js:1014`, via `dgeLibraryPathToFetchPath()`). Whatever
the page renders, the visitor's own browser has already downloaded — from `sarvamula.org`
itself. They never need to find GitHub.

✔live, anonymous `curl`, no cookies, no auth:

| URL | Result |
|---|---|
| `…/SetuTila/dasha_prakarana_granthas/tattvaviveka/data.json` | **HTTP 200, 20,148 bytes** — and this entry is `hidden: true` |
| `…/DvaitaVedanta/later_acharyas/sumadhva_vijaya/tika_…/data.json` | HTTP 200 |
| `…/dge/data/library.json` | HTTP 200, 648 KB — a complete index of all 1,693 works |
| `…/admin/config/keys.json` | **HTTP 200, 2,887 bytes — every admin passkey in cleartext** |

Every `hidden` flag in this codebase is **cosmetic**, and the code says so itself in three
places — `admin-gate.js` ("never put a real secret behind it"), `core.js:995`, and
`global-search.js:1656` ("hides the hit from the UI, it does not restrict the underlying
static JSON file"). Setting `localStorage.is_superadmin='true'` in devtools defeats all
three; requesting the URL directly bypasses them without even that.

**Corollary:** a "staging" tier built as a second public branch or a second Pages site is
exactly as public as production. Privacy requires an authenticated *server* boundary, not a
repository setting.

### 0.2 Three things to fix now, before any of this

These are cheap and independent of the whole redesign:

1. **Rotate and retire the admin passkeys.** `admin/config/keys.json` is world-readable and
   holds every curator gate key; `dge/js/config.js:21` additionally hardcodes
   `secretPasskey` in shipped client JS. They were always documented as courtesy latches,
   not access control — but once the site is on a real domain with real users they should be
   *replaced* by the Firebase role model (§5), not migrated.
2. **Stop advertising the licensed corpora.** `sitemap.xml` publishes **299 DvaitaVedanta
   reader URLs** straight to search engines. Removing them does not make the data private,
   but it stops actively inviting indexing. One-line build change.
3. **Mark the licensed corpora at all.** Of the four attributed corpora, only SetuTila is
   flagged: DvaitaVedanta **0 of 316** entries, Anandamakaranda **0 of 47**, Advaita Sharada
   **0 of 51** carry `hidden`. Even as UI-polish that is inconsistent with the intent.

### 0.3 `main` is ~2.7× over the GitHub Pages limit

`main` is **2.72 GB** (`dge/data` alone 2.2 GiB). The published-Pages soft limit is 1 GB,
and this repo used to police it deliberately — commit `06887fb` is literally titled
"…and the site under 1 GB", and the 330 MB search index was moved to a `search-dist` branch
for that reason. That discipline has lapsed. Usefully, the fix aligns with §0.1: the
licensed corpora are **~878 MiB (~39% of `dge/data`)**, so moving them behind an API brings
`main` back toward the limit *and* makes them private. One change, two problems solved.

---

## 1. Ground truth today

| Aspect | Today |
|---|---|
| Hosting | GitHub Pages, "deploy from branch" `main`, root. `.nojekyll` present. No custom domain (no `CNAME`). |
| Deploy | **None.** No workflow deploys. **Any merge to `main` is the deploy.** No staging surface exists. |
| Build step | **None.** No root `package.json`/bundler; ~40 hand-versioned classic `<script>` tags. |
| Firebase | Declared but **inert**. `firebase.json` says it is "NOT the live deployment target yet". No `.firebaserc` (gitignored) — *the repo does not know which Firebase project it is.* No hosting targets, no `storage.rules`. |
| Auth | `AUTH_CONFIG.enabled = false` (`dge/js/config.js:597`); `FIREBASE_CONFIG` is all `REPLACE_WITH_YOUR_*`. |
| Real enforcement | **`dge/firebase/firestore.rules` only** — and it is genuinely good (see §5). Emulator-tested via `dge/firebase/tests/rules.test.js`. |
| Roles in code | `['basic','subscriber','sponsor','admin','superadmin','special']` — already defined, already enforced in rules, already has a superadmin-only "Manage Users" UI (`user-roles.js`). |
| Client gates | Four *parallel, inconsistent* spellings (see §5.3). All localStorage, all cosmetic. |
| Search index | 330 MB on a `search-dist` branch, served via **jsDelivr** — i.e. also anonymously downloadable, including DvaitaVedanta text. |
| Secrets | **No cloud credential is committed** (clean: no `AIza…`, no service-account, no PAT). Paid keys come from GitHub Actions secrets (server) and BYOK localStorage (browser). |

**The good news:** the two hardest pieces — a correct server-side role model, and a
declarative UI hook for the correction workflow — already exist. Most of this plan is
*activation and migration*, not new construction.

---

## 2. What "private" actually requires

There are exactly three ways to keep content from an anonymous visitor. Only the last two
are real.

| Approach | Actually private? | Notes |
|---|---|---|
| Private repo / non-`main` branch / `hidden` flag | ❌ No | Runtime fetch is unauthenticated; jsDelivr serves any branch of a public repo. |
| **Cloud Storage + short-lived signed URLs, minted by a Cloud Function after a role check** | ✅ Yes | Best fit for whole-grantha JSON. Files stay large and unchanged. |
| **Firestore documents guarded by `firestore.rules`** | ✅ Yes | Best fit for *small units*. **Hard cap: 1 MiB per document.** |

**Sizing reality:** 1,720 `data.json` files, average ~1.3 MB, several >2 MB (`core.js:1006`
notes "a full Rigveda maṇḍala (2MB+)"). So a naive document-per-grantha port to Firestore
**will not fit**. The gated corpora should go to **Cloud Storage with signed URLs**, with
Firestore reserved for per-unit records where sharding is genuinely wanted.

### 2.1 Recommended content tiers

Reuse the vocabulary that already exists and is enforced for Kosha
(`admin/config/kosha-overrides.json`) rather than inventing a parallel set — but give it
teeth by moving enforcement to the server:

| Tier | Anonymous visitor sees | Signed-in `basic` | `subscriber`/`sponsor` | `admin`+ |
|---|---|---|---|---|
| `public` | full text | full | full | full |
| `search_hidden` | not in search; readable by direct link | same | same | full |
| `restricted` *(new)* | **search teaser only** — grantha, category, "a match exists" | teaser | full text | full |
| `unlisted` | nothing; direct link only | direct link | direct link | full |
| `disabled` | nothing at all | — | — | admin only |

`restricted` is the tier your requirement describes: *"he will know the result is in
so-and-so grantha under so-and-so category, but clicking shows nothing further unless
authorised."*

### 2.2 The corpora this applies to

| Corpus | Path | Size | `data.json` | Flagged today |
|---|---|---|---|---|
| DvaitaVedanta (`dvaitavedanta.in`) | `darshana/vedanta/dvaita/DvaitaVedanta/` | **630 MiB** | 338 | 0 of 316 ❌ |
| Advaita Sharada (`advaitasharada.sringeri.net`) | `darshana/vedanta/advaita/` | **155 MiB** | 51 | 0 of 51 ❌ |
| SetuTila (`setutila.in`) | `darshana/vedanta/dvaita/SetuTila/` | 67 MiB | 47 | 47 of 47 ✔ (but still downloadable) |
| Anandamakaranda (`anandamakaranda.in`) | `darshana/vedanta/dvaita/SarvaMula/` | 26 MiB | 127 | 0 of 47 ❌ |

**Total ≈ 878 MiB.** Note SarvaMula is mixed — it holds Madhva's own mūla texts alongside
Anandamakaranda-sourced material, so it needs per-entry classification, not a blanket move.

### 2.3 Teaser search must be built, not filtered

`dge/build_search_index.py:447` writes each unit as `{"u","pk","ck","s"}` where **`s` is the
raw Devanāgarī text, up to 4,000 chars** — the shard *is* the content. Today's hiding is a
render-time filter in `global-search.js:1679` that is UI-only and **fails open** on a fetch
error.

So teaser-only search requires a **build-time change**: for `restricted` granthas emit
`s: ""` (or a redacted length hint) into the public index, and put the full shard behind the
same gated origin as the corpus. Add `visibility` to the grantha manifest row
(`build_search_index.py:490`) so `dge-search.js` can gate at hit-construction rather than
leaving it to the UI.

---

## 3. Environments: one repo, three targets (recommended)

You asked for three repositories. I'd advise **one repository, three deploy targets** —
same three gates, far less pain:

| | Three repos | **One repo, three environments (recommended)** |
|---|---|---|
| Promotion | Cherry-pick / re-apply across repos; histories diverge | `git merge --ff-only` — the safe-merge discipline already in use |
| The 2.7 GB corpus | Duplicated ×3 | Once |
| 34 content pipelines | Triplicated, or only run in one repo | Unchanged |
| "Did staging really get what testing approved?" | Hard to prove | Provable: identical commit SHA |
| Risk | Silent drift between stages | Drift impossible by construction |

### 3.1 Proposed shape

```
branch  test     →  Firebase project dge-test      →  test.sarvamula.org      (noindex)
branch  staging  →  Firebase project dge-staging   →  staging.sarvamula.org   (noindex, password)
branch  main     →  Firebase project dge-prod      →  sarvamula.org
```

- Each stage is a **separate Firebase project** — separate Firestore, separate rules
  deployment, separate user table, separate API keys. Testing can never touch live data.
- Promotion is **fast-forward only**, so a commit reaches live only by having passed through
  the earlier gates. No content change ever lands directly on `main`.
- `.firebaserc` gains three aliases; `firebase.json` gains three **hosting targets** (none
  exist today).
- Add the missing deploy workflows (there are none today): deploy-on-push per branch.

**If you still want three repos**, the workable variant is one *source* repo plus two
deploy-only mirrors that are force-pushed by CI and never committed to by hand. Say the
word and I'll write that instead — but the promotion guarantees are weaker.

### 3.2 Gates

| Gate | Who | Passes when |
|---|---|---|
| test | me (Claude) | Playwright suite + screenshots green; `pytest` (265) + `audit_library.py` + `validate_data.py` clean; auth flows pass against the emulator |
| staging | you + your 3–4 colleagues | UAT on real devices, real Google SSO / OTP against `dge-staging` |
| live | you alone | tag + fast-forward to `main` |

---

## 4. Can I still test once SSO / OTP is on? — Yes

This was your main worry. Auth does not blind me.

| Capability | How |
|---|---|
| Sign in as any role, headlessly | **Firebase Auth emulator** (already configured in `firebase.json`) + Admin-SDK **custom tokens** → `signInWithCustomToken`, saved as a Playwright `storageState`. |
| Screenshot the *same page* as each role | Three stored sessions: `basic`, `subscriber`, `admin`. This is how I prove the gating works rather than asserting it. |
| Prove a restriction actually holds | Negative tests: fetch a `restricted` URL **unauthenticated** and assert 403 — the test that would have caught today's problem. |
| Rules correctness | `dge/firebase/tests/rules.test.js` already runs must-fail cases against the emulator (`npm run test:rules`). Extend, don't rebuild. |
| Real Google popup / real SMS OTP | Verified **manually, once**, against `dge-test`. Not automated (Google deliberately blocks headless SSO, and real SMS costs money). Emulator covers regressions after that. |

Two rules I'd hold to: I never test against the live project, and any test-only bypass is
compiled out of the production build so it can't become a backdoor.

---

## 5. Auth and roles — activate, don't rebuild

### 5.1 What already exists and is correct

`dge/firebase/firestore.rules` already enforces, server-side:
- `callerRole()` reads `users/$(uid).data.role`; `isAdmin()` = role ∈ {admin, superadmin}.
- A user may create **only their own** doc and **only with `role:'basic'`** — no self-promotion.
- Self-edits restricted to an allowlist (`displayName, email, phoneNumber, whatsappOptIn, preferences, lastLoginAt`) with `role` unchanged.
- Only a superadmin may change another user's role. No client deletes.
- `otp_challenges` is `read, write: if false`. `broadcasts` readable by admins only.

### 5.2 What to add

1. `storage.rules` (does not exist) — gate the migrated corpora by `callerRole()`.
2. A Cloud Function `getGranthaUrl(slug)` — checks role, returns a short-lived signed URL.
3. Flip `AUTH_CONFIG.enabled = true` per environment; fill `FIREBASE_CONFIG` per project.
4. Map the tiers of §2.1 to roles in one place, server-side.

### 5.3 Reconcile the four client gates

There are currently four different spellings of "is this user an admin", and one is a latent
bug: `contextual-actions.js:124` checks `body.is-authorized`, a class **no file ever sets**
— so any `requires:"admin"` action silently never appears. Consolidate all four
(`admin-gate.js`, `menu.js`, `contextual-actions.js`, `library.js`) onto one helper reading
the Firebase claim, with localStorage kept only as an offline-dev fallback.

---

## 6. Content correction & reporting workflow

### 6.1 The hook already exists

`admin/config/contextual-actions.json` drives the ⋯ / right-click menu **declaratively**:
adding a `correction` action to `base.shloka`, `base.commentary`, `base.word` and
`base.page` puts "Report / suggest a correction" on every reader surface **with no JS
change**. Aṣṭādhyāyī already proves the pattern (`dgeCtxAshtaSutraCorrection`,
`ashtadhyayi.js:310`). `ICON_GLYPH` already has `edit: '✏️'`.

### 6.2 Extend the existing report envelope

`[DGE-CONTENT-GAP]` already exists with a strict, machine-parseable body
(`Type/Surface/Context/Page/Timestamp`) and is documented as *the* signal that authorises the
triage pipeline to act. **Keep those five lines exactly as they are** (two hand-written
copies depend on them) and append optional lines below:

```
Subject: [DGE-CONTENT-GAP] <type> — <surface>

Type: <type>            # canonical token, §6.3
Surface: <the item>
Context: <where it came from>
Page: <full URL incl. #unit>
Timestamp: <ISO-8601>
Grantha: <library slug>          # new
Unit: <unit / shloka / sutra id> # new
Layer: <tika folder, if any>     # new
Script: deva | iast | kn         # new
Expected: <what it should be>    # new
Observed: <what it is now>       # new
Severity: low | normal | high    # new
Reporter: <email, optional>      # new
```

Everything after `Timestamp:` is optional, so today's parser and both hand-written fallbacks
keep working. `dgeReportMissingForm(surface, context)` gains an optional third argument
(`extra`) — all four current call sites keep working unchanged.

### 6.3 The report taxonomy

Grouped by what a reader can actually notice. ✔ = already exists.

**A. Text corrections** (single-field, in `dge/data`)

| Type | Raised from | Captures |
|---|---|---|
| `sloka-correction` | a śloka | Grantha, Unit, Expected/Observed |
| `commentary-correction` | a ṭīkā/bhāṣya block | + Layer |
| `sutra-correction` ✔ | Aṣṭādhyāyī | Sūtra id |
| `dhatu-correction` | Dhātu page/dialogue | root, gaṇa, pada, seṭ, karma, artha |
| `shabda-correction` | Śabdapāṭha | stem, liṅga, vibhakti×vacana cell |
| `missing-form` ✔ | Śabda/Dhātu lookup | the surface form not found |
| `shabda-request` | Śabdapāṭha | a new stem to add |
| `translation-correction` | English/Kannada layer | + Layer, Script |
| `transliteration-correction` | any script toggle | Script |
| `attribution-correction` | source/licence line | Grantha |

**B. Metre / analysis**

| Type | Raised from |
|---|---|
| `chandas-verify` | a śloka whose metre reads wrong — `chandas-check.js` already registers a `chandas` action |
| `prakriya-correction` | a derivation step / sūtra attribution in the prakriyā ladder |

**C. Linking & cross-reference defects** (the largest class you listed)

| Type | Meaning |
|---|---|
| `xref-missing` | a citation in the text is not linked at all |
| `xref-wrong` | linked, but resolves to the wrong target |
| `sutra-backlink-missing` | an Aṣṭādhyāyī sūtra not highlighted / not linked back to the Aṣṭādhyāyī page |
| `unadi-ref-missing` | an Uṇādi sūtra not referenced |
| `itihasa-ref-missing` | a Mahābhārata/Rāmāyaṇa śloka not referenced |
| `footnote-link-broken` | footnote ↔ śloka bidirectional link missing or one-way |
| `layer-align` | a ṭīkā layer stitched to the wrong verse (`layer_manifest` `matched` count) |
| `entity-link-missing` | a person/maṭha/place not linked to Guru Paramparā |

**D. Search defects**

| Type | Meaning |
|---|---|
| `search-miss` | an expected hit is not returned (global / corpus / library scope) |
| `search-wrong` | an irrelevant or mis-attributed hit |
| `kosha-miss` | a headword lookup fails |
| `gloss-search-miss` | search-inside-meanings misses |

**E. Media / other** — `audio-missing`, `audio-wrong`, `image-issue`, and `ui-bug`
(always human-routed, never auto-applied).

### 6.4 Routing — what may ever be applied unattended

`dge/PENDING.md:1624` already fixes this boundary and says it needs your sign-off. I would
**not** widen it. Restated:

- **Eligible for an automated PR:** a *pure, mechanically-verifiable, single-field* data
  correction inside `dge/data/`, verified against an already-trusted source **before** it is
  applied, one file per report. In practice: group **A** only, and only when Expected/Observed
  are both present and the change is one field.
- **Never unattended:** anything touching `.github/workflows/`, `admin/`, `tools/`,
  taxonomy/schema, licensing/attribution text, or any file outside `dge/data/`; anything
  phrased as a *request* rather than a correction; anything the classifier is not highly
  confident about (default = not eligible). Groups **C, D, E** are *engineering* work, not
  data fixes — they always become issues.
- Untagged or malformed mail is left strictly alone.

### 6.5 End-to-end flow

```
reader ⋯ menu  ─┐
direct form    ─┼─→ [DGE-CONTENT-GAP] email → intake mailbox
Genie voice    ─┘        (resolveCorrectionSubmission() already produces
                          {intent, correctionText, context, status:'pending_review'}
                          and is currently 'not_wired' — this is its destination)
                                   │
                          scheduled Claude session
                          (the Sunday routine already reads tasks/WEEKLY_INSTRUCTIONS.md
                           and already checks Gmail; add a Correction-intake section)
                                   │
                    ┌──────────────┴──────────────┐
              group A, verified              everything else
                    │                              │
            PR onto `test`                 GitHub issue, verbatim
                    │
        my Playwright + validators
                    │
            you approve  →  staging  →  UAT  →  main → sarvamula.org
```

Note the two tag namespaces already in use must stay distinct: `[DGE]` = a task from you;
`[DGE-CONTENT-GAP]` = a content report from anyone.

---

## 7. Phasing

| Phase | Work | Depends on |
|---|---|---|
| **0 — now** | Rotate/retire passkeys; drop the 299 DvaitaVedanta URLs from `sitemap.xml`; flag the three unflagged corpora | nothing |
| **1** | Create 3 Firebase projects + `.firebaserc` aliases + hosting targets; add deploy workflows; stand up `test`/`staging` branches | project IDs from you |
| **2** | Activate auth per environment; consolidate the four client gates; extend `rules.test.js` | Phase 1 |
| **3** | Migrate the ~878 MiB of licensed corpora to Storage + signed-URL Function; add `storage.rules`; **this is the phase that makes them actually private** — and brings `main` back under the Pages limit | Phase 2 |
| **4** | Teaser search: `visibility` in the index build, redacted `s` for `restricted`, gated shards | Phase 3 |
| **5** | Correction workflow: contextual-actions entries, extended envelope, intake + triage | Phase 2 (needs identity for `Reporter`) |
| **6** | Custom domain `sarvamula.org` cutover | Phase 1–3 green |

Phase 0 is worth doing this week regardless of everything else.

---

## 8. Decisions I need from you

1. **One repo + three environments, or three repos?** (I recommend the former; §3.)
2. **Firebase project IDs** for test / staging / prod — the repo currently has no `.firebaserc`.
3. **Which corpora are `restricted` vs merely `search_hidden`?** My read: DvaitaVedanta,
   Advaita Sharada and SetuTila → `restricted`; SarvaMula needs per-entry triage because it
   mixes Madhva's own mūla with Anandamakaranda material.
4. **Who may read `restricted` content** — `subscriber` and above, or `admin` only?
5. **Sign-off on the auto-apply boundary** in §6.4 (it is deliberately narrow).
6. **Intake mailbox** — same address as today, or a dedicated one? (`appConfig.contactEmail`
   is already configurable without touching any page.)
