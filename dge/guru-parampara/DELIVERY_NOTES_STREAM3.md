# Stream 3 — Guru Parampara: Dāsa Paramparā + Brindavana images + holy-places admin

*Delivery notes for the reviewing/merging session (Claude Code on `main`). Scoped to
`dge/guru-parampara/` + `dge/data/parampara.json` per the Round-3 brief. Delivered as an
additive drop-in — no files outside this folder are touched except `guru-parampara/index.html`
(stats + two links). **Do not bundle with another stream.***

Start from a fresh `git pull origin main` before applying (per the Round-3 header).

---

## 1. Dāsa Paramparā (Haridāsa) lineage — DONE

**What was there:** `parampara.json` already had a nascent `haridasa` matha with **5** loosely-attached
`dasa` figures (Purandara, Kanaka, Vijaya, Gopala, Jagannatha) — but no built-out lineage: no
purvashrama, no brindavana/place, thin works, and no internal Dasakuta succession beyond the bare
guru links. The Round-3 brief flagged the Dāsa Paramparā as effectively missing.

**What changed:** the branch is now a **sourced 10-figure lineage** using the *exact same node schema*
as every other lineage (`id, name, guru, matha, tag, purva, titles, period, b, d, pont, brindavana,
place, works, contrib, confidence, sources, note, role, contemporaries`).

- **Enriched the 5 existing figures** (fill-if-empty on `purva`/`brindavana`/`place`; unioned `titles`,
  `works`, `sources`; corrected `period`/`contrib` where sourced):
  - **Purandara Dasa** — purva *Srinivasa Nayaka*; Brindavana *Purandara Mantapa, Hampi*; note on the
    2018 Karnataka-committee birthplace finding (Tirthahalli).
  - **Kanaka Dasa** — purva *Thimmappa Nayaka*; place/Brindavana *Kaginele (Kanaka Gurupeetha), Haveri*.
  - **Vijaya Dasa** — Brindavana *Chippagiri (Bhaskara Kshetra), Kurnool dist., AP*; titles *Dasa Shrestha /
    Suladi Dasaru*; disciples noted.
  - **Gopala Dasa** — purva *Bhaganna*; Brindavana *Uttanur, Raichur dist.*; period `c.1721–1762 (also 1769)`.
  - **Jagannatha Dasa** — purva *Srinivasacharya*; Brindavana *Manvi, Raichur dist.*; works +*Tattva Suvvali*;
    Harikathamruthasara detail (Bhamini Shatpadi, 32 sandhis / 988 stanzas).
- **Added 5 new figures** (all `matha:"haridasa"`, `tag:"dasa"`), attached at the correct point in the
  dasa-diksha succession:
  - **Mohana Dasa** (`mohanadasa`) — guru `vijayadasa` (foster son).
  - **Venugopala Dasa / Panganama Timmanna** (`venugopaladasa`) — guru `vijayadasa`.
  - **Helavanakatte Giriyamma** (`helavanakatte_giriyamma`) — guru `gopaladasa` (woman poet-saint).
  - **Prasanna Venkata Dasa** (`prasanna_venkatadasa`) — Bagalkot, `c.1680–1752`; guru `purandara` *(see note)*.
  - **Kakhandaki Mahipati Dasa** (`mahipatidasa`) — `1611–1681`; guru `purandara` *(see note)*.

`meta.node_count` 210 → **215**; `haridasa` count 5 → **10**; `meta.note` extended to describe the branch.

**Sourcing** — same convention as the original 19 lineages (Wikipedia + community/matha sites; see
`BUILD_REPORT.md` §2). Per-figure `sources` cite the specific Wikipedia articles (*Haridasa*, *Vijaya Dasa*,
*Gopala Dasa*, *Jagannatha Dasa (Kannada poet)*, *Purandara Dasa*, *Kanaka Dasa*, *Prasanna Venkata Dasa*,
*Mahipati Dasa*) plus `madhwayati.blogspot.com`.

**Two honesty flags (baked into the nodes' `note`, please don't "correct" back):**
1. `prasanna_venkatadasa` and `mahipatidasa` are attached to `purandara` **for grouping only** — a firmly
   documented dasa-dīkṣā guru is not attested for them in accessible sources. This follows the dataset's own
   existing convention of spiritual (not pontifical) links carrying an explicit `note` (cf. `vijayadasa`).
2. `mohanadasa`, `venugopaladasa`, `helavanakatte_giriyamma` have `b/d = null` (dates not firmly published);
   `confidence: "traditional"`.

