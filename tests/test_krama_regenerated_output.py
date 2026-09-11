"""dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/krama_regenerated_output.json

This is the OUTPUT of tools/pratishakhya/regenerate_krama_rv_1_1.py, the real
computational Krama engine (sanskrit_phonology.py + pratishakhya_classify.py +
krama_engine.py) run directly against DGE's own Pada-patha/Samhita-patha --
not the earlier hand-aligned tools/pratishakhya/generate_krama_rv_1_1.py.
Structural checks only, mirroring tests/test_krama_generated_output.py's
convention -- linguistic correctness is what validate_krama_rv1_1.py's Test
A-H suite and external verification (KRAMA_VERIFICATION_PACKET.md) are for.
"""

import json
import os
import unittest

REPO = os.path.join(os.path.dirname(__file__), "..")
DATA_PATH = os.path.join(
    REPO, "dge", "data", "vedanga", "shiksha", "pratishakhya",
    "rigveda_pratishakhya", "krama_regenerated_output.json",
)

PARIGRAHA_LIKE = {"parigraha", "monosyllable_confirm_pair"}
PAIR_LIKE = {"pair", "monosyllable_retake_tri_unit"}


class KramaRegeneratedOutput(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(DATA_PATH, encoding="utf-8") as f:
            cls.data = json.load(f)

    def test_nine_verses_present(self):
        ids = [v["id"] for v in self.data["items"]]
        self.assertEqual(ids, [f"1.1.{n}" for n in range(1, 10)])

    def test_no_verse_has_a_hardcoded_pada_word_list(self):
        # every verse's pada_words must come from DGE's own data.json, not a
        # value typed into this repo's scripts -- checked indirectly here by
        # confirming the source script itself carries no per-verse literal
        # (see tools/pratishakhya/regenerate_krama_rv_1_1.py's own docstring
        # and the absence of any VERSES/PARIGRAHA_FORMS-shaped constant there).
        script_path = os.path.join(REPO, "tools", "pratishakhya", "regenerate_krama_rv_1_1.py")
        with open(script_path, encoding="utf-8") as f:
            src = f.read()
        for verse_word in ("अग्निमीळे", "पुरःऽहितम्", "रत्नधातमम्"):
            self.assertNotIn(verse_word, src)

    def test_every_ardharca_ends_in_ardharca_final_parigraha(self):
        # sutra 10.9: ardharca-final words always route to Parigraha, even
        # when the preceding unit was the 10.3 monosyllable-exception path
        # (a real bug this session found and fixed in krama_engine.py: the
        # 10.3 branch originally `continue`d without checking 10.9 at all).
        for verse in self.data["items"]:
            for ardharca in verse["ardharcas"]:
                units = ardharca["units"]
                with self.subTest(verse=verse["id"]):
                    self.assertIn(units[-1]["type"], PARIGRAHA_LIKE)
                    self.assertIn("10.9", units[-1]["rule"])

    def test_pair_and_special_units_cover_every_word_boundary(self):
        for verse in self.data["items"]:
            for ardharca in verse["ardharcas"]:
                n_words = len(ardharca["pada_words"])
                n_pair_like = sum(1 for u in ardharca["units"] if u["type"] in PAIR_LIKE)
                with self.subTest(verse=verse["id"]):
                    self.assertEqual(n_pair_like, n_words - 1)

    def test_low_confidence_units_are_flagged(self):
        for verse in self.data["items"]:
            for ardharca in verse["ardharcas"]:
                for unit in ardharca["units"]:
                    if unit.get("confidence") == "low":
                        with self.subTest(verse=verse["id"], text=unit["text"]):
                            self.assertIn("note", unit)

    def test_counts_are_internally_consistent(self):
        counts = self.data["counts"]
        recomputed = {"pada_count": 0, "pair_count": 0, "parigraha_count": 0,
                      "ardharca_count": 0, "special_exception_count": 0, "unresolved_count": 0}
        for verse in self.data["items"]:
            for ardharca in verse["ardharcas"]:
                recomputed["ardharca_count"] += 1
                recomputed["pada_count"] += len(ardharca["pada_words"])
                for u in ardharca["units"]:
                    if u["type"] == "pair":
                        recomputed["pair_count"] += 1
                    elif u["type"] == "parigraha":
                        recomputed["parigraha_count"] += 1
                    elif u["type"] in ("monosyllable_retake_tri_unit", "monosyllable_confirm_pair"):
                        recomputed["special_exception_count"] += 1
                    if u.get("confidence") == "low":
                        recomputed["unresolved_count"] += 1
        self.assertEqual(counts, recomputed)

    def test_comparison_against_hand_aligned_output_present(self):
        comparison = self.data["comparison_against_hand_aligned_output"]
        self.assertIsNotNone(comparison)
        ids = [r["id"] for r in comparison]
        self.assertEqual(ids, [f"1.1.{n}" for n in range(1, 10)])
        exact = [r for r in comparison if r["status"] == "EXACT_MATCH"]
        # 7 of 9 verses are known, documented exact matches (see
        # dge/RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md sec.6.6); this is not an
        # arbitrary threshold -- it's this specific known-good baseline, and a
        # regression below it should fail this test rather than pass silently.
        self.assertGreaterEqual(len(exact), 7)

    def test_provenance_fields_present(self):
        for key in ("engine_source", "pada_samhita_source", "note"):
            self.assertIn(key, self.data)


if __name__ == "__main__":
    unittest.main()
