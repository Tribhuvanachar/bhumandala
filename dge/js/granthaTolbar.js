/*
=========================================================
Digital Grantha Engine
Grantha Toolbar
Build 002
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#8E24AA;color:#fff;padding:6px;font-family:monospace">granthaToolbar.js BUILD 002</div>'
);

class DGEGranthaToolbar{

    render(verse){

        const id = verse?.id || verse?.number || 0;

        return `
<div class="dge-toolbar">

<button onclick="DGEGranthaBookmarks.toggle('${id}')">
⭐ Bookmark
</button>

<button onclick="alert('Notes editor coming in next build')">
📝 Notes
</button>

<button onclick="navigator.clipboard.writeText(\`${(verse?.sanskrit||"").replace(/`/g,"\\`")}\`)">
📋 Copy
</button>

<button onclick="
if(navigator.share){
navigator.share({
title:'Digital Grantha Engine',
text:\`${(verse?.sanskrit||"").replace(/`/g,"\\`")}\`
});
}">
🔗 Share
</button>

</div>
`;

    }

}

window.DGEGranthaToolbar =
new DGEGranthaToolbar();
