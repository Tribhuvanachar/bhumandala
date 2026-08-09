// dge/convert/gemini.js — Gemini proofreading, window.DGE.Gemini namespace.
// Same endpoint/model convention as the main reader app's ai.js, for
// consistency across the project.
window.DGE = window.DGE || {};
window.DGE.Gemini = (function () {

  // Some pages carry two independent OCR readings (Vision + a Tesseract
  // cross-check, when that opt-in was used); app.js formats those pages
  // with "[Vision]"/"[Tesseract]" labels. This prompt explicitly asks Gemini
  // to compare rather than blindly rewrite — per the project's OCR
  // verification policy, correction happens only where the readings agree
  // or context clearly resolves a disagreement, and every shloka gets a
  // self-reported classification instead of a silent, unqualified rewrite.
  const PROOFREAD_PROMPT = `You are proofreading raw OCR output from a scanned Sanskrit/Kannada devotional text.

Some pages below include TWO independent OCR readings from different engines, in this format:
--- Page N ---
[Vision]
<text>
[Tesseract]
<text>
Pages with only one reading show it with no engine label — there was nothing to compare it against.

Rules:
1. Correct OCR mistakes only (misread characters, broken/merged words, obvious scan artifacts). Do not rewrite, summarize, paraphrase, or "improve" the wording.
2. When two readings are given for a page: where they agree (even loosely, allowing for the kind of surface variation different OCR engines produce), that agreement is strong evidence — use it directly rather than inventing a third reading. Where they disagree, use context (grammar, known vocabulary, metre, the surrounding sentence) to choose the more plausible one.
3. Preserve Sanskrit and Kannada text exactly as intended — do not modernize or alter it.
4. Preserve the original paragraph and page order.
5. Where distinguishable, identify which portions are the mula shloka (verse) text versus commentary/explanation.
6. Never invent text that isn't grounded in at least one OCR reading for that page, beyond fixing an obvious small OCR-level error (broken characters, merged words) that context clearly resolves.
7. For every shloka, self-report a "classification":
   - "accept": the two readings agree, or only one reading existed and it's unambiguous and plausible as-is.
   - "review": readings disagreed and you resolved it using context — likely correct, but a human should still glance at it.
   - "unresolved": you cannot determine confident text (readings are implausible, contradictory, or the source itself looks illegible). Keep your best-guess text in "sa" regardless, but do not invent details neither reading actually shows.
   Add a brief "note" explaining why, but only when classification is not "accept" — omit it (empty string) otherwise.
8. Also report which page (the number from the "--- Page N ---" marker) each shloka came from, in "page".
9. Output ONLY valid JSON — no markdown code fences, no explanations before or after, no trailing commentary.

Output exactly this JSON shape:
{
  "shlokas": [
    { "number": 1, "page": 3, "sa": "corrected shloka text", "commentary": "corrected commentary text, or empty string if none", "classification": "accept", "note": "" }
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
            page: { type: 'integer' },
            sa: { type: 'string' },
            commentary: { type: 'string' },
            classification: { type: 'string', enum: ['accept', 'review', 'unresolved'] },
            note: { type: 'string' }
          },
          required: ['sa', 'classification']
        }
      }
    },
    required: ['shlokas']
  };

  // Delegates network + error classification to the shared window.DGEGemini
  // client (js/gemini.js) -- same human-readable quota/permission/network
  // messages and one-step lighter-model fallback as Ashtadhyayi/Kosha now
  // get. The structured-JSON-output constraint (responseMimeType/Schema)
  // and the finishReason/JSON-parse checks below are Convert-specific and
  // stay on top of the shared client's response rather than inside it.
  async function proofread(ocrPagesText, apiKey, model) {
    const modelName = model || 'gemini-3.6-flash';
    const prompt = PROOFREAD_PROMPT + '\n\n' + ocrPagesText;

    const r = await window.DGEGemini.generate({
      prompt: prompt, apiKey: apiKey, model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: PROOFREAD_RESPONSE_SCHEMA
      }
    });

    if (!r.ok) {
      throw new Error(r.error.title + ': ' + r.error.message + ' ' + r.error.action);
    }

    const candidate = r.raw && r.raw.candidates && r.raw.candidates[0];
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

    if (!r.text) {
      throw new Error('Gemini returned no usable content.');
    }
    if (r.fellBack) console.warn('[Convert] ' + r.notice);

    return window.DGE.Utils.parseJsonLoose(r.text);
  }

  return { proofread };
})();
