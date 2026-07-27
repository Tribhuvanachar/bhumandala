/*
=========================================================
Digital Grantha Engine
Startup
Build 022
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#008000;color:#fff;padding:6px;font-family:monospace">index.js BUILD 022</div>'
);

const debug=document.getElementById("debugLog");

function log(msg){

    console.log(msg);

    if(debug){

        debug.value+=msg+"\n";

    }

}

window.onerror=function(message,source,line,column,error){

    log("ERROR : "+message);

    if(error&&error.stack){

        log(error.stack);

    }

    return true;

};

(async()=>{

try{

log("========== DGE BUILD 022 ==========");

const manager=window.DGEGranthaManager;

await manager.start();

log("✓ GranthaManager started");

const raw=manager.getDataset();

log("Raw dataset type : "+typeof raw);

log("Raw dataset keys : "+Object.keys(raw).join(","));

const grantha=
window.DGEDatasetAdapter.getDataset(raw);

log("✓ Dataset adapted");

log("Metadata title : "+(grantha.metadata?.title||""));

log("Verse Count : "+grantha.verses.length);

window.DGEGranthaReader.initialize();

/* Temporary compatibility until Reader Build 022 */
window.DGEGranthaReader.load(grantha.verses);

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
