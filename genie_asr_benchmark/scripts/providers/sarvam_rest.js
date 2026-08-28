// Sarvam AI REST speech-to-text, via the OFFICIAL `sarvamai` npm SDK (not a
// hand-rolled HTTP call) — see package.json in this scripts/ dir. Reads
// SARVAM_API_KEY from scripts/.env.local (gitignored; never commit it).
'use strict';
const fs = require('fs');
const path = require('path');
const { SarvamAIClient } = require('sarvamai');

function loadApiKey() {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY;
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith('SARVAM_API_KEY='));
    if (line) return line.split('=').slice(1).join('=').trim();
  }
  throw new Error('SARVAM_API_KEY not set (env var or scripts/.env.local)');
}

function makeClient() {
  return new SarvamAIClient({ apiSubscriptionKey: loadApiKey() });
}

// languageCode: e.g. 'en-IN' | 'kn-IN' | 'sa-IN' | 'hi-IN' | 'unknown'
// (Sarvam's saaras models auto-detect when 'unknown' is passed).
async function transcribeFile(filePath, { languageCode = 'unknown', model = 'saaras:v3' } = {}) {
  const client = makeClient();
  const t0 = Date.now();
  const response = await client.speechToText.transcribe({
    file: fs.createReadStream(filePath),
    model,
    language_code: languageCode
  });
  const elapsedMs = Date.now() - t0;
  return { response, elapsedMs };
}

module.exports = { makeClient, transcribeFile, loadApiKey };
