/*
=========================================================
Digital Grantha Engine
Grantha Reader
Build 017
=========================================================
*/

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
<div style="margin-top:18px;padding:14px;border:1px solid #ccc;border-radius:8px">
<div style="font-weight:bold;margin-bottom:10px">${item.name}</div>
<div>${item.text}</div>
</div>
`).join("");

        }

        this.container.innerHTML = `
<div style="padding:20px">

<h2 style="text-align:center">
Digital Grantha Engine
</h2>

<div style="text-align:center;margin-bottom:20px">
Verse ${this.currentIndex + 1} / ${this.dataset.length}
</div>

<div style="font-size:30px;line-height:1.9;text-align:center">
${verse.sanskrit || ""}
</div>

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
