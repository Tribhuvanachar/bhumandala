// Unit tests for resolver.js, run against the REAL corpus data (not mocks)
// per CLAUDE.md's "Build this against the REAL corpus metadata" instruction.
// Run with: node --test scripts/resolver.test.js  (from genie_asr_benchmark/)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const DgeResolver = require('./resolver.js');
const { loadCorpusData } = require('./load_corpus.js');

const corpus = loadCorpusData();
const index = DgeResolver.buildCorpusIndex(corpus);

test('corpus index is non-trivial', () => {
  assert.ok(index.granthaEntries.length > 500, 'expected many populated granthas, got ' + index.granthaEntries.length);
  assert.ok(index.personEntries.length > 50, 'expected many parampara nodes, got ' + index.personEntries.length);
});

test('clean transcript: "Open Rigveda 1.1" resolves to mandala_01 with reference 1.1', () => {
  const r = DgeResolver.resolve('Open Rigveda 1.1', index);
  assert.equal(r.intent, 'open_text');
  assert.match(r.target, /rigveda.*mandala_01/);
  assert.equal(r.parameters.reference, '1.1');
  assert.ok(r.confidence >= DgeResolver.CONFIDENCE_THRESHOLD, 'confidence too low: ' + r.confidence);
});

test('messy real Sarvam transcript: "Sumadha Open Sumadha Vijaya 1.1" still resolves to sarga_1', () => {
  // This is the actual noisy Saaras v3 transcript recorded in CLAUDE.md
  // section 2 for sumadhwa_16k.m4a — the whole point of this resolver is
  // that a messy transcript still lands on the right action.
  const r = DgeResolver.resolve('Sumadha Open Sumadha Vijaya 1.1', index);
  assert.equal(r.intent, 'open_text');
  assert.match(r.target, /sumadhva_vijaya\/sarga_1$/);
  assert.equal(r.parameters.reference, '1.1');
  assert.ok(r.confidence >= DgeResolver.CONFIDENCE_THRESHOLD, 'confidence too low: ' + r.confidence);
});

test('clean transcript: "Sumadhwa Vijaya 1.1" (the clean Sarvam en-IN result) also resolves correctly', () => {
  const r = DgeResolver.resolve('Sumadhwa Vijaya 1.1', index);
  assert.equal(r.intent, 'open_text');
  assert.match(r.target, /sumadhva_vijaya\/sarga_1$/);
});

test('without a reference number, all 22 Sumadhva Vijaya siblings tie -> low confidence, not a silent wrong pick', () => {
  const r = DgeResolver.resolve('Open Sumadhva Vijaya', index);
  assert.equal(r.intent, 'open_text');
  assert.ok(r.confidence < DgeResolver.CONFIDENCE_THRESHOLD, 'expected ambiguity to suppress confidence, got ' + r.confidence);
  assert.ok(Array.isArray(r.parameters.candidates) && r.parameters.candidates.length > 1);
});

test('search_corpus intent: "Search for Madhva in the corpus"', () => {
  const r = DgeResolver.resolve('Search for Madhva in the corpus', index);
  assert.equal(r.intent, 'search_corpus');
});

test('select_commentary intent: "Select Jayatirtha commentary"', () => {
  const r = DgeResolver.resolve('Select Jayatirtha commentary', index);
  assert.equal(r.intent, 'select_commentary');
  assert.equal(r.target, 'Jayatirtha (Tikacharya)');
});

test('search_dhatu intent: "Find this dhatu"', () => {
  const r = DgeResolver.resolve('Find this dhatu', index);
  assert.equal(r.intent, 'search_dhatu');
});

test('padaccheda intent: "Give me the padaccheda"', () => {
  const r = DgeResolver.resolve('Give me the padaccheda', index);
  assert.equal(r.intent, 'padaccheda');
});

test('audio_action intent: "Play the audio"', () => {
  const r = DgeResolver.resolve('Play the audio', index);
  assert.equal(r.intent, 'audio_action');
  assert.ok(r.confidence >= DgeResolver.CONFIDENCE_THRESHOLD);
});

test('settings_action intent: "Change the theme to dark"', () => {
  const r = DgeResolver.resolve('Change the theme to dark', index);
  assert.equal(r.intent, 'settings_action');
});

test('renderer_action intent: "Show one shloka at a time"', () => {
  const r = DgeResolver.resolve('Show one shloka at a time', index);
  assert.equal(r.intent, 'renderer_action');
});

test('unrecognized phrase falls back to unknown, not a false action', () => {
  const r = DgeResolver.resolve('tell me a joke about elephants', index);
  assert.equal(r.intent, 'unknown');
  assert.equal(r.confidence, 0);
});

test('gibberish/no-match entity still classifies intent but low confidence, no target', () => {
  const r = DgeResolver.resolve('Open the flibbertigibbet manuscript', index);
  assert.equal(r.intent, 'open_text');
  assert.equal(r.target, null);
  assert.ok(r.confidence < DgeResolver.CONFIDENCE_THRESHOLD);
});
