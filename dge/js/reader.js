export function renderVerse(el,v){if(!el||!v)return;el.innerHTML=`<article><h2>${v.number||''}</h2><div>${v.sanskrit||''}</div></article>`;}
