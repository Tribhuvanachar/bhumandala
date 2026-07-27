/*
=========================================================
Digital Grantha Engine
bookmarks.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const BookmarkEngine = {

    STORAGE_KEY: "bookmarks",

    bookmarks: [],

    init() {

        this.bookmarks = CacheEngine.get(this.STORAGE_KEY, []);

        DGE.log("Bookmarks Loaded : " + this.bookmarks.length);

    },

    save() {

        CacheEngine.set(this.STORAGE_KEY, this.bookmarks);

    },

    exists(granthaId, verseNo) {

        return this.bookmarks.some(item =>

            item.granthaId === granthaId &&
            item.verseNo === verseNo

        );

    },

    add(granthaId, verseNo, title = "") {

        if (this.exists(granthaId, verseNo))
            return;

        this.bookmarks.push({

            granthaId,

            verseNo,

            title,

            created: Date.now()

        });

        this.save();

        DGE.log("Bookmark Added");

    },

    remove(granthaId, verseNo) {

        this.bookmarks = this.bookmarks.filter(item =>

            !(item.granthaId === granthaId &&
              item.verseNo === verseNo)

        );

        this.save();

        DGE.log("Bookmark Removed");

    },

    toggle(granthaId, verseNo, title = "") {

        if (this.exists(granthaId, verseNo)) {

            this.remove(granthaId, verseNo);

        } else {

            this.add(granthaId, verseNo, title);

        }

    },

    all() {

        return [...this.bookmarks];

    },

    clear() {

        this.bookmarks = [];

        this.save();

        DGE.log("Bookmarks Cleared");

    },

    export() {

        return JSON.stringify(

            this.bookmarks,

            null,

            2

        );

    },

    import(json) {

        try {

            this.bookmarks = JSON.parse(json);

            this.save();

            DGE.log("Bookmarks Imported");

        }

        catch (e) {

            DGE.log("Bookmark Import Failed");

        }

    }

};

window.BookmarkEngine = BookmarkEngine;

document.addEventListener(

    "DOMContentLoaded",

    function () {

        BookmarkEngine.init();

    }

);

})();
