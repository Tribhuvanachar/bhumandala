"use strict";

/*=============================================================================
 Digital Grantha Engine
 Audio Engine
 Version : 10.1.0 Alpha
=============================================================================*/

(function(){

if(!window.DGE)
    throw new Error("DGE core must be loaded first.");

const Audio={

    player:null,
    current:null,
    playlist:[],
    index:-1,
    volume:1.0,
    muted:false,

    init(){
        this.player=new Audio();
        this.player.preload="metadata";
        this.player.volume=this.volume;
        this.player.playbackRate=this.rate;
        this.bindEvents();
        this.bindProgress();
        return this;
    },

    ensurePlayer(){
        if(this.player){
            return true;
        }
        this.init();
        return !!this.player;
    },

    bindEvents(){
        this.player.addEventListener("play",()=>DGE.emit("audio:play",this.current));
        this.player.addEventListener("pause",()=>DGE.emit("audio:pause",this.current));
        this.player.addEventListener("ended",()=>{
            DGE.emit("audio:end",this.current);
            if(this.updateRepeat()){
                return;
            }
            if(this.shuffle && this.playlist.length>1){
                this.index=this.randomIndex();
                this.play(this.playlist[this.index]);
                return;
            }
            this.next();
        });
        this.player.addEventListener("error",e=>DGE.emit("audio:error",e));
    },

    async load(source){
        if(source===undefined || source===null){
            return false;
        }
        if(this.trackList.includes(source)){
            return await this.loadTrack(source);
        }
        this.revokeObjectUrl();
        this.current=source;
        this.player.src=source;
        this.player.load();
        DGE.emit("audio:loaded",source);
        return true;
    },

    async play(source){
        if(!this.ensurePlayer()){
            return false;
        }
        if(source!==undefined){
            if(this.trackList.includes(source)){
                await this.loadTrack(source);
            }else{
                this.load(source);
            }
        }
        if(!this.player.src){
            return false;
        }
        try{
            await this.player.play();
            return true;
        }catch(error){
            DGE.emit("audio:error",error);
            return false;
        }
    },

    pause(){
        if(!this.ensurePlayer()){
            return;
        }
        this.player.pause();
    },

    stop(){
        if(!this.ensurePlayer()){
            return;
        }
        this.player.pause();
        this.player.currentTime=0;
    },

    toggle(){
        if(this.player.paused)
            this.play();
        else
            this.pause();
    },

    seek(seconds){
        if(!this.ensurePlayer()){
            return;
        }
        this.player.currentTime=seconds;
    },

    forward(seconds=10){
        this.player.currentTime+=seconds;
    },

    rewind(seconds=10){
        this.player.currentTime-=seconds;
    },

    setVolume(value){
        if(!this.ensurePlayer()){
            return;
        }
        value=Math.max(0,Math.min(1,value));
        this.volume=value;
        this.player.volume=value;
    },

    mute(){
        if(!this.ensurePlayer()){
            return;
        }
        this.muted=true;
        this.player.muted=true;
    },

    unmute(){
        if(!this.ensurePlayer()){
            return;
        }
        this.muted=false;
        this.player.muted=false;
    },

    toggleMute(){
        if(this.muted)
            this.unmute();
        else
            this.mute();
    },

    isPlaying(){
        return !this.player.paused;
    },

    currentTime(){
        if(!this.ensurePlayer()){
            return 0;
        }
        return this.player.currentTime;
    },

    duration(){
        if(!this.ensurePlayer()){
            return 0;
        }
        return this.player.duration || 0;
    },

    setPlaylist(list=[]){
        this.playlist=[...list];
        this.index=0;
    },

    async next(){
        if(this.trackList.length){
            return await this.nextTrack();
        }
        if(!this.playlist.length){
            return false;
        }
        if(this.shuffle && this.playlist.length>1){
            this.index=this.randomIndex();
        }else{
            if(this.index>=this.playlist.length-1){
                return false;
            }
            this.index++;
        }
        return await this.play(this.playlist[this.index]);
    },

    async previous(){
        if(this.trackList.length){
            return await this.previousTrack();
        }
        if(!this.playlist.length){
            return false;
        }
        if(this.index<=0){
            return false;
        }
        this.index--;
        return await this.play(this.playlist[this.index]);
    },

    currentSource(){
        return this.current;
    },

    destroy(){
        this.stop();
        this.revokeObjectUrl();
        this.clearAB();
        this.resetRepeat();
        this.playlist=[];
        this.trackList=[];
        this.index=-1;
        this.current=null;
        if(this.player){
            this.player.removeAttribute("src");
            this.player.load();
        }
        DGE.emit("audio:destroy");
        return this;
    },

    ready(){
        return !!(this.player && this.player.src);
    },

    formatTime(seconds){
        if(isNaN(seconds)){
            return "0:00.000";
        }
        const minutes=Math.floor(seconds/60);
        const secs=Math.floor(seconds%60);
        const millis=Math.floor((seconds%1)*1000);
        return minutes+":"+String(secs).padStart(2,"0")+"."+String(millis).padStart(3,"0");
    },

    progress(){
        return{
            current:this.currentTime(),
            duration:this.duration(),
            formattedCurrent:this.formatTime(this.currentTime()),
            formattedDuration:this.formatTime(this.duration())
        };
    },

    update(){
        DGE.emit("audio:update",this.progress());
    },

    bindProgress(){
        this.player.addEventListener("timeupdate",()=>{
            this.checkAB();
            this.update();
        });
        this.player.addEventListener("loadedmetadata",()=>this.update());
    },

    rate:1.0,

    setRate(value){
        value=Number(value);
        if(!isFinite(value)){
            return;
        }
        value=Math.max(0.25,Math.min(4,value));
        this.rate=value;
        this.player.playbackRate=value;
        DGE.emit("audio:rate",value);
    },

    getRate(){
        return this.rate;
    },

    faster(step=0.25){
        this.setRate(this.rate+step);
    },

    slower(step=0.25){
        this.setRate(this.rate-step);
    },

    normalSpeed(){
        this.setRate(1);
    },

    repeat:1,
    loop:0,

    setRepeat(count){
        count=parseInt(count,10);
        if(isNaN(count) || count<1){
            count=1;
        }
        this.repeat=count;
        this.loop=0;
        DGE.emit("audio:repeat",count);
    },

    repeatCount(){
        return this.repeat;
    },

    currentLoop(){
        return this.loop+1;
    },

    resetRepeat(){
        this.loop=0;
    },

    updateRepeat(){
        if(this.repeat<=1){
            return false;
        }
        this.loop++;
        if(this.loop>=this.repeat){
            this.loop=0;
            return false;
        }
        this.seek(0);
        this.play();
        return true;
    },

    shuffle:false,

    setShuffle(enabled=true){
        this.shuffle=!!enabled;
        DGE.emit("audio:shuffle",this.shuffle);
    },

    toggleShuffle(){
        this.setShuffle(!this.shuffle);
    },

    isShuffle(){
        return this.shuffle;
    },

    randomIndex(){
        if(this.playlist.length<=1){
            return this.index;
        }
        let next=this.index;
        while(next===this.index){
            next=Math.floor(Math.random()*this.playlist.length);
        }
        return next;
    },

    loopA:null,
    loopB:null,
    abEnabled:false,

    setAB(start,end){
        start=Number(start);
        end=Number(end);
        if(!isFinite(start) || !isFinite(end) || start>=end){
            return false;
        }
        this.loopA=start;
        this.loopB=end;
        this.abEnabled=true;
        DGE.emit("audio:ab",{start,end});
        return true;
    },

    clearAB(){
        this.loopA=null;
        this.loopB=null;
        this.abEnabled=false;
    },

    hasAB(){
        return this.abEnabled;
    },

    getAB(){
        return{
            start:this.loopA,
            end:this.loopB
        };
    },

    checkAB(){
        if(!this.abEnabled){
            return;
        }
        if(this.player.currentTime>=this.loopB){
            this.player.currentTime=this.loopA;
        }
    },

    archiveBase:"",
    filePrefix:"",
    fileExtension:".mp3",

    configure(options={}){
        if(options.archiveBase!==undefined){
            this.archiveBase=options.archiveBase;
        }
        if(options.filePrefix!==undefined){
            this.filePrefix=options.filePrefix;
        }
        if(options.fileExtension!==undefined){
            this.fileExtension=options.fileExtension;
        }
    },

    buildSource(id){
        if(id===undefined || id===null){
            return null;
        }
        return this.archiveBase+this.filePrefix+id+this.fileExtension;
    },

    async playId(id){
        const ok=await this.loadTrack(id);
        if(!ok){
            return false;
        }
        this.index=this.trackIndex(id);
        await this.play();
        DGE.emit("audio:track",id);
        return true;
    },

    trackList:[],

    setTrackList(list=[]){
        this.trackList=[...list];
    },

    trackIndex(id){
        return this.trackList.indexOf(id);
    },

    currentTrackId(){
        if(this.index<0 || this.index>=this.trackList.length){
            return null;
        }
        return this.trackList[this.index];
    },

    async playTrack(id){
        return await this.playId(id);
    },

    async nextTrack(){
        if(!this.trackList.length){
            return false;
        }
        if(this.shuffle && this.trackList.length>1){
            this.index=this.randomIndex();
        }else{
            if(this.index>=this.trackList.length-1){
                return false;
            }
            this.index++;
        }
        return await this.playId(this.trackList[this.index]);
    },

    async previousTrack(){
        if(!this.trackList.length){
            return false;
        }
        if(this.index<=0){
            return false;
        }
        this.index--;
        return await this.playId(this.trackList[this.index]);
    },

    cacheName:"DGE_AUDIO_CACHE",
    cacheEnabled:("caches" in window),

    async openCache(){
        if(!this.cacheEnabled){
            return null;
        }
        return await caches.open(this.cacheName);
    },

    async isCached(source){
        const cache=await this.openCache();
        if(!cache){
            return false;
        }
        return !!(await cache.match(source));
    },

    async cacheTrack(source){
        const cache=await this.openCache();
        if(!cache || !source){
            return false;
        }
        try{
            await cache.add(source);
            DGE.emit("audio:cached",source);
            return true;
        }catch(error){
            DGE.emit("audio:cacheerror",error);
            return false;
        }
    },

    async removeCached(source){
        const cache=await this.openCache();
        if(!cache){
            return false;
        }
        return await cache.delete(source);
    },

    async clearCache(){
        if(!this.cacheEnabled){
            return false;
        }
        return await caches.delete(this.cacheName);
    },

    async cachePlaylist(concurrency=4){
        if(!this.playlist.length){
            return{success:0,failed:0};
        }
        const queue=[...this.playlist];
        let success=0;
        let failed=0;
        let completed=0;
        const total=queue.length;
        const worker=async()=>{
            while(queue.length){
                const source=queue.shift();
                try{
                    const ok=await this.cacheTrack(source);
                    if(ok)
                        success++;
                    else
                        failed++;
                }catch{
                    failed++;
                }
                completed++;
                DGE.emit("audio:cacheprogress",{completed,total,success,failed});
            }
        };
        const jobs=[];
        for(let i=0;i<concurrency;i++){
            jobs.push(worker());
        }
        await Promise.all(jobs);
        DGE.emit("audio:cachecomplete",{total,success,failed});
        return{total,success,failed};
    },

    async resolveSource(id){
        const primary=this.buildSource(id);
        if(!primary){
            return null;
        }
        if(this.cacheEnabled){
            try{
                const cache=await this.openCache();
                const hit=await cache.match(primary);
                if(hit){
                    const blob=await hit.blob();
                    return URL.createObjectURL(blob);
                }
            }catch(error){
                DGE.emit("audio:cacheerror",error);
            }
        }
        return primary;
    },

    async preload(id){
        const source=this.buildSource(id);
        if(!source){
            return false;
        }
        return await this.cacheTrack(source);
    },

    async preloadAll(){
        const jobs=this.trackList.map(id=>this.preload(id));
        return await Promise.all(jobs);
    },

    objectUrl:null,

    revokeObjectUrl(){
        if(this.objectUrl){
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl=null;
        }
    },

    async loadTrack(id){
        if(!this.ensurePlayer()){
            return false;
        }
        this.revokeObjectUrl();
        const source=await this.resolveSource(id);
        if(!source){
            return false;
        }
        if(source.startsWith("blob:")){
            this.objectUrl=source;
        }
        this.current=id;
        this.player.src=source;
        this.player.load();
        DGE.emit("audio:loaded",id);
        return true;
    },

    async reload(){
        if(this.current==null){
            return false;
        }
        return await this.loadTrack(this.current);
    },

    state(){
        return{
            current:this.current,
            playlist:[...this.playlist],
            trackList:[...this.trackList],
            index:this.index,
            volume:this.volume,
            muted:this.muted,
            rate:this.rate,
            repeat:this.repeat,
            loop:this.loop,
            shuffle:this.shuffle,
            loopA:this.loopA,
            loopB:this.loopB,
            abEnabled:this.abEnabled,
            currentTime:this.currentTime()
        };
    },

    restore(state={}){
        if(!state || typeof state!=="object"){
            return false;
        }
        if(Array.isArray(state.playlist)){
            this.playlist=[...state.playlist];
        }
        if(Array.isArray(state.trackList)){
            this.trackList=[...state.trackList];
        }
        this.index=state.index??this.index;
        this.current=state.current??this.current;
        this.setVolume(state.volume??this.volume);
        if(state.muted){
            this.mute();
        }else{
            this.unmute();
        }
        this.setRate(state.rate??this.rate);
        this.setRepeat(state.repeat??this.repeat);
        if(state.shuffle){
            this.setShuffle(true);
        }else{
            this.setShuffle(false);
        }
        if(state.abEnabled){
            this.setAB(state.loopA,state.loopB);
        }else{
            this.clearAB();
        }
        if(typeof state.currentTime==="number"){
            this.seek(state.currentTime);
        }
        DGE.emit("audio:restore",this.state());
        return true;
    },

    on(event,handler){
        if(!event || typeof handler!=="function"){
            return this;
        }
        DGE.on(`audio:${event}`,handler);
        return this;
    },

    off(event,handler){
        if(!event || typeof handler!=="function"){
            return this;
        }
        if(typeof DGE.off==="function"){
            DGE.off(`audio:${event}`,handler);
        }
        return this;
    },

    once(event,handler){
        if(!event || typeof handler!=="function"){
            return this;
        }
        const wrapper=(...args)=>{
            if(typeof DGE.off==="function"){
                DGE.off(`audio:${event}`,wrapper);
            }
            handler(...args);
        };
        DGE.on(`audio:${event}`,wrapper);
        return this;
    },

    info(){
        return{
            engine:"DGE Audio",
            version:"10.1.0 Alpha",
            cache:this.cacheEnabled,
            playlist:this.playlist.length,
            tracks:this.trackList.length,
            playing:this.isPlaying(),
            source:this.currentSource(),
            track:this.currentTrackId(),
            volume:this.volume,
            muted:this.muted,
            rate:this.rate,
            repeat:this.repeat,
            shuffle:this.shuffle,
            abLoop:this.abEnabled
        };
    },

    capabilities(){
        return{
            playlist:true,
            cache:this.cacheEnabled,
            repeat:true,
            shuffle:true,
            abLoop:true,
            preload:true,
            state:true,
            events:true,
            playbackRate:true
        };
    },

    reset(){
        this.stop();
        this.clearAB();
        this.resetRepeat();
        this.setShuffle(false);
        this.normalSpeed();
        this.unmute();
        this.setVolume(1);
        this.revokeObjectUrl();
        this.current=null;
        this.index=-1;
        DGE.emit("audio:reset");
        return this;
    }

};

DGE.Audio=Audio;

document.addEventListener("DOMContentLoaded",()=>{
    Audio.init();
});

})();
