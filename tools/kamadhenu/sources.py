"""Stage 1 — external audio sources: probe every known URL from THIS environment, list what can be
listed, and write kamadhenu_dataset/external_audio_sources.json + drive_manifest.json.

Nothing here downloads audio (see fetch.py). Nothing here claims audio was inspected."""
import re, html, json, subprocess, sys, time
from pathlib import Path
from .common import DS, write_json, read_json, log, now_ist, AUDIO_EXT

# The lead's known sources (task section 2). Keep URLs verbatim even when inaccessible.
KNOWN_SOURCES = [
    ("gdrive_folder", "https://drive.google.com/folderview?id=1W76Y3AJg5DW2NfooYuaHwqzkc36MZkPg"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1GH_6kU5nuMryJ5HbL98u2LSWdkgoCB0V"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1EQNYmWWUA0fj2T2YynVEwRtSGTj__Xf7"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1eqWmG3hJAExpXzU7Kavx5-wfqdiRLXVM"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1wOOrLOfr7wWWpE1xRW90FNsDk54V5M81"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1qs6Tdi6RSVM6gnUt9S6-muvvuqc8eHFF"),
    ("gdrive_folder", "https://drive.google.com/drive/folders/1bSqIOnPb1888H26gGnyzeZ3YTQM9TTBz"),
    ("youtube", "https://youtu.be/lgaxTgliOCo"),
    ("youtube", "https://youtu.be/54EPwW-xJoI"),
    ("gdrive_file", "https://drive.google.com/file/d/1aTBp56uEFK-EAPTEQEuBXmrjAz7z5n03/view?usp=drivesdk"),
]

BLOCKED = "BLOCKED_EXTERNAL_ACCESS"
ZW = "​‌‍﻿"


def _curl(url, timeout=30, head=False):
    cmd = ["curl", "-sS", "-L", "--max-time", str(timeout), "-w", "\n%{http_code}\t%{url_effective}\t%{content_type}", url]
    if head:
        cmd.insert(1, "-I")
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, errors="ignore")
    except FileNotFoundError:
        return None, "curl missing", "", ""
    body, _, tail = r.stdout.rpartition("\n")
    parts = tail.split("\t") + ["", "", ""]
    return body, r.stderr.strip()[:200], parts[0], parts[1]


def drive_id(url):
    m = re.search(r"(?:folders/|id=|file/d/)([A-Za-z0-9_-]{15,})", url)
    return m.group(1) if m else None


def clean_name(n):
    return "".join(c for c in html.unescape(n) if c not in ZW).strip()


def list_drive_folder(fid):
    """Public-folder listing via the embeddedfolderview endpoint (no auth). Returns (ok, entries)."""
    body, err, code, eff = _curl(f"https://drive.google.com/embeddedfolderview?id={fid}#list")
    if body is None or code != "200":
        return False, [], f"HTTP {code} {err}"
    ents = re.findall(r'id="entry-([A-Za-z0-9_-]+)"', body)
    titles = [clean_name(re.sub("<[^>]+>", "", t)) for t in re.findall(r'class="flip-entry-title">(.*?)</div>', body, re.S)]
    title = re.search(r"<title>(.*?)</title>", body, re.S)
    out = []
    for e, t in zip(ents, titles):
        is_file = bool(re.search(r"\.[A-Za-z0-9]{2,4}$", t))
        out.append({"id": e, "name": t, "kind": "file" if is_file else "folder"})
    return True, out, clean_name(title.group(1)) if title else ""


def walk_drive(fid, label, files, depth=0, max_depth=4):
    ok, entries, title = list_drive_folder(fid)
    if not ok:
        return False
    for e in entries:
        if e["kind"] == "folder" and depth < max_depth:
            walk_drive(e["id"], label + "/" + e["name"], files, depth + 1, max_depth)
        else:
            ext = ("." + e["name"].rsplit(".", 1)[-1].lower()) if "." in e["name"] else ""
            files.append({"id": e["id"], "name": e["name"], "folder": label, "ext": ext,
                          "is_audio_by_name": ext in AUDIO_EXT,
                          "download_url": f"https://drive.google.com/uc?export=download&id={e['id']}"})
    return True


