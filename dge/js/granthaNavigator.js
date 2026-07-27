/*
=========================================================
Digital Grantha Engine
Grantha Navigator
Build 013
=========================================================
*/

class DGEGranthaNavigator {

    initialize(reader) {

        this.reader = reader;

        this.firstButton =
            document.getElementById("btnFirst");

        this.previousButton =
            document.getElementById("btnPrevious");

        this.nextButton =
            document.getElementById("btnNext");

        this.lastButton =
            document.getElementById("btnLast");

        this.attachEvents();

    }

    attachEvents() {

        this.firstButton?.addEventListener(
            "click",
            () => this.reader.first()
        );

        this.previousButton?.addEventListener(
            "click",
            () => this.reader.previous()
        );

        this.nextButton?.addEventListener(
            "click",
            () => this.reader.next()
        );

        this.lastButton?.addEventListener(
            "click",
            () => this.reader.last()
        );

        document.addEventListener(
            "keydown",
            (event) => {

                switch (event.key) {

                    case "ArrowLeft":

                        this.reader.previous();

                        break;

                    case "ArrowRight":

                        this.reader.next();

                        break;

                    case "Home":

                        this.reader.first();

                        break;

                    case "End":

                        this.reader.last();

                        break;

                }

            }
        );

    }

}

window.DGEGranthaNavigator =
    new DGEGranthaNavigator();
