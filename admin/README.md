# Admin

Every admin page and every hand-editable config file for the Sarvamūla
Digital Library. They used to be scattered through `dge/`; this folder is
the one place to look.

## Pages

| Page | What it manages |
|---|---|
| `library.html` | Library curation — hide, pin, reorder, rename, move. Exports `config/library-overrides.json`. |
| `kosha.html` | Kosha (lexicon) dictionaries and their status. |
| `ashtadhyayi.html` | Aṣṭādhyāyī sūtras, vṛttis and related data. |
| `audio.html` | Audio catalogue and playback metadata. |
| `dasa-capture.html` | Dāsa Sāhitya capture and entry. |
| `holy-places.html` | Holy places and brindāvana curation for Guru Paramparā. |

Reached from the shield icon in the library's top bar, which appears only
for authorised users.

Not moved: `dge/convert/` — the OCR and conversion tool is a self-contained
app of some fifteen files that reference each other relatively. It stays
where it is, and is still linked from the same admin menu.

## Config

| File | Read by | Written by |
|---|---|---|
| `config/config-overrides.json` | `dge/js/core.js` at boot, merged over `dge/js/config.js` | Site Settings, in-app (`dge/js/config-editor.js`) |
| `config/landing.json` | the landing page at the repository root, merged over its `SITE_CONFIG` | hand-edited |
| `config/menu.json` | `dge/js/menu.js` — which menu items appear, and in what order | hand-edited |
| `config/intellisense.json` | `dge/js/intellisense.js` — sūtra identification | hand-edited |
| `config/library-overrides.json` | `dge/js/library.js` | `library.html`, exported and committed by hand |
| `config/library-status.json` | `library.html` | `tools/gen_library_status.py` — a generated snapshot of what is loaded |
| `config/site.config.json` | `tools/set_site_url.py` | hand-edited, then applied with that script |
| `config/keys.json` | `js/keys.js`, used by every gated admin page | hand-edited |

Each file carries a `_readme` key listing what it accepts, so the file
itself is the reference and this table only has to say which is which.

`site.config.json` holds the site's own absolute URL. Almost nothing needs
it — the reader resolves its links relatively and runtime JavaScript uses
`location.origin`, both of which follow whatever domain served the page.
The exception is Open Graph metadata, which link-preview crawlers read
without executing JavaScript, so it has to be written into the HTML. Change
`siteOrigin` there and run `python3 tools/set_site_url.py`; never hand-edit
the tag it manages.

The override files hold only the fields actually changed; anything absent
falls back to the defaults in the code. `dge/js/config.js` and the
`SITE_CONFIG` block in the root `index.html` stay the single source of
structure, and neither is written by the UI.

`config-overrides.json` merges one level deep, which is all its flat
settings need. `landing.json` merges as deep as it has to, because the
landing page's config is nested — but arrays are replaced whole rather than
merged item by item, so reordering or dropping a contributor section is
expressible at all.

Every one of these fails open. A file that is missing, empty or malformed
leaves the defaults standing: the landing page still draws, the menus stay
as written in the markup, the gates stay shut. A broken config file is never
the reason something disappears or springs open.

### Which file owns what

Asked often enough to be worth stating once:

| To change | Edit |
|---|---|
| Which menu items appear, and their order | `config/menu.json` |
| Where sūtra citations become tappable, and word analysis | `config/intellisense.json` |
| Any word on the landing page, or where it leads | `config/landing.json` |
| Which reading scripts are offered | `SCRIPT_OPTIONS` in `dge/js/config.js` |
| Feature switches (theme picker, snippet tools, …) | `FEATURE_FLAGS` in `dge/js/config.js` |
| Passkeys | `config/keys.json` |
| Sponsor, contributors, what's new, contact | `config/config-overrides.json` |

## Config that is not here

Deliberately, because moving it would mean moving the code that owns it:

- **`dge/js/config.js`** — the defaults themselves: `appConfig`,
  `SPONSOR_CONFIG`, `CONTRIBUTORS_CONFIG`, `WHATS_NEW_CONFIG`,
  `FEATURE_FLAGS`, `AI_PROVIDERS`, `GITHUB_REPO_CONFIG`,
  `ADMIN_ACCESS_LEVELS`. Loaded by every page in the app.
