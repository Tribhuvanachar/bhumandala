"""gemini_summarize.py tests. Generic client mechanics are covered in
tests/test_gemini_client.py; this file covers only this script's own
logic (which fields get filled, idempotency, dry-run mock). No network."""
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

import gemini_summarize as gs
from link_english_commentary import load_json, save_json


class TestAnalyzeShloka(unittest.TestCase):
    def test_dry_run_fills_all_three_fields_by_default(self):
        shloka = {"sa": "रामो राजमणिः सदा विजयते", "commentaries": {}}
        changed = gs.analyze_shloka(shloka, None, "m", dry_run=True, force=False,
                                     fields=["padaccheda", "anvaya", "summary"])
        self.assertTrue(changed)
        self.assertIn("gemini_padaccheda", shloka["commentaries"])
        self.assertIn("gemini_anvaya", shloka["commentaries"])
        self.assertIn("gemini_summary", shloka["commentaries"])

    def test_blank_sanskrit_text_is_left_alone(self):
        shloka = {"sa": "   ", "commentaries": {}}
        changed = gs.analyze_shloka(shloka, None, "m", dry_run=True, force=False,
                                     fields=["summary"])
        self.assertFalse(changed)
        self.assertEqual(shloka["commentaries"], {})

    def test_rerun_without_force_does_not_overwrite(self):
        shloka = {"sa": "text", "commentaries": {"gemini_summary": "ORIGINAL"}}
        changed = gs.analyze_shloka(shloka, None, "m", dry_run=True, force=False,
                                     fields=["summary"])
        self.assertFalse(changed)
        self.assertEqual(shloka["commentaries"]["gemini_summary"], "ORIGINAL")

    def test_force_overwrites(self):
        shloka = {"sa": "text", "commentaries": {"gemini_summary": "ORIGINAL"}}
        changed = gs.analyze_shloka(shloka, None, "m", dry_run=True, force=True,
                                     fields=["summary"])
        self.assertTrue(changed)
        self.assertNotEqual(shloka["commentaries"]["gemini_summary"], "ORIGINAL")

    def test_only_requested_fields_are_filled(self):
        shloka = {"sa": "text", "commentaries": {}}
        gs.analyze_shloka(shloka, None, "m", dry_run=True, force=False, fields=["summary"])
        self.assertIn("gemini_summary", shloka["commentaries"])
        self.assertNotIn("gemini_padaccheda", shloka["commentaries"])
        self.assertNotIn("gemini_anvaya", shloka["commentaries"])

    def test_existing_english_translation_is_passed_as_context(self):
        # verify build_prompt actually includes the translation when present
        prompt = gs.build_prompt("सा", "an English translation")
        self.assertIn("an English translation", prompt)
        self.assertIn("सा", prompt)

    def test_no_translation_omits_that_section(self):
        prompt = gs.build_prompt("सा", None)
        self.assertNotIn("Existing published", prompt)


class TestRun(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="gs-run-test-"))
        self.sarga_dir = self.tmp / "sargas"
        (self.sarga_dir / "sarga_1").mkdir(parents=True)
        save_json(self.sarga_dir / "sarga_1" / "data.json", {
            "metadata": {"totalShlokas": 2, "availableCommentaries": {}},
            "shlokas": {
                "1": {"sa": "verse one", "commentaries": {}},
                "2": {"sa": "verse two", "commentaries": {}},
            },
        })

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_dry_run_analyzes_every_verse_and_labels_them(self):
        rc = gs.run(self.sarga_dir, [1], "m", dry_run=True, force=False, limit=None,
                    fields=["summary"])
        self.assertEqual(rc, 0)
        data = load_json(self.sarga_dir / "sarga_1" / "data.json")
        self.assertIn("gemini_summary", data["shlokas"]["1"]["commentaries"])
        self.assertIn("gemini_summary", data["shlokas"]["2"]["commentaries"])
        self.assertEqual(data["metadata"]["availableCommentaries"]["gemini_summary"],
                          "AI Summary (Gemini, unreviewed)")

    def test_limit_caps_total_verses_considered(self):
        rc = gs.run(self.sarga_dir, [1], "m", dry_run=True, force=False, limit=1,
                    fields=["summary"])
        self.assertEqual(rc, 0)
        data = load_json(self.sarga_dir / "sarga_1" / "data.json")
        self.assertIn("gemini_summary", data["shlokas"]["1"]["commentaries"])
        self.assertNotIn("gemini_summary", data["shlokas"]["2"]["commentaries"])

    def test_missing_api_key_without_dry_run_is_a_clean_error(self):
        os.environ.pop("GEMINI_API_KEY", None)
        rc = gs.run(self.sarga_dir, [1], "m", dry_run=False, force=False, limit=None,
                    fields=["summary"])
        self.assertEqual(rc, 1)


if __name__ == "__main__":
    unittest.main()
