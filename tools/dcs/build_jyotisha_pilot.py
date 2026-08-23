#!/usr/bin/env python3
"""
build_jyotisha_pilot.py -- DCS pilot import, Suryasiddhanta into vedanga/jyotisha.

Digital Corpus of Sanskrit (DCS), Oliver Hellwig, 2010-2024, CC-BY 4.0.
Source files (2 chapters, 139 verses, an excerpt not the full 14-chapter
text) pulled from the primary mirror:
    https://github.com/OliverHellwig/sanskrit/tree/master/dcs/data/conllu/files/S%C5%ABryasiddh%C4%81nta
Licence is clean attribution-only (unlike AGPL chanda / CC-BY-SA skrutable
elsewhere in this project) -- no share-alike obligation, but attribution
is still recorded per-entry and at the top of the output file, matching
the sourcing convention in dge/kosha_toolkit/LICENSING.md.

This is a PILOT: proves the DCS CoNLL-U -> DGE "generic" schema mapping on
one text before deciding whether to scale to the rest of the 253-text
corpus. Re-run after copying more source .conllu files into vendor/.

Each DCS "sentence" is a half-verse (pada); sent_counter groups them into
whole verses (sent_subcounter 1, 2, ...). Devanagari sanskrit_text is
produced from the CoNLL-U file's IAST via skrutable's transliterator (the
one approved use of skrutable in this project: unmodified pip dependency,
no vendored/adapted code -- see dge/PENDING.md).

    pip install skrutable
    python3 tools/dcs/build_jyotisha_pilot.py
"""
import glob
import json
import os
import re

from skrutable.transliteration import Transliterator

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VENDOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "conllu")
OUT = os.path.join(REPO, "dge", "data", "vedanga", "jyotisha", "data.json")

CHAPTER_RE = re.compile(r"SūrSiddh,\s*(\d+)")

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
                chapter_num = int(m.group(1)) if m else None
            elif line.startswith("# text = "):
                text = line[len("# text = "):].strip()
            elif line.startswith("# sent_counter = "):
                counter = int(line.split("=")[1].strip())
            elif line.startswith("# sent_subcounter = "):
                subcounter = int(line.split("=")[1].strip())
                if text is not None and counter is not None and chapter_num is not None:
                    yield chapter_num, counter, subcounter, text
                text = None


def main():
    padas_by_verse = {}  # (chapter, verse) -> {subcounter: iast_text}
    for path in sorted(glob.glob(os.path.join(VENDOR, "*.conllu"))):
        for chapter, verse, subcounter, iast in parse_conllu_file(path):
            key = (chapter, verse)
            padas_by_verse.setdefault(key, {})[subcounter] = iast

    items = []
    for (chapter, verse) in sorted(padas_by_verse):
        padas = padas_by_verse[(chapter, verse)]
        iast_full = " ".join(padas[k] for k in sorted(padas))
        devanagari = _translit.transliterate(iast_full)
        item_id = f"{chapter}.{verse}"
        items.append({
            "id": item_id,
            "title": item_id,
            "text": devanagari,
            "notes": (
                "Source: Digital Corpus of Sanskrit (DCS), Oliver Hellwig, "
                "2010-2024, CC-BY 4.0. Devanagari produced from the DCS IAST "
                "transcription via skrutable's transliterator (pip dependency, "
                "no vendored code)."
            ),
            "tags": ["dcs-pilot"],
        })

    out = {
        "schema": "generic",
        "default_author": "unspecified",
        "source": "Digital Corpus of Sanskrit (DCS), Oliver Hellwig, 2010-2024",
        "source_url": (
            "https://github.com/OliverHellwig/sanskrit/tree/master/dcs/data/"
            "conllu/files/S%C5%ABryasiddh%C4%81nta"
        ),
        "licence": "CC-BY 4.0",
        "note": (
            f"Pilot import: {len(items)} verses across chapters "
            f"{sorted(set(c for c, v in padas_by_verse))} of Suryasiddhanta, "
            "as excerpted in DCS -- not the full 14-chapter classical text. "
            "See dge/PENDING.md for the DCS integration scoping decision "
            "this pilot exists to inform, and tools/dcs/README.md for how "
            "to extend it."
        ),
        "items": items,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(items)} verses to {OUT}")


if __name__ == "__main__":
    main()
