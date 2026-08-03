
window.DGEPDF={
 inspect(file){
   return {
     name:file.name,
     size:file.size,
     type:file.type,
     extension:file.name.split('.').pop().toLowerCase()
   };
 },
 prepare(file){
   return {
      accepted:file && file.name.toLowerCase().endsWith('.pdf'),
      status:'Ready for PDF.js page loading module',
      estimatedPages:'Unknown until PDF.js is integrated'
   };
 }
};
