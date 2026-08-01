// DGE Module: dev.js
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['dev.js'] = 'v1.1 (merged into shared log panel)';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('dev') === 'true') {

        let html = "<div style='margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed rgba(0,255,0,0.3);'>";
        html += "<strong style='color:#FFF;'>🛠️ DGE DEVELOPMENT LOG</strong><br/>";

        if(window.DGE_VERSIONS) {
            html += "<strong style='color:#0FF;'>[MODULES LOADED]</strong><br/>";
            for(let script in window.DGE_VERSIONS) { html += `✔️ ${script}: <span style="color:#FF0;">${window.DGE_VERSIONS[script]}</span><br/>`; }
        }

        html += "<br/><strong style='color:#0FF;'>[FUNCTION DIAGNOSTICS]</strong><br/>";
        const criticalFuncs = ['togglePopup', 'applyDarkMode', 'playShloka', 'renderList', 'initApp'];
        criticalFuncs.forEach(func => {
            html += (typeof window[func] === 'function') ? `✔️ ${func}() is ready.<br/>` : `❌ <span style='color:red;'>${func}() is MISSING.</span><br/>`;
        });
        html += "</div>";

        // Feed this diagnostic block into the ONE shared log panel (created
        // by utils.js) instead of spawning a second, uncontrolled overlay.
        // This also drops the old hardcoded bottom-player/body padding
        // hacks that used to fight with the panel's own positioning logic.
        if (window.DGE_DEV_LOG && typeof window.DGE_DEV_LOG.appendHTML === 'function') {
            window.DGE_DEV_LOG.appendHTML(html);
        } else {
            console.warn('[dev.js] Shared dev log panel unavailable — skipping diagnostics UI.');
        }
    }
});

