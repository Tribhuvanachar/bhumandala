"use strict";

/*=============================================================================
 Digital Grantha Engine
 Storage Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Storage={

    prefix:"DGE_",

    init(){

        return this;

    },

    key(name){

        return this.prefix+String(name);

    },

    set(name,value){

        localStorage.setItem(

            this.key(name),

            JSON.stringify(value)

        );

        return true;

    },

    get(name,defaultValue=null){

        try{

            const value=localStorage.getItem(

                this.key(name)

            );

            if(value===null)
                return defaultValue;

            return JSON.parse(value);

        }catch(e){

            return defaultValue;

        }

    },

    remove(name){

        localStorage.removeItem(

            this.key(name)

        );

    },

    exists(name){

        return localStorage.getItem(

            this.key(name)

        )!==null;

    },

    clear(){

        const keys=[];

        for(let i=0;i<localStorage.length;i++){

            const key=localStorage.key(i);

            if(key.startsWith(this.prefix))
                keys.push(key);

        }

        keys.forEach(

            key=>localStorage.removeItem(key)

        );

    },

    keys(){

        const list=[];

        for(let i=0;i<localStorage.length;i++){

            const key=localStorage.key(i);

            if(key.startsWith(this.prefix))

                list.push(

                    key.substring(

                        this.prefix.length

                    )

                );

        }

        return list;

    },

    values(){

        return this.keys().map(

            key=>this.get(key)

        );

    },

    entries(){

        return this.keys().map(

            key=>[

                key,

                this.get(key)

            ]

        );

    },

    size(){

        return this.keys().length;

    },

    export(){

        const data={};

        this.keys().forEach(

            key=>{

                data[key]=this.get(key);

            }

        );

        return JSON.stringify(

            data,

            null,

            2

        );

    },

    import(data={}){

        Object.entries(data).forEach(

            ([key,value])=>{

                this.set(key,value);

            }

        );

        return true;

    },

    destroy(){

        /* Reserved */

    }

};

DGE.Storage=Storage;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Storage.init();

    }

);

})();










  
















  





  
