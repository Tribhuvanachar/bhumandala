/*
=========================================================
Digital Grantha Engine
audio.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const AudioEngine = {

    player: null,
    currentUrl: "",
    isReady: false,

    init() {

        if (this.player) return;

        this.player = new Audio();

        this.player.preload = "metadata";

        this.player.addEventListener("play", () => {

            DGE.log("Audio Started");

        });

        this.player.addEventListener("pause", () => {

            DGE.log("Audio Paused");

        });

        this.player.addEventListener("ended", () => {

            DGE.log("Audio Finished");

        });

        this.player.addEventListener("error", () => {

            DGE.log("Audio Error");

        });

        this.isReady = true;

        DGE.log("Audio Engine Ready");

    },

    play(url) {

        if (!this.isReady) {

            this.init();

        }

        if (!url) {

            DGE.log("Audio URL Missing");

            return;

        }

        if (this.currentUrl !== url) {

            this.player.src = url;

            this.currentUrl = url;

        }

        this.player.play();

    },

    pause() {

        if (!this.player) return;

        this.player.pause();

    },

    stop() {

        if (!this.player) return;

        this.player.pause();

        this.player.currentTime = 0;

    },

    seek(seconds) {

        if (!this.player) return;

        this.player.currentTime = seconds;

    },

    volume(level) {

        if (!this.player) return;

        level = Math.max(0, Math.min(1, level));

        this.player.volume = level;

    },

    position() {

        if (!this.player) return 0;

        return this.player.currentTime;

    },

    duration() {

        if (!this.player) return 0;

        return this.player.duration || 0;

    }

};

window.AudioEngine = AudioEngine;

document.addEventListener("DOMContentLoaded", function () {

    AudioEngine.init();

});

})();
