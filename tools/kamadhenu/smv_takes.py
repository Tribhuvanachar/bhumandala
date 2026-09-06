"""Identify the unnamed smv.zip pāda takes ('New recording N.m4a') from local Whisper transcripts.

Input : a JSONL of {take, asr, best:[[score, section, verse, line], …]} produced by the scratch ASR run
        (faster-whisper 'small', int8, CPU; candidates = every Sumadhva Vijaya verse and each of its lines,
        scored by phonetic 3-gram cosine against the transcript).
Logic : the lead said the takes are sequential, one per pāda (6 Sep 2026). So a candidate that continues the
        previous accepted take (same sarga: next line of the same verse, or line 1 of the next verse) is
        preferred, and a weak transcript is accepted only when it continues the chain.
Output: kamadhenu_dataset/mapping_overrides.json entries (audio → text_id, part, confidence, note) and
        kamadhenu_dataset/smv_takes_check.json (every decision with its evidence). Nothing is deleted."""
import json, re, sys
from pathlib import Path
from .common import DS, read_json, write_json, log, now_ist

TAKES = "kamadhenu_dataset/incoming_audio/drive/single-file/smv/SMV"
STRONG, WEAK = 0.50, 0.30


def follows(prev, cand, n_lines):
    """cand continues prev? prev/cand = (section, verse, line)."""
    if not prev or prev[0] != cand[0]:
        return False
    if cand[1] == prev[1] and cand[2] == prev[2] + 1:
        return True
    return cand[1] == prev[1] + 1 and cand[2] == 1 and prev[2] >= n_lines.get((prev[0], prev[1]), 4) - 0


def run(jsonl):
    units = {(u["section"], int(u["verse_id"])): u for u in read_json(DS / "text_index.json", {"units": []})["units"]
             if u["work"] == "sumadhva_vijaya" and str(u["verse_id"]).isdigit()}
    n_lines = {k: max(1, (u.get("metrical_text") or "").count("\n") + 1) for k, u in units.items()}
    rows = [json.loads(l) for l in open(jsonl, encoding="utf-8") if l.strip()]
    rows.sort(key=lambda r: (0, int(m.group(1))) if (m := re.match(r"New recording (\d+)\.m4a$", r["take"])) else (1, r["take"]))
    prev = None; out = []; ov = read_json(DS / "mapping_overrides.json", {}) or {}
    for r in rows:
        cands = [(c[0], (c[1], int(c[2]), int(c[3]))) for c in r.get("best", []) if int(c[3]) > 0]   # line-level candidates only
        pick = None; why = ""
        for sc, c in cands:
            if follows(prev, c, n_lines) and sc >= WEAK:
                pick, why = (sc, c), "continues the previous take"; break
        if not pick and cands and cands[0][0] >= STRONG:
            pick, why = cands[0], "strong transcript match"
        rec = {"take": r["take"], "asr": r.get("asr", ""), "candidates": r.get("best", [])}
        if pick:
            sc, (sec, v, li) = pick
            u = units.get((sec, v))
            conf = 0.9 if (why.startswith("continues") and sc >= STRONG) else 0.8 if why.startswith("continues") else 0.7
            rec.update(decision=f"{sec} verse {v} pāda {li}", text_id=u["id"] if u else None, part=f"pada_{li}", confidence=conf, why=f"{why} (score {sc:.2f})")
            if u:
                ov[f"{TAKES}/{r['take']}"] = {"text_id": u["id"], "part": f"pada_{li}", "confidence": conf, "verified": False,
                                             "note": f"Whisper-small transcript matched {sec} v{v} line {li} ({why}, score {sc:.2f}); lead: takes are sequential pādas"}
            prev = (sec, v, li)
        else:
            rec.update(decision=None, why="no candidate strong enough and none continues the chain — listen"); prev = None
        out.append(rec)
    # backward pass: a take with no decision, whose NEXT take was identified as pāda k>1 of a verse, is that verse's
    # pāda k-1 when that candidate appears in its own list at all (never assigned from position alone)
    for i in range(len(out) - 2, -1, -1):
        o, nxt = out[i], out[i + 1]
        if o.get("decision") or not nxt.get("decision"):
            continue
        m = re.match(r"(\S+) verse (\d+) pāda (\d+)$", nxt["decision"]); sec, v, li = m.group(1), int(m.group(2)), int(m.group(3))
        want = (sec, v, li - 1) if li > 1 else (sec, v - 1, n_lines.get((sec, v - 1), 4))
        for c in o.get("candidates", []):
            if (c[1], int(c[2]), int(c[3])) == want and c[0] >= 0.15:
                u = units.get((sec, want[1]))
                o.update(decision=f"{sec} verse {want[1]} pāda {want[2]}", text_id=u["id"] if u else None, part=f"pada_{want[2]}", confidence=0.7,
                         why=f"precedes the next take (backward pass, score {c[0]:.2f})")
                if u:
                    ov[f"{TAKES}/{o['take']}"] = {"text_id": u["id"], "part": f"pada_{want[2]}", "confidence": 0.7, "verified": False,
                                                 "note": f"Whisper transcript weak (score {c[0]:.2f}) but the next take is {sec} v{v} pāda {li}; lead: takes are sequential pādas"}
                break
    n_ok = sum(1 for o in out if o.get("decision"))
    write_json(DS / "mapping_overrides.json", ov)
    write_json(DS / "smv_takes_check.json", {"generated_at": now_ist(), "method": __doc__.strip(), "takes": len(out), "identified": n_ok, "unresolved": len(out) - n_ok, "decisions": out})
    log(f"smv takes: {n_ok}/{len(out)} identified → mapping_overrides.json ({len(ov)} overrides), smv_takes_check.json")
    return out


if __name__ == "__main__":
    run(sys.argv[1])
