"use strict";

/*=============================================================================
 Digital Grantha Engine
 Bookmark Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Bookmarks={

    storageKey:"DGE_BOOKMARKS",

    items:[],

    init(){

        this.load();

        return this;

    },

    load(){

        try{

            const data=localStorage.getItem(
                this.storageKey
            );

            this.items=data
                ?JSON.parse(data)
                :[];

        }catch(e){

            this.items=[];

        }

    },

    save(){

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.items)

        );

    },

    add(bookmark){

        if(!bookmark)
            return false;

        if(this.exists(bookmark.id))
            return false;

        this.items.push(bookmark);

        this.save();

        DGE.emit(
            "bookmark:add",
            bookmark
        );

        return true;

    },

    remove(id){

        this.items=this.items.filter(

            item=>String(item.id)!==String(id)

        );

        this.save();

        DGE.emit(
            "bookmark:remove",
            id
        );

    },

    exists(id){

        return this.items.some(

            item=>String(item.id)===String(id)

        );

    },

    get(id){

        return this.items.find(

            item=>String(item.id)===String(id)

        ) || null;

    },

    getAll(){

        return [...this.items];

    },

    clear(){

        this.items=[];

        this.save();

        DGE.emit(
            "bookmark:clear"
        );

    },

    count(){

        return this.items.length;

    },

    toggle(bookmark){

        if(this.exists(bookmark.id)){

            this.remove(bookmark.id);

            return false;

        }

        this.add(bookmark);

        return true;

    },

    import(list){

        if(!Array.isArray(list))
            return;

        this.items=[...list];

        this.save();

    },

    export(){

        return JSON.stringify(

            this.items,

            null,

            2

        );

    },
    importJSON(json){

        try{

            const data=JSON.parse(json);

            if(Array.isArray(data)){

                this.items=data;

                this.save();

                return true;

            }

        }catch(e){

            return false;

        }

        return false;

    },

    destroy(){

        this.items=[];

    }

};

DGE.Bookmarks=Bookmarks;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Bookmarks.init();

    }

);

})();











    












    
