"""Adi Shankaracharya's Prasthanatrayi bhashya corpus
   -> darshana/vedanta/advaita/shankara_bhashya/<work>/bhashya/data.json   (+ /mula where a clean split exists)

Covers Shankara's authentic bhashyas on the three canonical pramanas:
  * Brahmasutra Bhashya (Shariraka Bhashya)
  * Upanishad Bhashyas (Isha, Kena, Katha, Prashna, Mundaka, Mandukya+Karika,
                        Taittiriya, Aitareya, Chandogya, Brihadaranyaka)
  * Gita Bhashya

SOURCES (licensing-clean-first):
  * Zenodo GRETIL dump (record 6466333) -- the GRETIL corpus as per-file .txt,
    repackaged CC-BY-4.0. IAST, with reference markers. That record only ships
    a SUBSET of the corpus: of the Shankara set, only Brahmasutra Bhashya and
    Aitareya Upanishad Bhashya are present as .txt. Used for those two.
  * GRETIL corpustei HTML transformations
    (gretil/corpustei/transformations/html/sa_*.htm) for the six Upanishad
    bhashyas NOT shipped in the Zenodo record (Isha, Prashna, Mandukya+Karika,
    Taittiriya, Chandogya, Brihadaranyaka). Same IAST text + reference markers,
    just delivered as HTML instead of .txt, so fmt is iast_htm.
  * GRETIL classic .htm (1_sanskr/...) for the Gita bhashya (bhgsbh_u).
  * sanskritdocuments.org ITX as an alternate for the Gita bhashya.

  NOTE: Kena / Katha / Mundaka bhashyas are NOT in the GRETIL corpus at all
  (GRETIL's index marks them "restricted / not available from TITUS"; the old
  1_veda/4_upa/ classic paths are dead). They are commented out below and left
  as a follow-up that will need the sanskritdocuments.org ITX path wired in.

The IAST text is transliterated to Devanagari for `sanskrit_text`; the original
IAST is kept in `transliteration`. Each work is chunked on the source file's own
reference markers (configurable per source). Where the source cleanly separates
mula from bhashya we can split into /mula and /bhashya; the default keeps each
reference unit whole in /bhashya (no data loss) and leaves a finer mula/bhashya
split as a follow-up refinement (see MARKER notes per work).

  >>> FIRST-RUN CHECK: GRETIL marker formats vary per file. On the first Actions
      run, eyeball one unit per work and, if the reference regex under-splits,
      tune WORKS[...]['marker'].  The importer logs unit counts to make this easy.
"""
import re
from common import http_get, to_text, write_grantha

try:
    from common import iast_to_dev, itrans_to_dev
except Exception:
    def iast_to_dev(s):  raise RuntimeError("indic-transliteration missing")
    def itrans_to_dev(s): raise RuntimeError("indic-transliteration missing")

ZEN = "https://zenodo.org/records/6466333/files"
GRETIL = "https://gretil.sub.uni-goettingen.de/gretil"
# GRETIL corpustei HTML transformations -- where the Upanishad bhashyas that the
# Zenodo record omits actually live. Same IAST text/markers, HTML wrapper.
GRC = f"{GRETIL}/corpustei/transformations/html"

# A GRETIL reference marker like  ĪśāUpBh_1  /  BĀU_1,1.1  /  BrSūBhā_1,1.1
# We split on any run "<letters/underscore>_<digits, dots, commas>".
DEFAULT_MARKER = re.compile(r"([A-Za-zĀĪŪṚṜḶṆṬḌṢŚṄÑṂḤāīūṛṝḷṇṭḍṣśṅñṃḥ]+_[\d,\.]+)")

