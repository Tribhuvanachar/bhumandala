#!/usr/bin/env python3
"""Stage E′ — take answers pasted back from a Gemini chat, fold them into verify_output/answers.json, apply.

    python3 tools/saroddhara/apply_chat_answers.py answers_chunk1.txt [chunk2.txt ...]
    pbpaste | python3 tools/saroddhara/apply_chat_answers.py -            # stdin
    python3 tools/saroddhara/apply_chat_answers.py chunk.txt --no-apply   # only update answers.json
    python3 tools/saroddhara/apply_chat_answers.py chunk.txt --sync-bhagavata   # decision=printed also rewrites the DGE Bhāgavata mūla

One text, not two: the DGE Madhva Bhāgavata is the master. decision=dge copies the master into the Sāroddhāra;
decision=printed (a confirmed variant reading in the printed edition) rewrites the Sāroddhāra and, with
--sync-bhagavata, the matching shloka in dge/data/purana/maha_purana/bhagavata_purana_madhva as well, keeping the
old text in the shloka's `previous_text` + `revision` fields so the change is reviewable.

Input is whatever the chat produced: a JSON list of {id, decision, verified_text, bhagavata_ref, pdf_page, note}
objects (the shape asked for in batch_*.json), optionally wrapped in ``` fences or prose, or {"items": [...]},
or a dict keyed by id. decision: dge → take the DGE Madhva text listed as dge_mula_candidate in the batch file;
printed → use verified_text; vision → accept the Vision OCR as is; unsure → recorded, nothing applied.
Missing verses (ids not yet in the mūla) need verified_text + bhagavata_ref (+ pdf_page).
Every accepted answer is merged into dge/data/ocr_staging/bhagavata_saroddhara/verify_output/answers.json
(the same file verify_queue.html exports) and then tools/saroddhara/apply_verified.py applies it — idempotent."""
import argparse, json, re, sys, datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "saroddhara"))
import apply_verified  # noqa: E402
STAGING = ROOT / "dge/data/ocr_staging/bhagavata_saroddhara"
ANSWERS = STAGING / "verify_output/answers.json"
MULA = ROOT / "dge/data/darshana/vedanta/dvaita/DvaitaVedanta/later_acharyas/bhagavata_saroddhara/mula/data.json"
BHP = ROOT / "dge/data/purana/maha_purana/bhagavata_purana_madhva"


def sync_bhagavata(ref, text, note, stamp):
    """Write a confirmed printed reading into the master Bhāgavata shloka (skandha/adhyaya/verse). Returns a log line."""
    parts = [int(x) for x in re.findall(r"\d+", ref or "")][:3]
    if len(parts) != 3: return f"no valid bhagavata_ref {ref!r}"
    sk, ad, n = parts; f = BHP / f"skandha_{sk:02d}" / "data.json"
    if not f.exists(): return f"skandha file missing for {ref}"
    d = json.load(open(f, encoding="utf-8"))
    item = next((i for i in d["items"] if re.sub(r"\D", "", i.get("id", "")) == f"{ad:02d}" or i.get("id") == f"adhyaya_{ad:02d}"), None)
    if not item: return f"adhyaya {ad} not found in skandha {sk}"
    for sh in item.get("shlokas", []):
        nums = re.findall(r"\d+", str(sh.get("number") or ""))
        if nums and int(nums[0]) <= n <= int(nums[-1]):
            clean = re.sub(r"\s*(?:॥|\|\||।।)\s*[०-९]{1,3}\s*(?:॥|\|\||।।)\s*$", "॥", text).strip()
            if sh["sanskrit_text"] == clean: return f"{ref}: master already has this text"
            sh.setdefault("previous_text", sh["sanskrit_text"]); sh["sanskrit_text"] = clean
            sh["revision"] = {"date": stamp, "source": "Bhāgavata Sāroddhāra (Viṣṇutīrtha) printed edition, human-confirmed", "note": note}
            json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            return f"{ref}: master shloka updated (old text kept in previous_text)"
    return f"{ref}: verse {n} not found in adhyaya {ad}"


def parse_pasted(text):
    """Pull the JSON out of a chat reply (fences, leading prose, trailing commentary tolerated)."""
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if m: text = m.group(1)
    text = text.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = min([i for i in (text.find("["), text.find("{")) if i >= 0] or [0])
        end = max(text.rfind("]"), text.rfind("}")) + 1
        data = json.loads(text[start:end])
    if isinstance(data, dict):
        if "items" in data: data = data["items"]
        elif "answers" in data: data = data["answers"]
        else: data = [dict(v, id=k) for k, v in data.items() if isinstance(v, dict)]
    return [d for d in data if isinstance(d, dict) and d.get("id")]


