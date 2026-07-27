/*
=========================================================
Digital Grantha Engine
settings.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const SettingsEngine = {

    defaults: {

        theme: "light",

        language: "en",

        transliteration: "devanagari",

        fontSize: 18,

        audioRate: 1.0,

        autoPlay: false,

        lastGrantha: "",

        lastVerse: 0

    },

    values: {},

    init() {

        this.values = {

            ...this.defaults

        };

        this.load();

        DGE.log("Settings Loaded");

    },

    load() {

        Object.keys(this.defaults)

        .forEach(key => {

            this.values[key] =

                CacheEngine.loadSetting(

                    key,

                    this.defaults[key]

                );

        });

    },

    save() {

        Object.keys(this.values)

        .forEach(key => {

            CacheEngine.saveSetting(

                key,

                this.values[key]

            );

        });

    },

    get(name) {

        return this.values[name];

    },

    set(name, value) {

        this.values[name] = value;

        CacheEngine.saveSetting(name, value);

        DGE.log("Setting Updated : " + name);

    },

    reset() {

        this.values = {

            ...this.defaults

        };

        this.save();

        DGE.log("Settings Reset");

    },

    applyTheme() {

        document.body.dataset.theme =

            this.get("theme");

    },

    applyFontSize() {

        document.documentElement.style.fontSize =

            this.get("fontSize") + "px";

    },

    applyAudioRate() {

        if (

            window.AudioEngine &&

            AudioEngine.player

        ) {

            AudioEngine.player.playbackRate =

                this.get("audioRate");

        }

    },

    applyTransliteration() {

        if (window.TransliterationEngine) {

            TransliterationEngine.setMode(

                this.get("transliteration")

            );

        }

    },

    applyAll() {

        this.applyTheme();

        this.applyFontSize();

        this.applyAudioRate();

        this.applyTransliteration();

    }

};

window.SettingsEngine = SettingsEngine;

document.addEventListener(

    "DOMContentLoaded",

    function () {

        SettingsEngine.init();

        SettingsEngine.applyAll();

    }

);

})();
