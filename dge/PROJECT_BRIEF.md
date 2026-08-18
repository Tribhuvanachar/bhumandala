# Sarvamūla Digital Library — Project Brief

_A self-contained context document. Written to be pasted whole into an AI
assistant (Gemini in Firebase, or any other) as background before asking
it for help. Figures verified against the repository on 17 Aug 2026;
regenerate with `tools/gen_library_status.py` for current truth._

_This is the **stable overview**. `PROJECT_STATUS.md` is the running
narrative log of what happened when, and `PENDING.md` is the live
backlog. When they disagree with this file, they are newer._

---

## 1. What this project is

A digital library of Sanskrit scripture and commentary, built for the
**Dvaita (Mādhva) tradition** — the Sarvamūla granthas of Śrī
Madhvācārya, their commentarial layers, and the surrounding corpus of
Vedas, Smṛtis, Purāṇas, Itihāsas, Haridāsa devotional literature, and
Sanskrit grammatical and lexicographic reference works.

It is part of the **Sarvamoola Digitisation & Educational Project**. The
software layer is called the **Digital Grantha Engine (DGE)**.

The purpose is preservation and study, not commerce: making primary texts
readable, searchable, cross-referenced, and permanently available in a
form scholars and devotees can actually use.

- **Repository:** `github.com/Tribhuvanachar/bhumandala`
- **Live site:** `tribhuvanachar.github.io/bhumandala` today. The custom
  domain `www.sarvamula.org` is expected to go live **29 Aug 2026 (or 18
  Sep if that slips)**. The canonical origin lives in `admin/config/site.config.json`
  and is applied by `tools/set_site_url.py`; see `PENDING.md` for the
  switchover checklist. Only link-preview metadata needs a fully
  qualified URL — everything else follows whatever domain served the
  page.
- **Reader app:** at `/dge/` — the site root is a Guru Vandana entry page
- **Sister repository:** `Tribhuvanachar/bhumandala-kosha-data` — the
  dictionary corpus, too large for the main repo, served via jsDelivr CDN
- **Current app version:** 4.63.0

## 2. Scale, as of this writing

| | |
|---|---|
| Catalogue entries (possible works) | ~700 |
| Leaves actually populated with text | 219 |
| Total verses / entries | **327,449** |
| Content data on disk | ~447 MB across ~4,000 JSON files |
| Prebuilt search index | ~162 MB |
| Dictionary corpus (sister repo) | 63 dictionaries, ~1.65M headwords |

The catalogue is deliberately larger than what is populated: it is the
full intended scope, with unpopulated leaves acting as visible stubs for
work still to come.

## 3. What is in the library

- **All four Vedas** — 42 granthas, with accented `samhita_patha` and
  `pada_patha`, plus chandas, svara, ṛṣi and devatā metadata. Ṛgveda
  (Śākala) is complete at 10,552 mantras, addressable both by
  Maṇḍala·Sūkta·Ṛk and by the traditional Aṣṭaka·Adhyāya·Varga·Ṛcā
  reference.
- **Sarvamūla granthas** of Madhvācārya, with commentarial layers.
- **Itihāsas** — Mahābhārata in two independent editions (a GRETIL
  Sanskrit text, and a 96,287-verse Kannada Pejāvara Maṭha edition with
  verse-by-verse meaning); Rāmāyaṇa.
- **Purāṇas** — including Bhāgavata in two editions kept deliberately
  separate (GRETIL, and a Madhva-tradition edition of 14,643 verses)
  because their chapter divisions genuinely diverge.
- **Smṛtis** — 20+ dharmaśāstra texts.
- **Vyāsakūṭa and Dāsakūṭa** — works by the acharyas (Vādirāja's Yukti
  Mallikā, Svapna-Vṛndāvanākhyāna) and Haridāsa devotional literature
  (Harikathāmṛtasāra, 947 verses).
- **Guru-charitre** — hagiographic kāvyas: Sumadhva Vijaya, Raghavendra
  Vijaya.
- **Stotras** — including Prahlādakṛta Nṛsiṁha Stotra, the original
  reference text the whole project was built around.
