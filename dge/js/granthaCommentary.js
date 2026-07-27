/*
=========================================================
Digital Grantha Engine
Grantha Commentary
Build 019
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#7B1FA2;color:white;padding:6px;font-family:monospace">granthaCommentary.js BUILD 019</div>'
);

class DGEGranthaCommentary {

    constructor() {

        this.dataset = [];
        this.enabled = {};

    }

    initialize(dataset) {

        console.log("COMMENTARY INITIALIZE CALLED");

        this.dataset = dataset || [];

    }

    getNames(index) {

        if (!this.dataset[index])
            return [];

        return Object.keys(
            this.dataset[index].commentary || {}
        );

    }

    get(index,name){

        return (
            this.dataset[index]?.commentary?.[name]
            || ""
        );

    }

    enable(name){

        this.enabled[name]=true;

    }

    disable(name){

        delete this.enabled[name];

    }

    isEnabled(name){

        return !!this.enabled[name];

    }

    enableAll(index){

        this.getNames(index).forEach(name=>{

            this.enabled[name]=true;

        });

    }

    disableAll(){

        this.enabled={};

    }

    getEnabled(index){

        return this.getNames(index).map(name=>({

            name,

            text:this.get(index,name)

        }));

    }

}

window.DGEGranthaCommentary =
    new DGEGranthaCommentary();

console.log(
    "COMMENTARY OBJECT =",
    window.DGEGranthaCommentary
);
