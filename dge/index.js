alert("INDEX BUILD 006");

(async () => {

try {

    alert("Before start");

    await DGEGranthaManager.start();

    alert("After start");

}
catch(e){

    alert(e.message);

    alert(e.stack);

}

})();
