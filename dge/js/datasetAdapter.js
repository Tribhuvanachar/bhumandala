/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Build 013
=========================================================
*/

class DGEDatasetAdapter {

    load(raw) {

        let root = raw;

        /*
         * Your data.json is in the form:
         *
         * {
         *   metadata:{...},
         *   shlokas:{...}
         * }
         */

        if (Array.isArray(raw)) {

            root = raw[0];

        }

        if (!root) {

            return [];

        }

        if (!root.shlokas) {

            return [];

        }

        const verses = [];

        const keys = Object.keys(root.shlokas)
            .sort((a, b) => Number(a) - Number(b));

        for (const key of keys) {

            const s = root.shlokas[key];

            verses.push({

                id: Number(key),

                number: Number(key),

                sanskrit:
                    s.sanskrit ??
                    s.devanagari ??
                    s.text ??
                    "",

                transliteration:
                    s.transliteration ??
                    s.itrans ??
                    "",

                meaning:
                    s.meaning ??
                    s.translation ??
                    "",

                commentary:
                    s.commentary ??
                    "",

                audio:
                    s.audio ??
                    "",

                raw: s

            });

        }

        return verses;

    }

}

window.DGEDatasetAdapter =
    new DGEDatasetAdapter();
