"""Tier D parser: sa.wikisource.org wikitext.

Used only where no TEI or JSON source exists.  Wikisource kavya pages put one
verse per <poem> block or per blank-line-separated stanza, with the reference
inside the danda pair at the end -- the BARE convention.  We reuse the GRETIL
BARE matcher rather than inventing a second one.
"""
from __future__ import annotations

import re

from ..common import deva_to_ascii_digits, norm_ws
from .gretil_tei import CONVENTIONS

TEMPLATE = re.compile(r"\{\{[^{}]*\}\}")
TAGS = re.compile(r"</?[^>]+>")
HEADING = re.compile(r"^\s*(=+)\s*(.+?)\s*\1\s*$", re.M)
LINK = re.compile(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]")


def clean(wikitext):
    s = TEMPLATE.sub(" ", wikitext or "")
    s = LINK.sub(r"\1", s)
    s = TAGS.sub("\n", s)
    return s


def split_units(wikitext, default_chapter="1"):
    """Yield (ref_parts, is_prose, body)."""
    text = clean(wikitext)
    chapter = default_chapter
    for block in re.split(r"\n\s*\n", text):
        block = block.strip()
        if not block:
            continue
        h = HEADING.search(block)
        if h:
            digits = re.findall(r"[\d०-९]+", h.group(2))
            if digits:
                chapter = deva_to_ascii_digits(digits[0])
            block = HEADING.sub(" ", block).strip()
            if not block:
                continue
        m = CONVENTIONS["BARE"].search(block)
        if m:
            ref = deva_to_ascii_digits(m.group("ref"))
            parts = [p for p in re.split(r"[.,]", ref) if p]
            if len(parts) == 1:
                parts = [chapter] + parts
            body = norm_ws(block[: m.start()])
        else:
            continue
        if body:
            yield parts, False, body
