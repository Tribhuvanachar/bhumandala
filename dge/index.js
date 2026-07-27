alert("INDEX BUILD 005");

(async () => {

    await DGEGranthaManager.start();

    alert("GranthaManager OK");

    const dataset =
        DGEDatasetAdapter.load(
            DGEGranthaManager.getDataset()
        );

    alert("Dataset: " + dataset.length);

    DGEGranthaReader.initialize();

    DGEGranthaReader.load(dataset);

    alert("Reader OK");

})();
