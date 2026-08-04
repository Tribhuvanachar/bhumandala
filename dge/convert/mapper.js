// dge/convert/mapper.js — Schema Mapper, window.DGE.Mapper namespace.
// Converts Gemini's generic proofread output
// ({shlokas:[{number,index,sa,commentary}]}) into the REAL DGE grantha
// schema the main reader app expects — see dge/data/stotras/pns/data.json
// for the reference shape this targets. Deliberately a separate,
// deterministic (non-AI) step: Gemini's job stays narrow and reliable
// (correct OCR text, split shloka/commentary); assembling the exact
// nested schema — which needs admin-supplied context Gemini can't know
// (commentary key naming, grantha title/author) — happens here in code,
// where it can be validated instead of hoping an AI free-forms it right.
window.DGE = window.DGE || {};
window.DGE.Mapper = (function () {

  // profile: { title, author, slug, commentaryKey, commentaryLabel }
  // proofread: { shlokas: [{ number, index, sa, commentary }] }
  function buildGranthaJson(proofread, profile) {
    const shlokas = {};
    (proofread.shlokas || []).forEach(s => {
      // Prefer the model's own printed verse number when present (it may
      // reflect a real number on the source page); fall back to the
      // merge-safe sequential index assigned during chunked proofreading.
      const num = (s.number != null ? s.number : s.index);
      const key = String(num);
      const commentaries = {};
      if (profile.commentaryKey && s.commentary) {
        commentaries[profile.commentaryKey] = s.commentary;
      }
      shlokas[key] = { sa: s.sa || '', commentaries };
    });

    const availableCommentaries = {};
    if (profile.commentaryKey) {
      availableCommentaries[profile.commentaryKey] = profile.commentaryLabel || profile.commentaryKey;
    }

    return {
      metadata: {
        title: profile.title || '',
        author: profile.author || '',
        stotraCode: (profile.slug || '').split('/').pop() || '',
        archiveBaseUrl: '',
        filePrefix: '',
        fileExtension: '',
        totalShlokas: Object.keys(shlokas).length,
        availableCommentaries
      },
      shlokas
    };
  }

  return { buildGranthaJson };
})();
