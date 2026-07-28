"use strict";

/*=============================================================================
 Digital Grantha Engine
 Data Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function () {

if (!window.DGE)
    throw new Error("DGE core must be loaded before data.js.");

const DataEngine={

    loaded:false,

    loading:false,

    fileName:null,

    raw:null,

    metadata:{},

    verses:[],

    verseMap:new Map(),

    cache:new Map(),

    statistics:{},

    async load(fileName){

        if(fileName)
            this.fileName=fileName;

        if(!this.fileName)
            this.fileName="data_pns.json";

        if(this.loading)
            return this.raw;

        this.loading=true;

        try{

            const response=await fetch(this.fileName,{
                cache:"no-store"
            });

            if(!response.ok)
                throw new Error(
                    "Unable to load "+this.fileName
                );

            const json=await response.json();

            this.initialize(json);

            this.loaded=true;

            this.loading=false;

            console.info(
                "[DGE] Dataset loaded."
            );

            return json;

        }

        catch(error){

            this.loading=false;

            console.error(
                "[DGE] Dataset load failed.",
                error
            );

            throw error;

        }

    },

    initialize(json){

        this.raw=json;

        this.metadata=
            json.metadata || {};

        this.verses=[];

        this.verseMap.clear();

        if(Array.isArray(json)){

            this.verses=json;

        }

        else if(Array.isArray(json.verses)){

            this.verses=json.verses;

        }

        else if(json.shlokas){

            this.verses=
                Object.values(json.shlokas);

        }

        else{

            this.verses=[];

        }

        this.buildIndex();

        this.computeStatistics();

    },

    buildIndex(){

        this.verseMap.clear();

        this.verses.forEach((verse,index)=>{

            const id=
                verse.id ??
                verse.number ??
                index+1;

            this.verseMap.set(id,verse);

        });

    },

    computeStatistics(){

        this.statistics={

            verseCount:this.verses.length,

            metadataKeys:
                Object.keys(this.metadata).length,

            loadedAt:new Date(),

            file:this.fileName

        };

    },

    getAll(){

        return this.verses;

    },

    getVerse(id){

        return this.verseMap.get(id) || null;

    },

    getVerseByIndex(index){

        return this.verses[index] || null;

    },

    getMetadata(){

        return this.metadata;

    },

    getStatistics(){

        return structuredClone(
            this.statistics
        );

    },

    hasVerse(id){

        return this.verseMap.has(id);

    },

    getVerseCount(){

        return this.verses.length;

    },

    find(predicate){

        if(typeof predicate!=="function")
            return [];

        return this.verses.filter(predicate);

    },

    filter(predicate){

        return this.find(predicate);

    },

    map(callback){

        return this.verses.map(callback);

    },

    forEach(callback){

        this.verses.forEach(callback);

    },

    nextVerse(id){

        const keys=[...this.verseMap.keys()];

        const index=keys.indexOf(id);

        if(index<0)
            return null;

        return this.verseMap.get(keys[index+1]) || null;

    },

    previousVerse(id){

        const keys=[...this.verseMap.keys()];

        const index=keys.indexOf(id);

        if(index<=0)
            return null;

        return this.verseMap.get(keys[index-1]) || null;

    },

    firstVerse(){

        return this.verses.length
            ?this.verses[0]
            :null;

    },

    lastVerse(){

        return this.verses.length
            ?this.verses[this.verses.length-1]
            :null;

    },

    cacheValue(key,value){

        this.cache.set(key,value);

        return value;

    },

    getCached(key){

        return this.cache.get(key);

    },

    clearCache(){

        this.cache.clear();

    },

    async switchDataset(fileName){

        this.loaded=false;

        this.raw=null;

        this.metadata={};

        this.verses=[];

        this.verseMap.clear();

        this.cache.clear();

        return await this.load(fileName);

    },

    async reload(){

        return await this.switchDataset(
            this.fileName
        );

    },

    validate(){

        const errors=[];

        if(!this.raw)
            errors.push("Dataset not loaded.");

        if(!Array.isArray(this.verses))
            errors.push("Verse collection is invalid.");

        if(this.verses.length===0)
            errors.push("No verses found.");

        return{

            valid:errors.length===0,

            errors

       







  
