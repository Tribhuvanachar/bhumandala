/*
=========================================================
Digital Grantha Engine
ai.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const AIEngine = {

    enabled: true,

    history: [],

    maxHistory: 50,

    currentContext: null,

    init() {

        DGE.log("AI Engine Ready");

    },

    setContext(context) {

        this.currentContext = context;

    },

    buildContext(granthaId, verseNo) {

        let context = {

            grantha: granthaId,

            verse: verseNo,

            verseData: null,

            commentary: "",

            notes: ""

        };

        if (

            DGE.data &&

            DGE.data[verseNo]

        ) {

            context.verseData =

                DGE.data[verseNo];

        }

        if (

            window.CommentaryEngine

        ) {

            context.commentary =

                CommentaryEngine.get(

                    granthaId,

                    verseNo

                );

        }

        if (

            window.NotesEngine

        ) {

            context.notes =

                NotesEngine.get(

                    granthaId,

                    verseNo

                );

        }

        return context;

    },

    ask(question, granthaId, verseNo) {

        const context =

            this.buildContext(

                granthaId,

                verseNo

            );

        this.currentContext = context;

        this.history.push({

            question,

            context,

            time: Date.now()

        });

        if (

            this.history.length >

            this.maxHistory

        ) {

            this.history.shift();

        }

        DGE.log(

            "AI Question : " +

            question

        );

        return {

            success: true,

            prompt:

                this.buildPrompt(

                    question,

                    context

                )

        };

    },

    buildPrompt(

        question,

        context

    ) {

        let prompt = "";

        prompt +=

        "You are an expert Acharya.\n\n";

        prompt +=

        "Grantha:\n";

        prompt +=

        JSON.stringify(

            context.verseData,

            null,

            2

        );

        prompt +=

        "\n\nCommentary:\n";

        prompt +=

        context.commentary;

        prompt +=

        "\n\nNotes:\n";

        prompt +=

        context.notes;

        prompt +=

        "\n\nQuestion:\n";

        prompt +=

        question;

        return prompt;

    },

    clearHistory() {

        this.history = [];

    },

    exportHistory() {

        return JSON.stringify(

            this.history,

            null,

            2

        );

    },

    historyCount() {

        return this.history.length;

    }

};

window.AIEngine = AIEngine;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        AIEngine.init();

    }

);

})();
