/*
=========================================================
Digital Grantha Engine
Grantha Audio
Build 026
=========================================================
*/

class DGEGranthaAudio {

    constructor() {

        this.currentAudio = new Audio();

        this.activeId = null;

        this.isPlaying = false;

        this.currentLoopCount = 0;

        this.audioRetryDone = false;

        this.metadata = null;

        this.reader = null;

        this.AUDIO_CACHE_NAME = "DGE_AUDIO_CACHE";

    }

    initialize(metadata, reader) {

        this.metadata = metadata;

        this.reader = reader;

    }

    async resolveAudioSrc(id) {

        const primary =

            `${this.metadata.archiveBaseUrl}` +

            `${this.metadata.filePrefix}` +

            `${id}` +

            `${this.metadata.fileExtension}`;

        const alt =

            `${this.metadata.archiveBaseUrl}` +

            `${this.metadata.filePrefix}` +

            `${id}%E2%80%8B` +

            `${this.metadata.fileExtension}`;

        if ("caches" in window) {

            try {

                const cache =

                    await caches.open(

                        this.AUDIO_CACHE_NAME

                    );

                const hit =

                    (await cache.match(primary)) ||

                    (await cache.match(alt));

                if (hit) {

                    const blob =

                        await hit.blob();

                    return URL.createObjectURL(blob);

                }

            }

            catch (e) {}

        }

        return primary;

    }

    async playShloka(id) {

        if (!this.metadata) return;

        if (

            this.activeId === id &&

            this.isPlaying

        ) {

            this.currentAudio.pause();

            return;

        }

        this.activeId = id;

        this.currentLoopCount = 0;

        this.audioRetryDone = false;

        if (this.reader) {

            this.reader.currentIndex = id - 1;

            if (typeof this.reader.render === "function") {

                this.reader.render();

            }

            const card = document.getElementById(`shloka-${id}`);

            if (card) {

                card.scrollIntoView({

                    behavior: "smooth",

                    block: "center"

                });

            }

        }

        if (this.onTrackChanged) {

            const total =

                this.metadata.totalShlokas ||

                this.metadata.verseCount ||

                0;

            this.onTrackChanged(

                id,

                total

            );

        }

        if (this.onReadingTextRequested) {

            this.onReadingTextRequested(id);

        }

        if (this.onTimeChanged) {

            this.onTimeChanged(

                "0:00.000",

                "0:00.000"

            );

        }

        this.currentAudio.src =

            await this.resolveAudioSrc(id);

        this.currentAudio.playbackRate =

            this.playbackRate || 1.0;

        this.loopStart = 0;

        this.loopEnd = 0;

        this.loopEnabled = false;

        this.currentAudio.play().catch(err => {

            if (err.name !== "AbortError") {

                console.error(err);

            }

        });

    }

    togglePlay() {

        if (!this.metadata) return;

        if (!this.activeId) {

            if (this.playFirstFiltered) {

                this.playFirstFiltered();

            }

            return;

        }

        if (this.isPlaying) {

            this.currentAudio.pause();

        }

        else {

            this.currentAudio.play();

        }

    }

    playNextFiltered() {

        if (this.onNextFiltered) {

            this.onNextFiltered(this.activeId);

        }

    }

    playPrevFiltered() {

        if (this.onPreviousFiltered) {

            this.onPreviousFiltered(this.activeId);

        }

    }
    installPlaybackEvents() {

        this.currentAudio.addEventListener("timeupdate", () => {

            if (this.onTimeChanged) {

                this.onTimeChanged(

                    this.formatTime(this.currentAudio.currentTime),

                    this.formatTime(this.currentAudio.duration)

                );

            }

            if (this.loopEnabled) {

                const end = this.loopEnd;

                const start = this.loopStart || 0;

                if (

                    end &&

                    this.currentAudio.currentTime >= end

                ) {

                    this.currentAudio.currentTime = start;

                }

            }

        });

        this.currentAudio.addEventListener("ended", () => {

            const totalRepeats =

                this.repeatCount || 1;

            if (++this.currentLoopCount < totalRepeats) {

                this.currentAudio.currentTime =

                    this.loopStart || 0;

                if (this.onRepeatChanged) {

                    this.onRepeatChanged(

                        this.currentLoopCount,

                        totalRepeats

                    );

                }

                this.currentAudio.play();

            }

            else {

                this.currentLoopCount = 0;

                if (this.onRepeatChanged) {

                    this.onRepeatChanged(

                        0,

                        totalRepeats

                    );

                }

                if (this.currentFilter === "none") {

                    this.isPlaying = false;

                    if (this.onPlayStateChanged) {

                        this.onPlayStateChanged(false);

                    }

                    return;

                }

                this.playNextFiltered();

            }

        });

    }

    updatePlayState(playing) {

        this.isPlaying = playing;

        if (this.onPlayStateChanged) {

            this.onPlayStateChanged(playing);

        }

        if (this.reader &&
            typeof this.reader.setAudioHighlight === "function") {

            this.reader.setAudioHighlight(

                this.activeId,

                playing

            );

        }

    }

    updateRepeatDisplay() {

        if (this.onRepeatChanged) {

            this.onRepeatChanged(

                this.currentLoopCount,

                this.repeatCount || 1

            );

        }

    }

    setPlaybackListener(callback) {

        this.onPlayStateChanged = callback;

    }

    setTrackChangedListener(callback) {

        this.onTrackChanged = callback;

    }

    setReadingTextListener(callback) {

        this.onReadingTextRequested = callback;

    }

    formatTime(seconds) {

        seconds = Number(seconds) || 0;

        const min = Math.floor(seconds / 60);

        const sec = Math.floor(seconds % 60);

        const ms = Math.floor(

            (seconds - Math.floor(seconds)) * 1000

        );

        return (

            `${min}:` +

            `${String(sec).padStart(2,"0")}.` +

            `${String(ms).padStart(3,"0")}`

        );

    }    updatePlayUI() {

        if (this.onPlayStateChanged) {

            this.onPlayStateChanged(this.isPlaying);

        }

        if (

            this.activeId &&

            this.reader &&

            typeof this.reader.setAudioHighlight === "function"

        ) {

            this.reader.setAudioHighlight(

                this.activeId,

                this.isPlaying

            );

        }

    }

    updateRepeatDisplay() {

        if (this.onRepeatChanged) {

            this.onRepeatChanged(

                this.currentLoopCount,

                this.repeatCount || 1

            );

        }

    }

    async preloadAudio(ids) {

        if (

            !("caches" in window) ||

            !this.metadata ||

            !Array.isArray(ids)

        ) return;

        try {

            const cache = await caches.open(

                this.AUDIO_CACHE_NAME

            );

            for (const id of ids) {

                const url =

                    this.buildUrl(id);

                try {

                    await cache.add(url);

                }

                catch (e) {}

            }

        }

        catch (e) {

            console.error(e);

        }

    }

    buildUrl(id) {

        return (

            this.metadata.archiveBaseUrl +

            this.metadata.filePrefix +

            id +

            this.metadata.fileExtension

        );

    }

    destroy() {

        this.currentAudio.pause();

        this.currentAudio.src = "";

        this.activeId = null;

        this.isPlaying = false;

    }

}

window.DGEGranthaAudio =

    new DGEGranthaAudio();

}







    







    












    
