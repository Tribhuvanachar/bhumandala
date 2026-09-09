"""tools/dvaitavedanta/import_sumadhva_vijaya.py — the repeating verse/commentary
shape this grantha's pages actually have, and the text guard that stops a
verse's commentary being bound to the wrong verse."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "dvaitavedanta"))

import import_sumadhva_vijaya as smv  # noqa: E402


PAGE = """
<p class="MsoPlainText"><strong>श्रीमत्कविकुलतिलक…</strong></p>
<h1>कान्ताय कल्याणगुणैकधाम्ने ।</h1>
<h1>नारायणायाखिलकारणाय ।। १ ।।</h1>
<p><strong>श्रीनारायणपण्डिताचार्यविरचिता</strong></p>
<h3>भावप्रकाशिका</h3>
<p>नमो जयात्मने ।</p>
<h3>मन्दोपाकारिणी</h3>
<p>लक्ष्मीनारायणं देवम् ।</p>
<h1>अनाकुलं गोकुलम् ।</h1>
<h1>तस्मै नमो नीरदनीलभासे ।। २ ।।</h1>
<h3>मन्दोपाकारिणी</h3>
<p>इदानीं वेदव्यासः ।</p>
"""


class ParseSarga(unittest.TestCase):
    def setUp(self):
        self.preamble, self.verses, self.order, self.leftover = smv.parse_sarga(PAGE)

    def test_each_numbered_h1_run_closes_one_verse(self):
        self.assertEqual(self.order, [1, 2])
        self.assertIn("कान्ताय", self.verses[1]["mula"])
        self.assertIn("नारायणाया", self.verses[1]["mula"])
        self.assertEqual(self.leftover, [])

    def test_a_commentary_attaches_to_the_verse_above_it_not_below(self):
        # The whole reason the general extractor lost this text: the second
        # verse's commentary sits after the first verse's, and only document
        # order says which verse each belongs to.
        self.assertIn("भावप्रकाशिका", self.verses[1]["commentaries"])
        self.assertNotIn("भावप्रकाशिका", self.verses[2]["commentaries"])
        self.assertIn("इदानीं", self.verses[2]["commentaries"]["मन्दोपाकारिणी"])

    def test_the_header_before_the_first_verse_is_not_commentary(self):
        self.assertTrue(self.preamble)
        for verse in self.verses.values():
            for text in verse["commentaries"].values():
                self.assertNotIn("कविकुलतिलक", text)

    def test_an_attribution_line_between_verse_and_h3_is_dropped(self):
        self.assertNotIn("विरचिता", self.verses[1]["commentaries"]["भावप्रकाशिका"])


class CommentaryNames(unittest.TestCase):
    def test_a_bare_name_maps_to_its_slug(self):
        self.assertEqual(smv.commentary_slug("मन्दोपाकारिणी")[1], "mandopakarini")

    def test_an_attributed_heading_still_maps(self):
        # sarga 9 opens "श्रीछलारिशेषाचार्यविरचिता मन्दोपाकारिणी"; dropping it
        # would lose that sarga's whole मन्दोपाकारिणी run.
        name, slug = smv.commentary_slug("श्रीछलारिशेषाचार्यविरचिता मन्दोपाकारिणी")
        self.assertEqual(slug, "mandopakarini")
        self.assertEqual(name, "मन्दोपाकारिणी")

    def test_a_heading_naming_none_of_the_three_is_refused(self):
        self.assertEqual(smv.commentary_slug("प्रश्न-उत्तर"), (None, None))


class TextGuard(unittest.TestCase):
    SITE = {
        38: {"mula": "अथ प्रथमपादः कथ्यते ।। ३८ ।।", "commentaries": {}},
        39: {"mula": "द्वितीयोऽयमधिकारः ।। ३९ ।।", "commentaries": {}},
        40: {"mula": "तृतीयमिदमुच्यते ।। ४० ।।", "commentaries": {}},
    }

    def test_hyphenation_and_numbering_do_not_defeat_a_match(self):
        # Our mula keeps the compounds hyphenated; the site does not.
        n, ratio = smv.best_match("अथ प्रथम-पादः कथ्यते ॥ ३८ ॥", self.SITE, 38)
        self.assertEqual(n, 38)
        self.assertGreater(ratio, 0.9)

    def test_a_renumbered_verse_is_found_at_its_real_number(self):
        # Sarga 11: the site runs ahead of us, so our 38 is their 40.
        n, ratio = smv.best_match("तृतीयमिदमुच्यते ॥ ३८ ॥", self.SITE, 38)
        self.assertEqual(n, 40)
        self.assertGreater(ratio, 0.9)

    def test_a_verse_the_site_does_not_have_scores_below_the_floor(self):
        _, ratio = smv.best_match("सर्वथा भिन्नमिदं वचनम् ॥ ३८ ॥", self.SITE, 38)
        self.assertLess(ratio, smv.MATCH_FLOOR)

    def test_squash_ignores_dandas_numerals_and_joiners(self):
        self.assertEqual(smv.squash("क-ख ।। १२ ।।"), smv.squash("कख"))


if __name__ == "__main__":
    unittest.main()
