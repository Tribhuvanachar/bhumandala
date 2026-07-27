/*
=========================================================
Digital Grantha Engine
Startup
Build 020
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:6px;font-family:monospace">index.js BUILD 020</div>'
);

const debug = document.getElementById("debugLog");

function log(msg){
    console.log(msg);
    if(debug) debug.value += msg + "\n";
}

(async()=>{

try{

log("========== DGE BUILD 020 ==========");

const manager = window.DGEGranthaManager;

await manager.start();

log("✓ GranthaManager started");

const dataset =
window.DGEDatasetAdapter.getDataset
? window.DGEDatasetAdapter.getDataset()
: window.DGEDatasetAdapter.load(
manager.getDataset()
);

log("✓ Dataset adapted");

log("Verse Count : "+dataset.length);

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
