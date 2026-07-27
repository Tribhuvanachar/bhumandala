/*
=========================================================
Digital Grantha Engine
Grantha Navigator
Build 022
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#795548;color:#fff;padding:6px;font-family:monospace">granthaNavigator.js BUILD 022</div>'
);

class DGEGranthaNavigator {

    constructor() {

        this.reader = null;

    }

    initialize(reader) {

        this.reader = reader;

        const first = document.getElementById("btnFirst");
        const prev  = document.getElementById("btnPrevious");
        const next  = document.getElementById("btnNext");
        const last  = document.getElementById("btnLast");

        if (first)
            first.onclick = () => this.reader.first();

        if (prev)
            prev.onclick = () => this.reader.previous();

        if (next)
            next.onclick = () => this.reader.next();

        if (last)
            last.onclick = () => this.reader.last();

        console.log("Navigator initialized.");

    }

}

window.DGEGranthaNavigator =
    new DGEGranthaNavigator();
