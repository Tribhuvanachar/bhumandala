"use strict";

/*=============================================================================
 Digital Grantha Engine
 filter.js
 Legacy Filter Manager
 Migrated from functions.js
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Filter = {

    current: "none",

    getFilteredIds() {

        if (!window.stotraData)
            return [];

        const ids = [];

        const total =
            stotraData.metadata.totalShlokas || 43;

        const rs = parseInt(
            document.getElementById("rangeStart").value,
            10
        );

        const re = parseInt(
            document.getElementById("rangeEnd").value,
            10
        );

        const rm =
            document.getElementById("rangeMode").value;

        const hasRange =
            !isNaN(rs) &&
            !isNaN(re) &&
            rs <= re;

        for (let i = 1; i <= total; i++) {

            if (
                this.current === "fav" &&
                marks[i] !== "fav"
            )
                continue;

            if (
                this.current === "practice" &&
                marks[i] !== "practice"
            )
                continue;

            if (hasRange) {

                const inRange =
                    i >= rs &&
                    i <= re;

                if (
                    (rm === "include" && !inRange) ||
                    (rm === "exclude" && inRange)
                )
                    continue;

            }

            ids.push(i);

        }

        return ids;

    },

    clearRange() {

        document.getElementById("rangeStart").value = "";
        document.getElementById("rangeEnd").value = "";

        this.applyRangeFilter();

    },

    setFilter(type) {

        this.current = type;

        window.currentFilter = type;

        document
            .getElementById("filterPopup")
            .classList
            .remove("show");

        document
            .querySelectorAll(
                "#filterPopup .pop-item"
            )
            .forEach(el => el.classList.remove("active"));

        const opt =
            document.getElementById(
                `opt-${type}`
            );

        if (opt)
            opt.classList.add("active");

        if (typeof renderList === "function")
            renderList();

        if (type !== "none") {

            const ids =
                this.getFilteredIds();

            if (ids.length) {

                playShloka(ids[0]);

            } else {

                currentAudio.pause();

                activeId = null;

                isPlaying = false;

                updatePlayUI();

            }

        }

    },

    applyRangeFilter() {

        if (typeof renderList === "function")
            renderList();

        const ids =
            this.getFilteredIds();

        if (
            ids.length &&
            this.current !== "none"
        ) {

            playShloka(ids[0]);

        }

    }

};

DGE.Filter = Filter;

/* ------------------------------------------------------------------
   Legacy Compatibility
------------------------------------------------------------------ */

window.getFilteredIds = () =>
    DGE.Filter.getFilteredIds();

window.clearRange = () =>
    DGE.Filter.clearRange();

window.setFilter = type =>
    DGE.Filter.setFilter(type);

window.applyRangeFilter = () =>
    DGE.Filter.applyRangeFilter();

})();
