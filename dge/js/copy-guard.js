// js/copy-guard.js
// Light friction against casual right-click-save/copy-paste scraping of
// the corpus text, for non-admin readers only. Two honest limits, stated
// here rather than left implicit:
//   1. This is friction, not security -- view-source, browser dev tools,
//      or simply disabling JavaScript bypass all of it. A determined
//      scraper is not stopped by a contextmenu/copy listener.
//   2. Screenshots cannot be prevented by a website at all -- there is no
//      web API for it, on any browser or OS. Anything claiming to "block
//      screenshots" client-side is not real; this file makes no such
//      claim and does not attempt it.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['copy-guard.js'] = 'v1.0';

(function () {
  function isAdmin() {
    try {
      return localStorage.getItem('acharyaAuthorized') === 'true' ||
             localStorage.getItem('is_superadmin') === 'true';
    } catch (e) { return false; }
  }

  document.addEventListener('contextmenu', function (ev) {
    if (isAdmin()) return;
    ev.preventDefault();
  });

  // Copy is redirected to a nudge toward the app's own Share tools
  // (copyShlokaText / Share-as-Image) rather than silently doing nothing —
  // a blocked Ctrl+C with no explanation reads as the page being broken,
  // and those tools exist precisely for a reader who wants to take a
  // verse elsewhere.
  document.addEventListener('copy', function (ev) {
    if (isAdmin()) return;
    var sel = window.getSelection ? window.getSelection().toString() : '';
    if (!sel) return;
    ev.preventDefault();
    if (typeof showToast === 'function') {
      showToast('Use the 📋 Copy or Share button on a shloka to take it with you.');
    }
  });
})();
