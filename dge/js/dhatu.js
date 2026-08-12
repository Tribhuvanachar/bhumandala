/* ==========================================================================
 * DGE · Dhātupāṭha module (Stage 1)  v1.0.0
 *   Browse/filter/sort the Pāṇinīya Dhātupāṭha (Vidyut, MIT).
 *   Filters: gaṇa (1–10), pada (P/A/U), free-text (धातु / artha / roman).
 *   Multi-script (Sanscript), deep-linkable per root (#code), prefs persisted.
 *   Stage-2 hook: a प्रक्रिया button per root, wired to a placeholder that the
 *   derivation engine (vidyut-prakriya) will fill in.  Touches no other module.
 * ========================================================================== */
(function () {
  "use strict";
  var URL = "data/vyakarana/dhatupatha/data.json";
  var GANA = {1:"भ्वादि",2:"अदादि",3:"जुहोत्यादि",4:"दिवादि",5:"स्वादि",6:"तुदादि",7:"रुधादि",8:"तनादि",9:"क्र्यादि",10:"चुरादि"};
  var CHUNK = 250;

  var LS = {
    get:function(k,d){ try{ var v=localStorage.getItem("dge.dhatu."+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
    set:function(k,v){ try{ localStorage.setItem("dge.dhatu."+k, JSON.stringify(v)); }catch(e){} }
  };
  var state = {
    all:[], view:[], shown:0,
    script: LS.get("script","devanagari"),
    font: LS.get("font",18),
    gana: LS.get("gana",0),      // 0 = all
    pada: LS.get("pada",""),     // "" = all
    set: LS.get("set",""),       // "" = all | "seṭ" | "aniṭ"
    sort: LS.get("sort","code"),
    q:"", openId: LS.get("open",null),
    vset: null   // map of codes that have dhātuvṛtti entries (Mādhavīya/Kṣīra/Dhātupradīpa)
  };

  function $(s,r){ return (r||document).querySelector(s); }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  function tl(t){ if(!t) return t; if(state.script==="devanagari"||!window.Sanscript) return t;
    try{ return window.Sanscript.t(t,"devanagari",state.script);}catch(e){return t;} }
  function iast(t){ try{ return window.Sanscript?window.Sanscript.t(t,"devanagari","iast"):"";}catch(e){return "";} }
  function padaClass(c){ return c==="P"?"var(--p)":c==="A"?"var(--a)":c==="U"?"var(--u)":"var(--muted)"; }
  function hashId(){ return decodeURIComponent((location.hash||"").replace(/^#/,"").trim()); }
  function setHash(id){ try{ if(("#"+id)!==location.hash) history.replaceState(null,"","#"+id); }catch(e){} }

  /* ---------- filter + sort ---------- */
  function recompute(){
    var q=state.q.trim().toLowerCase();
    state.view = state.all.filter(function(it){
      if(state.gana && it.gana!==state.gana) return false;
      if(state.pada && it.pada_code!==state.pada) return false;
      if(state.set && it.set!==state.set) return false;
      if(q && it._hay.indexOf(q)<0) return false;
      return true;
    });
    var s=state.sort;
    state.view.sort(function(a,b){
      if(s==="dhatu") return a.dhatu.localeCompare(b.dhatu,"sa");
      if(s==="gana"){ if(a.gana!==b.gana) return a.gana-b.gana; return a.id.localeCompare(b.id); }
      return a.id.localeCompare(b.id); // code order
    });
    state.shown=0;
    $("#dh-count").textContent = state.view.length.toLocaleString()+" / "+state.all.length.toLocaleString();
  }

  /* ---------- render ---------- */
  function rowHTML(it){
    var devCls = state.script==="iast"?"":"deva";
    var open = (it.id===state.openId);
    var pill = it.pada_code, pdev = tl(it.pada);
    return '<article class="row '+(open?"open":"")+'" id="d-'+it.id+'" data-id="'+it.id+'" style="--tag:'+padaClass(it.pada_code)+'">'
      +'<div class="rhead">'
        +'<span class="rcode">'+it.id+'</span>'
        +'<span class="rdha '+devCls+'">'+esc(tl(it.dhatu))+'</span>'
        +'<span class="rartha '+devCls+'">'+esc(tl(it.artha))+'</span>'
        +'<span class="rpada" style="background:'+padaClass(pill)+'" title="'+it.pada_iast+'">'+esc(pdev)+'</span>'
        +'<span class="rgana '+devCls+'">'+it.gana+' · '+esc(tl(GANA[it.gana]||""))+'</span>'
        +'<span class="rcaret">▸</span>'
      +'</div>'
      +'<div class="rbody">'+ (open?bodyHTML(it):"") +'</div>'
    +'</article>';
  }
  function bodyHTML(it){
    var devCls = state.script==="iast"?"":"deva";
    function kv(k,v){ return '<div class="kv"><div class="kk">'+k+'</div><div class="kvv '+devCls+'">'+v+'</div></div>'; }
    var h="";
    h+=kv("धातु · root", '<b>'+esc(tl(it.dhatu))+'</b> <span style="color:var(--muted)">('+esc(it.dhatu_slp)+')</span> · '+esc(iast(it.dhatu)));
    if(it.meanings && it.meanings.length){
      h+=kv("अर्थाः · meanings <span style='font-size:10px;color:var(--muted)'>("+it.meanings.length+")</span>",
            it.meanings.map(function(m){return '<span class="'+devCls+'">'+esc(tl(m))+'</span>';}).join(" &nbsp;·&nbsp; ")
            +' <span style="font-size:10.5px;color:var(--muted)">— traditional dhātupāṭha</span>');
    } else {
      h+=kv("अर्थः · meaning", esc(tl(it.artha)));
    }
    h+=kv("गणः · class", it.gana+" — "+esc(tl(GANA[it.gana]||"")));
    h+=kv("पदम् · voice", esc(tl(it.pada))+" ("+it.pada_iast+")"+(it.pada_trad?' · <span class="'+devCls+'">'+esc(tl(it.pada_trad))+'</span>':''));
    if(it.set) h+=kv("सेट्/अनिट् · iṭ", '<b>'+(it.set==="seṭ"?"सेट् (seṭ)":it.set==="aniṭ"?"अनिट् (aniṭ)":esc(it.set))+'</b>');
    if(it.anunasika_it) h+=kv("इत् · marker", "anunāsika it (nasal marker present in upadeśa)");
    h+='<div class="acts">'
      +'<a class="btn ai" href="prakriya.html#'+it.id+'">⚙ प्रक्रिया · तिङन्त</a>'
      +'<a class="btn" href="krdanta.html#'+it.id+'">कृदन्त forms</a>'
      +'<a class="btn" href="ashtadhyayi.html" title="open the sūtra reader">↔ अष्टाध्यायी</a>'
      +'</div>'
      +'<div class="stage2" id="s2-'+it.id+'">प्रक्रिया opens the derivation viewer: the tiṅanta paradigm, and each form’s step-by-step derivation with every sūtra linked into the reader (Vidyut engine · run the generator to populate all roots).</div>';
    if(state.vset && state.vset[it.id]){
      h+='<div class="vrit" data-vrit="'+it.id+'"><button class="btn vrit-btn">📜 वृत्तयः · Mādhavīya · Kṣīra · Dhātupradīpa ›</button></div>';
    }
    return h;
  }
  function render(reset){
    var box=$("#dh-list");
    if(reset){ box.innerHTML=""; state.shown=0; }
    if(!state.view.length){ box.innerHTML='<div class="empty">No roots match these filters.</div>'; $("#dh-more").style.display="none"; return; }
    var end=Math.min(state.shown+CHUNK, state.view.length);
    var html="";
    for(var i=state.shown;i<end;i++) html+=rowHTML(state.view[i]);
    box.insertAdjacentHTML("beforeend", html);
    state.shown=end;
    $("#dh-more").style.display = state.shown<state.view.length ? "block" : "none";
    $("#dh-more").textContent = "show more ▾  ("+(state.view.length-state.shown).toLocaleString()+" left)";
  }
  function rerender(){ recompute(); render(true); }

  /* ---------- interactions ---------- */
  function toggleRow(id){
    var it=state.all.find(function(x){return x.id===id;}); if(!it) return;
    var el=$("#d-"+CSS.escape(id)); if(!el) return;
    var wasOpen=el.classList.contains("open");
    // close previous
    if(state.openId && state.openId!==id){ var prev=$("#d-"+CSS.escape(state.openId)); if(prev){ prev.classList.remove("open"); var b=prev.querySelector(".rbody"); if(b)b.innerHTML=""; } }
    if(wasOpen){ el.classList.remove("open"); el.querySelector(".rbody").innerHTML=""; state.openId=null; LS.set("open",null); setHash(""); }
    else { el.classList.add("open"); el.querySelector(".rbody").innerHTML=bodyHTML(it); state.openId=id; LS.set("open",id); setHash(id); }
  }

  function buildGanaChips(){
    var wrap=$("#dh-ganaChips"), html='<button class="chip" data-g="0">सर्वे · all</button>';
    for(var g=1;g<=10;g++) html+='<button class="chip" data-g="'+g+'">'+g+' '+GANA[g]+'</button>';
    wrap.innerHTML=html; syncGanaChips();
    wrap.addEventListener("click",function(e){ var c=e.target.closest(".chip"); if(!c)return;
      state.gana=parseInt(c.dataset.g,10); LS.set("gana",state.gana); syncGanaChips(); rerender(); });
  }
  function syncGanaChips(){ document.querySelectorAll("#dh-ganaChips .chip").forEach(function(c){ c.classList.toggle("on", parseInt(c.dataset.g,10)===state.gana); }); }
  function syncSetChips(){ document.querySelectorAll("[data-set]").forEach(function(c){ c.classList.toggle("on", c.dataset.set===state.set); }); }
  function syncPadaChips(){ document.querySelectorAll("[data-p]").forEach(function(c){
    var on=(c.dataset.p===state.pada);
    c.classList.toggle("on", on && c.dataset.p==="");
    c.classList.toggle("pon", on && c.dataset.p==="P");
    c.classList.toggle("aon", on && c.dataset.p==="A");
    c.classList.toggle("uon", on && c.dataset.p==="U");
  }); }

  function wire(){
    $("#dh-list").addEventListener("click",function(e){
      var mb=e.target.closest(".vrit-btn");
      if(mb){ e.stopPropagation(); loadVrittis(mb.closest(".vrit")); return; }
      var vt=e.target.closest(".vrit-tab");
      if(vt){ e.stopPropagation(); showVritti(vt.closest(".vrit"), vt.dataset.v); return; }
      if(e.target.closest(".acts")) return; // let derivation/reader links navigate
      var h=e.target.closest(".rhead"); if(h) toggleRow(h.parentElement.dataset.id);
    });
    $("#dh-more").addEventListener("click",function(){ render(false); });
    $("#dh-search").addEventListener("input",function(e){ state.q=e.target.value; rerender(); });
    document.querySelectorAll("[data-p]").forEach(function(c){ c.addEventListener("click",function(){
      state.pada=c.dataset.p; LS.set("pada",state.pada); syncPadaChips(); rerender(); }); });
    document.querySelectorAll("[data-set]").forEach(function(c){ c.addEventListener("click",function(){
      state.set=c.dataset.set; LS.set("set",state.set); syncSetChips(); rerender(); }); });
    $("#dh-sort").addEventListener("change",function(e){ state.sort=e.target.value; LS.set("sort",state.sort); rerender(); });
    $("#dh-scriptSeg").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b)return;
      [].forEach.call(e.currentTarget.children,function(x){x.classList.remove("on");}); b.classList.add("on");
      state.script=b.dataset.s; LS.set("script",state.script); rerender(); });
    $("#dh-fontUp").addEventListener("click",function(){ state.font=Math.min(26,state.font+1); LS.set("font",state.font); applyFont(); });
    $("#dh-fontDn").addEventListener("click",function(){ state.font=Math.max(14,state.font-1); LS.set("font",state.font); applyFont(); });
    $("#dh-theme").addEventListener("click",function(){ var d=document.body.classList.toggle("dark"); LS.set("dark",d); });
    window.addEventListener("hashchange",function(){ var id=hashId(); if(id && id!==state.openId) openById(id); });
  }
  function applyFont(){ $("#dh-list").style.setProperty("font-size", state.font+"px"); }
  var _vcache={};
  function loadVrittis(box){
    if(!box || box.dataset.loaded) return;
    var code=box.dataset.vrit; box.dataset.loaded="1";
    box.innerHTML='<div class="mdhv-head">📜 वृत्तयः · dhātuvṛttis <span class="mdhv-lic">GPL · samsaadhanii/scl</span></div><div class="vrit-tabs"></div><div class="mdhv-text">loading…</div>';
    fetch("data/vyakarana/vritti/"+code+".json").then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(d){
      _vcache[code]=d;
      var tabs=$(".vrit-tabs",box);
      tabs.innerHTML=d.vrittis.map(function(v,i){ return '<button class="vrit-tab'+(i===0?" on":"")+'" data-v="'+v.source+'">'+esc(v.name)+'</button>'; }).join("");
      showVritti(box, d.vrittis[0].source);
    }).catch(function(){ $(".mdhv-text",box).textContent="(could not load vṛtti text)"; });
  }
  function showVritti(box, source){
    var code=box.dataset.vrit, d=_vcache[code]; if(!d) return;
    var v=d.vrittis.filter(function(x){return x.source===source;})[0]; if(!v) return;
    box.querySelectorAll(".vrit-tab").forEach(function(t){ t.classList.toggle("on",t.dataset.v===source); });
    var devCls = state.script==="iast"?"":"deva";
    var el=$(".mdhv-text",box); el.className="mdhv-text "+devCls;
    el.textContent = (v.author?("["+v.author+"] "):"")+tl(v.text||"");
  }

  function openById(id){
    var it=state.all.find(function(x){return x.id===id;}); if(!it) return;
    // set the open target BEFORE rendering so only this row renders open
    state.openId=id; LS.set("open",id);
    // clear filters so the target is guaranteed in view
    state.gana=0; state.pada=""; state.q=""; $("#dh-search").value=""; LS.set("gana",0); LS.set("pada","");
    syncGanaChips(); syncPadaChips(); recompute();
    var pos=state.view.findIndex(function(x){return x.id===id;});
    render(true);
    while(state.shown<=pos && state.shown<state.view.length) render(false);
    var el=$("#d-"+CSS.escape(id));
    if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); setHash(id); }
  }

  function boot(){
    if(LS.get("dark",false)) document.body.classList.add("dark");
    var ss=$("#dh-scriptSeg"); if(ss) ss.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on",b.dataset.s===state.script); });
    $("#dh-sort").value=state.sort;
    buildGanaChips(); syncPadaChips(); syncSetChips(); wire(); applyFont();
    fetch("data/vyakarana/vritti/index.json").then(function(r){return r.ok?r.json():null;}).then(function(idx){
      state.vset={}; if(idx) (idx.available||[]).forEach(function(c){ state.vset[c]=1; });
      // if a row is already open, re-render its body so the vṛtti toggle appears
      if(state.openId){ var el=$("#d-"+CSS.escape(state.openId)); var it=state.all.find(function(x){return x.id===state.openId;});
        if(el&&it){ var b=el.querySelector(".rbody"); if(b) b.innerHTML=bodyHTML(it); } }
    }).catch(function(){ state.vset={}; });
    fetch(URL).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
      state.all=(d.items||[]).map(function(it){
        it._hay=((it.dhatu||"")+" "+(it.artha||"")+" "+((it.meanings||[]).join(" "))+" "+(it.dhatu_slp||"")+" "+iast(it.dhatu)+" "+iast(it.artha)+" "+it.id).toLowerCase();
        return it;
      });
      $("#dh-total").textContent = state.all.length.toLocaleString();
      recompute();
      var h0=hashId();
      if(h0 && state.all.some(function(x){return x.id===h0;})){ openById(h0); }
      else { render(true); }
    }).catch(function(e){ $("#dh-list").innerHTML='<div class="empty">Failed to load dhātupāṭha data ('+e+'). Serve from the dge/ folder.</div>'; });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
