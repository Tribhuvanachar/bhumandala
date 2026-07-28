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

    lastQuery:"",

    lastResults:[],

    options:{

        caseSensitive:false,

        wholeWord:false,

        maxResults:100

    },

    configure(options={}){

        Object.assign(
            this.options,
            options
        );

    },

    search(query){

        this.lastQuery=query;

        if(!query){

            this.lastResults=[];

            return [];

        }

        const verses=DGE.Data.getAll();

        const results=[];

        const searchText=this.options.caseSensitive
            ?query
            :query.toLowerCase();

        for(const verse of verses){

            const body=
                String(
                    verse.text ??
                    verse.verse ??
                    verse.content ??
                    ""
                );

            const candidate=this.options.caseSensitive
                ?body
                :body.toLowerCase();

            if(candidate.includes(searchText)){

                results.push(verse);

            }

            if(results.length>=this.options.maxResults)

                break;

        }

        this.lastResults=results;

        DGE.emit(
            "search:completed",
            results
        );

        return results;

    },

    searchAndRender(query){

        const results=this.search(query);

        DGE.Render.renderSearchResults(
            results
        );

        return results;

    },

    clear(){

        this.lastQuery="";

        this.lastResults=[];

    },

    findByNumber(number){

        const verses=DGE.Data.getAll();

        return verses.find(v=>

            String(
                v.number ??
                v.id
            )===String(number)

        ) || null;

    },

    searchTitle(query){

        if(!query)
            return [];

        const verses=DGE.Data.getAll();

        const q=this.options.caseSensitive
            ?query
            :query.toLowerCase();

        return verses.filter(v=>{

            const title=String(
                v.title ?? ""
            );

            const value=this.options.caseSensitive
                ?title
                :title.toLowerCase();

            return value.includes(q);

        });

    },

    searchMetadata(field,value){

        const verses=DGE.Data.getAll();

        return verses.filter(v=>

            String(v[field] ?? "")
                .toLowerCase()
                .includes(
                    String(value)
                    .toLowerCase()
                )

        );

    },

    searchRegex(pattern,flags="i"){

        const regex=new RegExp(
            pattern,
            flags
        );

        return DGE.Data.getAll().filter(v=>

            regex.test(

                String(
                    v.text ??
                    v.verse ??
                    ""
                )

            )

        );

    },

    getLastResults(){

        return [...this.lastResults];

    },

    getLastQuery(){

        return this.lastQuery;

    },
    count(query){

        return this.search(query).length;

    },

    exists(query){

        return this.count(query)>0;

    },

    first(query){

        const results=this.search(query);

        return results.length
            ?results[0]
            :null;

    },

    next(currentIndex){

        if(

            currentIndex<0 ||

            currentIndex>=this.lastResults.length-1

        )

            return null;

        return this.lastResults[
            currentIndex+1
        ];

    },

    previous(currentIndex){

        if(currentIndex<=0)

            return null;

        return this.lastResults[
            currentIndex-1
        ];

    },

    destroy(){

        this.clear();

    }

};

DGE.Search=Search;

})();













    












    
