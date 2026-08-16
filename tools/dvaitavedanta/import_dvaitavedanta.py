#!/usr/bin/env python3
"""Extract the dvaitavedanta.in corpus into dge/data/dvaitavedanta/.

Runs on GitHub Actions (open network egress). It does NOT run inside the Cowork
sandbox, which has no scraping egress to this host — that is by design and
matches the established DGE import workflow (see tools/dasa_sahitya/).

Pipeline per grantha
  1. discover  fetch the seed leaf, harvest the full sidebar -> the leaf id set
  2. fetch     GET each leaf through a resumable on-disk cache
  3. parse     breadcrumb -> hierarchy, stacked commentary layers -> items
  4. emit      one data.json per commentary layer, DGE canonical shape
  5. track     _extract_status.json + a GitHub step summary

Design notes
  * Sidebar harvesting beats id brute-force: the id space has gaps that return
    HTTP 500, and one leaf page carries the whole grantha tree already.
  * The cache is keyed by SHA1 of the URL, so re-runs resume for free and a
    failed shard never costs the others their work.
  * Nothing is written unless --write is passed; --dry-run is the default so a
    parser regression cannot land 15k pages of bad JSON.

Usage
    python tools/dvaitavedanta/import_dvaitavedanta.py \
        --config tools/dvaitavedanta/dv_sources.json \
        --sections dasha_prakarana_granthas \
        --limit-per-grantha 5 --dry-run
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import sys
import time
from collections import Counter, OrderedDict

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dv_parse import (  # noqa: E402
    canonical_url,
    devanagari_count,
    devanagari_ratio,
    parse_page,
)

STATUS_FILENAME = "_extract_status.json"
MIN_DEVANAGARI_RATIO = 0.55
MIN_ITEM_CHARS = 4


# --------------------------------------------------------------------------- #
# slugging
# --------------------------------------------------------------------------- #

try:  # optional; the built-in map below covers us if it is absent
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate as _translit

    _HAVE_TRANSLIT = True
except Exception:  # pragma: no cover
    _HAVE_TRANSLIT = False

_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v", "ळ": "l",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
}
_INDEPENDENT_VOWELS = {
    "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u",
    "ऋ": "ri", "ॠ": "ri", "ऌ": "li", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
}
_MATRAS = {
    "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "ॄ": "ri",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
}
_SIGNS = {"ं": "m", "ः": "", "ँ": "n", "़": "", "ॐ": "om", "्": ""}
_VIRAMA = "्"


def _fallback_translit(text: str) -> str:
    """Devanagari -> ascii without indic_transliteration.

    A naive per-character map is wrong: it appends the inherent 'a' even when a
    matra or virama follows, turning प्रमाणलक्षणम् into 'paramaanalakashanama'.
    So consonants are emitted bare and the inherent vowel is added only when the
    next character is neither a matra nor a virama.
    """
    out: list[str] = []
    index, length = 0, len(text)
    while index < length:
        char = text[index]
        nxt = text[index + 1] if index + 1 < length else ""
        if char in _CONSONANTS:
            out.append(_CONSONANTS[char])
            if nxt in _MATRAS:
                out.append(_MATRAS[nxt])
                index += 2
                continue
            if nxt == _VIRAMA:
                index += 2
                continue
            out.append("a")
        elif char in _INDEPENDENT_VOWELS:
            out.append(_INDEPENDENT_VOWELS[char])
        elif char in _MATRAS:
            out.append(_MATRAS[char])
        elif char in _SIGNS:
            out.append(_SIGNS[char])
        else:
            out.append(char)
        index += 1
    return "".join(out)


def slugify_devanagari(text: str) -> str:
    """Deterministic ascii slug from a Devanagari title.

    Site slugs are unusable for this: they drop matras and truncate to four
    characters, so माण्डूक्य and मुण्डक both render as 'mana'.
    """
    if not text:
        return ""
    roman = ""
    if _HAVE_TRANSLIT:
        try:
            roman = _translit(text, sanscript.DEVANAGARI, sanscript.IAST)
        except Exception:
            roman = ""
    if not roman:
        roman = _fallback_translit(text)
    roman = roman.lower()
    for src, dst in (
        ("ā", "a"), ("ī", "i"), ("ū", "u"), ("ṛ", "ri"), ("ṝ", "ri"),
        ("ḷ", "li"), ("ṅ", "n"), ("ñ", "n"), ("ṭ", "t"), ("ḍ", "d"),
        ("ṇ", "n"), ("ś", "sh"), ("ṣ", "sh"), ("ṃ", "m"), ("ḥ", ""),
        ("ĺ", "l"), ("'", ""), ("’", ""),
    ):
        roman = roman.replace(src, dst)
    roman = re.sub(r"[^a-z0-9]+", "_", roman).strip("_")
    roman = re.sub(r"_+", "_", roman)
    return roman[:64]


def strip_ordinal_prefix(title: str) -> str:
    """'1. ब्रह्मसूत्रभाष्यम्' -> 'ब्रह्मसूत्रभाष्यम्'."""
    return re.sub(r"^\s*[\d०-९]+\s*[.)\-–]\s*", "", title or "").strip()


# --------------------------------------------------------------------------- #
# fetching
# --------------------------------------------------------------------------- #

class Fetcher:
    """Polite, resumable HTTP with an on-disk cache keyed by SHA1 of the URL."""

    def __init__(self, cache_dir, user_agent, delay=1.0, timeout=120,
                 retries=4, refresh=False):
        self.cache_dir = cache_dir
        self.delay = float(delay)
        self.timeout = int(timeout)
        self.retries = int(retries)
        self.refresh = bool(refresh)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "sa,hi;q=0.9,en;q=0.8",
        })
        self.failed: list[dict] = []
        self.stats = Counter()
        if cache_dir:
            os.makedirs(cache_dir, exist_ok=True)

    def _cache_path(self, url):
        if not self.cache_dir:
            return None
        return os.path.join(
            self.cache_dir, hashlib.sha1(url.encode("utf-8")).hexdigest() + ".html"
        )

    def get(self, url):
        """Return HTML, or None on permanent failure. Never raises."""
        path = self._cache_path(url)
        if path and not self.refresh and os.path.exists(path):
            self.stats["cache_hit"] += 1
            with open(path, encoding="utf-8") as handle:
                return handle.read()

        last_error = None
        for attempt in range(self.retries):
            try:
                response = self.session.get(url, timeout=self.timeout)
                if response.status_code == 200:
                    html = response.text
                    self.stats["fetched"] += 1
                    if path:
                        with open(path, "w", encoding="utf-8") as handle:
                            handle.write(html)
                    time.sleep(self.delay)
                    return html
                if response.status_code in (403, 404, 410):
                    # Permanent: do not burn retries.
                    self.stats["gone"] += 1
                    self.failed.append({"url": url, "status": response.status_code,
                                        "error": "permanent"})
                    return None
                # 500 is how this backend reports a nonexistent id; still retry
                # once or twice because it also fires under load.
                last_error = f"HTTP {response.status_code}"
            except requests.RequestException as exc:
                last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(self.delay * (attempt + 2))

        self.stats["failed"] += 1
        self.failed.append({"url": url, "status": None, "error": last_error})
        return None


# --------------------------------------------------------------------------- #
# extraction
# --------------------------------------------------------------------------- #

def discover_leaves(fetcher, grantha, log):
    """Fetch the seed page and harvest every content id in its sidebar.

    Returns (ordered_ids, seed_record, ancestor_id).
    """
    seed_url = grantha["seed_url"]
    html = fetcher.get(seed_url)
    if html is None:
        log(f"    ! seed fetch failed: {seed_url}")
        return [], None, grantha.get("ancestor_id")

    record = parse_page(html, seed_url)
    ancestor = grantha.get("ancestor_id") or record.get("ancestor_id")

    ids = OrderedDict()
    ids[record["content_id"]] = True
    for link in record["sidebar"]:
        if link["in_breadcrumb"]:
            continue
        ids[link["content_id"]] = True
    return list(ids.keys()), record, ancestor


def build_items(records, grantha, layer_config, defaults, fetch_date, warnings):
    """Group parsed pages into per-layer item lists.

    The item id is DV_<contentId> in *every* layer, which satisfies the
    grantha_tika_text convention that a tika item's id matches its mula item's.
    """
    layers: "OrderedDict[str, dict]" = OrderedDict()

    for record in records:
        breadcrumb = record["breadcrumb"]
        # Drop the leading category + grantha labels; what remains is the
        # structural path (adhyaya / pada / adhikarana / sutra).
        inner = breadcrumb[2:] if len(breadcrumb) > 2 else breadcrumb[-1:]
        reference = " > ".join(breadcrumb) if breadcrumb else str(record["content_id"])
        section = inner[-2] if len(inner) >= 2 else (inner[0] if inner else "")
        unit_title = inner[-1] if inner else ""

        for position, layer in enumerate(record["layers"]):
            title = layer["title"] or ("मूलम्" if position == 0 else f"layer_{position + 1}")
            config = layer_config.get(title)
            if config is None:
                folder = slugify_devanagari(title) or f"layer_{position + 1}"
                if position == 0 and folder not in ("mula",):
                    schema = defaults["mula_schema"]
                    folder = folder if folder else "mula"
                else:
                    schema = defaults["tika_schema"]
                    if not folder.startswith("tika_"):
                        folder = f"tika_{folder}"
                config = {"folder": folder, "schema": schema, "author": None}
                warnings["unmapped_layers"][title] += 1

            text = layer["text"]
            if devanagari_count(text) < MIN_ITEM_CHARS:
                continue
            ratio = devanagari_ratio(text)
            if ratio < MIN_DEVANAGARI_RATIO:
                warnings["low_devanagari"].append({
                    "url": record["url"], "layer": title, "ratio": round(ratio, 3),
                })

            bucket = layers.setdefault(config["folder"], {
                "schema": config["schema"],
                "default_author": config.get("author") or "",
                "layer_titles": Counter(),
                "items": [],
            })
            bucket["layer_titles"][title] += 1

            item = {
                "id": f"DV_{record['content_id']}",
                "reference": reference,
                "section": section,
                "unit_title": unit_title,
                "sanskrit_text": text,
                "artha": "",
                "notes": "",
                "tags": [],
                "references": [],
                "audio": [],
                "breadcrumb": breadcrumb,
                "source": {
                    "site": "dvaitavedanta.in",
                    "url": record["url"],
                    "content_id": record["content_id"],
                    "layer": title,
                    "anchor": layer.get("anchor", ""),
                    "fetched": fetch_date,
                },
            }
            if bucket["schema"] == "grantha_tika_text":
                item["tika_title"] = title
            elif bucket["schema"] == "grantha_tippani_text":
                item["tippani_title"] = title
                item["author"] = config.get("author") or ""
            layers[config["folder"]]["items"].append(item)

    return layers


def write_layer(out_root, rel_path, payload, site_cfg, grantha, dry_run):
    """Emit one data.json. Matches importers/common.write_grantha conventions:
    ensure_ascii=False, indent=1, Devanagari (never IAST)."""
    folder = os.path.join(out_root, rel_path)
    body = {
        "schema": payload["schema"],
        "default_author": payload["default_author"],
        "source_url": grantha["seed_url"],
        "source_note": site_cfg["license_note"],
        "items": payload["items"],
    }
    blob = json.dumps(body, ensure_ascii=False, indent=1)
    if not dry_run:
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "data.json"), "w", encoding="utf-8") as handle:
            handle.write(blob)
    return len(blob.encode("utf-8"))


def write_meta(path, directory, description, schema, dry_run):
    if dry_run:
        return
    os.makedirs(path, exist_ok=True)
    meta_path = os.path.join(path, "_meta.json")
    if os.path.exists(meta_path):
        return
    meta = {"directory": directory, "description": description}
    if schema:
        meta["schema"] = schema
    with open(meta_path, "w", encoding="utf-8") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


# --------------------------------------------------------------------------- #
# status tracker
# --------------------------------------------------------------------------- #

def load_status(path):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as handle:
                return json.load(handle)
        except Exception:
            pass
    return {
        "generated_note": "DvaitaVedanta extraction progress. Regenerate with "
                          "tools/dvaitavedanta/import_dvaitavedanta.py.",
        "source": "https://dvaitavedanta.in/",
        "license_note": "",
        "last_run": None,
        "totals": {},
        "sections": {},
        "granthas": {},
        "unmapped_layers": {},
        "failures": [],
    }


def recompute_totals(status):
    totals = Counter()
    sections: dict[str, Counter] = {}
    for key, entry in status["granthas"].items():
        section = key.split("/", 1)[0]
        bucket = sections.setdefault(section, Counter())
        for field in ("discovered", "fetched", "with_text", "containers",
                      "failed", "items", "bytes"):
            totals[field] += entry.get(field, 0) or 0
            bucket[field] += entry.get(field, 0) or 0
        totals["granthas"] += 1
        bucket["granthas"] += 1
        if entry.get("status") == "complete":
            totals["complete"] += 1
            bucket["complete"] += 1
    status["totals"] = dict(totals)
    status["sections"] = {name: dict(counts) for name, counts in sorted(sections.items())}
    return status


def render_summary(status, selected_keys):
    lines = ["## DvaitaVedanta extraction", ""]
    totals = status.get("totals", {})
    lines.append(
        f"**{totals.get('complete', 0)}/{totals.get('granthas', 0)} granthas complete** · "
        f"{totals.get('items', 0):,} items · {totals.get('with_text', 0):,} leaf pages · "
        f"{totals.get('failed', 0)} failures · {totals.get('bytes', 0) / 1_048_576:.1f} MB"
    )
    lines += ["", "| Grantha | Status | Leaves | With text | Items | Layers | Failed |",
              "|---|---|--:|--:|--:|--:|--:|"]
    for key in selected_keys:
        entry = status["granthas"].get(key)
        if not entry:
            continue
        icon = {"complete": "✅", "partial": "🟡", "failed": "❌"}.get(entry.get("status"), "⏳")
        layers = ", ".join(f"{k} ({v})" for k, v in (entry.get("layers") or {}).items()) or "—"
        lines.append(
            f"| `{key}`<br>{entry.get('title') or ''} | {icon} {entry.get('status')} | "
            f"{entry.get('discovered', 0)} | {entry.get('with_text', 0)} | "
            f"{entry.get('items', 0)} | {layers} | {entry.get('failed', 0)} |"
        )
    unmapped = status.get("unmapped_layers") or {}
    if unmapped:
        lines += ["", "### Unmapped commentary layers", "",
                  "Add these to `layers` in `dv_sources.json` to fix their folder, "
                  "schema and author:", ""]
        for title, count in sorted(unmapped.items(), key=lambda kv: -kv[1]):
            lines.append(f"- `{title}` — {count} items → auto-slugged")
    failures = status.get("failures") or []
    if failures:
        lines += ["", f"### Failures ({len(failures)})", ""]
        for failure in failures[:25]:
            lines.append(f"- `{failure.get('url')}` — {failure.get('error')}")
        if len(failures) > 25:
            lines.append(f"- …and {len(failures) - 25} more")
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def select_granthas(config, sections_filter, granthas_filter):
    selected = []
    for section in config["sections"]:
        if section.get("enabled") is False:
            continue
        if sections_filter and section["slug"] not in sections_filter:
            continue
        for grantha in section["granthas"]:
            if grantha.get("enabled") is False or not grantha.get("seed"):
                continue
            if granthas_filter and grantha.get("slug") not in granthas_filter:
                continue
            selected.append({
                "section_slug": section["slug"],
                "section_title": section["title"],
                "slug": grantha.get("slug"),
                "title": grantha.get("title"),
                "seed_url": config["site"]["base"] + grantha["seed"],
                "content_id": grantha.get("content_id"),
                "ancestor_id": grantha.get("ancestor_id"),
                "acharya": grantha.get("acharya"),
            })
    return selected


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default="tools/dvaitavedanta/dv_sources.json")
    parser.add_argument("--out", default=None, help="output root (default: config output_root)")
    parser.add_argument("--cache", default=".dv_cache")
    parser.add_argument("--sections", default="", help="comma-separated section slugs; blank = all")
    parser.add_argument("--granthas", default="", help="comma-separated grantha slugs; blank = all")
    parser.add_argument("--limit-per-grantha", type=int, default=0,
                        help="cap leaves per grantha (smoke test); 0 = no cap")
    parser.add_argument("--delay", type=float, default=None)
    parser.add_argument("--timeout", type=int, default=None)
    parser.add_argument("--retries", type=int, default=None)
    parser.add_argument("--refresh-cache", action="store_true")
    parser.add_argument("--probe-dir", default="",
                        help="also save raw HTML of the first N pages here for selector review")
    parser.add_argument("--probe-count", type=int, default=3)
    parser.add_argument("--fetch-date", default=_dt.date.today().isoformat())
    parser.add_argument("--summary-file", default=os.environ.get("GITHUB_STEP_SUMMARY", ""))
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", dest="dry_run", action="store_true", default=True)
    group.add_argument("--write", dest="dry_run", action="store_false")
    args = parser.parse_args(argv)

    with open(args.config, encoding="utf-8") as handle:
        config = json.load(handle)
    site = config["site"]
    defaults = config["defaults"]
    layer_config = config["layers"]
    out_root = args.out or config["output_root"]

    selected = select_granthas(
        config,
        [s for s in args.sections.split(",") if s.strip()],
        [g for g in args.granthas.split(",") if g.strip()],
    )
    if not selected:
        print("No granthas selected.", file=sys.stderr)
        return 2

    fetcher = Fetcher(
        cache_dir=args.cache,
        user_agent=site["user_agent"],
        delay=args.delay if args.delay is not None else defaults["delay"],
        timeout=args.timeout if args.timeout is not None else defaults["timeout"],
        retries=args.retries if args.retries is not None else defaults["retries"],
        refresh=args.refresh_cache,
    )

    status_path = os.path.join(out_root, STATUS_FILENAME)
    status = load_status(status_path)
    status["license_note"] = site["license_note"]
    status["last_run"] = _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
    global_unmapped = Counter(status.get("unmapped_layers") or {})
    run_failures: list[dict] = []
    selected_keys = []
    probes_saved = 0

    def log(message):
        print(message, flush=True)

    mode = "DRY RUN (no files written)" if args.dry_run else "WRITE"
    log(f"dvaitavedanta.in → {out_root}  [{mode}]")
    log(f"{len(selected)} grantha(s) selected\n")

    for grantha in selected:
        started = time.time()
        label = grantha["slug"] or f"id_{grantha['content_id']}"
        log(f"→ {grantha['section_slug']}/{label}")

        ids, seed_record, ancestor = discover_leaves(fetcher, grantha, log)
        if seed_record is None:
            key = f"{grantha['section_slug']}/{label}"
            status["granthas"][key] = {
                "title": grantha.get("title"), "seed_url": grantha["seed_url"],
                "status": "failed", "discovered": 0, "fetched": 0, "with_text": 0,
                "containers": 0, "failed": 1, "items": 0, "bytes": 0, "layers": {},
                "last_run": status["last_run"],
            }
            selected_keys.append(key)
            continue

        # Resolve the real title and folder slug from the breadcrumb — the site's
        # own slugs are lossy and collide.
        breadcrumb = seed_record["breadcrumb"]
        discovered_title = strip_ordinal_prefix(breadcrumb[1]) if len(breadcrumb) > 1 else ""
        title = grantha.get("title") or discovered_title or label
        slug = grantha.get("slug") or slugify_devanagari(discovered_title) or f"id_{grantha['content_id']}"
        key = f"{grantha['section_slug']}/{slug}"
        selected_keys.append(key)
        if not grantha.get("slug"):
            log(f"    resolved slug: {slug}   (title: {discovered_title})")

        if args.limit_per_grantha:
            ids = ids[: args.limit_per_grantha]
        log(f"    {len(ids)} leaf id(s) discovered")

        records, containers, failed = [], 0, 0
        for index, content_id in enumerate(ids, start=1):
            if content_id == seed_record["content_id"]:
                # Already fetched during discovery — don't pay for it twice.
                if not seed_record["is_container"]:
                    records.append(seed_record)
                else:
                    containers += 1
                continue
            url = canonical_url(content_id, ancestor)
            html = fetcher.get(url)
            if html is None:
                failed += 1
                continue
            if args.probe_dir and probes_saved < args.probe_count:
                os.makedirs(args.probe_dir, exist_ok=True)
                with open(os.path.join(args.probe_dir, f"{slug}_{content_id}.html"),
                          "w", encoding="utf-8") as handle:
                    handle.write(html)
                probes_saved += 1
            record = parse_page(html, url)
            if record["is_container"]:
                containers += 1
                continue
            records.append(record)
            if index % 25 == 0:
                log(f"    …{index}/{len(ids)}")

        warnings = {"unmapped_layers": Counter(), "low_devanagari": []}
        layers = build_items(records, grantha, layer_config, defaults,
                             args.fetch_date, warnings)
        global_unmapped.update(warnings["unmapped_layers"])

        total_bytes, total_items, layer_counts = 0, 0, {}
        section_dir = os.path.join(out_root, grantha["section_slug"])
        grantha_dir = os.path.join(section_dir, slug)
        write_meta(out_root, "dvaitavedanta",
                   "DGE category structure file to anchor the directory.",
                   None, args.dry_run)
        write_meta(section_dir, grantha["section_slug"],
                   f"{grantha['section_title']} — extracted from dvaitavedanta.in.",
                   "grantha_prakarana_text", args.dry_run)
        write_meta(grantha_dir, slug,
                   f"{title} — extracted from dvaitavedanta.in.",
                   "grantha_prakarana_text", args.dry_run)

        for folder, payload in layers.items():
            size = write_layer(out_root, os.path.join(grantha["section_slug"], slug, folder),
                               payload, site, grantha, args.dry_run)
            total_bytes += size
            total_items += len(payload["items"])
            layer_counts[folder] = len(payload["items"])

        state = "complete" if failed == 0 and records else ("failed" if not records else "partial")
        if args.limit_per_grantha:
            state = "partial"
        previous = status["granthas"].get(key, {})
        status["granthas"][key] = {
            "title": title,
            "title_source": "config" if grantha.get("title") else "breadcrumb",
            "seed_url": grantha["seed_url"],
            "content_id": grantha["content_id"],
            "status": state,
            "discovered": len(ids),
            "fetched": len(records) + containers,
            "with_text": len(records),
            "containers": containers,
            "failed": failed,
            "items": total_items,
            "bytes": total_bytes,
            "layers": layer_counts,
            "low_devanagari_warnings": len(warnings["low_devanagari"]),
            "first_run": previous.get("first_run") or status["last_run"],
            "last_run": status["last_run"],
            "duration_s": round(time.time() - started, 1),
            "dry_run": args.dry_run,
        }
        log(f"    {len(records)} with text · {containers} containers · {failed} failed · "
            f"{total_items} items · {total_bytes / 1024:.0f} KB · {state}")
        for folder, count in layer_counts.items():
            log(f"      {folder}: {count}")
        if warnings["low_devanagari"]:
            log(f"    ! {len(warnings['low_devanagari'])} item(s) below "
                f"{MIN_DEVANAGARI_RATIO:.0%} Devanagari — check selectors")
        log("")

    run_failures.extend(fetcher.failed)
    status["failures"] = run_failures[-500:]
    status["unmapped_layers"] = dict(global_unmapped)
    recompute_totals(status)

    if not args.dry_run:
        os.makedirs(out_root, exist_ok=True)
        with open(status_path, "w", encoding="utf-8") as handle:
            json.dump(status, handle, ensure_ascii=False, indent=1)
            handle.write("\n")

    summary = render_summary(status, selected_keys)
    print(summary)
    if args.summary_file:
        with open(args.summary_file, "a", encoding="utf-8") as handle:
            handle.write(summary)

    log(f"cache hits {fetcher.stats['cache_hit']} · fetched {fetcher.stats['fetched']} · "
        f"failed {fetcher.stats['failed']} · gone {fetcher.stats['gone']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
