// js/transliteration.js
// Maps to Feature: ScriptTransliteration

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v1.1';

const TransliterationEngine = {
    isAvailable: function() {
        const available = typeof window.Sanscript !== 'undefined';
        console.log("[Transliteration] Engine available globally:", available);
        return available;
    },

    apply: function(htmlText, targetScript) {
        console.log(`[Transliteration] Attempting transliteration to: ${targetScript}`);
        
        if (targetScript === 'devanagari' || !htmlText) {
            console.log("[Transliteration] Target is devanagari or text is empty. Skipping.");
            return htmlText;
        }
        
        if (!this.isAvailable()) {
            console.error("[Transliteration] Fatal: Sanscript engine missing from global window. Verify CDN network status.");
            return htmlText; 
        }
        
        try {
            const parts = htmlText.split(/(<[^>]+>)/g);
            for (let i = 0; i < parts.length; i++) {
                if (!parts[i].startsWith('<')) {
                    // Strip invisible zero-width characters that break transliterators
                    let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
                    
                    if (cleanText.trim().length > 0) {
                        console.log(`[Transliteration] Converting chunk of length: ${cleanText.length}`);
                        parts[i] = window.Sanscript.t(cleanText, 'devanagari', targetScript);
                    }
                }
            }
            console.log("[Transliteration] Conversion successful.");
            return parts.join('');
        } catch (e) {
            console.error("[Transliteration] Exception during parsing:", e);
            return htmlText;
        }
    }
};

window.applyTransliteration = function(htmlText, script) {
    return TransliterationEngine.apply(htmlText, script);
};

window.applyScript = function(code) {
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
    console.log(`[Transliteration] User requested script change to: ${code}`);
    window.applyScript(code);
    localStorage.setItem('app_script', code);
    
    if (typeof window.showToast === 'function') {
        window.showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
    }
    
    setTimeout(() => {
        if (typeof window.renderList === 'function') window.renderList();
        if (window.activeId && window.els && window.els.readingCard) {
            window.els.readingCard.innerHTML = window.getText(window.activeId);
        }
        if (typeof window.togglePopup === 'function') window.togglePopup('scriptPopup');
    }, 50);
};
