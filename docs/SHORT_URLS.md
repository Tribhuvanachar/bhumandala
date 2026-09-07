# Short URLs and the quick-jump grammar (7 Sep 2026)

One token addresses any verse the table below covers. It is the same grammar in three places: the address bar,
the Library's quick-jump box, and the link every Share / Copy action writes.

```
https://tribhuvanachar.github.io/bhumandala/?rv1.1.3       the front door forwards it to the reader
https://tribhuvanachar.github.io/bhumandala/dge/?rv1.1.3   the reader resolves it and keeps the short form in the address bar
https://tribhuvanachar.github.io/?rv1.1.3                  works once the user-site repository exists — see below
```

Fewer numbers name a larger unit and land on its first verse: `rv1.1` is sūkta 1.1, `rv1` is maṇḍala 1, `bhp10.14` is
adhyāya 14 of skandha 10. Keys are case-insensitive; `rv 1.1.3` and `rv=1.1.3` are accepted too. The internal
folder path is never part of the link, so the library can be reorganised without breaking a link anyone has shared:
only the `path` column of `dge/js/shortcuts.js` changes.

| key | text | numbers | example |
|---|---|---|---|
| `rv` | ऋग्वेदः | 3 (vedic) | `rv1.1.3 → maṇḍala 1, sūkta 1, mantra 3` |
| `av` | अथर्ववेदः (शौनकशाखा) | 3 (vedic) | `av20.143.9 → kāṇḍa 20, sūkta 143, mantra 9` |
| `avp` | अथर्ववेदः (पैप्पलादशाखा) | 3 (vedic) | `avp1.1.1` |
| `ts` | तैत्तिरीयसंहिता | 3 (vedic) | `ts1.8.22 → kāṇḍa 1, prapāṭhaka 8, anuvāka 22` |
| `vs` | वाजसनेयिसंहिता (माध्यन्दिन) | 2 (vedic) | `vs1.1 → adhyāya 1, mantra 1` |
| `sv` | सामवेदः (कौथुमशाखा) | 1 (vedic) | `sv1 → mantra 1 (pūrvārcika 1–650, uttarārcika 651–1875)` |
| `smv` | सुमध्वविजयः | 2 (shloka) | `smv1.5 → sarga 1, śloka 5` |
| `rgv` | राघवेन्द्रविजयः | 2 (shloka) | `rgv1.5` |
| `pns` | प्रह्लादकृतनृसिंहस्तोत्रम् | 1 (shloka) | `pns5 → śloka 5` |
| `bhp` | श्रीमद्भागवतम् | 3 (unit) | `bhp10.14.8 → skandha 10, adhyāya 14, śloka 8` |
| `mbh` | महाभारतम् | 3 (unit) | `mbh1.1.1 → ādi parva, adhyāya 1, śloka 1 (parvas 1–18 in order)` |
| `rm` | श्रीमद्रामायणम् | 3 (unit) | `rm2.1.1 → ayodhyā kāṇḍa, sarga 1, śloka 1 (kāṇḍas 1–7 in order)` |
| `hv` | हरिवंशः | 2 (unit) | `hv1.1 → adhyāya 1, śloka 1` |

## How it resolves

- **vedic**: the data's own dotted ids (`1.1.3` = maṇḍala.sūkta.mantra); a shorter token is matched as a prefix.
- **shloka**: one numbered file per sarga/chapter; the last number is the verse.
- **unit**: chapter files nested as items (itihāsa, purāṇa): `mbh12.3.7` → śānti parva, adhyāya 3, śloka 7 (`adhyaya_003#7`).
- The reader writes the short form back into the address bar as you read (`history.replaceState`), so a browser
  bookmark, the history list, and Share / Copy link all carry the verse — and the list page that holds it.

## Adding a key

Add one row to `TABLE` in `dge/js/shortcuts.js` (key, label, kind, levels, path template or `parts` list or `pick()`)
and `python3 -m pytest tests/test_shortcuts.py`, which resolves every key's example against the real data.

## The user site (`tribhuvanachar.github.io/?rv1.1.3`)

That address is served by a *user* Pages repository named `tribhuvanachar.github.io`, which does not exist yet
(the root returns GitHub's 404 page). Create that public repository with the single file
`tools/shortcuts/user-site-index.html` saved as `index.html`, enable Pages on it, and the short form works at the
root too. Until then `…/bhumandala/?rv1.1.3` is the canonical short address and what the reader shares.
