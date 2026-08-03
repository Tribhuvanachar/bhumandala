const VERSION='0.2.0';
const log=t=>document.getElementById('log').textContent+=t+'\n';
inspectBtn.onclick=()=>{
 const f=pdfFile.files[0];
 if(!f){alert('Select a PDF');return;}
 log('Version : '+VERSION);
 log('Name    : '+f.name);
 log('Size    : '+f.size+' bytes');
 log('Type    : '+f.type);
 log('Status  : Ready for PDF.js rendering (next module)');
};
console.log('DGE Convert',VERSION);
