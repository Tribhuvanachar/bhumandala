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

    activeId:null,

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

    exists(id){

        return this.has(id);

    },

    open(id){

        this.activeId=

            String(id);

        DGE.emit(

            "note:open",

            this.activeId

        );

        return this.get(

            this.activeId

        );

    },

    close(){

        if(

            this.activeId===null ||

            this.activeId===undefined

        ){

            return;

        }

        DGE.emit(

            "note:close",

            this.activeId

        );

        this.activeId=null;

    },

    active(){

        return this.activeId;

    },

    update(text){

        if(

            this.activeId===null ||

            this.activeId===undefined

        ){

            return false;

        }

        this.set(

            this.activeId,

            text

        );

        DGE.emit(

            "note:update",

            this.activeId

        );

        return true;

    },

    isOpen(){

        return (

            this.activeId!==null &&

            this.activeId!==undefined

        );

    },

    rename(oldId,newId){

        oldId=String(oldId);

        newId=String(newId);

        if(

            !this.has(oldId)

        ){

            return false;

        }

        this.items[newId]=

            this.items[oldId];

        delete this.items[oldId];

        this.save();

        DGE.emit(

            "note:rename",

            {

                from:oldId,

                to:newId

            }

        );

        return true;

    },

    search(query){

        query=(query||"")

            .toLowerCase();

        return Object.entries(

            this.items

        ).filter(

            ([,text])=>

                String(text)

                .toLowerCase()

                .includes(query)

        );

    },

    merge(data){

        if(

            typeof data!=="object" ||

            data===null

        ){

            return false;

        }

        Object.entries(data).forEach(

            ([id,text])=>{

                this.items[String(id)]=

                    String(text);

            }

        );

        this.save();

        DGE.emit(

            "note:merge"

        );

        return true;

    },

    backup(){

        return{

            version:"10.1.0",

            exported:

                new Date()

                .toISOString(),

            notes:

                this.getAll()

        };

    },

    restore(data){

        if(

            !data ||

            typeof data!=="object"

        ){

            return false;

        }

        if(

            !data.notes ||

            typeof data.notes!=="object"

        ){

            return false;

        }

        this.items={

            ...data.notes

        };

        this.activeId=null;

        this.save();

        DGE.emit(

            "note:restore"

        );

        return true;

    },

    statistics(){

        const ids=

            this.keys();

        let characters=0;

        ids.forEach(

            id=>{

                characters+=

                    this.get(id).length;

            }

        );

        return{

            notes:ids.length,

            characters,

            average:

                ids.length

                ?Math.round(

                    characters/

                    ids.length

                )

                :0

        };

    },

    clear(){

        this.items={};

        this.activeId=null;

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

        this.activeId=null;

        this.save();

        DGE.emit(

            "note:import"

        );

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

        this.activeId=null;

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
