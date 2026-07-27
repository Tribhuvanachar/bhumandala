/*
=========================================================
Digital Grantha Engine
Grantha Commentary
Build 017
=========================================================
*/

class DGEGranthaCommentary {

    getEnabled(index, dataset) {

        if (!dataset) return [];

        if (!dataset[index]) return [];

        const verse = dataset[index];

        if (!verse.commentary) return [];

        return Object.entries(verse.commentary).map(([name, text]) => ({

            name,

            text

        }));

    }

}

window.DGEGranthaCommentary =
    new DGEGranthaCommentary();
