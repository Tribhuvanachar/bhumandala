"""Adi Shankaracharya's Prasthanatrayi bhashya corpus
   -> shankara_bhashya/<work>/bhashya/data.json   (+ /mula where a clean split exists)

Covers Shankara's authentic bhashyas on the three canonical pramanas:
  * Brahmasutra Bhashya (Shariraka Bhashya)
  * Upanishad Bhashyas (Isha, Kena, Katha, Prashna, Mundaka, Mandukya+Karika,
                        Taittiriya, Aitareya, Chandogya, Brihadaranyaka)
  * Gita Bhashya

SOURCES (licensing-clean-first):
  * Zenodo GRETIL dump (record 6466333) -- the GRETIL corpus as per-file .txt,
    repackaged CC-BY-4.0. IAST, with reference markers. Primary for the works
    present in the corpustei set.
  * GRETIL classic .htm (1_sanskr/...) for the works not in corpustei
    (Kena / Katha / Mundaka bhashyas, and the Gita bhashya bhgsbh_u).
  * sanskritdocuments.org ITX as an alternate for the Gita bhashya.

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

# A GRETIL reference marker like  ĪśāUpBh_1  /  BĀU_1,1.1  /  BrSūBhā_1,1.1
# We split on any run "<letters/underscore>_<digits, dots, commas>".
DEFAULT_MARKER = re.compile(r"([A-Za-zĀĪŪṚṜḶṆṬḌṢŚṄÑṂḤāīūṛṝḷṇṭḍṣśṅñṃḥ]+_[\d,\.]+)")

WORKS = [
    # slug,                target subtree,                       source url,                                                    fmt
    ("brahmasutra_bhashya","shankara_bhashya/brahmasutra_bhashya",
        f"{ZEN}/sa_bAdarAyaNa-brahmasUtra-comm.txt", "iast_txt", "Shariraka Bhashya"),

    ("isha",       "shankara_bhashya/upanishad_bhashya/isha_upanishad",
        f"{ZEN}/sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.txt", "iast_txt", "Isha Upanishad Bhashya"),
    ("prashna",    "shankara_bhashya/upanishad_bhashya/prashna_upanishad",
        f"{ZEN}/sa_praznopaniSad-comm.txt", "iast_txt", "Prashna Upanishad Bhashya"),
    ("mandukya",   "shankara_bhashya/upanishad_bhashya/mandukya_upanishad",
        f"{ZEN}/sa_mANDUkyopaniSad-comm.txt", "iast_txt", "Mandukya Upanishad + Gaudapada Karika Bhashya"),
    ("taittiriya", "shankara_bhashya/upanishad_bhashya/taittiriya_upanishad",
        f"{ZEN}/sa_taittirIyopaniSad-zaMkarabhASya.txt", "iast_txt", "Taittiriya Upanishad Bhashya"),
    ("aitareya",   "shankara_bhashya/upanishad_bhashya/aitareya_upanishad",
        f"{ZEN}/sa_aitareyopaniSad-comm.txt", "iast_txt", "Aitareya Upanishad Bhashya"),
    ("chandogya",  "shankara_bhashya/upanishad_bhashya/chandogya_upanishad",
        f"{ZEN}/sa_chAndogyopaniSad-comm.txt", "iast_txt", "Chandogya Upanishad Bhashya"),
    ("brihadaranyaka","shankara_bhashya/upanishad_bhashya/brihadaranyaka_upanishad",
        f"{ZEN}/sa_bRhadAraNyakopaniSadkANva-recension-comm.txt", "iast_txt", "Brihadaranyaka Upanishad Bhashya"),

    # Not in the corpustei/Zenodo set -- GRETIL classic .htm (verify filenames on first run):
    ("kena",    "shankara_bhashya/upanishad_bhashya/kena_upanishad",
        f"{GRETIL}/1_sanskr/1_veda/4_upa/kenupsbu.htm", "iast_htm", "Kena Upanishad Bhashya"),
    ("katha",   "shankara_bhashya/upanishad_bhashya/katha_upanishad",
        f"{GRETIL}/1_sanskr/1_veda/4_upa/kathupsb_u.htm", "iast_htm", "Katha Upanishad Bhashya"),
    ("mundaka", "shankara_bhashya/upanishad_bhashya/mundaka_upanishad",
        f"{GRETIL}/1_sanskr/1_veda/4_upa/mundupsb_u.htm", "iast_htm", "Mundaka Upanishad Bhashya"),

    ("gita_bhashya","shankara_bhashya/gita_bhashya",
        f"{GRETIL}/1_sanskr/6_sastra/3_phil/vedanta/bhgsbh_u.htm", "iast_htm", "Gita Bhashya"),
]

HEADER_JUNK = re.compile(r"(GRETIL|Göttingen|copyright|terms of usage|reference purposes|"
                         r"proofread|e-text|data-entered|analytic|Header|Description of the "
                         r"file)", re.I)


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
        if body and not HEADER_JUNK.search(body[:120]):
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
