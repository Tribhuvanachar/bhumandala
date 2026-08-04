// dge/convert/gemini.js — Gemini proofreading, window.DGE.Gemini namespace.
// Same endpoint/model convention as the main reader app's ai.js, for
// consistency across the project.
window.DGE = window.DGE || {};
window.DGE.Gemini = (function () {

  const PROOFREAD_PROMPT = `You are proofreading raw OCR output from a scanned Sanskrit/Kannada devotional text. Rules:
1. Correct OCR mistakes only (misread characters, broken/merged words, obvious scan artifacts).
2. Do not rewrite, summarize, paraphrase, or "improve" the wording.
3. Preserve Sanskrit text exactly as intended — do not modernize or alter it.
4. Preserve Kannada text exactly as intended.
5. Preserve the original paragraph and page order.
6. Where distinguishable, identify which portions are the mula shloka (verse) text versus commentary/explanation.
7. Output ONLY valid JSON — no markdown code fences, no explanations before or after, no trailing commentary.

Output exactly this JSON shape:
{
  "shlokas": [
    { "number": 1, "sa": "corrected shloka text", "commentary": "corrected commentary text, or empty string if none" }
  ]
}

If a page doesn't cleanly split into shloka/commentary, put the whole corrected text in "sa" and leave "commentary" empty — do not invent a split that isn't actually there in the source.

Raw OCR input follows:
`;

  // Constrains Gemini's decoding to always emit syntactically valid JSON
  // matching this shape — this is the primary fix for "Could not parse
  // JSON from the model's response" failures, which were previously
  // caused by the model emitting an unescaped character or similar
  // syntax slip somewhere inside a long free-form response.
  const PROOFREAD_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      shlokas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: { type: 'integer' },
            sa: { type: 'string' },
            commentary: { type: 'string' }
          },
          required: ['sa']
        }
      }
    },
    required: ['shlokas']
  };

  async function proofread(ocrPagesText, apiKey, model) {
    const modelName = model || 'gemini-3.6-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = PROOFREAD_PROMPT + '\n\n' + ocrPagesText;

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: PROOFREAD_RESPONSE_SCHEMA
          }
        })
      });
    } catch (e) {
      throw new Error('Network error reaching Gemini API: ' + e.message);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) throw new Error('Gemini API key rejected: ' + msg);
      if (res.status === 429) throw new Error('Gemini quota/rate limit exceeded: ' + msg);
      throw new Error('Gemini API error: ' + msg);
    }

    const candidate = data.candidates && data.candidates[0];
    const finishReason = candidate && candidate.finishReason;

    // Check finishReason BEFORE attempting to parse — a MAX_TOKENS cutoff
    // can still leave a non-empty but incomplete `text`, which would
    // otherwise reach the JSON parser and surface as a confusing generic
    // syntax error instead of the real cause.
    if (finishReason === 'MAX_TOKENS') {
      throw new Error('Gemini\'s response was cut off before finishing (hit the output token limit) — this chunk is too large for one request. Try a smaller chunk size and re-run Proofread (it will resume from this chunk).');
    }
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini stopped early (reason: ${finishReason}) instead of completing normally.`);
    }

    const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;
    if (!text) {
      throw new Error('Gemini returned no usable content.');
    }

    return window.DGE.Utils.parseJsonLoose(text);
  }

  return { proofread };
})();
