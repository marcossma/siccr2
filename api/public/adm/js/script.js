document.addEventListener("DOMContentLoaded", function(event) {
    const apiUrl = "http://localhost:15000/api";
    const urlParam = window.location.pathname;
  
    // Função para carregar UNIDADES
    async function carregarUnidades() {
        try {
            const response = await fetch(`${apiUrl}/unidades`);
            const unidades = await response.json();

            return unidades.data;
        } catch (error) {
            console.error("Erro ao tentar carregar as unidades: ", error);
        }
    }

    // Função para carregar Subunidades
    async function carregarSubunidades() {
        try {
            const response = await fetch(`${apiUrl}/subunidades`);
            const subunidades = await response.json();

            return subunidades.data;
        } catch (error) {
            console.error("Erro aoo tentar carregar as SUBUNIDADES: ", error);
        }
    }

    // Função para carregar usuários cadastrados
    async function carregarUsuarios() {
        try {
            const response = await fetch(`${apiUrl}/usuarios`);
            const usuarios = await response.json();

            return usuarios;
        } catch(error) {
            console.error(`Erro ao tentar carregar Usuários: ${error}`);
        }
    }

    // Função para carregar PRÉDIOS
    async function carregarPredios() {
        try {
            const response = await fetch(`${apiUrl}/predios`);
            const predios = await response.json();

            return predios.data;
        } catch(error) {
            console.log("Erro ao tentar carregar os prédios: ", error);
        }
    }

    // Função para carregar PRÉDIOS inner UNIDADES
    async function carregarPrediosTotalInfo() {
        try {
            const response = await fetch(`${apiUrl}/predios/total-info`);
            const predios = await response.json();

            return predios.data;
        } catch (error) {
            console.log(`Erro ao tentar listar todas as informações dos prédios: ${error}`);
        }

    }

    // Rotina para o gestão de unidades
    if (urlParam === "/adm/unidades") {
        // Seleção de elementos
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        
        // Função para atualizar informações da Unidade
        async function updateUnidade(idUnidade, codigoUnidade, unidade, sigla) {
            const dadosAtualizar = {
                codigo: codigoUnidade,
                unidade: unidade,
                sigla: sigla
            };

            try {
                await fetch(`${apiUrl}/unidades/${idUnidade}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(dadosAtualizar)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Ocorreu um erro: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // console.log(data);
                    renderizarUnidades();
                }).catch((error) => {
                    console.error(`Ocorreu um erro no fetch: ${error}`);
                });
            } catch (error) {
                console.error(`Ocorreu um erro ao tentar atualizar a unidade: ${error}`);
            }
        }

        // Função para carregar as Unidades cadastradas
        async function renderizarUnidades() {
            listaUnidades.innerHTML = "";
            try {
                const response = await fetch(`${apiUrl}/unidades`);
                const unidades = await response.json();

                unidades.data.forEach((unidade) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML = `
                        <div class="dado flex flex--2">${unidade.codigo}</div>
                        <div class="dado flex flex--10">${unidade.unidade}</div>
                        <div class="dado flex flex--2">${unidade.sigla}</div>
                        <div class="dado flex flex--1 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-id="${unidade.unidade_id}" data-codigo="${unidade.codigo}" data-unidade="${unidade.unidade}" data-sigla="${unidade.sigla}"></i>
                            <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                        </div>
                    `;

                    listaUnidades.appendChild(divElement);
                });
    
            } catch (error) {
                console.error("Erro ao tentar carregar as unidades: ", error);
            }
        }

        renderizarUnidades();

        // Adição de Listeners
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            if (event.target.classList.contains("unidade")) {
                btnAtualizarUnidade.style.display = "none";
                btnCadastrarUnidade.style.display = "inline-block";
                document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar unidade";
                dialogPainel.showModal();
            }
        });
        
        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const codigo = document.querySelector("#txtCodigoUnidade");
            const unidade = document.querySelector("#txtUnidade");
            const sigla = document.querySelector("#txtSigla");

            // Verifica se todos os campos estão preenchidos
            if (!codigo.value || !unidade.value || !sigla.value) {
                alert("Todos os campos devem ser preenchidos.");
                return;
            }

            //Validar o campo Codigo da Unidade para garantir que esteja com "."
            if (codigo.value.split(",").length > 1) {
                codigo.value = codigo.value.replace(",", ".");
            }

            const unidadeNova = {
                codigo: codigo.value,
                unidade: unidade.value,
                sigla: sigla.value
            }

            fetch(`${apiUrl}/unidades`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(unidadeNova)
            }).then((response) => {
                if (!response.ok) {
                    console.error("Ocorreu um erro: ", response.error);
                }

                return response;
            }).then((data) => {
                console.log(data);
                renderizarUnidades();
            }).catch((error) => {
                console.error("Ocorreu um erro em catch: ", error);
            });

            // Ao terminar o processamento, limpa o formulário e fecha o modal.
            frmUnidade.reset();
            dialogPainel.close();
        });

        btnAtualizarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const idUnidade = document.querySelector("#txtIdUnidade").value;
            const codigoUnidade = document.querySelector("#txtCodigoUnidade").value;
            const unidade = document.querySelector("#txtUnidade").value;
            const sigla = document.querySelector("#txtSigla").value;
            updateUnidade(idUnidade, codigoUnidade, unidade, sigla);
            frmUnidade.reset();
            dialogPainel.close();
        });

        // Abrir modal para atualizar os dados da unidade
        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                btnCadastrarUnidade.style.display = "none";
                btnAtualizarUnidade.style.display = "inline-block";
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar unidade";
                // Aplicar os values nos campos de formulário com os valore da unidade
                document.querySelector("#txtIdUnidade").value = event.target.getAttribute("data-id");
                document.querySelector("#txtCodigoUnidade").value = event.target.getAttribute("data-codigo");
                document.querySelector("#txtUnidade").value = event.target.getAttribute("data-unidade");
                document.querySelector("#txtSigla").value = event.target.getAttribute("data-sigla");
                // Pensar em como pegar o id_Unidade e enviar para atualizar
                const id_unidade = event.target.getAttribute("data-id");
                dialogPainel.showModal();
            }

            if (event.target.classList.contains("info")) {
                alert("Funcionalidade em fase de implementação!");
            }
        });
    }

    // Rotina para a gestão de subunidades
    if (urlParam === "/adm/subunidades") {
        console.log("Subunidades"); //<-- Apenas para debug apagar depois...
        // Seleção de elementos
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");


        

        // Adição de Listeners
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            if (event.target.classList.contains("subunidade")) {
                let selectUnidades = document.querySelector("#unidade_id");
                let selectPredios = document.querySelector("#predio_id");
                selectUnidades.innerHTML = "<option value=''>Selecione a unidade...</option>";
                selectPredios.innerHTML = "<option value=''>Selecione o prédio...</option>";
                btnAtualizarUnidade.style.display = "none";
                btnCadastrarUnidade.style.display = "inline-block";

                carregarUnidades().then((unidade) => {
                    unidade.forEach((uni) => {
                        selectUnidades.innerHTML += `
                            <option value="${uni.unidade_id}">${uni.unidade}</option>
                        `;
                    });
                });

                carregarPrediosTotalInfo().then((predios) => {
                    predios.forEach((predio) => {
                        selectPredios.innerHTML += `
                            <option value="${predio.predio_id}">${predio.predio}</option>
                        `;
                    });
                });

                dialogPainel.showModal();
            }
        });

        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objDados = Object.fromEntries(formData.entries());
            console.log(JSON.stringify(objDados));
        })
    }

    // Rotina para a gestão de prédios
    if (urlParam === "/adm/predios") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectUnidades = document.querySelector("#txtUnidade");

        // Função para mostrar a lista de PRÉDIOS
        async function renderizarPredios() {
            // let prediosCarregadosTotalInfo = carregarPrediosTotalInfo();

            carregarPrediosTotalInfo().then((predios) => {
                listaUnidades.innerHTML = "";
    
                predios.forEach((predio) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML = `
                        <div class="dado flex flex--2">${predio.predio}</div>
                        <div class="dado flex flex--10">${predio.descricao}</div>
                        <div class="dado flex flex--2">${predio.sigla}</div>
                        <div class="dado flex flex--1 font--size--20">
                                <i class="bi bi-pencil-square editar" title="Editar" data-id="${predio.predio_id}" data-predio="${predio.predio}" data-descricao="${predio.descricao}" data-unidade="${predio.unidade}" data-unidade_id="${predio.unidade_id}"></i>
                                <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                            </div>
                    `;
    
                    listaUnidades.appendChild(divElement);
                });
            });
        }

        // Função para Cadastrar novo PRÉDIO
        async function cadastrarPredio(predio, descricao = "", unidade_id) {
            if (!predio || !unidade_id) {
                alert("Os campos IDENTIFICAÇÃO DO PRÉDIO e UNIDADE devem ser preenchidos!");
                return;
            }

            const predioNovo = { predio, descricao, unidade_id };

            await fetch(`${apiUrl}/predios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(predioNovo)
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`Erro ao tentar cadastrar novo prédio: ${response.error}`);
                }
                return response.json();
            }).then((data) => {
                console.log(data);
                renderizarPredios();
            }).catch((error) => {
                console.log(`Ocorreu um erro ao tentar cadastrar novo PRÉDIO: ${error}`);
            });

            frmUnidade.reset();
            dialogPainel.close();
        }

        renderizarPredios();

        // Adição de Listeners 
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            let selectUnidades = document.querySelector("#txtUnidade");
            console.log(selectUnidades);

            if (event.target.classList.contains("predio")) {
                selectUnidades.innerHTML = `<option value="">Selecinone a unidade...</option>`
                btnAtualizarUnidade.style.display = "none";
                btnCadastrarUnidade.style.display = "inline-block";
                document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastro de prédio";

                // unidadesCarregadas.then((unidade) => {
                carregarUnidades().then((unidade) => {
                    unidade.forEach((uni) => {
                        selectUnidades.innerHTML += `
                            <option value="${uni.unidade_id}">${uni.unidade}</option>
                        `;
                    });
                });

                dialogPainel.showModal();
            }
        });

        // Cancelar cadastro do PRÉDIO
        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        // Cadastro de PRÉDIO
        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objDados = Object.fromEntries(formData.entries());
            console.log(objDados);
            cadastrarPredio(objDados.txtPredio, objDados.txtPredioDescricao, objDados.txtUnidade);
        });

        // Botão para abrir o formulário de atualização do PRÉDIO
        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                btnCadastrarUnidade.style.display = "none";
                btnAtualizarUnidade.style.display = "inline-block";
                
                selectUnidades.innerHTML = `<option value=''>Selecione a unidade...</option>`;

                carregarUnidades().then((unidades) => {
                    selectUnidades.innerHTML = "<option value=''>Selecione a unidade...</option>";
                    unidades.forEach((unidade) => {
                        console.log(`${unidade.unidade_id} - ${event.target.getAttribute("data-unidade_id")}`);
                        selectUnidades.innerHTML += `
                            <option value="${unidade.unidade_id}">${unidade.unidade}</option>
                        `
                    });
                    // Mantém selecionado a opção que foi cadastrada para a atualização
                    selectUnidades.value = event.target.getAttribute("data-unidade_id");
                });

                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar Prédio";
                // Aplicar os valores do botão editar aos campos do formulário de edição
                document.querySelector("#txtIdPredio").value = event.target.getAttribute("data-id");
                document.querySelector("#txtPredio").value = event.target.getAttribute("data-predio");
                document.querySelector("#txtPredioDescricao").value = event.target.getAttribute("data-descricao");
                document.querySelector("#txtUnidade").value = event.target.getAttribute("data-unidade");

                dialogPainel.showModal();
            }
        });
    }

    if (urlParam === "/adm/usuarios") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectSubunidades = document.querySelector("#subunidade");
        
        selectSubunidades.innerHTML = "<option>Selecione a subunidade de lotação...</option>";

        // Carregamento dos options da lista de subunidades do formulário de cadastro de usuário
        carregarSubunidades().then((subunidades) => {
            subunidades.forEach((subunidade) => {
                const optUnidade = document.createElement("option");
                optUnidade.value = `${subunidade.subunidade_id}`;
                optUnidade.textContent = `${subunidade.nome}`;
    
                selectSubunidades.appendChild(optUnidade);
            });
        });

        carregarUsuarios().then((usuarios) => {
            usuarios.data.forEach((usuario) => {
                console.log(usuario);
                const divElement = document.createElement("div");
                divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                divElement.innerHTML += `
                    <div class="dado flex flex--3">${usuario.nome}</div>
                    <div class="dado flex flex--3">${usuario.email}</div>
                    <div class="dado flex flex--2">${usuario.siape}</div>
                    <div class="dado flex flex--2">${usuario.data_nascimento}</div>
                    <div class="dado flex flex--2">${usuario.subunidade_id}</div>
                    <div class="dado flex flex--3">${usuario.whatsapp}</div>
                    <div class="dado flex flex--3">${usuario.permissao}</div>
                    <div class="dado flex flex--2 font--size--20">
                        <i class="bi bi-pencil-square editar" title="Editar" data-id="${usuario.user_id}" data-nome="${usuario.nome}" data-email="${usuario.email}" data-siape="${usuario.siape} data-data_nascimento="${usuario.data_nascimento} data-subunidade_id="${usuario.subunidade_id} data-whatsapp="${usuario.whatsapp} data-siape="${usuario.permissao}"></i>
                        <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                    </div>
                `;

                listaUnidades.appendChild(divElement);
            });
        });

        // Listener dos botões
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar novo usuário";
            dialogPainel.showModal();
        });

        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            console.log(dados);

            frmUnidade.reset();
            dialogPainel.close();
        });

        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });
    }
});