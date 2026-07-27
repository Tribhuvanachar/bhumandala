/*
=========================================================
Digital Grantha Engine
render.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const RenderEngine = {

    containerId: "content",

    setContainer(id) {
        this.containerId = id;
    },

    getContainer() {

        return document.getElementById(this.containerId);

    },

    clear() {

        const c = this.getContainer();

        if (c) c.innerHTML = "";

    },

    renderVerse(verse) {

        const c = this.getContainer();

        if (!c || !verse) return;

        let html = "";

        html += "<div class='dge-verse'>";

        if (verse.number)
            html += "<h2>Verse " + verse.number + "</h2>";

        if (verse.sanskrit)
            html += "<div class='dge-sanskrit'>" +
                    verse.sanskrit +
                    "</div>";

        if (verse.transliteration)
            html += "<div class='dge-transliteration'>" +
                    verse.transliteration +
                    "</div>";

        if (verse.meaning)
            html += "<div class='dge-meaning'>" +
                    verse.meaning +
                    "</div>";

        if (verse.commentary)
            html += "<div class='dge-commentary'>" +
                    verse.commentary +
                    "</div>";

        html += "</div>";

        c.innerHTML = html;

    },

    renderGrantha(data) {

        if (!Array.isArray(data)) {

            DGE.log("Renderer: invalid dataset");

            return;

        }

        if (data.length === 0) {

            DGE.log("Renderer: empty dataset");

            return;

        }

        this.renderVerse(data[0]);

    },

    next() {

        if (!DGE.data) return;

        if (!DGE.state.currentVerse)
            DGE.state.currentVerse = 0;

        DGE.state.currentVerse++;

        if (DGE.state.currentVerse >= DGE.data.length)
            DGE.state.currentVerse = DGE.data.length - 1;

        this.renderVerse(DGE.data[DGE.state.currentVerse]);

    },

    previous() {

        if (!DGE.data) return;

        if (!DGE.state.currentVerse)
            DGE.state.currentVerse = 0;

        DGE.state.currentVerse--;

        if (DGE.state.currentVerse < 0)
            DGE.state.currentVerse = 0;

        this.renderVerse(DGE.data[DGE.state.currentVerse]);

    },

    goTo(index) {

        if (!DGE.data) return;

        if (index < 0)
            index = 0;

        if (index >= DGE.data.length)
            index = DGE.data.length - 1;

        DGE.state.currentVerse = index;

        this.renderVerse(DGE.data[index]);

    }

};

window.RenderEngine = RenderEngine;

document.addEventListener("DOMContentLoaded", function () {

    const wait = setInterval(function () {

        if (window.DGE && DGE.data) {

            RenderEngine.renderGrantha(DGE.data);

            clearInterval(wait);

        }

    }, 300);

});

})();
