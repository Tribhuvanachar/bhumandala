"use strict";

/*=============================================================================
 Digital Grantha Engine
 Audio Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Audio={

    player:null,

    current:null,

    playlist:[],

    index:-1,

    volume:1.0,

    muted:false,

    init(){

        this.player=new Audio();

        this.player.preload="metadata";

        this.player.volume=this.volume;

        this.bindEvents();

        return this;

    },

    bindEvents(){

        this.player.addEventListener(
            "play",
            ()=>DGE.emit("audio:play",this.current)
        );

        this.player.addEventListener(
            "pause",
            ()=>DGE.emit("audio:pause",this.current)
        );

        this.player.addEventListener(
            "ended",
            ()=>{

                DGE.emit("audio:end",this.current);

                this.next();

            }
        );

        this.player.addEventListener(
            "error",
            e=>DGE.emit("audio:error",e)
        );

    },

    load(source){

        if(!source)
            return false;

        this.current=source;

        this.player.src=source;

        this.player.load();

        return true;

    },

    play(source){

        if(source)
            this.load(source);

        if(!this.player.src)
            return;

        this.player.play();

    },

    pause(){

        this.player.pause();

    },

    stop(){

        this.player.pause();

        this.player.currentTime=0;

    },
    toggle(){

        if(this.player.paused)

            this.play();

        else

            this.pause();

    },

    seek(seconds){

        if(!this.player)

            return;

        this.player.currentTime=seconds;

    },

    forward(seconds=10){

        this.player.currentTime+=seconds;

    },

    rewind(seconds=10){

        this.player.currentTime-=seconds;

    },

    setVolume(value){

        value=Math.max(0,Math.min(1,value));

        this.volume=value;

        this.player.volume=value;

    },

    mute(){

        this.muted=true;

        this.player.muted=true;

    },

    unmute(){

        this.muted=false;

        this.player.muted=false;

    },

    toggleMute(){

        if(this.muted)

            this.unmute();

        else

            this.mute();

    },

    isPlaying(){

        return !this.player.paused;

    },

    currentTime(){

        return this.player.currentTime;

    },

    duration(){

        return this.player.duration || 0;

    },
    setPlaylist(list=[]){

        this.playlist=[...list];

        this.index=0;

    },

    next(){

        if(

            !this.playlist.length ||

            this.index>=this.playlist.length-1

        )

            return;

        this.index++;

        this.play(
            this.playlist[this.index]
        );

    },

    previous(){

        if(

            !this.playlist.length ||

            this.index<=0

        )

            return;

        this.index--;

        this.play(
            this.playlist[this.index]
        );

    },

    currentSource(){

        return this.current;

    },

    destroy(){

        this.stop();

        this.playlist=[];

        this.index=-1;

        this.current=null;

    }

};

DGE.Audio=Audio;

document.addEventListener(
    "DOMContentLoaded",
    ()=>{

        Audio.init();

    }
);

})();











    










    
