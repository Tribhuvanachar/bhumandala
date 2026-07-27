/*
=========================================================
Digital Grantha Engine
Grantha Audio
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaAudio {

    constructor() {

        this.player = null;

        this.dataset = [];

        this.currentIndex = 0;

    }

    initialize(playerId = "audioPlayer") {

        this.player =
            document.getElementById(playerId);

    }

    load(dataset) {

        this.dataset = dataset || [];

    }

    play(index = this.currentIndex) {

        if (!this.player)
            return;

        if (index < 0)
            return;

        if (index >= this.dataset.length)
            return;

        this.currentIndex = index;

        const verse =
            this.dataset[index];

        if (!verse.audio)
            return;

        this.player.src =
            verse.audio;

        this.player.play();

    }

    pause() {

        if (!this.player)
            return;

        this.player.pause();

    }

    stop() {

        if (!this.player)
            return;

        this.player.pause();

        this.player.currentTime = 0;

    }

    next() {

        if (

            this.currentIndex
            <
            this.dataset.length - 1

        ) {

            this.play(

                this.currentIndex + 1

            );

        }

    }

    previous() {

        if (

            this.currentIndex > 0

        ) {

            this.play(

                this.currentIndex - 1

            );

        }

    }

    setSpeed(speed) {

        if (!this.player)
            return;

        this.player.playbackRate =
            speed;

    }

    setVolume(volume) {

        if (!this.player)
            return;

        this.player.volume =
            volume;

    }

}

window.GranthaAudio =
    new GranthaAudio();
