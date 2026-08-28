// Sarvam realtime WebSocket connectivity smoke test — NOT a benchmark
// result. Uses the official SDK's speechToTextStreaming client (see
// providers/sarvam_realtime.js) instead of the hand-rolled protocol
// CLAUDE.md section 2 notes failed silently in an earlier prototype.
'use strict';
const fs = require('fs');
const path = require('path');
const { streamFileOnce } = require('./providers/sarvam_realtime.js');

const CLIP = path.join(__dirname, '..', 'audio', '_smoke_test', 'connectivity_smoke_en.wav');

(async () => {
  console.log('=== Sarvam realtime WS connectivity smoke test (NOT a benchmark result) ===');
  const b64 = fs.readFileSync(CLIP).toString('base64');
  try {
    const { events, timings } = await streamFileOnce(b64, { languageCode: 'en-IN', timeoutMs: 15000 });
    console.log('OK — connected and received', events.length, 'event(s)');
    console.log('Timing (ms):', {
      connectToOpen: timings.openedAt - timings.connectStartedAt,
      openToFirstEvent: timings.firstEventAt ? timings.firstEventAt - timings.openedAt : null
    });
    console.log('Events:', JSON.stringify(events, null, 2).slice(0, 2000));
  } catch (err) {
    console.error('FAILED:', err && (err.message || err));
    process.exitCode = 1;
  }
})();
