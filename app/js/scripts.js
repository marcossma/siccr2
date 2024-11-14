document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const dialogLogin = document.querySelector("#dialogLogin");
    
    
    
    
    btnEntrar.addEventListener("click", function(event) {
        dialogLogin.showModal();
    });
});