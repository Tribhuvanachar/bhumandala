/* ==========================================================================
 * DGE · Shabdapatha module — browse/filter/search nominal declensions
 * (Issue 15/19's "Shabda derivations" ask), sourced from ashtadhyayi-com/data
 * (github.com/ashtadhyayi-com/data, used with credit per its README).
 * Mirrors dhatu.js's list/filter/expand shape so the two feel like one family.
 * ========================================================================== */
(function () {
  "use strict";
  var URL = "data/vedanga/vyakarana/shabdapatha/data.json";
  var CHUNK = 250;
  var VIBHAKTI = ["प्रथमा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","सम्बोधनम्"];

  var LS = {
    get:function(k,d){ try{ var v=localStorage.getItem("dge.shabda."+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
    set:function(k,v){ try{ localStorage.setItem("dge.shabda."+k, JSON.stringify(v)); }catch(e){} }
  };
  var state = { all:[], view:[], shown:0, script: LS.get("script","devanagari"), linga: LS.get("linga",""), q:"", openId: LS.get("open",null), highlightCell:null };

  function $(s,r){ return (r||document).querySelector(s); }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  function tl(t){ if(!t) return t; if(state.script==="devanagari"||!window.Sanscript) return t;
    try{ return window.Sanscript.t(t,"devanagari",state.script);}catch(e){return t;} }
  function hashId(){ return decodeURIComponent((location.hash||"").replace(/^#/,"").trim()); }
  function setHash(id){ try{ if(("#"+id)!==location.hash) history.replaceState(null,"","#"+id); }catch(e){} }

  function recompute(){
    var q=state.q.trim().toLowerCase();
    state.view = state.all.filter(function(it){
      if(state.linga && it.linga!==state.linga) return false;
      if(q && it._hay.indexOf(q)<0) return false;
      return true;
    });
    state.view.sort(function(a,b){ return a.word.localeCompare(b.word,"sa"); });
    state.shown=0;
    $("#sh-count").textContent = state.view.length.toLocaleString()+" / "+state.all.length.toLocaleString();
  }

  function declTable(forms, highlightIdx){
    var cells=String(forms||"").split(";"); while(cells.length<24) cells.push("");
    var h='<div class="df-table"><table><thead><tr><th></th><th class="deva">एकवचनम्</th><th class="deva">द्विवचनम्</th><th class="deva">बहुवचनम्</th></tr></thead><tbody>';
    for(var v=0;v<8;v++){
      h+='<tr><th class="deva">'+VIBHAKTI[v]+'</th>';
      for(var n=0;n<3;n++){ var idx=v*3+n;
        var hl = (highlightIdx!=null && idx===highlightIdx);
        h+='<td class="deva'+(hl?" df-hl":"")+'"'+(hl?' id="df-hl-cell"':'')+'>'+esc((cells[idx]||"").split("-").join(", "))+'</td>'; }
      h+='</tr>';
    }
    h+='</tbody></table></div>';
    return h;
  }

  // Reverse lookup: given an exact inflected surface form (e.g. परस्य,
  // clicked via the reader's word-tool selection), find which headword it
  // declines from and which of the 24 declTable cells it sits in. Scans
  // state.all's already-loaded `forms` field (24 `;`-separated cells, each
  // itself possibly `-`-separated variants) rather than needing any new
  // data or a server round-trip.
  function findFormLocation(surface){
    var target=String(surface||"").trim(); if(!target) return null;
    for(var i=0;i<state.all.length;i++){
      var cells=String(state.all[i].forms||"").split(";");
      for(var c=0;c<cells.length && c<24;c++){
        var variants=(cells[c]||"").split("-");
        for(var v=0;v<variants.length;v++){ if(variants[v].trim()===target) return { id:state.all[i].id, cellIndex:c }; }
      }
    }
    return null;
  }

  function bodyHTML(it){
    var devCls = state.script==="iast"?"":"deva";
    function kv(k,v){ return '<div class="kv"><div class="kk">'+k+'</div><div class="kvv '+devCls+'">'+v+'</div></div>'; }
    var h="";
    if(it.artha) h+=kv("अर्थः · meaning", esc(tl(it.artha)));
    if(it.artha_hin) h+=kv("हिन्दी", esc(it.artha_hin));
    if(it.artha_eng) h+=kv("English", esc(it.artha_eng));
    h+=kv("लिङ्गः · gender", esc(tl(it.linga_iast)));
    h+=declTable(it.forms, it.id===state.openId?state.highlightCell:null);
    return h;
  }
  function rowHTML(it){
    var devCls = state.script==="iast"?"":"deva";
    var open=(it.id===state.openId);
    return '<article class="row '+(open?"open":"")+'" id="s-'+esc(it.id)+'" data-id="'+esc(it.id)+'">'
      +'<div class="rhead">'
        +'<span class="rdha '+devCls+'">'+esc(tl(it.word))+'</span>'
        +(it.artha?'<span class="rartha '+devCls+'">'+esc(tl(it.artha))+'</span>':'<span class="rartha"></span>')
        +'<span class="rgana '+devCls+'">'+esc(tl(it.linga_iast))+'</span>'
        +'<span class="rcaret">▸</span>'
      +'</div>'
      +'<div class="rbody">'+(open?bodyHTML(it):"")+'</div>'
    +'</article>';
  }
  function render(reset){
    var box=$("#sh-list");
    if(reset){ box.innerHTML=""; state.shown=0; }
    if(!state.view.length){ box.innerHTML='<div class="empty">No words match these filters.</div>'; $("#sh-more").style.display="none"; return; }
    var end=Math.min(state.shown+CHUNK, state.view.length), html="";
    for(var i=state.shown;i<end;i++) html+=rowHTML(state.view[i]);
    box.insertAdjacentHTML("beforeend", html);
    state.shown=end;
    $("#sh-more").style.display = state.shown<state.view.length ? "block" : "none";
    $("#sh-more").textContent = "show more ▾  ("+(state.view.length-state.shown).toLocaleString()+" left)";
  }
  function rerender(){ recompute(); render(true); }

  function toggleRow(id){
    var it=state.all.find(function(x){return x.id===id;}); if(!it) return;
    var el=$("#s-"+CSS.escape(id)); if(!el) return;
    var wasOpen=el.classList.contains("open");
    state.highlightCell=null; // a manual expand/collapse always clears any deep-link highlight
    if(state.openId && state.openId!==id){ var prev=$("#s-"+CSS.escape(state.openId)); if(prev){ prev.classList.remove("open"); var b=prev.querySelector(".rbody"); if(b)b.innerHTML=""; } }
    if(wasOpen){ el.classList.remove("open"); el.querySelector(".rbody").innerHTML=""; state.openId=null; LS.set("open",null); setHash(""); }
    else { el.classList.add("open"); el.querySelector(".rbody").innerHTML=bodyHTML(it); state.openId=id; LS.set("open",id); setHash(id); }
  }
  function syncLingaChips(){ document.querySelectorAll("[data-l]").forEach(function(c){ c.classList.toggle("on", c.dataset.l===state.linga); }); }

  function wire(){
    $("#sh-list").addEventListener("click",function(e){
      var h=e.target.closest(".rhead"); if(h) toggleRow(h.parentElement.dataset.id);
    });
    $("#sh-more").addEventListener("click",function(){ render(false); });
    $("#sh-search").addEventListener("input",function(e){ state.q=e.target.value; rerender(); });
    document.querySelectorAll("[data-l]").forEach(function(c){ c.addEventListener("click",function(){
      state.linga=c.dataset.l; LS.set("linga",state.linga); syncLingaChips(); rerender(); }); });
    $("#sh-scriptSeg").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b)return;
      [].forEach.call(e.currentTarget.children,function(x){x.classList.remove("on");}); b.classList.add("on");
      state.script=b.dataset.s; LS.set("script",state.script); rerender(); });
    $("#sh-theme").addEventListener("click",function(){ var d=document.body.classList.toggle("dark"); LS.set("dark",d); });
  }

  function openById(id){
    var it=state.all.find(function(x){return x.id===id;}); if(!it) return;
    state.openId=id; LS.set("open",id); state.linga=""; state.q=""; $("#sh-search").value=""; LS.set("linga","");
    syncLingaChips(); recompute();
    var pos=state.view.findIndex(function(x){return x.id===id;});
    render(true);
    while(state.shown<=pos && state.shown<state.view.length) render(false);
    var el=$("#s-"+CSS.escape(id));
    if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); setHash(id); }
    if(state.highlightCell!=null){
      var cell=$("#df-hl-cell");
      if(cell) setTimeout(function(){ cell.scrollIntoView({behavior:"smooth",block:"center"}); }, 250);
    }
  }

  // Deep link from the reader's word-tool: an exact inflected form (e.g.
  // परस्य) opens the headword it belongs to (पर) with that one cell
  // (षष्ठी एकवचनम्) highlighted, instead of a plain substring search.
  // Returns false (no navigation performed) when the surface form doesn't
  // match any stored cell exactly, so the caller can fall back to search.
  function openByForm(surface){
    var loc=findFormLocation(surface); if(!loc) return false;
    state.highlightCell=loc.cellIndex;
    openById(loc.id);
    return true;
  }

  function boot(){
    if(LS.get("dark",false)) document.body.classList.add("dark");
    var ss=$("#sh-scriptSeg"); if(ss) ss.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on",b.dataset.s===state.script); });
    syncLingaChips(); wire();
    fetch(URL).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
      state.all=(d.items||[]).map(function(it){
        // forms included so a search for an inflected word (e.g. परस्य,
        // pasted in from the reader's "Shabda" word-tool) finds the
        // headword it declines from, not just an exact headword match.
        it._hay=((it.word||"")+" "+(it.artha||"")+" "+(it.artha_hin||"")+" "+(it.artha_eng||"")+" "+(it.forms||"")).toLowerCase();
        return it;
      });
      $("#sh-total").textContent = state.all.length.toLocaleString();
      var sp=new URLSearchParams(location.search);
      var form0=sp.get("form"), q0=sp.get("q");
      if(form0 && openByForm(form0)) return; // exact-form deep link resolved; opened above
      if(form0 && !q0) q0=form0; // no exact cell match — fall back to a plain search on the same text
      if(q0){ state.q=q0; $("#sh-search").value=q0; }
      recompute();
      var h0=hashId();
      if(h0 && state.all.some(function(x){return x.id===h0;})){ openById(h0); }
      else { render(true); }
    }).catch(function(e){ $("#sh-list").innerHTML='<div class="empty">Failed to load shabdapatha data ('+e+'). Serve from the dge/ folder.</div>'; });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
