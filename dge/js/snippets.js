// DGE Module: snippets.js
// Maps to F-009: Snippets
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['snippets.js'] = 'v1.1 (Async Play Fix)';

window.playSnippet = async function(id, start, end) {
    if (typeof closeModal === 'function') closeModal('snippetModal');
    
    const applySnippetLimits = () => {
        window.els.loopA.value = start;
        window.els.loopB.value = end;
        window.els.enableAB.checked = true;
        window.currentAudio.currentTime = start;
        window.currentAudio.play();
    };

    if (window.activeId !== id) {
        // Wait for the main audio fetching to complete
        await window.playShloka(id);
        
        // Ensure browser has loaded audio metadata before seeking
        if (window.currentAudio.readyState >= 1) { 
            applySnippetLimits();
        } else {
            window.currentAudio.addEventListener('loadedmetadata', function handler() {
                applySnippetLimits();
                window.currentAudio.removeEventListener('loadedmetadata', handler);
            });
        }
    } else {
        // If already on the correct track, apply immediately
        applySnippetLimits();
    }
};
