"""gemini_client.py tests. No network: call_gemini's fallback logic is
tested by swapping in a fake _post()."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

import gemini_client as gc


class TestClassifyError(unittest.TestCase):
    def test_maps_known_statuses(self):
        self.assertEqual(gc.classify_error(400), "bad_request")
        self.assertEqual(gc.classify_error(401), "permission")
        self.assertEqual(gc.classify_error(403), "permission")
        self.assertEqual(gc.classify_error(404), "model_missing")
        self.assertEqual(gc.classify_error(429), "quota")
        self.assertEqual(gc.classify_error(500), "overloaded")
        self.assertEqual(gc.classify_error(503), "overloaded")

    def test_unknown_status_falls_back_to_unknown(self):
        self.assertEqual(gc.classify_error(418), "unknown")


class TestCallGeminiFallback(unittest.TestCase):
    """Mirrors dge/js/gemini.js: one attempt, one fallback attempt only for
    quota/model_missing/overloaded, no retry loop beyond that."""

    def setUp(self):
        self._real_post = gc._post
        self.calls = []

    def tearDown(self):
        gc._post = self._real_post

    def test_success_on_first_attempt_never_calls_fallback(self):
        def fake_post(model, body, api_key):
            self.calls.append(model)
            return {"ok": True}
        gc._post = fake_post
        result = gc.call_gemini("sys", "prompt", {"type": "object"}, "key", model="gemini-flash-latest")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(self.calls, ["gemini-flash-latest"])

    def test_quota_error_falls_back_once_to_the_lite_model(self):
        def fake_post(model, body, api_key):
            self.calls.append(model)
            if model == "gemini-flash-latest":
                raise gc.GeminiError("quota", "429")
            return {"ok": True}
        gc._post = fake_post
        result = gc.call_gemini("sys", "prompt", {"type": "object"}, "key", model="gemini-flash-latest")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(self.calls, ["gemini-flash-latest", "gemini-flash-lite-latest"])

    def test_bad_request_does_not_trigger_a_fallback_attempt(self):
        def fake_post(model, body, api_key):
            self.calls.append(model)
            raise gc.GeminiError("bad_request", "400")
        gc._post = fake_post
        with self.assertRaises(gc.GeminiError) as cm:
            gc.call_gemini("sys", "prompt", {"type": "object"}, "key", model="gemini-flash-latest")
        self.assertEqual(cm.exception.kind, "bad_request")
        self.assertEqual(self.calls, ["gemini-flash-latest"])

    def test_fallback_attempt_failing_too_still_raises(self):
        def fake_post(model, body, api_key):
            self.calls.append(model)
            raise gc.GeminiError("overloaded", "503")
        gc._post = fake_post
        with self.assertRaises(gc.GeminiError):
            gc.call_gemini("sys", "prompt", {"type": "object"}, "key", model="gemini-flash-latest")
        self.assertEqual(self.calls, ["gemini-flash-latest", "gemini-flash-lite-latest"])


if __name__ == "__main__":
    unittest.main()
