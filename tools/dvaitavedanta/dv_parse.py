"""HTML parsing for dvaitavedanta.in.

Kept separate from the crawler so it can be unit-tested against fixtures without
network access (the Cowork sandbox has no egress to the site; see README).

The site is Laravel, fully server-rendered. Every leaf page carries:
  * a breadcrumb chain  Home / category / grantha / adhyaya / pada / adhikarana / sutra
  * the grantha's ENTIRE nested sidebar as real <a href> elements
  * N stacked commentary layers, each a Devanagari heading + body, anchored #article<id>

Container (non-leaf) nodes return HTTP 200 with the body text "No record found!!".
Nonexistent ids return HTTP 500.

Selector strategy is deliberately defensive: we anchor on `id="article<N>"` when
present and fall back to a Devanagari-density heuristic otherwise, so a markup
change on the site degrades rather than silently emitting garbage.
"""

from __future__ import annotations

import re
import unicodedata
from collections import OrderedDict

from bs4 import BeautifulSoup, NavigableString, Tag

BASE = "https://dvaitavedanta.in"

CATEGORY_DETAILS_RE = re.compile(r"/category-details/(\d+)(?:/(\d+))?")
# Tolerant on purpose: the site emits #article<id>, but a suffixed variant
# (article123b) must not silently drop a commentary layer.
ARTICLE_ID_RE = re.compile(r"^article[-_]?(\d+)[a-z0-9_-]*$", re.I)
NO_RECORD_RE = re.compile(r"no\s+record\s+found", re.I)

# Blocks stripped wholesale before any text extraction. `common.py` in this repo
# documents why a naive tag regex is not enough: leftover CSS text got
# transliterated character-by-character into narada_smriti's first "verse".
DROP_TAGS = ("script", "style", "noscript", "svg", "iframe", "form", "button")
CHROME_TAGS = ("nav", "header", "footer", "aside")
CHROME_CLASS_RE = re.compile(
    r"(sidebar|side-bar|side_menu|sidemenu|navbar|nav-|menu|breadcrumb|footer|header|"
    r"topbar|top-bar|offcanvas|drawer|pagination|social|copyright)",
    re.I,
)
BREADCRUMB_CLASS_RE = re.compile(r"breadcrumb", re.I)
HOME_LABELS = ("home", "मुख्यपृष्ठम्", "मुखपृष्ठ", "गृहम्")

# Confirmed against saved probe pages (run 31933375009, 5 leaves across two
# granthas): inside #article<N> the mula verse sits in <h2 class="shloka"> and
# every commentary lives in a flat #dynamicContent/.details block delimited by
# <h3>. Before this was known, the whole block parsed as ONE layer whose "name"
# was the mula verse text.
SHLOKA_CLASS_RE = re.compile(r"\bshloka\b", re.I)
DETAILS_ID = "dynamicContent"
DETAILS_CLASS_RE = re.compile(r"\bdetails\b", re.I)
MULA_TITLE = "मूलम्"
# A short bold line directly before an <h3> attributes the commentary that
# follows ("श्रीराघवेन्द्रतीर्थयतिकृतः"). Topic labels sit in the same position
# but carry no attribution verb, so match the verb rather than the position.
ATTRIBUTION_RE = re.compile(r"(कृत|विरचित|प्रणीत|प्रोक्त|विरचयाम्)")
ATTRIBUTION_MAX_CHARS = 90
# The same commentary is headed both "श्री कथालक्षणटीकाभावदीपः" and
# "कथालक्षणटीकाभावदीपः" on one page; without this they merge as two layers.
HONORIFIC_RE = re.compile(r"^(श्रीमत्|श्रीमद्|श्री)\s*")

DEVANAGARI_RANGE = (0x0900, 0x097F)
BLOCK_TAGS = {
    "p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
    "section", "article", "blockquote", "pre", "td", "th",
}


# --------------------------------------------------------------------------- #
# text helpers
# --------------------------------------------------------------------------- #

