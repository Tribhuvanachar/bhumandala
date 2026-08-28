// Sarvam AI realtime speech-to-text over WebSocket, via the OFFICIAL
// `sarvamai` npm SDK's speechToTextStreaming client
// (node_modules/sarvamai/dist/cjs/api/resources/speechToTextStreaming) — NOT
// a hand-rolled wire protocol. CLAUDE.md section 2 records that an earlier
// prototype's hand-written WebSocket client connected but never got
// transcript events back; using the vendored SDK's own Socket wrapper
// (.on('open'/'message'/'close'/'error'), .transcribe({audio, sample_rate,
// encoding}), .flush()) sidesteps whatever the hand-rolled framing got
// wrong, since the SDK owns message framing/auth/reconnect internally.
'use strict';
const { SarvamAIClient } = require('sarvamai');
const { loadApiKey } = require('./sarvam_rest.js');

// Connects and streams a single pre-recorded WAV file's PCM as one chunk
// (simulating "speak once, then silence") for latency measurement purposes
// — a real mic-driven caller would call .transcribe() repeatedly as audio
// frames arrive instead. Resolves with timing + all partial/final events
// received, or rejects on a connection/auth error.
async function streamFileOnce(pcm16Base64, { languageCode = 'unknown', sampleRate = 16000, timeoutMs = 15000 } = {}) {
  const client = new SarvamAIClient({ apiSubscriptionKey: loadApiKey() });
  const events = [];
  const timings = { connectStartedAt: Date.now() };

  const socket = await client.speechToTextStreaming.connect({
    'language-code': languageCode,
    sample_rate: sampleRate,
    input_audio_codec: 'audio/wav'
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close && socket.close();
      reject(new Error('sarvam realtime: timed out waiting for events after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    socket.on('open', () => {
      timings.openedAt = Date.now();
      socket.transcribe({ audio: pcm16Base64, sample_rate: sampleRate, encoding: 'audio/wav' });
      socket.flush && socket.flush();
    });

    socket.on('message', (data) => {
      if (!timings.firstEventAt) timings.firstEventAt = Date.now();
      events.push(data);
      if (data && (data.type === 'final' || data.type === 'end')) {
        clearTimeout(timer);
        socket.close && socket.close();
        resolve({ events, timings });
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    socket.on('close', () => {
      clearTimeout(timer);
      resolve({ events, timings });
    });
  });
}

module.exports = { streamFileOnce };
