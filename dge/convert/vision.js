// dge/convert/vision.js — Google Cloud Vision OCR, window.DGE.Vision namespace.
// Confirmed working via direct browser fetch (no CORS block) before this
// was built — see dge/convert/cors-test.html.
window.DGE = window.DGE || {};
window.DGE.Vision = (function () {

  async function ocrImageBase64(base64Png, apiKey, languageHints) {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const request = {
      image: { content: base64Png },
      // DOCUMENT_TEXT_DETECTION, not TEXT_DETECTION — Google's own guidance is
      // that this feature is the one tuned for dense document/book-page text;
      // TEXT_DETECTION targets sparse scene text (signs, labels) and is a worse
      // fit for a full scanned page. Also gives per-symbol confidence scores,
      // which TEXT_DETECTION's plain fullTextAnnotation.text throws away.
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
    };
    if (languageHints && languageHints.length) {
      request.imageContext = { languageHints };
    }
    const body = { requests: [request] };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Network error reaching Vision API — check your connection: ' + e.message);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) throw new Error('Vision API key rejected, or the API isn\'t enabled on that project: ' + msg);
      if (res.status === 429) throw new Error('Vision API quota exceeded — wait and retry, or check your Cloud project\'s quota: ' + msg);
      throw new Error('Vision API error: ' + msg);
    }

    const annotation = data.responses && data.responses[0];
    if (annotation && annotation.error) {
      throw new Error('Vision API returned an error for this page: ' + annotation.error.message);
    }
    const fta = annotation && annotation.fullTextAnnotation;
    if (!fta) return { text: '', avgConfidence: null, lowConfidenceWords: [] };
    return { text: fta.text || '', ...summarizeConfidence(fta) };
  }

  // Vision's own per-word confidence (0-1), buried in fullTextAnnotation's
  // page/block/paragraph/word tree — this is what TEXT_DETECTION's plain
  // .text string throws away entirely, and it's a real, cheap signal for
  // which words are worth a human double-checking, without needing a second
  // OCR pass or any ground truth to compare against.
  const LOW_CONFIDENCE_THRESHOLD = 0.85;
  function summarizeConfidence(fta) {
    let sum = 0, count = 0;
    const lowConfidenceWords = [];
    (fta.pages || []).forEach(page => {
      (page.blocks || []).forEach(block => {
        (block.paragraphs || []).forEach(para => {
          (para.words || []).forEach(word => {
            if (typeof word.confidence !== 'number') return;
            sum += word.confidence;
            count++;
            if (word.confidence < LOW_CONFIDENCE_THRESHOLD) {
              const text = (word.symbols || []).map(s => s.text || '').join('');
              if (text) lowConfidenceWords.push({ text, confidence: word.confidence });
            }
          });
        });
      });
    });
    return {
      avgConfidence: count ? sum / count : null,
      lowConfidenceWords
    };
  }

  return { ocrImageBase64 };
})();
