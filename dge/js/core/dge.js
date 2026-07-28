"use strict";

/*=============================================================================
 Digital Grantha Engine
 Core
=============================================================================*/

(function () {

if (window.DGE)
    return;

const DGE = {

    version: "10.1.0",

    build: "alpha",

    initialized: false,

    modules: {},

    services: {},

    state: {},

    cache: {},

    events: {},

    async init() {

        if (this.initialized)
            return;

        console.info("[DGE] Initializing...");

        if (this.Config)
            await this.Config.init();

        if (this.Data)
            await this.Data.load();

        this.initialized = true;

        this.emit("engine:ready");

        console.info("[DGE] Ready.");

    },

    register(name, module) {

        this.modules[name] = module;

        return module;

    },

    service(name, object) {

        this.services[name] = object;

        return object;

    },

    module(name) {

        return this.modules[name];

    },

    getService(name) {

        return this.services[name];

    }

};
