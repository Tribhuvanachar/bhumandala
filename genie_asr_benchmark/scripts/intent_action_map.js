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

    // --- Added 28 Aug 2026, verified against real dge/js/ai.js and
    // dge/js/sandhi.js source (not assumed) — see reports/findings.md's
    // "New command set" section for the full verification notes. ---

    // PARTIAL — dge/js/ai.js: window.dgeOpenShabdaForSelection(e) opens
    // dge/vyakarana/shabda.html for the CURRENT TEXT SELECTION only
    // (reads via dgeSelectedWordText() -> dgeRobustSelectedText()); takes
    // an event, not a word argument. Needs the same class of query-seeded
    // adapter as search_corpus/search_dhatu above to accept
    // resolved.target directly instead of requiring a live selection.
    shabda_rupa: function (resolved) {
      if (typeof window.dgeOpenShabdaForSelection === 'function') {
        return { ok: false, reason: 'needs_query_seeded_variant', existingFn: 'dgeOpenShabdaForSelection' };
      }
      return { ok: false, reason: 'not_wired' };
    },

    // PARTIAL, with a real caveat — dge/js/ai.js: window.
    // dgeOpenDhatuForSelection(e) exists, same selection-only pattern as
    // shabda_rupa above. UNVERIFIED in this pass whether it opens
    // dge/vyakarana/dhatuforms.html (conjugation tables, what THIS
    // intent needs) or dge/vyakarana/dhatu.html (the root/Dhatupatha
    // browser, what search_dhatu above already targets) — these are two
    // different real pages and the exploration that found this function
    // did not pin down which one it opens. Do not assume; verify against
    // dge/js/ai.js directly before wiring for real.
    dhatu_rupa: function (resolved) {
      return { ok: false, reason: 'needs_query_seeded_variant_and_target_page_verification', existingFn: 'dgeOpenDhatuForSelection (page target unconfirmed)' };
    },

    // PARTIAL — two competing implementations both assigned
    // window.dgeOpenSandhiForSelection historically; ai.js's own copy
    // renamed itself to dgeOpenVidyutSandhiForSelection specifically to
    // avoid the clash (see the comment at ai.js:1701-1706), so the name
    // dge/js/sandhi.js:95 actually wins at runtime (loads later) — that's
    // the real "Sandhi (Live)" button in dge/index.html, calling
    // Dharmamitra's public tagging API. Selection-only, same pattern as
    // the other grammar tools above.
    sandhi_analysis: function (resolved) {
      if (typeof window.dgeOpenSandhiForSelection === 'function') {
        return { ok: false, reason: 'needs_query_seeded_variant', existingFn: 'dgeOpenSandhiForSelection (dge/js/sandhi.js, "Sandhi (Live)")' };
      }
      return { ok: false, reason: 'not_wired' };
    },

    // STUB — confirmed NO samasa/compound-analysis function exists
    // anywhere in dge/js/ (grepped for samasa/samāsa/compound). Unlike
    // the other grammar tools, there is nothing partial to point at here.
    samasa_analysis: function (resolved) {
      return { ok: false, reason: 'not_wired' };
    },

    // STUB — dge/vyakarana/chandas.html + dge/js/chandas.js are real and
    // browsable, but no per-shloka deep-link/JS entry point was found —
    // it's a standalone reference page, not invocable with "the shloka
    // currently open in the reader" as context.
    chandas_identify: function (resolved) {
      return { ok: false, reason: 'not_wired' };
    },

    // PARTIAL — all four real functions exist and are confirmed live:
    // copyShlokaText(id) (dge/js/render.js), window.shareShlokaAudio(id)
    // and window.shareShlokaTextOnly(id) (dge/js/snippets.js),
    // window.openShareImagePreview(id) (dge/js/screenshot.js). All take
    // a shloka id, which this resolver has no notion of (it's reader
    // state, not something ASR/intent parsing produces) — the app layer
    // calling execute() would need to supply the CURRENT shloka's id
    // alongside resolved.parameters.action. Routing below is illustrative
    // of the intended dispatch, not tested against a live id.
    shloka_share_action: function (resolved, currentShlokaId) {
      var phrase = (resolved.parameters && resolved.parameters.action) || '';
      if (currentShlokaId == null) return { ok: false, reason: 'no_current_shloka_id_supplied' };
      if (/download|copy/.test(phrase) && typeof window.copyShlokaText === 'function') return { ok: false, reason: 'fn_exists_untested', existingFn: 'copyShlokaText' };
      if (/audio/.test(phrase) && typeof window.shareShlokaAudio === 'function') return { ok: false, reason: 'fn_exists_untested', existingFn: 'shareShlokaAudio' };
      if (/image|preview/.test(phrase) && typeof window.openShareImagePreview === 'function') return { ok: false, reason: 'fn_exists_untested', existingFn: 'openShareImagePreview' };
      if (/text/.test(phrase) && typeof window.shareShlokaTextOnly === 'function') return { ok: false, reason: 'fn_exists_untested', existingFn: 'shareShlokaTextOnly' };
      return { ok: false, reason: 'not_wired' };
    },

    // STUB, by design — see reports/findings.md's content-correction
    // design section. No submission endpoint or moderation queue exists
    // anywhere in this repo (verified: dge/js/notes.js is localStorage
    // only; no "moderation"/"review queue" concept found in dge/ or
    // admin/). This only ever returns the two-turn resolver output
    // (resolve() for turn 1, resolveCorrectionSubmission() in resolver.js
    // for turn 2) for the app layer to hold onto — there is nothing real
    // to call yet, and this deliberately does not pretend otherwise.
    content_correction: function (resolved) {
      return { ok: false, reason: 'not_wired', design: 'see reports/findings.md' };
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
