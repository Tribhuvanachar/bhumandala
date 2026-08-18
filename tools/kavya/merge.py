"""Non-destructive merge into an existing DGE layer.

Two hard rules, enforced here rather than left to each importer:

1.  An importer NEVER shrinks a text.  merge_into_existing() refuses to write
    if the resulting layer would carry fewer filled shlokas than the layer
    already on disk (ShrinkError).
2.  An existing reading is only replaced when the existing text is a strict
    substring of the incoming reading -- i.e. the repo copy was truncated.
    Those replacements are recorded on the shloka as `repaired_from` so the
    change is auditable.  Any other disagreement leaves the repo copy alone
    and is reported as a conflict.
"""
from __future__ import annotations

from .common import fingerprint, norm_ws
from .schema import is_filled, recount


class ShrinkError(RuntimeError):
    pass


class MergeShapeError(RuntimeError):
    """The layer on disk is not in a shape this merge understands."""


class MergeReport:
    def __init__(self, layer_id=""):
        self.layer_id = layer_id
        self.added_items = 0
        self.added_shlokas = 0
        self.filled_fields = 0
        self.repaired = []      # list of shloka ids
        self.conflicts = []     # list of (shloka_id, field)
        self.kept = 0           # existing values left untouched

    def as_dict(self):
        return {
            "layer": self.layer_id,
            "added_items": self.added_items,
            "added_shlokas": self.added_shlokas,
            "filled_fields": self.filled_fields,
            "repaired": self.repaired,
            "repaired_count": len(self.repaired),
            "conflicts": self.conflicts,
            "conflict_count": len(self.conflicts),
            "kept_existing": self.kept,
        }

    def __str__(self):
        return (
            "%s: +%d items, +%d shlokas, %d fields filled, %d repaired, "
            "%d conflicts, %d kept"
            % (
                self.layer_id,
                self.added_items,
                self.added_shlokas,
                self.filled_fields,
                len(self.repaired),
                len(self.conflicts),
                self.kept,
            )
        )


def _index(layer):
    idx = {}
    for it in layer.get("items", []):
        for sh in it.get("shlokas", []):
            idx[sh.get("id")] = sh
    return idx


def _is_repair(existing: str, incoming: str) -> bool:
    """True when `existing` is a strict, shorter substring of `incoming`."""
    a, b = fingerprint(existing), fingerprint(incoming)
    return bool(a) and bool(b) and a != b and a in b


def _merge_text_field(dst, src, field, sid, report):
    inc = norm_ws(src.get(field, ""))
    if not inc:
        return
    cur = norm_ws(dst.get(field, ""))
    if not cur:
        dst[field] = inc
        report.filled_fields += 1
        return
    if fingerprint(cur) == fingerprint(inc):
        report.kept += 1
        return
    if _is_repair(cur, inc):
        dst.setdefault("repaired_from", {})[field] = cur
        dst[field] = inc
        report.repaired.append(sid)
        return
    report.conflicts.append((sid, field))
    report.kept += 1


def _merge_bhashya(dst, src, sid, report):
    inc = src.get("bhashya") or []
    if not inc:
        return
    cur = dst.setdefault("bhashya", [])
    by_key = {}
    for i, b in enumerate(cur):
        by_key[(b.get("commentator", ""), fingerprint(b.get("text", "")))] = i
    by_commentator = {}
    for i, b in enumerate(cur):
        by_commentator.setdefault(b.get("commentator", ""), i)

    for b in inc:
        text = norm_ws(b.get("text", ""))
        if not text:
            continue
        com = b.get("commentator", "")
        if (com, fingerprint(text)) in by_key:
            report.kept += 1
            continue
        j = by_commentator.get(com)
        if j is not None and _is_repair(cur[j].get("text", ""), text):
            cur[j].setdefault("repaired_from", cur[j].get("text", ""))
            cur[j]["text"] = text
            report.repaired.append(sid)
            continue
        if j is not None:
            # same commentator, genuinely different reading -> keep both,
            # the reader shows them as separate cards.
            report.conflicts.append((sid, "bhashya:" + com))
        cur.append(dict(b, text=text))
        by_commentator.setdefault(com, len(cur) - 1)
        report.filled_fields += 1


