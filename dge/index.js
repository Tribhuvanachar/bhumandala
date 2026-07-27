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