WORKS = [
    # slug,                target subtree,                       source url,                                                    fmt
    ("brahmasutra_bhashya","darshana/vedanta/advaita/shankara_bhashya/brahmasutra_bhashya",
        f"{ZEN}/sa_bAdarAyaNa-brahmasUtra-comm.txt", "iast_txt", "Shariraka Bhashya"),

    # These six are NOT in the Zenodo record (all returned HTTP 404 there);
    # they live on GRETIL as corpustei HTML. Same IAST text + reference markers
    # (e.g. PrUp_1.1 / PrUpBh_1.1, ChUp_1,1.1 / ChUpBh_1,1.1), so fmt=iast_htm.
    ("isha",       "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/isha_upanishad",
        f"{GRC}/sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.htm", "iast_htm", "Isha Upanishad Bhashya"),
    ("prashna",    "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/prashna_upanishad",
        f"{GRC}/sa_praznopaniSad-comm.htm", "iast_htm", "Prashna Upanishad Bhashya"),
    ("mandukya",   "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/mandukya_upanishad",
        f"{GRC}/sa_mANDUkyopaniSad-comm.htm", "iast_htm", "Mandukya Upanishad + Gaudapada Karika Bhashya"),
    ("taittiriya", "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/taittiriya_upanishad",
        f"{GRC}/sa_taittirIyopaniSad-zaMkarabhASya.htm", "iast_htm", "Taittiriya Upanishad Bhashya"),
    ("aitareya",   "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/aitareya_upanishad",
        f"{ZEN}/sa_aitareyopaniSad-comm.txt", "iast_txt", "Aitareya Upanishad Bhashya"),
    ("chandogya",  "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/chandogya_upanishad",
        f"{GRC}/sa_chAndogyopaniSad-comm.htm", "iast_htm", "Chandogya Upanishad Bhashya"),
    ("brihadaranyaka","darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/brihadaranyaka_upanishad",
        f"{GRC}/sa_bRhadAraNyakopaniSadkANva-recension-comm.htm", "iast_htm", "Brihadaranyaka Upanishad Bhashya"),

    # Kena / Katha / Mundaka bhashyas: UNAVAILABLE. Not in GRETIL's corpus
    # (index says "restricted / not available from TITUS"), and the old classic
    # 1_veda/4_upa/ paths below are dead (HTTP 404). Left commented out pending a
    # separate follow-up to wire in the sanskritdocuments.org ITX fallback.
    # ("kena",    "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/kena_upanishad",
    #     f"{GRETIL}/1_sanskr/1_veda/4_upa/kenupsbu.htm", "iast_htm", "Kena Upanishad Bhashya"),
    # ("katha",   "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/katha_upanishad",
    #     f"{GRETIL}/1_sanskr/1_veda/4_upa/kathupsb_u.htm", "iast_htm", "Katha Upanishad Bhashya"),
    # ("mundaka", "darshana/vedanta/advaita/shankara_bhashya/upanishad_bhashya/mundaka_upanishad",
    #     f"{GRETIL}/1_sanskr/1_veda/4_upa/mundupsb_u.htm", "iast_htm", "Mundaka Upanishad Bhashya"),

    ("gita_bhashya","darshana/vedanta/advaita/shankara_bhashya/gita_bhashya",
        f"{GRETIL}/1_sanskr/6_sastra/3_phil/vedanta/bhgsbh_u.htm", "iast_htm", "Gita Bhashya"),
]

HEADER_JUNK = re.compile(r"(GRETIL|Göttingen|copyright|terms of usage|reference purposes|"
                         r"proofread|e-text|data-entered|analytic|Header|Description of the "
                         r"file|structure of references|additional notes|revisions:|"
                         r"word boundaries|custom devanagari encoding|checked against the ed|"
                         r"TEI encoding|mass conversion|Sanskrit corpus Text|"
                         r"recension with the commentary|ascribed to\s+\S+)", re.I)

# A different GRETIL quirk from the header aside above: many corpustei files
# glue an inline structural marker INTO the middle of a unit's body, with
# real Sanskrit both before and after it in the SAME body. Unlike HEADER_JUNK
# this isn't a preamble to truncate to; it's noise to cut out in place. Two
# independent shapes were confirmed by direct inspection of the fetched text:
#   * a run of divider punctuation (_, =, -), sometimes immediately followed
#     by a short label ("____ START MandUp 1", "____ BhG 13")            -- mandukya, brahmasutra_bhashya, gita_bhashya
#   * a bare "start <ref> <num>" label with NO divider at all, dropped at
#     nearly every verse boundary ("//1// START ChUp 1,1.2", "//1// start 1,2.2")
#                                                                          -- prashna, aitareya, chandogya, brihadaranyaka
# mandukya even mixes the two with genuine Sanskrit in between ("===== atha
# gauḍapādīyakārikāḥ START MandUpK 1.1 ..." -- a real section title sitting
# between the divider and its label), so these are stripped as three
# independent passes rather than one combined pattern, each narrow enough to
# never touch real content: this corpus is IAST (ā/ī/ṇ/ṭ/ḍ...), which never
# capitalises mid-word or uses the literal word "start", and divider
# punctuation never appears in real verse text.
STRUCTURAL_DIVIDER = re.compile(r"[_=\-]{4,}\s*(?:START\s+)?[A-Z][A-Za-z]*\s+\d+(?:[.,]\d+)*\s*")
INLINE_START_LABEL = re.compile(r"\bstart\b\s+[A-Za-z]*\.?\s*\d+(?:[.,]\d+)*", re.I)
BARE_DIVIDER_RUN = re.compile(r"[_=\-]{4,}")
# GRETIL also drops the occasional bracketed EDITORIAL note inline (e.g.
# "[*NOTE: BhG 18 not included!]") in gita_bhashya. Only strip notes tagged
# "*NOTE" -- other bracketed content in this corpus (e.g. brahmasutra_bhashya's
# "[atrāspaṣṭabrahmaliṅgayuktavākyānām...]") is a genuine Sanskrit section
# heading, not editorial noise, and must be kept.
EDITORIAL_NOTE = re.compile(r"\[\*NOTE:[^\]]*\]", re.I)


