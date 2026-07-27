/*
=========================================================
Digital Grantha Engine
Grantha Notes
Build 026
=========================================================
*/

class DGEGranthaNotes {

    constructor() {

        this.storageKey = "DGE_NOTES";

        this.notes = this.load();

        this.currentVerse = null;

    }

    load() {

        try {

            return JSON.parse(

                localStorage.getItem(

                    this.storageKey

                )

            ) || {};

        }

        catch (e) {

            return {};

        }

    }

    saveStorage() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.notes)

        );

    }

    open(verseId) {

        this.currentVerse = verseId;

        return this.get(verseId);

    }

    get(verseId) {

        return this.notes[verseId] || "";

    }

    save(text) {

        if (this.currentVerse == null) return;

        text = (text || "").trim();

        if (text) {

            this.notes[this.currentVerse] = text;

        }

        else {

            delete this.notes[this.currentVerse];

        }

        this.saveStorage();

    }

    clear() {

        if (this.currentVerse == null) return;

        delete this.notes[this.currentVerse];

        this.saveStorage();

    }

    has(verseId) {

        return Object.prototype.hasOwnProperty.call(

            this.notes,

            verseId

        );

    }

    openEditor(verseId) {

        this.currentVerse = verseId;

        if (this.onOpenEditor) {

            this.onOpenEditor(

                verseId,

                this.get(verseId)

            );

        }

    }

    saveCurrent(text) {

        this.save(text);

        if (this.onSaved) {

            this.onSaved(

                this.currentVerse,

                text

            );

        }

    }

    clearCurrent() {

        this.clear();

        if (this.onCleared) {

            this.onCleared(

                this.currentVerse

            );

        }

    }

    getAll() {

        return structuredClone(

            this.notes

        );

    }

    count() {

        return Object.keys(

            this.notes

        ).length;

    }

    setOpenEditorListener(callback) {

        this.onOpenEditor = callback;

    }

    setSavedListener(callback) {

        this.onSaved = callback;

    }

    setClearedListener(callback) {

        this.onCleared = callback;

    }

    exportNotes() {

        return JSON.stringify(

            this.notes,

            null,

            2

        );

    }

    importNotes(json) {

        try {

            const data = JSON.parse(json);

            if (

                data &&

                typeof data === "object"

            ) {

                this.notes = data;

                this.saveStorage();

                return true;

            }

        }

        catch (e) {

            console.error(e);

        }

        return false;

    }

    delete(verseId) {

        delete this.notes[verseId];

        this.saveStorage();

    }

    destroy() {

        this.currentVerse = null;

    }

}

window.DGEGranthaNotes =

    new DGEGranthaNotes();










