// Text-only resolver accuracy pass — runs every manifests/manifest.json
// entry's transcript_text (and asr_noise_variant, where present) through
// resolver.js and scores against `expected`. This is NOT the multi-provider
// ASR benchmark CLAUDE.md section 5 asks for (that needs real audio, which
// is BLOCKED — see reports/), but it IS a real, runnable measure of the
// resolver half of the pipeline today, independent of any ASR provider.
// Run: node run_manifest_against_resolver.js [--json out.json]
'use strict';
const fs = require('fs');
const path = require('path');
const DgeResolver = require('./resolver.js');
const { loadCorpusData } = require('./load_corpus.js');

const manifestPath = path.join(__dirname, '..', 'manifests', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const corpus = loadCorpusData();
const index = DgeResolver.buildCorpusIndex(corpus);

function checkEntry(entry, transcript, variantLabel) {
  // entry.resolverFn (e.g. "resolveCorrectionSubmission") opts an entry
  // out of the normal resolve() classification pass -- used for
  // content_correction's turn-2 free-text submission, which by design
  // isn't run through intent classification at all.
  const r = entry.resolverFn === 'resolveCorrectionSubmission'
    ? DgeResolver.resolveCorrectionSubmission(transcript)
    : DgeResolver.resolve(transcript, index);
  const exp = entry.expected;
  const problems = [];

  if (r.intent !== exp.intent) problems.push(`intent: got "${r.intent}", expected "${exp.intent}"`);
  if (exp.stage && r.stage !== exp.stage) problems.push(`stage: got "${r.stage}", expected "${exp.stage}"`);

  if (exp.target_pattern) {
    const re = new RegExp(exp.target_pattern);
    if (!r.target || !re.test(r.target)) problems.push(`target: got ${JSON.stringify(r.target)}, expected to match /${exp.target_pattern}/`);
  } else if (exp.target_pattern === null && 'target_pattern' in exp) {
    // explicitly expected no confident single target — fine either way,
    // the confidence bound below is what actually enforces this.
  }

  if (exp.parameters) {
    Object.keys(exp.parameters).forEach((k) => {
      if (!r.parameters || r.parameters[k] !== exp.parameters[k]) {
        problems.push(`parameters.${k}: got ${JSON.stringify(r.parameters && r.parameters[k])}, expected ${JSON.stringify(exp.parameters[k])}`);
      }
    });
  }

  if (typeof exp.min_confidence === 'number' && r.confidence < exp.min_confidence) {
    problems.push(`confidence: got ${r.confidence.toFixed(2)}, expected >= ${exp.min_confidence}`);
  }
  if (typeof exp.max_confidence === 'number' && r.confidence > exp.max_confidence) {
    problems.push(`confidence: got ${r.confidence.toFixed(2)}, expected <= ${exp.max_confidence} (should have stayed ambiguous)`);
  }

  return { id: entry.id + variantLabel, category: entry.category, transcript, pass: problems.length === 0, problems, resolved: r };
}

const results = [];
manifest.forEach((entry) => {
  results.push(checkEntry(entry, entry.transcript_text, ''));
  if (entry.asr_noise_variant && entry.asr_noise_variant !== entry.transcript_text) {
    results.push(checkEntry(entry, entry.asr_noise_variant, ' (noise variant)'));
  }
});

const byCategory = {};
results.forEach((r) => {
  byCategory[r.category] = byCategory[r.category] || { pass: 0, total: 0 };
  byCategory[r.category].total++;
  if (r.pass) byCategory[r.category].pass++;
});

const totalPass = results.filter((r) => r.pass).length;
console.log(`\n=== Resolver accuracy pass: ${totalPass}/${results.length} (${((100 * totalPass) / results.length).toFixed(0)}%) ===\n`);
Object.keys(byCategory).sort().forEach((cat) => {
  const c = byCategory[cat];
  console.log(`  ${cat.padEnd(30)} ${c.pass}/${c.total}`);
});

console.log('\n--- Failures ---');
results.filter((r) => !r.pass).forEach((r) => {
  console.log(`\n[${r.id}] "${r.transcript}"`);
  r.problems.forEach((p) => console.log('   - ' + p));
});

const jsonFlagIdx = process.argv.indexOf('--json');
if (jsonFlagIdx !== -1 && process.argv[jsonFlagIdx + 1]) {
  const outPath = path.join(__dirname, '..', 'results', process.argv[jsonFlagIdx + 1]);
  fs.writeFileSync(outPath, JSON.stringify({ summary: { totalPass, total: results.length, byCategory }, results }, null, 2));
  console.log('\nWrote', outPath);
}
