/*
=========================================================
Digital Grantha Engine
Grantha Markers
Build 001
Mechanically migrated from
PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaMarkers {

    constructor() {

        this.targetMenuId = null;

        this.storageKey = "dge_marks";

        this.marks = {};

    }

    initialize(storageKey) {

        if (storageKey) {

            this.storageKey = storageKey;

        }

        try {

            this.marks = JSON.parse(

                localStorage.getItem(this.storageKey)

                || "{}"

            );

        }

        catch {

            this.marks = {};

        }

    }

    saveStorage() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.marks)

        );

    }

    togglePopup(id) {

        document
            .querySelectorAll(".popup")
            .forEach(p => {

                if (p.id !== id) {

                    p.classList.remove("show");

                }

            });

        document
            .getElementById(id)
            .classList
            .toggle("show");

    }

    openMarkerMenu(e, id) {

        this.targetMenuId = id;

        const menu = DGE.els.markerMenu;

        menu.classList.add("show");

        const rect = menu.getBoundingClientRect();

        let x = e.clientX - 130;

        let y = e.clientY - 40;

        x = Math.max(

            8,

            Math.min(

                x,

                window.innerWidth - rect.width - 8

            )

        );

        y = Math.max(

            8,

            Math.min(

                y,

                window.innerHeight - rect.height - 8

            )

        );

        menu.style.left = `${x}px`;

        menu.style.top = `${y}px`;

    }

    setMark(type) {

        if (type === "none") {

            delete this.marks[this.targetMenuId];

        }

        else {

            this.marks[this.targetMenuId] = type;

        }

        this.saveStorage();

        DGE.els.markerMenu
            .classList
            .remove("show");

        DGEGranthaReader.renderList();

    }

}

window.DGEGranthaMarkers =

    new DGEGranthaMarkers();

/*
END OF FILE
*/
