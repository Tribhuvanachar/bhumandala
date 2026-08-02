// DGE Module: snippets.js
// Maps to F-009: Snippets — capture, save, play, download and share
// trimmed audio segments of a shloka.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['snippets.js'] = 'v2.0 (Save/Download/Share implemented)';

window.playSnippet = async function(id, start, end) {
    if (typeof closeModal === 'function') closeModal('actionsSheetModal');

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

// --- Save / delete ---------------------------------------------------

window.saveSnippet = function() {
    if (!window.activeId) {
        if (typeof showToast === 'function') showToast('Play a shloka first, then set Start/End to save a snippet.');
        return;
    }

    const loopA = document.getElementById('loopA');
    const loopB = document.getElementById('loopB');
    const start = loopA ? parseFloat(loopA.value) : NaN;
    const end = loopB ? parseFloat(loopB.value) : NaN;

    if (isNaN(start) || isNaN(end) || end <= start) {
        if (typeof showToast === 'function') showToast('Set a valid Start and End time first (or use 🎯 Auto A-B Capture).');
        return;
    }

    if (typeof snippets === 'undefined') return;
    const id = window.activeId;
    if (!snippets[id]) snippets[id] = [];
    snippets[id].push({ start, end, savedAt: Date.now() });

    if (typeof nsKey === 'function') {
        localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets));
    }

    if (typeof renderList === 'function') renderList();
    if (window.currentActionsSheetId === id && typeof renderActionsSheetContent === 'function') {
        renderActionsSheetContent(id);
    }
    if (typeof showToast === 'function') showToast(`Snippet saved for Shloka ${id} (${start.toFixed(1)}s–${end.toFixed(1)}s)`);
};

window.deleteSnippet = function(id, index) {
    if (typeof snippets === 'undefined' || !snippets[id]) return;
    snippets[id].splice(index, 1);
    if (snippets[id].length === 0) delete snippets[id];

    if (typeof nsKey === 'function') {
        localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets));
    }

    if (typeof renderList === 'function') renderList();
    if (typeof renderActionsSheetContent === 'function') renderActionsSheetContent(id);
    if (typeof showToast === 'function') showToast('Snippet deleted.');
};

// --- Audio decoding / trimming / encoding -----------------------------
// Pure client-side WAV export so a snippet can be downloaded/shared as its
// own standalone audio file (no server-side processing available on a
// static GitHub Pages deploy).

function dgeGetAudioContext() {
    if (!window._dgeAudioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        window._dgeAudioCtx = new Ctx();
    }
    return window._dgeAudioCtx;
}

