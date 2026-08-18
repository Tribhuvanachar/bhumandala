# Where Sāyaṇa can actually come from — measured, not assumed

Everything here was measured from a GitHub Actions runner in August 2026.
`AUDIT.md` remains the survey of what exists; this is the record of what is
*reachable* and what is *alignable*, both of which turned out differently from
the assumptions the importer was built on.

## 1. Reachability

| Source | bot UA | curl default | |
|---|---|---|---|
| wisdomlib.org — mantra page | 403 | 403 | refused |
| wisdomlib.org — **`/robots.txt`** | 403 | 403 | refused |
| sacred-texts.com | 403 | 403 | refused |
| archive.org (details / metadata / search API) | 200 | 200 | **open** |
| sanskritdocuments.org | 200 | 200 | **open** |
| sa.wikisource / en.wikisource API | 200 | 200 | **open** |
| GRETIL | 404 | 404 | host up; probe URL was stale |
| TITUS Frankfurt | 200 | 200 | **open** |
| VedaWeb (Cologne) | 418 | 418 | host up, refuses programmatic access |

The premise the package was built on — "Actions has open egress; the authoring
sandbox does not" — is false for wisdomlib and sacred-texts, and true for
everything else. A 50-mantra wisdomlib run returned **50 pages fetched, 0
imported, 250 consecutive 403s**.

**wisdomlib refuses `/robots.txt` itself.** A site cannot state a crawler policy
to an address it will not talk to, so this is an edge rule against datacenter IP
ranges, not a decision about crawlers. Codespaces, Colab and any VPS sit in the
same ranges. A consumer connection does not — hence `run_on_phone.sh` and
`PHONE.md`. Nothing there disguises a request; the User-Agent stays honest.

## 2. The archive.org scans are alignable — a correction to AUDIT.md

`AUDIT.md` ruled the scans out on the grounds that Devanagari OCR "is not good
enough to ingest unreviewed". That judgement was made on the reputation of
Devanagari OCR rather than on this scan, and it is too pessimistic.

`archive.org/details/rgveda-with-sayanabhasya` carries a full OCR text layer —
four files, ~25 MB, one per maṇḍala group. The maṇḍala-1 file is 2.9 M
characters, 119,646 Devanagari to 112 Latin in a sampled slab. It is **readable
Sanskrit**, citing Yāska (`निरु. ६.१४`) and Pāṇini (`पा. सू. २.४.८०`), with
recognisable errors — `ऐश्वयवन्तं` for `ऐश्वर्यवन्तं`, `तुवेणिः` for `तुर्वणिः` —
rather than noise.

Crucially, the edition prints, per mantra and in order:

```
<saṃhitā-pāṭha>  … ॥ N ॥
<pada-pāṭha>     … ॥ N ॥
<Sāyaṇa's bhāṣya>
```

**4,242 `॥ N ॥` markers for 2,006 mantras** — 2.1 per mantra, exactly as that
structure predicts. So the mantra's own text sits immediately before its
commentary, and DGE already holds the saṃhitā-pāṭha for all 10,552 mantras.
Alignment therefore needs no page map: walk DGE's mantras in order, score each
against the OCR blocks, and the bhāṣya is what lies between one match and the
next. Every cut is self-verifying — the thing matched is the mantra DGE already
has, so a wrong cut cannot look right.

### Measured so far

| Attempt | Method | Located |
|---|---|---|
| Round 1 | exact 18-char substring | 151/2006 (7.5%) |
| Round 2 | `॥ N ॥` segmentation + similarity ratio | **709/2006 (35.3%)** |

Round 1's failure was the matcher, not the source: an exact 18-character
substring needs six consecutive akṣaras all OCR'd correctly, which at this error
rate rarely holds. Every one of its 151 hits landed exactly on its mantra.

Round 2 finds **all eight mantras of sūkta 1.1**, at similarities 0.63–0.89. But
the overall distribution is bimodal — median 0.27, p75 0.72 — which means it
matches well or not at all, and loses sync partway.

### What is not yet done

35% is not shippable, and the remaining work is ordinary engineering, not a
research question:

- **Sync recovery.** The cursor only advances on a hit, so once the 8-block
  window drifts past a mantra it stays lost. It needs re-anchoring on the
  `॥ N ॥` numbering, which is readable independently of the text.
- **Match on the pada-pāṭha too.** DGE holds `pada_patha_plain`, and the
  word-separated form is more distinctive than the sandhi-joined saṃhitā text.
  Two independent keys per mantra would also make a wrong match far less likely.
- **False markers.** Some of the 4,242 are sūkta and anuvāka ends, not mantra
  ends; they should be classified rather than counted.
- **Attribution and rights.** The item states no licence. The 1930s–50s Vaidika
  Saṃśodhana Maṇḍala edition's own status needs checking before publishing, even
  though Sāyaṇa's text is long out of copyright.
- **Label it as OCR.** Whatever lands should be marked as uncorrected OCR of a
  scan, not presented as a critical edition.

## 3. What this changes

If the alignment is finished, Sāyaṇa becomes obtainable **from Actions**, with no
residential connection anywhere, and in **Sanskrit** — Sāyaṇa's own words rather
than Wilson's 1850s English rendering of him, which is all the wisdomlib route
would ever have given.

Until then `run_on_phone.sh` remains the working route, and it delivers Wilson's
Sāyaṇa complete for all 10,552 mantras in about 3.5 hours.

The two are not exclusive. `commentaries.sayana` and `commentaries.wilson` are
separate keys, and `dge/js/core.js` already labels both.

## 4. sanskritebooks.org

Suggested as a source; probed but not yet cleanly read back. Every Sāyaṇa result
from an independent search resolved to archive.org rather than to a file hosted
there, so the working assumption is that it indexes the same scans. Worth
confirming before spending effort on it.
