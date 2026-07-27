/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 016
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

        DGEGranthaCommentary.initialize(this.dataset);

        DGEGranthaCommentary.enableAll(0);

        this.render();

    }

    render() {

        if (!this.container) return;

        if (!this.dataset.length) {

            this.container.innerHTML =
                "<h2>No verses available.</h2>";

            return;

        }

        const verse =
            this.dataset[this.currentIndex];

        const commentary =
            DGEGranthaCommentary
                .getEnabled(this.currentIndex);

        let commentaryHtml = "";

        commentary.forEach(item => {

            commentaryHtml += `

<div style="
margin-top:20px;
padding:16px;
border:1px solid #cccccc;
border-radius:8px;
">

<div style="
font-size:20px;
font-weight:bold;
margin-bottom:12px;
color:#003366;">

${item.name}

</div>

<div style="
font-size:18px;
line-height:1.8;
">

${item.text}

</div>

</div>

`;

        });

        this.container.innerHTML = `

<div style="padding:20px;">

<div style="
font-size:28px;
font-weight:bold;
text-align:center;">

Digital Grantha Engine

</div>

<div style="
margin-top:8px;
text-align:center;
font-size:18px;">

Verse ${this.currentIndex + 1}
/
${this.dataset.length}

</div>

<hr>

<div style="
margin-top:24px;
font-size:31px;
line-height:1.9;
text-align:center;">

${verse.sanskrit || ""}

</div>

${commentaryHtml}

</div>

`;

    }

    first() {

        this.currentIndex = 0;

        DGEGranthaCommentary.enableAll(0);

        this.render();

    }

    previous() {

        if (this.currentIndex > 0) {

            this.currentIndex--;

            DGEGranthaCommentary.enableAll(this.currentIndex);

            this.render();

        }

    }

    next() {

        if (this.currentIndex < this.dataset.length - 1) {

            this.currentIndex++;

            DGEGranthaCommentary.enableAll(this.currentIndex);

            this.render();

        }

    }

    last() {

        this.currentIndex =
            this.dataset.length - 1;

        DGEGranthaCommentary.enableAll(this.currentIndex);

        this.render();

    }

}

window.DGEGranthaReader =
    new DGEGranthaReader();
