/*
=========================================================
Digital Grantha Engine
Startup
Build 019
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:6px;font-family:monospace">index.js BUILD 019</div>'
);

const debug = document.getElementById("debugLog");

function log(msg){
    console.log(msg);
    if(debug) debug.value += msg + "\n";
}

log("========== DGE BUILD 019 ==========");

log("typeof window.DGEGranthaManager = " + typeof window.DGEGranthaManager);
log("typeof window.DGEDatasetAdapter = " + typeof window.DGEDatasetAdapter);
log("typeof window.DGEGranthaReader = " + typeof window.DGEGranthaReader);
log("typeof window.DGEGranthaNavigator = " + typeof window.DGEGranthaNavigator);
log("typeof window.DGEGranthaCommentary = " + typeof window.DGEGranthaCommentary);

if (window.DGEGranthaManager) {
    log("typeof start = " + typeof window.DGEGranthaManager.start);
}

log("========== END ==========");
