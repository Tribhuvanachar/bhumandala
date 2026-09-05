"""Stage 2 — fetch audio that is reachable from here into kamadhenu_dataset/incoming_audio/.

Two kinds of source:
  * public Google Drive folders listed by sources.py (drive_manifest.json);
  * audio that DGE itself already links per verse (metadata.archiveBaseUrl + filePrefix + n + fileExtension
    in dge/data/**/data.json) — Sumadhva Vijaya (jsDelivr), Rāghavendra Vijaya + Prahlāda Narasiṃha (archive.org).

Idempotent: a file that already exists locally with the expected size is never re-downloaded.
Originals are written once and never modified afterwards. Audio is NOT committed to git (see .gitignore)."""
import concurrent.futures as cf, json, re, subprocess, sys, time, hashlib, glob
from pathlib import Path
from .common import DS, INCOMING, DGE, write_json, read_json, log, now_ist, rel, sha1_file

ZW = "​‌‍﻿"


def safe_name(n):
    n = "".join(c for c in n if c not in ZW).strip()
    return re.sub(r"[^\w.\-()+ ]", "_", n)


def dge_linked_audio():
    """Every per-verse audio URL DGE's player would construct. Returns list of dicts with work/section/verse."""
    out = []
    for p in sorted(glob.glob(str(DGE / "data" / "**" / "data.json"), recursive=True)):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        m = d.get("metadata") if isinstance(d, dict) else None
        if not m or "archiveBaseUrl" not in m:
            continue
        base, pre, ext = m["archiveBaseUrl"], m.get("filePrefix", ""), m.get("fileExtension", ".mp3")
        width = m.get("fileNumberWidth")
        shl = d.get("shlokas") or {}
        ids = sorted(shl.keys(), key=lambda k: int(k) if str(k).isdigit() else 0) if isinstance(shl, dict) else [str(i + 1) for i in range(len(shl))]
        relp = rel(p)
        work = relp.split("/")[-3] if "/sarga_" in relp else relp.split("/")[-2]
        section = relp.split("/")[-2]
        for vid in ids:
            fid = str(vid).zfill(width) if width else str(vid)
            name = f"{pre}{fid}{ext}"
            out.append({"id": f"dge:{work}/{section}/{vid}", "name": name, "folder": f"dge_linked/{work}",
                        "download_url": base + name, "source_url": base, "source_title": f"DGE-linked audio for {relp}",
                        "dge_path": relp, "work": work, "section": section, "verse": str(vid), "ext": ext.lower(),
                        "is_audio_by_name": True})
    return out


def _download(item, dest, max_retries=3):
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(max_retries):
        r = subprocess.run(["curl", "-sS", "-L", "--max-time", "180", "-o", str(tmp), "-w", "%{http_code}\t%{content_type}\t%{size_download}",
                            item["download_url"]], capture_output=True, text=True)
        code, ctype, size = (r.stdout.split("\t") + ["", "", "0"])[:3]
        if code == "200" and tmp.exists() and tmp.stat().st_size > 0 and not ctype.startswith("text/html"):
            tmp.rename(dest)
            return {"ok": True, "bytes": dest.stat().st_size, "content_type": ctype}
        # Drive returns an HTML "confirm" page for large files; try the confirm URL once
        if tmp.exists():
            body = tmp.read_bytes()[:20000].decode("utf-8", "ignore")
            m = re.search(r'confirm=([0-9A-Za-z_-]+)', body)
            if m and "drive.google.com" in item["download_url"] and attempt == 0:
                item = dict(item, download_url=item["download_url"] + "&confirm=" + m.group(1))
                continue
            tmp.unlink(missing_ok=True)
        # archive.org items sometimes carry a zero-width space before the extension (DGE's player tries this too)
        if attempt == 0 and "archive.org" in item["download_url"] and "%E2%80%8B" not in item["download_url"]:
            stem, ext = item["download_url"].rsplit(".", 1)
            item = dict(item, download_url=f"{stem}%E2%80%8B.{ext}")
            continue
        time.sleep(1.5 * (attempt + 1))
    return {"ok": False, "http": code, "content_type": ctype}


def run(max_bytes=None, only=None, workers=6, skip_drive=False, skip_dge=False):
    man = read_json(DS / "drive_manifest.json", {}) or {}
    items = [] if skip_drive else [dict(f, folder="drive/" + safe_name(f["folder"].replace("/", "__"))) for f in man.get("files", []) if f.get("is_audio_by_name")]
    if not skip_dge:
        items += dge_linked_audio()
    if only:
        items = [i for i in items if only.lower() in (i["folder"] + "/" + i["name"]).lower()]
    fm_path = DS / "fetch_manifest.json"
    fm = read_json(fm_path, {"_readme": "What fetch.py actually downloaded (or failed to). local_path is relative to the repo root.", "files": {}})
    files = fm["files"]
    spent = 0
    todo = []
    for it in items:
        dest = INCOMING / it["folder"] / safe_name(it["name"])
        key = it["id"]
        if dest.exists() and dest.stat().st_size > 0:
            rec = files.get(key) or {}
            rec.update({"local_path": rel(dest), "bytes": dest.stat().st_size, "status": "present"})
            rec.setdefault("downloaded_at", now_ist())
            rec.update({k: it.get(k) for k in ("name", "folder", "download_url", "source_url", "dge_path", "work", "section", "verse") if it.get(k) is not None})
            files[key] = rec
            continue
        todo.append((it, dest))
    log(f"fetch: {len(items)} candidates, {len(items)-len(todo)} already present, {len(todo)} to download")
    done = fail = 0

    def job(pair):
        it, dest = pair
        res = _download(it, dest)
        return it, dest, res

    with cf.ThreadPoolExecutor(workers) as ex:
        for it, dest, res in ex.map(job, todo):
            key = it["id"]
            rec = {k: it.get(k) for k in ("name", "folder", "download_url", "source_url", "dge_path", "work", "section", "verse") if it.get(k) is not None}
            if res["ok"]:
                spent += res["bytes"]; done += 1
                rec.update({"local_path": rel(dest), "bytes": res["bytes"], "content_type": res.get("content_type"), "status": "downloaded", "downloaded_at": now_ist()})
            else:
                fail += 1
                rec.update({"status": "failed", "http": res.get("http"), "content_type": res.get("content_type"), "attempted_at": now_ist()})
            files[key] = rec
            if (done + fail) % 50 == 0:
                log(f"  {done} ok / {fail} failed / {spent/1e6:.0f} MB")
                write_json(fm_path, fm)
            if max_bytes and spent > max_bytes:
                log("fetch: byte budget reached, stopping (re-run to continue)")
                break
    fm["updated_at"] = now_ist()
    fm["totals"] = {"present": sum(1 for r in files.values() if r.get("status") in ("present", "downloaded")),
                    "failed": sum(1 for r in files.values() if r.get("status") == "failed"),
                    "bytes": sum(r.get("bytes", 0) or 0 for r in files.values() if r.get("status") in ("present", "downloaded"))}
    write_json(fm_path, fm)
    log(f"fetch done: {fm['totals']}")
    return fm


if __name__ == "__main__":
    a = sys.argv[1:]
    mb = None
    for i, x in enumerate(a):
        if x == "--max-mb":
            mb = int(a[i + 1]) * 1_000_000
    only = a[a.index("--only") + 1] if "--only" in a else None
    run(max_bytes=mb, only=only, skip_drive="--skip-drive" in a, skip_dge="--skip-dge" in a)
