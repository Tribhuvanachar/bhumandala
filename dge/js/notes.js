"use strict";

/*=============================================================================
 Digital Grantha Engine
 Notes Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Notes={

    storageKey:"DGE_NOTES",

    items:{},

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
                :{};

        }catch(e){

            this.items={};

        }

    },

    save(){

        localStorage.setItem(

            this.storageKey,

            JSON.stringify(this.items)

        );

    },

    set(id,text){

        this.items[String(id)]=text;

        this.save();

        DGE.emit(
            "note:set",
            id
        );

    },

    get(id){

        return this.items[
            String(id)
        ] ?? "";

    },

    remove(id){

        delete this.items[
            String(id)
        ];

        this.save();

        DGE.emit(
            "note:remove",
            id
        );

    },

    has(id){

        return Object.prototype.hasOwnProperty.call(

            this.items,

            String(id)

        );

    },

    clear(){

        this.items={};

        this.save();

        DGE.emit(
            "note:clear"
        );

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

    count(){

        return this.keys().length;

    },

    export(){

        return JSON.stringify(

            this.items,

            null,

            2

        );

    },

    import(data){

        if(

            typeof data!=="object" ||

            data===null

        )

            return false;

        this.items={...data};

        this.save();

        return true;

    },

    importJSON(json){

        try{

            const data=JSON.parse(json);

            return this.import(data);

        }catch(e){

            return false;

        }

    },

    destroy(){

        this.items={};

    }

};

DGE.Notes=Notes;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Notes.init();

    }

);

})();




















    



    


    