def _strip_gretil_header(text):
    """Drop the GRETIL preamble; keep from the first reference marker onward."""
    m = DEFAULT_MARKER.search(text)
    return text[m.start():] if m else text


def parse_units(text, marker=DEFAULT_MARKER):
    """Split reference-marked IAST text into [(ref, body)] units."""
    text = _strip_gretil_header(text)
    parts = marker.split(text)
    # marker.split yields [pre, ref1, body1, ref2, body2, ...]
    units = []
    i = 1
    while i < len(parts) - 1:
        ref = parts[i].strip()
        body = re.sub(r"\s+", " ", parts[i + 1]).strip()
        # Checked the real fetched Isha content directly: a GRETIL editorial
        # aside ("STRUCTURE OF REFERENCES ... GRETIL version has been
        # converted ... TEI encoding by mass conversion ...") sits
        # mid-document, immediately before one specific unit's own marker --
        # not only as a front-of-file preamble, which is the only case
        # _strip_gretil_header handles. A prior version dropped a whole unit
        # outright when HEADER_JUNK matched anywhere in its body, but the
        # junk text and the unit's real verse content are concatenated in
        # the SAME body here (the aside precedes real content, doesn't
        # replace it) -- dropping the whole unit would silently lose real
        # Isha 8 content instead of just the pollution. Strip everything up
        # through the LAST junk-phrase match instead of discarding the
        # unit: GRETIL's asides always describe the text (titling it) right
        # before real content resumes, so keeping only what follows the
        # last match reliably recovers the real content. (Checking the
        # whole body, not a fixed prefix window, isn't a false-positive
        # risk either way -- every phrase below is a specific multi-word
        # GRETIL editorial phrase that would never occur in genuine, even
        # transliterated, Sanskrit prose.)
        junk_matches = list(HEADER_JUNK.finditer(body))
        if junk_matches:
            body = body[junk_matches[-1].end():].strip(" .:;-")
        body = STRUCTURAL_DIVIDER.sub(" ", body)
        body = INLINE_START_LABEL.sub(" ", body)
        body = BARE_DIVIDER_RUN.sub(" ", body)
        body = EDITORIAL_NOTE.sub(" ", body)
        body = re.sub(r"\s+", " ", body).strip()
        if body:
            units.append((ref, body))
        i += 2
    return units


def to_items(units, transliterate=True):
    items = []
    for n, (ref, body) in enumerate(units, 1):
        it = {"id": f"unit_{n:04d}", "reference": ref}
        if transliterate:
            try:
                it["sanskrit_text"] = iast_to_dev(body)
                it["transliteration"] = body
            except Exception:
                it["sanskrit_text"] = body
        else:
            it["sanskrit_text"] = body
        items.append(it)
    return items


def fetch_text(url, fmt):
    raw = http_get(url)
    if fmt == "iast_htm":
        return to_text(raw)
    if fmt == "itx":
        return raw  # transliterated at unit level below (handled by caller variant)
    return raw  # iast_txt


def run(only=None):
    for slug, target, url, fmt, title in WORKS:
        if only and slug != only:
            continue
        print(f"{slug} <- {url}")
        try:
            text = fetch_text(url, fmt)
        except Exception as e:
            print(f"  ! fetch failed: {e}")
            continue
        units = parse_units(text)
        if not units:
            print("  ~ no units parsed (check marker regex)")
            continue
        items = to_items(units)
        # bhashya layer uses grantha_tika_text (sanskrit_text + reference + title)
        for it in items:
            it["tika_title"] = title
        write_grantha(f"{target}/bhashya", "grantha_tika_text",
                      "Sri Adi Shankaracharya", items)
        print(f"  {len(items)} units -> {target}/bhashya")


if __name__ == "__main__":
    import sys
    run(sys.argv[1] if len(sys.argv) > 1 else None)
