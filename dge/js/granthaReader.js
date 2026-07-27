/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 015
=========================================================
*/

class DGEGranthaReader {

    constructor() {

        this.dataset = [];
        this.currentIndex = 0;
        this.container = null;

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
<div style="padding:40px;text-align:center;font-size:22px;">
No verses available.
</div>`;

            return;

        }

        const verse =
            this.dataset[this.currentIndex];

        this.container.innerHTML = `

<div style="padding:20px;">

<div style="
font-size:28px;
font-weight:bold;
text-align:center;
margin-bottom:8px;">

Digital Grantha Engine

</div>

<div style="
font-size:17px;
text-align:center;
color:#555;
margin-bottom:18px;">

Verse ${this.currentIndex + 1}
/
${this.dataset.length}

</div>

<hr>

<div style="
font-size:31px;
line-height:1.9;
text-align:center;
margin-top:22px;
margin-bottom:30px;">

${verse.sanskrit || ""}

</div>

<div style="
font-size:20px;
line-height:1.8;
margin-bottom:24px;">

${verse.transliteration || ""}

</div>

<div style="
font-size:19px;
line-height:1.9;">

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
