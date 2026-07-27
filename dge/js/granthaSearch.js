/*
=========================================================
Digital Grantha Engine
Grantha Search
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaSearch {

    constructor() {

        this.dataset = [];

        this.results = [];

    }

    initialize(dataset) {

        this.dataset = dataset || [];

        this.bind();

    }

    bind() {

        const box =
            document.getElementById("searchInput");

        if (!box)
            return;

        box.addEventListener(

            "input",

            (event) => {

                this.search(event.target.value);

            }

        );

    }

    search(text) {

        text = text.trim().toLowerCase();

        this.results = [];

        if (text.length < 2) {

            this.render();

            return;

        }

        this.dataset.forEach(

            (verse, index) => {

                const source = [

                    verse.sanskrit,

                    verse.transliteration,

                    verse.meaning,

                    verse.commentary

                ]

                .join(" ")

                .toLowerCase();

                if (

                    source.includes(text)

                ) {

                    this.results.push({

                        index,

                        verse

                    });

                }

            }

        );

        this.render();

    }

    render() {

        const panel =

            document.getElementById(

                "searchResults"

            );

        if (!panel)
            return;

        if (this.results.length === 0) {

            panel.innerHTML = "";

            return;

        }

        panel.innerHTML = this.results

            .map(

                item =>

                `<div class="searchResult"
                    data-index="${item.index}">
                    Verse ${item.verse.number}
                 </div>`

            )

            .join("");

        panel

        .querySelectorAll(

            ".searchResult"

        )

        .forEach(

            element => {

                element.addEventListener(

                    "click",

                    () => {

                        GranthaReader.render(

                            Number(

                                element.dataset.index

                            )

                        );

                    }

                );

            }

        );

    }

}

window.GranthaSearch =
    new GranthaSearch();
