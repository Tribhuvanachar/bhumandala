document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:green;color:white;padding:8px;font-family:monospace">index.js loaded</div>'
);
const debug = document.getElementById("debugLog");

function log(x) {
    console.log(x);
    if (debug) debug.value += x + "\n";
}

log("=== BUILD 008 ===");

log("typeof DGEGranthaManager = " + typeof DGEGranthaManager);
log("typeof DGEDatasetAdapter = " + typeof DGEDatasetAdapter);
log("typeof DGEGranthaReader = " + typeof DGEGranthaReader);

log("typeof DGEGranthaManager.start = " +
    typeof DGEGranthaManager.start);

log("typeof DGEDatasetAdapter.load = " +
    typeof DGEDatasetAdapter.load);

log("typeof DGEGranthaReader.initialize = " +
    typeof DGEGranthaReader.initialize);
