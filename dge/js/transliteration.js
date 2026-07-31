window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v1.1';

window.applyTransliteration = function(htmlText, script) {
    console.log(`[Transliteration] Request to convert to: ${script}`);
    
    if (script === 'devanagari' || !htmlText) {
        console.log("[Transliteration] Target is devanagari or text is empty. Skipping processing.");
        return htmlText;
    }
    
    if (typeof window.Sanscript === 'undefined') {
        console.error("[Transliteration] Fatal error: Sanscript engine missing from global window. Check CDN network status.");
        return htmlText; 
    }
    
    try {
        const parts = htmlText.split(/(<[^>]+>)/g);
        let convertedCount = 0;
        
        for (let i = 0; i < parts.length; i++) {
            // Do not attempt to transliterate HTML tags
            if (!parts[i].startsWith('<')) {
                // Strip invisible zero-width characters that frequently break transliterators
                let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
                
                if (cleanText.trim().length > 0) {
                    parts[i] = window.Sanscript.t(cleanText, 'devanagari', script);
                    convertedCount++;
                }
            }
        }
        
        console.log(`[Transliteration] Successfully converted ${convertedCount} text nodes to ${script}.`);
        return parts.join('');
    } catch (e) {
        console.error("[Transliteration] Exception occurred during parsing:", e);
        return htmlText;
    }
};

window.applyScript = function(code) {
    console.log(`[Transliteration] Applying script classes for UI: ${code}`);
    window.activeScript = code;
    
    document.querySelectorAll('#scriptPopup .pop-item').forEach(el => {
        if (el.dataset.script) {
            el.classList.toggle('active', el.dataset.script === code);
        }
    });
    
    if (code !== 'devanagari') {
        document.body.classList.add('non-devanagari');
    } else {
        document.body.classList.remove('non-devanagari');
    }
};

window.setScript = function(code, el) {
    console.log(`[Transliteration] User clicked script change: ${code}`);
    window.applyScript(code);
    localStorage.setItem('app_script', code);
    
    if (typeof window.showToast === 'function') {
        window.showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
    }
    
    setTimeout(() => {
        if (typeof window.renderList === 'function') {
            console.log("[Transliteration] Re-rendering list views.");
            window.renderList();
        }
        
        if (window.activeId && window.els && window.els.readingCard && typeof window.getText === 'function') {
            console.log(`[Transliteration] Updating active reading card for shloka: ${window.activeId}`);
            window.els.readingCard.innerHTML = window.getText(window.activeId);
        } else {
            console.log("[Transliteration] Note: Core variables (activeId, els, getText) not fully initialized yet.");
        }
        
        if (typeof window.togglePopup === 'function') window.togglePopup('scriptPopup');
    }, 50);
};
