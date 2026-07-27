/*
=========================================================
Digital Grantha Engine
Grantha Components
Build 001
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#546E7A;color:#fff;padding:6px;font-family:monospace">granthaComponents.js BUILD 001</div>'
);

class DGEGranthaComponents{

    header(title,verse,total,digitized){

        return `
<div class="dge-header">

<h2>${title}</h2>

<div class="dge-progress">

Verse ${verse} / ${total}

</div>

<div>

Digitized : ${digitized} / ${total}

</div>

</div>
`;

    }

    section(title,body){

        return `
<div class="dge-section">

<h3>${title}</h3>

<div>

${body}

</div>

</div>
`;

    }

    card(title,body){

        return `
<div class="dge-card">

<h4>${title}</h4>

<div>

${body}

</div>

</div>
`;

    }

}

window.DGEGranthaComponents=
new DGEGranthaComponents();
