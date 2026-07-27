/*
=========================================================
Digital Grantha Engine
Grantha Manager
=========================================================
*/

class DGEGranthaManager {

    constructor() {
        this.version = {};
        this.catalog = {};
        this.current = {};
        this.config = {};
        this.dataset = [];
    }

    async start() {

        await this.loadVersion();
        await this.loadCatalog();
        await this.loadCurrent();
        await this.loadConfig();
        await this.loadDataset();

    }

    async loadVersion() {

        const r = await fetch("version.json");
        this.version = await r.json();

    }

    async loadCatalog() {

        const r = await fetch("data/granthas.json");
        this.catalog = await r.json();

    }

    async loadCurrent() {

        this.current =
            this.catalog.granthas.find(

                g => g.id === this.catalog.defaultGrantha

            );

    }

    async loadConfig() {

        const r =
            await fetch(this.current.config);

        this.config =
            await r.json();

    }

    async loadDataset() {

        const r =
            await fetch(this.current.dataset);

        this.dataset =
            await r.json();

    }

    getTitle() {

        return this.config.title;

    }

    getDataset() {

        return this.dataset;

    }

}

window.DGEGranthaManager =
    new DGEGranthaManager();
