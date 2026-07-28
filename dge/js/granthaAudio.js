/*
=========================================================
Digital Grantha Engine
granthaAudio.js
Build 002
Part 1 of 6
Migrated from PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaAudio {

    constructor() {

        this.dataset = null;

        this.audio = new Audio();

        this.activeId = null;

        this.isPlaying = false;

        this.currentLoopCount = 0;

        this.audioRetryDone = false;

        this.cacheName = "";

        this.els = {};

    }

    initialize(dataset, elements, cacheName) {

        this.dataset = dataset;

        this.els = elements;

        this.cacheName = cacheName;

    }

    formatTime(seconds) {

        if (isNaN(seconds)) {

            return "0:00.000";

        }

        const minutes = Math.floor(seconds / 60);

        const secs = Math.floor(seconds % 60);

        const millis = Math.floor(

            (seconds % 1) * 1000

        );

        return (

            minutes +

            ":" +

            (secs < 10 ? "0" : "") +

            secs +

            "." +

            String(millis).padStart(3, "0")

        );

    }

    async resolveAudioSrc(id) {

        const meta = this.dataset.metadata;

        const primary =

            `${meta.archiveBaseUrl}${meta.filePrefix}${id}${meta.fileExtension}`;

        const alternate =

            `${meta.archiveBaseUrl}${meta.filePrefix}${id}%E2%80%8B${meta.fileExtension}`;

        if ("caches" in window) {

            try {

                const cache =

                    await caches.open(

                        this.cacheName

                    );

                const hit =

                    (await cache.match(primary))

                    ||

                    (await cache.match(alternate));

                if (hit) {

                    const blob =

                        await hit.blob();

                    return URL.createObjectURL(blob);

                }

            }

            catch (e) {

            }

        }

        return primary;

    }

}
window.DGEGranthaAudio =
    new DGEGranthaAudio();
/*--end1--*/
    async playShloka(id) {

        if (!this.dataset) return;

        if (this.activeId === id && this.isPlaying) {

            this.audio.pause();
            return;

        }

        this.activeId = id;

        if (typeof contextShlokaId !== "undefined") {
            contextShlokaId = id;
        }

        this.currentLoopCount = 0;
        this.audioRetryDone = false;

        if (typeof updateRepeatDisplay === "function") {
            updateRepeatDisplay();
        }

        if (typeof renderList === "function") {
            renderList();
        }

        const activeRow =
            document.getElementById(`shloka-${id}`);

        if (activeRow) {

            activeRow.scrollIntoView({

                behavior: "smooth",
                block: "center"

            });

        }

        const total =
            this.dataset.metadata.totalShlokas || 43;

        this.els.trackLabel.innerText =
            `${id}/${total}`;

        this.els.readingCard.innerHTML =
            getText(id);

        this.els.timeDisplay.innerText =
            "0:00.000 / 0:00.000";

        this.audio.src =
            await this.resolveAudioSrc(id);

        this.audio.playbackRate =
            parseFloat(this.els.speedInput.value) || 1.0;

        this.els.loopA.value = "";
        this.els.loopB.value = "";
        this.els.enableAB.checked = false;

        this.audio.play().catch(err => {

            if (err.name !== "AbortError") {

                console.error(err);

            }

        });

    }

    togglePlay() {

        if (!this.dataset) return;

        if (!this.activeId) {

            const ids = getFilteredIds();

            if (ids.length) {

                this.playShloka(ids[0]);

            }

        }

        else if (this.isPlaying) {

            this.audio.pause();

            if (this.els.autoABToggle.checked) {

                const current =
                    this.audio.currentTime.toFixed(1);

                if (!this.els.loopA.value) {

                    this.els.loopA.value = current;

                }

                else if (!this.els.loopB.value) {

                    this.els.loopB.value = current;

                    this.els.enableAB.checked = true;

                    this.audio.currentTime =
                        parseFloat(this.els.loopA.value);

                    this.audio.play();

                }

                else {

                    this.els.loopA.value = "";

                    this.els.loopB.value = "";

                    this.els.enableAB.checked = false;

                }

            }

        }

        else {

            this.audio.play();

        }

    }
