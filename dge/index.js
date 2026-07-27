/*
=========================================================
Digital Grantha Engine
Startup
=========================================================
*/

(async () => {

    try {

        await DGEGranthaManager.start();

        const dataset =
            DGEDatasetAdapter.load(
                DGEGranthaManager.getDataset()
            );

        DGEGranthaReader.initialize();

        DGEGranthaReader.load(dataset);

        DGEGranthaNavigator.initialize(
            DGEGranthaReader
        );

        GranthaSearch.initialize(dataset);

        GranthaAudio.initialize("audioPlayer");

        GranthaAudio.load(dataset);

        GranthaNotes.initialize();

        GranthaBookmarks.initialize();

        GranthaCommentary.initialize(dataset);

        const title =
            document.getElementById(
                "granthaTitle"
            );

        if (title) {

            title.textContent =
                DGEGranthaManager.getTitle();

        }

        console.log("DGE Ready");

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

})();
