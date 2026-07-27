window.onerror = function (message, source, line, column, error) {

    const box = document.getElementById("debugLog");

    if (box) {

        box.value +=
            "\n\nERROR: " + message +
            "\nFILE : " + source +
            "\nLINE : " + line +
            "\nCOL  : " + column;

        if (error && error.stack) {

            box.value +=
                "\n\nSTACK:\n" + error.stack;

        }

    }

    return true;

};

function log(message) {

    const box = document.getElementById("debugLog");

    if (box) {

        box.value += message + "\n";

    }

}

log("INDEX STARTED");
