# The authenticated corpus proxy, and the one-tap PDF

Two Blaze-plan features that are **built, tested and switched off**. Each is a
single string in `dge/js/config.js` away from being live, and the same string
blanked again is the whole rollback.

| | Off (today) | On |
|---|---|---|
| `corpusBase` | the reader fetches `dge/data/…/data.json` as a public static file | every grantha read goes through `corpusFile`, which checks the caller's role before serving from a **private** bucket |
| `bookPdfUrl` | the book builder's only route is **Prepare → the browser's print dialog → Save as PDF** | a second **Download PDF** button returns the finished file from `renderBook` |

Nothing is deleted at any point. The static files stay exactly where they are
until someone decides, separately, to stop publishing them.

---

## 1. Why the proxy exists

`dge/js/role-access.js` has said so in its own header since the day it was
written: every gate in this app is **UI-level**. `dgeIsHiddenPath` keeps a
text out of the Library drawer, global search keeps it out of results, and
`core.js` refuses a direct `?path=` link — but `data.json` is a public static
asset on Hosting. Anyone who knows or guesses the URL can fetch a gated
grantha, and no amount of client-side code can change that.

For the go-live shelf that was accepted deliberately: the four published works
are meant to be public, and "not listed yet" is an honest description of the
rest. For anything genuinely restricted it is not enough.

The proxy is the same decision, made where a visitor cannot bypass it.

### What decides

`dge/firebase/functions/lib/corpus-access.js` — pure, no Firestore, no
network, no Express, so the rule can be tested exhaustively (`corpus-access.test.js`,
51 tests). It mirrors `role-access.js` and the last block of that suite runs
identical inputs through **both** and asserts they agree. If they ever drift,
the reader would either offer a text the server refuses (ugly) or hide one the
server would serve (a quiet leak) — the test fails first.

The rule, in order:

1. **admin / superadmin** — allowed, always. This is the *stored* role from
   `users/<uid>`, never anything the client sends.
2. **the shelf** (`admin/config/library-overrides.json` → `shelf`) — if
   enabled, a path that is not an allow entry, an ancestor of one, or a
   descendant of one is refused, unless the role is in `openToRoles`.
3. **the gates** (Firestore `config/roleAccess` → `gates`) — deepest matching
   prefix wins; a role not in its `allowRoles` is refused.

A refusal answers **404, not 403**, with no reason in the body. "Forbidden" on
`darshana/…/SetuTila` confirms the text exists and is worth attacking; a flat
not-found tells a prober nothing. The real reason goes to the function log.

### Hostile paths are refused, not cleaned

`objectNameFor()` accepts exactly `<segment>/<segment>/…/data.json` where every
segment matches `[A-Za-z0-9._-]+`. Traversal, backslashes, NUL, encoded
separators, anything that is not a `data.json` — all refused outright.
Sanitising a bad path invites the next encoding that slips through.

All 1,728 real corpus paths pass this check; `tests/test_migrate_corpus_to_gcs.py`
walks the tree and asserts it, so a future import into a folder with a space or
a Devanagari name fails at commit time rather than 404ing in production.

### Where the shelf comes from at runtime

`corpusFile` fetches the live `library-overrides.json` over HTTPS
(`CORPUS_CONFIG_URL`), so **widening the shelf is a commit plus a Hosting
deploy, not a function redeploy**. The deploy workflow also copies that file
into the function directory as a floor: if the fetch fails on a cold start the
function must not end up with "no shelf", because no shelf means everything is
open, and failing open on a network blip is precisely what this exists to
prevent. Worst case with the snapshot is a stale shelf — and a stale one is
only wrong in the *widening* direction, since the deploy that narrows it
carries the new snapshot with it.

---

## 2. Turning the proxy on

**Step 1 — a private bucket.** Create it in `asia-south1`, uniform
bucket-level access, **no `allUsers` member**. A corpus bucket the public can
read is the same static hosting with extra steps.

**Step 2 — upload.** The script takes no credential on the command line (a
credential typed there lands in shell history and the process table); it uses
Application Default Credentials.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
python3 tools/migrate_corpus_to_gcs.py --bucket sarvamula-corpus            # dry run, no network
python3 tools/migrate_corpus_to_gcs.py --bucket sarvamula-corpus --apply
python3 tools/migrate_corpus_to_gcs.py --bucket sarvamula-corpus --verify
```

1,728 files, ~1.7 GB. The upload is resumable by construction: a run that dies
at file 900 re-checks the first 899 digests (metadata only, cheap) and uploads
the rest. There is no state file to go stale. The service account needs
`roles/storage.objectAdmin` on that bucket and nothing else.

`_references`, `_padaccheda`, `_commentary_sandhi` and the search index are
deliberately **not** migrated: every visitor loads them on every page view, so
a per-request role check would buy nothing and cost an invocation each.

**Step 3 — deploy the function.** Run **Deploy — Firebase Functions** with:

- `corpus_bucket` = `sarvamula-corpus`
- `corpus_prefix` = `corpus/` (must match the `--prefix` used above)
- `corpus_config_url` = `https://sarvamula-org.web.app/admin/config/library-overrides.json`