def devanagari_ratio(text: str) -> float:
    """Fraction of *letter* characters that are Devanagari.

    Used as an integrity gate: a value near 0 on a supposed verse means we
    scraped chrome, CSS or Latin boilerplate instead of the text.
    """
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    dev = sum(1 for c in letters if DEVANAGARI_RANGE[0] <= ord(c) <= DEVANAGARI_RANGE[1])
    return dev / len(letters)


def devanagari_count(text: str) -> int:
    return sum(1 for c in text if DEVANAGARI_RANGE[0] <= ord(c) <= DEVANAGARI_RANGE[1])


def clean_text(value: str) -> str:
    """Normalise whitespace while preserving intentional line breaks."""
    if not value:
        return ""
    value = unicodedata.normalize("NFC", value)
    value = value.replace(" ", " ").replace("​", "")
    lines = [re.sub(r"[ \t\f\v]+", " ", ln).strip() for ln in value.split("\n")]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines).strip()


def block_text(node: Tag) -> str:
    """Extract text from a node, turning block-level boundaries into newlines."""
    if node is None:
        return ""
    chunks: list[str] = []

    def walk(el):
        if isinstance(el, NavigableString):
            chunks.append(str(el))
            return
        if not isinstance(el, Tag):
            return
        name = (el.name or "").lower()
        if name in DROP_TAGS:
            return
        if name == "br":
            chunks.append("\n")
            return
        for child in el.children:
            walk(child)
        if name in BLOCK_TAGS:
            chunks.append("\n")

    walk(node)
    return clean_text("".join(chunks))


# --------------------------------------------------------------------------- #
# soup preparation
# --------------------------------------------------------------------------- #

def make_soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")


def _is_chrome(tag: Tag) -> bool:
    if not isinstance(tag, Tag):
        return False
    if (tag.name or "").lower() in CHROME_TAGS:
        return True
    attrs = " ".join(
        list(tag.get("class") or []) + [tag.get("id") or ""] + [tag.get("role") or ""]
    )
    return bool(CHROME_CLASS_RE.search(attrs))


def strip_noise(soup: BeautifulSoup) -> BeautifulSoup:
    """Remove scripts/styles. Chrome is *not* removed here — the sidebar is still
    needed for link discovery. Content extraction filters chrome separately."""
    for tag in soup.find_all(DROP_TAGS):
        tag.decompose()
    for comment in soup.find_all(string=lambda s: isinstance(s, NavigableString) and "<!--" in str(s)):
        pass
    return soup


# --------------------------------------------------------------------------- #
# URL helpers
# --------------------------------------------------------------------------- #

def parse_content_url(href: str):
    """Return (content_id, ancestor_id) for a /category-details/ URL, else None."""
    if not href:
        return None
    match = CATEGORY_DETAILS_RE.search(href)
    if not match:
        return None
    content_id = int(match.group(1))
    ancestor_id = int(match.group(2)) if match.group(2) else None
    return content_id, ancestor_id


def canonical_url(content_id: int, ancestor_id=None) -> str:
    """Minimal URL that reliably resolves.

    Only `content_id` is load-bearing; the ancestor id is not validated and the
    slugs are cosmetic. The Laravel route requires at least three params, so a
    single dummy slug segment is mandatory (2-segment URLs 404).
    """
    ancestor = ancestor_id if ancestor_id is not None else content_id
    return f"{BASE}/category-details/{content_id}/{ancestor}/x"


# --------------------------------------------------------------------------- #
# page components
# --------------------------------------------------------------------------- #

def extract_breadcrumb(soup: BeautifulSoup) -> list[str]:
    """Ordered ancestor labels, Home excluded. This IS the hierarchy."""
    candidates = soup.find_all(
        lambda t: isinstance(t, Tag)
        and BREADCRUMB_CLASS_RE.search(
            " ".join(list(t.get("class") or []) + [t.get("id") or ""])
        )
    )
    # Fallback: the container holding a "Home" link plus category-details links.
    if not candidates:
        for anchor in soup.find_all("a"):
            label = clean_text(anchor.get_text(" ")).lower()
            if label in HOME_LABELS or label.rstrip(" /›>") in HOME_LABELS:
                parent = anchor.parent
                for _ in range(3):
                    if parent is None:
                        break
                    if len(parent.find_all("a")) >= 2:
                        candidates = [parent]
                        break
                    parent = parent.parent
                if candidates:
                    break

    for container in candidates:
        parts: list[str] = []
        for node in container.find_all(["li", "a", "span"], recursive=True):
            if node.find(["li", "a"], recursive=False):
                continue
            label = clean_text(node.get_text(" "))
            if not label or label.lower() in HOME_LABELS:
                continue
            if label in parts:
                continue
            parts.append(label)
        parts = [p for p in parts if p not in ("/", ">", "›", "»")]
        if parts:
            return parts
    return []


