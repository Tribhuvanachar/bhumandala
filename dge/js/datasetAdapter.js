/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Build 021
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#fbc02d;color:#000;padding:6px;font-family:monospace">datasetAdapter.js BUILD 021</div>'
);

class DGEDatasetAdapter {

    load(raw) {

        if (!raw) {

            return {

                metadata:{},

                verses:[]

            };

        }

        const verses=[];

        const shlokas=raw.shlokas||{};

        const keys=Object.keys(shlokas)
            .sort((a,b)=>Number(a)-Number(b));

        for(const key of keys){

            const s=shlokas[key];

            verses.push({

                id:Number(key),

                number:Number(key),

                sanskrit:s.sa||"",

                transliteration:s.itrans||"",

                meaning:s.en||"",

                commentary:s.commentaries||{},

                raw:s

            });

        }

        return{

            metadata:raw.metadata||{},

            verses:verses

        };

    }

    getDataset(raw){

        return this.load(raw);

    }

}

window.DGEDatasetAdapter=
new DGEDatasetAdapter();
