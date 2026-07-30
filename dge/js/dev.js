// DGE Module: dev.js
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('dev') === 'true') {
        const logBox = document.createElement('div');
        logBox.style.cssText = `
            position: fixed; bottom: 0; left: 0; width: 100%; height: 140px;
            background: rgba(0, 0, 0, 0.95); color: #00FF00; font-family: monospace;
            font-size: 11px; z-index: 99999; padding: 10px; overflow-y: auto;
            border-top: 3px solid #00FF00; box-sizing: border-box; line-height: 1.4;
        `;
        
        let html = "<strong style='color:#FFF;'>🛠️ DGE DEVELOPMENT LOG</strong><br/><hr style='border-color:#333;'/>";
        
        if(window.DGE_VERSIONS) {
            html += "<strong style='color:#0FF;'>[MODULES LOADED]</strong><br/>";
            for(let script in window.DGE_VERSIONS) { html += `✔️ ${script}: <span style="color:#FF0;">${window.DGE_VERSIONS[script]}</span><br/>`; }
        }
        
        html += "<br/><strong style='color:#0FF;'>[FUNCTION DIAGNOSTICS]</strong><br/>";
        const criticalFuncs = ['togglePopup', 'applyDarkMode', 'playShloka', 'renderList', 'initApp'];
        criticalFuncs.forEach(func => {
            html += (typeof window[func] === 'function') ? `✔️ ${func}() is ready.<br/>` : `❌ <span style='color:red;'>${func}() is MISSING.</span><br/>`;
        });

        logBox.innerHTML = html;
        document.body.appendChild(logBox);

        // FIX: Push the bottom audio player up so it isn't hidden
        const bottomPlayer = document.querySelector('.bottom-player');
        if (bottomPlayer) bottomPlayer.style.bottom = '140px';
        document.body.style.paddingBottom = '280px'; 
    }
});
