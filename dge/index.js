/*
=========================================================
Digital Grantha Engine
Startup
Build 010
=========================================================
*/

const debug = document.getElementById("debugLog");

function log(message) {

    console.log(message);

    if (debug) {

        debug.value += message + "\n";

    }

}

window.onerror = function (message, source, line, column, error) {

    log("ERROR: " + message);

    log("FILE : " + source);

    log("LINE : " + line);

    if (error && error.stack) {

        log(error.stack);

    }

    return true;

};

(async function () {

    log("=== BUILD 010 ===");

    log("Manager object : " + typeof DGEGranthaManager);

    log("Manager.start : " + typeof DGEGranthaManager.start);

    log("DatasetAdapter : " + typeof DGEDatasetAdapter);

    log("DatasetAdapter.load : " + typeof DGEDatasetAdapter.load);

    await DGEGranthaManager.start();

    log("Manager started");

    const dataset =
        DGEDatasetAdapter.load(
            DGEGranthaManager.getDataset()
        );

    log("Dataset loaded");

    log("Verse count : " + dataset.length);

})();
