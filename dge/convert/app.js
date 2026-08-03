document.getElementById('saveKeys').onclick=()=>{
localStorage.setItem('vision_api_key',visionKey.value);
localStorage.setItem('gemini_api_key',geminiKey.value);
alert('Keys saved locally');
};
visionKey.value=localStorage.getItem('vision_api_key')||'';
geminiKey.value=localStorage.getItem('gemini_api_key')||'';

runOCR.onclick=()=>alert(`Prototype placeholder. Next version will:
1. Load PDF using PDF.js
2. Render each page to canvas
3. Send page image to Google Vision API
4. Populate OCR JSON/Text`);
proofread.onclick=()=>alert(`Prototype placeholder. Next version will call Gemini and generate DGE JSON.`);
render.onclick=()=>{
 const t=document.getElementById('ocrText').value||'No text yet.';
 preview.textContent=t;
};