SCALAR_FIELDS = ("sanskrit_text", "artha", "anvaya", "chandas", "speaker")


def merge_into_existing(existing, incoming, allow_new=True):
    """Merge `incoming` layer into `existing` (mutated and returned).

    `existing` may be None -> the incoming layer is returned as-is.
    """
    report = MergeReport(
        (incoming.get("grantha") or {}).get("id", "")
    )
    if existing and "grantha" not in existing:
        # A layer written before this package existed: no grantha block, items
        # keyed sarga_01 where this writes 1, shlokas keyed by number where
        # this keys by id. Merging the two would not update the old text, it
        # would append a second copy of it beside the new one -- 19 sargas
        # becoming 38, silently, in a grantha that is already published. The
        # id bridge that would make this safe is not written yet, so this
        # refuses rather than guesses. See PENDING.md.
        raise MergeShapeError(
            "%s already exists in the pre-package shape (no grantha block, "
            "items %s). Import to a separate data root instead, or write the "
            "id bridge first." % (
                (incoming.get("grantha") or {}).get("id", "?"),
                [i.get("id") for i in existing.get("items", [])][:3])
        )
    if not existing:
        recount(incoming)
        report.added_items = len(incoming.get("items", []))
        report.added_shlokas = sum(
            len(i.get("shlokas", [])) for i in incoming.get("items", [])
        )
        report.filled_fields = incoming["grantha"]["counts"]["filled"]
        return incoming, report

    before_filled = sum(1 for _, sh in _iter(existing) if is_filled(sh))

    dst_idx = _index(existing)
    items_by_id = {it.get("id"): it for it in existing.get("items", [])}

    for it in incoming.get("items", []):
        tgt_item = items_by_id.get(it.get("id"))
        if tgt_item is None:
            if not allow_new:
                continue
            tgt_item = {k: v for k, v in it.items() if k != "shlokas"}
            tgt_item["shlokas"] = []
            existing.setdefault("items", []).append(tgt_item)
            items_by_id[tgt_item["id"]] = tgt_item
            report.added_items += 1
        else:
            for k in ("name_sa", "name_en"):
                if not tgt_item.get(k) and it.get(k):
                    tgt_item[k] = it[k]

        for sh in it.get("shlokas", []):
            sid = sh.get("id")
            cur = dst_idx.get(sid)
            if cur is None:
                if not allow_new:
                    continue
                tgt_item["shlokas"].append(sh)
                dst_idx[sid] = sh
                report.added_shlokas += 1
                if is_filled(sh):
                    report.filled_fields += 1
                continue
            for f in SCALAR_FIELDS:
                _merge_text_field(cur, sh, f, sid, report)
            _merge_bhashya(cur, sh, sid, report)
            if sh.get("padaccheda") and not cur.get("padaccheda"):
                cur["padaccheda"] = sh["padaccheda"]
                report.filled_fields += 1

    # sort items and shlokas by numeric id so output is stable
    _sort(existing)
    recount(existing)

    after_filled = sum(1 for _, sh in _iter(existing) if is_filled(sh))
    if after_filled < before_filled:
        raise ShrinkError(
            "refusing to write %s: filled shlokas would drop %d -> %d"
            % (report.layer_id, before_filled, after_filled)
        )
    return existing, report


def _iter(layer):
    for it in layer.get("items", []):
        for sh in it.get("shlokas", []):
            yield it, sh


def _key(uid):
    out = []
    for part in str(uid or "").split("."):
        try:
            out.append((0, int(part), ""))
        except ValueError:
            out.append((1, 0, part))
    return out


def _sort(layer):
    layer["items"] = sorted(layer.get("items", []), key=lambda i: _key(i.get("id")))
    for it in layer["items"]:
        it["shlokas"] = sorted(it.get("shlokas", []), key=lambda s: _key(s.get("id")))
