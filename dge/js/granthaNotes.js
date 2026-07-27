/*
=========================================================
Digital Grantha Engine
Grantha Notes
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaNotes {

    constructor() {

        this.storageKey = "dge_notes";

        this.notes = {};

    }

    initialize() {

        this.load();

    }

    load() {

        const saved = localStorage.getItem(this.storageKey);

        if (saved) {

            this.notes = JSON.parse(saved);

        }

    }

    save() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.notes)

        );

    }

    set(verseId, text) {

        this.notes[verseId] = text;

        this.save();

    }

    get(verseId) {

        return this.notes[verseId] || "";

    }

    remove(verseId) {

        delete this.notes[verseId];

        this.save();

    }

    has(verseId) {

        return verseId in this.notes;

    }

    clear() {

        this.notes = {};

        this.save();

    }

    export() {

        return JSON.stringify(

            this.notes,

            null,

            2

        );

    }

}

window.GranthaNotes =
    new GranthaNotes();
