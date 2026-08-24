/*
 * test-search-resilience.js — plain-Node regression test for dge-search.js's
 * fetchJSON error handling. Run with: node dge/js/test-search-resilience.js
 *
 * A real query fans out to dozens of small requests through a third-party
 * CDN (jsDelivr) -- see SEARCH_ARCHITECTURE.md. Before this test existed,
 * fetchJSON's browser branch only resolved to null on a 404; a genuine
 * network-level failure (a real risk on mobile, or against a flaky CDN
 * edge) instead REJECTED, and since every caller in dge-search.js fetches
 * many of these through Promise.all (up to ~33 postings, up to 120 shards
 * per query), one bad request took the ENTIRE search down with it. This
 * test forces dge-search.js's browser (fetch-based) code path in Node by
 * stubbing `window`/`fetch`, simulates exactly one rejected request among
 * several successful ones, and asserts the search still completes with the
 * results the successful requests could produce -- not an unhandled
 * rejection.
 *
 * No test framework -- plain assertions, exits non-zero on failure, same
 * convention as this repo's Python tests use for anything simple enough
 * not to need one.
 */
'use strict';

global.window = {}; // forces dge-search.js's browser (fetch-based) branch, not its Node/fs one

const path = require('path');
const ROOT = path.join(__dirname);
const DGENorm = require(path.join(ROOT, 'dge-normalize.js'));
global.DGENorm = DGENorm; // dge-search.js's browser branch reads root.DGENorm, not require()

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

async function main() {
  // 'rAma' folds under nasal-class collapsing (m -> n, see dge-normalize.js's
  // NASALS table) to pkey 'rana', trigrams ['^ra','ran','ana','na$'] --
  // confirmed with a direct normalizeQuery() call before hardcoding this,
  // not assumed from the untransformed spelling.
  let fetchCount = 0, failureTriggered = false;
  global.fetch = function (url) {
    fetchCount++;
    if (url.includes('/postings/') && url.includes('/vedas.json') && url.includes('ran') && !failureTriggered) {
      failureTriggered = true;
      return Promise.reject(new Error('simulated network failure (e.g. ERR_CONNECTION_RESET)'));
    }
    if (url.endsWith('manifest.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          granthas: [
            { gi: 0, slug: 'a', title: 'A', category: 'vedas', schema: 'vedic_text', units: 1, shard: 'units/a.json' },
            { gi: 1, slug: 'b', title: 'B', category: 'itihasa', schema: 'itihasa_purana_text', units: 1, shard: 'units/b.json' },
          ],
          df: { '^ra': 2, 'ran': 2, 'ana': 2 },
          sections: ['vedas', 'itihasa'],
        }),
      });
    }
    if (url.includes('/units/')) {
      const isA = url.includes('/a.json');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ u: 0, pk: 'rana', ck: 'rana', s: isA ? 'राम अ' : 'राम ब' }]),
      });
    }
    if (url.includes('/postings/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([[0, 0], [1, 0]]) });
    }
    return Promise.resolve({ ok: false });
  };

  const DGESearch = require(path.join(ROOT, 'dge-search.js'));
  const idx = await DGESearch.create('http://fake-cdn/index');
  const hits = await idx.search('rAma', { scheme: 'slp1', limit: 10 });

  assert(failureTriggered, 'the simulated failure never actually fired -- test setup is wrong, not the code under test');
  assert(Array.isArray(hits), 'search() should resolve to an array even when one underlying fetch rejected');
  assert(hits.length === 2, `expected both granthas to still be found via their surviving requests, got ${hits.length}`);
  assert(hits.every((h) => h.score === 1 && h.via === 'pkey-exact'), 'expected exact pkey matches for both hits');

  console.log(`PASS: search() completed with ${hits.length} hits after ${fetchCount} fetch() calls, ` +
              'one of which was rejected -- the failure degraded gracefully instead of taking the whole query down.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
