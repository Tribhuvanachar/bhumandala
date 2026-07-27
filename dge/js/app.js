/*
=========================================================
Digital Grantha Engine
app.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const AppEngine = {

    version: "10.1.0-alpha.005",

    initialized: false,

    async init() {

        if (this.initialized)
            return;

        DGE.log("================================");
        DGE.log("Starting Digital Grantha Engine");
        DGE.log("================================");

        try {

            VersionEngine.init();

            CacheEngine.checkVersion();

            SettingsEngine.init();

            AudioEngine.init();

            BookmarkEngine.init();

            NotesEngine.init();

            CommentaryEngine.init();

            AIEngine.init();

            NavigationEngine.init();

            await LoaderEngine.boot();

            if (window.DatasetEngine && DGE.data) {

                DatasetEngine.dataset = DGE.data;
                DatasetEngine.parse();

            }

            if (window.SearchEngine && DGE.data) {

                SearchEngine.build(DGE.data);

            }

            if (window.RenderEngine && DGE.data) {

                RenderEngine.renderGrantha(DGE.data);

            }

            EventBus.emit("app.ready");

            this.initialized = true;

            DGE.log("================================");
            DGE.log("DGE Started Successfully");
            DGE.log("================================");

        }

        catch (e) {

            console.error(e);

            DGE.log("Startup Failed");
            DGE.log(e.message);

        }

    },

    restart() {

        this.initialized = false;

        this.init();

    },

    shutdown() {

        EventBus.emit("app.shutdown");

        DGE.log("Application Shutdown");

    },

    about() {

        return {

            engine: "Digital Grantha Engine",

            version: this.version,

            initialized: this.initialized

        };

    }

};

window.AppEngine = AppEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        AppEngine.init();

    }

);

})();
