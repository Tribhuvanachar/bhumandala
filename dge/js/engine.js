
/*
 * Digital Grantha Engine
 * Version: 10.1.0 Alpha 003
 */

window.DGE = {
    version: "10.1.0-alpha.003",

    init() {
        console.log("================================");
        console.log("Digital Grantha Engine Started");
        console.log("Version:", this.version);
        console.log("================================");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    DGE.init();
});
