/*
=========================================================
Digital Grantha Engine
dataset.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const DatasetEngine = {

    dataset: null,

    verses: [],

    granthaName: "",

    chapterCount: 0,

    verseCount: 0,

    async load(path) {

        DGE.log("Loading Dataset...");

        const response = await fetch(

            path + "?v=" + Date.now()

        );

        if (!response.ok)

            throw new Error(

                "Unable to load dataset."

            );

        this.dataset =

            await response.json();

        this.parse();

        DGE.data = this.verses;

        DGE.log(

            "Dataset Ready"

        );

        return this.dataset;

    },

    parse() {

        this.verses = [];

        this.chapterCount = 0;

        this.verseCount = 0;

        if (!this.dataset)
            return;

        if (

            Array.isArray(

                this.dataset

            )

        ) {

            this.verses =

                this.dataset;

        }

        else if (

            this.dataset.verses

        ) {

            this.verses =

                this.dataset.verses;

        }

        else {

            Object.keys(

                this.dataset

            )

            .forEach(key => {

                const item =

                    this.dataset[key];

                if (

                    Array.isArray(item)

                ) {

                    this.verses.push(

                        ...item

                    );

                }

            });

        }

        this.verseCount =

            this.verses.length;

        this.chapterCount =

            1;

        DGE.log(

            "Verses : " +

            this.verseCount

        );

    },

    verse(index) {

        return this.verses[index];

    },

    first() {

        return this.verse(0);

    },

    last() {

        return this.verse(

            this.verseCount - 1

        );

    },

    count() {

        return this.verseCount;

    },

    all() {

        return this.verses;

    },

    search(predicate) {

        return this.verses.filter(

            predicate

        );

    },

    each(callback) {

        this.verses.forEach(

            callback

        );

    },

    findVerse(number) {

        return this.verses.find(

            verse =>

                verse.number ==

                number

        );

    },

    statistics() {

        return {

            verses:

                this.verseCount,

            chapters:

                this.chapterCount

        };

    }

};

window.DatasetEngine = DatasetEngine;

})();
