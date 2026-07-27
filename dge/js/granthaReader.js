/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 023
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#FB8C00;color:#000;padding:6px;font-family:monospace">granthaReader.js BUILD 023</div>'
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
<div style="margin-top:16px;padding:14px;border:1px solid #bbb;border-radius:8px;background:#fafafa">
    <div style="font-weight:bold;margin-bottom:8px">
        ${item.name}
    </div>
    <div style="line-height:1.8">
        ${item.text}
    </div>
</div>
`).join("");

        }

        this.container.innerHTML = `

<div style="padding:20px">

<div style="
font-size:28px;
font-weight:bold;
text-align:center;
margin-bottom:12px;">
श्लोक ${verse.number}
</div>

<div style="
font-size:17px;
text-align:center;
color:#666;
margin-bottom:20px;">
Verse ${this.currentIndex + 1} / ${this.dataset.length}
</div>

<div style="
font-size:32px;
line-height:2.0;
text-align:center;
margin-bottom:24px;">
${verse.sanskrit || ""}
</div>

${verse.transliteration ? `
<div style="
margin-top:20px;
padding:12px;
border-left:4px solid #1976D2;
background:#F5F9FF;
">
<b>Transliteration</b><br><br>
${verse.transliteration}
</div>
` : ""}

${verse.meaning ? `
<div style="
margin-top:18px;
padding:12px;
border-left:4px solid #388E3C;
background:#F6FFF6;
">
<b>Meaning</b><br><br>
${verse.meaning}
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
