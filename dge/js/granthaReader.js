/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 024
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#FB8C00;color:#000;padding:6px;font-family:monospace">granthaReader.js BUILD 024</div>'
);

class DGEGranthaReader {

    constructor() {

        this.dataset = [];
        this.currentIndex = 0;
        this.container = null;

    }

    initialize() {

        this.container = document.getElementById("readerCard");

    }

    load(dataset) {

        this.dataset = dataset || [];
        this.currentIndex = 0;

        this.render();

    }

    render() {

        if (!this.container) return;

        if (!this.dataset.length) {

            this.container.innerHTML =
                "<div style='padding:30px;text-align:center'>No verses available.</div>";

            return;

        }

        const verse = this.dataset[this.currentIndex];

        let commentaryHtml = "";

        if (
            window.DGEGranthaCommentary &&
            typeof window.DGEGranthaCommentary.getEnabled === "function"
        ) {

            const items =
                window.DGEGranthaCommentary.getEnabled(this.currentIndex);

            commentaryHtml = items.map(item => `
<div style="
margin-top:18px;
padding:16px;
border:1px solid #d0d0d0;
border-radius:10px;
background:#fafafa;
">

<div style="
font-weight:bold;
font-size:18px;
margin-bottom:10px;
color:#1565C0;
">
${item.name}
</div>

<div style="
line-height:1.9;
font-size:17px;
white-space:pre-wrap;
">
${item.text}
</div>

</div>
`).join("");

        }

        this.container.innerHTML = `

<div style="padding:20px">

<h2 style="
text-align:center;
margin-bottom:6px;
">
॥ प्रह्लादकृत नृसिंह स्तोत्र ॥
</h2>

<div style="
text-align:center;
color:#666;
margin-bottom:6px;
">
Verse ${this.currentIndex + 1}
</div>

<div style="
text-align:center;
font-size:14px;
color:#888;
margin-bottom:24px;
">
Digitized : ${this.dataset.length} verses
</div>

<div style="
font-size:31px;
line-height:2.0;
text-align:center;
margin-bottom:28px;
">
${verse.sanskrit || ""}
</div>

${verse.transliteration ? `

<div style="
padding:14px;
background:#F3F8FF;
border-left:5px solid #1976D2;
margin-bottom:18px;
">

<div style="font-weight:bold;margin-bottom:8px">
Transliteration
</div>

<div style="line-height:1.8">
${verse.transliteration}
</div>

</div>

` : ""}

${verse.meaning ? `

<div style="
padding:14px;
background:#F5FFF5;
border-left:5px solid #2E7D32;
margin-bottom:18px;
">

<div style="font-weight:bold;margin-bottom:8px">
Meaning
</div>

<div style="line-height:1.8">
${verse.meaning}
</div>

</div>

` : ""}

${commentaryHtml}

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

        this.currentIndex = this.dataset.length - 1;

        this.render();

    }

}

window.DGEGranthaReader = new DGEGranthaReader();
