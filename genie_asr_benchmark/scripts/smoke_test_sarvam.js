// Sarvam REST connectivity smoke test — NOT a benchmark result. Confirms
// auth + REST transcription round-trip works end-to-end using a trivially
// self-generated espeak-ng TTS clip (robotic voice reading a fixed English
// sentence), per CLAUDE.md section 5(a). Run: node smoke_test_sarvam.js
'use strict';
const path = require('path');
const { transcribeFile } = require('./providers/sarvam_rest.js');

const CLIP = path.join(__dirname, '..', 'audio', '_smoke_test', 'connectivity_smoke_en.wav');

(async () => {
  console.log('=== Sarvam REST connectivity smoke test (NOT a benchmark result) ===');
  console.log('Clip:', CLIP, '(espeak-ng synthetic TTS, English, self-generated for connectivity only)');
  try {
    const { response, elapsedMs } = await transcribeFile(CLIP, { languageCode: 'en-IN', model: 'saaras:v3' });
    console.log('OK — REST call succeeded in', elapsedMs, 'ms');
    console.log('Transcript:', JSON.stringify(response.transcript));
    console.log('Full response keys:', Object.keys(response));
  } catch (err) {
    console.error('FAILED:', err && err.message);
    if (err && err.statusCode) console.error('HTTP status:', err.statusCode);
    if (err && err.body) console.error('Body:', JSON.stringify(err.body));
    process.exitCode = 1;
  }
})();
