// PDF module placeholder with real helper functions
window.DGEPDF={
  isPdf(file){return file && (file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'));},
  formatBytes(bytes){
    if(bytes<1024)return bytes+' B';
    if(bytes<1048576)return (bytes/1024).toFixed(1)+' KB';
    return (bytes/1048576).toFixed(2)+' MB';
  }
};
