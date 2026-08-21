"""
gemini_client.py — shared Gemini REST client for DGE's batch enrichment
scripts (tools/gemini_enrich.py, tools/gemini_summarize.py, and any future
one). Mirrors dge/js/gemini.js's request shape and its deliberately
retry-less, one-fallback-attempt error handling (see
dge/GEMINI_ERROR_HANDLING.md for why this codebase does not build a
backoff loop around Gemini's own quota errors). Uses only the standard
library (urllib) -- no new dependency, and no state of its own: every
call takes its own api_key/model, so callers control retries/concurrency.

This module makes no policy decisions about WHAT to ask Gemini for --
system instruction, prompt, and response schema are all caller-supplied.
It only owns the HTTP mechanics and the shared error taxonomy, so two
different enrichment tasks (citation detection vs. padaccheda/summary)
don't each reimplement the same request-building/error-classification
code with a chance to drift apart.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

API_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
DEFAULT_MODEL = "gemini-flash-latest"
FALLBACK_MODEL = "gemini-flash-lite-latest"
# same three kinds dge/js/gemini.js falls back on -- see shouldFallback() there
FALLBACK_ELIGIBLE = {"quota", "model_missing", "overloaded"}


class GeminiError(Exception):
    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind


def classify_error(status: int) -> str:
    # same status -> kind mapping as dge/js/gemini.js's classifyError()
    if status == 400:
        return "bad_request"
    if status in (401, 403):
        return "permission"
    if status == 404:
        return "model_missing"
    if status == 429:
        return "quota"
    if status in (500, 503):
        return "overloaded"
    return "unknown"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _post(model: str, body: dict, api_key: str) -> dict:
    url = API_URL_TMPL.format(model=model, key=api_key)
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise GeminiError(classify_error(e.code), f"HTTP {e.code}: {detail[:300]}")
    except urllib.error.URLError as e:
        raise GeminiError("network", str(e.reason))
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise GeminiError("bad_response", f"could not parse Gemini response: {e}")


def call_gemini(
    system_instruction: str,
    prompt: str,
    response_schema: dict,
    api_key: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.2,
    max_output_tokens: int = 4096,
) -> dict:
    """One attempt against `model`; one fallback attempt against
    FALLBACK_MODEL only for quota/model_missing/overloaded -- deliberately no
    retry/backoff loop beyond that, matching dge/js/gemini.js's generate().
    Returns the parsed JSON object Gemini's structured output produced."""
    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
        },
    }
    try:
        return _post(model, body, api_key)
    except GeminiError as e:
        if e.kind in FALLBACK_ELIGIBLE and model != FALLBACK_MODEL:
            return _post(FALLBACK_MODEL, body, api_key)
        raise
