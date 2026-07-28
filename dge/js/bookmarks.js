"use strict";

/*=============================================================================
 Digital Grantha Engine
 Bookmark Manager
 Version : 10.1.2 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Bookmarks = {

    items: [],

    init(){
        this.load();
        return this;
    },

    // ------------------------------------------------------------------------
    // Core Storage
    // ------------------------------------------------------------------------

    load(){
        if(!DGE.Storage){
            console.warn("DGE.Storage is not available. Bookmarks will not persist.");
            return [];
        }
        this.items = DGE.Storage.get("bookmarks", []);
        return this.items;
    },

    save(){
        if(DGE.Storage){
            DGE.Storage.set("bookmarks", this.items);
        }
        return true;
    },

    // ------------------------------------------------------------------------
    // CRUD Operations
    // ------------------------------------------------------------------------

    add(bookmark){
        if(!bookmark || !bookmark.id)
            return false;

        if(this.exists(bookmark.id))
            return false;

        // Enhance with timestamps, tags, and groups/folders
        const newBookmark = {
            ...bookmark,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
            group: bookmark.group || "default"
        };

        this.items.push(newBookmark);
        this.save();

        if (typeof DGE.emit === "function") {
            DGE.emit("bookmark:add", newBookmark);
        }

        return true;
    },

    remove(id){
        const before = this.items.length;
        this.items = this.items.filter(
            item => String(item.id) !== String(id)
        );

        if(before === this.items.length){
            return false;
        }

        this.save();

        if (typeof DGE.emit === "function") {
            DGE.emit("bookmark:remove", id);
        }

        return true;
    },

    update(id, data){
        const index = this.indexOf(id);

        if(index === -1){
            return false;
        }

        this.items[index] = {
            ...this.items[index],
            ...data,
            updatedAt: Date.now()
        };

        this.save();

        if (typeof DGE.emit === "function") {
            DGE.emit("bookmark:update", this.items[index]);
        }

        return true;
    },

    rename(id, title){
        return this.update(id, { title: title });
    },

    toggle(bookmark){
        if(this.exists(bookmark.id)){
            this.remove(bookmark.id);
            return false;
        }
        this.add(bookmark);
        return true;
    },

    // ------------------------------------------------------------------------
    // Retrieval & Queries
    // ------------------------------------------------------------------------

    exists(id){
        return this.indexOf(id) !== -1;
    },

    get(id){
        const index = this.indexOf(id);
        return index !== -1 ? this.items[index] : null;
    },

    getAll(){
        return [...this.items];
    },

    find(callback){
        if(typeof callback !== "function")
            return null;
        return this.items.find(callback) || null;
    },

    filter(callback){
        if(typeof callback !== "function")
            return [];
        return this.items.filter(callback);
    },

    sort(compareFn){
        if(typeof compareFn === "function"){
            this.items.sort(compareFn);
            this.save();
        }
        return this;
    },
    
    // Group & Tag Queries
    groups(){
        return [...new Set(this.items.map(item => item.group))];
    },
    
    byGroup(group){
        return this.items.filter(item => item.group === group);
    },
    
    tags(){
        return [...new Set(this.items.flatMap(item => item.tags || []))];
    },
    
    byTag(tag){
        return this.items.filter(item => 
            Array.isArray(item.tags) && item.tags.includes(tag)
        );
    },

    search(text){
        text = String(text).toLowerCase();
        return this.items.filter(item => 
            JSON.stringify(item).toLowerCase().includes(text)
        );
    },

    // ------------------------------------------------------------------------
    // Navigation Helpers
    // ------------------------------------------------------------------------

    indexOf(id){
        return this.items.findIndex(
            item => String(item.id) === String(id)
        );
    },
    
    next(id){
        const i = this.indexOf(id);
        if(i === -1 || i >= this.items.length - 1){
            return null;
        }
        return this.items[i + 1];
    },
    
    previous(id){
        const i = this.indexOf(id);
        if(i <= 0){
            return null;
        }
        return this.items[i - 1];
    },

    // ------------------------------------------------------------------------
    // Utility Methods
    // ------------------------------------------------------------------------

    first(){
        return this.items[0] || null;
    },

    last(){
        return this.items.at(-1) || null;
    },

    isEmpty(){
        return this.items.length === 0;
    },

    ids(){
        return this.items.map(
            item => item.id
        );
    },

    count(){
        return this.items.length;
    },

    clear(){
        this.items = [];
        this.save();

        if (typeof DGE.emit === "function") {
            DGE.emit("bookmark:clear");
        }
    },

    // ------------------------------------------------------------------------
    // Import / Export
    // ------------------------------------------------------------------------

    import(list){
        if(!Array.isArray(list))
            return false;

        this.items = [...list];
        this.save();
        
        if (typeof DGE.emit === "function") {
            DGE.emit("bookmark:import", this.items);
        }

        return true;
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
            const data = JSON.parse(json);
            if(Array.isArray(data)){
                return this.import(data);
            }
        } catch(e) {
            return false;
        }
        return false;
    },

    destroy(){
        this.items = [];
    }
};

DGE.Bookmarks = Bookmarks;

document.addEventListener(
    "DOMContentLoaded",
    () => {
        Bookmarks.init();
    }
);

})();
