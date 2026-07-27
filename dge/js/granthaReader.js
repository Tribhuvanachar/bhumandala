/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 013
=========================================================
*/

class DGEGranthaReader {

    constructor() {

        this.dataset = [];
        this.currentIndex = 0;

    }

    initialize() {

        this.container =
            document.getElementById("readerCard");

    }

    load(dataset) {

        this.dataset = dataset || [];

        this.currentIndex = 0;

        this.render();

    }

    render() {

        if (!this.container) return;

        if (this.dataset.length === 0) {

            this.container.innerHTML = `

<div class="dgeEmpty">

No verses available.

</div>

`;

            return;

        }

        const verse =
            this.dataset[this.currentIndex];

        this.container.innerHTML = `

<div class="dgeReader">

<div
style="
font-size:14px;
color:#666;
margin-bottom:10px;">

Verse ${this.currentIndex + 1}
of ${this.dataset.length}

</div>

<div
style="
font-size:30px;
line-height:1.8;
text-align:center;
margin-bottom:24px;">

${verse.sanskrit || ""}

</div>

<div
style="
font-size:19px;
line-height:1.7;
margin-bottom:18px;">

${verse.transliteration || ""}

</div>

<div
style="
font-size:18px;
line-height:1.8;">

${verse.meaning || ""}

</div>

</div>

`;

    }

    first() {

        this.currentIndex = 0;

        this.render();

    }

    previous() {

        if (this.currentIndex > 0) {

            this.currentIndex--;

            this.render();

        }

    }

    next() {

        if (this.currentIndex < this.dataset.length - 1) {

            this.currentIndex++;

            this.render();

        }

    }

    last() {

        this.currentIndex =
            this.dataset.length - 1;

        this.render();

    }

}

window.DGEGranthaReader =
    new DGEGranthaReader();
