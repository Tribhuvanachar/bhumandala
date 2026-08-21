"""gemini_ocr_commentary.py tests -- merge/validation logic only (no
network, no poppler). build_ocr_pages_text and merge_shlokas are where a
real bug would silently attach a commentary to the wrong verse or fabricate
one, so those get the most coverage."""
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

import gemini_ocr_commentary as goc
from link_english_commentary import load_json, save_json


class TestBuildOcrPagesText(unittest.TestCase):
    def test_labels_pages_starting_from_start_page(self):
        text = goc.build_ocr_pages_text({Path("a"): "first", Path("b"): "second"}, start_page=12)
        self.assertIn("--- Page 12 ---\nfirst", text)
        self.assertIn("--- Page 13 ---\nsecond", text)


class TestMergeShlokas(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="ocr-commentary-test-"))
        self.sarga_path = self.tmp / "sarga_1" / "data.json"
        self.sarga_path.parent.mkdir(parents=True)
        save_json(self.sarga_path, {
            "metadata": {"totalShlokas": 3, "availableCommentaries": {}},
            "shlokas": {
                "1": {"sa": "verse one", "commentaries": {}},
                "2": {"sa": "verse two", "commentaries": {}},
                "3": {"sa": "verse three", "commentaries": {}},
            },
        })

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _shlokas(self, overrides=None):
        base = [
            {"number": 1, "page": 1, "sa": "sa1", "commentary": "c1", "classification": "accept"},
            {"number": 2, "page": 1, "sa": "sa2", "commentary": "c2", "classification": "accept"},
        ]
        for i, o in (overrides or {}).items():
            base[i].update(o)
        return base

    def test_accept_classified_verses_merge_by_default(self):
        report = goc.merge_shlokas(self.sarga_path, self._shlokas(), "tika_x", "Tika X",
                                    include_review=False, include_unresolved=False, force=False)
        self.assertEqual(report["linked"], 2)
        data = load_json(self.sarga_path)
        self.assertEqual(data["shlokas"]["1"]["commentaries"]["tika_x"], "c1")
        self.assertEqual(data["metadata"]["availableCommentaries"]["tika_x"], "Tika X")

    def test_review_classified_is_held_back_by_default(self):
        shlokas = self._shlokas({0: {"classification": "review"}})
        report = goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                                    include_review=False, include_unresolved=False, force=False)
        self.assertEqual(report["linked"], 1)
        self.assertEqual(report["held_review"], 1)
        data = load_json(self.sarga_path)
        self.assertNotIn("tika_x", data["shlokas"]["1"]["commentaries"])

    def test_include_review_flag_merges_held_back_verses(self):
        shlokas = self._shlokas({0: {"classification": "review"}})
        report = goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                                    include_review=True, include_unresolved=False, force=False)
        self.assertEqual(report["linked"], 2)
        self.assertEqual(report["held_review"], 0)

    def test_unresolved_classified_is_held_back_by_default(self):
        shlokas = self._shlokas({1: {"classification": "unresolved"}})
        report = goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                                    include_review=False, include_unresolved=False, force=False)
        self.assertEqual(report["held_unresolved"], 1)
        self.assertEqual(report["linked"], 1)

    def test_verse_number_outside_canto_range_raises(self):
        shlokas = self._shlokas({0: {"number": 99}})
        with self.assertRaises(ValueError):
            goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                               include_review=False, include_unresolved=False, force=False)

    def test_nonexistent_shloka_number_raises(self):
        # canto has only 3 verses; a stray number 4 inside a valid-looking
        # range must still be caught rather than silently dropped/attached
        save_json(self.sarga_path, {
            "metadata": {"totalShlokas": 10, "availableCommentaries": {}},
            "shlokas": {"1": {"sa": "v", "commentaries": {}}},
        })
        shlokas = [{"number": 4, "page": 1, "sa": "sa", "commentary": "c", "classification": "accept"}]
        with self.assertRaises(ValueError):
            goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                               include_review=False, include_unresolved=False, force=False)

    def test_blank_commentary_field_is_skipped_not_written(self):
        shlokas = self._shlokas({0: {"commentary": "   "}})
        report = goc.merge_shlokas(self.sarga_path, shlokas, "tika_x", "Tika X",
                                    include_review=False, include_unresolved=False, force=False)
        self.assertEqual(report["skipped_blank"], 1)
        self.assertEqual(report["linked"], 1)

    def test_rerun_without_force_does_not_overwrite(self):
        goc.merge_shlokas(self.sarga_path, self._shlokas(), "tika_x", "Tika X",
                           include_review=False, include_unresolved=False, force=False)
        report = goc.merge_shlokas(self.sarga_path, self._shlokas(), "tika_x", "Tika X",
                                    include_review=False, include_unresolved=False, force=False)
        self.assertEqual(report["linked"], 0)
        self.assertEqual(report["skipped_existing"], 2)

    def test_content_field_sa_uses_verse_text_instead_of_commentary(self):
        report = goc.merge_shlokas(self.sarga_path, self._shlokas(), "mula_x", "Mula X",
                                    include_review=False, include_unresolved=False, force=False,
                                    content_field="sa")
        data = load_json(self.sarga_path)
        self.assertEqual(data["shlokas"]["1"]["commentaries"]["mula_x"], "sa1")

    def test_no_top_level_shlokas_dict_raises(self):
        bad_path = self.tmp / "bad.json"
        save_json(bad_path, {"items": []})
        with self.assertRaises(ValueError):
            goc.merge_shlokas(bad_path, self._shlokas(), "tika_x", "Tika X",
                               include_review=False, include_unresolved=False, force=False)


if __name__ == "__main__":
    unittest.main()
