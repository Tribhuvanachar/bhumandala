/*
=========================================================
Digital Grantha Engine
utils.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function(){

"use strict";

const Utils={

version:"1.0.0",

id(prefix="id"){

return prefix+"_"+Math.random().toString(36).substring(2,10);

},

escapeHTML(text){

if(text===undefined||text===null) return "";

return String(text)
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#39;");

},

debounce(fn,delay=300){

let timer;

return function(){

const args=arguments;

clearTimeout(timer);

timer=setTimeout(()=>{

fn.apply(this,args);

},delay);

};

},

throttle(fn,delay=100){

let waiting=false;

return function(){

if(waiting) return;

waiting=true;

fn.apply(this,arguments);

setTimeout(()=>{

waiting=false;

},delay);

};

},

deepCopy(obj){

return JSON.parse(JSON.stringify(obj));

},

formatNumber(number,digits=2){

return Number(number).toLocaleString(

undefined,

{

maximumFractionDigits:digits

}

);

},

clamp(value,min,max){

return Math.min(

Math.max(value,min),

max

);

},

sleep(ms){

return new Promise(resolve=>{

setTimeout(resolve,ms);

});

},

today(){

return new Date().toISOString();

},

download(filename,data,type="text/plain"){

const blob=new Blob(

[data],

{type}

);

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download=filename;

a.click();

URL.revokeObjectURL(url);

},

copy(text){

if(navigator.clipboard){

navigator.clipboard.writeText(text);

DGE.log("Copied");

}

},

isMobile(){

return /Android|iPhone|iPad|Mobile/i.test(

navigator.userAgent

);

},

query(name){

const params=new URLSearchParams(

location.search

);

return params.get(name);

},

uuid(){

return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"

.replace(/[xy]/g,function(c){

const r=Math.random()*16|0;

const v=c==="x"?r:(r&0x3|0x8);

return v.toString(16);

});

}

};

window.Utils=Utils;

})();
