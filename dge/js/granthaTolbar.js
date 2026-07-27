/*
=========================================================
Digital Grantha Engine
Grantha Toolbar
Build 001
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#8E24AA;color:#fff;padding:6px;font-family:monospace">granthaToolbar.js BUILD 001</div>'
);

class DGEGranthaToolbar {

    render(verse){

        return `
<div class="dge-toolbar">

<button id="btnBookmark">⭐</button>

<button id="btnNotes">📝</button>

<button id="btnAudio">▶</button>

<button id="btnCopy">📋</button>

<button id="btnShare">🔗</button>

</div>
`;

    }

}

window.DGEGranthaToolbar =
new DGEGranthaToolbar();
