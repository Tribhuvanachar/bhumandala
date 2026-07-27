/*
=========================================================
Digital Grantha Engine
Startup
Build 021
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:6px;font-family:monospace">index.js BUILD 021</div>'
);

const debug = document.getElementById("debugLog");

function log(msg){

    console.log(msg);

    if(debug){

        debug.value += msg + "\n";

    }

}

window.onerror = function(message, source, line, column, error){

    log("ERROR : " + message);

    if(error && error.stack){

        log(error.stack);

    }

    return true;

};

(async()=>{

try{

log("========== DGE BUILD 021 ==========");

const manager = window.DGEGranthaManager;

await manager.start();

log("✓ GranthaManager started");

const rawDataset = manager.getDataset();

log("Raw dataset type : " + typeof rawDataset);

if(rawDataset){

    log("Raw dataset keys : " + Object.keys(rawDataset).join(","));

}

const dataset =
window.DGEDatasetAdapter.getDataset
? window.DGEDatasetAdapter.getDataset(rawDataset)
: window.DGEDatasetAdapter.load(rawDataset);

log("✓ Dataset adapted");

log("Dataset type : " + typeof dataset);

log("Is Array : " + Array.isArray(dataset));

log("Dataset length : " + (dataset ? dataset.length : "NULL"));

if(Array.isArray(dataset) && dataset.length){

    log("First verse keys : " +
        Object.keys(dataset[0]).join(","));

}

window.DGEGranthaReader.initialize();

window.DGEGranthaReader.load(dataset);

log("✓ Reader initialized");

window.DGEGranthaNavigator.initialize(
    window.DGEGranthaReader
);

log("✓ Navigator initialized");

log("========== DGE READY ==========");

}catch(e){

log("STARTUP FAILED");

log(e.message);

if(e.stack){

log(e.stack);

}

}

})();
