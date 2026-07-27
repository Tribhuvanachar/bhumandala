/*
=========================================================
Digital Grantha Engine
Grantha Commentary
Build 018
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#7b1fa2;color:white;padding:6px;font-family:monospace">granthaCommentary.js BUILD 018</div>'
);

class DGEGranthaCommentary {

    getEnabled(index, dataset) {

        if (!dataset || !dataset[index]) {

            return [];

        }

        const commentary = dataset[index].commentary || {};

        return Object.entries(commentary).map(([name, text]) => ({

            name,

            text

        }));

    }

}

window.DGEGranthaCommentary = new DGEGranthaCommentary();
