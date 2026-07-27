/*
=========================================================
Digital Grantha Engine
Grantha Reader
=========================================================
*/

class DGEGranthaReader {

    constructor() {

        this.dataset = [];

        this.index = 0;

        this.container = null;

    }

    initialize() {

        this.container =
            document.getElementById("readerCard");

    }

    load(dataset) {

        this.dataset = dataset || [];

        this.index = 0;

        this.show(0);

    }

    show(index) {

        if (!this.container)
            return;

        if (!this.dataset.length) {

            this.container.innerHTML =
                "<p>No verses found.</p>";

            return;

        }

        if (index < 0)
            index = 0;

        if (index >= this.dataset.length)
            index = this.dataset.length - 1;

        this.index = index;

        const verse =
            this.dataset[index];

        this.container.innerHTML = `

<div class="dgeVerse">

<div class="dgeVerseNumber">

Verse ${verse.number}

</div>

<div class="dgeSanskrit">

${verse.sanskrit}

</div>

<div class="dgeTransliteration">

${verse.transliteration || ""}

</div>

<div class="dgeMeaning">

${verse.meaning || ""}

</div>

</div>

`;

    }

    next() {

        this.show(this.index + 1);

    }

    previous() {

        this.show(this.index - 1);

    }

    first() {

        this.show(0);

    }

    last() {

        this.show(this.dataset.length - 1);

    }

}

window.DGEGranthaReader =
    new DGEGranthaReader();
