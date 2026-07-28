"use strict";

/*=============================================================================
 Digital Grantha Engine
 Transliteration Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Transliteration={

    scheme:"iast",

    schemes:[

        "iast",
        "devanagari",
        "kannada",
        "telugu",
        "tamil",
        "malayalam"

    ],

    init(){

        return this;

    },

    current(){

        return this.scheme;

    },

    set(name){

        if(

            this.schemes.includes(name)

        ){

            this.scheme=name;

            DGE.emit(

                "transliteration:change",

                name

            );

        }

    },

    list(){

        return [

            ...this.schemes

        ];

    },
    convert(text,target=null){

        target=target||this.scheme;

        if(typeof text!=="string")

            return "";

        switch(target){

            case "iast":
                return text;

            case "devanagari":
                return this.toDevanagari(text);

            case "kannada":
                return this.toKannada(text);

            case "telugu":
                return this.toTelugu(text);

            case "tamil":
                return this.toTamil(text);

            case "malayalam":
                return this.toMalayalam(text);

            default:
                return text;

        }

    },

    toDevanagari(text){

        return text;

    },

    toKannada(text){

        return text;

    },

    toTelugu(text){

        return text;

    },
    toTamil(text){

        return text;

    },

    toMalayalam(text){

        return text;

    },

    supported(name){

        return this.schemes.includes(

            String(name)

        );

    },

    destroy(){

        /* Reserved */

    }

};

DGE.Transliteration=Transliteration;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Transliteration.init();

    }

);

})();













    
















    
