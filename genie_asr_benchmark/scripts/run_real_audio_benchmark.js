// The REAL 13-category, audio-in benchmark: transcribes every manifest
// entry's real recording via Sarvam REST, feeds the actual transcript
// through resolver.js, and scores against `expected` -- not the text-only
// pass (run_manifest_against_resolver.js), which just proves the resolver
// is internally consistent. This is CLAUDE.md section 5's actual ask.
//
// Usage: node run_real_audio_benchmark.js <audio-dir> [--json out.json]
// <audio-dir> must contain the same audio/<category>/<file> layout as the
// genie-asr-audio-seed branch (fetch it and point here -- see
// scripts/verify_real_audio.js's header comment for the fetch commands).
'use strict';
const fs = require('fs');
const path = require('path');
const DgeResolver = require('./resolver.js');
const { loadCorpusData } = require('./load_corpus.js');
const { transcribeFile } = require('./providers/sarvam_rest.js');

const audioDir = process.argv[2];
if (!audioDir) {
  console.error('Usage: node run_real_audio_benchmark.js <audio-dir> [--json out.json]');
  process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'manifests', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const index = DgeResolver.buildCorpusIndex(loadCorpusData());

// manifest `language` -> Sarvam language_code. 'mixed' has no single
// correct code -- 'unknown' lets Saaras auto-detect, the closest fit for
// genuinely code-switched speech.
const LANG_MAP = { 'en-IN': 'en-IN', 'kn-IN': 'kn-IN', 'sa-IN': 'sa-IN', 'hi-IN': 'hi-IN', 'mixed': 'unknown' };

function checkAgainstExpected(entry, resolved) {
  const exp = entry.expected;
  const problems = [];
  if (resolved.intent !== exp.intent) problems.push(`intent: got "${resolved.intent}", expected "${exp.intent}"`);
  if (exp.target_pattern) {
    const re = new RegExp(exp.target_pattern);
    if (!resolved.target || !re.test(resolved.target)) problems.push(`target: got ${JSON.stringify(resolved.target)}, expected to match /${exp.target_pattern}/`);
  }
  if (exp.parameters) {
    Object.keys(exp.parameters).forEach((k) => {
      if (!resolved.parameters || resolved.parameters[k] !== exp.parameters[k]) {
        problems.push(`parameters.${k}: got ${JSON.stringify(resolved.parameters && resolved.parameters[k])}, expected ${JSON.stringify(exp.parameters[k])}`);
      }
    });
  }
  if (typeof exp.min_confidence === 'number' && resolved.confidence < exp.min_confidence) {
    problems.push(`confidence: got ${resolved.confidence.toFixed(2)}, expected >= ${exp.min_confidence}`);
  }
  if (typeof exp.max_confidence === 'number' && resolved.confidence > exp.max_confidence) {
    problems.push(`confidence: got ${resolved.confidence.toFixed(2)}, expected <= ${exp.max_confidence}`);
  }
  return problems;
}

(async () => {
  const results = [];
  for (const entry of manifest) {
    if (!entry.audio_file) { console.log(`[SKIP] ${entry.id} -- no audio_file`); continue; }
    const filePath = path.join(audioDir, entry.audio_file);
    if (!fs.existsSync(filePath)) { console.log(`[MISSING FILE] ${entry.id} -- ${filePath}`); continue; }

    const langCode = LANG_MAP[entry.language] || 'unknown';
    let transcript = null, asrElapsedMs = null, asrError = null;
    try {
      const { response, elapsedMs } = await transcribeFile(filePath, { languageCode: langCode, model: 'saaras:v3' });
      transcript = response.transcript;
      asrElapsedMs = elapsedMs;
    } catch (e) {
      asrError = (e && e.message) || String(e);
    }

    if (asrError) {
      results.push({ id: entry.id, category: entry.category, pass: false, asrError, transcript: null });
      console.log(`[ASR FAIL] ${entry.id}: ${asrError}`);
      continue;
    }

    const t0 = Date.now();
    const resolved = DgeResolver.resolve(transcript, index);
    const resolverElapsedMs = Date.now() - t0;
    const problems = checkAgainstExpected(entry, resolved);
    const pass = problems.length === 0;
    results.push({
      id: entry.id, category: entry.category, language: entry.language,
      expected_text: entry.transcript_text, asr_transcript: transcript,
      asrElapsedMs, resolverElapsedMs, resolved, pass, problems
    });
    console.log(`${pass ? 'PASS' : 'FAIL'} [${entry.id}] "${entry.transcript_text}" -> ASR: "${transcript}" (${asrElapsedMs}ms)`);
    if (!pass) problems.forEach((p) => console.log('   - ' + p));
  }

  const byCategory = {};
  results.forEach((r) => {
    byCategory[r.category] = byCategory[r.category] || { pass: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.pass) byCategory[r.category].pass++;
  });
  const totalPass = results.filter((r) => r.pass).length;
  console.log(`\n=== REAL AUDIO-IN benchmark: ${totalPass}/${results.length} (${((100 * totalPass) / results.length).toFixed(0)}%) ===`);
  Object.keys(byCategory).sort().forEach((cat) => {
    const c = byCategory[cat];
    console.log(`  ${cat.padEnd(30)} ${c.pass}/${c.total}`);
  });

  const asrLatencies = results.filter((r) => r.asrElapsedMs != null).map((r) => r.asrElapsedMs);
  if (asrLatencies.length) {
    asrLatencies.sort((a, b) => a - b);
    const avg = asrLatencies.reduce((a, b) => a + b, 0) / asrLatencies.length;
    console.log(`\nASR latency (Sarvam REST): avg ${avg.toFixed(0)}ms, min ${asrLatencies[0]}ms, max ${asrLatencies[asrLatencies.length - 1]}ms, n=${asrLatencies.length}`);
  }

  const jsonFlagIdx = process.argv.indexOf('--json');
  if (jsonFlagIdx !== -1 && process.argv[jsonFlagIdx + 1]) {
    const outPath = path.join(__dirname, '..', 'results', process.argv[jsonFlagIdx + 1]);
    fs.writeFileSync(outPath, JSON.stringify({ summary: { totalPass, total: results.length, byCategory }, results }, null, 2));
    console.log('\nWrote', outPath);
  }
})();
