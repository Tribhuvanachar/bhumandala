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
| `config/library-overrides.json` | `dge/js/library.js` | `library.html`, exported and committed by hand |
| `config/library-status.json` | `library.html` | `tools/gen_library_status.py` — a generated snapshot of what is loaded |
| `config/site.config.json` | `tools/set_site_url.py` | hand-edited, then applied with that script |

`site.config.json` holds the site's own absolute URL. Almost nothing needs
it — the reader resolves its links relatively and runtime JavaScript uses
`location.origin`, both of which follow whatever domain served the page.
The exception is Open Graph metadata, which link-preview crawlers read
without executing JavaScript, so it has to be written into the HTML. Change
`siteOrigin` there and run `python3 tools/set_site_url.py`; never hand-edit
the tag it manages.

Both are shallow overrides: they hold only the fields actually changed, and
anything absent falls back to the defaults in `dge/js/config.js`. That file
stays the single source of structure and is never written by the UI.

## Config that is not here

Deliberately, because moving it would mean moving the code that owns it:

- **`dge/js/config.js`** — the defaults themselves: `appConfig`,
  `SPONSOR_CONFIG`, `CONTRIBUTORS_CONFIG`, `WHATS_NEW_CONFIG`,
  `FEATURE_FLAGS`, `AI_PROVIDERS`, `GITHUB_REPO_CONFIG`,
  `ADMIN_ACCESS_LEVELS`. Loaded by every page in the app.
- **`index.html`** at the repository root — `SITE_CONFIG`, holding every
  word of the landing page: masthead, tagline, the guru, the vandana, all
  button labels, flower and namaskāra settings, the three contributor
  bands, the Know More panels, and the closing lines.
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
  `dge/data/stotras/pns/`.
- `version.json` at the root — read by nothing. `dge/convert/version.json`
  is a different file and is still in use.
- `dge/data/tippanikaras.json`, `dge/data/_taxonomy.json` — no reader.

One consequence worth naming: anyone holding a link to
`PrahladaKrutaNarasimhaStotra.html` will now get a 404. The same stotra
lives in the library, so the content is not lost — only that URL.

## Two things worth knowing

**The passkey is not security.** `SHRI108` is still hardcoded in
`admin/kosha.html`. In a public repository anyone can read it in the page
source, so it gates convenience, not access, and should not be mistaken for
the latter. The dead `Config.json` that also carried it has been removed.

**Paths here are derived, not written.** `dge/js/core.js` resolves this
folder from its own script URL rather than from the page's, so the config
loads correctly from any page depth, and whether the site is served from a
domain root or from a project subpath such as
`tribhuvanachar.github.io/bhumandala/`.
