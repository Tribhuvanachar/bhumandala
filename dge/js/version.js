/*
=========================================================
Digital Grantha Engine
Version
Build 023
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#263238;color:#fff;padding:6px;font-family:monospace">version.js BUILD 023</div>'
);

window.DGE = window.DGE || {};

window.DGE.Version = {

    engine : "1.0.0-alpha.23",

    build : "023",

    date : "2026-07-27",

    status : "Development"

};

console.log(
    "DGE Version",
    window.DGE.Version
);
