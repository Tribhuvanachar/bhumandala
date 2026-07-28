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









    





    
