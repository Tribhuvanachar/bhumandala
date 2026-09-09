"""tests for tools/import_dvaita_grantha_anukramani.py's pure logic:
parent resolution (nearest PRECEDING row with a matching title, not just
any row with that title -- see the module docstring for why that matters),
breadcrumb building, and the three-tier duplicate detection."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

import import_dvaita_grantha_anukramani as m  # noqa: E402


def row(grantha="", linkRaw="", karta="", vibhaga="", vishayaVibhaga="",
        prasthana="", status="", availability="", mention="", sourceLibrary="",
        row_no=0):
    return {"grantha": grantha, "linkRaw": linkRaw, "karta": karta,
            "vibhaga": vibhaga, "vishayaVibhaga": vishayaVibhaga,
            "prasthana": prasthana, "status": status, "availability": availability,
            "mention": mention, "sourceLibrary": sourceLibrary, "row": row_no}


class ParentResolution(unittest.TestCase):
    def test_child_links_to_nearest_preceding_row_with_matching_title(self):
        # Mirrors the real sheet's "जयतीर्थीय-टीका" pattern: the same title
        # repeats once per mula, and a child must bind to the occurrence
        # right above it, not the first or last one in the sheet.
        rows = [
            row("mula-A", row_no=1),
            row("tika", linkRaw="mula-A", row_no=2),
            row("sub-of-A-tika", linkRaw="tika", row_no=3),
            row("mula-B", row_no=4),
            row("tika", linkRaw="mula-B", row_no=5),
            row("sub-of-B-tika", linkRaw="tika", row_no=6),
        ]
        m.resolve_parents(rows)
        self.assertEqual(rows[2]["parentIdx"], 1)  # binds to row 2 (mula-A's tika)
        self.assertEqual(rows[5]["parentIdx"], 4)  # binds to row 5 (mula-B's tika), not row 2

    def test_unresolved_link_flagged_when_no_row_has_that_title(self):
        rows = [row("solo", linkRaw="इतिहासः", row_no=1)]
        m.resolve_parents(rows)
        self.assertIsNone(rows[0]["parentIdx"])
        self.assertTrue(rows[0]["unresolvedLink"])

    def test_forward_only_match_used_as_fallback(self):
        rows = [
            row("child", linkRaw="later-mula", row_no=1),
            row("later-mula", row_no=2),
        ]
        m.resolve_parents(rows)
        self.assertEqual(rows[0]["parentIdx"], 1)
        self.assertFalse(rows[0]["unresolvedLink"])


class Breadcrumbs(unittest.TestCase):
    def test_path_and_breadcrumb_walk_full_ancestor_chain(self):
        rows = [
            row("root", row_no=1),
            row("mid", linkRaw="root", row_no=2),
            row("leaf", linkRaw="mid", row_no=3),
        ]
        m.resolve_parents(rows)
        m.build_paths(rows)
        self.assertEqual(rows[2]["breadcrumb"], "root › mid › leaf")
        self.assertEqual(rows[2]["path"], ["r1", "r2", "r3"])
        self.assertEqual(rows[2]["depth"], 2)
        self.assertEqual(rows[0]["depth"], 0)

    def test_cycle_does_not_infinite_loop(self):
        # Pathological input only -- resolve_parents never actually produces
        # a cycle, but build_paths must stay safe if it somehow received one.
        rows = [row("a", row_no=1), row("b", row_no=2)]
        rows[0]["parentIdx"] = 1
        rows[1]["parentIdx"] = 0
        m.build_paths(rows)  # must terminate
        self.assertLessEqual(len(rows[0]["path"]), 2)


class DuplicateDetection(unittest.TestCase):
    def test_exact_full_row_duplicate_grouped_as_exact(self):
        rows = [
            row("A", karta="X", vibhaga="मूलम्", row_no=1),
            row("A", karta="X", vibhaga="मूलम्", row_no=2),
        ]
        m.resolve_parents(rows)
        exact, npk, coll = m.detect_duplicates(rows)
        self.assertEqual(len(exact), 1)
        self.assertEqual(set(exact[0]["ids"]), {"r1", "r2"})
        self.assertIsNotNone(rows[0]["exactDuplicateGroup"])
        # a row already counted as an exact duplicate must not also show up
        # in the weaker name+parent+karta tier
        self.assertNotIn("nameParentKartaGroup", rows[0])

    def test_same_name_parent_karta_but_differing_field_is_npk_not_exact(self):
        rows = [
            row("A", karta="X", availability="s", row_no=1),
            row("A", karta="X", availability="n", row_no=2),
        ]
        m.resolve_parents(rows)
        exact, npk, coll = m.detect_duplicates(rows)
        self.assertEqual(exact, [])
        self.assertEqual(len(npk), 1)
        self.assertEqual(set(npk[0]["ids"]), {"r1", "r2"})

    def test_same_title_different_author_is_collision_not_duplicate(self):
        # This is the दशप्रकरण case: same commentary title, legitimately
        # different underlying works (different parent/author) -- must
        # never be reported as a likely duplicate to merge.
        rows = [
            row("टीका", karta="X", row_no=1),
            row("टीका", karta="Y", row_no=2),
        ]
        m.resolve_parents(rows)
        exact, npk, coll = m.detect_duplicates(rows)
        self.assertEqual(exact, [])
        self.assertEqual(npk, [])
        self.assertEqual(len(coll), 1)
        self.assertEqual(set(coll[0]["ids"]), {"r1", "r2"})

    def test_distinct_rows_produce_no_groups(self):
        rows = [row("A", karta="X", row_no=1), row("B", karta="Y", row_no=2)]
        m.resolve_parents(rows)
        exact, npk, coll = m.detect_duplicates(rows)
        self.assertEqual((exact, npk, coll), ([], [], []))

    def test_identical_child_under_different_resolved_parents_is_not_a_duplicate(self):
        # The bug this guards against: linkRaw ("टीका") is the SAME literal
        # text under both mula-A and mula-B (exactly the दशप्रकरण pattern --
        # a commentary title repeated once per mula), and the child rows
        # under each are byte-for-byte identical in every other column too.
        # Keying duplicate detection on linkRaw's raw text would wrongly
        # merge these; keying on the RESOLVED parent (parentIdx) must not.
        rows = [
            row("mula-A", row_no=1),
            row("टीका", linkRaw="mula-A", karta="X", vibhaga="मूलम्", row_no=2),
            row("mula-B", row_no=3),
            row("टीका", linkRaw="mula-B", karta="X", vibhaga="मूलम्", row_no=4),
        ]
        m.resolve_parents(rows)
        exact, npk, coll = m.detect_duplicates(rows)
        self.assertEqual(exact, [])
        self.assertEqual(npk, [])
        # same title AND same author under different parents -- a collision,
        # not a duplicate-to-merge candidate.
        self.assertEqual(len(coll), 1)
        self.assertEqual(set(coll[0]["ids"]), {"r2", "r4"})


class Vocab(unittest.TestCase):
    def test_vocab_counts_and_orders_by_frequency(self):
        rows = [
            row("A", vibhaga="मूलम्", row_no=1),
            row("B", vibhaga="मूलम्", row_no=2),
            row("C", vibhaga="टीका", row_no=3),
        ]
        vocab = m.build_vocab(rows)
        self.assertEqual(vocab["vibhaga"][0], {"value": "मूलम्", "count": 2})
        self.assertEqual(vocab["vibhaga"][1], {"value": "टीका", "count": 1})


if __name__ == "__main__":
    unittest.main()
