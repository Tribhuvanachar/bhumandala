/*
====================================================
DGE DEVELOPMENT ROADMAP

1. Load version.json
2. Load granthas.json
3. Load config.json
4. Load dataset
5. Initialize datasetAdapter
6. Initialize granthaReader
7. Initialize granthaNavigator
8. Initialize granthaSearch
9. Initialize granthaAudio
10. Initialize granthaNotes
11. Initialize granthaBookmarks
12. Initialize granthaCommentary

====================================================
*/
import {GranthaManager} from './js/granthaManager.js';
import {normalize} from './js/adapter.js';
import {renderVerse} from './js/reader.js';
(async()=>{
 const gm=new GranthaManager();
 const {config,data}=await gm.loadCurrent();
 document.getElementById('granthaTitle').textContent=config.title||'Digital Grantha Engine';
 const verses=normalize(data);
 if(verses.length) renderVerse(document.getElementById('readerCard'),verses[0]);
})();
