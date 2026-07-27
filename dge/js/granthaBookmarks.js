/*
=========================================================
Digital Grantha Engine
Grantha Bookmarks
Build 001
Migrated from PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaBookmarks {

    constructor() {

        this.storageKey = "dge_bookmarks";

        this.data = {};

    }

    initialize(storageKey) {

        if (storageKey) {

            this.storageKey = storageKey;

        }

        try {

            this.data = JSON.parse(

                localStorage.getItem(this.storageKey)

                || "{}"

            );

        }

        catch {

            this.data = {};

        }

    }

    save() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.data)

        );

    }

    getMark(verseNumber) {

        return this.data[verseNumber] || "none";

    }

    setFavorite(verseNumber) {

        this.data[verseNumber] = "fav";

        this.save();

    }

    setPractice(verseNumber) {

        this.data[verseNumber] = "practice";

        this.save();

    }

    clear(verseNumber) {

        delete this.data[verseNumber];

        this.save();

    }

    toggleFavorite(verseNumber) {

        if (

            this.getMark(verseNumber)

            === "fav"

        ) {

            this.clear(verseNumber);

        }

        else {

            this.setFavorite(verseNumber);

        }

    }

    togglePractice(verseNumber) {

        if (

            this.getMark(verseNumber)

            === "practice"

        ) {

            this.clear(verseNumber);

        }

        else {

            this.setPractice(verseNumber);

        }

    }

    isFavorite(verseNumber) {

        return this.getMark(

            verseNumber

        ) === "fav";

    }

    isPractice(verseNumber) {

        return this.getMark(

            verseNumber

        ) === "practice";

    }

    getFavorites() {

        return Object.keys(this.data)

            .filter(

                k => this.data[k] === "fav"

            )

            .map(Number);

    }

    getPracticeList() {

        return Object.keys(this.data)

            .filter(

                k => this.data[k] === "practice"

            )

            .map(Number);

    }

    getFilteredIds(

        total,

        filter

    ) {

        const ids = [];

        for (

            let i = 1;

            i <= total;

            i++

        ) {

            if (

                filter === "fav" &&

                !this.isFavorite(i)

            ) continue;

            if (

                filter === "practice" &&

                !this.isPractice(i)

            ) continue;

            ids.push(i);

        }

        return ids;

    }

}

window.DGEGranthaBookmarks =

    new DGEGranthaBookmarks();
