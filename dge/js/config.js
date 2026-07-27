class DGEConfig {

    static async load() {

        try {

            const response = await fetch("../assets/config.json");

            const config = await response.json();

            console.log("Config Loaded");

            console.log(config);

            return config;

        }

        catch (e) {

            console.error("Unable to load config.json");

            console.error(e);

            return null;

        }

    }

}
