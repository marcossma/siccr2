document.addEventListener("DOMContentLoaded", function(event) {
    const apiUrl = "http://localhost:15000/api";
    const urlParam = window.location.pathname;
    
    console.log("Initialized...");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnLogin = document.querySelector("#btnLogin");
    const btnCancelarLogin = document.querySelector("#btnCancelarLogin");
    const dialogLogin = document.querySelector("#dialogLogin");

    // Factory para criar pegar os elementos DOM da página
    function getDomElements() {
        const elements = {
            listaTiposRecursos : document.querySelector(".listaTiposRecursos"),
            btnAdicionar :  document.querySelector(".btn_adicionar"),
            dialogPainel : document.querySelector(".dialogPainel"),
            btnCadastrar : document.querySelector(".cadastrarUnidade"),
            btnCancelar : document.querySelector(".cancelarUnidade"),
            btnAtualizar : document.querySelector(".atualizarUnidade"),
            frmUnidade : document.querySelector(".frmUnidade"),
        };

        return elements;
    }

    // Função para carregar dados
    // --------------------------
    async function carregarDados(endpoint) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const dados = await response.json();
            return dados.data;
        } catch(error) {
            console.error("Erro ao tentar listar os dados: ", error);
        }
    }

    // Função para excluir dados
    // -------------------------
    async function excluirDado(id_dado, endpoint) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}/${id_dado}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.error("Erro ao tentar exluir o dado: ", error);
        }
    }
    
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

        // Função para excluir tipo de recurso cadastrado
        async function excluirTipoRecurso(id_recurso) {
            try {
                const response = await fetch(`${apiUrl}/tipos-recursos/${id_recurso}`,  {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    renderizarTiposRecursos();
                    alert("Item excluido com sucesso.");
                } else {
                    alert("Erro ao excluir item.");
                }
            } catch (error) {
                console.error("Erro: ", error);
                alert("Erro ao tentar excluir item.");
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

        // Rotina para os botões de abrir o formulário para atualizar e excluir
        // ---------------------------------------------------------------------
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

            if (event.target.classList.contains("excluir")) {
                const dadosEl = event.target.dataset;
                
                const confirmacao = confirm("Essa ação não poderá ser desfeita, tem certeza que deseja excluir esse Item?");

                if (confirmacao) {
                    excluirTipoRecurso(dadosEl.id_tipo_recurso);
                }
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
                                <i class="bi bi-x-square excluir" title="Excluir" data-id_tipo_recurso="${recurso.id_tipo_recurso}"></i>
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

    // Rotinas para a página tipos-despesas.html
    // -----------------------------------------
    if (urlParam === "/tipos-despesas") {
        // Obtém os elementos da página através da factory function getDomElements()
        const elements = getDomElements();

        // Função para listar os tipos de despesas
        // ---------------------------------------
        function renderizarTiposDespesas() {
            elements.listaTiposRecursos.innerHTML = "";
            carregarDados("tipos-despesas").then((despesas) => {
                despesas.forEach((despesa) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");

                    divElement.innerHTML = `
                        <div class="dado flex flex--2">${despesa.id_tipo_despesa}</div>
                        <div class="dado flex flex--3">${despesa.tipo_despesa.toUpperCase()}</div>
                        <!--div class="dado flex flex--10">$//{despesa.descricao_despesa.toUpperCase()}</div-->
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-id_tipo_despesa="${despesa.id_tipo_despesa}" data-tipo_despesa="${despesa.tipo_despesa}" data-descricao_despesa="${despesa.descricao_despesa}"></i>
                            <i class="bi bi-x-square excluir" title="Excluir" data-id_tipo_despesa="${despesa.id_tipo_despesa}"></i>
                        </div>
                    `;

                    elements.listaTiposRecursos.appendChild(divElement);
                });
            });
        }

        // Função para cadastrar dados [TERMINAR]
        async function cadastrarDados(dados, endpoint) {
            try {
                const response = await fetch(`${apiUrl}/${endpoint}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(dados)
                });
                
                if (!response.ok) {
                    console.error("Erro ao tentar cadastrar dados: ", response);
                    throw new Error("HTTP error! status: ", response.status);
                }

                const data = await response.json();
                console.log(data);
                renderizarTiposDespesas();
                return data;
            } catch(error) {
                console.error("Erro ao tentar cadastrar dados: ", error);
                throw error;
            }
        }

        // Botão para adicionar despesa
        elements.btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.dialogPainel.showModal();
        });

        // dialogPainel - Botão cancelar
        elements.btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        // dialogPainel - Botão Cadastrar
        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            cadastrarDados(objData, "tipos-despesas");
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        // Botão para excluir despesa
        elements.listaTiposRecursos.addEventListener("click", async function(event) {
            if (event.target.classList.contains("excluir")) {
                const dadosEl = event.target.dataset;

                const confirmacao = confirm("Essa ação não poderá ser desfeita, tem certeza de que deseja excluir essa despesa?");

                if (confirmacao) {
                    await excluirDado(dadosEl.id_tipo_despesa, "tipos-despesas");
                    renderizarTiposDespesas();
                }
            }
        });

        renderizarTiposDespesas();
    }

    

    const dados = JSON.parse(localStorage.getItem("siccr"));
    console.log(dados);
    console.log(dados.permissao); // <-- Aqui retorna undefined


});