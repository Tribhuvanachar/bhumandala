/*
=========================================================
Digital Grantha Engine
Grantha Search
Build 024
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#455A64;color:#fff;padding:6px;font-family:monospace">granthaSearch.js BUILD 024</div>'
);

class DGEGranthaSearch{

    constructor(){

        this.reader=null;
        this.dataset=[];

    }

    initialize(reader,dataset){

        this.reader=reader;
        this.dataset=dataset||[];

        const input=document.getElementById("searchInput");

        if(!input) return;

        input.addEventListener(
            "input",
            ()=>this.search(input.value)
        );

    }

    search(text){

        text=(text||"").trim().toLowerCase();

        if(!text) return;

        const index=this.dataset.findIndex(v=>{

            return (

                (v.sanskrit||"").toLowerCase().includes(text)||

                (v.transliteration||"").toLowerCase().includes(text)||

                (v.meaning||"").toLowerCase().includes(text)

            );

        });

        if(index<0) return;

        this.reader.currentIndex=index;

        if(window.DGEGranthaCommentary){

            window.DGEGranthaCommentary.disableAll();

            window.DGEGranthaCommentary.enableAll(index);

        }

        this.reader.render();

    }

}

window.DGEGranthaSearch=
new DGEGranthaSearch();
