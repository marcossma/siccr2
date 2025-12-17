document.addEventListener("DOMContentLoaded", function(event) {
    const apiUrl = "http://localhost:15000/api";
    const urlParam = window.location.pathname;
    
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnLogin = document.querySelector("#btnLogin");
    const btnCancelarLogin = document.querySelector("#btnCancelarLogin");
    const dialogLogin = document.querySelector("#dialogLogin");

    
    // ----------------------
    // Rotinas do FINANCEIRO
    // ----------------------

    // Função para carregar tipos de recursos
        async function carregarTiposRecursos() {
            try {
                const response = await fetch(`${apiUrl}/tipos-recursos`);
                const tiposRecursos = await response.json();

                return tiposRecursos.data;
            } catch (error) {
                console.error("Erro ao tentar listar os tipos de recursos: ", error);
            }
        }

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
                const dados = {
                    user_id: data.data[0].user_id,
                    nome: data.data[0].nome,
                    data_nascimento: data.data[0].data_nascimento,
                    whatsapp: data.data[0].whatsapp,
                    subunidade_id: data.data[0].subunidade_id,
                    permissao: data.data[0].permissao,
                    token: data.token
                };

                localStorage.setItem("siccr", JSON.stringify(dados));
                localStorage.setItem("siccr_token", data.token);
                localStorage.setItem("permissao", data.data[0].permissao);

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

    // Rotinas para a página tipos-recursos.html
    // =========================================
    if (urlParam === "/tipos-recursos") {
        console.log("Tipos de recursos");
        const listaTiposRecursos = document.querySelector(".listaTiposRecursos");
        
        // Função para listar os tipos de recursos e exibir na tela
        async function renderizarTiposRecursos() {
            listaTiposRecursos.innerHTML = "";
            try {
                carregarTiposRecursos().then((recursos) => {
                    recursos.forEach((recurso) => {
                        const divElement = document.createElement("div");
                        divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                        divElement.innerHTML = `
                            <div class="dado flex flex--2">${recurso.id_tipo_recurso}</div>
                            <div class="dado flex flex--3">${recurso.tipo_recurso.toUpperCase()}</div>
                            <div class="dado flex flex--10">${recurso.descricao_recurso.toUpperCase()}</div>
                            <div class="dado flex flex--2 font--size--20">
                                <i class="bi bi-pencil-square editar" title="Editar"></i>
                            </div>
                        `;

                        listaTiposRecursos.appendChild(divElement);
                    });
                });

            } catch (error) {
                console.error("Erro ao tentar renderizar os tipos de recursos: ", error);
            }
        }

        renderizarTiposRecursos();
    }

    const dados = JSON.parse(localStorage.getItem("siccr"));
    console.log(dados);
    console.log(dados.permissao); // <-- Aqui retorna undefined


});