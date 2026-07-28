/*
=========================================================
Digital Grantha Engine
Grantha Snippets
Build 001
Mechanically migrated from
PrahladaKrutaNarasimhaStotra.html
=========================================================
*/

class DGEGranthaSnippets {

    constructor() {

        this.storageKey = "dge_snippets";

        this.snippets = {};

        this.targetSnipId = null;

    }

    initialize(storageKey) {

        if (storageKey) {

            this.storageKey = storageKey;

        }

        try {

            this.snippets = JSON.parse(

                localStorage.getItem(this.storageKey)

                || "{}"

            );

        }

        catch {

            this.snippets = {};

        }

    }

    saveStorage() {

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.snippets)

        );

    }

    saveSnippet() {

        if (!DGEGranthaAudio.activeId) {

            return alert("Select a shloka first.");

        }

        const a = parseFloat(
            DGEGranthaAudio.els.loopA.value
        );

        const b = parseFloat(
            DGEGranthaAudio.els.loopB.value
        );

        if (

            isNaN(a)

            ||

            isNaN(b)

        ) {

            return alert(

                "Set Start and End times in the A-B Loop first."

            );

        }

        if (

            !this.snippets[DGEGranthaAudio.activeId]

        ) {

            this.snippets[
                DGEGranthaAudio.activeId
            ] = [];

        }

        this.snippets[
            DGEGranthaAudio.activeId
        ].push({

            start: a,

            end: b

        });

        this.saveStorage();

        DGEGranthaReader.renderList();

    }

    openSnippetModal(id, e) {

        e.stopPropagation();

        this.targetSnipId = id;

        document.getElementById(
            "snipShlokaNum"
        ).innerText = id;

        const container =

            document.getElementById(
                "snippetListContainer"
            );

        container.innerHTML = "";

        if (

            this.snippets[id]

            &&

            this.snippets[id].length > 0

        ) {

            this.snippets[id].forEach(

                (snip, index) => {

                    container.innerHTML += `

<div class="snip-list-item">

<div>

<strong>Loop ${index + 1}:</strong>

${snip.start}s to ${snip.end}s

</div>

<div>

<button class="btn-sm"
style="color:var(--accent-red);margin-right:4px;"
onclick="DGEGranthaSnippets.playSnippet(${id},${snip.start},${snip.end})">

▶ Play

</button>

<button class="btn-sm"
onclick="DGEGranthaSnippets.deleteSnippet(${id},${index})">

🗑

</button>

</div>

</div>`;

                }

            );

        }

        else {

            container.innerHTML =

                "<p style='font-size:12px; color:#8a7a63;'>No snippets saved.</p>";

        }

        openModal("snippetModal");

    }

    closeSnippetModal() {

        closeModal("snippetModal");

    }

    playSnippet(

        id,

        start,

        end

    ) {

        this.closeSnippetModal();

        if (

            DGEGranthaAudio.activeId !== id

        ) {

            DGEGranthaAudio.playShloka(id);

        }

        DGEGranthaAudio.els.loopA.value = start;

        DGEGranthaAudio.els.loopB.value = end;

        DGEGranthaAudio.els.enableAB.checked = true;

        DGEGranthaAudio.audio.currentTime = start;

        DGEGranthaAudio.audio.play();

    }

    deleteSnippet(

        id,

        index

    ) {

        this.snippets[id].splice(

            index,

            1

        );

        if (

            this.snippets[id].length === 0

        ) {

            delete this.snippets[id];

        }

        this.saveStorage();

        DGEGranthaReader.renderList();

        this.openSnippetModal(

            id,

            {

                stopPropagation() {}

            }

        );

    }

}

window.DGEGranthaSnippets =

    new DGEGranthaSnippets();

/*
END OF FILE
*/
