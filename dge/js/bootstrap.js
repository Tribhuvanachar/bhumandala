import {DGEState} from './state.js';
export async function bootstrap(manager,adapter,reader){
const loaded=await manager.loadCurrent();
DGEState.config=loaded.config;
DGEState.data=loaded.data;
const verses=adapter.normalize?adapter.normalize(loaded.data):[];
if(verses.length){
reader.renderVerse(document.getElementById('readerCard'),verses[0]);
}
}
