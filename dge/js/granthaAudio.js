/*
=========================================================
Digital Grantha Engine
Grantha Audio
Build 001
Part 1
Migrated from PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaAudio {

    constructor() {

        this.audio = new Audio();

        this.dataset = null;

        this.activeVerse = null;

        this.isPlaying = false;

        this.currentLoop = 0;

        this.retryDone = false;

        this.cacheName = "dge-audio-cache";

        this.onPlayback = null;

        this.onTime = null;

        this.onTrack = null;

        this.onRepeat = null;

        this.onReading = null;

    }

    initialize(dataset, cacheName) {

        this.dataset = dataset;

        if (cacheName) {

            this.cacheName = cacheName;

        }

        this.attachEvents();

    }

    attachEvents() {

        this.audio.addEventListener(

            "playing",

            () => {

                this.isPlaying = true;

                if (this.onPlayback) {

                    this.onPlayback(true);

                }

            }

        );

        this.audio.addEventListener(

            "pause",

            () => {

                this.isPlaying = false;

                if (this.onPlayback) {

                    this.onPlayback(false);

                }

            }

        );

        this.audio.addEventListener(

            "loadedmetadata",

            () => {

                if (this.onTime) {

                    this.onTime(

                        "0:00.000",

                        this.formatTime(

                            this.audio.duration

                        )

                    );

                }

            }

        );

        this.audio.addEventListener(

            "timeupdate",

            () => {

                if (this.onTime) {

                    this.onTime(

                        this.formatTime(

                            this.audio.currentTime

                        ),

                        this.formatTime(

                            this.audio.duration

                        )

                    );

                }

                this.handleABLoop();

            }

        );

        this.audio.addEventListener(

            "ended",

            () => {

                this.handleEnded();

            }

        );

        this.audio.addEventListener(

            "error",

            () => {

                this.handleRetry();

            }

        );

    }

    formatTime(sec) {

        if (isNaN(sec)) {

            return "0:00.000";

        }

        const m = Math.floor(sec / 60);

        const s = Math.floor(sec % 60);

        const ms = Math.floor(

            (sec % 1) * 1000

        );

        return (

            m +

            ":" +

            String(s).padStart(2, "0") +

            "." +

            String(ms).padStart(3, "0")

        );

    }

    setPlaybackListener(fn) {

        this.onPlayback = fn;

    }

    setTimeListener(fn) {

        this.onTime = fn;

    }

    setTrackChangedListener(fn) {

        this.onTrack = fn;

    }

    setRepeatChangedListener(fn) {

        this.onRepeat = fn;

    }

    setReadingTextListener(fn) {

        this.onReading = fn;

    }

}
