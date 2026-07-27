/*
=========================================================
Digital Grantha Engine
Startup
Version: 10.1.0 Alpha
=========================================================
*/

(async function () {

    try {

        await GranthaManager.start();

        const dataset = DatasetAdapter.load(
            GranthaManager.getDataset()
        );

        GranthaReader.initialize(
            "readerCard"
        );

        GranthaReader.load(dataset);

        GranthaNavigator.initialize(
            GranthaReader
        );

        GranthaSearch.initialize(
            dataset
        );

        GranthaAudio.initialize(
            "audioPlayer"
        );

        GranthaAudio.load(
            dataset
        );

        GranthaNotes.initialize();

        GranthaBookmarks.initialize();

        GranthaCommentary.initialize(
            dataset
        );

        const title =
            document.getElementById(
                "granthaTitle"
            );

        if (title) {

            title.textContent =
                GranthaManager.getTitle();

        }

        console.log(
            "DGE Started Successfully"
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "DGE Startup Failed.\n\n" +
            error.message
        );

    }

})();
