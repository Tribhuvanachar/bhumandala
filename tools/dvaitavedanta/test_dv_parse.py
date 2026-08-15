#!/usr/bin/env python3
"""Fixture tests for dv_parse.

The Cowork sandbox has no network egress to dvaitavedanta.in, so these fixtures
reproduce the two markup shapes the parser must survive:
  A. anchored  — commentary layers carry id="article<N>"  (primary path)
  B. plain     — layers are just headings + prose         (fallback path)

Run:  python tools/dvaitavedanta/test_dv_parse.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dv_parse as P

SIDEBAR = """
<div class="sidebar-menu">
  <ul>
    <li><a href="/category-details/13528/937/thasha/1-para/managa/garana">मङ्गलाचरणम्</a></li>
    <li><a href="/category-details/13529/937/thasha/1-para/managa/naraya">नारायणम्</a></li>
    <li><a href="/category-details/13533/937/thasha/1-para/lkashh/lkashh">लक्षणम्</a></li>
  </ul>
</div>
"""

BREADCRUMB = """
<ol class="breadcrumb">
  <li><a href="/">Home</a></li>
  <li><a href="/category-details/937/937/thasha">दशप्रकरणानि</a></li>
  <li><a href="/category-details/13524/937/thasha/1-para">1. प्रमाणलक्षणम्</a></li>
  <li class="active">मङ्गलाचरणम्</li>
</ol>
"""

PAGE_ANCHORED = f"""
<html><head><meta name="csrf-token" content="AZrHEzilK85TAa6"></head><body>
<nav class="navbar"><a href="/">Home</a><a href="/about">About</a></nav>
{BREADCRUMB}
<div class="row">
  {SIDEBAR}
  <div class="col-md-9 content">
    <div id="article13528">
      <h4>मूलम्</h4>
      <p>अशेषगुरुमीशेशं नारायणमनामयम् ।<br>
         सम्प्रणम्य प्रवक्ष्यामि प्रमाणानां स्वलक्षणम् ।।</p>
    </div>
    <div id="article13528b">
      <h4>टीका</h4>
      <p>प्रणम्यागण्यकल्याणगुणाब्धिं पुरुषोत्तमम् ।</p>
    </div>
  </div>
</div>
<footer><p>Copyright © 2026 Dvaita Vedanta Studies &amp; Research Foundation.</p></footer>
<script>var x = 1;</script><style>.a{{color:red}}</style>
</body></html>
"""

PAGE_PLAIN = f"""
<html><body>
{BREADCRUMB}
<div class="row">
  {SIDEBAR}
  <div class="col-md-9 article-body">
    <h3>सूत्रभाष्यम्</h3>
    ॐ अथातो ब्रह्मजिज्ञासा ॐ अथशब्दो मङ्गलार्थोऽधिकारानन्तर्यार्थश्च।
    <h3>तत्त्वप्रकाशिका</h3>
    तत्रादिसूत्रस्येदं सङ्गत्यादि। अत्र ब्रह्मजिज्ञासायाः कर्तव्यत्वसमर्थनादस्ति।
  </div>
</div>
</body></html>
"""

PAGE_CONTAINER = f"""
<html><body>
{BREADCRUMB}
<div class="row">{SIDEBAR}<div class="col-md-9"><p>No record found!!</p></div></div>
</body></html>
"""


def check(name, condition, detail=""):
    mark = "ok  " if condition else "FAIL"
    print(f"  [{mark}] {name}" + (f"   {detail}" if detail and not condition else ""))
    return bool(condition)


def main():
    failures = 0
    url = "https://dvaitavedanta.in/category-details/13528/937/x"

    print("A. anchored markup (id=article<N>)")
    rec = P.parse_page(PAGE_ANCHORED, url)
    failures += not check("content_id parsed", rec["content_id"] == 13528, rec["content_id"])
    failures += not check("not a container", rec["is_container"] is False)
    failures += not check("two layers", len(rec["layers"]) == 2, rec["layers"])
    failures += not check("layer titles", [l["title"] for l in rec["layers"]] == ["मूलम्", "टीका"],
                          [l["title"] for l in rec["layers"]])
    failures += not check("heading stripped from body",
                          not rec["layers"][0]["text"].startswith("मूलम्"),
                          rec["layers"][0]["text"][:40])
    failures += not check("<br> became newline", "\n" in rec["layers"][0]["text"])
    failures += not check("no CSS/JS bleed",
                          "color:red" not in rec["layers"][0]["text"]
                          and "var x" not in rec["layers"][0]["text"])
    failures += not check("no footer bleed", "Copyright" not in rec["layers"][0]["text"])
    failures += not check("devanagari ratio high",
                          P.devanagari_ratio(rec["layers"][0]["text"]) > 0.9,
                          P.devanagari_ratio(rec["layers"][0]["text"]))
    failures += not check("breadcrumb without Home",
                          rec["breadcrumb"][:2] == ["दशप्रकरणानि", "1. प्रमाणलक्षणम्"],
                          rec["breadcrumb"])
    sidebar_ids = sorted(l["content_id"] for l in rec["sidebar"] if not l["in_breadcrumb"])
    failures += not check("sidebar ids harvested", sidebar_ids == [13528, 13529, 13533], sidebar_ids)
    failures += not check("breadcrumb links flagged",
                          any(l["in_breadcrumb"] for l in rec["sidebar"]))

    print("B. plain markup (heading fallback)")
    rec2 = P.parse_page(PAGE_PLAIN, url)
    failures += not check("two layers", len(rec2["layers"]) == 2, rec2["layers"])
    failures += not check("titles", [l["title"] for l in rec2["layers"]] ==
                          ["सूत्रभाष्यम्", "तत्त्वप्रकाशिका"],
                          [l["title"] for l in rec2["layers"]])
    failures += not check("body captured",
                          "अथातो ब्रह्मजिज्ञासा" in rec2["layers"][0]["text"],
                          rec2["layers"][0]["text"][:60])
    failures += not check("no sidebar bleed", "मङ्गलाचरणम्" not in rec2["layers"][0]["text"])

    print("C. container node")
    rec3 = P.parse_page(PAGE_CONTAINER, url)
    failures += not check("flagged container", rec3["is_container"] is True)
    failures += not check("no_record marker seen", rec3["no_record_marker"] is True)
    failures += not check("still yields sidebar", len(rec3["sidebar"]) >= 3)

    print("D. helpers")
    failures += not check("canonical_url shape",
                          P.canonical_url(13528, 937) ==
                          "https://dvaitavedanta.in/category-details/13528/937/x",
                          P.canonical_url(13528, 937))
    failures += not check("canonical_url without ancestor",
                          P.canonical_url(13528).endswith("/13528/13528/x"))
    failures += not check("parse_content_url", P.parse_content_url(
        "/category-details/13528/937/a/b") == (13528, 937))
    failures += not check("non-content href ignored",
                          P.parse_content_url("/about") is None)
    failures += not check("devanagari_ratio on latin", P.devanagari_ratio("hello world") == 0.0)

    print()
    if failures:
        print(f"{failures} check(s) FAILED")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
