// DGE Module: dev.js
// Purpose: Diagnostic overlay for development mode

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Only trigger if ?dev=true is in the URL
    if(urlParams.get('dev') === 'true') {
        const logBox = document.createElement('div');
        logBox.style.cssText = `
            position: fixed; bottom: 0; left: 0; width: 100%; height: 200px;
            background: rgba(0, 0, 0, 0.95); color: #00FF00; font-family: monospace;
            font-size: 12px; z-index: 99999; padding: 12px; overflow-y: auto;
            border-top: 3px solid #00FF00; box-sizing: border-box; line-height: 1.6;
        `;
        
        let html = "<strong style='color:#FFF;'>🛠️ DGE DEVELOPMENT LOG</strong><br/><hr style='border-color:#333;'/>";
        
        // 1. Check Module Versions
        if(window.DGE_VERSIONS) {
            html += "<strong style='color:#0FF;'>[MODULES LOADED]</strong><br/>";
            for(let script in window.DGE_VERSIONS) {
                html += `✔️ ${script}: <span style="color:#FF0;">${window.DGE_VERSIONS[script]}</span><br/>`;
            }
        } else {
            html += "<span style='color:red;'>[WARNING] No module versions registered.</span><br/>";
        }
        
        html += "<br/><strong style='color:#0FF;'>[FUNCTION DIAGNOSTICS]</strong><br/>";
        
        // 2. Test Critical Functions
        const criticalFuncs = ['togglePopup', 'applyDarkMode', 'playShloka', 'renderList', 'initApp'];
        criticalFuncs.forEach(func => {
            if (typeof window[func] === 'function') {
                html += `✔️ ${func}() is ready.<br/>`;
            } else {
                html += `❌ <span style='color:red;'>${func}() is MISSING or FAILED to load.</span><br/>`;
            }
        });

        logBox.innerHTML = html;
        document.body.appendChild(logBox);
    }
});
