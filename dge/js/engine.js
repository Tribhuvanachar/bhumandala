/*
 * Digital Grantha Engine
 * Version: 10.1.0 Alpha 004
 */

window.DGE = {

    version: "10.1.0-alpha.004",

    log(message) {

        console.log(message);

        const log = document.getElementById("log");

        if (log) {
            log.textContent += message + "\n";
        }

    },

    async init() {

        this.log("================================");
        this.log("Digital Grantha Engine Started");
        this.log("Version : " + this.version);

        const config = await DGEConfig.load();

        if (config) {
            this.log("✓ Config Loaded");
        } else {
            this.log("✗ Config Missing");
        }

        this.log("================================");
    }

};

document.addEventListener("DOMContentLoaded", () => {
    DGE.init();
});
