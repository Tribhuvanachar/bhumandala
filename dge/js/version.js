/*
=========================================================
Digital Grantha Engine
version.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const VersionEngine = {

    ENGINE_NAME: "Digital Grantha Engine",

    VERSION: "10.1.0",

    CHANNEL: "Alpha",

    BUILD: "005",

    RELEASE_DATE: "2026-07-27",

    init() {

        DGE.log(
            this.ENGINE_NAME +
            " " +
            this.VERSION +
            " " +
            this.CHANNEL +
            " Build " +
            this.BUILD
        );

        this.showVersion();

    },

    fullVersion() {

        return (
            this.VERSION +
            "-" +
            this.CHANNEL.toLowerCase() +
            "." +
            this.BUILD
        );

    },

    shortVersion() {

        return (
            this.VERSION +
            " " +
            this.CHANNEL
        );

    },

    showVersion() {

        const ids = [

            "version",

            "dgeVersion",

            "engineVersion"

        ];

        ids.forEach(id => {

            const el =

                document.getElementById(id);

            if (el) {

                el.textContent =

                    this.shortVersion();

            }

        });

    },

    cacheToken() {

        return (

            this.VERSION +

            "." +

            this.BUILD

        );

    },

    async checkForUpdate() {

        try {

            const r = await fetch(

                "version.json?v=" +

                Date.now()

            );

            if (!r.ok)
                return false;

            const remote =

                await r.json();

            if (

                remote.version !==

                this.fullVersion()

            ) {

                DGE.log(

                    "Update Available"

                );

                return true;

            }

            DGE.log(

                "Already Latest"

            );

            return false;

        }

        catch(e){

            DGE.log(

                "Version Check Skipped"

            );

            return false;

        }

    },

    about() {

        return {

            engine:

                this.ENGINE_NAME,

            version:

                this.VERSION,

            channel:

                this.CHANNEL,

            build:

                this.BUILD,

            released:

                this.RELEASE_DATE

        };

    }

};

window.VersionEngine = VersionEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        VersionEngine.init();

    }

);

})();