def batch_index():
    idx = {}
    for f in sorted((STAGING / "verify_input").glob("batch_*.json")):
        for it in json.load(open(f, encoding="utf-8")).get("items", []): idx[it["id"]] = it
    return idx


def to_answer(ans, batch, present):
    """Chat answer → apply_verified.py answer. Returns (answer or None, reason)."""
    qid = ans["id"].strip(); dec = (ans.get("decision") or "").strip().lower()
    txt = (ans.get("verified_text") or "").strip() or None
    ref = ans.get("bhagavata_ref"); page = ans.get("pdf_page") or ans.get("page"); note = ans.get("note")
    m = re.match(r"BS_V(\d+)$", qid)
    if not m: return None, "not a verse id"
    n = int(m.group(1)); b = batch.get(qid, {})
    if dec == "unsure": return None, "unsure"
    if n not in present:                                   # missing verse being supplied
        if dec == "dge" and not txt:
            c = b.get("dge_mula_candidate")
            if isinstance(c, list):
                pick = next((x for x in c if ref and x.get("ref") == ref), c[0] if c else None)
                txt = pick and pick["text"]; ref = ref or (pick and pick["ref"])
            elif isinstance(c, str): txt = c
        if not txt: return None, "missing verse without text"
        return {"verified_text": txt, "bhagavata_ref": ref, "page": page, "note": note, "decision": dec}, "missing_verse"
    if dec == "dge":
        c = b.get("dge_mula_candidate")
        if isinstance(c, list): c = next((x["text"] for x in c if ref and x.get("ref") == ref), c[0]["text"] if c else None)
        if not (txt or c):
            # verse already unified with the master (mula_crosscheck items): confirm + note only, text untouched
            if n in present: return {"verified_text": None, "accept_vision": False, "note": note, "decision": dec, "bhagavata_ref": ref}, "verse"
            return None, "dge decision but no DGE candidate in the batch file"
        return {"verified_text": txt or c, "accept_vision": False, "note": note, "decision": dec, "bhagavata_ref": ref}, "verse"
    if dec == "printed":
        if not txt: return None, "printed decision without verified_text"
        return {"verified_text": txt, "accept_vision": False, "note": note, "decision": dec, "bhagavata_ref": ref}, "verse"
    if dec == "vision":
        return {"verified_text": txt, "accept_vision": True, "note": note, "decision": dec, "bhagavata_ref": ref}, "verse"
    if txt: return {"verified_text": txt, "accept_vision": False, "note": note, "decision": dec or "printed", "bhagavata_ref": ref}, "verse"
    return None, f"unknown decision {dec!r} and no text"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="pasted chat replies ('-' = stdin)")
    ap.add_argument("--no-apply", action="store_true")
    ap.add_argument("--sync-bhagavata", action="store_true", help="decision=printed also rewrites the master Bhāgavata shloka")
    a = ap.parse_args()
    batch = batch_index()
    present = {it["verse_no"] for it in json.load(open(MULA, encoding="utf-8"))["items"]}
    answers = json.load(open(ANSWERS, encoding="utf-8")) if ANSWERS.exists() else {}
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    n_new = 0; skipped = []
    for f in a.files:
        raw = sys.stdin.read() if f == "-" else open(f, encoding="utf-8").read()
        for ans in parse_pasted(raw):
            conv, why = to_answer(ans, batch, present)
            if conv is None:
                skipped.append((ans["id"], why))
                if why == "unsure": answers.setdefault("_unsure", {})[ans["id"]] = {"note": ans.get("note"), "at": stamp}
                continue
            conv["answered_at"] = stamp; conv["via"] = "gemini_chat"
            conv = {k: v for k, v in conv.items() if v is not None}
            answers[ans["id"]] = conv; n_new += 1
    ANSWERS.parent.mkdir(parents=True, exist_ok=True)
    json.dump(answers, open(ANSWERS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"answers.json: {n_new} answers merged ({len([k for k in answers if not k.startswith('_')])} total); skipped {len(skipped)}")
    for s in skipped: print("   skip", *s)
    if not a.no_apply and n_new:
        apply_verified.main([str(ANSWERS)])
    if a.sync_bhagavata:
        for qid, conv in answers.items():
            if qid.startswith("_") or conv.get("decision") != "printed" or conv.get("bhagavata_synced"): continue
            msg = sync_bhagavata(conv.get("bhagavata_ref"), conv.get("verified_text") or "", conv.get("note"), stamp)
            print("   sync", qid, msg)
            if "updated" in msg or "already" in msg: conv["bhagavata_synced"] = stamp
        json.dump(answers, open(ANSWERS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
