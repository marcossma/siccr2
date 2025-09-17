document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnLogin = document.querySelector("#btnLogin");
    const btnCancelarLogin = document.querySelector("#btnCancelarLogin");
    const dialogLogin = document.querySelector("#dialogLogin");
        
    // Botão para exibir o formulário de login
    // =======================================
    btnEntrar.addEventListener("click", function(event) {
        event.preventDefault();
        dialogLogin.showModal();
    });

    // Botão para efetuar o login
    // ==========================
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
            // console.log(data);
            if (data.status === "success") {
                const dados = `{
                    user_id: "${data.data[0].user_id}",
                    nome: "${data.data[0].nome}",
                    data_nascimento: "${data.data[0].data_nascimento}",
                    whatsapp: "${data.data[0].whatsapp}",
                    subunidade_id: "${data.data[0].subunidade_id}",
                    permissao: "${data.data[0].permissao}",
                    token: "${data.token}"
                }`


                localStorage.setItem("siccr", JSON.stringify(dados));
                localStorage.setItem("siccr_token", data.token);
                // localStorage.setItem("siccr_nome", data.data[0].nome);
                // localStorage.setItem("siccr_email", data.data[0].email);
                // localStorage.setItem("siccr_data_nascimento", data.data[0].data_nascimento);
                // localStorage.setItem("siccr_whatsapp", data.data[0].whatsapp);
                // localStorage.setItem("siccr_subunidade_id", data.data[0].subunidade_id);
                // localStorage.setItem("permissao", data.data[0].permissao);
                // localStorage.setItem("siccr_token", data.token)

                document.querySelector("#frmLogin").reset();
                dialogLogin.close();
                window.location.href = "/"; // Redireciona para a página principal para atualizar o menu
                return;
            }
        })
        .catch((error) => {
            console.log("Erro: ", error);
        });
    });

    // Botão para fechar o formulário de login
    // =======================================
    btnCancelarLogin.addEventListener("click", function(event) {
        event.preventDefault();
        document.querySelector("#frmLogin").reset();
        dialogLogin.close();
    });

    const dados = JSON.parse(localStorage.getItem("siccr"));
    console.log(dados);

});