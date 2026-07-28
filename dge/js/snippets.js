"use strict";

/*=============================================================================
 Digital Grantha Engine
 snippets.js
 Legacy Snippet Manager
 Migrated from functions.js
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Snippets = {

    items: {},
    targetId: null,

    init() {

        this.items = DGE.Storage
            ? DGE.Storage.get("snippets", {})
            : {};

    },

    save() {

        if (DGE.Storage)
            DGE.Storage.set("snippets", this.items);

    },

    saveSnippet() {

        if (!window.activeId) {
            alert("Select a shloka first.");
            return;
        }

        const a = parseFloat(els.loopA.value);
        const b = parseFloat(els.loopB.value);

        if (isNaN(a) || isNaN(b)) {
            alert("Set Start and End times in the A-B Loop first.");
            return;
        }

        if (!this.items[activeId])
            this.items[activeId] = [];

        this.items[activeId].push({
            start: a,
            end: b
        });

        this.save();

        if (typeof renderList === "function")
            renderList();

    },

    openSnippetModal(id, e) {

        if (e && e.stopPropagation)
            e.stopPropagation();

        this.targetId = id;

        document.getElementById("snipShlokaNum").innerText = id;

        const container =
            document.getElementById("snippetListContainer");

        container.innerHTML = "";

        if (
            this.items[id] &&
            this.items[id].length
        ) {

            this.items[id].forEach((snip, index) => {

                container.innerHTML += `
<div class="snip-list-item">
<div>
<strong>Loop ${index + 1}:</strong>
${snip.start}s to ${snip.end}s
</div>
<div>
<button class="btn-sm"
style="color:var(--accent-red);margin-right:4px;"
onclick="playSnippet(${id},${snip.start},${snip.end})">
▶ Play
</button>

<button class="btn-sm"
onclick="deleteSnippet(${id},${index})">
🗑
</button>
</div>
</div>`;

            });

        } else {

            container.innerHTML =
                "<p style='font-size:12px;color:#8a7a63;'>No snippets saved.</p>";

        }

        openModal("snippetModal");

    },

    closeSnippetModal() {

        closeModal("snippetModal");

    },

    playSnippet(id, start, end) {

        this.closeSnippetModal();

        if (window.activeId !== id)
            playShloka(id);

        els.loopA.value = start;
        els.loopB.value = end;
        els.enableAB.checked =
