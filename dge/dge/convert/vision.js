// dge/convert/vision.js — Google Cloud Vision OCR, window.DGE.Vision namespace.
// Confirmed working via direct browser fetch (no CORS block) before this
// was built — see dge/convert/cors-test.html.
window.DGE = window.DGE || {};
window.DGE.Vision = (function () {

  async function ocrImageBase64(base64Png, apiKey) {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const body = {
      requests: [{
        image: { content: base64Png },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    };

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
    return (annotation && annotation.fullTextAnnotation) ? annotation.fullTextAnnotation.text : '';
  }

  return { ocrImageBase64 };
})();
