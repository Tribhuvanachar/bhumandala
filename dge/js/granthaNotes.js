/*
=========================================================
Digital Grantha Engine
Grantha Notes
Build 023
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#009688;color:#fff;padding:6px;font-family:monospace">granthaNotes.js BUILD 023</div>'
);

class DGEGranthaNotes {

    constructor(){

        this.prefix = "DGE_NOTE_";

    }

    get(id){

        return localStorage.getItem(
            this.prefix + id
        ) || "";

    }

    save(id,text){

        localStorage.setItem(
            this.prefix + id,
            text
        );

    }

    clear(id){

        localStorage.removeItem(
            this.prefix + id
        );

    }

    has(id){

        return this.get(id).trim().length > 0;

    }

    export(){

        const notes={};

        for(let i=0;i<localStorage.length;i++){

            const key=localStorage.key(i);

            if(key.startsWith(this.prefix)){

                notes[key.substring(this.prefix.length)]=
                    localStorage.getItem(key);

            }

        }

        return notes;

    }

    import(notes){

        if(!notes) return;

        Object.keys(notes).forEach(id=>{

            this.save(id,notes[id]);

        });

    }

}

window.DGEGranthaNotes =
    new DGEGranthaNotes();
