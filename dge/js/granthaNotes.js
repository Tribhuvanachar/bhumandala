/*
=========================================================
Digital Grantha Engine
Grantha Notes
Build 002
Mechanically migrated from
PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaNotes {

    constructor() {

        this.storageKey = "dge_notes";

        this.notes = {};

        this.targetNoteId = null;

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

    openNoteModal() {

        openModal("noteModal");

    }

    closeNoteModal() {

        closeModal("noteModal");

        document
            .getElementById("noteModalBox")
            .classList
            .remove("fullscreen");

        document
            .getElementById("maxNoteBtn")
            .innerText = "⛶ Expand";

    }

    openNote(id) {

        this.targetNoteId = id;

        document
            .getElementById("noteShlokaNum")
            .innerText = id;

        document
            .getElementById("noteText")
            .value = this.notes[id] || "";

        this.openNoteModal();

    }

    saveNote() {

        const txt =

            document
                .getElementById("noteText")
                .value
                .trim();

        if (txt) {

            this.notes[this.targetNoteId] = txt;

        }

        else {

            delete this.notes[this.targetNoteId];

        }

        this.saveStorage();

        this.closeNoteModal();

        DGEGranthaReader.renderList();

        showToast(

            `Saved notes for Shloka ${this.targetNoteId}!`

        );

    }

    clearNote() {

        if (

            confirm(

                "Are you sure you want to clear all notes for this Shloka?"

            )

        ) {

            document
                .getElementById("noteText")
                .value = "";

        }

    }

    toggleMaximizeNote() {

        const box =

            document.getElementById(

                "noteModalBox"

            );

        const btn =

            document.getElementById(

                "maxNoteBtn"

            );

        box.classList.toggle(

            "fullscreen"

        );

        if (

            box.classList.contains(

                "fullscreen"

            )

        ) {

            btn.innerText =

                "🗗 Minimize";

        }

        else {

            btn.innerText =

                "⛶ Expand";

        }

    }

}

window.DGEGranthaNotes =

    new DGEGranthaNotes();

/*
END OF FILE
*/
