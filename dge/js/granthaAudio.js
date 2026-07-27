/*
=========================================================
Digital Grantha Engine
Grantha Audio
Build 022
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#3F51B5;color:#fff;padding:6px;font-family:monospace">granthaAudio.js BUILD 022</div>'
);

class DGEGranthaAudio {

    constructor(){

        this.player=null;

    }

    initialize(){

        this.player=document.getElementById("audioPlayer");

    }

    play(url){

        if(!this.player) return;

        this.player.src=url;

        this.player.play();

    }

    stop(){

        if(!this.player) return;

        this.player.pause();

    }

    setRate(rate){

        if(!this.player) return;

        this.player.playbackRate=rate;

    }

}

window.DGEGranthaAudio=
new DGEGranthaAudio();
