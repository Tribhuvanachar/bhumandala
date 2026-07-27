document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:8px;font-family:monospace">granthaManager.js BUILD 011 LOADED</div>'
);

class DGEGranthaManager {

    async start() {

        return true;

    }

    getDataset() {

        return [];

    }

    getTitle() {

        return "TEST";

    }

}

window.DGEGranthaManager = new DGEGranthaManager();

console.log(window.DGEGranthaManager);
