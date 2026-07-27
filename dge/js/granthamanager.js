/*
=========================================================
Digital Grantha Engine
granthaManager.js
Version: 10.1.0 Alpha 006
=========================================================
*/

(function () {

"use strict";

const GranthaManager = {

    catalog: null,

    currentGrantha: null,

    currentConfig: null,

    currentData: null,

    async initialize() {

        DGE.log("Loading Grantha Catalog...");

        const response = await fetch(

            "data/granthas.json?v=" +

            VersionEngine.cacheToken()

        );

        if (!response.ok)

            throw new Error(

                "Unable to load granthas.json"

            );

        this.catalog =

            await response.json();

        DGE.log(

            "Grantha Catalog Loaded"

        );

        return this.catalog;

    },

    list() {

        if (!this.catalog)

            return [];

        return this.catalog.granthas;

    },

    ids() {

        return this.list().map(

            g => g.id

        );

    },

    get(id) {

        return this.list().find(

            g => g.id === id

        );

    },

    async load(id) {

        const grantha =

            this.get(id);

        if (!grantha)

            throw new Error(

                "Grantha Not Found"

            );

        this.currentGrantha =

            grantha;

        await this.loadConfig(

            grantha.config

        );

        await this.loadData(

            grantha.dataset

        );

        Adapter.load(

            this.currentData

        );

        ReaderEngine.setDataset(

            Adapter.verses

        );

        ReaderEngine.render(0);

        DGE.log(

            "Grantha Loaded : " +

            grantha.title

        );

    },

    async loadConfig(path) {

        const response = await fetch(

            path +

            "?v=" +

            VersionEngine.cacheToken()

        );

        if (!response.ok)

            throw new Error(

                "Config Missing"

            );

        this.currentConfig =

            await response.json();

    },

    async loadData(path) {

        const response = await fetch(

            path +

            "?v=" +

            VersionEngine.cacheToken()

        );

        if (!response.ok)

            throw new Error(

                "Dataset Missing"

            );

        this.currentData =

            await response.json();

    },

    title() {

        return this.currentConfig ?

        this.currentConfig.title : "";

    },

    verseCount() {

        return Adapter.count();

    },

    statistics() {

        return {

            grantha:

                this.title(),

            verses:

                this.verseCount(),

            id:

                this.currentGrantha ?

                this.currentGrantha.id :

                ""

        };

    }

};

window.GranthaManager =

GranthaManager;

})();
