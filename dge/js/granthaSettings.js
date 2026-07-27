/*
=========================================================
Digital Grantha Engine
Grantha Settings
Build 001
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#607D8B;color:#fff;padding:6px;font-family:monospace">granthaSettings.js BUILD 001</div>'
);

class DGEGranthaSettings {

    constructor(){

        this.key = "DGE_SETTINGS";

        this.settings = {

            showTransliteration : true,

            showMeaning : true,

            autoExpandCommentary : true,

            fontScale : 100

        };

        this.load();

    }

    load(){

        try{

            const saved = JSON.parse(
                localStorage.getItem(this.key)
            );

            if(saved){

                Object.assign(this.settings,saved);

            }

        }catch(e){}

    }

    save(){

        localStorage.setItem(

            this.key,

            JSON.stringify(this.settings)

        );

    }

    get(name){

        return this.settings[name];

    }

    set(name,value){

        this.settings[name]=value;

        this.save();

    }

}

window.DGEGranthaSettings =
new DGEGranthaSettings();
