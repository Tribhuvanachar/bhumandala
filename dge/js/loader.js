/*
=========================================================
Digital Grantha Engine
loader.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const LoaderEngine = {

    config: null,

    async loadConfig() {

        DGE.log("Loading config.json...");

        const response = await fetch("assets/config.json?v=" + Date.now());

        if (!response.ok)
            throw new Error("Unable to load config.json");

        this.config = await response.json();

        DGE.log("config.json Loaded");

        return this.config;

    },

    async loadDataset() {

        if (!this.config)
            throw new Error("Config not loaded");

        const file = this.config.dataset;

        DGE.log("Loading Dataset : " + file);

        const response = await fetch(file + "?v=" + Date.now());

        if (!response.ok)
            throw new Error("Unable to load dataset");

        const data = await response.json();

        DGE.data = data;

        DGE.log("Dataset Ready");

        SearchEngine.build(data);

        RenderEngine.renderGrantha(data);

        return data;

    },

    async boot() {

        try {

            await this.loadConfig();

            await this.loadDataset();

            SettingsEngine.applyAll();

            DGE.log("Loader Finished");

        }

        catch (e) {

            console.error(e);

            DGE.log(e.message);

        }

    }

};

window.LoaderEngine = LoaderEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        LoaderEngine.boot();

    }

);

})();