- **`index.html`** at the repository root — `SITE_CONFIG`, the *defaults*
  for every word of the landing page: masthead, tagline, the guru, the
  vandana, all button labels, flower and namaskāra settings, the three
  contributor bands, the Know More panels, and the closing lines. To change
  any of it, put the change in `config/landing.json` rather than editing
  this block; the block is what remains if that file cannot be read.
- **`dge/data/`** — corpus data rather than settings: `library.json`,
  `taxonomy.json`, `schemas.json`, `tippanikaras.json`.

## Removed

Files that no code read, deleted rather than left to mislead. All of them
remain in git history if any is ever wanted back.

- `Config.json` — dead, and it carried the `SHRI108` passkey.
- `Claude.html`, `grok.html`, `MegaInteractive.html`, `Sunrise.html` —
  early prototypes of the reading page, superseded by `dge/`.
- `PrahladaKrutaNarasimhaStotra.html` and `data_pns.json` — a standalone
  copy of the Prahlāda-kṛta Nṛsiṃha Stotra, superseded by the live text at
  `dge/data/stotra/pns/`.
- `version.json` at the root — read by nothing. `dge/convert/version.json`
  is a different file and is still in use.
- `dge/data/tippanikaras.json`, `dge/data/_taxonomy.json` — no reader.

One consequence worth naming: anyone holding a link to
`PrahladaKrutaNarasimhaStotra.html` will now get a 404. The same stotra
lives in the library, so the content is not lost — only that URL.

## Two things worth knowing

**The passkeys are not security.** They now live in one place —
`config/keys.json` — instead of being string literals inside the five pages
they guarded. That makes them changeable; it does not make them secret. The
file sits in a public repository, and the page source reveals them anyway.
They stop an admin tool being opened by accident or wandered into. Nothing
genuinely sensitive belongs behind them. Real protection needs a server, or
the Firebase accounts being wired up in `dge/js/user-auth.js`.

**Paths here are derived, not written.** `dge/js/core.js`, `dge/js/menu.js`
and `js/keys.js` each resolve this folder from their own script URL rather
than from the page's, so the config loads correctly from any page depth, and
whether the site is served from a domain root or from a project subpath such
as `tribhuvanachar.github.io/bhumandala/`.

## The taxonomy restructure

`dge/data/` was reorganised onto the top level proposed in
`DGE_Shastra_Taxonomy.md`. What used to be a mix of categories, single works
and a drawer called `ancillary` now reads as a tree a student would
recognise:

| Was | Is |
|---|---|
| `ancillary/{shiksha,vyakarana,chandas,nirukta,jyotisha}` | `vedanga/…` — it was the Vedāṅgas all along |
| `ancillary/pratishakhya` | `vedanga/shiksha/pratishakhya` |
| `sutras/kalpa_sutras` | `vedanga/kalpa` |
| `vyakarana` | `vedanga/vyakarana` — merged beside the grammatical schools |
| `sarvamoola_grantha` | `darshana/vedanta/dvaita/sarvamula` |
| `shankara_bhashya` | `darshana/vedanta/advaita/shankara_bhashya` |
| `itihasas` / `puranas` / `stotras` / `koshas` | `itihasa` / `purana` / `stotra` / `kosha` |
| `smritis` / `dharmashastra` | `smriti_dharma/smriti` / `smriti_dharma/dharmashastra` |
| `kavya` | `kavya_alankara` |
| `pancharatra_agama` | `agama/pancharatra` |
| `dasakuta` / `vyasakuta` | `dasa_sahitya/dasakuta` / `dasa_sahitya/vyasakuta` |
| `vedas` | unchanged |

Two scripts did it, and both still run: `tools/restructure_taxonomy.py`
(reports by default, `--apply` moves) and `tools/migrate_slugs.py` (the
cross-references, the backlinks and the search-index shard names).

**Old links still work.** `DGE_LEGACY_SLUGS` in `dge/js/core.js` rewrites an
old `?path=` on the way in, so a bookmark or a shared link from before the
move lands on the text rather than on "Not Yet Available". That table is now
the only copy of the old names left in the codebase — don't delete it
because it looks redundant.

The search index was rewritten rather than rebuilt. Its postings are keyed
by grantha index, not by slug, so only the manifest, `backlinks.json` and
the shard filenames carried the old names. The result is what a rebuild
would have produced, for a fraction of the work.
