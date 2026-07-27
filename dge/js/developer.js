/*
=========================================================
Digital Grantha Engine
developer.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const DeveloperEngine = {

    enabled: true,

    startTime: performance.now(),

    logs: [],

    init() {

        DGE.log("Developer Engine Ready");

    },

    log(message) {

        const item = {

            time: new Date().toISOString(),

            message

        };

        this.logs.push(item);

    },

    statistics() {

        return {

            version: VersionEngine.about(),

            dataset: DatasetEngine.statistics(),

            plugins: PluginManager.info(),

            bookmarks:

                BookmarkEngine.all().length,

            notes:

                Object.keys(

                    NotesEngine.all()

                ).length,

            history:

                AIEngine.historyCount(),

            uptime:

                this.uptime()

        };

    },

    uptime() {

        return (

            performance.now() -

            this.startTime

        ) / 1000;

    },

    inspect() {

        console.table(

            this.statistics()

        );

    },

    memory() {

        if (

            performance.memory

        ) {

            return {

                limit:

                    performance.memory

                    .jsHeapSizeLimit,

                total:

                    performance.memory

                    .totalJSHeapSize,

                used:

                    performance.memory

                    .usedJSHeapSize

            };

        }

        return null;

    },

    cache() {

        return {

            version:

                CacheEngine.version,

            settings:

                SettingsEngine.values

        };

    },

    clearLogs() {

        this.logs = [];

    },

    exportLogs() {

        Utils.download(

            "dge-log.json",

            JSON.stringify(

                this.logs,

                null,

                2

            ),

            "application/json"

        );

    },

    dump() {

        return {

            statistics:

                this.statistics(),

            cache:

                this.cache(),

            memory:

                this.memory(),

            plugins:

                PluginManager.info(),

            logs:

                this.logs

        };

    },

    benchmark(callback) {

        const start =

            performance.now();

        callback();

        const end =

            performance.now();

        DGE.log(

            "Benchmark : " +

            (end-start).toFixed(2) +

            " ms"

        );

    }

};

window.DeveloperEngine = DeveloperEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        DeveloperEngine.init();

    }

);

})();
