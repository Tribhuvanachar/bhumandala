
const V='0.3.0';
const out=t=>log.textContent+=t+'\n';
inspectBtn.onclick=()=>{
 const f=pdfFile.files[0];
 if(!f)return alert('Select PDF');
 const i=DGEPDF.inspect(f);
 out('Version : '+V);
 Object.entries(i).forEach(([k,v])=>out(k+' : '+v));
};
mockRenderBtn.onclick=()=>{
 const f=pdfFile.files[0];
 if(!f)return alert('Select PDF');
 const p=DGEPDF.prepare(f);
 out('--- Render Preparation ---');
 Object.entries(p).forEach(([k,v])=>out(k+' : '+v));
};
console.log('DGE Convert',V);