**`contemporaries` (auto-computed field):** the original values were produced by `build_data.py`'s
lifespan/**pontificate** overlap algorithm, which is **not in the repo** (it was a dev-only generator). I
therefore **left every existing node's `contemporaries` untouched** and computed a best-effort list only for
the two new nodes that carry `b/d` (`prasanna_venkatadasa`, `mahipatidasa`), using pure `[b,d]` overlap. New
nodes without dates got `[]`. If you still have `build_data.py`, a full regeneration will recompute the field
globally (so the new dasas also appear in *others'* contemporaries lists) — that's the only thing a canonical
rebuild would add over this delivery. Tree integrity verified: **exactly one root (`narayana`), zero orphans.**

---

## 2. Brindavana images — INFRASTRUCTURE DONE, images left blank (environment could not licence-verify)

**Honest status:** in this Cowork sandbox, Wikimedia **Commons and the MediaWiki `api.php` are
unreachable** — WebFetch returns *"this domain is cache-only and cannot be fetched"* for
`commons.wikimedia.org`, its API, and `en.wikipedia.org/w/api.php`, and the environment's content rules
forbid working around that with `curl`/`python`. So I **could not fetch any image or read any file's
licence tag**. Per the brief's own rule — *"check each image's own licence… don't assume"* and *"leave it
blank rather than substituting an unrelated image"* — **no image URLs were embedded.** Fabricating hotlinks
without a verified licence would violate that rule. **All 102 shrine entries stayed blank (status: `pending`).**

**What *was* built so the images drop in cleanly (a one-shot data fill, no code change needed later):**
- A **curation registry** embedded in `parampara.json` under a new top-level key `brindavana_images`
  (also mirrored to `data/brindavana_images.json`), keyed by node `id`, one entry per manifest row (102):
  `{saint, brindavana, place, commons_search, image, image_page, image_credit, image_licence, status}`.
- The **2D and 3D detail cards now render the image** when present: `openDetail()` looks up
  `DATA.brindavana_images[id]` and, if `image` is set, shows the thumbnail (linked to `image_page`) with an
  `image_credit · image_licence` caption and a "via Wikimedia Commons" line. Guarded — invisible until filled.
- The **holy-places admin page (below) is the fill tool**: paste a verified Commons thumb URL + File-page +
  author + licence per shrine, then **⬇ Images JSON** exports `brindavana_images.json` to drop into
  `data/` and re-embed. No hand-editing of JSON required.

**To actually pull the images** (do this in a session/tool *with* Commons access — e.g. Claude Code on your
machine, or the maintainer by hand): each shrine already has its Wikimedia Commons search link in
`brindavana_image_manifest.md`. For each, pick a CC-BY / CC-BY-SA / CC0 / PD file, record its File-page,
author and licence, and either paste into the admin page or fill the registry directly.

**Blank list:** **all 102** are currently blank/pending — the full list is `brindavana_image_manifest.md`
(and `brindavana_images.json`). None were substituted with an unrelated image.

---

## 3. Holy-places admin — DONE (`guru-parampara/holy-places-admin.html`)

Same convention as `library-admin.html`: `SHRI108` gate (`sessionStorage "dge.admin.ok"`), identical CSS
design tokens, localStorage-backed edits, Blob-download export, dark-mode toggle. Client-side only (fits the
static-Pages model). Reached from a low-profile "Holy-places curation (admin)" link on `index.html`.

It seeds **135 places** from every `parampara.json` node that has a `brindavana` (110) or a `place` (25).
Per place you can edit **lat / lng / type / source**, **approve** or **hide**, and attach a **licence-checked
image** (URL / File-page / credit / licence); you can also **＋ Add place** and **🗑 Remove** custom ones.
Hero tiles track coverage (with lat-long %, approved, with-image %, hidden) — the same "every section gets a
progress tracker" pattern as Guru Parampara's own tracker and Library Manager.

### Shared data shape — the Stream 4 contract (please align field names)

**⬇ Holy-places JSON** exports `holy-places.json` as:

```json
{
  "places": [
    { "id": "raghavendra", "name": "Mantralaya (Manchale)", "saint": "Raghavendra Tirtha (Rayaru)",
      "town": "Adoni taluk, Kurnool dist., AP", "lat": 15.9457, "lng": 77.4386,
      "type": "brindavana", "sourceDataset": "guru-parampara", "approved": true,
      "hidden": false, "source": "srsmatha.org",
      "image": null, "image_page": null, "image_credit": null, "image_licence": null }
  ]
}
```

**Stream 4 (Tīrtha Prabandha) must export the same object shape** with `sourceDataset:"tirtha-prabandha"`.
The **minimum the "nearest holy place" finder needs is `{id, name, lat, lng, type, sourceDataset}`** (exactly
the fallback shape named in the brief); `approved`/`hidden` let it filter to vetted, public places. Merge the
two `places[]` arrays and you have one dataset for the shared geolocation feature. **Field names are frozen
here** — `lat`/`lng` (not `latitude`/`longitude`), `sourceDataset` (camelCase), `type` from
`brindavana|tirtha|temple|matha|place|other`.

---

## 4. Files changed / added

| File | Change |
|---|---|
| `data/parampara.json` | +5 nodes, 5 enriched, `node_count`→215, `meta.note` extended, **+`brindavana_images` key (102)** |
| `data/brindavana_images.json` | **new** — image curation registry (mirror of the embedded key) |
| `lineage-2d.html` | re-embedded data; `openDetail()` renders Brindavana image when present |
| `lineage-3d.html` | re-embedded data; `openDetail()` renders Brindavana image when present |
| `tracker.html` | re-embedded data (auto-recomputes; now covers the 215 nodes) |
| `holy-places-admin.html` | **new** — SHRI108 curation page + shared-shape export |
| `index.html` | stats 210→215 / "20 lineages incl. Dāsa Paramparā"; lede mention; admin link |
| `DELIVERY_NOTES_STREAM3.md` | this file |

## 5. Verified

Headless Chromium render of all four HTML views: **zero console / page errors**; embedded `node_count=215`,
`haridasa=10`, `brindavana_images=102`; Purandara & Jagannatha detail cards show the enriched fields; the
admin page gates, seeds 135 place cards, and its export/stat logic runs clean. Tree validated: one root
(`narayana`), zero orphan guru refs.

## 6. Not done here (out of scope / needs Commons access) — flagged, not silently skipped

- **Actual image binaries/URLs** — blocked by the sandbox's no-Commons rule (see §2). Infrastructure + fill
  tool are ready; the data fill is a no-code follow-up in a Commons-capable session.
- **Global `contemporaries` recompute** — needs `build_data.py` (not in repo); existing values left intact (§1).
- **lat/long values** — the admin page is ready to receive them; none were auto-filled (the same Commons/geo
  lookups are blocked here). Coordinates for the famous shrines (Mantralaya, Nava Brindavana/Anegundi, Mulbagal,
  Kaginele, Manvi, Uttanur, Chippagiri…) are a quick fill in the admin page.