def extract_sidebar_links(soup: BeautifulSoup, exclude_ids=()) -> list[dict]:
    """Every /category-details/ link on the page, deduped by content id.

    One leaf page renders the grantha's whole tree, so this yields the complete
    sibling set in a single fetch — far cheaper and safer than id brute-force,
    which triggers HTTP 500s on the gaps.
    """
    seen: dict[int, dict] = {}
    breadcrumb_ids = set(exclude_ids)

    for container in soup.find_all(
        lambda t: isinstance(t, Tag)
        and BREADCRUMB_CLASS_RE.search(
            " ".join(list(t.get("class") or []) + [t.get("id") or ""])
        )
    ):
        for anchor in container.find_all("a", href=True):
            parsed = parse_content_url(anchor["href"])
            if parsed:
                breadcrumb_ids.add(parsed[0])

    for anchor in soup.find_all("a", href=True):
        parsed = parse_content_url(anchor["href"])
        if not parsed:
            continue
        content_id, ancestor_id = parsed
        if content_id in seen:
            continue
        seen[content_id] = {
            "content_id": content_id,
            "ancestor_id": ancestor_id,
            "href": anchor["href"],
            "label": clean_text(anchor.get_text(" ")),
            "in_breadcrumb": content_id in breadcrumb_ids,
        }
    return list(seen.values())


def _heading_for(node: Tag) -> str:
    """Find the Devanagari label for a commentary layer."""
    inner = node.find(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "b"])
    if inner:
        label = clean_text(inner.get_text(" "))
        if label and devanagari_count(label) > 0 and len(label) < 120:
            return label
    prev = node
    for _ in range(6):
        prev = prev.find_previous(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "legend"])
        if prev is None:
            break
        label = clean_text(prev.get_text(" "))
        if label and devanagari_count(label) > 0 and len(label) < 120:
            return label
    return ""


def _strip_heading(text: str, heading: str) -> str:
    if heading and text.startswith(heading):
        return text[len(heading):].lstrip(" \n:।")
    return text


def _content_root(soup: BeautifulSoup) -> Tag | None:
    """Pick the main content container by Devanagari density minus link density.

    The sidebar contains a lot of Devanagari too, but almost all of it sits
    inside <a> tags — subtracting anchor text separates the two reliably.
    """
    body = soup.body or soup
    best, best_score = None, 0
    for tag in body.find_all(["main", "article", "section", "div", "td"]):
        if _is_chrome(tag):
            continue
        if tag.find(["main", "article"]):
            continue
        text = tag.get_text(" ")
        anchor_text = " ".join(a.get_text(" ") for a in tag.find_all("a"))
        score = devanagari_count(text) - devanagari_count(anchor_text)
        if score > best_score:
            best, best_score = tag, score
    return best if best_score >= 20 else None


def _text_between(start: Tag, stop: Tag | None, within: Tag) -> str:
    """Text from just after `start` up to `stop`, bounded by `within`.

    Walking `next_elements` rather than siblings keeps nested markup (the site
    wraps most body text in <span> inside <p>) without assuming a flat shape.
    """
    chunks: list[str] = []
    for node in start.next_elements:
        if stop is not None and node is stop:
            break
        if isinstance(node, Tag):
            if node.name == "br":
                chunks.append("\n")
            elif node.name in BLOCK_TAGS:
                chunks.append("\n")
            continue
        if not isinstance(node, NavigableString):
            continue
        parent = node.parent
        if parent is None or (parent.name or "").lower() in DROP_TAGS:
            continue
        # Stop at the end of the details block instead of running on into
        # page chrome for the final heading.
        if within is not None and within not in parent.parents and parent is not within:
            break
        chunks.append(str(node))
    return clean_text("".join(chunks))


