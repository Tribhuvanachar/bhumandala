/*
=========================================================
Digital Grantha Engine
Grantha Reader
Version: 10.1.0 Alpha
=========================================================
*/

class GranthaReader {

    constructor() {

        this.dataset = [];

        this.currentIndex = 0;

        this.container = null;

    }

    initialize(containerId = "readerCard") {

        this.container =
            document.getElementById(containerId);

    }

    load(dataset) {

        this.dataset = dataset || [];

        this.currentIndex = 0;

        this.render();

    }

    render(index = this.currentIndex) {

        if (!this.container)
            return;

        if (this.dataset.length === 0) {

            this.container.innerHTML =
                "<p>No verses found.</p>";

            return;

        }

        if (index < 0)
            index = 0;

        if (index >= this.dataset.length)
            index = this.dataset.length - 1;

        this.currentIndex = index;

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

${
verse.transliteration
?

`<div class="dgeTransliteration">

${verse.transliteration}

</div>`

:

""

}

${
verse.meaning
?

`<div class="dgeMeaning">

${verse.meaning}

</div>`

:

""

}

</div>

`;

    }

    next() {

        if (
            this.currentIndex <
            this.dataset.length - 1
        ) {

            this.render(

                this.currentIndex + 1

            );

        }

    }

    previous() {

        if (
            this.currentIndex > 0
        ) {

            this.render(

                this.currentIndex - 1

            );

        }

    }

    first() {

        this.render(0);

    }

    last() {

        this.render(

            this.dataset.length - 1

        );

    }

    current() {

        return this.dataset[
            this.currentIndex
        ];

    }

}

window.GranthaReader =
    new GranthaReader();
