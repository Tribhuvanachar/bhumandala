/*
=========================================================
Digital Grantha Engine
events.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const EventBus = {

    listeners: {},

    on(event, callback) {

        if (!this.listeners[event]) {

            this.listeners[event] = [];

        }

        this.listeners[event].push(callback);

        return callback;

    },

    once(event, callback) {

        const wrapper = (...args) => {

            this.off(event, wrapper);

            callback(...args);

        };

        this.on(event, wrapper);

    },

    off(event, callback) {

        if (!this.listeners[event])
            return;

        this.listeners[event] =

            this.listeners[event].filter(

                fn => fn !== callback

            );

    },

    emit(event, data = null) {

        if (!this.listeners[event])
            return;

        this.listeners[event]

        .forEach(listener => {

            try {

                listener(data);

            }

            catch(e){

                console.error(e);

            }

        });

    },

    clear(event = null) {

        if (event) {

            delete this.listeners[event];

            return;

        }

        this.listeners = {};

    },

    has(event) {

        return !!this.listeners[event];

    },

    count(event) {

        if (!this.listeners[event])
            return 0;

        return this.listeners[event].length;

    },

    events() {

        return Object.keys(

            this.listeners

        );

    }

};

window.EventBus = EventBus;

document.addEventListener(

    "DOMContentLoaded",

    function(){

        DGE.log(

            "Event Bus Ready"

        );

        EventBus.emit(

            "dge.ready"

        );

    }

);

})();
