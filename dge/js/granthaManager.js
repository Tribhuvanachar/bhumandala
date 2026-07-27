/*
=========================================================
Digital Grantha Engine
Grantha Manager
Build 014
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#0066cc;color:white;padding:6px;font-family:monospace">granthaManager.js BUILD 014</div>'
);

class DGEGranthaManager {

    constructor() {

        this.dataset = {};
        this.title = "Digital Grantha Engine";

    }

    async start() {

        const response = await fetch("data/pns/data.json");

        const text = await response.text();

        const box = document.getElementById("debugLog");

        if (box) {

            box.value += "\n----- First 300 characters -----\n";
            box.value += text.substring(0, 300);
            box.value += "\n-------------------------------\n";

        }

        this.dataset = {};

        try {

            this.dataset = JSON.parse(text);

        } catch (e) {

            if (box) {

                box.value += "\nJSON PARSE ERROR:\n";
                box.value += e.message + "\n";

            }

            throw e;

        }

        return true;

    }

    getDataset() {

        return this.dataset;

    }

    getTitle() {

        return this.title;

    }

}

window.DGEGranthaManager = new DGEGranthaManager();