def probe_all(previous=None):
    previous = previous or {}
    out = []
    manifest_files = []
    for kind, url in KNOWN_SOURCES:
        rec = {"url": url, "source_type": kind, "attempted_method": "", "accessibility": "", "result": "",
               "what_could_be_inspected": "", "what_you_need_to_provide": "", "probed_at": now_ist()}
        if kind.startswith("gdrive"):
            fid = drive_id(url)
            rec["drive_id"] = fid
            rec["attempted_method"] = "HTTPS GET of the folder page + embeddedfolderview listing (no Google account, no OAuth)"
            if kind == "gdrive_folder":
                ok, entries, title = list_drive_folder(fid)
                if ok and entries:
                    files = []
                    walk_drive(fid, title or fid, files)
                    n_audio = sum(1 for f in files if f["is_audio_by_name"])
                    rec.update(accessibility="PUBLIC_LISTABLE", title=title, result=f"folder is publicly listable: {len(files)} files ({n_audio} audio by extension) across sub-folders",
                               what_could_be_inspected="file names, folder structure, Drive file ids; individual files are downloadable with fetch.py (verified on a sample)",
                               file_count=len(files), audio_file_count=n_audio,
                               what_you_need_to_provide="nothing for listing; run `python3 tools/kamadhenu_audit.py --fetch` to download the audio locally (disk permitting)")
                    for f in files:
                        f["source_url"] = url; f["source_title"] = title
                    manifest_files.extend(files)
                else:
                    body, err, code, eff = _curl(url)
                    signin = "accounts.google.com" in (eff or "") or code in ("401", "403")
                    rec.update(accessibility=BLOCKED, result=f"HTTP {code}; {'redirects to Google sign-in' if signin else 'no listable entries'}",
                               what_could_be_inspected="nothing — the folder is not shared publicly",
                               what_you_need_to_provide=("Open the folder in Drive → Share → 'Anyone with the link: Viewer', then re-run the audit; "
                                                          "OR download the folder as a zip and unzip it into kamadhenu_dataset/incoming_audio/<folder-name>/"))
            else:
                body, err, code, eff = _curl(f"https://drive.google.com/uc?export=download&id={fid}", head=True)
                if code == "200":
                    rec.update(accessibility="PUBLIC_DOWNLOADABLE", result="file responds 200 to a direct download request",
                               what_could_be_inspected="headers only until fetched")
                    manifest_files.append({"id": fid, "name": f"{fid}", "folder": "single-file", "ext": "", "is_audio_by_name": True,
                                           "download_url": f"https://drive.google.com/uc?export=download&id={fid}", "source_url": url, "source_title": "single-file"})
                else:
                    rec.update(accessibility=BLOCKED, result=f"HTTP {code} on direct download (needs sign-in)",
                               what_could_be_inspected="nothing",
                               what_you_need_to_provide="Share the file as 'Anyone with the link', or download it and copy it into kamadhenu_dataset/incoming_audio/single_files/")
        elif kind == "youtube":
            vid = url.rstrip("/").rsplit("/", 1)[-1]
            rec["video_id"] = vid
            rec["attempted_method"] = "HTTPS GET of the watch page (no yt-dlp installed; YouTube Data API not available)"
            body, err, code, eff = _curl(url)
            oe_body, _, oe_code, _ = _curl(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json", timeout=20)
            title = ""
            if oe_code == "200" and oe_body:
                try:
                    title = json.loads(oe_body).get("title", "")
                except Exception:
                    title = ""
            if code == "429" or "sorry" in (eff or ""):
                rec.update(accessibility=BLOCKED, result=f"HTTP {code}: Google served a captcha ('sorry' page) to this environment's egress; watch page not readable",
                           what_could_be_inspected=(f"title via oEmbed: {title!r}" if title else "nothing"),
                           what_you_need_to_provide="Download the audio track on your machine (e.g. `yt-dlp -x --audio-format wav <url>`) and copy the file into kamadhenu_dataset/incoming_audio/youtube/<video-id>.wav — audio from YouTube cannot be fetched from Claude Code")
            elif code == "200":
                rec.update(accessibility="PAGE_READABLE_NO_AUDIO", result="watch page readable, but no audio extraction tool (yt-dlp) is available here",
                           what_could_be_inspected=f"title: {title!r}" if title else "page HTML",
                           what_you_need_to_provide="Download the audio on your machine (yt-dlp -x --audio-format wav) and copy it into kamadhenu_dataset/incoming_audio/youtube/")
            else:
                rec.update(accessibility=BLOCKED, result=f"HTTP {code} {err}", what_you_need_to_provide="Provide the audio locally under kamadhenu_dataset/incoming_audio/youtube/")
            if title:
                rec["title"] = title
        out.append(rec)
        log(f"{rec['accessibility']:22s} {url}")
    return out, manifest_files


def run(offline=False):
    src_path = DS / "external_audio_sources.json"
    man_path = DS / "drive_manifest.json"
    prev = read_json(src_path, {})
    if offline and prev:
        log("offline: keeping previous external_audio_sources.json")
        return prev, read_json(man_path, {})
    sources, files = probe_all()
    summary = {
        "_readme": ["Every external audio source the project lead listed, probed from the Claude Code environment.",
                    "accessibility: PUBLIC_LISTABLE (folder listing readable without sign-in; files downloadable), ",
                    "PUBLIC_DOWNLOADABLE, PAGE_READABLE_NO_AUDIO, or BLOCKED_EXTERNAL_ACCESS.",
                    "A source being listable does NOT mean its audio was analysed — see audio_inventory.json for what was actually downloaded and measured."],
        "probed_at": now_ist(),
        "tools_available": {"curl": True, "yt-dlp": False, "gdown": False, "google_drive_mcp": False},
        "sources": sources,
        "totals": {"sources": len(sources),
                   "accessible": sum(1 for s in sources if s["accessibility"] != BLOCKED),
                   "blocked": sum(1 for s in sources if s["accessibility"] == BLOCKED),
                   "listable_files": len(files),
                   "listable_audio_files": sum(1 for f in files if f["is_audio_by_name"])},
    }
    write_json(src_path, summary)
    # merge previously measured sizes so re-listing never loses information
    prev_files = {f["id"]: f for f in (read_json(man_path, {}) or {}).get("files", [])}
    for f in files:
        p = prev_files.get(f["id"])
        if p:
            for k in ("bytes", "content_type", "local_path", "downloaded_at", "sha1"):
                if p.get(k) is not None:
                    f[k] = p[k]
    manifest = {"_readme": "Files listed in publicly readable Drive folders. Populated by sources.py; sizes/local paths added by fetch.py.",
                "listed_at": now_ist(), "files": files}
    write_json(man_path, manifest)
    log(f"sources: {summary['totals']}")
    return summary, manifest


if __name__ == "__main__":
    run(offline="--offline" in sys.argv)
