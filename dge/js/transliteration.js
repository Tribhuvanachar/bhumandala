/*
=========================================================
Digital Grantha Engine
transliteration.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const TransliterationEngine = {

    mode: "devanagari",

    supportedModes: [
        "devanagari",
        "iast",
        "kannada",
        "telugu",
        "tamil",
        "malayalam"
    ],

    setMode(mode) {

        if (this.supportedModes.includes(mode)) {

            this.mode = mode;

            DGE.log("Transliteration : " + mode);

        }

    },

    getMode() {

        return this.mode;

    },

    convert(text) {

        if (!text) return "";

        switch (this.mode) {

            case "devanagari":
                return text;

            case "iast":
                return this.toIAST(text);

            case "kannada":
                return this.toKannada(text);

            case "telugu":
                return this.toTelugu(text);

            case "tamil":
                return this.toTamil(text);

            case "malayalam":
                return this.toMalayalam(text);

            default:
                return text;

        }

    },

    toIAST(text) {

        return text;

    },

    toKannada(text) {

        return text;

    },

    toTelugu(text) {

        return text;

    },

    toTamil(text) {

        return text;

    },

    toMalayalam(text) {

        return text;

    },

    render(elementId, text) {

        const element = document.getElementById(elementId);

        if (!element) return;

        element.innerHTML = this.convert(text);

    },

    autoRender() {

        document.querySelectorAll("[data-transliteration]")

        .forEach(node => {

            const value = node.dataset.transliteration;

            node.innerHTML = this.convert(value);

        });

    }

};

window.TransliterationEngine = TransliterationEngine;

document.addEventListener("DOMContentLoaded", function () {

    TransliterationEngine.autoRender();

});
})();
