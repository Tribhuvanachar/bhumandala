// Maps a resolver.js output ({intent, target, parameters, confidence}) to
// the REAL DGE UI entry point that executes it — this is the "router
// executes locally" half of CLAUDE.md section 7. Browser-only (touches
// `window`); not used by the Node benchmark harness or resolver tests,
// which only exercise resolver.js. Intentionally NOT loaded by dge/index.html
// yet — this is prototype wiring to review before it's dropped into dge/js/.
//
// Status per intent, verified against the actual dge/js/*.js source in this
// repo (see the exploration notes in the accompanying report):
//   WIRED   — calls a real, confirmed window.* function.
//   PARTIAL — a real function exists but only covers part of the intent
//             (documented inline).
//   STUB    — no single confirmed entry point found; documents what would
//             need to be added to dge/js, does not fabricate a call.
(function (root) {
  'use strict';

  var ACTIONS = {
    // WIRED — dge/js/library.js: window.dgeGoToGrantha(slug) navigates via
    // the real ?path= route (dge/js/core.js), including its
    // DGE_SPECIAL_PAGES redirect for non-shloka-shaped content
    // (Dhatupatha/Shabdapatha). jumpShloka/jumpVedicId are read back out of
    // the URL by core.js on load (see dgeQuickJump's own URL construction).
    open_text: function (resolved) {
      if (!resolved.target) return { ok: false, reason: 'no_target' };
      var url = window.location.pathname + '?path=' + encodeURIComponent(resolved.target);
      var ref = resolved.parameters && resolved.parameters.reference;
      if (ref && /^\d+$/.test(ref)) url += '&jumpShloka=' + ref;
      else if (ref) url += '&jumpVedicId=' + encodeURIComponent(ref);
      window.location.href = url;
      return { ok: true };
    },

    // WIRED — same navigation primitive as open_text; DGE doesn't
    // distinguish "text" from "section" at the URL level (a taxonomy
    // section IS a grantha path), so this intent reuses open_text's action.
    open_section: function (resolved) {
      return ACTIONS.open_text(resolved);
    },

    // PARTIAL — window.dgeOpenCorpusSearchForSelection exists in ai.js but
    // is written to operate on the CURRENT text selection (the Genie's
    // existing tooltip flow), not an arbitrary voice-supplied query string.
    // Needs a small new adapter in dge/js (not invented here) that opens
    // the same search UI seeded with resolved.parameters.rawQuery /
    // resolved.target instead of window.getSelection().
    search_corpus: function (resolved) {
      if (typeof window.dgeOpenCorpusSearchForSelection === 'function') {
        return { ok: false, reason: 'needs_query_seeded_variant', existingFn: 'dgeOpenCorpusSearchForSelection' };
      }
      return { ok: false, reason: 'not_wired' };
    },

    // WIRED — dge/js/kosha.js: window.dgeKoshaQuick(word) opens the Kosha
    // (dictionary) directly for a given word.
    search_kosha: function (resolved) {
      var word = resolved.target || (resolved.parameters && resolved.parameters.rawQuery);
      if (!word || typeof window.dgeKoshaQuick !== 'function') return { ok: false, reason: 'not_wired' };
      window.dgeKoshaQuick(word);
      return { ok: true };
    },

    // PARTIAL — same shape as search_corpus: window.dgeOpenDhatuForSelection
    // (ai.js) exists but is selection-driven, not query-driven.
    search_dhatu: function (resolved) {
      if (typeof window.dgeOpenDhatuForSelection === 'function') {
        return { ok: false, reason: 'needs_query_seeded_variant', existingFn: 'dgeOpenDhatuForSelection' };
      }
      return { ok: false, reason: 'not_wired' };
    },

    // WIRED — dge/js/render.js: window.setCommentaryView(key) switches the
    // active commentary tab. resolved.target here is a parampara node's
    // display name (e.g. "Jayatirtha (Tikacharya)"), NOT the commentary
    // view's internal key — a name->key lookup belongs in dge/js at
    // integration time (the render.js key scheme wasn't traced in this
    // pass), so this stays PARTIAL rather than guessing a key format.
    select_commentary: function (resolved) {
      if (typeof window.setCommentaryView !== 'function') return { ok: false, reason: 'not_wired' };
      return { ok: false, reason: 'needs_name_to_commentary_key_lookup', existingFn: 'setCommentaryView' };
    },

    // PARTIAL — dge/js/render.js exposes several view-mode primitives
    // (dgeSetViewMode, dgeSetLayoutMode, dgeSingleViewStep/dgeListViewStep)
    // but no single "renderer_action(name)" dispatcher; parameters.action
    // (the free-text phrase after the trigger, e.g. "one shloka at a
    // time") would need mapping to one of those calls in dge/js.
    renderer_action: function (resolved) {
      return { ok: false, reason: 'not_wired', candidates: ['dgeSetViewMode', 'dgeSetLayoutMode', 'dgeSingleViewStep', 'dgeListViewStep'] };
    },

    // STUB — audio.js drives an <audio> element directly (currentAudio.play())
    // from its own UI event handlers; no window.* play/pause toggle was
    // found to call from outside. Needs a small new
    // window.dgeToggleAudioPlayback() added to audio.js.
    audio_action: function (resolved) {
      return { ok: false, reason: 'not_wired' };
    },

    // WIRED (theme only) — dge/js/utils.js: window.setTheme(name) /
    // window.toggleDarkMode(). Script-change / font-size settings actions
    // fall through to STUB (config.js has getters, no single voice-callable
    // setter confirmed in this pass).
    settings_action: function (resolved) {
      var phrase = (resolved.parameters && resolved.parameters.action) || '';
      if (/dark/.test(phrase) && typeof window.setTheme === 'function') { window.setTheme('dark'); return { ok: true }; }
      if (/light/.test(phrase) && typeof window.setTheme === 'function') { window.setTheme('light'); return { ok: true }; }
      if (/(dark|light|theme)/.test(phrase) && typeof window.toggleDarkMode === 'function') { window.toggleDarkMode(); return { ok: true }; }
      return { ok: false, reason: 'not_wired' };
    },

    // WIRED — dge/js/ai.js: window.askAcharyaForShloka() opens the
    // Genie's existing Ask Acharya flow for the current shloka.
    explain: function (resolved) {
      if (typeof window.askAcharyaForShloka !== 'function') return { ok: false, reason: 'not_wired' };
      window.askAcharyaForShloka();
      return { ok: true };
    },

    // STUB — padaccheda is a config-driven SHLOKA_FIELDS entry
    // (dge/js/config.js dgeGetEffectiveShlokaFields, id: 'padaccheda'),
    // rendered when enabled, not toggled by a single confirmed function.
    // Needs a small dgeSetShlokaFieldVisible('padaccheda', true) added.
    padaccheda: function (resolved) {
      return { ok: false, reason: 'not_wired' };
    },

    // STUB — no compare/side-by-side view was located in this pass.
    compare: function (resolved) {
      return { ok: false, reason: 'not_wired' };
    },

    unknown: function () {
      return { ok: false, reason: 'unknown_intent' };
    }
  };

  function execute(resolved) {
    var fn = ACTIONS[resolved.intent] || ACTIONS.unknown;
    return fn(resolved);
  }

  var api = { ACTIONS: ACTIONS, execute: execute };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DgeIntentActionMap = api;
})(typeof self !== 'undefined' ? self : this);
