/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Version: 10.1.0 Alpha
=========================================================
*/

class DatasetAdapter {

    constructor() {

        this.rawData = [];

        this.dataset = [];

    }

    load(data) {

        this.rawData = data;

        this.dataset = [];

        if (Array.isArray(data)) {

            data.forEach((item, index) => {

                this.dataset.push(

                    this.normalize(item, index)

                );

            });

        }

        return this.dataset;

    }

    normalize(item, index) {

        return {

            id: item.id || index + 1,

            number: item.number || index + 1,

            title: item.title || "",

            sanskrit:
                item.sanskrit ||
                item.text ||
                "",

            transliteration:
                item.transliteration || "",

            meaning:
                item.meaning || "",

            commentary:
                item.commentary || "",

            audio:
                item.audio || "",

            notes:
                item.notes || []

        };

    }

    getVerse(index) {

        return this.dataset[index];

    }

    getAll() {

        return this.dataset;

    }

    count() {

        return this.dataset.length;

    }

}

window.DatasetAdapter =
    new DatasetAdapter();
