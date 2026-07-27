/*
=========================================================
Digital Grantha Engine
search.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const SearchEngine = {

    index: [],

    build(dataset) {

        this.index = [];

        if (!dataset) return;

        if (Array.isArray(dataset)) {

            dataset.forEach((item, i) => {

                this.index.push({

                    id: i,

                    source: item,

                    text: JSON.stringify(item).toLowerCase()

                });

            });

        }

        DGE.log("Search Index : " + this.index.length + " records");

    },

    search(query) {

        query = (query || "").trim().toLowerCase();

        if (!query.length) return [];

        return this.index.filter(item =>
            item.text.includes(query)
        );

    },

    highlight(text, query) {

        if (!query) return text;

        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        return text.replace(

            new RegExp(escaped, "gi"),

            match => "<mark>" + match + "</mark>"

        );

    },

    render(results, containerId) {

        const box = document.getElementById(containerId);

        if (!box) return;

        if (!results.length) {

            box.innerHTML = "<p>No results found.</p>";

            return;

        }

        let html = "";

        results.forEach(r => {

            html +=

            "<div class='search-result'>" +

            "<pre>" +

            JSON.stringify(r.source, null, 2) +

            "</pre>" +

            "</div>";

        });

        box.innerHTML = html;

    },

    run(query, containerId) {

        const results = this.search(query);

        this.render(results, containerId);

        DGE.log(results.length + " result(s)");

    }

};

window.SearchEngine = SearchEngine;

/* Automatically build index after dataset loads */

document.addEventListener("DOMContentLoaded", () => {

    const wait = setInterval(() => {

        if (window.DGE && DGE.data) {

            SearchEngine.build(DGE.data);

            clearInterval(wait);

        }

    }, 300);

});

})();
