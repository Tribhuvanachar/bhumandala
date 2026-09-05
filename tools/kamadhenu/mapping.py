"""Stage 6 — audio ↔ DGE-text mapping engine.

Signals used (in order of strength):
  1. DGE's own per-verse audio link (metadata.archiveBaseUrl + filePrefix) — the site already plays this file
     for this verse;
  2. folder + filename conventions of the lead's Drive collections (G.<adhyāya>.<verse>[.<half>],
     smv<sarga>.<n>, rv<sarga>.<n>, NS<n>, vs.ns.<verse>.<pāda>, vs<verse>.<pāda>, SBS<ch>.<v>, vsn<n>);
  3. duration plausibility against the DGE Chandas syllable count (sec/syllable band measured from
     Vāgdhenu's reference bank: 0.26–0.44 s; recitations with repeats/explanations run far longer);
  4. YouTube/Drive titles where readable.
No speech recognition is run, so text is never *heard* — every match is structural and says so.
Confidence bands: 1.00 exact (DGE-linked + plausible) · 0.90–0.99 very strong · 0.70–0.89 probable ·
0.50–0.69 uncertain · <0.50 weak/unmatched. Everything below 0.90 lands in the review queue."""
import json, re, sys
from collections import defaultdict
from .common import DS, INCOMING, write_json, read_json, write_csv, write_text, html_page, table_html, esc, log, now_ist, FILTER_JS

SEC_PER_SYL = (0.26, 0.44)      # Vāgdhenu bank.json sec_per_syll range (measured chant pace, 16 metres)
ZW = "​‌‍﻿"


def _num(s):
    return int(s) if s and s.isdigit() else None


def rules(rec):
    """Return (work, section_hint, verse, part, kind, note) from folder/filename, or None."""
    folder = rec["folder"]; name = "".join(c for c in rec["file"] if c not in ZW)
    stem = re.sub(r"(\.(mp3|aac|m4a|wav|flac|ogg|opus))+$", "", name, flags=re.I)
    top = folder.split("/")[0]
    if top == "dge_linked":
        work = folder.split("/")[1]
        m = re.match(r"smv(\d+)\.(\d+)$", stem) or re.match(r"rv(\d+)\.(\d+)$", stem)
        if m and work in ("sumadhva_vijaya", "raghavendra_vijaya"):
            return dict(work=work, section=f"sarga_{int(m.group(1))}", verse=str(int(m.group(2))), part="full", signal="dge_linked", note="DGE player already serves this file for this verse")
        m = re.match(r"NS(\d+)$", stem)
        if m and work == "PrahladaKrutaNarasimha":
            return dict(work=work, section=work, verse=str(int(m.group(1))), part="full", signal="dge_linked", note="DGE player already serves this file for this verse")
        return dict(work=work, section=None, verse=None, part="full", signal="dge_linked_unparsed", note="in a DGE-linked folder but name not understood")
    if "gita" in folder.lower():
        m = re.match(r"G\.(\d+)\.(\d+)(?:\.(\d+))?$", stem)
        if m:
            part = {None: "full", "1": "half_1", "2": "half_2"}.get(m.group(3), f"part_{m.group(3)}")
            return dict(work="bhagavad_gita", section=f"adhyaya_{int(m.group(1)):02d}", verse=str(int(m.group(2))), part=part, signal="filename", note="G.<adhyāya>.<verse>[.<half>] convention in the 'Gita Shlokas' Drive folder")
        return dict(work="bhagavad_gita", section=None, verse=None, part="full", signal="folder", note="in the Gita folder but name not understood")
    if "saroddhara" in folder.lower():
        m = re.match(r"SBS(\d+)\.(\w+)(?:\.SBS(\d+))?$", stem)
        return dict(work="bhagavata_saroddhara", section=f"adhyaya_{m.group(1)}" if m else None, verse=(m.group(2) if m else None), part="full", signal="filename",
                    note="Bhāgavata Sāroddhāra — this work is NOT in the DGE corpus, so no canonical text exists to map to", running_no=(m.group(3) if m else None))
    if "vayu stuti" in folder.lower():
        m = re.match(r"vs\.ns\.(\d+)\.(\d+)$", stem)
        if m:
            return dict(work="nakha_stuti", section="mula", verse=m.group(1), part=f"pada_{m.group(2)}", signal="filename", note="vs.ns.<verse>.<pāda> — Nakha Stuti pāda-level recording (the two Nakhastuti verses that open Hari Vāyu Stuti)")
        m = re.match(r"vs(\d+)\.(\d+)$", stem)
        if m:
            return dict(work="vayu_stuti", section="mula", verse=m.group(1), part=f"pada_{m.group(2)}", signal="filename", note="vs<verse>.<pāda> — Hari Vāyu Stuti pāda-level recording; the work is NOT in the DGE corpus yet")
    if re.match(r"vsn\d*(\.\d+)?$", stem):
        m = re.match(r"vsn(\d*)(?:\.(\d+))?$", stem)
        return dict(work="unknown_vsn", section=None, verse=(m.group(2) or m.group(1) or None), part="full", signal="filename",
                    note="'vsn' series in the 'Audio' Drive folder (vsn1..16 + vsn1.1..1.91) — work not identifiable from the name alone (Viṣṇu Sahasranāma? Vāyu Stuti with Nakha?) — needs the lead to name it")
    if top == "youtube":
        return dict(work="youtube", section=None, verse=None, part="full", signal="folder", note="YouTube audio supplied manually; map by title")
    return None


