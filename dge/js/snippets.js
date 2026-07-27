/*
=========================================================
Digital Grantha Engine
snippets.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const SnippetEngine = {

    current: null,

    init() {

        DGE.log("Snippet Engine Ready");

    },

    build(verse) {

        if (!verse)
            return "";

        let out = "";

        if (verse.number)
            out += "Verse " + verse.number + "\n\n";

        if (verse.sanskrit)
            out += verse.sanskrit + "\n\n";

        if (verse.transliteration)
            out += verse.transliteration + "\n\n";

        if (verse.meaning)
            out += verse.meaning + "\n\n";

        return out.trim();

    },

    setCurrent(verse) {

        this.current = verse;

    },

    copy() {

        if (!this.current)
            return;

        navigator.clipboard.writeText(

            this.build(this.current)

        );

        DGE.log("Snippet Copied");

    },

    copySanskrit() {

        if (!this.current)
            return;

        navigator.clipboard.writeText(

            this.current.sanskrit || ""

        );

        DGE.log("Sanskrit Copied");

    },

    copyMeaning() {

        if (!this.current)
            return;

        navigator.clipboard.writeText(

            this.current.meaning || ""

        );

        DGE.log("Meaning Copied");

    },

    copyTransliteration() {

        if (!this.current)
            return;

        navigator.clipboard.writeText(

            this.current.transliteration || ""

        );

        DGE.log("Transliteration Copied");

    },

    download(filename = "snippet.txt") {

        if (!this.current)
            return;

        const blob = new Blob(

            [this.build(this.current)],

            {

                type: "text/plain"

            }

        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = filename;

        a.click();

        URL.revokeObjectURL(url);

    },

    share() {

        if (!this.current)
            return;

        const text = this.build(this.current);

        if (

            navigator.share

        ) {

            navigator.share({

                title: "Digital Grantha",

                text

            });

        }

        else {

            this.copy();

        }

    },

    exportMarkdown() {

        if (!this.current)
            return "";

        let md = "";

        md += "# Verse\n\n";

        md += this.build(this.current);

        return md;

    },

    exportHTML() {

        if (!this.current)
            return "";

        return "<pre>" +

            this.build(this.current)

            .replace(/</g,"&lt;")

            .replace(/>/g,"&gt;")

            +

            "</pre>";

    }

};

window.SnippetEngine = SnippetEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        SnippetEngine.init();

    }

);

})();
