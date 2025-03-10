document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnLogin = document.querySelector("#btnLogin");
    const btnCancelarLogin = document.querySelector("#btnCancelarLogin");
    const dialogLogin = document.querySelector("#dialogLogin");
        
    btnEntrar.addEventListener("click", function(event) {
        event.preventDefault();
        dialogLogin.showModal();
    });

    btnLogin.addEventListener("click", function(event) {
        event.preventDefault();
        const txtLogin = document.querySelector("#txtLogin").value;
        const txtSenha = document.querySelector("#txtSenha").value;

        const dados = JSON.stringify({siape: txtLogin, senha: txtSenha});

        fetch("http://localhost:15000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: dados
        })
        .then((response) =>  {
            return response.json();
        })
        .then((data) => { 
            console.log(data);
        })
        .catch((error) => {
            console.log("Erro: ", error);
        });
    });

    btnCancelarLogin.addEventListener("click", function(event) {
        event.preventDefault();
        dialogLogin.close();
    });
});