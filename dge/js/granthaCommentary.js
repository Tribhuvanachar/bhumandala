/*
=========================================================
Digital Grantha Engine
Grantha Commentary
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaCommentary {

    constructor() {

        this.dataset = [];

        this.enabled = false;

    }

    initialize(dataset = []) {

        this.dataset = dataset;

    }

    enable() {

        this.enabled = true;

        this.refresh();

    }

    disable() {

        this.enabled = false;

        this.refresh();

    }

    toggle() {

        this.enabled = !this.enabled;

        this.refresh();

    }

    isEnabled() {

        return this.enabled;

    }

    get(verseIndex) {

        if (

            verseIndex < 0 ||

            verseIndex >= this.dataset.length

        ) {

            return "";

        }

        return this.dataset[verseIndex].commentary || "";

    }

    refresh() {

        const panel = document.getElementById(

            "commentaryPanel"

        );

        if (!panel)

            return;

        if (!this.enabled) {

            panel.style.display = "none";

            return;

        }

        panel.style.display = "block";

    }

}

window.GranthaCommentary =
    new GranthaCommentary();
