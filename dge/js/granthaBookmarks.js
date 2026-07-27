/*
=========================================================
Digital Grantha Engine
Grantha Bookmarks
Build 026
=========================================================
*/

class DGEGranthaBookmarks {

    constructor() {

        this.storageKey = "DGE_MARKS";

        this.marks = this.load();

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

    save() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(

                this.marks

            )

        );

    }

    get(verseId) {

        return this.marks[verseId] || "";

    }

    isFavorite(verseId) {

        return this.get(verseId) === "fav";

    }

    isPractice(verseId) {

        return this.get(verseId) === "practice";

    }

    setFavorite(verseId) {

        this.marks[verseId] = "fav";

        this.save();

    }

    setPractice(verseId) {

        this.marks[verseId] = "practice";

        this.save();

    }

    clear(verseId) {

        delete this.marks[verseId];

        this.save();

    }

    toggleFavorite(verseId) {

        if (this.isFavorite(verseId)) {

            this.clear(verseId);

        }

        else {

            this.setFavorite(verseId);

        }

    }

    togglePractice(verseId) {

        if (this.isPractice(verseId)) {

            this.clear(verseId);

        }

        else {

            this.setPractice(verseId);

        }

    }
    setMark(verseId, type) {

        if (

            type === "none" ||

            !type

        ) {

            delete this.marks[verseId];

        }

        else {

            this.marks[verseId] = type;

        }

        this.save();

        if (this.onChanged) {

            this.onChanged(

                verseId,

                this.get(verseId)

            );

        }

    }

    toggle(verseId, type) {

        if (

            this.get(verseId) === type

        ) {

            this.setMark(

                verseId,

                "none"

            );

        }

        else {

            this.setMark(

                verseId,

                type

            );

        }

    }

    getFavoriteVerses() {

        return Object.keys(this.marks)

            .filter(id =>

                this.marks[id] === "fav"

            )

            .map(Number);

    }

    getPracticeVerses() {

        return Object.keys(this.marks)

            .filter(id =>

                this.marks[id] === "practice"

            )

            .map(Number);

    }

    setChangedListener(callback) {

        this.onChanged = callback;

    }
    exportMarks() {

        return JSON.stringify(

            this.marks,

            null,

            2

        );

    }

    importMarks(json) {

        try {

            const data = JSON.parse(json);

            if (

                data &&

                typeof data === "object"

            ) {

                this.marks = data;

                this.save();

                return true;

            }

        }

        catch (e) {

            console.error(e);

        }

        return false;

    }

    count(type = null) {

        if (!type) {

            return Object.keys(

                this.marks

            ).length;

        }

        return Object.values(

            this.marks

        ).filter(v => v === type).length;

    }

    destroy() {

        this.onChanged = null;

    }

}

window.DGEGranthaBookmarks =

    new DGEGranthaBookmarks();






    













