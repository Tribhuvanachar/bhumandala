/*
=========================================================
Digital Grantha Engine
Dataset Adapter
Build 010
=========================================================
*/

class DGEDatasetAdapter {

    load(raw) {

        if (!Array.isArray(raw)) {

            return [];

        }

        return raw.map((item, index) => ({

            id:
                item.id ?? index + 1,

            number:
                item.number ?? index + 1,

            sanskrit:
                item.sanskrit ??
                item.text ??
                "",

            transliteration:
                item.transliteration ??
                "",

            meaning:
                item.meaning ??
                "",

            commentary:
                item.commentary ??
                "",

            audio:
                item.audio ??
                ""

        }));

    }

}

window.DGEDatasetAdapter =
    new DGEDatasetAdapter();
