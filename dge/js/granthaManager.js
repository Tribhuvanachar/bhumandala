/*
=========================================================
Digital Grantha Engine
Grantha Manager
Build 010
=========================================================
*/

class DGEGranthaManager {

    constructor() {

        this.dataset = [];
        this.title = "Digital Grantha Engine";

    }

    async start() {

        this.title = "Digital Grantha Engine";

        this.dataset = [];

        try {

            const response = await fetch("data/pns/data.json");

            this.dataset = await response.json();

            return true;

        }
        catch (e) {

            console.error(e);

            throw e;

        }

    }

    getDataset() {

        return this.dataset;

    }

    getTitle() {

        return this.title;

    }

}

window.DGEGranthaManager = new DGEGranthaManager();
