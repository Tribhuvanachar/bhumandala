/*
=========================================================
Digital Grantha Engine
reader.js
Version: 10.1.0 Alpha 005
=========================================================
*/

(function(){

"use strict";

const ReaderEngine={

currentVerse:0,

dataset:[],

container:null,

init(containerId="content"){

this.container=document.getElementById(containerId);

DGE.log("Reader Engine Ready");

},

setDataset(data){

this.dataset=data||[];

NavigationEngine.setDataset(this.dataset);

},

render(index){

if(!this.container) return;

if(index<0) index=0;

if(index>=this.dataset.length)

index=this.dataset.length-1;

this.currentVerse=index;

const verse=this.dataset[index];

if(!verse){

this.container.innerHTML="<p>No Verse</p>";

return;

}

SnippetEngine.setCurrent(verse);

let html="";

html+="<article class='dge-reader'>";

if(verse.number)

html+="<div class='dge-number'>Verse "+verse.number+"</div>";

if(verse.title)

html+="<h2>"+verse.title+"</h2>";

if(verse.sanskrit)

html+="<div class='dge-sanskrit'>"+verse.sanskrit+"</div>";

if(verse.transliteration)

html+="<div class='dge-transliteration'>"+verse.transliteration+"</div>";

if(verse.meaning)

html+="<div class='dge-meaning'>"+verse.meaning+"</div>";

if(verse.commentary)

html+="<div class='dge-commentary'>"+verse.commentary+"</div>";

html+="</article>";

this.container.innerHTML=html;

EventBus.emit("verse.changed",{

index,

verse

});

},

next(){

this.render(this.currentVerse+1);

},

previous(){

this.render(this.currentVerse-1);

},

goto(number){

this.render(number);

},

refresh(){

this.render(this.currentVerse);

},

current(){

return this.dataset[this.currentVerse];

}

};

window.ReaderEngine=ReaderEngine;

document.addEventListener(

"DOMContentLoaded",

function(){

ReaderEngine.init();

}

);

})();
