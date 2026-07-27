/*
=========================================================
Digital Grantha Engine
commentary.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const CommentaryEngine = {

    sources: {},

    activeSource: "",

    init() {

        DGE.log("Commentary Engine Ready");

    },

    register(name, data) {

        this.sources[name] = data;

        if (!this.activeSource)
            this.activeSource = name;

        DGE.log("Commentary Registered : " + name);

    },

    setSource(name) {

        if (!this.sources[name]) {

            DGE.log("Commentary Source Missing");

            return;

        }

        this.activeSource = name;

        DGE.log("Commentary Source : " + name);

    },

    currentSource() {

        return this.activeSource;

    },

    get(granthaId, verseNo) {

        if (!this.activeSource)
            return "";

        const source =

            this.sources[this.activeSource];

        if (!source)
            return "";

        if (!source[granthaId])
            return "";

        return source[granthaId][verseNo] || "";

    },

    render(containerId, granthaId, verseNo) {

        const box =

            document.getElementById(containerId);

        if (!box)
            return;

        const commentary =

            this.get(granthaId, verseNo);

        if (!commentary) {

            box.innerHTML =

                "<em>No commentary available.</em>";

            return;

        }

        box.innerHTML =

            "<div class='dge-commentary'>" +

            commentary +

            "</div>";

    },

    search(query) {

        query =

            query.toLowerCase();

        let result = [];

        Object.keys(this.sources)

        .forEach(sourceName => {

            const source =

                this.sources[sourceName];

            Object.keys(source)

            .forEach(grantha => {

                Object.keys(source[grantha])

                .forEach(verse => {

                    const text =

                        source[grantha][verse];

                    if (

                        text

                        .toLowerCase()

                        .includes(query)

                    ) {

                        result.push({

                            source: sourceName,

                            grantha,

                            verse,

                            text

                        });

                    }

                });

            });

        });

        return result;

    },

    listSources() {

        return Object.keys(this.sources);

    }

};

window.CommentaryEngine = CommentaryEngine;

document.addEventListener(

    "DOMContentLoaded",

    function () {

        CommentaryEngine.init();

    }

);

})();
