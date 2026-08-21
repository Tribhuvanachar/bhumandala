/* ==========================================================================
 * DGE · Shabdapatha module — browse/filter/search nominal declensions
 * (Issue 15/19's "Shabda derivations" ask), sourced from ashtadhyayi-com/data
 * (github.com/ashtadhyayi-com/data, used with credit per its README).
 * Mirrors dhatu.js's list/filter/expand shape so the two feel like one family.
 * ========================================================================== */
(function () {
  "use strict";
  var URL = "data/vedanga/vyakarana/shabdapatha/data.json";
  var PAGE_SIZE = 20;
  var VIBHAKTI = ["प्रथमा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","सम्बोधनम्"];

  var LS = {
    get:function(k,d){ try{ var v=localStorage.getItem("dge.shabda."+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
    set:function(k,v){ try{ localStorage.setItem("dge.shabda."+k, JSON.stringify(v)); }catch(e){} }
  };
  var state = { all:[], view:[], page:0, script: LS.get("script","devanagari"), linga: LS.get("linga",""), q:"", openId: LS.get("open",null), highlightCell:null };
  function totalPages(){ return Math.max(1, Math.ceil(state.view.length / PAGE_SIZE)); }

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
  // Real Prev/Next pagination (20 words a page) rather than the old
  // infinite-"show more" chunking -- easier to reason about on a phone
  // ("where am I, how many pages left") and cheaper to paint per tap,
  // since only one page's worth of rows (and their collapsed bodies) is
  // ever in the DOM at once.
  function setBtnDisabled(btn, disabled){ btn.disabled=disabled; btn.style.opacity=disabled?"0.4":"1"; btn.style.cursor=disabled?"default":"pointer"; }
  function render(){
    var box=$("#sh-list");
    box.innerHTML="";
    if(!state.view.length){
      box.innerHTML='<div class="empty">No words match these filters.</div>';
      $("#sh-pager").style.display="none";
      return;
    }
    var start=state.page*PAGE_SIZE, end=Math.min(start+PAGE_SIZE, state.view.length), html="";
    for(var i=start;i<end;i++) html+=rowHTML(state.view[i]);
    box.insertAdjacentHTML("beforeend", html);
    $("#sh-pager").style.display="flex";
    $("#sh-pageInfo").textContent = "Page "+(state.page+1)+" / "+totalPages()+" · "+state.view.length.toLocaleString()+" words";
    setBtnDisabled($("#sh-prev"), state.page<=0);
    setBtnDisabled($("#sh-next"), state.page>=totalPages()-1);
  }
  function rerender(){ recompute(); state.page=0; render(); }

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
    $("#sh-prev").addEventListener("click",function(){ if(state.page>0){ state.page--; render(); window.scrollTo({top:0,behavior:"smooth"}); } });
    $("#sh-next").addEventListener("click",function(){ if(state.page<totalPages()-1){ state.page++; render(); window.scrollTo({top:0,behavior:"smooth"}); } });
    $("#sh-toTop").addEventListener("click",function(){ window.scrollTo({top:0,behavior:"smooth"}); });
    $("#sh-toBottom").addEventListener("click",function(){ $("#sh-pager").scrollIntoView({behavior:"smooth",block:"end"}); });
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
    state.page = pos>=0 ? Math.floor(pos/PAGE_SIZE) : 0;
    render();
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

  // A form the Śabdapāṭha (fixed nominal stems) genuinely has no entry for
  // may still be a kṛdanta — a word DERIVED from a verb root (लभ्यः, from
  // लभ्+यत्) that is grammatically correct but lives in a different
  // database (tools/build_krt_form_index.py's reverse index over every
  // root's kṛt-pratyaya forms). Checked before giving up entirely; a
  // match redirects straight to the actual right page (krdanta.html)
  // instead of leaving the reader on a nominal-stem browser that was
  // never going to have this word.
  function tryKrtFallback(surface){
    var w=(surface||"").trim();
    if(!w){ showNotFound(surface); return; }
    var cp=w.codePointAt(0).toString(16).toLowerCase().padStart(4,"0");
    fetch("data/vedanga/vyakarana/prakriya/krtindex/"+cp+".json").then(function(r){
      return r.ok ? r.json() : null;
    }).then(function(m){
      var hit=m && m[w];
      if(hit){ location.href="krdanta.html#"+hit.c+":"+hit.k; }
      else { showNotFound(surface); }
    }).catch(function(){ showNotFound(surface); });
  }

  // Previously this silently fell back to a plain substring search on the
  // unmatched text, which could (and did — reported live, with a
  // screenshot) match the query as a raw substring INSIDE an unrelated
  // word's own declension table and open THAT as if it were the answer.
  // An honest "not found" beats a confident-looking wrong one; the search
  // box is left populated so the reader can still search manually if they
  // want to, rather than being force-fed a guess.
  function showNotFound(surface){
    $("#sh-search").value=surface||"";
    recompute();
    state.page=0;
    render();
    var box=$("#sh-list");
    box.insertAdjacentHTML("afterbegin",
      '<div class="empty">No exact form found for "'+esc(surface||"")+'". '+
      'Showing the ordinary word list below — search manually, or '+
      '<a href="#" id="sh-report-missing">report this as missing</a>.</div>');
    var rep=$("#sh-report-missing");
    if(rep) rep.addEventListener("click",function(e){
      e.preventDefault();
      // shabda.html is deliberately minimal (no modals.js/config.js) so
      // this doesn't depend on window.dgeReportMissingForm (modals.js's
      // version, for pages that already load it) — same template tag and
      // field shape either way, kept in sync by hand since it's only a
      // few lines. See modals.js's own copy for the full reasoning on why
      // the shape matters (a future scheduled process matching only this
      // exact tag+field format, everything else ignored or routed to a
      // human).
      if(typeof window.dgeReportMissingForm==="function"){ window.dgeReportMissingForm(surface,"shabda"); return; }
      var email="sanatanavidyagurukulam@gmail.com";
      var subject=encodeURIComponent("[DGE-CONTENT-GAP] missing-form — "+surface);
      var lines=["Type: missing-form","Surface: "+surface,"Context: shabda","Page: "+location.href,
        "Timestamp: "+new Date().toISOString()];
      location.href="mailto:"+email+"?subject="+subject+"&body="+encodeURIComponent(lines.join("\n"));
    });
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
      if(form0){ tryKrtFallback(form0); return; } // may itself be async; renders its own state either way
      if(q0){ state.q=q0; $("#sh-search").value=q0; }
      recompute();
      var h0=hashId();
      if(h0 && state.all.some(function(x){return x.id===h0;})){ openById(h0); }
      else { state.page=0; render(); }
    }).catch(function(e){ $("#sh-list").innerHTML='<div class="empty">Failed to load shabdapatha data ('+e+'). Serve from the dge/ folder.</div>'; });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
