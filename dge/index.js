/*
=========================================================
Digital Grantha Engine
Startup
Build 012
=========================================================
*/

const debug = document.getElementById("debugLog");

function log(message) {

    console.log(message);

    if (debug) {

        debug.value += message + "\n";

    }

}

window.onerror = function(message, source, line, column, error) {

    log("ERROR : " + message);

    log("FILE  : " + source);

    log("LINE  : " + line);

    if (error && error.stack) {

        log(error.stack);

    }

    return true;

};

(async function () {

    log("========== DGE BUILD 012 ==========");

    const Manager = window.DGEGranthaManager;
    const Adapter = window.DGEDatasetAdapter;
    const Reader = window.DGEGranthaReader;
    const Navigator = window.DGEGranthaNavigator;

    log("Manager : " + typeof Manager);
    log("Adapter : " + typeof Adapter);
    log("Reader  : " + typeof Reader);
    log("Navigator : " + typeof Navigator);

    await Manager.start();

    log("✓ GranthaManager started");

    const dataset =
        Adapter.load(
            Manager.getDataset()
        );

    log("✓ Dataset adapted");

    log("Verse Count : " + dataset.length);

    Reader.initialize();

    Reader.load(dataset);

    log("✓ Reader initialized");

    Navigator.initialize(Reader);

    log("✓ Navigator initialized");

    const title =
        document.getElementById("granthaTitle");

    if (title) {

        title.textContent =
            Manager.getTitle();

    }

    log("========== DGE READY ==========");

})();
