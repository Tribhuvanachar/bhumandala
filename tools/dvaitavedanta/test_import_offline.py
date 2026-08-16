#!/usr/bin/env python3
"""End-to-end test of the importer with zero network.

Primes the on-disk cache with fixture HTML at the exact SHA1-of-URL keys the
Fetcher will look for, then runs main() in --write mode against a temp output
root and asserts the emitted data.json files match DGE conventions.

This also proves the cache is a real resume mechanism: if it works here with no
egress, a re-run on Actions resumes without refetching.

Run:  python tools/dvaitavedanta/test_import_offline.py
"""

import hashlib
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import import_dvaitavedanta as I  # noqa: E402
from test_dv_parse import BREADCRUMB, SIDEBAR  # noqa: E402

BASE = "https://dvaitavedanta.in"


def page(layers_html, breadcrumb=BREADCRUMB):
    return f"""<html><body><nav class="navbar"><a href="/">Home</a></nav>
{breadcrumb}
<div class="row">{SIDEBAR}<div class="col-md-9 content">{layers_html}</div></div>
<footer>Copyright © 2026 Dvaita Vedanta Studies &amp; Research Foundation.</footer>
</body></html>"""


LEAF_A = page("""
  <div id="article13528"><h4>मूलम्</h4>
    <p>अशेषगुरुमीशेशं नारायणमनामयम् ।<br>सम्प्रणम्य प्रवक्ष्यामि प्रमाणानां स्वलक्षणम् ।।</p></div>
  <div id="article13530"><h4>टीका</h4>
    <p>प्रणम्यागण्यकल्याणगुणाब्धिं पुरुषोत्तमम् ।</p></div>
""")

LEAF_B = page("""
  <div id="article13531"><h4>मूलम्</h4><p>प्रमाणं द्विविधं प्रोक्तम् ।</p></div>
  <div id="article13532"><h4>टीका</h4><p>तत्र केवलमनुप्रमाणमिति ।</p></div>
  <div id="article13535"><h4>तत्त्वप्रदीपिका</h4><p>अथ प्रमाणलक्षणमुच्यते ।</p></div>
""")

CONTAINER = page("<p>No record found!!</p>")


def prime(cache_dir, url, html):
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.sha1(url.encode("utf-8")).hexdigest() + ".html"
    with open(os.path.join(cache_dir, key), "w", encoding="utf-8") as handle:
        handle.write(html)


def check(name, condition, detail=""):
    mark = "ok  " if condition else "FAIL"
    print(f"  [{mark}] {name}" + (f"   {detail}" if detail and not condition else ""))
    return bool(condition)


