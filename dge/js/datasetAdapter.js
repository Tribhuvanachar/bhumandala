/*
=========================================================
Digital Grantha Engine
Dataset Adapter
=========================================================
*/

class DGEDatasetAdapter {

    constructor() {

        this.dataset = [];

    }

    load(rawDataset) {

        this.dataset = [];

        if (!Array.isArray(rawDataset))
            return this.dataset;

        rawDataset.forEach((item, index) => {

            this.dataset.push({

                id: item.id ?? index + 1,

                number: item.number ?? index + 1,

                sanskrit:
                    item.sanskrit ??
                    item.text ??
                    "",

                transliteration:
                    item.transliteration ??
                    "",

                meaning:
                    item.meaning ??
                    "",

                commentary:
                    item.commentary ??
                    "",

                audio:
                    item.audio ??
                    "",

                raw: item

            });

        });

        return this.dataset;

    }

    count() {

        return this.dataset.length;

    }

    verse(index) {

        return this.dataset[index];

    }

    all() {

        return this.dataset;

    }

}

window.DGEDatasetAdapter =
    new DGEDatasetAdapter();
