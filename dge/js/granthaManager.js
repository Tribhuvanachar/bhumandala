/*
=========================================================
Digital Grantha Engine
Grantha Manager
Build 020 TEST
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#0066cc;color:#fff;padding:6px;font-family:monospace">granthaManager.js BUILD 020 TEST</div>'
);

console.log("granthaManager.js started");

class DGEGranthaManager {

    async start() {

        console.log("Manager.start() called");

    }

    getDataset() {

        return {};

    }

}

window.DGEGranthaManager = new DGEGranthaManager();

console.log("window.DGEGranthaManager =", window.DGEGranthaManager);
