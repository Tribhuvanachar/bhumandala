"use strict";

/*=============================================================================
 Digital Grantha Engine
 Marker Manager
 Version : 10.1.0 Alpha
 Legacy Migration
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Markers={

    items:{},

    targetId:null,

    init(){

        this.load();

        return this;

    },

    load(){

        if(DGE.Storage){

            this.items=DGE.Storage.get(

                "marks",

                {}

            );

        }else{

            this.items={};

        }

        return this.items;

    },

    save(){

        if(DGE.Storage){

            DGE.Storage.set(

                "marks",

                this.items

            );

        }

        return true;

    },

    openMenu(e,id){

        this.targetId=id;

        const menu=

            DGE.els?.markerMenu||

            document.getElementById(

                "markerMenu"

            );

        if(!menu)
            return;

        menu.classList.add(

            "show"

        );

        const rect=

            menu.getBoundingClientRect();

        let x=

            e.clientX-130;

        let y=

            e.clientY-40;

        x=Math.max(

            8,

            Math.min(

                x,

                window.innerWidth-

                rect.width-8

            )

        );

        y=Math.max(

            8,

            Math.min(

                y,

                window.innerHeight-

                rect.height-8

            )

        );

        menu.style.left=

            `${x}px`;

        menu.style.top=

            `${y}px`;

    },

    set(type){

        if(

            this.targetId==null

        ){

            return false;

        }

        if(

            type==="none"

        ){

            delete this.items[

                this.targetId

            ];

        }else{

            this.items[

                this.targetId

            ]=type;

        }

        this.save();

        const menu=

            DGE.els?.markerMenu||

            document.getElementById(

                "markerMenu"

            );

        if(menu){

            menu.classList.remove(

                "show"

            );

        }

        if(

            typeof DGE.render==="function"

        ){

            DGE.render();

        }

        if(

            typeof DGE.emit===

            "function"

        ){

            DGE.emit(

                "marker:set",

                {

                    id:this.targetId,

                    type

                }

            );

        }

        return true;

    },

    get(id){

        return this.items[id]||

               null;

    },

    has(id){

        return Object.prototype.hasOwnProperty.call(

            this.items,

            id

        );

    },

    remove(id){

        if(

            !this.has(id)

        ){

            return false;

        }

        delete this.items[id];

        this.save();

        return true;

    },

    clear(){

        this.items={};

        this.save();

    },

    getAll(){

        return{

            ...this.items

        };

    },

    destroy(){

        this.items={};

        this.targetId=null;

    }

};

DGE.Markers=Markers;

/* -------------------------------------------------------------------------
   Legacy Compatibility
------------------------------------------------------------------------- */

window.openMarkerMenu=function(e,id){

    return DGE.Markers.openMenu(

        e,

        id

    );

};

window.setMark=function(type){

    return DGE.Markers.set(

        type

    );

};

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        DGE.Markers.init();

    }

);

})();
