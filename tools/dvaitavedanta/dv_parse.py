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


def extract_layers(soup: BeautifulSoup) -> list[dict]:
    """Return the stacked commentary layers as [{title, text, anchor}].

    Primary path: elements carrying `id="article<N>"`.
    Fallback: split the densest non-chrome container on its headings.
    """
    layers: list[dict] = []

    anchored = [
        t for t in soup.find_all(id=ARTICLE_ID_RE)
        if isinstance(t, Tag) and not _is_chrome(t)
    ]
    for node in anchored:
        heading = _heading_for(node)
        text = _strip_heading(block_text(node), heading)
        if devanagari_count(text) < 4:
            continue
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
    """
    kept: list[dict] = []
    for layer in layers:
        if any(layer["text"] and layer["text"] in other["text"] for other in kept):
            continue
        kept = [k for k in kept if not (k["text"] and k["text"] in layer["text"])]
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
