"use strict";

/*=============================================================================
 Digital Grantha Engine
 Commentary Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Commentary={

    items:{},

    current:null,

    init(){

        this.items={};

        return this;

    },

    load(data={}){

        this.items={...data};

        DGE.emit(
            "commentary:load",
            this.items
        );

    },

    get(id){

        return this.items[
            String(id)
        ] ?? null;

    },

    set(id,data){

        this.items[
            String(id)
        ]=data;

        DGE.emit(
            "commentary:set",
            id
        );

    },

    has(id){

        return Object.prototype.hasOwnProperty.call(

            this.items,

            String(id)

        );

    },

    open(id){

        this.current=String(id);

        DGE.emit(

            "commentary:open",

            id

        );

    },

    close(){

        this.current=null;

        DGE.emit(
            "commentary:close"
        );

    },
    currentId(){

        return this.current;

    },

    currentData(){

        if(this.current===null)
            return null;

        return this.get(this.current);

    },

    remove(id){

        delete this.items[
            String(id)
        ];

        if(String(this.current)===String(id))
            this.current=null;

        DGE.emit(
            "commentary:remove",
            id
        );

    },

    clear(){

        this.items={};

        this.current=null;

        DGE.emit(
            "commentary:clear"
        );

    },

    count(){

        return Object.keys(

            this.items

        ).length;

    },

    getAll(){

        return {

            ...this.items

        };

    },

    keys(){

        return Object.keys(

            this.items

        );

    },
    importJSON(json){

        try{

            const data=JSON.parse(json);

            this.load(data);

            return true;

        }catch(e){

            return false;

        }

    },

    export(){

        return JSON.stringify(

            this.items,

            null,

            2

        );

    },

    destroy(){

        this.items={};

        this.current=null;

    }

};

DGE.Commentary=Commentary;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Commentary.init();

    }

);

})();










    









    





    
