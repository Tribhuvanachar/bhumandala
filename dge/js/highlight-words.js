/* ==========================================================================
 * DGE · शब्दचिह्नानि — the background colour on a word that says "this one
 * goes somewhere".
 *
 * The project lead asked (9 Sep 2026) for "dhatus in the sloka highlighted
 * with a special background color" and for "matched koshas in the commentary"
 * to carry the same mark. Two separate marks, one mechanism:
 *
 *   धातुः   the written form is an inflected verb form we hold a full
 *           derivation for (prakriya/formindex, 204,975 forms), or the
 *           per-grantha dhātu-occurrence index named it in THIS verse
 *   कोशः    the written form is a headword in a shipped dictionary
 *
 * A mark is a promise that tapping the word gets you somewhere, and nothing
 * more. It is NOT a claim that the word has been analysed: an inflected form
 * inside a commentary is usually not a कोश headword, and it stays unmarked
 * rather than being guessed at. That restraint is what keeps the marking
 * useful — a page where every word is coloured says nothing.
 *
 * WHY A POST-RENDER DOM PASS rather than marks baked into the HTML string.
 * The answer needs a fetch (tools/build_highlight_index.py shards the word
 * lists two characters deep so a card pulls ~10 KB, not 3.5 MB), and the
 * renderer is synchronous. Marking afterwards means the verse paints
 * immediately and the colour arrives when it arrives; it also means the SAME
 * pass covers the mūla, every commentary block, and anything a later feature
 * renders, as long as the words sit in .dge-word spans.
 * ========================================================================== */
