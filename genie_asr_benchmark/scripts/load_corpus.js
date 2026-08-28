// Loads the real dge/ corpus metadata this resolver runs against. Node-only
// (uses fs) — the browser-side equivalent would fetch() the same three
// files, already loaded elsewhere in dge/js (window.dgeLibraryCatalogPromise
// etc.); this just gives the benchmark harness/tests the same data offline.
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function loadJson(relPath) {
  const full = path.join(REPO_ROOT, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function loadCorpusData() {
  return {
    library: loadJson('dge/data/library.json'),
    taxonomy: loadJson('dge/data/taxonomy.json'),
    parampara: loadJson('dge/guru-parampara/data/parampara.json')
  };
}

module.exports = { loadCorpusData, REPO_ROOT };
