/*
=========================================================
Digital Grantha Engine
Grantha Notes
Build 022
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#009688;color:#fff;padding:6px;font-family:monospace">granthaNotes.js BUILD 022</div>'
);

class DGEGranthaNotes {

    constructor(){

        this.prefix="DGE_NOTE_";

    }

    get(id){

        return localStorage.getItem(
            this.prefix+id
        ) || "";

    }

    save(id,text){

        localStorage.setItem(

            this.prefix+id,

            text

        );

    }

    clear(id){

        localStorage.removeItem(

            this.prefix+id

        );

    }

}

window.DGEGranthaNotes=
new DGEGranthaNotes();
