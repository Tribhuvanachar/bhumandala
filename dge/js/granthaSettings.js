/*
=========================================================
Digital Grantha Engine
Grantha Settings
Build 002
=========================================================
*/

document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="background:#607D8B;color:#fff;padding:6px;font-family:monospace">granthaSettings.js BUILD 002</div>'
);

class DGEGranthaSettings {

    constructor(){

        this.key="DGE_SETTINGS";

        this.defaults={

            showTransliteration:true,

            showMeaning:true,

            autoExpandCommentary:true,

            rememberLastVerse:true,

            darkMode:false,

            fontScale:100

        };

        this.settings={...this.defaults};

        this.load();

    }

    load(){

        try{

            const saved=JSON.parse(
                localStorage.getItem(this.key)
            );

            if(saved){

                Object.assign(
                    this.settings,
                    saved
                );

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

    reset(){

        this.settings={...this.defaults};

        this.save();

    }

}

window.DGEGranthaSettings=
new DGEGranthaSettings();
