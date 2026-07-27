/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Build 014
=========================================================
*/

class DGEDatasetAdapter {

    load(raw) {

        if (!raw) return [];

        if (!raw.shlokas) return [];

        const verses = [];

        const keys =
            Object.keys(raw.shlokas)
                .sort((a,b)=>Number(a)-Number(b));

        for (const key of keys) {

            const shloka =
                raw.shlokas[key];

            verses.push({

                id:Number(key),

                number:Number(key),

                sanskrit:
                    shloka.sa || "",

                transliteration:
                    shloka.itrans ||
                    shloka.transliteration ||
                    "",

                meaning:
                    shloka.en ||
                    shloka.meaning ||
                    "",

                commentary:
                    shloka.commentaries || {},

                raw:shloka

            });

        }

        return verses;

    }

}

window.DGEDatasetAdapter =
    new DGEDatasetAdapter();
