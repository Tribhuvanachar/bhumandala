/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Build 020
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#f9a825;color:#000;padding:6px;font-family:monospace">datasetAdapter.js BUILD 020</div>'
);

class DGEDatasetAdapter {

    load(raw) {

        if (!raw || !raw.shlokas)
            return [];

        const verses = [];

        const keys = Object.keys(raw.shlokas)
            .sort((a,b)=>Number(a)-Number(b));

        for(const key of keys){

            const s = raw.shlokas[key];

            verses.push({

                id:Number(key),

                number:Number(key),

                sanskrit:s.sa || "",

                transliteration:s.itrans || "",

                meaning:s.en || "",

                commentary:s.commentaries || {},

                raw:s

            });

        }

        return verses;

    }

    getDataset(raw){

        return this.load(raw);

    }

}

window.DGEDatasetAdapter =
    new DGEDatasetAdapter();
