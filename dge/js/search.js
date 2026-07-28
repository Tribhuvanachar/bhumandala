"use strict";

/*=============================================================================
 Digital Grantha Engine
 Search Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Search={

    timer:null,

    query:"",

    scope:"all",

    matches:[],

    current:-1,

    debounce:250,

    init(){

        const box=document.getElementById("searchInput");

        if(!box) return;

        box.addEventListener(

            "input",

            ()=>{

                clearTimeout(this.timer);

                this.timer=setTimeout(

                    ()=>{

                        this.search(

                            box.value

                        );

                    },

                    this.debounce

                );

            }

        );

    },

    normalize(text){

        return (text||"")

            .normalize("NFC")

            .toLowerCase()

            .replace(/\s+/g," ")

            .trim();

    },

    search(q){

        this.query=this.normalize(q);

        this.matches=[];

        this.current=-1;

        if(!this.query){

            DGE.emit(

                "search:clear"

            );

            return;

        }

        const data=

            DGE.Data.all();

        if(!Array.isArray(data))

            return;

        data.forEach(

            (item,index)=>{

                if(

                    this.match(

                        item

                    )

                ){

                    this.matches.push(

                        index

                    );

                }

            }

        );

        DGE.emit(

            "search:results",

            {

                query:this.query,

                matches:this.matches

            }

        );

        if(

            this.matches.length

        ){

            this.goto(0);

        }

    },
    match(item){

        if(!item)
            return false;

        const fields=[];

        if(item.sa)
            fields.push(item.sa);

        if(item.sanskrit)
            fields.push(item.sanskrit);

        if(item.title)
            fields.push(item.title);

        if(item.en)
            fields.push(item.en);

        if(item.translation)
            fields.push(item.translation);

        if(item.kn)
            fields.push(item.kn);

        if(item.te)
            fields.push(item.te);

        if(item.ta)
            fields.push(item.ta);

        if(item.ml)
            fields.push(item.ml);

        if(item.commentary){

            if(typeof item.commentary==="string")

                fields.push(item.commentary);

            else{

                Object.values(

                    item.commentary

                ).forEach(

                    value=>{

                        if(value)

                            fields.push(value);

                    }

                );

            }

        }

        return fields.some(

            text=>{

                text=this.normalize(text);

                return text.includes(

                    this.query

                );

            }

        );

    },

    goto(index){

        if(

            !this.matches.length

        )

            return;

        if(index<0)

            index=0;

        if(

            index>=this.matches.length

        )

            index=this.matches.length-1;

        this.current=index;

        const verse=this.matches[index];

        DGE.emit(

            "search:goto",

            {

                verse,

                index,

                total:this.matches.length

            }

        );

    },

    next(){

        if(

            !this.matches.length

        )

            return;

        let i=this.current+1;

        if(

            i>=this.matches.length

        )

            i=0;

        this.goto(i);

    },

    previous(){

        if(

            !this.matches.length

        )

            return;

        let i=this.current-1;

        if(

            i<0

        )

            i=this.matches.length-1;

        this.goto(i);

    },

    clear(){

        this.query="";

        this.matches=[];

        this.current=-1;

        DGE.emit(

            "search:clear"

        );

    },

    resultCount(){

        return this.matches.length;

    },

    activeResult(){

        if(

            this.current<0

        )

            return null;

        return this.matches[

            this.current

        ];

    }

};

DGE.Search=Search;

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Search.init();

    }

);

})();
    setScope(scope){

        this.scope=scope||"all";

    },

    collectFields(item){

        const fields=[];

        switch(this.scope){

            case "mula":

                if(item.sa)
                    fields.push(item.sa);

                if(item.sanskrit)
                    fields.push(item.sanskrit);

                break;

            case "translation":

                if(item.en)
                    fields.push(item.en);

                if(item.translation)
                    fields.push(item.translation);

                break;

            case "commentary":

                if(item.commentary){

                    if(typeof item.commentary==="string")

                        fields.push(item.commentary);

                    else

                        Object.values(

                            item.commentary

                        ).forEach(

                            t=>{

                                if(t)

                                    fields.push(t);

                            }

                        );

                }

                break;

            default:

                [

                    item.sa,
                    item.sanskrit,
                    item.en,
                    item.translation,
                    item.kn,
                    item.te,
                    item.ta,
                    item.ml,
                    item.title

                ].forEach(

                    t=>{

                        if(t)

                            fields.push(t);

                    }

                );

                if(item.commentary){

                    if(typeof item.commentary==="string")

                        fields.push(item.commentary);

                    else

                        Object.values(

                            item.commentary

                        ).forEach(

                            t=>{

                                if(t)

                                    fields.push(t);

                            }

                        );

                }

        }

        return fields;

    },

    match(item){

        return this.collectFields(item)

            .some(

                text=>

                    this.normalize(text)

                    .includes(

                        this.query

                    )

            );

    },

    highlight(text){

        if(

            !this.query ||

            !text

        )

            return text;

        const escaped=

            this.query.replace(

                /[-\/\\^$*+?.()|[\]{}]/g,

                "\\$&"

            );

        return text.replace(

            new RegExp(

                "("+

                escaped+

                ")",

                "ig"

            ),

            "<mark>$1</mark>"

        );

    },

    highlightVerse(verse){

        if(!verse)

            return verse;

        const copy=

            structuredClone(

                verse

            );

        [

            "sa",
            "sanskrit",
            "en",
            "translation",
            "kn",
            "te",
            "ta",
            "ml"

        ].forEach(

            key=>{

                if(copy[key])

                    copy[key]=

                        this.highlight(

                            copy[key]

                        );

            }

        );

        return copy;

    },
    renderResults(){

        if(!DGE.Render)
            return;

        const data=DGE.Data.all();

        if(!Array.isArray(data))
            return;

        DGE.Render.beginSearch();

        this.matches.forEach(

            id=>{

                const verse=this.highlightVerse(

                    data[id]

                );

                DGE.Render.updateVerse(

                    id,

                    verse

                );

            }

        );

        DGE.Render.endSearch();

    },

    goto(index){

        if(!this.matches.length)
            return;

        if(index<0)
            index=0;

        if(index>=this.matches.length)
            index=this.matches.length-1;

        this.current=index;

        const verseId=this.matches[index];

        DGE.emit(

            "search:goto",

            {

                verse:verseId,

                index,

                total:this.matches.length

            }

        );

        this.scrollTo(

            verseId

        );

    },

    scrollTo(id){

        requestAnimationFrame(

            ()=>{

                const el=

                    document.querySelector(

                        `[data-verse="${id}"]`

                    ) ||

                    document.getElementById(

                        "verse-"+id

                    );

                if(!el)
                    return;

                el.scrollIntoView({

                    behavior:"smooth",

                    block:"center"

                });

                document

                    .querySelectorAll(

                        ".dge-search-active"

                    )

                    .forEach(

                        e=>e.classList.remove(

                            "dge-search-active"

                        )

                    );

                el.classList.add(

                    "dge-search-active"

                );

            }

        );

    },

    bindNavigator(){

        const prev=

            document.getElementById(

                "searchPrev"

            );

        const next=

            document.getElementById(

                "searchNext"

            );

        const clear=

            document.getElementById(

                "clearSearchBtn"

            );

        prev?.addEventListener(

            "click",

            ()=>this.previous()

        );

        next?.addEventListener(

            "click",

            ()=>this.next()

        );

        clear?.addEventListener(

            "click",

            ()=>{

                const input=

                    document.getElementById(

                        "searchInput"

                    );

                if(input)

                    input.value="";

                this.clear();

            }

        );

    },

    init(){

        this.bindNavigator();

        const input=

            document.getElementById(

                "searchInput"

            );

        const scope=

            document.getElementById(

                "searchScope"

            );

        input?.addEventListener(

            "input",

            ()=>{

                clearTimeout(

                    this.timer

                );

                this.timer=setTimeout(

                    ()=>{

                        this.search(

                            input.value

                        );

                    },

                    this.debounce

                );

            }

        );

        scope?.addEventListener(

            "change",

            e=>{

                this.setScope(

                    e.target.value

                );

                this.search(

                    input?.value||""

                );

            }

        );

    }