async function dgeFetchAndDecode(id) {
    const src = await resolveAudioSrc(id);
    const res = await fetch(src);
    if (!res.ok) throw new Error('Could not fetch audio (' + res.status + ')');
    const arrayBuffer = await res.arrayBuffer();
    const ctx = dgeGetAudioContext();
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

function dgeSliceAudioBuffer(sourceBuffer, startSec, endSec) {
    const sampleRate = sourceBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(sourceBuffer.length, Math.floor(endSec * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);

    const ctx = dgeGetAudioContext();
    const sliced = ctx.createBuffer(sourceBuffer.numberOfChannels, frameCount, sampleRate);

    for (let ch = 0; ch < sourceBuffer.numberOfChannels; ch++) {
        const sourceData = sourceBuffer.getChannelData(ch);
        const slicedData = sliced.getChannelData(ch);
        slicedData.set(sourceData.subarray(startSample, startSample + frameCount));
    }
    return sliced;
}

function dgeWriteString(view, offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function dgeFloatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function dgeInterleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0, i = 0;
    while (index < length) { result[index++] = inputL[i]; result[index++] = inputR[i]; i++; }
    return result;
}

function dgeAudioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const samples = numChannels === 2
        ? dgeInterleave(buffer.getChannelData(0), buffer.getChannelData(1))
        : buffer.getChannelData(0);

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = samples.length * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    dgeWriteString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    dgeWriteString(view, 8, 'WAVE');
    dgeWriteString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    dgeWriteString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    dgeFloatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
}

function dgeTriggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// --- Download ----------------------------------------------------------

window.downloadFullShlokaAudio = async function(id) {
    if (typeof showToast === 'function') showToast('Preparing download…');
    try {
        const src = await resolveAudioSrc(id);
        const res = await fetch(src);
        if (!res.ok) throw new Error('Fetch failed: ' + res.status);
        const blob = await res.blob();
        const ext = (typeof stotraData !== 'undefined' && stotraData && stotraData.metadata && stotraData.metadata.fileExtension) || '.mp3';
        dgeTriggerBlobDownload(blob, `Shloka-${id}${ext}`);
    } catch (e) {
        console.error('Download failed', e);
        if (typeof showToast === 'function') showToast('Could not download this audio file.');
    }
};

window.downloadSnippetAudio = async function(id, start, end) {
    if (typeof showToast === 'function') showToast('Preparing snippet…');
    try {
        const decoded = await dgeFetchAndDecode(id);
        const sliced = dgeSliceAudioBuffer(decoded, start, end);
        const blob = dgeAudioBufferToWavBlob(sliced);
        dgeTriggerBlobDownload(blob, `Shloka-${id}-snippet-${start.toFixed(1)}-${end.toFixed(1)}.wav`);
    } catch (e) {
        console.error('Snippet download failed', e);
        if (typeof showToast === 'function') showToast('Could not prepare this snippet — try 📥 Preload All Audio in 🛠 Tools first, then retry.');
    }
};

// --- Share (Web Share API, with graceful fallback) ---------------------

window.shareShlokaTextOnly = async function(id) {
    const rawText = typeof getText === 'function' ? getText(id).replace(/<[^>]*>/g, '') : '';
    const text = `${rawText}\n\n— Shloka ${id}, ${document.title || 'Sarvamoola Digital Library'}`;
    try {
        if (navigator.share) {
            await navigator.share({ text, title: `Shloka ${id}` });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            if (typeof showToast === 'function') showToast('Text copied to clipboard.');
        }
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.error('Share text failed', e);
        if (typeof showToast === 'function') showToast('Could not share this text.');
    }
};

window.shareShlokaAudio = async function(id, snippet) {
    if (typeof showToast === 'function') showToast('Preparing to share…');
    try {
        const rawText = typeof getText === 'function' ? getText(id).replace(/<[^>]*>/g, '') : '';
        const text = `${rawText}\n\n— Shloka ${id}, ${document.title || 'Sarvamoola Digital Library'}`;

        let blob, filename, fetchFailed = false;
        try {
            if (snippet) {
                const decoded = await dgeFetchAndDecode(id);
                const sliced = dgeSliceAudioBuffer(decoded, snippet.start, snippet.end);
                blob = dgeAudioBufferToWavBlob(sliced);
                filename = `Shloka-${id}-snippet-${snippet.start.toFixed(1)}-${snippet.end.toFixed(1)}.wav`;
            } else {
                const src = await resolveAudioSrc(id);
                const res = await fetch(src);
                if (!res.ok) throw new Error('Fetch failed: ' + res.status);
                blob = await res.blob();
                const ext = (typeof stotraData !== 'undefined' && stotraData && stotraData.metadata && stotraData.metadata.fileExtension) || '.mp3';
                filename = `Shloka-${id}${ext}`;
            }
        } catch (fetchErr) {
            // Most likely cause: this audio isn't in the offline cache yet,
            // so we tried to fetch it directly from the (cross-origin)
            // audio host, which doesn't return CORS headers for fetch().
            // A plain <audio> tag can still play it fine — it's only
            // reading the raw bytes in JS that's blocked. Fall back to
            // sharing a link instead of the bytes.
            console.warn('Could not fetch audio bytes for sharing (likely CORS on an uncached file):', fetchErr);
            fetchFailed = true;
        }

        if (fetchFailed) {
            const directUrl = snippet ? await resolveAudioSrc(id) : await resolveAudioSrc(id);
            const textWithLink = `${text}\n\n🎧 Audio: ${directUrl}`;
            if (navigator.share) {
                await navigator.share({ text: textWithLink, title: `Shloka ${id}` });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(textWithLink);
                if (typeof showToast === 'function') showToast("Couldn't attach the audio file directly — copied the text with a link to it instead.");
            }
            return;
        }

        const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text, title: `Shloka ${id}` });
            return;
        }

        if (navigator.share) {
            // Some browsers can share text but not files
            await navigator.share({ text, title: `Shloka ${id}` });
            dgeTriggerBlobDownload(blob, filename);
            if (typeof showToast === 'function') showToast("Shared the text — this browser can't share audio directly, so the audio was also downloaded.");
            return;
        }

        // No Web Share API available (typically desktop) — fall back
        dgeTriggerBlobDownload(blob, filename);
        if (navigator.clipboard) { try { await navigator.clipboard.writeText(text); } catch (_) {} }
        if (typeof showToast === 'function') showToast("Sharing isn't supported in this browser — downloaded the audio and copied the text instead.");
    } catch (e) {
        if (e && e.name === 'AbortError') return; // user cancelled the native share sheet
        console.error('Share failed', e);
        if (typeof showToast === 'function') showToast('Could not share this audio.');
    }
};
