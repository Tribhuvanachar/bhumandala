/*
=========================================================
Digital Grantha Engine
Grantha Audio
Build 023
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#3F51B5;color:#fff;padding:6px;font-family:monospace">granthaAudio.js BUILD 023</div>'
);

class DGEGranthaAudio {

    constructor(){

        this.player=null;

    }

    initialize(){

        this.player=document.getElementById("audioPlayer");

    }

    playVerse(metadata,verseNo){

        if(!this.player) return;

        if(!metadata) return;

        const base=
            metadata.archiveBaseUrl;

        const prefix=
            metadata.filePrefix;

        const ext=
            metadata.fileExtension;

        this.player.src=
            `${base}${prefix}${verseNo}${ext}`;

        this.player.play();

    }

    stop(){

        if(this.player){

            this.player.pause();

        }

    }

}

window.DGEGranthaAudio=
new DGEGranthaAudio();
