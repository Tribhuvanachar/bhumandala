/*
=========================================================
Digital Grantha Engine
Grantha Navigator
Build 025
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#00695C;color:#fff;padding:6px;font-family:monospace">granthaNavigator.js BUILD 025</div>'
);

class DGEGranthaNavigator{

    constructor(){

        this.reader=null;

    }

    initialize(reader){

        this.reader=reader;

        this.bind();

    }

    bind(){

        const map={

            btnFirst:"first",

            btnPrevious:"previous",

            btnNext:"next",

            btnLast:"last"

        };

        Object.keys(map).forEach(id=>{

            const btn=document.getElementById(id);

            if(!btn) return;

            btn.onclick=()=>{

                if(this.reader &&
                    typeof this.reader[map[id]]==="function"){

                    this.reader[map[id]]();

                }

            };

        });

        document.addEventListener("keydown",e=>{

            if(!this.reader) return;

            switch(e.key){

                case "ArrowLeft":

                    this.reader.previous();

                    break;

                case "ArrowRight":

                    this.reader.next();

                    break;

                case "Home":

                    this.reader.first();

                    break;

                case "End":

                    this.reader.last();

                    break;

            }

        });

    }

}

window.DGEGranthaNavigator=
new DGEGranthaNavigator();
