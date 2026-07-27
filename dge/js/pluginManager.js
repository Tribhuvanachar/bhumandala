/*
=========================================================
Digital Grantha Engine
pluginManager.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function () {

"use strict";

const PluginManager = {

    plugins: new Map(),

    enabled: new Set(),

    initialized: false,

    register(plugin) {

        if (!plugin)
            return false;

        if (!plugin.id)
            return false;

        if (this.plugins.has(plugin.id)) {

            DGE.log("Plugin Exists : " + plugin.id);

            return false;

        }

        plugin.version =
            plugin.version || "1.0.0";

        plugin.enabled = true;

        plugin.loaded = false;

        plugin.started = false;

        plugin.dependencies =
            plugin.dependencies || [];

        this.plugins.set(

            plugin.id,

            plugin

        );

        DGE.log(

            "Plugin Registered : " +

            plugin.id

        );

        return true;

    },

    unregister(id) {

        this.plugins.delete(id);

        this.enabled.delete(id);

        DGE.log(

            "Plugin Removed : " +

            id

        );

    },

    get(id) {

        return this.plugins.get(id);

    },

    enable(id) {

        const plugin = this.get(id);

        if (!plugin)
            return;

        plugin.enabled = true;

        this.enabled.add(id);

        DGE.log(

            "Plugin Enabled : " +

            id

        );

    },

    disable(id) {

        const plugin = this.get(id);

        if (!plugin)
            return;

        plugin.enabled = false;

        this.enabled.delete(id);

        DGE.log(

            "Plugin Disabled : " +

            id

        );

    },

    async initialize() {

        if (this.initialized)
            return;

        for (const plugin of this.plugins.values()) {

            if (!plugin.enabled)
                continue;

            if (typeof plugin.init === "function") {

                try {

                    await plugin.init();

                    plugin.loaded = true;

                    DGE.log(

                        "Initialized : " +

                        plugin.id

                    );

                }

                catch (e) {

                    console.error(e);

                    DGE.log(

                        "Initialization Failed : " +

                        plugin.id

                    );

                }

            }

        }

        this.initialized = true;

    },

    async start() {

        for (const plugin of this.plugins.values()) {

            if (!plugin.enabled)
                continue;

            if (!plugin.loaded)
                continue;

            if (typeof plugin.start === "function") {

                try {

                    await plugin.start();

                    plugin.started = true;

                    DGE.log(

                        "Started : " +

                        plugin.id

                    );

                }

                catch (e) {

                    console.error(e);

                }

            }

        }

    },

    async stop() {

        for (const plugin of this.plugins.values()) {

            if (!plugin.started)
                continue;

            if (typeof plugin.stop === "function") {

                try {

                    await plugin.stop();

                    plugin.started = false;

                }

                catch (e) {

                    console.error(e);

                }

            }

        }

    },

    list() {

        return Array.from(

            this.plugins.keys()

        );

    },

    info() {

        return Array.from(

            this.plugins.values()

        ).map(plugin => ({

            id: plugin.id,

            version: plugin.version,

            enabled: plugin.enabled,

            loaded: plugin.loaded,

            started: plugin.started

        }));

    }

};

window.PluginManager = PluginManager;

document.addEventListener(

    "DOMContentLoaded",

    async function () {

        PluginManager.register({

            id: "engine",

            version: "10.1.0",

            init() {

                DGE.log(

                    "Engine Plugin Ready"

                );

            }

        });

        PluginManager.register({

            id: "audio",

            init() {

                DGE.log(

                    "Audio Plugin Ready"

                );

            }

        });

        PluginManager.register({

            id: "search",

            init() {

                DGE.log(

                    "Search Plugin Ready"

                );

            }

        });

        PluginManager.register({

            id: "render",

            init() {

                DGE.log(

                    "Render Plugin Ready"

                );

            }

        });

        PluginManager.register({

            id: "notes",

            init() {

                DGE.log(

                    "Notes Plugin Ready"

                );

            }

        });

        PluginManager.register({

            id: "commentary",

            init() {

                DGE.log(

                    "Commentary Plugin Ready"

                );

            }

        });

        await PluginManager.initialize();

        await PluginManager.start();

    }

);

})();
