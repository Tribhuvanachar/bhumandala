"""dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/data.json

Checks the committed output of tools/pratishakhya/import_rv_pratishakhya.py
and tools/pratishakhya/crosscheck_vedavishtaram.py, not the scripts
themselves (no network here, per run_tests.sh). Guards the facts
dge/RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md relies on: the total sutra
count, the patala 10 (Krama) / patala 11 (Kramahetu) counts cross-checked
against secondary sources, sutras verified by hand against the source,
the SLP1 "x" = Vedic retroflex la fix, and the specific resolver bug
(an empty pre/post anchor swallowing a stray character) caught and fixed
while cross-checking against VedaVishtaram -- so a re-run of either
script that regresses any of this gets caught.
"""

import json
import os
import unittest

REPO = os.path.join(os.path.dirname(__file__), "..")
DATA_PATH = os.path.join(
    REPO, "dge", "data", "vedanga", "shiksha", "pratishakhya",
    "rigveda_pratishakhya", "data.json",
)


class RigvedaPratishakhyaData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(DATA_PATH, encoding="utf-8") as f:
            cls.data = json.load(f)
        cls.by_id = {item["id"]: item for item in cls.data["items"]}

    def test_total_and_patala_counts(self):
        self.assertEqual(len(self.data["items"]), 1067)
        counts = {}
        for item in self.data["items"]:
            counts[item["patala"]] = counts.get(item["patala"], 0) + 1
        # Krama and Kramahetu patalas -- the ones this repo's Krama-patha
        # spec (RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md sec.2.1/4a.1) cross-
        # checked exactly against two independent secondary sources.
        self.assertEqual(counts[10], 22)
        self.assertEqual(counts[11], 71)
        self.assertEqual(sum(counts.values()), 1067)

    def test_licence_and_provenance_recorded(self):
        self.assertIn("CC BY-NC-SA", self.data["licence"])
        self.assertIn("sanskritlibrary.org", self.data["source_url"])

    def test_verified_krama_sutras(self):
        # Hand-verified against the source (dge/RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md
        # sec.4a.1) -- these are also the sutras that had appeared
        # unattributed in the review that started this whole document.
        # 10.20 and 10.22 were initially uncertain ("[?]" in the source)
        # and are here because crosscheck_vedavishtaram.py's hand-verified
        # resolution table (sec.4c) later resolved them -- see
        # test_hand_verified_uncertain_resolutions below for the rest of
        # that table.
        expected = {
            "10.1": "क्रमः।",
            "10.7": "अन्तःपदम् च येषाम् स्यात् विकारः अनन्यकारितः एतानि परिगृह्णीयात्।",
            "10.8": "बहुमध्यगतानि च।",
            "10.9": "अर्धर्चान्त्यम् च।",
            "10.12": "उपस्थितम् सेतिकरणम्।",
            "10.16": "समासान् तु पुनर्वचने इङ्ग्येत्।",
            "10.18": "सन्धिः न अर्धर्चयोः भवेत्।",
            "10.20": "नकारस्य ऊष्मवत् वृत्तम् प्लुतोपाचरिते नतिः, प्रश्लेषः च प्रगृह्यस्य प्रकृत्या स्युः परिग्रहे।",
            "10.21": "शौद्धाक्षरागमः अपैति।",
            "10.22": "न्यायम् यानि उत्तरे त्रयः, रिफितानि ऊष्मणः अघोषे दूभावः स्वधितिः इव च।",
            "11.19": "चतुःक्रमः तु आचरितः अत्र शाकलैः।",
        }
        # These two were initially uncertain and only carry a
        # non-empty `crosscheck` because they went through the
        # resolution table; the rest were clean from the first import
        # and were never routed through the crosscheck script at all.
        resolved_via_crosscheck = {"10.20", "10.22"}
        for sutra_id, text in expected.items():
            with self.subTest(sutra=sutra_id):
                self.assertEqual(self.by_id[sutra_id]["text_devanagari"], text)
                self.assertFalse(self.by_id[sutra_id]["has_uncertain_reading"])
                if sutra_id in resolved_via_crosscheck:
                    self.assertTrue(self.by_id[sutra_id]["crosscheck"])

    def test_genuinely_unresolved_readings_are_not_guessed(self):
        # 10.3 and 11.8 were checked against VedaVishtaram
        # (crosscheck_vedavishtaram.py) and deliberately left unresolved:
        # 10.3 is a genuine apparent edition variant (Im vs I), 11.8 has
        # no independent confirmation at all. Neither should ever come
        # back with a guessed text_devanagari.
        for sutra_id in ("10.3", "11.8"):
            with self.subTest(sutra=sutra_id):
                item = self.by_id[sutra_id]
                self.assertTrue(item["has_uncertain_reading"])
                self.assertEqual(item["text_devanagari"], "")
                self.assertIn("[?]", item["text_slp1"])
                self.assertTrue(item["crosscheck"])  # checked, not skipped

    def test_hand_verified_uncertain_resolutions_cover_patala_10_11(self):
        # Every has_uncertain_reading sutra in patala 10-11 must have been
        # through the hand-verified table (resolved or deliberately
        # skipped) -- none should be silently untouched by the crosscheck.
        for item in self.data["items"]:
            if item["patala"] in (10, 11) and item["has_uncertain_reading"]:
                self.assertTrue(item["crosscheck"], item["id"])

    def test_vedic_retroflex_la_transliterated_correctly(self):
        # Sanskrit Library's SLP1 uses "x" for the Vedic retroflex la
        # (Xa), not standard SLP1's vocalic X -- see
        # import_rv_pratishakhya.py's transliterate_sutra docstring.
        # 3.23/3.28 name the grammarian VyALi (व्याळिः), confirmed against
        # VedaVishtaram's own Uvata Bhasya spelling it out unambiguously.
        for sutra_id in ("3.23", "3.28"):
            with self.subTest(sutra=sutra_id):
                self.assertIn("व्याळि", self.by_id[sutra_id]["text_devanagari"])

    def test_algorithmic_resolution_does_not_swallow_neighbouring_words(self):
        # Regression guard for a real bug caught while building the
        # crosscheck: an empty pre/post anchor (the "[?]" sits at a word
        # edge) matched an unanchored empty string, which let the regex
        # return the LEFTMOST satisfying position in the whole sutra
        # instead of the actual gap -- e.g. 1.39 resolved to a doubled
        # "prathamapaJcamO ca dvA U" instead of just "u". Any
        # algorithmically-resolved sutra's resolved text must be a
        # plausible single reading, not a multi-word fragment.
        for item in self.data["items"]:
            if "unambiguous same-index" in item.get("crosscheck", ""):
                with self.subTest(sutra=item["id"]):
                    # the resolved text should not repeat any 3+ word
                    # sequence from earlier in the same string
                    words = item["text_devanagari"].split()
                    seen = set()
                    for i in range(len(words) - 2):
                        trigram = tuple(words[i:i + 3])
                        self.assertNotIn(trigram, seen, item["text_devanagari"])
                        seen.add(trigram)

    def test_every_item_has_expected_shape(self):
        required_keys = {
            "id", "patala", "patala_name", "sutra", "text_devanagari",
            "text_iast", "text_slp1", "has_uncertain_reading", "apparatus",
            "has_cross_reference_content", "domain", "crosscheck",
        }
        for item in self.data["items"]:
            self.assertTrue(required_keys.issubset(item.keys()), item["id"])
            self.assertEqual(item["id"], f"{item['patala']}.{item['sutra']}")

    def test_krama_and_kramahetu_domain_tagged(self):
        for item in self.data["items"]:
            if item["patala"] == 10:
                self.assertEqual(item["domain"], "krama")
            elif item["patala"] == 11:
                self.assertEqual(item["domain"], "kramahetu")


if __name__ == "__main__":
    unittest.main()
