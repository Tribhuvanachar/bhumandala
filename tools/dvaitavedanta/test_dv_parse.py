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


# Transcribed from probe pages (run 31933375009): pramana_lakshana_13533 for
# the h2.shloka/#dynamicContent frame, katha_lakshana_14031 for the repeated
# h3 passes and the "श्री"-prefixed variant of one heading.
PAGE_REAL = f"""
<html><body>
{BREADCRUMB}
<div class="row">{SIDEBAR}
<div class="col-md-9">
  <div id="article13700" class="lazy-1">
    <h2 class="shloka">लक्ष्यमात्रव्यापको धर्मो लक्षणम्</h2>
    <div id="dynamicContent" class="details">
      <p class="MsoPlainText"><strong><span>लक्षणलक्षणप्रयोजने</span></strong></p>
      <h3><strong><span>प्रमाणलक्षणटीका</span></strong></h3>
      <p class="MsoPlainText"><span>लक्ष्यमात्रव्यापको धर्मो लक्षणम् इति प्रथमः पक्षः ।</span></p>
      <p class="MsoPlainText"><strong><span>श्रीराघवेन्द्रतीर्थयतिकृतः</span></strong></p>
      <h3><strong><span>प्रमाणलक्षणटीकाभावदीपः</span></strong></h3>
      <p class="MsoPlainText"><span>कल्याणगुणपूर्णाय दोषदूराय विष्णवे ।</span></p>
      <h3><strong><span>श्री प्रमाणलक्षणटीका</span></strong></h3>
      <p class="MsoPlainText"><span>अत्र द्वितीयः विचारः प्रस्तूयते ।</span></p>
    </div>
  </div>
</div></div>
<footer>Copyright 2026</footer>
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
    failures += not check("layer_key squashes stray internal spaces",
                          P.layer_key("अ भिनवचन्द्रिका") == P.layer_key("अभिनवचन्द्रिका"))
    failures += not check("layer_key still strips honorifics",
                          P.layer_key("श्री कथालक्षणटीका") == P.layer_key("कथालक्षणटीका"))
    failures += not check("devanagari_ratio on latin", P.devanagari_ratio("hello world") == 0.0)

    # The shape the site actually serves, transcribed from probe pages saved by
    # run 31933375009. Sections A-D above are synthetic, and the original parser
    # passed all of them while still mis-reading every real page: it emitted one
    # layer per leaf whose "name" was the mula verse.
    print("E. real site shape (#article > h2.shloka + #dynamicContent > h3)")
    rec = P.parse_page(PAGE_REAL, url)
    titles = [l["title"] for l in rec["layers"]]
    failures += not check("mula split from commentaries", titles[:1] == ["मूलम्"], titles)
    failures += not check("mula is the verse, not a commentary",
                          rec["layers"][0]["text"].startswith("लक्ष्यमात्रव्यापको"),
                          rec["layers"][0]["text"][:40])
    failures += not check("verse text is not used as a layer name",
                          not any("लक्ष्यमात्रव्यापको" in t for t in titles), titles)
    failures += not check("h3 headings became the layer names",
                          titles[1:] == ["प्रमाणलक्षणटीका", "प्रमाणलक्षणटीकाभावदीपः"], titles)
    tika = rec["layers"][1]
    failures += not check("repeated passes merged into one layer",
                          "प्रथमः" in tika["text"] and "द्वितीयः" in tika["text"],
                          tika["text"][:60])
    failures += not check("honorific variant merged, not duplicated",
                          len(titles) == len(set(titles)) and len(titles) == 3, titles)
    failures += not check("attribution captured",
                          rec["layers"][2]["author"] == "श्रीराघवेन्द्रतीर्थयतिकृतः",
                          rec["layers"][2]["author"])
    failures += not check("attribution trimmed of restated work title",
                          "भावदीपः" not in rec["layers"][2]["author"],
                          rec["layers"][2]["author"])
    # A tika routinely opens by quoting its verse verbatim; containment-dedupe
    # would otherwise delete the mula of every such leaf.
    failures += not check("mula survives being quoted verbatim by its tika",
                          any(l.get("role") == "mula" for l in rec["layers"]), titles)
    failures += not check("no chrome bleed into layers",
                          all("Copyright" not in l["text"] for l in rec["layers"]))
    failures += not check("layers carry their article's own id",
                          {l.get("article_id") for l in rec["layers"]} == {"13700"},
                          [l.get("article_id") for l in rec["layers"]])

    print()
    print("F. one page, several sutras (multi-article leaf)")
    two = PAGE_REAL.replace(
        "</div></div>\n<footer>",
        """  <div id="article13701" class="lazy-1">
    <h2 class="shloka">अव्याप्तिरतिव्याप्तिरसम्भवश्चेति</h2>
    <div id="dynamicContent" class="details">
      <h3><strong><span>प्रमाणलक्षणटीका</span></strong></h3>
      <p><span>दोषत्रयमिह निरूप्यते इति द्वितीयसूत्रार्थः ।</span></p>
    </div>
  </div>
</div></div>
<footer>""")
    rec2 = P.parse_page(two, url)
    ids = [l.get("article_id") for l in rec2["layers"]]
    # The page has ONE content id but TWO verses. Keying items on the content
    # id made them collide; the article id keeps them apart.
    failures += not check("both articles parsed", len(rec2["layers"]) == 5, len(rec2["layers"]))
    failures += not check("second article keeps its own id", set(ids) == {"13700", "13701"}, ids)
    failures += not check("mula and its tika share one article id",
                          ids[0] == ids[1] == "13700", ids[:2])

    print()
    if failures:
        print(f"{failures} check(s) FAILED")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
