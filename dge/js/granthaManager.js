class DGEGranthaManager {

    async start() {
        console.log("DGE GranthaManager started");
    }

    getDataset() {
        return [];
    }

    getTitle() {
        return "Digital Grantha Engine";
    }

}

window.DGEGranthaManager = new DGEGranthaManager();
