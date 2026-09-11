#!/usr/bin/env python3
"""Predicate classifiers for the Krama engine: is_pragrhya, is_rephi,
requires_parigraha, avagraha/compound segmentation, and the sutra 10.3
monosyllable-exception detector.

Built as functions taking (token, context), not flat lookup tables, per
the reviewed spec (11 Sep 2026): "the existing Gemini design used a flat
dictionary. That is insufficient because Pragrhya is partly contextual."
A dictionary is still used as a CACHE inside each function for the closed
lexical classes (Panini/Paatala-1 name specific words), never as the
definition itself.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sanskrit_phonology import transliterate_word, ALL_VOWELS, DIPHTHONGS  # noqa: E402

# Paatala 1's closed pragrhya lexical class (asme, yuSme, tve, amii and
# their like) plus the dual-in-ii/uu/e morphological class -- see
# dge/RV_PRATISHAKHYA_KRAMA_ARCHITECTURE.md sec.6.1 for why this must stay
# a predicate, not a flat list: the morphological/contextual classes below
# are NOT lexical and cannot be enumerated.
PRAGRHYA_LEXICAL_SLP1 = {"asme", "yuzme", "tve", "amI", "amU"}


def is_pragrhya(token_deva, context=None):
    """context, when given, is a dict that may carry {"is_dual": bool,
    "is_amantrita": bool} for the morphological/contextual classes this
    predicate still needs a caller to supply (this module cannot itself
    parse full nominal morphology -- that is a real, separate gap, not
    silently assumed away: see the False-returning fallback's note)."""
    s = transliterate_word(token_deva)
    if s in PRAGRHYA_LEXICAL_SLP1:
        return True, "lexical (Paatala 1 closed class: asme/yuSme/tve/amI/amU)"
    if context:
        if context.get("is_dual") and s and s[-1] in ("I", "U", "e"):
            # dual nominal forms ending in -ii/-uu/-e are pragrhya
            # (Paatala 1's morphological class)
            return True, "morphological (dual ending in -ii/-uu/-e)"
        if context.get("is_amantrita") and s and s[-1] == "e":
            return True, "contextual (aamantrita vocative ending in -e)"
        if context.get("is_amantrita") and s and s[-1] == "o":
            # sutra 1.68 ("okAra AmantritajaH pragfhyaH" -- the vowel 'o'
            # arising from vocative is pragrhya), found missing from this
            # function entirely 11 Sep 2026 while fact-checking an external
            # citation (which itself cited the wrong sutra number, 1.74
            # instead of the correct 1.68, but the underlying substance
            # checked out against this project's own corpus). Gated on
            # is_amantrita, like the -e case above, because plenty of
            # non-vocative words also end in "o" (e.g. any a-class visarga
            # word after visarga_a_class_before_voiced) and are NOT
            # pragrhya for that reason -- this predicate still cannot
            # itself distinguish "vocative o" from "o that arose from
            # visarga sandhi" without the caller telling it which case it
            # is, same limitation as the existing amantrita-e check.
            return True, "contextual (aamantrita vocative ending in -o, sutra 1.68)"
    return False, "not matched (lexical/morphological/contextual checks all negative -- " \
                  "context-dependent classes not checked here return False if context " \
                  "wasn't supplied by the caller, not because they were ruled out)"


# Rephi: a cache of forms already confirmed rephita in this corpus (from
# krama_kramahetu_rules.json's 10.22/11.40-41 examples), NOT the
# definition -- the real condition (per 10.22) is phonological: a word
# whose visarga arose from an original word-final "r" (repha), tested
# against what FOLLOWS (an unvoiced sibilant keeps the repha-derived
# form; see krama_engine.py's use of this alongside samhita_join's own
# visarga rules, which don't independently know a given word's
# historical repha origin).
REPHI_CACHE_SLP1 = {"svaScanAH", "dhUHsadam", "pUHpatim", "duHnaSam", "durdhyaH", "durlaBaH"}


def is_rephi(token_deva, left_context=None, right_context_slp1_first_char=None):
    """right_context_slp1_first_char: the first SLP1 character of the
    word that follows, needed because 10.22's rule is specifically about
    behaviour before an UNVOICED sibilant -- this predicate does not
    itself decide the phonological outcome (samhita_join does that); it
    only says whether the word belongs to the rephita class at all."""
    s = transliterate_word(token_deva)
    if s in REPHI_CACHE_SLP1:
        return True
    # Real phonological derivation of repha-origin from a bare surface
    # form alone is not reliable without etymological/paradigm
    # information this module doesn't have -- returning False here for
    # anything not in the cache is a known, stated limitation (see
    # module docstring), not a claim that the cache is exhaustive.
    return False


def parse_compound(token_deva):
    """Returns {"is_compound": bool, "segments": [...]} -- preserves
    structure rather than leaving an unexplained avagraha character in a
    plain string, per the reviewed spec sec.6.3."""
    if "ऽ" not in token_deva:
        return {"is_compound": False, "segments": [token_deva]}
    return {"is_compound": True, "segments": token_deva.split("ऽ")}


# sutra 10.3's monosyllable-exception class: single-syllable words that
# stop the ordinary Krama pairing chain rather than continuing forward in
# the usual way (Uvata's own examples: aa, aum). Kept as a small, named
# set -- this IS a closed lexical class per the sutra's own text (not a
# phonological pattern to derive), unlike is_pragrhya/is_rephi above.
MONOSYLLABLE_AVASANA_SLP1 = {"A", "oM", "auM"}


def is_monosyllable_avasana(token_deva):
    s = transliterate_word(token_deva)
    return s in MONOSYLLABLE_AVASANA_SLP1


def requires_parigraha(token_deva, position_in_ardharca, ardharca_length, is_bahumadhyagata=False):
    """position_in_ardharca: 0-based index. Returns (bool, reasons_list)
    where reasons_list cites which of 10.7 (avagrhya)/10.8 (bahumadhyagata,
    caller-supplied since this module doesn't itself parse multi-word
    compound-phrase membership)/10.9 (ardharca-final) fired."""
    reasons = []
    if parse_compound(token_deva)["is_compound"]:
        reasons.append("10.7")
    if is_bahumadhyagata:
        reasons.append("10.8")
    if position_in_ardharca == ardharca_length - 1:
        reasons.append("10.9")
    return bool(reasons), reasons


def get_sthita(token_deva):
    """10.13: the bare word alone (its own pada-patha spelling, avagraha
    included if it's a compound -- 10.16's split-in-the-repeat form)."""
    return token_deva


def get_upasthita(token_deva):
    """10.12: word + iti, no sandhi between them (per Uvata's own
    worked example on 10.14, 'vibhaavaso iti vibhaavaso')."""
    return f"{token_deva} इति"


def get_sthitopasthita(token_deva, combined_form_deva=None):
    """10.14: sthita + upasthita given together. If the word is an
    avagrhya compound (10.16: the repeat shows the avagraha split),
    combined_form_deva should be supplied as the already-samhita-joined
    (non-split) rendering -- see krama_engine.py, which computes that via
    sanskrit_phonology.resolve_compound before calling this."""
    compound = parse_compound(token_deva)
    first_form = combined_form_deva if combined_form_deva else token_deva
    second_form = token_deva  # bare pada form, split if it's a compound (10.16)
    return f"{first_form} इति {second_form}"


if __name__ == "__main__":
    tests = [
        ("अस्मे", True),
        ("अग्निम्", False),
        ("आ", None),  # not pragrhya; tested separately below for monosyllable
    ]
    for tok, expected in tests[:2]:
        ok, reason = is_pragrhya(tok)
        status = "OK" if ok == expected else "FAIL"
        print(f"{status} is_pragrhya({tok!r}) = {ok} ({reason})")
    print("is_monosyllable_avasana('आ') =", is_monosyllable_avasana("आ"))
    print("parse_compound('पुरःऽहितम्') =", parse_compound("पुरःऽहितम्"))
    print("requires_parigraha('पुरःऽहितम्', 2, 6) =", requires_parigraha("पुरःऽहितम्", 2, 6))
    print("requires_parigraha('ऋत्विजम्', 5, 6) =", requires_parigraha("ऋत्विजम्", 5, 6))
    print("get_sthitopasthita('पुरःऽहितम्', 'पुरोहितम्') =", get_sthitopasthita("पुरःऽहितम्", "पुरोहितम्"))
