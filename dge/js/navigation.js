/*
=========================================================
Digital Grantha Engine
navigation.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const NavigationEngine = {

    currentGrantha: "",

    currentVerse: 0,

    totalVerses: 0,

    init() {

        DGE.log("Navigation Engine Ready");

        this.registerKeyboard();

    },

    setDataset(dataset) {

        if (!Array.isArray(dataset))
            return;

        this.totalVerses = dataset.length;

        this.currentVerse = 0;

    },

    current() {

        return this.currentVerse;

    },

    first() {

        this.goTo(0);

    },

    last() {

        this.goTo(this.totalVerses - 1);

    },

    next() {

        if (this.currentVerse < this.totalVerses - 1) {

            this.currentVerse++;

            RenderEngine.goTo(this.currentVerse);

            this.updateURL();

        }

    },

    previous() {

        if (this.currentVerse > 0) {

            this.currentVerse--;

            RenderEngine.goTo(this.currentVerse);

            this.updateURL();

        }

    },

    goTo(index) {

        if (index < 0)
            index = 0;

        if (index >= this.totalVerses)
            index = this.totalVerses - 1;

        this.currentVerse = index;

        RenderEngine.goTo(index);

        this.updateURL();

        DGE.log("Verse : " + (index + 1));

    },

    jump(number) {

        number = parseInt(number);

        if (isNaN(number))
            return;

        this.goTo(number - 1);

    },

    updateURL() {

        try {

            const url = new URL(window.location);

            url.searchParams.set(

                "verse",

                this.currentVerse + 1

            );

            history.replaceState(

                {},

                "",

                url

            );

        }

        catch(e){}

    },

    loadURL() {

        try {

            const params =

                new URLSearchParams(

                    window.location.search

                );

            const verse =

                parseInt(

                    params.get("verse")

                );

            if (!isNaN(verse)) {

                this.goTo(

                    verse - 1

                );

            }

        }

        catch(e){}

    },

    registerKeyboard() {

        document.addEventListener(

            "keydown",

            event => {

                switch(event.key){

                    case "ArrowLeft":

                        this.previous();

                        break;

                    case "ArrowRight":

                        this.next();

                        break;

                    case "Home":

                        this.first();

                        break;

                    case "End":

                        this.last();

                        break;

                }

            }

        );

    }

};

window.NavigationEngine = NavigationEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        NavigationEngine.init();

    }

);

})();
