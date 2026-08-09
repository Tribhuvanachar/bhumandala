"""DGE importer shared helpers. Runs on a GitHub Actions Ubuntu runner
(full network). Writes data.json in the DGE 'itihasa_purana_text' shape.
"""
import os, re, json, html, urllib.request

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    def iast_to_dev(s):
        return transliterate(s, sanscript.IAST, sanscript.DEVANAGARI)
except Exception:                       # allows --dry parse tests without the dep
    def iast_to_dev(s):
        raise RuntimeError("pip install indic-transliteration (see importers/requirements.txt)")

def http_get(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": "DGE-importer/1.0 (educational)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def strip_html(doc):
    m = re.search(r"<pre[^>]*>(.*?)</pre>", doc, re.S | re.I)
    txt = m.group(1) if m else re.sub(r"<[^>]+>", "", doc)
    return html.unescape(txt)

def data_base():
    return "dge/data" if os.path.isdir("dge/data") else ("data" if os.path.isdir("data") else "dge/data")

def write_grantha(rel_path, schema, default_author, items):
    folder = os.path.join(data_base(), rel_path)
    os.makedirs(folder, exist_ok=True)
    fp = os.path.join(folder, "data.json")
    json.dump({"schema": schema, "default_author": default_author, "items": items},
              open(fp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n = sum(len(it.get("shlokas", [])) for it in items)
    print(f"  wrote {fp}  ({len(items)} units, {n} shlokas)")

try:
    from indic_transliteration import sanscript as _sc
    from indic_transliteration.sanscript import transliterate as _trx
    def itrans_to_dev(s):
        return _trx(s, _sc.ITRANS, _sc.DEVANAGARI)
except Exception:
    def itrans_to_dev(s):
        raise RuntimeError("pip install indic-transliteration (see importers/requirements.txt)")
