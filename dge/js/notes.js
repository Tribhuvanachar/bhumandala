/*
=========================================================
Digital Grantha Engine
notes.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const NotesEngine = {

    STORAGE_KEY: "notes",

    notes: {},

    init() {

        this.notes = CacheEngine.get(this.STORAGE_KEY, {});

        DGE.log("Notes Loaded");

    },

    key(granthaId, verseNo) {

        return granthaId + ":" + verseNo;

    },

    save() {

        CacheEngine.set(

            this.STORAGE_KEY,

            this.notes

        );

    },

    get(granthaId, verseNo) {

        return this.notes[

            this.key(granthaId, verseNo)

        ] || "";

    },

    set(granthaId, verseNo, text) {

        this.notes[

            this.key(granthaId, verseNo)

        ] = {

            text,

            modified: Date.now()

        };

        this.save();

        DGE.log("Note Saved");

    },

    remove(granthaId, verseNo) {

        delete this.notes[

            this.key(granthaId, verseNo)

        ];

        this.save();

        DGE.log("Note Removed");

    },

    has(granthaId, verseNo) {

        return this.notes.hasOwnProperty(

            this.key(granthaId, verseNo)

        );

    },

    all() {

        return this.notes;

    },

    clear() {

        this.notes = {};

        this.save();

        DGE.log("All Notes Cleared");

    },

    search(query) {

        query = query.toLowerCase();

        let result = [];

        Object.keys(this.notes)

        .forEach(key => {

            const note = this.notes[key];

            if (

                note.text

                .toLowerCase()

                .includes(query)

            ) {

                result.push({

                    key,

                    note

                });

            }

        });

        return result;

    },

    export() {

        return JSON.stringify(

            this.notes,

            null,

            2

        );

    },

    import(json) {

        try {

            this.notes = JSON.parse(json);

            this.save();

            DGE.log("Notes Imported");

        }

        catch(e){

            DGE.log("Invalid Notes File");

        }

    }

};

window.NotesEngine = NotesEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        NotesEngine.init();

    }

);

})();