def plausibility(dur, syl, part):
    if not dur or not syl:
        return None, "no duration/syllable count"
    frac = {"full": 1.0, "half_1": 0.5, "half_2": 0.5}.get(part, 0.25 if str(part).startswith("pada") else 1.0)
    lo, hi = syl * frac * SEC_PER_SYL[0], syl * frac * SEC_PER_SYL[1]
    if dur < lo * 0.6:
        return "too_short", f"{dur:.1f}s < {lo*0.6:.1f}s expected minimum for {int(syl*frac)} syllables"
    if dur <= hi * 1.6:
        return "plausible", f"{dur:.1f}s within {lo:.1f}–{hi*1.6:.1f}s for {int(syl*frac)} syllables"
    ratio = dur / hi
    return "too_long", f"{dur:.1f}s is {ratio:.1f}× the single-rendition upper bound ({hi:.1f}s) — likely repeats, teaching pauses or explanation included"


def run():
    inv = read_json(DS / "audio_inventory.json", {"files": []})
    ti = read_json(DS / "text_index.json", {"units": []})
    units = ti["units"]
    by_key = {}
    for u in units:
        by_key[(u["work"], u["section"], u["verse_id"])] = u
        by_key[(u["work"], None, u["verse_id"])] = by_key.get((u["work"], None, u["verse_id"]), u)
    ext = read_json(DS / "external_audio_sources.json", {}).get("sources", [])
    rows = []
    for rec in inv["files"]:
        r = rules(rec) or dict(work=None, section=None, verse=None, part="full", signal="none", note="no folder/filename rule matched")
        row = {"audio": rec["path"], "file": rec["file"], "folder": rec["folder"], "duration_seconds": rec.get("duration_seconds"),
               "audio_quality": rec.get("quality_grade"), "qc_flags": rec.get("flags", []), "work_guess": r["work"], "section_guess": r["section"],
               "verse_guess": r["verse"], "part": r["part"], "signal": r["signal"], "signal_note": r["note"], "text_id": None, "text": "", "chandas": "",
               "syllable_count": None, "duration_check": None, "duration_note": "", "confidence": 0.0, "band": "", "review_status": "", "review_reason": ""}
        u = None
        if r["work"] and r["verse"]:
            u = by_key.get((r["work"], r["section"], r["verse"])) or by_key.get((r["work"], None, r["verse"]))
        if u:
            ca = u.get("chandas_analysis") or {}
            row.update(text_id=u["id"], text=u["metrical_text"] or u["text"], chandas=ca.get("chandas_inferred") or ca.get("chandas_normalized") or "अज्ञातम्",
                       syllable_count=ca.get("syllable_count"), work=u["work"], section=u["section"], chapter=u["chapter"], verse_id=u["verse_id"])
            if str(r["part"]).startswith("pada_"):
                k = int(r["part"].split("_")[1]) - 1
                pats = (u.get("metrical_text") or "").split("\n")
                # pāda text: if the verse has exactly 4 lines use the k-th; if 2 lines, split each line at the midpoint of its syllable string is not safe → keep the hemistich
                if len(pats) == 4 and k < 4:
                    row["text"] = pats[k]; row["part_text_basis"] = "line k of 4"
                elif len(pats) == 2 and k < 4:
                    row["text"] = pats[k // 2]; row["part_text_basis"] = "hemistich (verse has 2 lines; exact pāda split not attempted)"
            chk, note = plausibility(rec.get("duration_seconds"), ca.get("syllable_count"), r["part"])
            row["duration_check"], row["duration_note"] = chk, note
            if r["signal"] == "dge_linked":
                conf = 1.0 if chk == "plausible" else 0.92
            elif r["signal"] == "filename":
                conf = 0.95 if chk == "plausible" else (0.8 if chk == "too_long" else 0.75)
                if str(r["part"]).startswith("half") or str(r["part"]).startswith("pada"):
                    conf = min(conf, 0.88 if chk == "plausible" else 0.72)
            else:
                conf = 0.5
            if rec.get("decode_error"):
                conf = min(conf, 0.6)
            row["confidence"] = round(conf, 2)
        else:
            if r["work"] in ("bhagavata_saroddhara", "vayu_stuti"):
                row["confidence"] = 0.0; row["review_reason"] = f"work identified from filename ({r['work']}) but it does not exist in DGE — add the text to DGE first"
            elif r["work"] == "unknown_vsn":
                row["confidence"] = 0.0; row["review_reason"] = "work cannot be identified from the filename; lead must name the 'vsn' series"
            elif r["work"] and not r["verse"]:
                row["confidence"] = 0.3; row["review_reason"] = "work known from folder, verse not parseable from filename"
            elif r["work"] and r["verse"]:
                row["confidence"] = 0.4; row["review_reason"] = f"filename points at {r['work']} {r['section']}/{r['verse']} but no such unit in DGE text index"
            else:
                row["review_reason"] = "no rule matched — rename the file to a known convention or add a mapping override"
        c = row["confidence"]
        row["band"] = "1.00 exact" if c >= 1.0 else "0.90–0.99 very strong" if c >= 0.9 else "0.70–0.89 probable" if c >= 0.7 else "0.50–0.69 uncertain" if c >= 0.5 else "<0.50 weak/unmatched"
        if c >= 0.9:
            row["review_status"] = "auto_accepted"
        elif c >= 0.5:
            row["review_status"] = "review"; row["review_reason"] = row["review_reason"] or row["duration_note"] or "structural match only"
        else:
            row["review_status"] = "unmatched"
        row["action"] = {"auto_accepted": "none (spot-check optional)", "review": "listen once: confirm text = audio", "unmatched": "provide text / rename / identify work"}[row["review_status"]]
        rows.append(row)
    # manual overrides (lead can add kamadhenu_dataset/mapping_overrides.json: {audio_path: {text_id, confidence, note}})
    ov = read_json(DS / "mapping_overrides.json", {}) or {}
    uid = {u["id"]: u for u in units}
    for row in rows:
        o = ov.get(row["audio"])
        if o and o.get("text_id") in uid:
            u = uid[o["text_id"]]; ca = u.get("chandas_analysis") or {}
            row.update(text_id=u["id"], text=u["metrical_text"] or u["text"], chandas=ca.get("chandas_inferred") or ca.get("chandas_normalized"), syllable_count=ca.get("syllable_count"),
                       work=u["work"], section=u["section"], chapter=u["chapter"], verse_id=u["verse_id"], confidence=float(o.get("confidence", 1.0)),
                       signal="manual_override", signal_note=o.get("note", "manual"), review_status="verified_by_human" if o.get("verified") else "auto_accepted", band="1.00 exact" if float(o.get("confidence", 1.0)) >= 1 else row["band"])
    # per-text audio counts (for unmatched-text listing)
    have = defaultdict(list)
    for row in rows:
        if row.get("text_id") and row["confidence"] >= 0.5:
            have[row["text_id"]].append(row["audio"])
    unmatched_text = [{"text_id": u["id"], "work": u["work"], "section": u["section"], "verse_id": u["verse_id"], "chandas": (u.get("chandas_analysis") or {}).get("chandas_inferred", ""), "reason": "no audio file maps to this unit"} for u in units if u["id"] not in have and u["work"] != "mahabharata_tatparya_nirnaya"]
    from collections import Counter
    bands = Counter(r["band"] for r in rows); status = Counter(r["review_status"] for r in rows); works = Counter(r["work_guess"] or "—" for r in rows)
    summary = {"generated_at": now_ist(), "audio_files": len(rows), "bands": dict(bands), "review_status": dict(status), "by_work_guess": dict(works),
               "texts_with_audio": len(have), "texts_without_audio": len(unmatched_text), "asr_used": False,
               "note": "No speech recognition was run; all matches are structural (DGE link, filename convention, duration plausibility). Confidence ≥0.90 means the structure is unambiguous, not that the audio was heard."}
    out = {"_readme": "audio ↔ DGE-text mapping. See summary.note. Overrides: kamadhenu_dataset/mapping_overrides.json {audio_path: {text_id, confidence, verified, note}}.", "summary": summary, "mappings": rows, "unmatched_texts": unmatched_text}
    write_json(DS / "audio_text_mapping.json", out)
    fields = ["audio", "work_guess", "section_guess", "verse_guess", "part", "text_id", "text", "chandas", "syllable_count", "duration_seconds", "duration_check", "confidence", "band", "review_status", "review_reason", "signal", "audio_quality", "qc_flags", "action"]
    write_csv(DS / "audio_text_mapping.csv", rows, fields)
    # review HTML
    body = [f"<div class='cards'><div class='card'><b>{len(rows)}</b><span>audio files</span></div>"]
    for k, v in bands.most_common(): body.append(f"<div class='card'><b>{v}</b><span>{esc(k)}</span></div>")
    for k, v in status.most_common(): body.append(f"<div class='card'><b>{v}</b><span>{esc(k)}</span></div>")
    body.append("</div>")
    body.append(f"<div class='note'>{esc(summary['note'])}</div>")
    body.append("<input type='search' placeholder='filter (file, work, chandas, status…)' onkeyup=\"kmFilter(this,'map')\">")
    body.append("<h2>Review queue first (confidence &lt; 0.90), then auto-accepted</h2>")
    order = sorted(rows, key=lambda r: ({"unmatched": 0, "review": 1, "auto_accepted": 2, "verified_by_human": 3}[r["review_status"]], r["audio"]))
    for r in order:
        r["proposed text"] = r["text"][:160]; r["verse"] = f"{r.get('section') or r.get('section_guess') or ''} / {r.get('verse_id') or r.get('verse_guess') or ''}"
        r["audio file"] = r["audio"].replace("kamadhenu_dataset/incoming_audio/", "")
    body.append(table_html(order, ["audio file", "proposed text", "work_guess", "verse", "part", "confidence", "chandas", "duration_seconds", "duration_check", "review_status", "review_reason", "action"], dev_fields=("proposed text", "chandas"), mono_fields=("audio file",), id_attr="map"))
    body.append(f"<h2>DGE texts with no audio ({len(unmatched_text)}; MBTN excluded)</h2><details><summary>show</summary>" + table_html(unmatched_text[:3000], ["text_id", "work", "section", "verse_id", "chandas", "reason"], dev_fields=("chandas",)) + "</details>")
    body.append(FILTER_JS)
    write_text(DS / "audio_text_mapping_review.html", html_page("Kamadhenu — audio ↔ text mapping review", "".join(body), "Audio filename | proposed text | work | verse | confidence | Chandas | action"))
    log(f"mapping: {len(rows)} audio files; bands {dict(bands)}; texts with audio {len(have)}, without {len(unmatched_text)}")
    return out


if __name__ == "__main__":
    run()
