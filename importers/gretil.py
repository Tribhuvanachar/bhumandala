"""Generic GRETIL importer (IAST -> Devanagari). Handles any GRETIL e-text whose
verses end with a '// ABBR_canto.verse //' marker (Manu, Harivamsha, Raghuvamsha,
Shishupalavadha, other smritis/kavyas). Star-passage lines (starting '*') and
'[h: ... :h]' headers are skipped. Run:  python importers/dispatch.py <id>
"""
import re, collections
from common import http_get, strip_html, iast_to_dev, write_grantha

# id -> spec. unit = folder/label for each canto ('adhyaya'|'sarga').
# harivamsha/raghuvamsha/shishupalavadha target a "/mula" leaf -- matches
# the layer-folder convention already used for Ramayana/Mahabharata in the
# catalog (leaves room for a commentary layer alongside it later). Smritis
# below stay flat, matching their own already-scaffolded catalog entries.
GRETIL = {
  "harivamsha":        dict(name="Harivamsha", author="Maharshi Veda Vyasa", unit="adhyaya",
      schema="itihasa_purana_text", target="itihasas/harivamsha/mula",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/html/sa_harivaMza.htm"]),
  "manu_smriti":       dict(name="Manu Smriti", author="Manu", unit="adhyaya",
      schema="smriti_dharmashastra_text", target="smritis/manu_smriti",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/6_sastra/4_dharma/smrti/manu2p_u.htm"]),
  "yajnavalkya_smriti":dict(name="Yajnavalkya Smriti", author="Yajnavalkya", unit="adhyaya",
      schema="smriti_dharmashastra_text", target="smritis/yajnavalkya_smriti",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/6_sastra/4_dharma/smrti/yajn2_pu.htm"]),
  "parashara_smriti":  dict(name="Parashara Smriti", author="Parashara", unit="adhyaya",
      schema="smriti_dharmashastra_text", target="smritis/parashara_smriti",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/6_sastra/4_dharma/smrti/pars2_pu.htm"]),
  "narada_smriti":     dict(name="Narada Smriti", author="Narada", unit="adhyaya",
      schema="smriti_dharmashastra_text", target="smritis/narada_smriti",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/6_sastra/4_dharma/smrti/nars2_pu.htm"]),
  "vishnu_smriti":     dict(name="Vishnu Smriti", author="Vishnu", unit="adhyaya",
      schema="smriti_dharmashastra_text", target="smritis/vishnu_smriti",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/6_sastra/4_dharma/smrti/visnus_u.htm"]),
  "raghuvamsha":       dict(name="Raghuvamsha", author="Kalidasa", unit="sarga",
      schema="itihasa_purana_text", target="kavya/raghuvamsha/mula",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/5_poetry/2_kavya/kragh_pu.htm"]),
  "shishupalavadha":   dict(name="Shishupalavadha", author="Magha", unit="sarga",
      schema="itihasa_purana_text", target="kavya/shishupalavadha/mula",
      urls=["https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/html/sa_mAgha-zizupAlavadha.htm"]),
}

REF = re.compile(r"//\s*[A-Za-z]+_(\d+)[.,](\d+)")   # // ABBR_canto.verse (trailing // optional)

def parse(text, name, unit):
    text = strip_html(text)
    cantos = collections.OrderedDict()      # canto -> [ {number, sanskrit_text} ]
    buf = []
    seen_first_verse = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line[0] in "[%*#":   # header / comment / star-passage / marker
            continue
        m = REF.search(line)
        if m:
            before = line[:m.start()].strip()
            if not seen_first_verse:
                # Whatever accumulated before the very first verse marker is
                # GRETIL's standard page preamble (embedded CSS, encoding-
                # scheme description, copyright/credit lines) -- not verse
                # text, even though none of it happens to start with the
                # header markers skipped above. Confirmed for real: this
                # was getting transliterated into nonsense as "verse 1"
                # before this fix -- see PROJECT_STATUS.md.
                buf = []
                seen_first_verse = True
            buf.append(before)
            iast = " ".join(x for x in buf if x).strip()
            dev = iast_to_dev(iast).replace(" // ", " ॥ ").replace("//", "॥").replace(" / ", " । ").replace("/", "।")
            cantos.setdefault(int(m.group(1)), []).append({"number": int(m.group(2)), "sanskrit_text": dev})
            buf = []
        else:
            buf.append(line)
    return [{"id": f"{unit}_{c:02d}", "reference": f"{name}, {unit.title()} {c}", "shlokas": sh}
            for c, sh in cantos.items()]

def run(tid):
    spec = GRETIL[tid]
    all_text = "\n".join(http_get(u) for u in spec["urls"])
    items = parse(all_text, spec["name"], spec["unit"])
    write_grantha(spec["target"], spec["schema"], spec["author"], items)
