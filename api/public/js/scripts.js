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
        const btnAdicionar =  document.querySelector(".btn_adicionar");
        const dialogPainel = document.querySelector(".dialogPainel");
        const btnCadastrar = document.querySelector(".cadastrarUnidade");
        const btnCancelar = document.querySelector(".cancelarUnidade");
        const btnAtualizar = document.querySelector(".atualizarUnidade");
        const frmUnidade = document.querySelector(".frmUnidade");

        // # Funções Auxiliares
        // Função para atualizar os dados
        async function atualizarTipoRecurso(dados) {
            try {
                await fetch(`${apiUrl}/tipos-recursos/${dados.id_tipo_recurso}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar o tipo de recurso: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // Após efetuar a atualização, renderiza novamente a lista
                    renderizarTiposRecursos();
                    frmUnidade.reset();
                    dialogPainel.close();
                }).catch((error) => {
                    console.error("Erro ao tentar atualizar o tipo de recurso: ", error);
                });
            } catch(error) {
                console.error("ERro ao tentar atualizar o tipo de recurso: ", error);
            }
        }

        // Função apra cadastrar novo tipo de recurso
        async function cadastrarTipoRecurso(dados) {
            try{
                await fetch(`${apiUrl}/tipos-recursos`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error("Erro ao tentar cadastrar novo tipo de recurso. ", response.error);
                    }

                    return response.json();
                }).then((data) => {
                    renderizarTiposRecursos();
                    frmUnidade.reset();
                    dialogPainel.close();
                }).catch((error) => {
                    console.error("Erro ao tentar cadastrar novo tipo de recurso. ", error);
                });
            }catch(error) {
                console.error("Erro ao tentar cadastrar novo tipo de recurso. ", error);
            }
        }

        // Rotina para o botão Adicionar Tipos Recursos
        // --------------------------------------------
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();

            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar tipo de recurso";
            btnAtualizar.disabled = true;
            btnAtualizar.style.display = "none";
            btnCadastrar.disabled = false;
            btnCadastrar.style.display = "inline-block";
            dialogPainel.showModal();
        });

        // Rotina para o botão Cadastrar
        // ------------------------------
        btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();

            const formData = new FormData(frmUnidade); // Obtém todos os campos do formulário de forma automática
            const objData = Object.fromEntries(formData.entries()); // Transforma os dados em objeto.

            cadastrarTipoRecurso(objData);
        });

        // Rotina para o botão Atualizar
        // -----------------------------
        btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade); // Captura todos os campos do formulário de forma automática
            const objData = Object.fromEntries(formData.entries()); // Transforma os dados do formulário em um objeto

            atualizarTipoRecurso(objData);
        });

        btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            
            frmUnidade.reset();
            dialogPainel.close();
        });

        // Rotina para o botão de abrir o formulário para atualizar
        // ---------------------------------------------------------
        listaTiposRecursos.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const dadosEl = event.target.dataset;

                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar tipo de recurso";
                btnCadastrar.disabled = true;
                btnCadastrar.style.display = "none";
                btnAtualizar.disabled = false;
                btnAtualizar.style.display = "inline-block";

                document.querySelector("#id_tipo_recurso").value = dadosEl.id_tipo_recurso;
                document.querySelector("#tipo_recurso").value = dadosEl.tipo_recurso;
                document.querySelector("#descricao_recurso").value = dadosEl.descricao_recurso;

                dialogPainel.showModal();
            }
        });
        
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
                                <i class="bi bi-pencil-square editar" title="Editar" data-id_tipo_recurso="${recurso.id_tipo_recurso}" data-tipo_recurso="${recurso.tipo_recurso}" data-descricao_recurso="${recurso.descricao_recurso}"></i>
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