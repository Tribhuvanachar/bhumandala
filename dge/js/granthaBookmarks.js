/*
=========================================================
Digital Grantha Engine
Grantha Bookmarks
Build 024
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#C2185B;color:#fff;padding:6px;font-family:monospace">granthaBookmarks.js BUILD 024</div>'
);

class DGEGranthaBookmarks {

    constructor(){

        this.key="DGE_BOOKMARKS";

    }

    getAll(){

        try{

            return JSON.parse(
                localStorage.getItem(this.key)
            ) || [];

        }catch(e){

            return [];

        }

    }

    saveAll(list){

        localStorage.setItem(
            this.key,
            JSON.stringify(list)
        );

    }

    has(id){

        return this.getAll().includes(id);

    }

    add(id){

        const list=this.getAll();

        if(!list.includes(id)){

            list.push(id);

            this.saveAll(list);

        }

    }

    remove(id){

        this.saveAll(
            this.getAll().filter(x=>x!==id)
        );

    }

    toggle(id){

        if(this.has(id)){

            this.remove(id);

            return false;

        }

        this.add(id);

        return true;

    }

    count(){

        return this.getAll().length;

    }

    clear(){

        localStorage.removeItem(this.key);

    }

}

window.DGEGranthaBookmarks =
new DGEGranthaBookmarks();
