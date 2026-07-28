/*!
 * Digital Grantha Engine (DGE)
 * Root Namespace
 *
 * Version: 10.1.0-alpha
 * Author: DGE Project
 */

(function (global) {
    "use strict";

    if (global.DGE) {
        console.warn("DGE is already initialized.");
        return;
    }

    const DGE = {

        version: "10.1.0-alpha",

        initialized: false,

        modules: {},

        config: null,

        data: null,

        state: {},

        cache: {},

        services: {},

        events: {},

        registerModule(name, module) {

            if (!name)
                throw new Error("Module name is required.");

            if (this.modules[name]) {
                console.warn(`Module '${name}' already exists.`);
                return;
            }

            this.modules[name] = module;
        },

        getModule(name) {
            return this.modules[name];
        },

        hasModule(name) {
            return Object.prototype.hasOwnProperty.call(this.modules, name);
        },

        registerService(name, service) {

            this.services[name] = service;

        },

        getService(name) {

            return this.services[name];

        },

        on(event, callback) {

            if (!this.events[event])
                this.events[event] = [];

            this.events[event].push(callback);

        },

        emit(event, payload) {

            if (!this.events[event])
                return;

            this.events[event].forEach(cb => cb(payload));

        },

        initialize() {

            if (this.initialized)
                return;

            this.initialized = true;

            console.info(
                `Digital Grantha Engine ${this.version} initialized`
            );

        }

    };

    Object.freeze(DGE.version);

    global.DGE = DGE;

})(window);
