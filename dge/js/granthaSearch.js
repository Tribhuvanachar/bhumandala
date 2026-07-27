/*
=========================================================
Digital Grantha Engine
Grantha Search
Build 023
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#424242;color:#fff;padding:6px;font-family:monospace">granthaSearch.js BUILD 023</div>'
);

class DGEGranthaSearch {

    constructor() {

        this.reader = null;
        this.dataset = [];

    }

    initialize(reader, dataset) {

        this.reader = reader;
        this.dataset = dataset || [];

        const box = document.getElementById("searchInput");

        if (!box) {

            console.warn("Search input not found.");

            return;

        }

        box.oninput = () => {

            const q = box.value.trim().toLowerCase();

            if (!q) {

                return;

            }

            const index = this.dataset.findIndex(v =>

                (v.sanskrit || "").toLowerCase().includes(q) ||

                (v.transliteration || "").toLowerCase().includes(q) ||

                (v.meaning || "").toLowerCase().includes(q)

            );

            if (index >= 0) {

                this.reader.currentIndex = index;

                this.reader.render();

            }

        };

    }

}

window.DGEGranthaSearch = new DGEGranthaSearch();