def main():
    tmp = tempfile.mkdtemp(prefix="dvtest_")
    cache = os.path.join(tmp, "cache")
    out = os.path.join(tmp, "out")
    failures = 0

    try:
        prime(cache, BASE + "/category-details/13528/937/thasha/1-para/managa/garana", LEAF_A)
        prime(cache, BASE + "/category-details/13529/937/x", LEAF_B)
        prime(cache, BASE + "/category-details/13533/937/x", CONTAINER)

        rc = I.main([
            "--config", os.path.join(HERE, "dv_sources.json"),
            "--out", out, "--cache", cache,
            "--granthas", "pramana_lakshana",
            "--delay", "0", "--write",
            "--fetch-date", "2026-08-15",
            "--summary-file", "",
        ])
        print()
        failures += not check("exit code 0", rc == 0, rc)

        grantha_dir = os.path.join(out, "dasha_prakarana_granthas", "pramana_lakshana")
        failures += not check("grantha dir created", os.path.isdir(grantha_dir))

        emitted = sorted(os.listdir(grantha_dir)) if os.path.isdir(grantha_dir) else []
        failures += not check("three layer folders + _meta",
                              emitted == ["_meta.json", "mula", "tika_jayatirtha",
                                          "tika_tattvapradipika"], emitted)

        mula_path = os.path.join(grantha_dir, "mula", "data.json")
        with open(mula_path, encoding="utf-8") as handle:
            mula = json.load(handle)
        failures += not check("mula top-level keys",
                              sorted(mula) == ["default_author", "items", "schema",
                                               "source_note", "source_url"], sorted(mula))
        failures += not check("mula schema", mula["schema"] == "grantha_mula_text")
        failures += not check("mula 2 items", len(mula["items"]) == 2, len(mula["items"]))
        failures += not check("licence recorded in source_note",
                              "permission" in mula["source_note"].lower())

        item = mula["items"][0]
        failures += not check("item id shape", item["id"] == "DV_13528", item["id"])
        failures += not check("per-item provenance",
                              item["source"]["url"].startswith(BASE)
                              and item["source"]["site"] == "dvaitavedanta.in"
                              and item["source"]["fetched"] == "2026-08-15")
        failures += not check("breadcrumb kept",
                              item["breadcrumb"][0] == "दशप्रकरणानि", item["breadcrumb"])
        failures += not check("devanagari text",
                              "अशेषगुरुमीशेशं" in item["sanskrit_text"])

        tika_path = os.path.join(grantha_dir, "tika_jayatirtha", "data.json")
        with open(tika_path, encoding="utf-8") as handle:
            tika = json.load(handle)
        failures += not check("tika schema", tika["schema"] == "grantha_tika_text")
        failures += not check("tika default_author",
                              tika["default_author"] == "श्रीजयतीर्थः", tika["default_author"])
        failures += not check("tika_title on items",
                              all(i.get("tika_title") == "टीका" for i in tika["items"]))
        mula_ids = {i["id"] for i in mula["items"]}
        tika_ids = {i["id"] for i in tika["items"]}
        failures += not check("tika ids match mula ids (cross-layer link)",
                              tika_ids == mula_ids, (sorted(tika_ids), sorted(mula_ids)))

        with open(os.path.join(out, "_extract_status.json"), encoding="utf-8") as handle:
            status = json.load(handle)
        entry = status["granthas"]["dasha_prakarana_granthas/pramana_lakshana"]
        failures += not check("status discovered 3", entry["discovered"] == 3, entry["discovered"])
        failures += not check("status with_text 2", entry["with_text"] == 2, entry["with_text"])
        failures += not check("status containers 1", entry["containers"] == 1, entry["containers"])
        failures += not check("status items 5", entry["items"] == 5, entry["items"])
        failures += not check("status complete", entry["status"] == "complete", entry["status"])
        failures += not check("totals rolled up", status["totals"]["items"] == 5,
                              status["totals"])
        failures += not check("mapped layers produce no unmapped warnings",
                              status["unmapped_layers"] == {}, status["unmapped_layers"])

        raw = open(mula_path, encoding="utf-8").read()
        failures += not check("ensure_ascii=False (real Devanagari on disk)",
                              "\\u" not in raw)
        failures += not check("indent=1 like importers/common.py",
                              '\n "schema"' in raw)

        # Idempotence: a second --write run must not change anything.
        before = open(mula_path, encoding="utf-8").read()
        I.main([
            "--config", os.path.join(HERE, "dv_sources.json"),
            "--out", out, "--cache", cache, "--granthas", "pramana_lakshana",
            "--delay", "0", "--write", "--fetch-date", "2026-08-15", "--summary-file", "",
        ])
        failures += not check("re-run is idempotent",
                              open(mula_path, encoding="utf-8").read() == before)

        # Dry run must write nothing.
        out2 = os.path.join(tmp, "out2")
        I.main([
            "--config", os.path.join(HERE, "dv_sources.json"),
            "--out", out2, "--cache", cache, "--granthas", "pramana_lakshana",
            "--delay", "0", "--dry-run", "--summary-file", "",
        ])
        failures += not check("dry run wrote nothing", not os.path.exists(out2))

        # The site names each commentary after its own grantha, so canonical
        # layers have to be matched on suffix. A substring rule would file
        # Keshavacharya's Vivarana under Jayatirtha's tika — two different
        # authors' works silently merged into one folder.
        print("layer name resolution")
        cfg = json.load(open(os.path.join(HERE, "dv_sources.json"),
                             encoding="utf-8"))["layers"]
        resolve = I.resolve_layer_config
        cases = [
            ("प्रमाणलक्षणटीका", "tika_jayatirtha"),
            ("प्रमाणलक्षणटीकाभावदीपः", "tika_bhavadipa"),
            ("श्री कथालक्षणटीकाभावदीपः", "tika_bhavadipa"),
            ("प्रमाणलक्षणटीकाविवरणम्", "tika_vivarana"),
            ("कथालक्षणटीकाविवरणं", "tika_vivarana"),
            ("प्रमाणलक्षणटीकावाक्यार्थकौमुदी", "tika_vakyarthakaumudi"),
            ("मूलम्", "mula"),
        ]
        for title, expected in cases:
            got = resolve(title, cfg)
            failures += not check(f"{title} -> {expected}",
                                  got is not None and got["folder"] == expected,
                                  got["folder"] if got else None)
        failures += not check("an unknown commentary stays unmapped, not guessed",
                              resolve("कस्यचिदपूर्वव्याख्या", cfg) is None)

        print()
        if failures:
            print(f"{failures} check(s) FAILED")
            return 1
        print("all checks passed")
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
