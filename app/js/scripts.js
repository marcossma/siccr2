document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnCancelarLogin = document.querySelector("#btnCancelarLogin");
    const dialogLogin = document.querySelector("#dialogLogin");
    
    
    
    
    btnEntrar.addEventListener("click", function(event) {
        event.preventDefault();
        dialogLogin.showModal();
    });

    btnCancelarLogin.addEventListener("click", function(event) {
        event.preventDefault();
        dialogLogin.close();
    })
});