(function () {
  "use strict";
  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['highlight-words.js'] =
    'v1.0 (धातु/कोश word marking from the sharded presence index, applied as a ' +
    'post-render DOM pass over .dge-word spans in the mūla and commentaries)';

  var BASE = 'data/_highlight';
  var MARK_KOSHA = 1;
  var MARK_DHATU = 2;

  // Must match normalise() in tools/build_highlight_index.py exactly: the two
  // sides are looking each other up, and a punctuation mark stripped on one
  // side but not the other is a silent miss for every word ending in a danda.
  var STRIP_CHARS = '।॥॰,.;:!?"\'()[]{}—–-…*​‌‍⁠';
  // Every character escaped individually rather than dropped into the class
  // as written: '–-…' would otherwise read as a RANGE from U+2013 to U+2026
  // and quietly strip a dozen characters nobody listed.
  var STRIP_CLASS = STRIP_CHARS.replace(/[.*+?^${}()|[\]\\\-]/g, '\\$&');
  var STRIP_RE = new RegExp('^[' + STRIP_CLASS + '\\s]+|[' + STRIP_CLASS + '\\s]+$', 'g');

  function normalise(word) {
    var w = String(word || '').replace(STRIP_RE, '');
    w = w.replace(/ऽ/g, '');
    return w.replace(STRIP_RE, '');
  }

  function prefixOf(word, depth) {
    var out = '';
    for (var i = 0; i < depth; i++) {
      out += i < word.length ? ('000' + word.charCodeAt(i).toString(16)).slice(-4) : '0000';
    }
    return out;
  }

  var manifestP = null;
  function manifest() {
    if (!manifestP) {
      manifestP = fetch(BASE + '/manifest.json', { cache: 'force-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return manifestP;
  }

  // A prefix listed as `deep` was split a character further because two
  // characters left it too large (वि- alone holds 8,700 verb forms). Same
  // walk-down the कोश reader does with its own oversized buckets.
  function shardNameFor(word, m) {
    var name = prefixOf(word, 2);
    if (m && m.deep && m.deep.indexOf(name) !== -1) name = prefixOf(word, 3);
    return name;
  }

  var shardCache = {};
  function loadShard(name) {
    if (!shardCache[name]) {
      shardCache[name] = fetch(BASE + '/' + name + '.json', { cache: 'force-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (raw) {
          // The shard is three newline-joined runs rather than word->number;
          // expanded here once per shard, then reused from cache.
          var out = {};
          if (!raw) return out;
          [['k', MARK_KOSHA], ['d', MARK_DHATU], ['b', MARK_KOSHA | MARK_DHATU]].forEach(function (pair) {
            var run = raw[pair[0]];
            if (!run) return;
            run.split('\n').forEach(function (w) { if (w) out[w] = pair[1]; });
          });
          return out;
        })
        .catch(function () { return {}; });
    }
    return shardCache[name];
  }

  // words -> { word: mask }, fetching only the shards those words actually
  // land in. Deduplicated, so a page of 25 verses costs the same as one verse
  // for every shard they share.
  function wordMarks(words) {
    return manifest().then(function (m) {
      var need = {}, wanted = {};
      words.forEach(function (raw) {
        var w = normalise(raw);
        if (w.length < 2) return;
        wanted[w] = shardNameFor(w, m);
        need[wanted[w]] = 1;
      });
      var names = Object.keys(need);
      if (!names.length) return {};
      return Promise.all(names.map(loadShard)).then(function (shards) {
        var bySharded = {};
        names.forEach(function (n, i) { bySharded[n] = shards[i] || {}; });
        var out = {};
        Object.keys(wanted).forEach(function (w) {
          var mask = bySharded[wanted[w]][w];
          if (mask) out[w] = mask;
        });
        return out;
      });
    }).catch(function () { return {}; });
  }
  window.dgeWordMarks = wordMarks;

  // The index is keyed by Devanagari, because that is what the corpus and the
  // dictionaries are written in. When the reader has switched the display to
  // IAST or Kannada, the words on screen are transliterations and nothing
  // would match — so the marks stand down rather than appearing to have
  // examined the text and found nothing in it. (The seam for lifting this:
  // transliterate each word back before lookup, or key the index by SLP1 and
  // convert on both sides. Either needs a transliteration table the reader
  // page can rely on offline, which is a separate piece of work.)
  function scriptIsDevanagari() {
    var s = window.activeScript || 'devanagari';
    return s === 'devanagari' || s === 'deva';
  }

  function marksEnabled() {
    try {
      var flags = typeof window.dgeGetEffectiveFeatureFlags === 'function'
        ? window.dgeGetEffectiveFeatureFlags() : (window.FEATURE_FLAGS || {});
      return flags.showWordMarks !== false && scriptIsDevanagari();
    } catch (e) { return scriptIsDevanagari(); }
  }
  window.dgeWordMarksEnabled = marksEnabled;

  // The per-grantha dhātu-occurrence index (dgeDhatuHits) is the stronger
  // signal where it exists: it names the forms a corpus pass actually
  // resolved in THIS verse, disambiguated, rather than merely asserting the
  // spelling is a possible verb form. Folded in so a verse the corpus pass
  // covered is marked even for a form the flat index happens to miss.
  function verseDhatuWords() {
    var hits = window.dgeDhatuHits;
    var out = {};
    if (!hits) return out;
    Object.keys(hits).forEach(function (k) {
      var list = hits[k];
      if (!list || !list.length) return;
      list.forEach(function (h) {
        var w = normalise(Array.isArray(h) ? h[0] : (h && h.word));
        if (w) out[w] = 1;
      });
    });
    return out;
  }

  var CLASS_FOR = {};
  CLASS_FOR[MARK_KOSHA] = 'dge-mark-kosha';
  CLASS_FOR[MARK_DHATU] = 'dge-mark-dhatu';
  CLASS_FOR[MARK_KOSHA | MARK_DHATU] = 'dge-mark-both';

  var TITLE_FOR = {};
  TITLE_FOR[MARK_KOSHA] = 'कोशे विद्यते · a dictionary headword — tap for its entry';
  TITLE_FOR[MARK_DHATU] = 'धातुरूपम् · a verb form — tap for its derivation';
  TITLE_FOR[MARK_KOSHA | MARK_DHATU] = 'धातुरूपम् · कोशे च विद्यते — tap for its derivation and entry';

  // Running totals for the legend. Cards are marked one at a time as they
  // scroll in, so the legend has to accumulate rather than report the last
  // card -- otherwise it would flicker off on the first card that happens to
  // contain neither kind of word. Reset when the list is re-rendered.
  var tally = { dhatu: 0, kosha: 0 };

  // Marks every unmarked .dge-word under `root`. Idempotent: a span already
  // carrying data-dge-mark is skipped, so re-running after a partial re-render
  // costs nothing and never double-marks.
  function markUnder(root) {
    if (!marksEnabled()) {
      root.querySelectorAll('[data-dge-mark]').forEach(function (el) {
        el.classList.remove('dge-mark-kosha', 'dge-mark-dhatu', 'dge-mark-both');
        el.removeAttribute('data-dge-mark');
        el.removeAttribute('title');
      });
      tally = { dhatu: 0, kosha: 0 };
      renderLegend(tally);
      return Promise.resolve(0);
    }
    var spans = [];
    root.querySelectorAll('.dge-word:not([data-dge-mark])').forEach(function (el) { spans.push(el); });
    if (!spans.length) return Promise.resolve(0);

    var texts = spans.map(function (el) { return el.textContent; });
    var verseDhatus = verseDhatuWords();
    return wordMarks(texts).then(function (marks) {
      var n = 0;
      spans.forEach(function (el, i) {
        var w = normalise(texts[i]);
        var mask = marks[w] || 0;
        if (verseDhatus[w]) mask |= MARK_DHATU;
        // Mark the span either way: '0' records "checked, nothing to show",
        // which is what keeps a second pass from re-querying every word.
        el.setAttribute('data-dge-mark', String(mask));
        if (!mask) return;
        el.classList.add(CLASS_FOR[mask]);
        if (!el.getAttribute('title')) el.setAttribute('title', TITLE_FOR[mask]);
        if (mask & MARK_DHATU) tally.dhatu++;
        if (mask & MARK_KOSHA) tally.kosha++;
        n++;
      });
      renderLegend(tally);
      return n;
    });
  }

  // WHY THE WORK IS DEFERRED PER CARD. A 100-verse page with all three
  // commentaries open carries 14,597 words, and marking them in one pass asked
  // for 756 shards at once — a burst no phone on a slow link should be made to
  // pay for text it has not scrolled to. Each card is marked as it comes into
  // view instead (with a screen of lead-in, so the colour is already there when
  // it arrives), which bounds the opening cost to what is actually on screen
  // and lets the shard cache absorb the rest as the reader moves.
  var observer = null;
  function observeCards(root) {
    // A re-render replaces every card, so the previous render's observations
    // are on detached nodes the observer would otherwise keep alive.
    if (observer) observer.disconnect();
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          observer.unobserve(e.target);
          markUnder(e.target);
        });
      }, { rootMargin: '600px 0px' });
    }
    var cards = root.querySelectorAll ? root.querySelectorAll('.shloka-card') : [];
    if (!cards.length) return markUnder(root);
    cards.forEach(function (c) { observer.observe(c); });
    return Promise.resolve(0);
  }

  function applyWordMarks(root) {
    root = root || document;
    // A card the observer never gets to is a card that never gets marked, so
    // anything but a live list (an older browser, a detached fragment, a
    // single-verse view) falls straight through to the direct pass.
    if (typeof IntersectionObserver !== 'function' || !marksEnabled()) return markUnder(root);
    tally = { dhatu: 0, kosha: 0 };
    return observeCards(root);
  }

  // The legend appears only when the page actually carries marks. A key to
  // colours that are not on screen is clutter, and a colour with no key is a
  // riddle -- so the two are tied to each other.
  function renderLegend(counts) {
    var box = document.getElementById('wordMarkLegend');
    if (!box) return;
    if (!counts.dhatu && !counts.kosha) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var parts = [];
    if (counts.dhatu) parts.push('<span class="dge-mark-key"><span class="dge-mark-swatch k-dhatu"></span>' +
      'धातुरूपम् · verb form — tap for its derivation</span>');
    if (counts.kosha) parts.push('<span class="dge-mark-key"><span class="dge-mark-swatch k-kosha"></span>' +
      'कोशपदम् · dictionary headword — tap for its entry</span>');
    box.innerHTML = parts.join('');
    box.style.display = 'flex';
  }

  window.dgeApplyWordMarks = applyWordMarks;

  // Re-marking after the reader turns the feature on or off: clears the
  // data-dge-mark bookkeeping so the next pass re-decides every word.
  window.dgeResetWordMarks = function (root) {
    (root || document).querySelectorAll('[data-dge-mark]').forEach(function (el) {
      el.classList.remove('dge-mark-kosha', 'dge-mark-dhatu', 'dge-mark-both');
      el.removeAttribute('data-dge-mark');
    });
    return applyWordMarks(root);
  };
})();