Leave `corpus_bucket` blank and `corpusFile` answers 503 — the reader is
unaffected, because it is not calling it yet.

**Step 4 — flip the switch.** In `dge/js/config.js`:

```js
corpusBase: "https://asia-south1-sarvamula-org.cloudfunctions.net/corpusFile",
```

Deploy Hosting. Done. To roll back, blank it and deploy again.

**Step 5 — only when you are satisfied**, stop publishing `dge/data/` on
Hosting. Until then both routes work and the switch is genuinely reversible.

### What it costs

Cloud Run's free tier is 2M requests, 180,000 vCPU-seconds and 360,000 GiB-seconds
a month. A corpus read is a metadata lookup plus a stream — tens of
milliseconds of CPU. Beyond the free tier it is $0.40 per million requests,
$0.000024/vCPU-s, $0.0000025/GiB-s, plus GCS egress. At go-live traffic the
expected bill is **zero**; the free tier does not run out until roughly two
million grantha reads a month.

The response is `Cache-Control: private, max-age=300` with `Vary: Authorization`
and a GCS ETag, so a reader moving between sargas and back re-reads from their
own browser cache, and a conditional request costs a 304 rather than the file.
`private` is not optional: the response depends on who asked, so a shared cache
must never serve an admin's copy to a visitor.

---

## 3. The one-tap PDF

`dge/js/book-builder.js` already builds a finished book and hands it to the
browser's print engine. That stays the default: it is free, needs no account,
and is the only engine in reach that shapes Devanagari conjuncts correctly —
jsPDF and pdfmake place glyphs one code point at a time, so क्ष and every other
saṃyuktākṣara come out broken. What the print dialog *cannot* do is hand back a
file.

`renderBook` is the same HTML, rendered by the same engine, returned as a
`.pdf`.

### Why it is safe to run

A headless Chromium rendering a document a caller sent us is a sharp tool. Left
alone it would fetch whatever the document points at — an internal URL, a
`file://` path, a deliberately slow endpoint.

- The client calls `dgeBuildStandaloneBook()`, which **inlines** the stylesheet
  and the imprint icon (as a `data:` URI) before posting. A correct book needs
  nothing from the network.
- The renderer therefore runs with **every request aborted** unless it is
  `data:`, `blob:` or `about:blank` (`bookRender.allowedRequest`), and with
  **JavaScript off**.
- An account is required (unlike the corpus proxy — rendering costs real CPU),
  and the `book` capability must name the caller's role.
- The posted document is capped at 8 MB, counted in **bytes**: a
  character-counting limit would let a Devanagari book through at three times
  the intended size.
- The title lands in a `Content-Disposition` header, so it is stripped to ASCII
  with the real title carried in `filename*=UTF-8''…`. Nothing a caller types
  can inject a header.

Verified 11 Sep 2026: a real 3-page A5 PDF, 169,860 bytes, fonts embedded,
**zero requests blocked during the render** — the document is genuinely
self-contained.

### Turning it on

Run **Deploy — Firebase Functions** with `install_pdf_renderer` ticked (adds
~170 MB to the image and a few minutes to the build), then set in `config.js`:

```js
bookPdfUrl: "https://asia-south1-sarvamula-org.cloudfunctions.net/renderBook",
```

and grant the `book` capability to the roles that should have it, in
**admin/access-control.html**.

`puppeteer` is an **optional** dependency: a deploy without the tick installs
with `--omit=optional`, `renderBook` answers 503, and every other function —
OTP, donations, the corpus proxy — deploys and runs normally. The Download
button does not even appear unless `bookPdfUrl` is set, because a "Download
PDF" that quietly opens a print dialog is the thing `book-builder.js`'s own
header says not to build.

---

## 4. Credentials

Nothing new is needed. `FIREBASE_SERVICE_ACCOUNT` is already in the repository
secrets and is the first key the deploy workflow tries. The only possible
additions are Google-side grants, not GitHub secrets:

- `roles/storage.objectAdmin` on the corpus bucket, for the account that runs
  the migration and for the function's runtime service account
  (`firebase-adminsdk-fbsvc@sarvamula-org.iam.gserviceaccount.com`);
- the Cloud Storage API enabled on the project, if it is not already.

Grant only what an actual error asks for, one at a time — the same discipline
`deploy-firebase-functions.yml`'s header records from 8 Sep 2026.
