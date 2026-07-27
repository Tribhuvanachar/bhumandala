/*
=========================================================
Digital Grantha Engine
Grantha Manager
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaManager {

    constructor() {
        this.version = null;
        this.catalog = null;
        this.currentGrantha = null;
        this.currentConfig = null;
        this.currentDataset = null;
    }

    async start() {

        await this.loadVersion();

        await this.loadCatalog();

        await this.loadDefaultGrantha();

        await this.loadConfig();

        await this.loadDataset();

        console.log(
            "Grantha Loaded:",
            this.currentConfig.title
        );

    }

    async loadVersion() {

        const response =
            await fetch("version.json");

        this.version =
            await response.json();

    }

    async loadCatalog() {

        const response =
            await fetch("data/granthas.json");

        this.catalog =
            await response.json();

    }

    async loadDefaultGrantha() {

        const id =
            this.catalog.defaultGrantha;

        this.currentGrantha =
            this.catalog.granthas.find(

                g => g.id === id

            );

    }

    async loadConfig() {

        const response =
            await fetch(

                this.currentGrantha.config

            );

        this.currentConfig =
            await response.json();

    }

    async loadDataset() {

        const response =
            await fetch(

                this.currentGrantha.dataset

            );

        this.currentDataset =
            await response.json();

    }

    getDataset() {

        return this.currentDataset;

    }

    getConfig() {

        return this.currentConfig;

    }

    getTitle() {

        return this.currentConfig.title;

    }

}

window.GranthaManager =
    new GranthaManager();
