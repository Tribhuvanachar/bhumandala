/*
=========================================================
Digital Grantha Engine
Grantha Search
Build 013
=========================================================
*/

class DGEGranthaSearch {

    initialize(dataset) {

        this.dataset = dataset || [];

        this.input =
            document.getElementById("searchInput");

        this.results =
            document.getElementById("searchResults");

        if (!this.input) return;

        this.input.addEventListener(
            "input",
            () => this.search()
        );

    }

    search() {

        const query =
            this.input.value
                .trim()
                .toLowerCase();

        if (!query) {

            this.results.innerHTML = "";

            return;

        }

        const matches =
            this.dataset.filter(v =>

                (v.sanskrit || "")
                    .toLowerCase()
                    .includes(query)

                ||

                (v.transliteration || "")
                    .toLowerCase()
                    .includes(query)

                ||

                (v.meaning || "")
                    .toLowerCase()
                    .includes(query)

            );

        this.results.innerHTML =
            matches
                .slice(0,20)
                .map(v =>

`<div style="padding:8px;border-bottom:1px solid #ddd">

<b>Verse ${v.number}</b>

</div>`

                )
                .join("");

    }

}

window.GranthaSearch =
    new DGEGranthaSearch();
