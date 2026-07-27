/*
=========================================================
Digital Grantha Engine
Grantha Notes
Build 001
Migrated from PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaNotes {

    constructor() {

        this.storageKey = "dge_notes";

        this.notes = {};

        this.currentVerse = null;

    }

    initialize(storageKey) {

        if (storageKey) {

            this.storageKey = storageKey;

        }

        try {

            this.notes = JSON.parse(

                localStorage.getItem(this.storageKey)

                || "{}"

            );

        }

        catch {

            this.notes = {};

        }

    }

    saveStorage() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.notes)

        );

    }

    has(verse) {

        return !!(

            this.notes[verse]

            &&

            this.notes[verse].trim()

        );

    }

    get(verse) {

        return this.notes[verse] || "";

    }

    set(verse, text) {

        if (

            text

            &&

            text.trim()

        ) {

            this.notes[verse] = text;

        }

        else {

            delete this.notes[verse];

        }

        this.saveStorage();

    }

    append(verse, text) {

        const oldText =

            this.get(verse);

        const newText =

            oldText

            ?

            oldText +

            "\n\n" +

            text

            :

            text;

        this.set(

            verse,

            newText

        );

    }

    clear(verse) {

        delete this.notes[verse];

        this.saveStorage();

    }

    openEditor(verse) {

        this.currentVerse = verse;

        const modal =

            document.getElementById(

                "noteModal"

            );

        if (!modal) return;

        const num =

            document.getElementById(

                "noteShlokaNum"

            );

        const txt =

            document.getElementById(

                "noteText"

            );

        if (num) {

            num.innerText = verse;

        }

        if (txt) {

            txt.value =

                this.get(verse);

        }

        modal.style.display =

            "flex";

        document.body.classList.add(

            "modal-open"

        );

    }

    closeEditor() {

        const modal =

            document.getElementById(

                "noteModal"

            );

        if (modal) {

            modal.style.display =

                "none";

        }

        document.body.classList.remove(

            "modal-open"

        );

    }

    saveCurrent() {

        if (

            this.currentVerse == null

        ) {

            return;

        }

        const txt =

            document.getElementById(

                "noteText"

            );

        if (!txt) return;

        this.set(

            this.currentVerse,

            txt.value

        );

        this.closeEditor();

        if (

            window.DGEGranthaReader

        ) {

            DGEGranthaReader.renderList();

        }

    }

    clearCurrent() {

        if (

            this.currentVerse == null

        ) {

            return;

        }

        this.clear(

            this.currentVerse

        );

        const txt =

            document.getElementById(

                "noteText"

            );

        if (txt) {

            txt.value = "";

        }

        if (

            window.DGEGranthaReader

        ) {

            DGEGranthaReader.renderList();

        }

    }

}

window.DGEGranthaNotes =

    new DGEGranthaNotes();
