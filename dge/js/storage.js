"use strict";

/*=============================================================================
 Digital Grantha Engine
 Storage Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Storage = {

    prefix: "DGE_",
    
    // Default Backend
    backend: localStorage,

    init(){
        return this;
    },

    // ------------------------------------------------------------------------
    // Backend Management
    // ------------------------------------------------------------------------

    setBackend(storage){
        if(
            !storage || 
            typeof storage.getItem !== "function" || 
            typeof storage.setItem !== "function"
        ){
            return false;
        }
        this.backend = storage;
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:backend", storage);
        }
        return true;
    },

    getBackend(){
        return this.backend;
    },

    useLocalStorage(){
        return this.setBackend(localStorage);
    },

    useSessionStorage(){
        return this.setBackend(sessionStorage);
    },

    // ------------------------------------------------------------------------
    // Core Methods
    // ------------------------------------------------------------------------

    key(name){
        return this.prefix + String(name);
    },
    
    touch(){
        // Updates a modified timestamp to track storage changes internally
        this.backend.setItem(this.key("_lastModified"), Date.now().toString());
    },

    set(name, value){
        this.backend.setItem(
            this.key(name),
            JSON.stringify(value)
        );
        this.touch();
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:set", { key: name, value });
        }
        return true;
    },

    get(name, defaultValue = null){
        try{
            const value = this.backend.getItem(this.key(name));
            if(value === null)
                return defaultValue;
            return JSON.parse(value);
        } catch(e) {
            return defaultValue;
        }
    },

    remove(name){
        this.backend.removeItem(this.key(name));
        this.touch();
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:remove", name);
        }
        return true;
    },

    exists(name){
        return this.backend.getItem(this.key(name)) !== null;
    },

    clear(){
        const keys = [];
        for(let i = 0; i < this.backend.length; i++){
            const key = this.backend.key(i);
            if(key.startsWith(this.prefix)){
                keys.push(key);
            }
        }
        keys.forEach(
            key => this.backend.removeItem(key)
        );
        this.touch();
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:clear");
        }
        return true;
    },

    keys(){
        const list = [];
        for(let i = 0; i < this.backend.length; i++){
            const key = this.backend.key(i);
            if(key.startsWith(this.prefix) && key !== this.prefix + "_lastModified"){
                list.push(
                    key.substring(this.prefix.length)
                );
            }
        }
        return list;
    },

    values(){
        return this.keys().map(
            key => this.get(key)
        );
    },

    entries(){
        return this.keys().map(
            key => [
                key,
                this.get(key)
            ]
        );
    },

    size(){
        return this.keys().length;
    },

    export(){
        const data = {};
        this.keys().forEach(
            key => {
                data[key] = this.get(key);
            }
        );
        return JSON.stringify(data, null, 2);
    },

    import(data = {}){
        Object.entries(data).forEach(
            ([key, value]) => {
                this.set(key, value);
            }
        );
        this.touch();
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:import", data);
        }
        return true;
    },

    destroy(){
        this.clear();
        this.migrations = {};
        this.backend = localStorage;
        if(typeof DGE.emit === "function"){
            DGE.emit("storage:destroy");
        }
        return this;
    },

    // ------------------------------------------------------------------------
    // Extended & Convenience Methods
    // ------------------------------------------------------------------------

    has(name){
        return this.exists(name);
    },

    setDefault(name, value){
        if(!this.exists(name)){
            this.set(name, value);
        }
        return this.get(name);
    },

    update(name, callback){
        if(typeof callback !== "function"){
            return false;
        }
        const value = this.get(name);
        const updated = callback(value);
        this.set(name, updated);
        return updated;
    },

    merge(name, data = {}){
        const current = this.get(name, {});
        if(typeof current !== "object" || current === null){
            return false;
        }
        this.set(
            name,
            {
                ...current,
                ...data
            }
        );
        return true;
    },

    rename(oldName, newName){
        if(!this.exists(oldName)){
            return false;
        }
        this.set(newName, this.get(oldName));
        this.remove(oldName);
        return true;
    },

    copy(from, to){
        if(!this.exists(from)){
            return false;
        }
        this.set(to, this.get(from));
        return true;
    },

    increment(name, step = 1){
        const value = Number(this.get(name, 0)) + step;
        this.set(name, value);
        return value;
    },

    decrement(name, step = 1){
        return this.increment(name, -step);
    },

    // ------------------------------------------------------------------------
    // Observability (Events)
    // ------------------------------------------------------------------------

    on(event, handler){
        if (typeof DGE.on === "function") {
            DGE.on(`storage:${event}`, handler);
        }
        return this;
    },

    off(event, handler){
        if(typeof DGE.off === "function"){
            DGE.off(`storage:${event}`, handler);
        }
        return this;
    },

    once(event, handler){
        const wrapper = (...args) => {
            if(typeof DGE.off === "function"){
                DGE.off(`storage:${event}`, wrapper);
            }
            handler(...args);
        };
        if (typeof DGE.on === "function") {
            DGE.on(`storage:${event}`, wrapper);
        }
        return this;
    },

    // ------------------------------------------------------------------------
    // Utility Methods
    // ------------------------------------------------------------------------

    isEmpty(){
        return this.size() === 0;
    },

    length(){
        return this.size();
    },

    lastModified(){
        return Number(
            this.backend.getItem(this.key("_lastModified"))
        ) || 0;
    },

    storageInfo(){
        return {
            backend: this.backend === localStorage ? "localStorage" 
                   : this.backend === sessionStorage ? "sessionStorage" 
                   : "custom",
            prefix: this.prefix,
            keys: this.size(),
            lastModified: this.lastModified()
        };
    },

    validate(){
        try{
            const key = "__storage_test__";
            this.backend.setItem(key, "1");
            this.backend.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },

    // ------------------------------------------------------------------------
    // Migrations
    // ------------------------------------------------------------------------
    
    migrations: {},

    registerMigration(version, callback){
        if(typeof callback !== "function"){
            return false;
        }
        this.migrations[version] = callback;
        return true;
    },

    migrate(version){
        const fn = this.migrations[version];
        if(!fn){
            return false;
        }
        fn(this);
        this.touch();
        if (typeof DGE.emit === "function") {
            DGE.emit("storage:migrate", version);
        }
        return true;
    }
};

DGE.Storage = Storage;

document.addEventListener(
    "DOMContentLoaded",
    () => {
        Storage.init();
    }
);

})();
