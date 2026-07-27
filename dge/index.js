/*
=========================================================
Digital Grantha Engine
Startup
Build 017
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:6px;font-family:monospace">index.js BUILD 017</div>'
);

const debug = document.getElementById("debugLog");

function log(message) {

    console.log(message);

    if (debug) {

        debug.value += message + "\n";

    }

}

window.onerror = function(message, source, line, column, error) {

    log("ERROR : " + message);

    if (error && error.stack) {

        log(error.stack);

    }

    return true;

};

(async function () {

    try {

        log("========== DGE BUILD 017 ==========");

        const Manager = window.DGEGranthaManager;
        const Adapter = window.DGEDatasetAdapter;
        const Reader = window.DGEGranthaReader;
        const Navigator = window.DGEGranthaNavigator;

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

        if (window.DGEGranthaCommentary) {

            DGEGranthaCommentary.initialize(dataset);

            log("✓ Commentary initialized");

        }

        log("========== DGE READY ==========");

    }
    catch (e) {

        log("STARTUP FAILED");

        log(e.message);

        if (e.stack) {

            log(e.stack);

        }

    }

})();
