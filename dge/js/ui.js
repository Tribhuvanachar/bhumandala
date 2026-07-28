"use strict";

/*=============================================================================
 Digital Grantha Engine
 UI Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const UI={

    elements:{},

    init(){

        this.cache();

        this.bind();

        return this;

    },

    cache(){

        this.elements.app=
            document.getElementById("app");

        this.elements.search=
            document.getElementById("search");

        this.elements.content=
            document.getElementById("content");

        this.elements.navigation=
            document.getElementById("navigation");

        this.elements.commentary=
            document.getElementById("commentary");

        this.elements.status=
            document.getElementById("status");

    },

    bind(){

        DGE.on(

            "search",

            query=>{

                if(this.elements.search)

                    this.elements.search.value=query;

            }

        );

    },

    show(id){

        const el=document.getElementById(id);

        if(el)

            el.hidden=false;

    },

    hide(id){

        const el=document.getElementById(id);

        if(el)

            el.hidden=true;

    },

    toggle(id){

        const el=document.getElementById(id);

        if(!el)
            return;

        el.hidden=!el.hidden;

    },

    html(id,html){

        const el=document.getElementById(id);

        if(el)

            el.innerHTML=html;

    },

    text(id,text){

        const el=document.getElementById(id);

        if(el)

            el.textContent=text;

    },

    append(id,node){

        const el=document.getElementById(id);

        if(el)

            el.appendChild(node);

    },

    empty(id){

        const el=document.getElementById(id);

        if(el)

            el.replaceChildren();

    },

    status(message=""){

        if(this.elements.status)

            this.elements.status.textContent=message;

    },

    loading(state=true){

        document.body.classList.toggle(

            "loading",

            state

        );

    },

    refresh(){

        DGE.emit(

            "ui:refresh"

        );

    },

    destroy(){

        this.elements={};

    }

};

DGE.UI=UI;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        UI.init();

    }

);

})();


  
















  











  
