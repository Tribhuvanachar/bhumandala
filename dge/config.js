"use strict";

/*=============================================================================
 Digital Grantha Engine
 Configuration Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core (dge.js) must be loaded before config.js.");

const DEFAULT_CONFIG = {

    app:{
        name:"Digital Grantha Engine",
        version:"10.1.0",
        build:"alpha",
        language:"en"
    },

    branding:{
        title:"Digital Grantha Engine",
        designedBy:"",
        contactEmail:""
    },

    audio:{
        enabled:true,
        baseUrl:"",
        cache:true
    },

    ai:{
        enabled:true,
        geminiModel:"gemini-3.6-flash"
    },

    ui:{
        theme:"light",
        script:"devanagari"
    },

    search:{
        enabled:true,
        fuzzy:false,
        maxResults:100
    },

    cache:{
        enabled:true,
        ttl:86400
    }

};

const ConfigEngine={

    loaded:false,

    loading:false,

    fileName:"Config.json",

    data:{},

    observers:new Map(),

    async init(){

        if(this.loaded)
            return this.data;

        return await this.load();

    },

    async load(file){

        if(this.loading)
            return this.data;

        this.loading=true;

        if(file)
            this.fileName=file;

        try{

            const response=await fetch(this.fileName,{
                cache:"no-store"
            });

            if(!response.ok)
                throw new Error(
                    "Unable to load "+this.fileName
                );

            const json=await response.json();

            this.data=this.mergeDefaults(json);

            this.loaded=true;

            this.loading=false;

            this.notify("*",this.data);

            console.info(
                "[DGE] Config loaded."
            );

            return this.data;

        }

        catch(error){

            console.warn(
                "[DGE] Using default configuration.",
                error
            );

            this.data=
                structuredClone(DEFAULT_CONFIG);

            this.loaded=true;

            this.loading=false;

            return this.data;

        }

    },

    mergeDefaults(user){

        const result=
            structuredClone(DEFAULT_CONFIG);

        deepMerge(result,user);

        return result;

    },

    reload(){

        this.loaded=false;

        return this.load(this.fileName);

    },

    get(path,defaultValue){

        if(!path)
            return this.data;

        const parts=path.split(".");

        let obj=this.data;

        for(const key of parts){

            if(obj==null)
                return defaultValue;

            obj=obj[key];

        }

        return obj===undefined
            ?defaultValue
            :obj;

    },

    has(path){

        return this.get(path)!==undefined;

    },

    set(path,value){

        const keys=path.split(".");

        let obj=this.data;

        while(keys.length>1){

            const k=keys.shift();

            if(typeof obj[k]!=="object")
                obj[k]={};

            obj=obj[k];

        }

        obj[keys[0]]=value;

        this.notify(path,value);

        return value;

    },

    remove(path){

        const keys=path.split(".");

        let obj=this.data;

        while(keys.length>1){

            obj=obj[keys.shift()];

            if(!obj)
                return;

        }

        delete obj[keys[0]];

        this.notify(path,null);

    },

    reset(){

        this.data=
            structuredClone(DEFAULT_CONFIG);

        this.notify("*",this.data);

    },
    on(path, callback){

        if(typeof callback !== "function")
            return;

        if(!this.observers.has(path))
            this.observers.set(path, []);

        this.observers.get(path).push(callback);

    },

    off(path, callback){

        if(!this.observers.has(path))
            return;

        const list=this.observers.get(path);

        const index=list.indexOf(callback);

        if(index>=0)
            list.splice(index,1);

    },

    notify(path,value){

        if(this.observers.has(path)){

            for(const fn of this.observers.get(path)){

                try{

                    fn(value,this.data);

                }

                catch(err){

                    console.error(err);

                }

            }

        }

        if(path!=="*" && this.observers.has("*")){

            for(const fn of this.observers.get("*")){

                try{

                    fn(path,value,this.data);

                }

                catch(err){

                    console.error(err);

                }

            }

        }

    },

    validate(){

        const errors=[];

        if(!this.data.app)
            errors.push("Missing app section.");

        if(!this.data.branding)
            errors.push("Missing branding section.");

        if(!this.data.ui)
            errors.push("Missing ui section.");

        if(!this.data.search)
            errors.push("Missing search section.");

        if(!this.data.audio)
            errors.push("Missing audio section.");

        if(errors.length){

            console.warn(
                "[DGE] Configuration validation failed.",
                errors
            );

        }

        return{

            valid:errors.length===0,
            errors

        };

    },

    export(){

        return JSON.stringify(
            this.data,
            null,
            2
        );

    },

    import(json){

        if(typeof json==="string")
            json=JSON.parse(json);

        this.data=this.mergeDefaults(json);

        this.notify("*",this.data);

    },

    clone(){

        return structuredClone(this.data);

    },

    compatibility(){

        return{

            geminiModel:
                this.get("ai.geminiModel",
                    this.get("geminiModel")),

            designedBy:
                this.get("branding.designedBy",
                    this.get("designedBy")),

            contactEmail:
                this.get("branding.contactEmail",
                    this.get("contactEmail")),

            secretPasskey:
                this.get("app.secretPasskey",
                    this.get("secretPasskey")),

            appName:
                this.get("branding.title",
                    this.get("appName"))

        };

    },

    print(){

        console.table(this.data);

    }

};

function deepMerge(target,source){

    if(!source)
        return target;

    for(const key of Object.keys(source)){

        const value=source[key];

        if(
            value &&
            typeof value==="object" &&
            !Array.isArray(value)
        ){

            if(
                !target[key] ||
                typeof target[key]!=="object"
            ){

                target[key]={};

            }

            deepMerge(target[key],value);

        }

        else{

            target[key]=value;

        }

    }

    return target;

}

DGE.Config=ConfigEngine;

})();























  
  
