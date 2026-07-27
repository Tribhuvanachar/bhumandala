const debug = document.getElementById("debugLog");

function log(msg) {
    console.log(msg);
    if (debug) {
        debug.value += msg + "\n";
    }
}

window.onerror = function(message, source, line, col, error) {
    log("ERROR: " + message);
    if (error && error.stack) {
        log(error.stack);
    }
};

(async function () {

    log("DGE Build 007");
    log("index.js loaded");

    log("typeof DGEGranthaManager = " + typeof DGEGranthaManager);
    log("typeof DGEDatasetAdapter = " + typeof DGEDatasetAdapter);
    log("typeof DGEGranthaReader = " + typeof DGEGranthaReader);

})();
