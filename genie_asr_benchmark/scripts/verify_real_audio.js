// Runs the two real project-lead-provided recordings (kept off `main`,
// living on the genie-asr-audio-seed branch — see genie_asr_benchmark/
// audio/README.md there) through Sarvam REST, then through resolver.js,
// end to end. Requires the two files fetched out of that branch first,
// e.g.:
//   git fetch origin genie-asr-audio-seed
//   mkdir -p /tmp/audio_seed
//   git show origin/genie-asr-audio-seed:genie_asr_benchmark/audio/01_english/sumadhwa_test.wav > /tmp/audio_seed/sumadhwa_test.wav
//   git show origin/genie-asr-audio-seed:genie_asr_benchmark/audio/01_english/sumadhwa_16k.m4a > /tmp/audio_seed/sumadhwa_16k.m4a
// Run: node verify_real_audio.js /tmp/audio_seed
'use strict';
const path = require('path');
const { transcribeFile } = require('./providers/sarvam_rest.js');
const DgeResolver = require('./resolver.js');
const { loadCorpusData } = require('./load_corpus.js');

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node verify_real_audio.js <dir containing sumadhwa_test.wav and sumadhwa_16k.m4a>');
  process.exit(1);
}

const CLIPS = [
  { label: 'sumadhwa_test.wav (clean)', file: path.join(dir, 'sumadhwa_test.wav') },
  { label: 'sumadhwa_16k.m4a (noisy)', file: path.join(dir, 'sumadhwa_16k.m4a') }
];

(async () => {
  const index = DgeResolver.buildCorpusIndex(loadCorpusData());
  for (const clip of CLIPS) {
    console.log('\n===', clip.label, '===');
    const { response, elapsedMs } = await transcribeFile(clip.file, { languageCode: 'en-IN', model: 'saaras:v3' });
    console.log('Sarvam transcript (' + elapsedMs + 'ms):', JSON.stringify(response.transcript));
    const resolved = DgeResolver.resolve(response.transcript, index);
    console.log('Resolved:', JSON.stringify(resolved));
  }
})();
