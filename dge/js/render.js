"use strict";

/*=============================================================================
 Digital Grantha Engine
 Render Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Render={

    root:null,

    currentVerse:null,

    selectors:{

        container:"#granthaContainer",

        title:"#granthaTitle",

        subtitle:"#granthaSubtitle",

        verse:"#verse",

        verseNumber:"#verseNumber",

        navigation:"#navigation",

        search:"#searchResults",

        commentary:"#commentary"

    },

    init(){

        this.root=document.querySelector(
            this.selectors.container
        );

        return this;

    },

    $(selector){

        return document.querySelector(selector);

    },

    clear(selector){

        const node=this.$(selector);

        if(node)
            node.innerHTML="";

    },

    text(selector,value){

        const node=this.$(selector);

        if(node)
            node.textContent=value ?? "";

    },

    html(selector,value){

        const node=this.$(selector);

        if(node)
            node.innerHTML=value ?? "";

    },

    append(selector,node){

        const target=this.$(selector);

        if(target)
            target.appendChild(node);

    },

    show(selector){

        const node=this.$(selector);

        if(node)
            node.style.display="";

    },

    hide(selector){

        const node=this.$(selector);

        if(node)
            node.style.display="none";

    },

    renderGrantha(grantha){

        if(!grantha)
            return;

        this.text(
            this.selectors.title,
            grantha.title
        );

        this.text(
            this.selectors.subtitle,
            grantha.subtitle || ""
        );

    },

    renderVerse(verse){

        if(!verse)
            return;

        this.currentVerse=verse;

        const number=
            verse.number ??
            verse.id ??
            "";

        this.text(
            this.selectors.verseNumber,
            number
        );

        const body=
            verse.text ??
            verse.verse ??
            verse.content ??
            "";

        this.html(
            this.selectors.verse,
            body
        );

        DGE.emit(
            "render:verse",
            verse
        );

    },

    renderNavigation(previous,next){

        const nav=this.$(
            this.selectors.navigation
        );

        if(!nav)
            return;

        nav.innerHTML="";

        const prev=document.createElement("button");

        prev.textContent="◀ Previous";

        prev.disabled=!previous;

        prev.onclick=()=>{

            if(previous)
                this.renderVerse(previous);

        };

        const nextBtn=document.createElement("button");

        nextBtn.textContent="Next ▶";

        nextBtn.disabled=!next;

        nextBtn.onclick=()=>{

            if(next)
                this.renderVerse(next);

        };

        nav.appendChild(prev);

        nav.appendChild(nextBtn);

    },

    renderSearchResults(results){

        const target=this.$(
            this.selectors.search
        );

        if(!target)
            return;

        target.innerHTML="";

        if(!results || results.length===0){

            target.innerHTML=
                "<p>No results found.</p>";

            return;

        }

        results.forEach(result=>{

            const item=document.createElement("div");

            item.className="dge-search-result";

            item.textContent=
                result.number ??
                result.id ??
                "";

            item.onclick=()=>{

                this.renderVerse(result);

            };

            target.appendChild(item);

        });

    },

    renderCommentary(html){

        this.html(
            this.selectors.commentary,
            html
        );

    },

    highlight(text){

        if(!text || !this.currentVerse)
            return;

        const verseNode=this.$(
            this.selectors.verse
        );

        if(!verseNode)
            return;

        const escaped=text.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            "\\$&"
        );

        const regex=new RegExp(
            escaped,
            "gi"
        );

        verseNode.innerHTML=
            verseNode.innerHTML.replace(
                regex,
                match=>
                `<mark>${match}</mark>`
            );

    },

    clearHighlight(){

        if(!this.currentVerse)
            return;

        this.renderVerse(
            this.currentVerse
        );

    },

    renderMetadata(metadata){

        if(!metadata)
            return;

        Object.entries(metadata).forEach(([key,value])=>{

            const element=document.querySelector(
                `[data-meta="${key}"]`
            );

            if(element)
                element.textContent=value ?? "";

        });

    },

    renderError(message){

        this.html(
            this.selectors.verse,
            `<div class="dge-error">${message}</div>`
        );

    },

    renderLoading(message="Loading..."){

        this.html(
            this.selectors.verse,
            `<div class="dge-loading">${message}</div>`
        );

    },

    renderEmpty(){

        this.html(
            this.selectors.verse,
            ""
        );

    },

    scrollToVerse(){

        const node=this.$(
            this.selectors.verse
        );

        if(node){

            node.scrollIntoView({

                behavior:"smooth",

                block:"start"

            });

        }

    },

    refresh(){

        if(this.currentVerse)

            this.renderVerse(
                this.currentVerse
            );

    },

    renderCurrent(){

        this.refresh();

    },

    destroy(){

        this.root=null;

        this.currentVerse=null;

    }

};

DGE.Render=Render;

document.addEventListener(
    "DOMContentLoaded",
    ()=>{

        Render.init();

    }
);

})();

    beginSearch(){

        this.clear(
            this.selectors.search
        );

    },

    endSearch(){

        DGE.emit(
            "render:search-complete"
        );

    },

    updateVerse(id,verse){

        if(!verse)
            return;

        const node=

            document.querySelector(

                `[data-verse="${id}"]`

            ) ||

            document.getElementById(

                "verse-"+id

            );

        if(!node)
            return;

        if(verse.sa)
            node.innerHTML=verse.sa;
        else if(verse.text)
            node.innerHTML=verse.text;
        else if(verse.verse)
            node.innerHTML=verse.verse;

    },

    getText(id){

        const data=DGE.Data.all();

        if(

            !Array.isArray(data)

        )

            return "";

        const verse=data[id];

        if(!verse)

            return "";

        return (

            verse.sa ??

            verse.sanskrit ??

            verse.text ??

            verse.verse ??

            ""

        );

    },

    renderList(){

        const data=DGE.Data.all();

        if(

            !Array.isArray(data)

        )

            return;

        this.clear(

            this.selectors.container

        );

        data.forEach(

            (verse,index)=>{

                const card=

                    document.createElement(

                        "div"

                    );

                card.className=

                    "dge-verse-card";

                card.id=

                    "verse-"+index;

                card.dataset.verse=

                    index;

                card.innerHTML=

                    this.getText(

                        index

                    );

                this.append(

                    this.selectors.container,

                    card

                );

            }

        );

        DGE.emit(

            "render:list"

        );

    }
    createCommentary(commentaries, query) {

        if (!commentaries)
            return "";

        let html = "";

        Object.entries(commentaries).forEach(

            ([key, value]) => {

                if (!value)
                    return;

                let title = key;

                if (
                    window.stotraData &&
                    stotraData.metadata &&
                    stotraData.metadata.availableCommentaries &&
                    stotraData.metadata.availableCommentaries[key]
                ) {
                    title =
                        stotraData.metadata
                        .availableCommentaries[key];
                }

                if (
                    DGE.Transliteration &&
                    DGE.Transliteration.apply
                ) {
                    title =
                        DGE.Transliteration.apply(title);

                    value =
                        DGE.Transliteration.apply(value);
                }

                if (
                    query &&
                    DGE.Search &&
                    DGE.Search.highlight
                ) {
                    value =
                        DGE.Search.highlight(value);
                }

                html += `
<div class="commentary-block" data-commentary="${key}">
    <div class="commentary-title">${title}</div>
    ${value}
</div>`;
            }

        );

        return html;

    },

    createCard(verse, index) {

        const card =
            document.createElement("div");

        card.className =
            "shloka-card";

        card.id =
            "verse-" + index;

        card.dataset.verse =
            index;

        let body =
            this.getText(index);

        if (
            DGE.Search &&
            DGE.Search.query
        ) {

            body =
                DGE.Search.highlight(body);

        }

        let commentary = "";

        if (verse.commentaries) {

            commentary =
                this.createCommentary(

                    verse.commentaries,

                    DGE.Search
                        ? DGE.Search.query
                        : ""

                );

        }

        card.innerHTML = `
<div class="shloka-main-row">
    <div class="shloka-num">${index}</div>
    <div class="shloka-text">
        ${body}
    </div>
</div>
${commentary}`;

        return card;

    },

    renderCards(data) {

        this.clear(
            this.selectors.container
        );

        data.forEach(

            (verse, index) => {

                if (!verse)
                    return;

                this.append(

                    this.selectors.container,

                    this.createCard(
                        verse,
                        index
                    )

                );

            }

        );

    },

    setCommentaryView(view, element) {

        this.commentaryView =
            view || "all";

        document
            .querySelectorAll(
                "#commentaryPopup .pop-item"
            )
            .forEach(item => {

                item.classList.remove(
                    "active"
                );

            });

        if (element) {

            element.classList.add(
                "active"
            );

        }

        if (
            DGE.Modals &&
            DGE.Modals.togglePopup
        ) {

            DGE.Modals.togglePopup(
                "commentaryPopup"
            );

        }

        this.renderList();

    },

    createCardActions(id) {

        if (
            !window.notes &&
            !window.marks &&
            !window.snippets
        ) {

            return "";

        }

        let markerClass =
            "btn-icon";

        let markerIcon =
            "⋮";

        if (
            window.marks &&
            marks[id] === "fav"
        ) {

            markerClass +=
                " is-fav";

            markerIcon = "★";

        }
        else if (
            window.marks &&
            marks[id] === "practice"
        ) {

            markerClass +=
                " is-practice";

            markerIcon = "🚩";

        }

        const noteClass =

            window.notes &&
            notes[id]

                ? "btn-icon has-note"

                : "btn-icon";

        let badge = "";

        if (

            window.snippets &&
            snippets[id] &&
            snippets[id].length

        ) {

            badge =

                `<div class="snippet-badge">
                    🎯 ${snippets[id].length}
                </div>`;

        }

        return `

<div class="card-actions">

<button
class="${noteClass}"
onclick="openNote(${id})">

📝

</button>

<button
class="${markerClass}"
onclick="openMarkerMenu(event,${id})">

${markerIcon}

</button>

</div>

${badge}

`;

    },

    createMainRow(id, body) {

        return `

<div class="shloka-main-row">

<div class="shloka-num">

${id}

</div>

<div
class="shloka-text"
onclick="playShloka(${id})">

${body}

</div>

${this.createCardActions(id)}

</div>

`;

    },
    renderList() {

        const data = DGE.Data.all();

        if (!Array.isArray(data))
            return;

        const query =
            DGE.Search
                ? DGE.Search.query
                : "";

        const matches =
            DGE.Search
                ? DGE.Search.matches
                : [];

        this.clear(
            this.selectors.container
        );

        data.forEach(

            (verse, index) => {

                if (!verse)
                    return;

                if (
                    matches.length &&
                    !matches.includes(index)
                ) {
                    return;
                }

                const card =
                    this.createCard(
                        verse,
                        index
                    );

                const text =
                    card.querySelector(
                        ".shloka-text"
                    );

                if (
                    text &&
                    query &&
                    DGE.Search &&
                    DGE.Search.highlight
                ) {

                    text.innerHTML =
                        DGE.Search.highlight(
                            text.innerHTML
                        );

                }

                if (
                    this.currentVerse &&
                    (
                        this.currentVerse.id === index ||
                        this.currentVerse.number === index
                    )
                ) {

                    card.classList.add(
                        "active"
                    );

                }

                this.append(
                    this.selectors.container,
                    card
                );

            }

        );

        DGE.emit(

            "render:list",

            {

                total:
                    data.length,

                visible:
                    matches.length
                        ? matches.length
                        : data.length

            }

        );

    },

    refreshList() {

        this.renderList();

    },

    refreshVerse() {

        if (

            this.currentVerse

        ) {

            this.renderVerse(

                this.currentVerse

            );

        }

    },    applyTransliteration(root = this.root) {

        if (
            !root ||
            !DGE.Transliteration ||
            !DGE.Transliteration.apply
        ) {
            return;
        }

        root.querySelectorAll(

            ".shloka-text," +
            ".commentary-block," +
            ".commentary-title"

        ).forEach(node => {

            node.innerHTML =

                DGE.Transliteration.apply(

                    node.innerHTML

                );

        });

    },

    updateActiveVerse(id) {

        document
            .querySelectorAll(
                ".shloka-card.active"
            )
            .forEach(card => {

                card.classList.remove(
                    "active"
                );

            });

        const card =

            document.getElementById(

                "verse-" + id

            );

        if (!card)
            return;

        card.classList.add(
            "active"
        );

        this.currentVerse = {

            id

        };

    },

    scrollToCard(id) {

        const card =

            document.getElementById(

                "verse-" + id

            );

        if (!card)
            return;

        card.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

    },

    renderAndFocus(id) {

        this.updateActiveVerse(id);

        this.scrollToCard(id);

    },

    updateSearchHighlights() {

        if (
            !DGE.Search ||
            !DGE.Search.query
        ) {
            return;
        }

        document
            .querySelectorAll(
                ".shloka-text"
            )
            .forEach(node => {

                node.innerHTML =

                    DGE.Search.highlight(

                        node.innerHTML

                    );

            });

    },

    afterRender() {

        this.applyTransliteration();

        this.updateSearchHighlights();

        DGE.emit(

            "render:complete",

            {

                verse:

                    this.currentVerse

            }

        );

    },

    applyFilters(data) {

        if (!Array.isArray(data))
            return [];

        let list = [...data];

        if (
            DGE.Filter &&
            typeof DGE.Filter.apply === "function"
        ) {

            list = DGE.Filter.apply(
                list
            );

        }

        return list;

    },

    applySearch(data) {

        if (!Array.isArray(data))
            return [];

        if (
            !DGE.Search ||
            !DGE.Search.query
        ) {

            return data;

        }

        if (
            typeof DGE.Search.filter ===
            "function"
        ) {

            return DGE.Search.filter(
                data
            );

        }

        return data;

    },

    applyRange(data) {

        if (
            !Array.isArray(data)
        ) {

            return [];

        }

        if (
            !DGE.Navigation ||
            typeof DGE.Navigation.getRange !==
            "function"
        ) {

            return data;

        }

        const range =
            DGE.Navigation.getRange();

        if (!range)
            return data;

        return data.slice(

            range.start,

            range.end + 1

        );

    },

    prepareData() {

        let data =
            DGE.Data.all();

        data =
            this.applyFilters(
                data
            );

        data =
            this.applySearch(
                data
            );

        data =
            this.applyRange(
                data
            );

        return data;

    },

    renderPreparedList() {

        const data =
            this.prepareData();

        this.renderCards(
            data
        );

        this.afterRender();

        DGE.emit(

            "render:list-ready",

            {

                total:
                    data.length

            }

        );

    },
    renderList() {

        const data =
            this.prepareData();

        this.clear(
            this.selectors.container
        );

        if (!data.length) {

            this.renderEmpty();

            DGE.emit(

                "render:empty"

            );

            return;

        }

        this.renderCards(
            data
        );

        this.afterRender();

        DGE.emit(

            "render:list",

            {

                total:
                    data.length,

                current:
                    this.currentVerse

            }

        );

    },

    rerender() {

        this.renderList();

    },

    invalidate() {

        this.rerender();

    },

    update() {

        this.rerender();

    },

    redraw() {

        this.rerender();

    },

    renderCurrentVerse() {

        if (!this.currentVerse)
            return;

        this.renderVerse(
            this.currentVerse
        );

        this.updateActiveVerse(

            this.currentVerse.id ??
            this.currentVerse.number

        );

    },

    reset() {

        this.currentVerse = null;

        this.clear(
            this.selectors.container
        );

        this.clear(
            this.selectors.search
        );

        this.clear(
            this.selectors.commentary
        );

    },

    ready() {

        DGE.emit(

            "render:ready"

        );

    }












    





    
