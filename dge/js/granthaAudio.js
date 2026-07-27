/*
=========================================================
Digital Grantha Engine
Grantha Audio
Build 024
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#3F51B5;color:#fff;padding:6px;font-family:monospace">granthaAudio.js BUILD 024</div>'
);

class DGEGranthaAudio{

    constructor(){

        this.player=null;

        this.currentVerse=0;

    }

    initialize(){

        this.player=document.getElementById("audioPlayer");

    }

    playVerse(metadata,verse){

        if(!this.player||!metadata) return;

        this.currentVerse=verse;

        this.player.src=
            metadata.archiveBaseUrl+
            metadata.filePrefix+
            verse+
            metadata.fileExtension;

        this.player.play();

    }

    pause(){

        if(this.player){

            this.player.pause();

        }

    }

    resume(){

        if(this.player){

            this.player.play();

        }

    }

    stop(){

        if(!this.player) return;

        this.player.pause();

        this.player.currentTime=0;

    }

    isPlaying(){

        return this.player &&
               !this.player.paused;

    }

}

window.DGEGranthaAudio=
new DGEGranthaAudio();