- **Reference layers** — Aṣṭādhyāyī with 7 toggleable commentary layers
  (Siddhānta-Kaumudī, Mahābhāṣya, Vasu's 1891 translation, and more);
  Dhātupāṭha; Kośa lexicography; Pāñcarātra Āgama; Tīrtha Prabandha;
  Guru Paramparā lineage trees.
- **Audio** — Vedic recitation (VedaVaNi), Sumadhva Vijaya (1,041
  files), Harikathāmṛtasāra.

## 4. Architecture — and why it is the way it is

**A static site with no backend and no build step.** Plain HTML, CSS and
classic `<script>` tags — no bundler, no framework, no npm at runtime.
Deployed from GitHub Pages straight off the repository.

This is a deliberate, load-bearing choice, not technical debt:

- The content must outlive the tooling. JSON files in a git repository
  are readable in twenty years; a bundle built by a toolchain that
  stopped being maintained is not.
- Anyone can fork the repo and have a working site.
- Zero hosting cost, zero operational burden, no server to keep patched.

Everything else follows from that. Content is JSON on disk, fetched by
path. Search is a prebuilt index shipped as static files. Transliteration
between six scripts (Devanāgarī, IAST, Kannada, Telugu, Tamil, Malayalam)
happens in the browser. AI features call Google's APIs **directly from the
user's browser** using the user's own key.

### The one exception: Firebase

Optional user accounts are the only backend this project has, added
August 2026 and deliberately isolated so any deployment can ignore them.
It is **off by default** (`AUTH_CONFIG.enabled = false`) and ships inert:
no Account button, no network calls, until explicitly enabled.

- **Google Sign-In** — free at any volume, the intended primary method.
- **Phone OTP over three interchangeable channels** — Firebase SMS
  (~₹0.85/verification), WhatsApp Cloud API (~₹0.145, ~6x cheaper), or
  MSG91. WhatsApp and MSG91 share one Cloud Functions backend.
- **Roles** — basic / subscriber / sponsor / admin / superadmin / special,
  enforced by Firestore security rules, not by client-side checks.
- **Opt-in WhatsApp broadcasts** — scheduled via Cloud Scheduler, with
  STOP replies honoured through a signature-verified webhook.
- **219 tests** covering the OTP state machine, the security rules
  (against the real Firestore emulator), the WhatsApp client, and the
  browser flow — none requiring credentials or costing money.

Full detail in `dge/FIREBASE_SETUP.md`.

## 5. How content gets in

Texts come from public corpora (GRETIL, VedaWeb, gitasupersite,
ashtadhyayi.com), from the project lead's own sources, and from
reverse-engineered Android app bundles where a text exists nowhere else
in digital form.

- **`importers/`** — Python importers per source, dispatched by
  `importers/dispatch.py`.
- **`tools/`** — extraction pipelines (`dvaitavedanta`, `vedavani`,
  `dasa_sahitya`, `audio_admin`), plus `gen_library_status.py`,
  `validate_data.py`, `register_layers.py`.
- **6 GitHub Actions workflows** — `ingest`, `ingest-commentaries`,
  `reindex` (search index + library status), `import-dasa-sahitya`,
  `extract-dvaitavedanta`, `vedavani-extract`.
- **`dge/convert/`** — a browser-only tool for scanned books: PDF → page
  images → Google Cloud Vision OCR → Gemini proofreading → DGE-schema
  JSON. No server; the user's own API keys, used from their own browser.

## 6. Conventions that must not be broken

1. **Cache-busting.** Every `<script>`/`<link>` carries `?v=VERSION`,
   bumped on every change. `index.html` is not cache-busted but stamps
   its own version in `<meta name="dge-html-version">`, checked against
   `DGE_EXPECTED_HTML_VERSION` in `core.js`. **Bump both together** when
   `index.html`'s structure changes, or stale tabs misbehave.
2. **BYOK — bring your own key.** GitHub tokens, Vision and Gemini keys
   live in the user's own `localStorage`, never hardcoded, never sent
   anywhere except directly to the relevant API from the user's browser.
   The project holds no user credentials for third-party services.
3. **Licensing: absence of a licence is not permission.** Copyright is
   automatic; an explicit grant is what makes reuse allowed. The project
   lead may authorise a specific source for a specific narrow use, case
   by case — each such decision is logged, never a standing default.
   Non-commercial purpose does not void a licence's stated terms.
4. **Don't fabricate.** Where a source or reading is not available, the
   correct output is "not available", not a plausible reconstruction.
   This is scripture; invented content is worse than missing content.
5. **Repository size budget** — the main repo stays under 1 GB. Corpora
   that exceed it get their own repo and a CDN (as the Kośa data did).

## 7. Guardrails for an AI assistant reading this

Advice that would be wrong for this project, and why:

- **"Move the content into Firestore."** No. 447 MB of static, rarely
  changing, publicly readable text is served correctly and freely by a
  CDN. In Firestore it would cost real money per read, gain nothing, and
  break the "readable in twenty years without this vendor" property.
- **"Add a build step / migrate to React/Next."** No. See §4 — the
  no-build-step constraint is the architecture, not an oversight.
- **"Put the API keys in environment variables on the server."** There is
  no server. See BYOK in §6. (The WhatsApp and MSG91 credentials are the
  sole exception, and they live in Firebase Secrets, never in client
  code.)
- **"Enable phone auth so users can sign up by SMS."** Costs real money
  per verification and requires the Blaze plan. Google Sign-In is free
  and is the intended default; phone OTP is opt-in and, when used,
  should prefer the WhatsApp channel on cost.
- **"Auto-translate / auto-generate the missing texts."** See rule 4.
  Unpopulated catalogue leaves are honest gaps awaiting a real source.

Useful things to know when advising:

- The audience is largely in India, on phones. The Cloud Functions
  deploy to `asia-south1` for that reason.
- Two admin systems run in parallel by design: an older localStorage
  passkey (`?superadmin=CODE`) and the new Firestore roles. They were
  deliberately not merged, to avoid disrupting a working daily workflow.
- Sanskrit text handling is genuinely hard here: six scripts, accented
  Vedic text, citation-form vs stem-form lexicon lookups, and sources
  that disagree about chapter divisions. Naive string matching across
  editions produces wrong results silently.

## 8. Where the project is heading

Immediate, in order:

1. **Turn on Google Sign-In** — create the Firebase project, paste the
   config, verify sign-in and role assignment end to end. Free.
2. **Decide on phone verification** — only if accounts prove useful, and
   with a billing cap set first.
3. **Continue populating the catalogue** — 219 of ~700 leaves are done.

Designed but not yet built (see `PENDING.md` for the full backlog):

- **"Intelligence" mode** — an opt-in reading overlay that detects
  cross-references live in the text and surfaces them on hover, backed by
  DGE's own precomputed cross-references rather than a live AI call.
- **Sanskrit TTS / chanting** — architecture documented, nothing built.
- **Edition comparison** — a diff view between parallel editions of the
  same text, blocked on a real alignment pass since chapter divisions
  genuinely diverge between manuscript traditions.
- **A permanent home for extracted audio** — currently only GitHub
  Actions artifacts with a 14-day expiry.
