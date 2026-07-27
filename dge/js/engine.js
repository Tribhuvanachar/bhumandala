/*
=========================================================
Digital Grantha Engine
engine.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const DGE = {

    version: "10.1.0-alpha.005",

    config: null,
    data: null,

    state: {
        ready: false,
        loading: false,
        currentGrantha: null,
        currentVerse: 0,
        searchResults: [],
        theme: "light"
    },

    log(message) {

        console.log("[DGE]", message);

        const logBox = document.getElementById("log");

        if (logBox) {
            logBox.textContent += message + "\n";
        }

    },

    async loadJSON(path) {

        const response = await fetch(path + "?v=" + Date.now());

        if (!response.ok) {
            throw new Error("Unable to load " + path);
        }

        return await response.json();

    },

    async loadConfig() {

        this.log("Loading config...");

        this.config = await this.loadJSON("assets/config.json");

        this.log("Config loaded.");

    },

    async loadDataset() {

        if (!this.config) return;

        if (!this.config.dataset) {

            this.log("Dataset missing.");

            return;

        }

        this.log("Loading dataset...");

        this.data = await this.loadJSON(this.config.dataset);

        this.log("Dataset loaded.");

    },

    async init() {

        this.loading = true;

        this.log("================================");

        this.log("Digital Grantha Engine");

        this.log("Version : " + this.version);

        try {

            await this.loadConfig();

            await this.loadDataset();

            this.state.ready = true;

            this.log("Engine Ready");

        }

        catch (e) {

            console.error(e);

            this.log(e.message);

        }

        this.loading = false;

        this.log("================================");

    }

};

window.DGE = DGE;

document.addEventListener("DOMContentLoaded", function () {

    DGE.init();

});

})();