def article_id_from(value: str) -> str:
    """`article13531` -> `13531`. Empty when the id is not an article anchor.

    A leaf page can stack several #article<N> blocks (one per sutra under a
    multi-sutra adhikarana). The page has ONE content id, so keying items on it
    made every block collide; the article id is what actually identifies the
    verse, and mula + its commentaries share one block, so cross-layer ids
    still line up.
    """
    match = ARTICLE_ID_RE.match(value or "")
    return match.group(1) if match else ""


def _layers_from_article(node: Tag) -> list[dict]:
    """Split one #article<N> block into its real layers.

    Confirmed shape (probe run 31933375009):

        <div id="article13531">
          <h2 class="shloka">   the mula verse for this leaf
          <div id="dynamicContent" class="details">
            <p><strong>topic or attribution</strong></p>
            <h3>  commentary name
            <p>   body ...
            <h3>  next commentary ...

    One leaf carries exactly one mula verse. A single commentary's body may be
    split across several <h3> passes over that verse (Kathalakshana runs three
    commentaries through five passes each), so same-named chunks are merged in
    document order instead of becoming separate layers.
    """
    details = node.find(id=DETAILS_ID) or node.find(class_=DETAILS_CLASS_RE)
    headings = details.find_all("h3") if details else []
    article_id = article_id_from(node.get("id", ""))

    layers: list[dict] = []
    shloka = node.find("h2", class_=SHLOKA_CLASS_RE)
    if shloka is not None:
        verse = clean_text(shloka.get_text(" "))
        if devanagari_count(verse) >= 4:
            layers.append({
                "title": MULA_TITLE,
                "text": verse,
                "anchor": node.get("id", ""),
                "article_id": article_id,
                "author": "",
                "role": "mula",
            })

    if not headings:
        # A leaf can carry a verse with no commentary at all. Returning nothing
        # here drops it to the pre-probe path, which labels the single layer
        # with the verse itself — the original bug, on ~1 leaf per grantha.
        if not layers:
            return []
        body = _text_between(shloka, None, details) if details is not None else ""
        if devanagari_count(body) >= 4 and body not in layers[0]["text"]:
            layers.append({
                "title": "",
                "text": body,
                "anchor": node.get("id", ""),
                "article_id": article_id,
                "author": "",
                "role": "tika",
            })
        return layers

    merged: "OrderedDict[str, dict]" = OrderedDict()
    for index, heading in enumerate(headings):
        title = clean_text(heading.get_text(" ")).strip(" ।॥:-")
        if not title:
            continue
        stop = headings[index + 1] if index + 1 < len(headings) else None
        text = _text_between(heading, stop, details)
        if devanagari_count(text) < 4:
            continue
        key = layer_key(title)
        entry = merged.get(key)
        if entry is None:
            merged[key] = {
                "title": title,
                "text": text,
                "anchor": heading.get("id", "") or node.get("id", ""),
                "article_id": article_id,
                "author": _attribution_before(heading),
                "role": "tika",
            }
        else:
            entry["text"] = f"{entry['text']}\n{text}"
            entry["author"] = entry["author"] or _attribution_before(heading)
    layers.extend(merged.values())
    return layers


def layer_key(title: str) -> str:
    """Normalised identity for a layer heading, for merging repeated passes."""
    return HONORIFIC_RE.sub("", clean_text(title)).strip(" ।॥:-")


def _attribution_before(heading: Tag) -> str:
    """The 'composed by X' line the site places just above a commentary."""
    node = heading
    for _ in range(3):
        node = node.find_previous(["p", "h3", "h2"])
        if node is None or node.name in ("h3", "h2"):
            return ""
        label = clean_text(node.get_text(" "))
        if not label or len(label) > ATTRIBUTION_MAX_CHARS:
            continue
        match = ATTRIBUTION_RE.search(label)
        if match:
            # "…केशवाचार्यविरचितम् प्रमाणलक्षणटीकाविवरणम्" — keep the credit,
            # drop the restated work title that follows it.
            end = label.find(" ", match.end())
            return label if end == -1 else label[:end].strip()
    return ""


