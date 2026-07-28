// granthaApp.js
// Bootstrap for Digital Grantha Engine

import {
    appConfig,
    jsonFileName,
    state,
    els
} from "./granthaConfig.js";

import {
    applyDarkMode,
    applyFontSize,
    applyScript
} from "./granthaUI.js";

export function restorePreferences() {

    applyDarkMode(
        localStorage.getItem("app_darkMode") === "true"
    );

    const savedFont =
        parseInt(localStorage.getItem("app_fontSize"), 10);

    if (!isNaN(savedFont)) {
        applyFontSize(savedFont);
    }

    const savedScript =
        localStorage.getItem("app_script");

    if (savedScript) {
        applyScript(savedScript);
    }

}

export async function loadGrantha() {

    restorePreferences();

    const response = await fetch(jsonFileName);

    if (!response.ok) {
        throw new Error(
            `Could not find ${jsonFileName}`
        );
    }

    state.stotraData = await response.json();

    return state.stotraData;

}

export async function startApp(initCallback) {

    try {

        await loadGrantha();

        if (typeof initCallback === "function") {
            initCallback();
        }

    }
    catch (err) {

        const title =
            document.getElementById("stotraTitle");

        if (title) {
            title.innerText = "Data Not Found";
        }

        if (els.readingCard) {
            els.readingCard.innerText =
                `Error: Please ensure '${jsonFileName}' is available in your repository.`;
        }

        console.error(err);

    }

}
