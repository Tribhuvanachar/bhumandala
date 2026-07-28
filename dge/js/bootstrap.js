"use strict";

/*=============================================================================
 Digital Grantha Engine
 Bootstrap Manager
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Bootstrap={

    started:false,

    async init(){

        if(this.started)
            return;

        this.started=true;

        await DGE.Config.load();

        await DGE.Data.load();

        DGE.Grantha.init();

        DGE.Search.init();

        DGE.Render.init();

        DGE.Audio.init();

        DGE.Bookmarks.init();

        DGE.Notes.init();

        DGE.Commentary.init();

        DGE.Storage.init();

        DGE.UI.init();

        DGE.Transliteration.init();

        DGE.emit("engine:ready");

    },
