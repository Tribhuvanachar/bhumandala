/*
=========================================================
Digital Grantha Engine
Grantha Bookmarks
Build 022
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#C2185B;color:#fff;padding:6px;font-family:monospace">granthaBookmarks.js BUILD 022</div>'
);

class DGEGranthaBookmarks {

    constructor(){

        this.key="DGE_BOOKMARKS";

    }

    load(){

        try{

            return JSON.parse(
                localStorage.getItem(this.key)
            )||[];

        }catch(e){

            return [];

        }

    }

    save(bookmarks){

        localStorage.setItem(
            this.key,
            JSON.stringify(bookmarks)
        );

    }

    add(id){

        const bookmarks=this.load();

        if(!bookmarks.includes(id)){

            bookmarks.push(id);

            this.save(bookmarks);

        }

    }

    remove(id){

        this.save(

            this.load().filter(x=>x!==id)

        );

    }

    has(id){

        return this.load().includes(id);

    }

}

window.DGEGranthaBookmarks=
new DGEGranthaBookmarks();
