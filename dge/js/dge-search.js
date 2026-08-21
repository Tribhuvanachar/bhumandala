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

  // Root/verse schemas vs. commentary schemas vs. genuinely ambiguous
  // independent-prose schemas (dge/data/schemas.json's own _description for
  // each name is the source of truth here, not a guess) -- lets the global
  // search UI offer an honest "shlokas only / commentary only" filter
  // without re-deriving schema semantics itself or guessing from a title.
  var SHLOKA_SCHEMAS = { vedic_text:1, itihasa_purana_text:1, smriti_dharmashastra_text:1,
    stotra_text:1, grantha_mula_text:1, dasa_sahitya_composition:1, dasa_pada_text:1 };
  var COMMENTARY_SCHEMAS = { grantha_tika_text:1, grantha_tippani_text:1 };
  function classifyContentType(schema) {
    if (SHLOKA_SCHEMAS[schema]) return 'shloka';
    if (COMMENTARY_SCHEMAS[schema]) return 'commentary';
    return 'prose'; // generic / grantha_prakarana_text -- independent treatises, neither a root verse nor a commentary on one
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

    // Trigram sets to search candidates by: the whole query (handles a
    // single word, or a short phrase typed correctly) PLUS, for a multi-word
    // query, each word's own trigrams searched separately. Without this, one
    // garbled word in an otherwise-correct query sank the whole search —
    // "kantaya kadhamne" shares almost none of ITS combined trigrams with
    // the verse it is trying to name (कान्ताय कल्याणगुणैकधाम्ने), because the
    // second word is wrong, even though "kantaya" alone is an exact match
    // for the verse's first word. Searching per word lets a candidate earn
    // its way in on any ONE word it genuinely contains.
    var trigramSets = [qtris];
    if (q.words.length > 1) {
      q.words.forEach(function (w) {
        if (w.length >= 3) trigramSets.push(N.trigrams(w));
      });
    }

    // 1) candidate generation: union postings for every trigram set above
    var allTris = {};
    trigramSets.forEach(function (set) { set.forEach(function (tg) { allTris[tg] = 1; }); });
    var buckets = {};
    Object.keys(allTris).forEach(function (tg) { buckets[bucketOf(tg)] = 1; });
    return Promise.all(Object.keys(buckets).map(function (b) { return self._loadBucket(b); }))
      .then(function () {
        // Rank candidates by how many of a trigram set's members they share,
        // then stop. Opening a grantha's unit shard is a network round trip,
        // and a common word shares its trigrams with most of the corpus:
        // searching "राम" used to open 444 of them and take some ten seconds
        // on a fast connection, which on a phone reads as no results at all
        // rather than as slow ones. A unit that really contains a set's text
        // shares nearly all of its trigrams, so requiring most of them
        // before its grantha is opened is what keeps a long query from
        // dragging in half the library on the strength of one shared
        // fragment — each set (whole query, or one word) is judged against
        // its OWN 60% bar, independently, so a candidate only has to clear
        // the bar for the query as typed OR for a single word within it.
        var cand = {};            // "gi:ui" -> { count: best total shared trigrams, complete: every non-boundary trigram of some set matched }
        trigramSets.forEach(function (set) {
          // A trigram containing ^ or $ only appears in the index at the
          // true start/end of a UNIT'S WHOLE indexed text, not at each
          // word's own boundary within it -- so a query word sitting in
          // the middle of a verse/line (the overwhelmingly common case)
          // can never match its own ^xy/yz$ trigrams, even on an exact
          // literal hit. Requiring 60% of ALL trigrams including these
          // meant a real match could permanently fall short of the bar
          // (this is exactly how कान्ताय, an exact match in the middle of
          // Sumadhva Vijaya's opening line, never became a candidate at
          // all). Only the interior trigrams are required; boundary ones
          // still count toward `count` as a bonus when they DO match (a
          // genuine signal for a query that really is at a unit's edge).
          var boundary = {}, requiredCount = 0;
          set.forEach(function (tg) {
            if (tg.indexOf('^') !== -1 || tg.indexOf('$') !== -1) boundary[tg] = 1; else requiredCount++;
          });
          var counts = {}, reqCounts = {};
          set.forEach(function (tg) {
            var b = self._bucketCache[bucketOf(tg)] || {};
            var post = b[tg]; if (!post) return;
            var isBoundary = !!boundary[tg];
            for (var k = 0; k < post.length; k++) {
              var key = post[k][0] + ':' + post[k][1];
              counts[key] = (counts[key] || 0) + 1;
              if (!isBoundary) reqCounts[key] = (reqCounts[key] || 0) + 1;
            }
          });
          var need = Math.max(1, Math.ceil(Math.max(requiredCount, 1) * 0.6));
          Object.keys(reqCounts).forEach(function (key) {
            if (reqCounts[key] < need) return;
            var complete = requiredCount > 0 && reqCounts[key] === requiredCount;
            var total = counts[key];
            var prev = cand[key];
            if (!prev || (complete && !prev.complete) || (complete === prev.complete && total > prev.count)) {
              cand[key] = { count: total, complete: complete };
            }
          });
        });
        var keys = Object.keys(cand);
        // Complete matches (every trigram that could possibly match, did)
        // rank first, THEN by raw shared count. Sorting by raw count alone
        // favoured a long query's partial match (many shared trigrams
        // simply because the query is long) over a short query's COMPLETE
        // match (fewer trigrams only because the word itself is short) --
        // backwards, and part of why a short exact query could lose its
        // shard slot to a longer, weaker one below.
        keys.sort(function (a, b) {
          if (cand[a].complete !== cand[b].complete) return (cand[b].complete ? 1 : 0) - (cand[a].complete ? 1 : 0);
          return cand[b].count - cand[a].count;
        });
        var giSet = {}, nGi = 0, picked = [], skipped = false;
        // A genuinely complete match always gets its grantha opened, past
        // the normal MAX_SHARDS budget -- up to a much higher ceiling so a
        // pathological query (present in most of the corpus) still can't
        // drag in everything. A common word/epithet can tie dozens of
        // granthas at "every possible trigram present," and admitting only
        // the first MAX_SHARDS of them by arbitrary sort-stability order
        // (not by which is actually right) is exactly how an exact match --
        // कान्ताय opening Sumadhva Vijaya -- went missing while a bunch of
        // equally-complete but less relevant granthas filled the budget
        // first. Partial (need-clearing but not complete) matches still
        // respect the original MAX_SHARDS budget unchanged.
        var MAX_EXACT_SHARDS = MAX_SHARDS * 3;
        for (var i = 0; i < keys.length && picked.length < MAX_UNITS; i++) {
          var gik = keys[i].split(':')[0];
          var isExact = cand[keys[i]].complete;
          if (!giSet[gik]) {
            if (isExact ? nGi >= MAX_EXACT_SHARDS : nGi >= MAX_SHARDS) { skipped = true; continue; }
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
              contentType: classifyContentType(g.schema),
              unit: row.u, snippet: row.s, score: sc.score, via: sc.via });
          }
        });
        hits.sort(function (a, b) { return b.score - a.score; });
        var out = hits.slice(0, limit);
        // so the UI can say the corpus was not swept end to end.
        // `partial` also matters at ZERO hits: a long single word made
        // entirely of common trigrams (राजनीतिसमुच्चयम्) can have hundreds
        // of big units "complete" on scattered trigrams, crowding the true
        // containment out of the shard budget before it is ever opened —
        // measured live: 469 complete candidates, the real hit ranked 374.
        // A second word in the query fixes it (each word's own trigram set
        // is judged independently), so the UI should say so instead of a
        // bare "No matches."
        out.partial = !!bag.skipped;
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
    // Credit a multi-word query for the words it DOES contain even when the
    // whole phrase does not line up — every check above compares the full
    // query string against one span of row.pk, so one wrong or garbled word
    // ("kadhamne" for guṇaikadhāmne) made the other, correct word ("kantaya",
    // an exact match) count for nothing. Scored below a real phrase match
    // (best case 0.8, under word-exact's 0.97) so an exact hit still wins.
    if (best < 0.8 && q.words && q.words.length > 1 && row.pk) {
      var rowWords = row.pk.split(' ');
      // A long unit (a commentary paragraph, not a single verse) has enough
      // words that a short one will coincidentally sit within edit distance
      // 1 of almost anything — that is how an unrelated 300-word ṭīkā tied
      // the real verse for top score during testing. Fuzzy/substring credit
      // is only trustworthy for a short, verse-sized unit; a long one only
      // gets credit for a word it contains VERBATIM.
      var allowFuzzy = rowWords.length <= 25;
      var matchedLen = 0, totalLen = 0;
      for (var wi = 0; wi < q.words.length; wi++) {
        var qw = q.words[wi];
        totalLen += qw.length;
        if (qw.length < 4) continue;   // too short to be a signal on its own
        var hit = false;
        for (var ri = 0; ri < rowWords.length && !hit; ri++) {
          var rw = rowWords[ri];
          if (rw === qw) { hit = true; break; }
          if (!allowFuzzy || rw.length < 4) continue;
          if (rw.indexOf(qw) !== -1 || qw.indexOf(rw) !== -1) hit = true;
          else if (editDist(qw, rw, 1) <= 1) hit = true;
        }
        if (hit) matchedLen += qw.length;
      }
      // Weighted by matched LENGTH, not word count, so one long distinctive
      // word landing counts for more than a short common one would.
      var frac = totalLen ? (matchedLen / totalLen) : 0;
      if (frac >= 0.5) {
        var wscore = 0.35 + 0.45 * frac;
        if (wscore > best) { best = wscore; via = 'word-overlap'; }
      }
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
