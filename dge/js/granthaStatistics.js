/*
=========================================================
Digital Grantha Engine
Grantha Statistics
Build 001
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#4CAF50;color:#fff;padding:6px;font-family:monospace">granthaStatistics.js BUILD 001</div>'
);

class DGEGranthaStatistics{

    constructor(){

        this.key="DGE_STATISTICS";

        this.data=this.load();

    }

    load(){

        try{

            return JSON.parse(
                localStorage.getItem(this.key)
            )||{

                versesOpened:0,

                uniqueVerses:{},

                commentaryReads:0,

                audioPlayed:0

            };

        }catch(e){

            return{

                versesOpened:0,

                uniqueVerses:{},

                commentaryReads:0,

                audioPlayed:0

            };

        }

    }

    save(){

        localStorage.setItem(

            this.key,

            JSON.stringify(this.data)

        );

    }

    verseOpened(id){

        this.data.versesOpened++;

        this.data.uniqueVerses[id]=true;

        this.save();

    }

    commentaryOpened(){

        this.data.commentaryReads++;

        this.save();

    }

    audioPlayed(){

        this.data.audioPlayed++;

        this.save();

    }

    summary(){

        return{

            versesOpened:
                this.data.versesOpened,

            uniqueVerses:
                Object.keys(
                    this.data.uniqueVerses
                ).length,

            commentaryReads:
                this.data.commentaryReads,

            audioPlayed:
                this.data.audioPlayed

        };

    }

}

window.DGEGranthaStatistics=
new DGEGranthaStatistics();
