/*
=========================================================
Digital Grantha Engine
Grantha Navigator
=========================================================
*/

class DGEGranthaNavigator {

    initialize(reader) {

        this.reader = reader;

        this.bindButton("btnFirst", () => this.reader.first());
        this.bindButton("btnPrevious", () => this.reader.previous());
        this.bindButton("btnNext", () => this.reader.next());
        this.bindButton("btnLast", () => this.reader.last());

    }

    bindButton(id, action) {

        const button = document.getElementById(id);

        if (!button) return;

        button.onclick = action;

    }

    goto(index) {

        this.reader.show(index);

    }

}

window.DGEGranthaNavigator =
    new DGEGranthaNavigator();
