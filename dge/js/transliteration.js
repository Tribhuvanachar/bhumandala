"use strict";

(function(){

if(!window.DGE)
    throw new Error(
        "DGE core must be loaded first."
    );

const Transliteration={

    current:"devanagari",

    cache:new Map(),

    schemes:[
        "devanagari",
        "kannada",
        "telugu",
        "tamil",
        "malayalam",
        "iast"
    ],

    init(){

        this.current=

            localStorage.getItem(

                "app_script"

            ) ||

            "devanagari";

    },

    setScheme(name){

        if(
            !this.supported(name)
        )
            return false;

        this.current=name;

        localStorage.setItem(

            "app_script",

            name

        );

        this.cache.clear();

        DGE.emit(

            "script:changed",

            name

        );

        return true;

    },

    getScheme(){

        return this.current;

    },

    transliterate(text){

        return this.convert(

            text,

            this.current

        );

    },

    convert(

        html,

        scheme

    ){

        if(

            !html ||

            scheme==="devanagari"

        )

            return html;

        const key=

            scheme+

            "::"+

            html;

        if(

            this.cache.has(key)

        )

            return this.cache.get(

                key

            );

        const result=

            this.safeHTML(

                html,

                scheme

            );

        this.cache.set(

            key,

            result

        );

        return result;

    },

    safeHTML(

        html,

        scheme

    ){

        if(

            typeof Sanscript===

            "undefined"

        ){

            console.error(

                "Sanscript not loaded."

            );

            return html;

        }

        const root=

            document.createElement(

                "div"

            );

        root.innerHTML=html;

        this.walk(

            root,

            scheme

        );

        return root.innerHTML;

    },

    walk(

        node,

        scheme

    ){

        node.childNodes.forEach(

            child=>{

                if(

                    child.nodeType===

                    Node.TEXT_NODE

                ){

                    child.textContent=

                        this.convertText(

                            child.textContent,

                            scheme

                        );

                }

                else{

                    this.walk(

                        child,

                        scheme

                    );

                }

            }

        );

    },

    convertText(

        text,

        scheme

    ){

        if(

            !text ||

            !text.trim()

        )

            return text;

        try{

            return Sanscript.t(

                text.normalize(

                    "NFC"

                ),

                "devanagari",

                scheme

            );

        }

        catch(err){

            console.error(

                err

            );

            return text;

        }

    },

    applyToElement(

        element,

        scheme=this.current

    ){

        if(!element)
            return;

        element.innerHTML=

            this.convert(

                element.innerHTML,

                scheme

            );

    },

    applyToSelector(

        selector,

        scheme=this.current

    ){

        document

            .querySelectorAll(

                selector

            )

            .forEach(

                el=>{

                    this.applyToElement(

                        el,

                        scheme

                    );

                }

            );

    },

    refresh(){

        DGE.emit(

            "transliteration:before",

            this.current

        );

        /*
         * Rendering module should redraw
         * the current grantha using the
         * selected script instead of
         * repeatedly transliterating
         * already-transliterated DOM.
         */

        if(

            DGE.Render &&

            typeof DGE.Render.render==="function"

        ){

            DGE.Render.render();

        }

        DGE.emit(

            "transliteration:after",

            this.current

        );

    },

    clearCache(){

        this.cache.clear();

    },

    normalize(text){

        if(

            typeof text!==

            "string"

        )

            return text;

        return text.normalize(

            "NFC"

        );

    },

    supported(name){

        return this.schemes.includes(

            String(name)

                .toLowerCase()

        );

    },

    registerScheme(name){

        name=

            String(name)

            .toLowerCase();

        if(

            !this.schemes.includes(

                name

            )

        ){

            this.schemes.push(

                name

            );

        }

    },

    destroy(){

        this.clearCache();

    }

};

DGE.Transliteration=

    Transliteration;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Transliteration.init();

    }

);

})();














 