def extract_layers(soup: BeautifulSoup) -> list[dict]:
    """Return the stacked commentary layers as [{title, text, anchor}].

    Primary path: the real #article<N> / #dynamicContent shape.
    Second:      one layer per `id="article<N>"` block (pre-probe assumption,
                 kept for pages that do not carry a details block).
    Fallback:    split the densest non-chrome container on its headings.
    """
    layers: list[dict] = []

    anchored = [
        t for t in soup.find_all(id=ARTICLE_ID_RE)
        if isinstance(t, Tag) and not _is_chrome(t)
    ]
    for node in anchored:
        layers.extend(_layers_from_article(node))
    if layers:
        return _dedupe_layers(layers)

    for node in anchored:
        heading = _heading_for(node)
        text = _strip_heading(block_text(node), heading)
        if devanagari_count(text) < 4:
            continue
        # Deliberately no article_id here. On this shape each layer is its OWN
        # #article<N> block, so the mula and its tika have different article
        # ids; keying items on them would break the cross-layer link. The page
        # is one verse either way, so the content id is the right key.
        layers.append({
            "title": heading,
            "text": text,
            "anchor": node.get("id", ""),
        })
    if layers:
        return _dedupe_layers(layers)

    root = _content_root(soup)
    if root is None:
        return []

    headings = [
        h for h in root.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        if devanagari_count(clean_text(h.get_text(" "))) > 0
    ]
    if not headings:
        text = block_text(root)
        if devanagari_count(text) >= 4:
            layers.append({"title": "", "text": text, "anchor": ""})
        return layers

    for index, heading in enumerate(headings):
        title = clean_text(heading.get_text(" "))
        stop = headings[index + 1] if index + 1 < len(headings) else None
        chunks: list[str] = []
        for sibling in heading.next_elements:
            if sibling is stop:
                break
            if isinstance(sibling, NavigableString):
                parent_name = (sibling.parent.name or "").lower() if sibling.parent else ""
                if parent_name in DROP_TAGS:
                    continue
                chunks.append(str(sibling))
            elif isinstance(sibling, Tag) and sibling.name == "br":
                chunks.append("\n")
        text = clean_text("".join(chunks))
        if devanagari_count(text) < 4:
            continue
        layers.append({"title": title, "text": text, "anchor": heading.get("id", "")})
    return _dedupe_layers(layers)


def _dedupe_layers(layers: list[dict]) -> list[dict]:
    """Drop layers whose text is wholly contained in an earlier layer.

    Nested `id="article<N>"` wrappers would otherwise emit the same body twice.

    The mula layer is exempt. A tika routinely opens by quoting its verse
    verbatim (Pramanalakshana 13529 does exactly this), so containment would
    otherwise delete the mula of every such leaf — the base text, silently.
    """
    kept: list[dict] = []
    for layer in layers:
        if layer.get("role") == "mula":
            kept.append(layer)
            continue
        if any(layer["text"] and layer["text"] in other["text"] for other in kept):
            continue
        kept = [
            k for k in kept
            if k.get("role") == "mula" or not (k["text"] and k["text"] in layer["text"])
        ]
        kept.append(layer)
    return kept


def is_container_page(soup: BeautifulSoup, html: str) -> bool:
    """Section/container nodes return 200 with 'No record found!!' and no text."""
    if NO_RECORD_RE.search(html or ""):
        return True
    return not extract_layers(soup)


def parse_page(html: str, url: str) -> dict:
    """Parse one leaf page into a structured record."""
    soup = strip_noise(make_soup(html))
    breadcrumb = extract_breadcrumb(soup)
    layers = extract_layers(soup)
    parsed = parse_content_url(url) or (None, None)
    no_record = bool(NO_RECORD_RE.search(html or ""))
    return {
        "url": url,
        "content_id": parsed[0],
        "ancestor_id": parsed[1],
        "breadcrumb": breadcrumb,
        "layers": layers,
        "sidebar": extract_sidebar_links(soup),
        "is_container": no_record or not layers,
        "no_record_marker": no_record,
    }
