/*
=========================================================
Digital Grantha Engine
cache.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const CacheEngine = {

    prefix: "DGE_",

    version: "10.1.0-alpha.005",

    makeKey(key) {

        return this.prefix + key;

    },

    set(key, value) {

        try {

            localStorage.setItem(

                this.makeKey(key),

                JSON.stringify(value)

            );

            DGE.log("Cache Saved : " + key);

        }

        catch (e) {

            console.error(e);

        }

    },

    get(key, defaultValue = null) {

        try {

            const value = localStorage.getItem(

                this.makeKey(key)

            );

            if (value === null)

                return defaultValue;

            return JSON.parse(value);

        }

        catch (e) {

            console.error(e);

            return defaultValue;

        }

    },

    remove(key) {

        localStorage.removeItem(

            this.makeKey(key)

        );

    },

    clearAll() {

        Object.keys(localStorage)

            .forEach(key => {

                if (key.startsWith(this.prefix))

                    localStorage.removeItem(key);

            });

        DGE.log("DGE Cache Cleared");

    },

    checkVersion() {

        const stored = this.get("engineVersion");

        if (stored !== this.version) {

            this.clearAll();

            this.set(

                "engineVersion",

                this.version

            );

            DGE.log("Cache Invalidated");

        }

        else {

            DGE.log("Cache OK");

        }

    },

    saveSetting(name, value) {

        this.set(

            "setting_" + name,

            value

        );

    },

    loadSetting(name, defaultValue) {

        return this.get(

            "setting_" + name,

            defaultValue

        );

    }

};

window.CacheEngine = CacheEngine;

document.addEventListener(

    "DOMContentLoaded",

    function () {

        CacheEngine.checkVersion();

    }

);

})();
