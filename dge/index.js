const debug = document.getElementById("debugLog");

function log(x) {
    console.log(x);
    if (debug) debug.value += x + "\n";
}

const Manager = window.DGEGranthaManager;
const Adapter = window.DGEDatasetAdapter;

log("=== BUILD 011 ===");

log("window.DGEGranthaManager = " + typeof Manager);
log("window.DGEGranthaManager.start = " + typeof Manager?.start);

log("window.DGEDatasetAdapter = " + typeof Adapter);
log("window.DGEDatasetAdapter.load = " + typeof Adapter?.load);
