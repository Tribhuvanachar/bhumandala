/* ==========================================================================
 * DGE · Ashtadhyayi module  (additive, non-destructive)  v1.1.0
 *
 * Blended Read⇄Compare UI for the Paninian sutrapatha + commentary layers
 * (Kashika / Balamanorama / Tattvabodhini / Nyasa), with a REAL Gemini
 * (bring-your-own-key) tutor grounded on the open commentaries.
 *
 * Data source is pluggable:
 *   - if window.DGE_SAMPLE = {rows:[{id,sutra,kashika,balamanorama,...}]} is
 *     present (the self-contained preview), data is served from memory;
 *   - otherwise each layer is fetched lazily from
 *     data/vyakarana/ashtadhyayi/<folder>/data.json  (sutrapatha eagerly).
 *
 * Preferences + Gemini key persist to localStorage on the real site; in
 * preview mode (window.DGE_INMEM) they live only in memory.
 * Reuses window.Sanscript for transliteration if present. Touches no other
 * DGE js/*.js logic.
 * ========================================================================== */
(function () {
  "use strict";
  var BASE = "data/vyakarana/ashtadhyayi/";
  var META = {
    kashika:      {t:"काशिकावृत्तिः", sub:"Kāśikā-vṛtti", who:"Vāmana–Jayāditya", tag:"var(--k)", role:"tika"},
    balamanorama: {t:"बालमनोरमा", sub:"Bāla-manoramā", who:"Vāsudeva Dīkṣita", tag:"var(--b)", role:"tippani"},
    tattvabodhini:{t:"तत्त्वबोधिनी", sub:"Tattva-bodhinī", who:"Jñānendra Sarasvatī", tag:"var(--t)", role:"tippani"},
    nyasa:        {t:"न्यासः", sub:"Kāśikāvivaraṇapañjikā", who:"Jinendrabuddhi", tag:"var(--n)", role:"tippani"}
  };
  var ORDER = ["kashika","balamanorama","tattvabodhini","nyasa"];
  var INMEM = !!window.DGE_INMEM || !!window.DGE_SAMPLE;

  var LS = {
    get: function(k, d){ try { if(INMEM) return (mem[k]!==undefined?mem[k]:d); var v=localStorage.getItem("dge.ash."+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
    set: function(k, v){ try { if(INMEM){mem[k]=v;return;} localStorage.setItem("dge.ash."+k, JSON.stringify(v)); }catch(e){} }
  };
  var mem = {};

  var state = {
    sutras: [], byId: {}, layers: {}, idx: 0,
    enabled: LS.get("enabled", {kashika:true, balamanorama:true, tattvabodhini:false, nyasa:false}),
    script: LS.get("script", "devanagari"),
    mode: LS.get("mode", "read"),
    font: LS.get("font", 17),
    collapsed: {}
  };

  function $(s, r){ return (r||document).querySelector(s); }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  function devnum(n){ var m={0:"०",1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९"};
    return String(n).split("").map(function(d){return m[d]||d;}).join(""); }
  function tl(t){ if(state.script==="devanagari"||!window.Sanscript) return t;
    try{ return window.Sanscript.t(t,"devanagari",state.script);}catch(e){return t;} }
  function iast(t){ try{ return window.Sanscript?window.Sanscript.t(t,"devanagari","iast"):"";}catch(e){return "";} }
  function fetchJSON(u){ return fetch(u).then(function(r){ if(!r.ok) throw new Error(u+" "+r.status); return r.json(); }); }

  /* ---------- data source ---------- */
  function loadSutrapatha(){
    if (window.DGE_SAMPLE){
      state.sutras = window.DGE_SAMPLE.rows.map(function(r){ return {id:r.id, sanskrit_text:r.sutra}; });
      state.sutras.forEach(function(it){ state.byId[it.id]=it; });
      // build all layers in memory
      ORDER.forEach(function(f){
        var L = state.layers[f] = {loaded:true, loading:false, byId:{}};
        window.DGE_SAMPLE.rows.forEach(function(r){ if(r[f]) L.byId[r.id]={id:r.id, sanskrit_text:r[f]}; });
      });
      return Promise.resolve();
    }
    return fetchJSON(BASE+"sutrapatha/data.json").then(function(d){
      state.sutras = d.items||[];
      state.sutras.forEach(function(it){ state.byId[it.id]=it; });
    });
  }
  function ensureLayer(folder){
    var L = state.layers[folder];
    if (L && (L.loaded||L.loading)) return L.promise||Promise.resolve(L);
    L = state.layers[folder] = {loaded:false, loading:true, byId:{}};
    L.promise = fetchJSON(BASE+folder+"/data.json").then(function(d){
      (d.items||[]).forEach(function(it){ L.byId[it.id]=it; });
      L.loaded=true; L.loading=false; return L;
    }).catch(function(e){ L.loading=false; L.error=e; return L; });
    return L.promise;
  }

  /* ---------- render ---------- */
  function renderHero(){
    var row = state.sutras[state.idx]; if(!row) return;
    var p = row.id.split(".");
    $("#dge-a").textContent = tl(devnum(p[0]));
    $("#dge-p").textContent = tl(devnum(p[1]));
    $("#dge-s").textContent = tl(devnum(p[2]));
    $("#dge-hnum").textContent = row.id;
    $("#dge-hpos").textContent = "#"+(state.idx+1);
    $("#dge-htotal").textContent = state.sutras.length.toLocaleString();
    var hs=$("#dge-hsutra"); hs.textContent=tl(row.sanskrit_text); hs.className="sutra "+(state.script==="iast"?"":"deva");
    $("#dge-hsutraIt").textContent = iast(row.sanskrit_text);
    $("#dge-prevT").textContent = state.idx>0?tl(state.sutras[state.idx-1].sanskrit_text):"—";
    $("#dge-nextT").textContent = state.idx<state.sutras.length-1?tl(state.sutras[state.idx+1].sanskrit_text):"—";
  }
  function cardHTML(folder){
    var m=META[folder], row=state.sutras[state.idx], L=state.layers[folder];
    var col = (state.mode==="compare")?false:!!state.collapsed[folder];
    var body, hasText=false;
    if(!L||(!L.loaded&&L.loading)) body='<span class="dge-skel"></span><span class="dge-skel"></span><span class="dge-skel" style="width:70%"></span>';
    else if(L&&L.error) body='<span class="dge-more">could not load '+folder+'</span>';
    else { var it=L&&L.byId[row.id]; if(it){body=esc(tl(it.sanskrit_text));hasText=true;} else body='<span class="dge-more">— no '+m.sub+' on this sutra —</span>'; }
    var lic = (L&&L.byId[row.id])?('source: '+folder+'.dict · '+m.role+' · ref → sutrapatha/'+row.id):'';
    return '<article class="dge-card '+(col?'collapsed':'')+'" data-c="'+folder+'" style="--tag:'+m.tag+'">'
      +'<div class="dge-head" data-h="'+folder+'">'
      +'<span class="t '+(state.script==="iast"?"":"deva")+'">'+tl(m.t)+'</span>'
      +'<span class="sub">'+m.sub+'</span><span class="who">'+m.who+'</span>'
      +(hasText?'<button class="dge-copy" data-copy="'+folder+'" title="copy">⧉</button>':'')
      +'<span class="caret">▾</span></div>'
      +'<div class="dge-body" style="font-size:'+state.font+'px">'
      +'<div class="'+(state.script==="iast"?"":"deva")+'">'+body+'</div>'
      +(lic?'<span class="dge-lic">'+lic+'</span>':'')+'</div></article>';
  }
  function renderLayers(){
    var box=$("#dge-layers"); box.className="dge-layers "+state.mode;
    var active=ORDER.filter(function(k){return state.enabled[k];});
    if(!active.length){ box.innerHTML='<div class="dge-empty">No layers selected — tap a chip above.</div>'; return; }
    box.innerHTML=active.map(cardHTML).join("");
    box.querySelectorAll(".dge-head").forEach(function(h){
      h.addEventListener("click",function(e){
        if(e.target.classList.contains("dge-copy")) return;
        if(state.mode==="compare") return;
        var k=h.dataset.h; state.collapsed[k]=!state.collapsed[k]; h.parentElement.classList.toggle("collapsed");
      });
    });
    box.querySelectorAll(".dge-copy").forEach(function(b){
      b.addEventListener("click",function(e){
        e.stopPropagation();
        var f=b.dataset.copy, L=state.layers[f], it=L&&L.byId[state.sutras[state.idx].id];
        if(it&&navigator.clipboard){ navigator.clipboard.writeText(it.sanskrit_text); b.textContent="✓"; setTimeout(function(){b.textContent="⧉";},900); }
      });
    });
  }
  function renderAll(){ renderHero(); renderLayers(); syncChips(); }
  function syncChips(){
    document.querySelectorAll("#dge-chips .dge-chip").forEach(function(c){
      if(c.classList.contains("pending")) return;
      var on=!!state.enabled[c.dataset.c]; c.classList.toggle("on",on); c.classList.toggle("off",!on);
    });
  }
  function go(i){ if(i<0||i>=state.sutras.length) return; state.idx=i; renderAll(); window.scrollTo({top:0,behavior:"smooth"}); }

  /* ---------- Gemini (BYOK) ---------- */
  function getKey(){ return LS.get("gkey",""); }
  function setKey(k){ LS.set("gkey",k); }
  function getModel(){ return LS.get("gmodel","gemini-2.0-flash"); }
  function buildPrompt(question, lang){
    var row=state.sutras[state.idx];
    var open=ORDER.filter(function(k){return state.enabled[k]&&state.layers[k]&&state.layers[k].byId[row.id];});
    var ctx=open.map(function(k){ return "### "+META[k].sub+" ("+META[k].who+")\n"+state.layers[k].byId[row.id].sanskrit_text; }).join("\n\n");
    if(!ctx) ctx="(no commentary layers are currently open)";
    var langLine={en:"Answer in clear English.",kn:"Answer in Kannada (ಕನ್ನಡ).",sa:"Answer in simple Sanskrit (संस्कृतम्)."}[lang]||"Answer in clear English.";
    return [
      "You are a precise Pāṇinian-grammar tutor for the sutra "+row.id+": “"+row.sanskrit_text+"”.",
      "Use ONLY the commentary passages below as your source. If they do not answer the question, say so plainly — do not invent.",
      "When you make a claim, quote the short Sanskrit phrase you rely on. Be concise and pedagogical.",
      langLine,
      "",
      "=== OPEN COMMENTARIES ===",
      ctx,
      "",
      "=== QUESTION ===",
      question
    ].join("\n");
  }
  function askGemini(prompt){
    var key=getKey(); if(!key) return Promise.reject(new Error("NO_KEY"));
    var url="https://generativelanguage.googleapis.com/v1beta/models/"+getModel()+":generateContent?key="+encodeURIComponent(key);
    return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:800}})})
      .then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error((j.error&&j.error.message)||("HTTP "+r.status)); return j; }); })
      .then(function(j){ var c=j.candidates&&j.candidates[0]; return (c&&c.content&&c.content.parts||[]).map(function(p){return p.text;}).join("")||"(empty response)"; });
  }
  var aiLang="en";
  function runAI(question){
    var out=$("#dge-aiAns");
    out.className="dge-ans"; out.textContent="Thinking…";
    if(!getKey()){ out.innerHTML='No Gemini key yet. <a href="#" id="dge-openkey">Add your API key</a> (stored only in your browser). Get one free at aistudio.google.com/apikey.';
      var lk=$("#dge-openkey"); if(lk) lk.addEventListener("click",function(e){e.preventDefault();openSettings();}); return; }
    askGemini(buildPrompt(question,aiLang)).then(function(txt){
      out.className="dge-ans "+(aiLang==="en"?"":"deva"); out.textContent=txt;
    }).catch(function(e){
      out.className="dge-ans";
      out.textContent = e.message==="NO_KEY" ? "Add your Gemini key in settings." : ("Gemini error: "+e.message);
    });
  }

  /* ---------- settings modal ---------- */
  function openSettings(){ var m=$("#dge-settings"); if(m){ $("#dge-keyInput").value=getKey(); $("#dge-modelSel").value=getModel(); m.classList.add("open"); $("#dge-backdrop").classList.add("open"); } }
  function closeAll(){ $("#dge-drawer").classList.remove("open"); var s=$("#dge-settings"); if(s)s.classList.remove("open"); $("#dge-backdrop").classList.remove("open"); }

  /* ---------- wire ---------- */
  function wire(){
    $("#dge-chips").addEventListener("click",function(e){
      var c=e.target.closest(".dge-chip"); if(!c||c.classList.contains("pending"))return;
      var k=c.dataset.c; state.enabled[k]=!state.enabled[k]; LS.set("enabled",state.enabled);
      c.classList.toggle("on",state.enabled[k]); c.classList.toggle("off",!state.enabled[k]);
      if(state.enabled[k]){ renderLayers(); ensureLayer(k).then(renderLayers); } else renderLayers();
    });
    $("#dge-modeSeg").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b)return;
      [].forEach.call(e.currentTarget.children,function(x){x.classList.remove("on");}); b.classList.add("on");
      state.mode=b.dataset.m; LS.set("mode",state.mode); renderLayers(); });
    $("#dge-scriptSeg").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b)return;
      [].forEach.call(e.currentTarget.children,function(x){x.classList.remove("on");}); b.classList.add("on");
      state.script=b.dataset.s; LS.set("script",state.script); renderAll(); });
    $("#dge-themeBtn").addEventListener("click",function(){ var d=document.body.classList.toggle("dark"); LS.set("dark",d); });
    $("#dge-fontUp").addEventListener("click",function(){ state.font=Math.min(26,state.font+1); LS.set("font",state.font); renderLayers(); });
    $("#dge-fontDn").addEventListener("click",function(){ state.font=Math.max(13,state.font-1); LS.set("font",state.font); renderLayers(); });
    $("#dge-expand").addEventListener("click",function(){ ORDER.forEach(function(k){state.collapsed[k]=false;}); renderLayers(); });
    $("#dge-collapse").addEventListener("click",function(){ if(state.mode!=="compare"){ORDER.forEach(function(k){state.collapsed[k]=true;}); renderLayers();} });
    $("#dge-prevBtn").addEventListener("click",function(){ go(state.idx-1); });
    $("#dge-nextBtn").addEventListener("click",function(){ go(state.idx+1); });
    var jump=$("#dge-jump");
    if(jump) jump.addEventListener("change",function(){ var v=jump.value.trim(); if(state.byId[v]) go(state.sutras.indexOf(state.byId[v])); });
    document.addEventListener("keydown",function(e){
      if(/INPUT|TEXTAREA/.test((e.target.tagName||""))) return;
      if(e.key==="ArrowRight") go(state.idx+1);
      else if(e.key==="ArrowLeft") go(state.idx-1);
    });
    // AI
    $("#dge-aiBtn").addEventListener("click",function(){ $("#dge-drawer").classList.add("open"); $("#dge-backdrop").classList.add("open"); });
    $("#dge-aiClose").addEventListener("click",closeAll);
    $("#dge-backdrop").addEventListener("click",closeAll);
    $("#dge-aiSend").addEventListener("click",function(){ var q=$("#dge-aiInput").value.trim(); if(q) runAI(q); });
    $("#dge-aiInput").addEventListener("keydown",function(e){ if(e.key==="Enter"){ var q=e.target.value.trim(); if(q) runAI(q);} });
    document.querySelectorAll("#dge-drawer [data-preset]").forEach(function(b){ b.addEventListener("click",function(){ runAI(b.dataset.preset); }); });
    document.querySelectorAll("#dge-drawer [data-lang]").forEach(function(b){ b.addEventListener("click",function(){
      aiLang=b.dataset.lang; document.querySelectorAll("#dge-drawer [data-lang]").forEach(function(x){x.classList.remove("on");}); b.classList.add("on"); }); });
    // settings
    var gear=$("#dge-gear"); if(gear) gear.addEventListener("click",openSettings);
    var sv=$("#dge-keySave"); if(sv) sv.addEventListener("click",function(){ setKey($("#dge-keyInput").value.trim()); LS.set("gmodel",$("#dge-modelSel").value); closeAll(); });
    var cl=$("#dge-keyClear"); if(cl) cl.addEventListener("click",function(){ setKey(""); $("#dge-keyInput").value=""; });
    var sc=$("#dge-setClose"); if(sc) sc.addEventListener("click",closeAll);
  }

  function applyPrefs(){
    if(LS.get("dark",false)) document.body.classList.add("dark");
    var ms=$("#dge-modeSeg"); if(ms) ms.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on",b.dataset.m===state.mode); });
    var ss=$("#dge-scriptSeg"); if(ss) ss.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on",b.dataset.s===state.script); });
  }
  function boot(){
    wire(); applyPrefs();
    loadSutrapatha().then(function(){
      if(!state.sutras.length){ $("#dge-hsutra").textContent="(no sutra data found)"; return; }
      var dl=$("#dge-sutralist");
      if(dl) dl.innerHTML = state.sutras.map(function(s){ return '<option value="'+s.id+'">'; }).join("");
      renderAll();
      ORDER.forEach(function(k){ if(state.enabled[k]) ensureLayer(k).then(renderLayers); });
    }).catch(function(e){ $("#dge-hsutra").textContent="Failed to load sutrapatha data."; console.error("[ashtadhyayi]",e); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
