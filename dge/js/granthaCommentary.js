/*
=========================================================
Digital Grantha Engine
Grantha Commentary
Build 016
=========================================================
*/

class DGEGranthaCommentary {

    constructor() {

        this.dataset = [];

        this.enabled = {};

    }

    initialize(dataset) {

        this.dataset = dataset || [];

    }

    getNames(index) {

        if (!this.dataset[index])
            return [];

        const commentary =
            this.dataset[index].commentary || {};

        return Object.keys(commentary);

    }

    get(index, name) {

        if (!this.dataset[index])
            return "";

        const commentary =
            this.dataset[index].commentary || {};

        return commentary[name] || "";

    }

    enable(name) {

        this.enabled[name] = true;

    }

    disable(name) {

        delete this.enabled[name];

    }

    isEnabled(name) {

        return !!this.enabled[name];

    }

    enableAll(index) {

        this.getNames(index).forEach(name => {

            this.enabled[name] = true;

        });

    }

    disableAll() {

        this.enabled = {};

    }

    getEnabled(index) {

        const result = [];

        this.getNames(index).forEach(name => {

            if (this.enabled[name]) {

                result.push({

                    name,

                    text: this.get(index, name)

                });

            }

        });

        return result;

    }

}

window.DGEGranthaCommentary =
    new DGEGranthaCommentary();
