/*
 * dge-search.js — client-side global fuzzy search over the static index built
 * by build_search_index.py. Loads manifest + only the postings buckets and unit
 * shards a query actually touches (keeps a 50MB+ corpus feasible on GitHub Pages).
 *
 * Depends on DGENorm (dge-normalize.js). In the browser, `fetchJSON` uses fetch;
 * in Node it uses fs (so the same code is testable headless).
 *
 * Usage (browser):
 *   const idx = await DGESearch.create('search_index');   // base URL
 *   const hits = await idx.search('agnimILe', {scheme:'slp1', limit:20});
 */
(function (root) {
  'use strict';
  var N = (typeof require !== 'undefined') ? require('./dge-normalize.js')
                                           : root.DGENorm;

  var isNode = (typeof window === 'undefined');
  var fetchJSON;
  if (isNode) {
    var fs = require('fs'), path = require('path');
    fetchJSON = function (base, rel) {
      var p = path.join(base, rel);
      if (!fs.existsSync(p)) return Promise.resolve(null);
      return Promise.resolve(JSON.parse(fs.readFileSync(p, 'utf8')));
    };
  } else {
    fetchJSON = function (base, rel) {
      return fetch(base + '/' + rel).then(function (r) { return r.ok ? r.json() : null; });
    };
  }

  function bucketOf(tg) {
    var key = tg.replace(/[\^$]/g, '') || tg;
    var two = key.substr(0, 2).replace(/[^a-zA-Z0-9]/g, '_');
    return two || 'misc';
  }

  // Damerau-Levenshtein with early exit
  function editDist(a, b, maxd) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maxd) return maxd + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i; var rowmin = cur[0];
      for (j = 1; j <= lb; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        rowmin = Math.min(rowmin, cur[j]);
      }
      if (rowmin > maxd) return maxd + 1;
      for (j = 0; j <= lb; j++) prev[j] = cur[j];
    }
    return prev[lb];
  }

  function Index(base, manifest) {
    this.base = base;
    this.manifest = manifest;
    this.granthas = manifest.granthas;
    this._shardCache = {};
    this._bucketCache = {};
  }

  Index.prototype._loadBucket = function (bucket) {
    var self = this;
    if (this._bucketCache[bucket]) return Promise.resolve(this._bucketCache[bucket]);
    return fetchJSON(this.base, 'postings/' + bucket + '.json').then(function (d) {
      self._bucketCache[bucket] = d || {}; return self._bucketCache[bucket];
    });
  };

  Index.prototype._loadShard = function (gi) {
    var self = this, g = this.granthas[gi];
    if (this._shardCache[gi]) return Promise.resolve(this._shardCache[gi]);
    return fetchJSON(this.base, g.shard).then(function (d) {
      self._shardCache[gi] = d || []; return self._shardCache[gi];
    });
  };

  // How much of the corpus one query may open. Both are round trips, not
  // memory: each grantha is a separate file.
  var MAX_SHARDS = 40;      // distinct granthas opened per search
  var MAX_UNITS = 6000;     // candidate units scored

  Index.prototype.search = function (query, opts) {
    opts = opts || {};
    var self = this;
    var limit = opts.limit || 20;
    var q = N.normalizeQuery(query, opts);
    if (!q.pkey) return Promise.resolve([]);
    var qtris = q.trigrams;

    // 1) candidate generation: union postings for the query's trigrams
    var buckets = {};
    qtris.forEach(function (tg) { buckets[bucketOf(tg)] = 1; });
    return Promise.all(Object.keys(buckets).map(function (b) { return self._loadBucket(b); }))
      .then(function () {
        var cand = {};            // "gi:ui" -> shared-trigram count
        qtris.forEach(function (tg) {
          var b = self._bucketCache[bucketOf(tg)] || {};
          var post = b[tg]; if (!post) return;
          for (var k = 0; k < post.length; k++) {
            var key = post[k][0] + ':' + post[k][1];
            cand[key] = (cand[key] || 0) + 1;
          }
        });
        // Rank candidates by how many of the query's trigrams they share, then
        // stop. Opening a grantha's unit shard is a network round trip, and a
        // common word shares its trigrams with most of the corpus: searching
        // "राम" used to open 444 of them and take some ten seconds on a fast
        // connection, which on a phone reads as no results at all rather than
        // as slow ones. A unit that really contains the query shares every one
        // of its trigrams, so it is at the head of this list -- the tail is
        // what the cap gives up, and it was never going to be the answer.
        // A unit that really contains the query shares nearly all of its
        // trigrams. Requiring most of them before its grantha is opened is
        // what keeps a long query from dragging in half the library on the
        // strength of one shared fragment.
        var need = Math.max(1, Math.ceil(qtris.length * 0.6));
        var keys = Object.keys(cand).filter(function (k) { return cand[k] >= need; });
        keys.sort(function (a, b) { return cand[b] - cand[a]; });
        var giSet = {}, nGi = 0, picked = [], skipped = false;
        for (var i = 0; i < keys.length && picked.length < MAX_UNITS; i++) {
          var gik = keys[i].split(':')[0];
          if (!giSet[gik]) {
            if (nGi >= MAX_SHARDS) { skipped = true; continue; }
            giSet[gik] = 1; nGi++;
          }
          picked.push(keys[i]);
        }
        if (picked.length >= MAX_UNITS) skipped = true;
        return Promise.all(Object.keys(giSet).map(function (gi) {
          return self._loadShard(+gi);
        })).then(function () { return { cand: cand, keys: picked, skipped: skipped }; });
      })
      .then(function (bag) {
        // 2) score each candidate unit with the fold + edit distance
        var hits = [];
        bag.keys.forEach(function (key) {
          var parts = key.split(':'), gi = +parts[0], ui = +parts[1];
          var shard = self._shardCache[gi]; if (!shard) return;
          var row = shard[ui]; if (!row) return;
          var sc = self._score(q, row);
          if (sc.score >= (opts.minScore || 0.18)) {
            var g = self.granthas[gi];
            hits.push({ grantha: g.slug, title: g.title, category: g.category,
              unit: row.u, snippet: row.s, score: sc.score, via: sc.via });
          }
        });
        hits.sort(function (a, b) { return b.score - a.score; });
        var out = hits.slice(0, limit);
        // so the UI can say the corpus was not swept end to end
        out.partial = !!bag.skipped && hits.length > 0;
        return out;
      });
  };

  Index.prototype._score = function (q, row) {
    var best = 0, via = 'trigram';
    if (q.pkey && row.pk) {
      if (q.pkey === row.pk) return { score: 1.0, via: 'pkey-exact' };
      // A whole word beats a fragment. Without this the score was
      // 0.8 + a bonus for the unit being SHORT, so searching "राम" put
      // विरमति (viramati, which merely contains the same letters once nasals
      // are folded together) above every verse that actually says राम.
      var padded = ' ' + row.pk + ' ';
      if (padded.indexOf(' ' + q.pkey + ' ') !== -1) {
        best = 0.97; via = 'word-exact';
      } else if (padded.indexOf(' ' + q.pkey) !== -1) {
        best = 0.9; via = 'word-start';
      } else if (row.pk.indexOf(q.pkey) !== -1) {
        var s = 0.6 + 0.1 * (q.pkey.length / Math.max(row.pk.length, 1));
        if (s > best) { best = s; via = 'pkey-substr'; }
      }
      if (best < 0.7 && row.pk.indexOf(q.pkey) === -1) {
        var words = row.pk.split(' ');
        for (var i = 0; i < words.length; i++) {
          var d = editDist(q.pkey, words[i], 2);
          if (d <= 2) { var sd = 0.78 - 0.18 * d; if (sd > best) { best = sd; via = 'pkey-ed' + d; } }
        }
      }
    }
    if (best < 0.7 && q.ckey && row.ck && row.ck.indexOf(q.ckey) !== -1) {
      var sc = 0.6 + 0.08 * (q.ckey.length / Math.max(row.ck.length, 1));
      if (sc > best) { best = sc; via = 'ckey-substr'; }
    }
    return { score: best, via: via };
  };

  var API = {
    create: function (base) {
      return fetchJSON(base, 'manifest.json').then(function (m) {
        if (!m) throw new Error('manifest.json not found at ' + base);
        return new Index(base, m);
      });
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.DGESearch = API;
})(typeof window !== 'undefined' ? window : this);
