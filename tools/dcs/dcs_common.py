"""
dcs_common.py -- shared CoNLL-U -> DGE "generic" schema conversion, factored
out of build_jyotisha_pilot.py so later DCS imports (build_sivasutra.py and
whatever follows) don't re-derive the same parsing logic.

DCS CoNLL-U convention used here: each "sentence" is one pada (verse-line)
or, for prose sutra texts, one whole sutra; `sent_counter` groups a text's
sentences into verses/units, `sent_subcounter` orders the padas within one
(sutra texts have exactly one subcounter per unit; verse texts typically
have two, matching a shloka's two half-verses).
"""
import glob
import json
import os
import re

from skrutable.transliteration import Transliterator

CHAPTER_RE = re.compile(r",\s*(\d+)\s*$|,\s*(\d+)-\d+")

_translit = Transliterator(from_scheme="IAST", to_scheme="DEV")


def parse_conllu_file(path):
    """Yield (chapter_num, sent_counter, sent_subcounter, iast_text)."""
    chapter_num = None
    with open(path, encoding="utf-8") as f:
        text = counter = subcounter = None
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("## chapter:"):
                m = CHAPTER_RE.search(line)
                if m:
                    chapter_num = int(m.group(1) or m.group(2))
            elif line.startswith("# text = "):
                text = line[len("# text = "):].strip()
            elif line.startswith("# sent_counter = "):
                counter = int(line.split("=")[1].strip())
            elif line.startswith("# sent_subcounter = "):
                subcounter = int(line.split("=")[1].strip())
                if text is not None and counter is not None and chapter_num is not None:
                    yield chapter_num, counter, subcounter, text
                text = None


def build_generic_import(
    vendor_dir, out_path, *, source_name, source_url, licence, note, tag,
    default_author="unspecified",
):
    """Parse every .conllu file in vendor_dir and write a DGE 'generic'
    schema data.json to out_path. Returns (item_count, chapters_seen)."""
    padas_by_unit = {}  # (chapter, unit) -> {subcounter: iast_text}
    for path in sorted(glob.glob(os.path.join(vendor_dir, "*.conllu"))):
        for chapter, unit, subcounter, iast in parse_conllu_file(path):
            key = (chapter, unit)
            padas_by_unit.setdefault(key, {})[subcounter] = iast

    items = []
    for (chapter, unit) in sorted(padas_by_unit):
        padas = padas_by_unit[(chapter, unit)]
        iast_full = " ".join(padas[k] for k in sorted(padas))
        devanagari = _translit.transliterate(iast_full)
        item_id = f"{chapter}.{unit}"
        items.append({
            "id": item_id,
            "title": item_id,
            "text": devanagari,
            "notes": (
                f"Source: {source_name}, CC-BY 4.0. Devanagari produced from "
                "the DCS IAST transcription via skrutable's transliterator "
                "(pip dependency, no vendored code)."
            ),
            "tags": [tag],
        })

    out = {
        "schema": "generic",
        "default_author": default_author,
        "source": source_name,
        "source_url": source_url,
        "licence": licence,
        "note": note.format(count=len(items), chapters=sorted(set(c for c, u in padas_by_unit))),
        "items": items,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    return len(items), sorted(set(c for c, u in padas_by_unit))
