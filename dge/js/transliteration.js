window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['transliteration.js'] = 'v1.3 (Re-renders the library browser on script change so its labels follow the selected script)';

window.applyTransliteration = function(htmlText, script) {
    console.log(`[Transliteration] Request to convert to: ${script}`);
    
    if (script === 'devanagari' || !htmlText) {
        return htmlText;
    }
    
    if (typeof window.Sanscript === 'undefined') {
        console.error("[Transliteration] Fatal error: Sanscript engine missing from global window. Check that the @indic-transliteration/sanscript <script> tag in index.html <head> loaded successfully (see Network tab for a 404) and that it appears BEFORE js/transliteration.js in the document.");
        return htmlText; 
    }
    
    try {
        const parts = htmlText.split(/(<[^>]+>)/g);
        let convertedCount = 0;
        
        for (let i = 0; i < parts.length; i++) {
            if (!parts[i].startsWith('<')) {
                let cleanText = parts[i].replace(/[\u200B-\u200D\uFEFF]/g, '');
                
                if (cleanText.trim().length > 0) {
                    parts[i] = window.Sanscript.t(cleanText, 'devanagari', script);
                    convertedCount++;
                }
            }
        }
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
    window.applyScript(code);
    localStorage.setItem('app_script', code);
    
    if (typeof window.showToast === 'function') {
        window.showToast("आचार्यः ग्रन्थं सज्जीकुर्वन् अस्ति... (Translating script)");
    }
    
    setTimeout(() => {
        if (typeof window.renderStotraChrome === 'function') {
            window.renderStotraChrome();
        }

        if (typeof window.renderList === 'function') {
            window.renderList();
        }
        
        if (window.activeId && window.els && window.els.readingCard && typeof window.getText === 'function') {
            window.els.readingCard.innerHTML = window.getText(window.activeId);
            if (typeof window.wrapReadingCardWordsForSync === 'function') window.wrapReadingCardWordsForSync();
        }

        // The library browser builds its labels in the active script too,
        // so it needs rebuilding if it happens to be open — otherwise it
        // sits there in the previous script until manually reopened.
        // (openModal sets style.display rather than adding a class.)
        const libModal = document.getElementById('libraryModal');
        if (libModal && libModal.style.display === 'flex' &&
            typeof window.openLibraryModal === 'function') {
            window.openLibraryModal();
        }
        
        if (typeof window.togglePopup === 'function') window.togglePopup('scriptPopup');
    }, 50);
};

console.log("[Init] transliteration.js loaded successfully.");
