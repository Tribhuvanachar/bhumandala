"""Tier C parser: ambuda.org bulk TEI export.

Ambuda ships TEI that is structurally the same as GRETIL corpusTEI but nests
<div type="section"> for kanda/sarga and puts the reference on <lg n="...">
rather than xml:id.  split_units_tei already accepts either attribute, so the
only real work here is walking the <div> stack to synthesise a full reference
when <lg n> carries only the verse number.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

from ..common import deva_to_ascii_digits, norm_ws
from .gretil_tei import _localname, _itertext


def split_units(xml_text):
    root = ET.fromstring(xml_text)

    def walk(el, stack):
        name = _localname(el.tag)
        n = None
        for k, v in el.attrib.items():
            if _localname(k) in ("n", "id") and v:
                n = deva_to_ascii_digits(v).split("_", 1)[-1]
                break
        if name == "div":
            new_stack = stack + ([n] if n else [])
            for child in el:
                for out in walk(child, new_stack):
                    yield out
            return
        if name in ("lg", "p", "seg"):
            body = _itertext(el)
            if not body:
                return
            if n and ("." in n or "," in n):
                parts = [p for p in n.replace(",", ".").split(".") if p]
            else:
                parts = [p for p in stack if p] + ([n] if n else [])
            if parts:
                yield parts, name == "p", norm_ws(body)
            return
        for child in el:
            for out in walk(child, stack):
                yield out

    for out in walk(root, []):
        yield out
