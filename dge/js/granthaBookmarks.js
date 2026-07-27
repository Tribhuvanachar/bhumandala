/*
=========================================================
Digital Grantha Engine
Grantha Bookmarks
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaBookmarks {

    constructor() {

        this.storageKey = "dge_bookmarks";

        this.bookmarks = [];

    }

    initialize() {

        this.load();

    }

    load() {

        const saved = localStorage.getItem(this.storageKey);

        if (saved) {

            this.bookmarks = JSON.parse(saved);

        }

    }

    save() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.bookmarks)

        );

    }

    add(verseId) {

        if (!this.bookmarks.includes(verseId)) {

            this.bookmarks.push(verseId);

            this.save();

        }

    }

    remove(verseId) {

        this.bookmarks = this.bookmarks.filter(

            id => id !== verseId

        );

        this.save();

    }

    has(verseId) {

        return this.bookmarks.includes(verseId);

    }

    getAll() {

        return [...this.bookmarks];

    }

    clear() {

        this.bookmarks = [];

        this.save();

    }

}

window.GranthaBookmarks =
    new GranthaBookmarks();