/*end2*/
    playNextFiltered() {

        const ids = getFilteredIds();

        if (!ids.length) return;

        const idx = ids.indexOf(this.activeId);

        if (idx !== -1 && idx < ids.length - 1) {

            this.playShloka(ids[idx + 1]);

        } else {

            this.audio.pause();

            this.els.repeatCounter.innerText = "";

        }

    }

    playPrevFiltered() {

        const ids = getFilteredIds();

        if (!ids.length) return;

        const idx = ids.indexOf(this.activeId);

        if (idx > 0) {

            this.playShloka(ids[idx - 1]);

        } else {

            this.playShloka(ids[ids.length - 1]);

        }

    }

    bindPlaybackEvents() {

        this.audio.addEventListener("timeupdate", () => {

            this.els.timeDisplay.innerText =
                `${this.formatTime(this.audio.currentTime)} / ${this.formatTime(this.audio.duration)}`;

            if (this.els.enableAB.checked) {

                const end =
                    parseFloat(this.els.loopB.value);

                const start =
                    parseFloat(this.els.loopA.value) || 0;

                if (end && this.audio.currentTime >= end) {

                    this.audio.currentTime = start;

                }

            }

        });

        this.audio.addEventListener("ended", () => {

            const totalRepeat =
                parseInt(this.els.repeatInput.value) || 1;

            if (++this.currentLoopCount < totalRepeat) {

                this.audio.currentTime =
                    parseFloat(this.els.loopA.value) || 0;

                if (typeof updateRepeatDisplay === "function") {

                    updateRepeatDisplay();

                }

                this.audio.play();

            } else {

                this.currentLoopCount = 0;

                if (typeof updateRepeatDisplay === "function") {

                    updateRepeatDisplay();

                }

                if (currentFilter === "none") {

                    this.isPlaying = false;

                    if (typeof updatePlayUI === "function") {

                        updatePlayUI();

                    }

                    return;

                }

                this.playNextFiltered();

            }

        });
/*end3*/
            bindAudioStateEvents() {

        this.audio.addEventListener("playing", () => {

            this.isPlaying = true;

            if (typeof updatePlayUI === "function") {

                updatePlayUI();

            }

        });

        this.audio.addEventListener("pause", () => {

            this.isPlaying = false;

            if (typeof updatePlayUI === "function") {

                updatePlayUI();

            }

        });

        this.audio.addEventListener("loadedmetadata", () => {

            this.audio.playbackRate =
                parseFloat(this.els.speedInput.value) || 1.0;

            this.els.timeDisplay.innerText =
                `0:00.000 / ${this.formatTime(this.audio.duration)}`;

            if (typeof updateRepeatDisplay === "function") {

                updateRepeatDisplay();

            }

        });

        this.audio.addEventListener("error", () => {

            if (!this.activeId || !this.dataset) return;

            if (this.audioRetryDone) {

                this.els.timeDisplay.innerText =
                    "Audio unavailable";

                return;

            }

            this.audioRetryDone = true;

            this.audio.src =
                `${this.dataset.metadata.archiveBaseUrl}` +
                `${this.dataset.metadata.filePrefix}` +
                `${this.activeId}%E2%80%8B` +
                `${this.dataset.metadata.fileExtension}`;

            this.audio.load();

            this.audio.play()
                .then(() => {

                    this.isPlaying = true;

                    if (typeof updatePlayUI === "function") {

                        updatePlayUI();

                    }

                })
                .catch(() => {});

        });
    }
    }

/*end5*/
    async cacheAllAudio(btn) {

        if (!this.dataset || btn.dataset.cached === "true") return;

        if (!("caches" in window)) {

            alert("This browser does not support offline caching.");

            return;

        }

        btn.innerText = "⏳ Preloading 0%";

        btn.disabled = true;

        const total =
            this.dataset.metadata.totalShlokas || 43;

        const cache =
            await caches.open(this.cacheName);

        const queue =
            Array.from(
                { length: total },
                (_, i) => i + 1
            );

        let done = 0;

        let success = 0;

        const CONCURRENCY = 4;

        const worker = async () => {

            while (queue.length) {

                const id = queue.shift();

                const primary =
                    `${this.dataset.metadata.archiveBaseUrl}` +
                    `${this.dataset.metadata.filePrefix}` +
                    `${id}` +
                    `${this.dataset.metadata.fileExtension}`;

                const alternate =
                    `${this.dataset.metadata.archiveBaseUrl}` +
                    `${this.dataset.metadata.filePrefix}` +
                    `${id}%E2%80%8B` +
                    `${this.dataset.metadata.fileExtension}`;

                try {

                    let response =
                        await fetch(primary);

                    if (!response.ok) {

                        response =
                            await fetch(alternate);

                    }

                    if (response.ok) {

                        await cache.put(
                            response.url,
                            response.clone()
                        );

                        success++;

                    }

                } catch (e) {

                    /* skip this track */

                }

                done++;

                btn.innerText =
                    `⏳ Preloading ${Math.round((done / total) * 100)}%`;

            }

        };

        await Promise.all(

            Array.from(

                { length: CONCURRENCY },

                () => worker()

            )

        );

        localStorage.setItem(

            nsKey("allCached"),

            "true"

        );

        btn.innerText =
            `✅ All Cached (${success}/${total})`;

        btn.dataset.cached = "true";

        btn.style.background = "#e8f5e9";

        btn.style.color = "#2e7d32";

        btn.style.borderColor = "#c8e6c9";

    }
/*end5*/
    bindUIEvents() {

        this.els.speedInput.addEventListener("input", (e) => {

            this.els.speedVal.innerText =
                parseFloat(e.target.value).toFixed(1);

            this.audio.playbackRate = e.target.value;

        });

    }
/*end6*/















    
    
