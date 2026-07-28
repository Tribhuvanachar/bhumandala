"use strict";

/*=============================================================================
 Digital Grantha Engine
 Grantha Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core must be loaded first.");

const GranthaManager = {

    current:null,

    registry:new Map(),

    history:[],

    async register(grantha){

        if(!grantha)
            throw new Error("Grantha is required.");

        if(!grantha.id)
            throw new Error("Grantha must contain an id.");

        this.registry.set(
            grantha.id,
            grantha
        );

        return grantha;

    },

    unregister(id){

        this.registry.delete(id);

    },

    list(){

        return [...this.registry.values()];

    },

    exists(id){

        return this.registry.has(id);

    },

    get(id){

        return this.registry.get(id) || null;

    },

    async open(id){

        const grantha=this.get(id);

        if(!grantha)
            throw new Error(
                "Unknown grantha: "+id
            );

        this.current=grantha;

        this.history.push(id);

        if(grantha.config){

            await DGE.Config.load(
                grantha.config
            );

        }

        if(grantha.data){

            await DGE.Data.load(
                grantha.data
            );

        }

        DGE.emit(
            "grantha:opened",
            grantha
        );

        return grantha;

    },

    close(){

        if(!this.current)
            return;

        const previous=this.current;

        this.current=null;

        DGE.emit(
            "grantha:closed",
            previous
        );

    },

    currentGrantha(){

        return this.current;

    },

    currentId(){

        return this.current
            ?this.current.id
            :null;

    },

    currentTitle(){

        return this.current
            ?this.current.title
            :null;

    },

    currentDataFile(){

        return this.current
            ?this.current.data
            :null;

    },

    currentConfigFile(){

        return this.current
            ?this.current.config
            :null;

    },

    historyList(){

        return [...this.history];

    },

    clearHistory(){

        this.history.length=0;

    }

};

DGE.Grantha=GranthaManager;

})();
