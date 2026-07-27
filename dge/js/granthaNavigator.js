/*
=========================================================
Digital Grantha Engine
Grantha Navigator
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaNavigator {

    initialize(reader) {

        this.reader = reader;

        this.bind();

    }

    bind() {

        this.connect("btnFirst", () => {

            this.reader.first();

        });

        this.connect("btnPrevious", () => {

            this.reader.previous();

        });

        this.connect("btnNext", () => {

            this.reader.next();

        });

        this.connect("btnLast", () => {

            this.reader.last();

        });

    }

    connect(id, action) {

        const button =
            document.getElementById(id);

        if (!button)
            return;

        button.addEventListener(

            "click",

            action

        );

    }

    goto(index) {

        this.reader.render(index);

    }

    next() {

        this.reader.next();

    }

    previous() {

        this.reader.previous();

    }

    first() {

        this.reader.first();

    }

    last() {

        this.reader.last();

    }

}

window.GranthaNavigator =
    new GranthaNavigator();
