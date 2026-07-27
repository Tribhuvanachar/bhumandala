/*
=========================================================
Digital Grantha Engine
Reading History
Build 001
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#5D4037;color:#fff;padding:6px;font-family:monospace">granthaHistory.js BUILD 001</div>'
);

class DGEGranthaHistory{

    constructor(){

        this.key="DGE_HISTORY";

    }

    visit(id){

        let list=this.get();

        list=list.filter(x=>x!==id);

        list.unshift(id);

        if(list.length>100){

            list=list.slice(0,100);

        }

        localStorage.setItem(
            this.key,
            JSON.stringify(list)
        );

    }

    get(){

        try{

            return JSON.parse(
                localStorage.getItem(this.key)
            )||[];

        }catch(e){

            return [];

        }

    }

    clear(){

        localStorage.removeItem(this.key);

    }

}

window.DGEGranthaHistory=
new DGEGranthaHistory();
