"""dge/data/vedanga/shiksha/pratishakhya/rigveda_pratishakhya/data.json

Checks the committed output of tools/pratishakhya/import_rv_pratishakhya.py,
not the importer itself (no network here, per run_tests.sh). Guards the
facts dge/RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md relies on: the total sutra
count, the patala 10 (Krama) / patala 11 (Kramahetu) counts that were
cross-checked against secondary sources, and a handful of sutras verified
by hand against the source -- so a re-run of the importer that silently
drops or corrupts them gets caught.
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
        expected = {
            "10.1": "क्रमः।",
            "10.7": "अन्तःपदम् च येषाम् स्यात् विकारः अनन्यकारितः एतानि परिगृह्णीयात्।",
            "10.8": "बहुमध्यगतानि च।",
            "10.9": "अर्धर्चान्त्यम् च।",
            "10.12": "उपस्थितम् सेतिकरणम्।",
            "10.16": "समासान् तु पुनर्वचने इङ्ग्येत्।",
            "10.18": "सन्धिः न अर्धर्चयोः भवेत्।",
            "10.21": "शौद्धाक्षरागमः अपैति।",
            "11.19": "चतुःक्रमः तु आचरितः अत्र शाकलैः।",
        }
        for sutra_id, text in expected.items():
            with self.subTest(sutra=sutra_id):
                self.assertEqual(self.by_id[sutra_id]["text_devanagari"], text)
                self.assertFalse(self.by_id[sutra_id]["has_uncertain_reading"])

    def test_uncertain_readings_are_not_guessed(self):
        # 10.20 and 10.22 carry the source's own "[?]" OCR-uncertainty
        # marker (see tools/pratishakhya/SOURCES.md) -- an earlier draft
        # of the architecture doc silently guessed "u" for these; the
        # shipped data must NOT do that.
        for sutra_id in ("10.20", "10.22"):
            with self.subTest(sutra=sutra_id):
                item = self.by_id[sutra_id]
                self.assertTrue(item["has_uncertain_reading"])
                self.assertEqual(item["text_devanagari"], "")
                self.assertIn("[?]", item["text_slp1"])

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
