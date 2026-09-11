"""Unit tests for the real Krama engine (tools/pratishakhya/{sanskrit_phonology,
pratishakhya_classify,krama_engine}.py). These exercise the ENGINE CODE
directly, complementing tests/test_krama_regenerated_output.py (which checks
the generated JSON) and tools/pratishakhya/validate_krama_rv1_1.py (which
runs the spec's own Test A-H suite with full PASS/FAIL/UNRESOLVED reporting).
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools" / "pratishakhya"))

from sanskrit_phonology import samhita_join, resolve_compound  # noqa: E402
from pratishakhya_classify import (  # noqa: E402
    is_pragrhya, is_monosyllable_avasana, parse_compound, requires_parigraha,
    get_sthita, get_upasthita, get_sthitopasthita,
)
from krama_engine import generate_ardharca, generate_verse, split_into_ardharcas  # noqa: E402


class SamhitaJoin(unittest.TestCase):
    def test_ordinary_no_sandhi_needed(self):
        result = samhita_join("अग्निम्", "ईळे")
        self.assertEqual(result["surface"], "अग्निमीळे")

    def test_visarga_a_class_before_voiced(self):
        result = samhita_join("देवः", "देवेभिः")
        self.assertEqual(result["surface"], "देवो देवेभिः")

    def test_visarga_before_short_a_elides(self):
        result = samhita_join("रामः", "अत्र")
        self.assertTrue(result["surface"].startswith("रामो"))


class Predicates(unittest.TestCase):
    def test_is_pragrhya_lexical_class(self):
        ok, _ = is_pragrhya("अस्मे")
        self.assertTrue(ok)

    def test_is_pragrhya_false_for_ordinary_word(self):
        ok, _ = is_pragrhya("अग्निम्")
        self.assertFalse(ok)

    def test_is_monosyllable_avasana(self):
        self.assertTrue(is_monosyllable_avasana("आ"))
        self.assertFalse(is_monosyllable_avasana("अग्निम्"))

    def test_parse_compound(self):
        self.assertEqual(parse_compound("पुरःऽहितम्"),
                          {"is_compound": True, "segments": ["पुरः", "हितम्"]})
        self.assertEqual(parse_compound("अग्निम्"),
                          {"is_compound": False, "segments": ["अग्निम्"]})

    def test_requires_parigraha_compound(self):
        needs, reasons = requires_parigraha("पुरःऽहितम्", 2, 6)
        self.assertTrue(needs)
        self.assertIn("10.7", reasons)

    def test_requires_parigraha_ardharca_final(self):
        needs, reasons = requires_parigraha("ऋत्विजम्", 5, 6)
        self.assertTrue(needs)
        self.assertIn("10.9", reasons)

    def test_requires_parigraha_false_for_ordinary_mid_word(self):
        needs, _ = requires_parigraha("यज्ञस्य", 3, 6)
        self.assertFalse(needs)

    def test_sthitopasthita_uses_combined_form(self):
        result = get_sthitopasthita("पुरःऽहितम्", "पुरोहितम्")
        self.assertEqual(result, "पुरोहितम् इति पुरःऽहितम्")


class GenerateArdharca(unittest.TestCase):
    def test_ordinary_ardharca_has_n_minus_1_pairs_plus_final_parigraha(self):
        units = generate_ardharca(["अग्निम्", "ईळे", "यज्ञस्य"])
        self.assertEqual(units[0]["type"], "pair")
        self.assertEqual(units[1]["type"], "pair")
        self.assertEqual(units[-1]["type"], "parigraha")
        self.assertIn("10.9", units[-1]["rule"])

    def test_compound_word_gets_parigraha_immediately_after_its_pair(self):
        # यज्ञस्य is also this ardharca's last word, so it independently
        # triggers 10.9's own Parigraha at the end -- both a compound and an
        # ardharca-final Parigraha unit are expected here.
        units = generate_ardharca(["देवम्", "पुरःऽहितम्", "यज्ञस्य"])
        types = [u["type"] for u in units]
        self.assertEqual(types, ["pair", "parigraha", "pair", "parigraha"])
        self.assertEqual(units[1]["for_word"], "पुरःऽहितम्")
        self.assertIn("10.7", units[1]["rule"])
        self.assertIn("10.9", units[3]["rule"])

    def test_sutra_10_3_monosyllable_exception_reproduces_uvata_example(self):
        units = generate_ardharca(["आ", "मन्द्रम्", "वरेण्यम्"])
        texts = [u["text"] for u in units]
        self.assertEqual(texts[0], "आ मन्द्रम्")
        self.assertEqual(texts[1], "मन्द्रमा वरेण्यम्")
        self.assertEqual(texts[2], "आ वरेण्यम्")
        self.assertEqual(units[1]["type"], "monosyllable_retake_tri_unit")
        self.assertEqual(units[2]["type"], "monosyllable_confirm_pair")

    def test_sutra_10_3_branch_still_applies_ardharca_final_parigraha(self):
        # Regression test for a real bug found and fixed in this session: the
        # 10.3 special-case branch originally `continue`d without checking
        # 10.9, silently dropping Parigraha whenever an ardharca's last word
        # was preceded by the monosyllable aa.
        units = generate_ardharca(["आ", "मन्द्रम्", "वरेण्यम्"])
        self.assertEqual(units[-1]["type"], "parigraha")
        self.assertIn("10.9", units[-1]["rule"])
        self.assertEqual(units[-1]["text"], "वरेण्यम् इति वरेण्यम्")


class GenerateVerse(unittest.TestCase):
    def test_no_sandhi_crosses_ardharca_boundary(self):
        ardharca1 = ["देवम्", "ऋत्विजम्"]
        ardharca2 = ["होतारम्", "रत्नऽधातमम्"]
        units_per_ardharca = generate_verse([ardharca1, ardharca2])
        self.assertEqual(len(units_per_ardharca), 2)
        # ऋत्विजम् (ardharca1's last word) never appears joined with होतारम्
        # (ardharca2's first word) in any unit's text.
        for unit in units_per_ardharca[0] + units_per_ardharca[1]:
            self.assertNotIn("ऋत्विजंहोतारम्", unit["text"])


class SplitIntoArdharcas(unittest.TestCase):
    def test_manual_override_used_when_present(self):
        ardharcas, method = split_into_ardharcas(
            "1.1.7", ["उप", "त्वा", "अग्ने", "दिवेऽदिवे", "दोषाऽवस्तः", "धिया", "वयम्", "नमः", "भरन्तः", "आ", "इमसि"],
            "उपत्वाग्ने दिवेदिवे दोषावस्तर्धिया वयम् । नमो भरन्त एमसि ॥",
        )
        self.assertEqual(method, "manual_override")
        self.assertEqual(len(ardharcas[0]), 7)
        self.assertEqual(len(ardharcas[1]), 4)

    def test_automatic_alignment_used_without_override(self):
        ardharcas, method = split_into_ardharcas(
            "1.1.1",
            ["अग्निम्", "ईळे", "पुरःऽहितम्", "यज्ञस्य", "देवम्", "ऋत्विजम्", "होतारम्", "रत्नऽधातमम्"],
            "अग्निमीळे पुरोहितं यज्ञस्य देवमृत्विजम् । होतारं रत्नधातमम् ॥",
        )
        self.assertEqual(method, "automatic_length_alignment")
        self.assertEqual(sum(len(a) for a in ardharcas), 8)


if __name__ == "__main__":
    unittest.main()
