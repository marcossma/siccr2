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
            console.error("Erro ao tentar carregar as SUBUNIDADES: ", error);
        }
    }

    // Função para carregar Subunidades INNER Usuarios e mais...
    async function carregarSubunidadesTotalInfo() {
        try {
            const response = await fetch(`${apiUrl}/subunidades/total-info`);
            const subunidades = await response.json();
            return subunidades.data;
        } catch(error) {
            console.error("Erro ao tentar carregar as SUBUNIDADES: ", error);
        }
    }

    // Função para carregar usuários cadastrados
    async function carregarUsuarios() {
        try {
            const response = await fetch(`${apiUrl}/usuarios`);
            const usuarios = await response.json();

            return usuarios.data;
        } catch(error) {
            console.error(`Erro ao tentar carregar Usuários: ${error}`);
        }
    }

    //Função para carregar usuários totalInfo
    async function carregarUsuariosTotalInfo() {
        try {
            const response = await fetch(`${apiUrl}/usuarios/total-info`);
            const usuarios = await response.json();
    
            return usuarios.data;
        } catch(error) {
            console.error(`Erro ao tentar carregar Usuários totalInfo: ${error}`);
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

    // Função para carregar SALAS
    async function carregarSalas() {
        try {
            const response = await fetch(`${apiUrl}/salas`);
            const salas = await response.json();

            return salas.data;
        } catch(error) {
            console.error(`Erro ao tentar carregar as salas: ${error}`);
        }
    }

    // Função para carregar SALAS com informações dos prédios e das subunidades
    async function carregarSalasTotalInfo() {
        try {
            const response = await fetch(`${apiUrl}/salas/total-info`);
            const salas = await response.json();

            return salas.data;
        } catch(error) {
            console.error(`Erro ao tentar carregar as salas e suas informações: ${error}`);
        }
    }

    // Função para carregar os TIPOS de SALAS
    async function carregarSalasTipo() {
        try {
            const response = await fetch(`${apiUrl}/salas-tipo`);
            const salas_tipo = await response.json();
    
            return salas_tipo.data;
        } catch(error) {
            console.error(`Erro ao tentar carregar os tipos de sala: ${error}`);
        }
    }

    // =================================
    // Rotina para o gestão de unidades
    // =================================
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

            // Verificar se o código está escrito com . caso contrário atribuir . ao código
            if (codigoUnidade.split(",").length > 1) {
                codigoUnidade = codigoUnidade.replace(",", ".");
            }
            
            const dadosAtualizar = {
                unidade_codigo: codigoUnidade,
                unidade: unidade,
                unidade_sigla: sigla
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
                        <div class="dado flex flex--2">${unidade.unidade_codigo}</div>
                        <div class="dado flex flex--10">${unidade.unidade}</div>
                        <div class="dado flex flex--2">${unidade.unidade_sigla}</div>
                        <div class="dado flex flex--1 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-id="${unidade.unidade_id}" data-codigo="${unidade.unidade_codigo}" data-unidade="${unidade.unidade}" data-unidade_sigla="${unidade.unidade_sigla}"></i>
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
                btnAtualizarUnidade.disabled = true;
                btnCadastrarUnidade.disabled = false;
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

        btnCadastrarUnidade.addEventListener("click", async function(event) {
            event.preventDefault();
            const unidade_id = document.querySelector("#unidade_id").value;
            let unidade_codigo = document.querySelector("#unidade_codigo").value;
            const unidade = document.querySelector("#unidade").value;
            const unidade_sigla = document.querySelector("#unidade_sigla").value;

            // Verifica se todos os campos estão preenchidos
            if (!unidade_codigo || !unidade || !unidade_sigla) {
                alert("Todos os campos devem ser preenchidos.");
                return;
            }

            //Validar o campo Codigo da Unidade para garantir que esteja com "."
            if (unidade_codigo.split(",").length > 1) {
                unidade_codigo = unidade_codigo.replace(",", ".");
            }

            const unidadeNova = {
                unidade_codigo,
                unidade,
                unidade_sigla
            }

            await fetch(`${apiUrl}/unidades`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(unidadeNova)
            }).then((response) => {
                if (!response.ok) {
                    console.error("Ocorreu um erro: ", response.error);
                }

                return response.json();
            }).then((data) => {
                //console.log(data);
                // Fazer retorno visual para informar sucesso ou erro no cadastro da unidade
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
            const unidade_id = document.querySelector("#unidade_id").value;
            const unidade_codigo = document.querySelector("#unidade_codigo").value;
            const unidade = document.querySelector("#unidade").value;
            const unidade_sigla = document.querySelector("#unidade_sigla").value;
            updateUnidade(unidade_id, unidade_codigo, unidade, unidade_sigla);
            frmUnidade.reset();
            dialogPainel.close();
        });

        // Abrir modal para atualizar os dados da unidade
        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                btnCadastrarUnidade.style.display = "none";
                btnCadastrarUnidade.disabled = true;
                btnAtualizarUnidade.disabled = false;
                btnAtualizarUnidade.style.display = "inline-block";
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar unidade";
                // Aplicar os values nos campos de formulário com os valore da unidade
                document.querySelector("#unidade_id").value = event.target.getAttribute("data-id");
                document.querySelector("#unidade_codigo").value = event.target.getAttribute("data-codigo");
                document.querySelector("#unidade").value = event.target.getAttribute("data-unidade");
                document.querySelector("#unidade_sigla").value = event.target.getAttribute("data-unidade_sigla");
                // Pensar em como pegar o id_Unidade e enviar para atualizar
                const unidade_id = event.target.getAttribute("data-id");
                dialogPainel.showModal();
            }

            if (event.target.classList.contains("info")) {
                alert("Funcionalidade em fase de implementação!");
                return;
            }
        });
    } // Fim /adm/unidades

    // ====================================
    // Rotina para a gestão de subunidades
    // ====================================
    if (urlParam === "/adm/subunidades") {
        // Seleção de elementos
        const titulo = document.querySelector(".titulo_painel h1");
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");

        // Abrir modal para atualizar os dados da SUBUNIDADE
        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                let selectChefe = document.querySelector("#chefe");
                let selectUnidade = document.querySelector("#unidade_id");
                let selectPredio = document.querySelector("#predio_id");
                btnCadastrarUnidade.style.display = "none";
                btnCadastrarUnidade.disabled = true;
                btnAtualizarUnidade.disabled = false;
                btnAtualizarUnidade.style.display = "inline-block";
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar subunidade";
                // Aplicar os values nos campos de formulário com os valores da subunidade
                document.querySelector("#subunidade_id").value = event.target.getAttribute("data-subunidade_id")
                document.querySelector("#subunidade_codigo").value = event.target.getAttribute("data-subunidade_codigo");
                document.querySelector("#subunidade_nome").value = event.target.getAttribute("data-subunidade_nome");
                document.querySelector("#subunidade_email").value = event.target.getAttribute("data-subunidade_email");
                document.querySelector("#subunidade_sigla").value = event.target.getAttribute("data-subunidade_sigla");
                
                // Listando usuários para seleção de CHEFIA
                carregarUsuarios().then((usuarios) => {
                    selectChefe.innerHTML = "";
                    usuarios.forEach((usuario) => {
                        selectChefe.innerHTML += `
                            <option value="${usuario.user_id}">${usuario.nome}</option>
                        `;
                    })

                    document.querySelector("#chefe").value = event.target.getAttribute("data-subunidade_chefe");
                });

                // Listando unidades para a seleção da UNIDADE
                carregarUnidades().then((unidades) => {
                    selectUnidade.innerHTML = "";
                    unidades.forEach((unidade) => {
                        selectUnidade.innerHTML += `
                            <option value="${unidade.unidade_id}">${unidade.unidade}</option>
                        `;
                    });

                    document.querySelector("#unidade_id").value = event.target.getAttribute("data-unidade_id");
                });

                carregarPredios().then((predios) => {
                    selectPredio.innerHTML = "";
                    predios.forEach((predio) => {
                        selectPredio.innerHTML += `
                            <option value="${predio.predio_id}">${predio.predio}</option>
                        `;
                    });

                    document.querySelector("#predio_id").value = event.target.getAttribute("data-predio_id");
                });

                dialogPainel.showModal();
            }

            if (event.target.classList.contains("info")) {
                alert("Funcionalidade em fase de implementação!");
                return;
            }
        });

        // Função para mostrar a lista de SUBUNIDADES
        async function renderizarSubunidades() {
            carregarSubunidadesTotalInfo().then((subunidades) => {
                listaUnidades.innerHTML = "";

                subunidades.forEach((subunidade) => {
                    const divElement  = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML = `
                        <div class="dado flex flex--1">${subunidade.subunidade_codigo}</div>
                        <div class="dado flex flex--6">${subunidade.subunidade_nome}</div>
                        <div class="dado flex flex--6">${subunidade.subunidade_email}</div>
                        <div class="dado flex flex--3">${subunidade.subunidade_sigla.toUpperCase()}</div>
                        <div class="dado flex flex--2">${subunidade.unidade_sigla}</div>
                        <div class="dado flex flex--3">${subunidade.nome}</div>
                        <div class="dado flex flex--2">${subunidade.predio}</div>
                        <div class="dado flex flex--1 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-subunidade_id="${subunidade.subunidade_id}" data-subunidade_codigo="${subunidade.subunidade_codigo}" data-subunidade_nome="${subunidade.subunidade_nome}" data-subunidade_email="${subunidade.subunidade_email}" data-subunidade_sigla="${subunidade.subunidade_sigla}" data-subunidade_chefe="${subunidade.chefe}" data-unidade_id="${subunidade.unidade_id}" data-predio_id="${subunidade.predio_id}"></i>
                            <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                        </div>
                    `;

                    titulo.textContent = `Painel Administrativo - Subunidades (${subunidade.total_subunidades})`;
                    listaUnidades.appendChild(divElement);
                });
            })
        }

        async function atualizarSubunidade(dados) {
            console.log(dados);
            try {
                await fetch(`${apiUrl}/subunidades/${dados.subunidade_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar Subunidade: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // Após realizar a atualização da Subunidade, renderiza novamente a lista
                    console.log(data);
                    renderizarSubunidades();
                    frmUnidade.reset();
                    dialogPainel.close();
                }).catch((error) => {
                    console.error(`Erro ao tentar atualizar Subunidade: ${error}`);
                })
            } catch (error) {
                console.log(`Erro ao tentar atualizar Subunidade: ${error}`);
            }
        }

        renderizarSubunidades();    

        // Adição de Listeners
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            if (event.target.classList.contains("subunidade")) {
                let selectUnidades = document.querySelector("#unidade_id");
                let selectPredios = document.querySelector("#predio_id");
                let selectUsuarios = document.querySelector("#chefe");
                selectUnidades.innerHTML = "<option value=''>Selecione a unidade...</option>";
                selectPredios.innerHTML = "<option value=''>Selecione o prédio...</option>";
                btnAtualizarUnidade.style.display = "none";
                btnAtualizarUnidade.disabled = true;
                btnCadastrarUnidade.disabled = false;
                btnCadastrarUnidade.style.display = "inline-block";

                console.log(selectUsuarios);

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

                carregarUsuarios().then((usuarios) => {
                    usuarios.forEach((usuario) => {
                        selectUsuarios.innerHTML += `
                            <option value="${usuario.user_id}">${usuario.nome}</option>
                        `;
                    });
                });

                btnAtualizarUnidade.addEventListener("click", function(event) {
                    event.preventDefault();
                    console.log("Clicou!");
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
            cadastrarSubunidade(objDados);
        });

        btnAtualizarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            console.log("Clicado!");

            const formData = new FormData(frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            console.log(objData);
            atualizarSubunidade(objData);
        });

        // Função para Cadastrar nova SUBUNIDADE
        async function cadastrarSubunidade(dados) {
            listaUnidades.innerHTML = ""; // Limpa a lista de dados para renderizar novamente
            
            if (isNaN(dados.chefe)) dados.chefe = null;

            if (!dados.subunidade_nome || !dados.subunidade_codigo) {
                alert("Os campos Código da Subunidade e Nome da Subunidade devem ser preenchidos!");
                return;
            }

            await fetch(`${apiUrl}/subunidades`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`Erro ao tentar cadastrar nova subunidade: ${response.error}`);
                }
                return response.json();
            }).then((data) => {
                console.log(data);
                frmUnidade.reset();
                renderizarSubunidades();
                dialogPainel.close();
            }).catch((error) => {
                console.log(`Ocorreu um erro ao tentar cadastrar nova subunidade: ${error}`);
            });
        }
    } // Fim /adm/subunidades

    // ================================
    // Rotina para a gestão de prédios
    // ================================
    if (urlParam === "/adm/predios") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectUnidades = document.querySelector("#unidade_id");

        // Função para mostrar a lista de PRÉDIOS
        async function renderizarPredios() {
            carregarPrediosTotalInfo().then((predios) => {
                listaUnidades.innerHTML = "";
    
                predios.forEach((predio) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML = `
                        <div class="dado flex flex--2">${predio.predio}</div>
                        <div class="dado flex flex--10">${predio.descricao}</div>
                        <div class="dado flex flex--2">${predio.unidade_sigla}</div>
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
                // console.log(data);
                renderizarPredios();
            }).catch((error) => {
                console.log(`Ocorreu um erro ao tentar cadastrar novo PRÉDIO: ${error}`);
            });

            frmUnidade.reset();
            dialogPainel.close();
        }

        async function atualizarPredio(predio_id, predio, descricao, unidade_id) {
            const dadosAtualizar = {
                predio: predio,
                descricao: descricao,
                unidade_id: unidade_id
            };

            try {
                await fetch(`${apiUrl}/predios/${predio_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dadosAtualizar)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar prédio: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // Após realizar a atualização do prédio, renderiza novamente a lista
                    console.log(data);
                    renderizarPredios();
                }).catch((error) => {
                    console.error(`Erro ao tentar atualizar prédio: ${error}`);
                })
            } catch (error) {
                console.log(`Erro ao tentar atualizar prédio: ${error}`);
            }
        }

        renderizarPredios();

        // Adição de Listeners 
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            let selectUnidades = document.querySelector("#unidade_id");

            if (event.target.classList.contains("predio")) {
                selectUnidades.innerHTML = `<option value="">Selecinone a unidade...</option>`
                btnAtualizarUnidade.style.display = "none";
                btnAtualizarUnidade.disabled = true;
                btnCadastrarUnidade.disabled = false;
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
            cadastrarPredio(objDados.predio, objDados.descricao, objDados.unidade_id);
        });

        btnAtualizarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objDados = Object.fromEntries(formData.entries());
            atualizarPredio(parseInt(objDados.predio_id), objDados.predio, objDados.descricao, parseInt(objDados.unidade_id));
            renderizarPredios();
            frmUnidade.reset();
            dialogPainel.close();
        });

        // Botão para abrir o formulário de atualização do PRÉDIO
        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                btnCadastrarUnidade.style.display = "none";
                btnCadastrarUnidade.disabled = true;
                btnAtualizarUnidade.disabled = false;
                btnAtualizarUnidade.style.display = "inline-block";
                
                selectUnidades.innerHTML = `<option value=''>Selecione a unidade...</option>`;

                carregarUnidades().then((unidades) => {
                    selectUnidades.innerHTML = "<option value=''>Selecione a unidade...</option>";
                    unidades.forEach((unidade) => {
                        selectUnidades.innerHTML += `
                            <option value="${unidade.unidade_id}">${unidade.unidade}</option>
                        `
                    });
                    // Mantém selecionado a opção que foi cadastrada para a atualização
                    selectUnidades.value = event.target.getAttribute("data-unidade_id");
                });

                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar Prédio";
                // Aplicar os valores do botão editar aos campos do formulário de edição
                document.querySelector("#predio_id").value = event.target.getAttribute("data-id");
                document.querySelector("#predio").value = event.target.getAttribute("data-predio");
                document.querySelector("#descricao").value = event.target.getAttribute("data-descricao");
                document.querySelector("#unidade_id").value = event.target.getAttribute("data-unidade");

                dialogPainel.showModal();
            }
        });
    } // Fim /adm/predios

    // ================================
    // Rotina para a gestão de Usuários
    // ================================
    
    if (urlParam === "/adm/usuarios") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectSubunidades = document.querySelector("#subunidade_id");
        
        selectSubunidades.innerHTML = "<option>Selecione a subunidade de lotação...</option>";

        // Função para adicionar novo usuário
        function cadastrarUsuario(usuario) {
            fetch(`${apiUrl}/usuarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }, 
                body: usuario
            }).then((response) => {
                if (!response.ok) {
                    console.error(`Erro ao tentar cadastrar usuário: ${response.error}`);
                }

                return response.json();
            }).then((data) => {
                renderizarUsuarios();
            }).catch((error) => {
                console.error(`Ocorreu um erro: ${error}`);
            });
        }

        // Carregamento dos options da lista de subunidades do formulário de cadastro de usuário
        carregarSubunidades().then((subunidades) => {
            subunidades.forEach((subunidade) => {
                const optUnidade = document.createElement("option");
                optUnidade.value = `${subunidade.subunidade_id}`;
                optUnidade.textContent = `${subunidade.subunidade_nome}`;
    
                selectSubunidades.appendChild(optUnidade);
            });
        });

        function renderizarUsuarios() {
            carregarUsuariosTotalInfo().then((usuarios) => {
                listaUnidades.innerHTML = "";
                usuarios.forEach((usuario) => {
                    // Formatando data em dd/mm/aaaa
                    const data = new Date(usuario.data_nascimento);
                    const dataFormatada = data.toLocaleDateString("pt-BR");

                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML += `
                        <div class="dado flex flex--5">${usuario.nome}</div>
                        <div class="dado flex flex--4">${usuario.email}</div>
                        <div class="dado flex flex--2">${usuario.siape}</div>
                        <!--div class="dado flex flex--3">${usuario.data_nascimento}</div-->
                        <div class="dado flex flex--3">${dataFormatada}</div>
                        <div class="dado flex flex--2">${usuario.subunidade_sigla.toUpperCase()}</div>
                        <div class="dado flex flex--2">${usuario.whatsapp}</div>
                        <div class="dado flex flex--4">${usuario.permissao.toUpperCase()}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-user_id="${usuario.user_id}" data-nome="${usuario.nome}" data-email="${usuario.email}" data-siape="${usuario.siape}" data-data_nascimento="${usuario.data_nascimento}" data-subunidade_id="${usuario.subunidade_id}" data-whatsapp="${usuario.whatsapp}" data-permissao="${usuario.permissao}"></i>
                            <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                        </div>
                    `;
    
                    listaUnidades.appendChild(divElement);
                });
            });
        }

        async function atualizarUsuario(dados) {
            try {
                await fetch(`${apiUrl}/usuarios/${dados.user_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar Usuário: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // Após realizar a atualização da Subunidade, renderiza novamente a lista
                    renderizarUsuarios();
                    frmUnidade.reset();
                    dialogPainel.close();
                }).catch((error) => {
                    console.error(`Erro ao tentar atualizar Usuário: ${error}`);
                })
            } catch (error) {
                console.log(`Erro ao tentar atualizar Usuário: ${error}`);
            }
        }

        renderizarUsuarios();

        // Listener dos botões USUÁRIOS
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar novo usuário";
            btnCadastrarUnidade.style.display = "inline-block";
            btnCadastrarUnidade.disabled = false;
            btnAtualizarUnidade.style.display = "none";
            btnAtualizarUnidade.disabled = true;
            document.querySelector(".senha").style.display = "block";
            dialogPainel.showModal();
        });

        // Cadastrar usuário no banco
        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            // dados.permissoes = formData.getAll("permissoes");
            console.log(JSON.stringify(dados));

            cadastrarUsuario(JSON.stringify(dados));

            frmUnidade.reset();
            dialogPainel.close();
        });

        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const dadosEl = event.target.dataset;

                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar usuário";
                btnCadastrarUnidade.style.display = "none";
                btnCadastrarUnidade.disabled = true;
                btnAtualizarUnidade.style.display = "inline-block";
                btnAtualizarUnidade.disabled = false;

                document.querySelector("#user_id").value = dadosEl.user_id;
                document.querySelector("#nome").value = dadosEl.nome;
                document.querySelector("#email").value = dadosEl.email;
                document.querySelector("#siape").value = dadosEl.siape;
                document.querySelector(".senha").style.display = "none";
                document.querySelector("#data_nascimento").value = dadosEl.data_nascimento.split("T")[0]; // Formata a data de nascimento para poder inserir no campo
                document.querySelector("#whatsapp").value = dadosEl.whatsapp;
                document.querySelector("#subunidade_id").value = dadosEl.subunidade_id;
                
                // Aqui obetemos todos os input radio permissao para fazermos um loop e marcarmos o correspondente 
                const radioPermissaoEl = document.querySelectorAll("input[name='permissao']");

                radioPermissaoEl.forEach((radio) => {
                    if (radio.value === dadosEl.permissao) {
                        radio.checked = true;
                    }
                });

                btnAtualizarUnidade.addEventListener("click", function(event) {
                    event.preventDefault();

                    const formData = new FormData(frmUnidade);
                    const objData = Object.fromEntries(formData.entries());
                    // atualizarSubunidade(JSON.stringify(objData));
                    atualizarUsuario(objData);
                });

                dialogPainel.showModal();
            }
        });
    } // Fim /adm/usuarios

    // =============================
    // Rotina para a gestão de Salas
    // =============================
    if (urlParam === "/adm/salas") {

        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectSubunidades = document.querySelector("#subunidade_id");
        const selectPredios = document.querySelector("#predio_id");
        const selectSalasTipo = document.querySelector("#sala_tipo_id");

        // Função para renderizar Salas
        function renderizarSalas() {
            carregarSalasTotalInfo().then((salas) => {
                listaUnidades.innerHTML = "";
                salas.forEach((sala) => {

                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML += `
                        <div class="dado flex flex--2">${sala.sala_nome}</div>
                        <div class="dado flex flex--2">${sala.predio}</div>
                        <div class="dado flex flex--4">${sala.subunidade_nome}</div>
                        <div class="dado flex flex--4">${sala.sala_tipo_nome.toUpperCase()}</div>
                        <div class="dado flex flex--4">${sala.sala_descricao}</div>
                        <div class="dado flex flex--2">${!sala.is_agendavel ? "Não": "Sim"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-sala_id="${sala.sala_id}" data-sala_nome="${sala.sala_nome}" data-predio_id="${sala.predio_id}" data-subunidade_id="${sala.subunidade_id}" data-sala_descricao="${sala.sala_descricao}" data-is_agendavel="${sala.is_agendavel}" data-sala_tipo_id="${sala.sala_tipo_id}"></i>
                            <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                        </div>
                    `;
    
                    listaUnidades.appendChild(divElement);
                });
            });
        }

        // Função para atualizar sala
        async function atualizarSala(dados) {
            try {
                await fetch(`${apiUrl}/salas/${dados.sala_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar Sala: ${response.error}`);
                    }

                    return response.json();
                }).then((data) => {
                    // Após realizar a atualização da Subunidade, renderiza novamente a lista
                    renderizarSalas();
                    frmUnidade.reset();
                    dialogPainel.close();
                }).catch((error) => {
                    console.error(`Erro ao tentar atualizar sala (Catch): ${error}`);
                })
            } catch (error) {
                console.log(`Erro ao tentar atualizar Sala: ${error}`);
            }
        }

        // Função para cadastrar nova sala
        async function cadastrarNovaSala(dados) {
            try {
                await fetch(`${apiUrl}/salas`, {
                    method: "POST",
                    headers: {
                        "Content-type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar cadastrar nova sala: ${error}`);
                    }
    
                    return response.json();
                }).then((data) => {
                    renderizarSalas();
                    frmUnidade.reset();
                    dialogPainel.close();
                })
            } catch (error) {
                console.error(`Erro ao tentar cadastrar nova sala (catch): ${error}`);
            }
        }

        renderizarSalas();

        // Botão canto superior direito da tela "Abre formulário de cadastro de sala"
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar nova sala";
            btnCadastrarUnidade.style.display = "inline-block";
            btnCadastrarUnidade.disabled = false;
            btnAtualizarUnidade.style.display = "none";
            btnAtualizarUnidade.disabled = true;

            carregarPrediosTotalInfo().then((predios) => {
                selectPredios.innerHTML = `<option value="">Selecione o prédio onde se encontra a sala...</option>`;
                predios.forEach((predio) => {
                    selectPredios.innerHTML += `
                        <option value="${predio.predio_id}">${predio.predio}</option>
                    `;
                });
            });

            carregarSubunidadesTotalInfo().then((subunidades) => {
                selectSubunidades.innerHTML = `<option value="">Selecione o departamento responsável pela sala...</option>`;
                subunidades.forEach((subunidade) => {
                    selectSubunidades.innerHTML += `
                        <option value="${subunidade.subunidade_id}">${subunidade.subunidade_nome}</option>
                    `;
                });
            });

            carregarSalasTipo().then((salas_tipo) => {
                selectSalasTipo.innerHTML = `<option value="">Selecione o tipo de sala...</option>`;
                salas_tipo.forEach((sala_tipo) => {
                    selectSalasTipo.innerHTML += `
                        <option value="${sala_tipo.sala_tipo_id}">${sala_tipo.sala_tipo_nome.toUpperCase()}</option>
                    `;
                });
            });

            dialogPainel.showModal();
        });

        // Botão para Cadastrar a nova Sala
        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objData = Object.fromEntries(formData.entries());

            cadastrarNovaSala(objData);
        });

        // Botão para "Cancelar" do form de Cadastro/Atualização de sala
        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        btnAtualizarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade); // Captura todos os campos do formulário de forma automática
            const objData = Object.fromEntries(formData.entries()); // Transforma os dados do formulário em um objeto

            atualizarSala(objData);
        });

        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const dadosEl = event.target.dataset;
                
                // ########################################################################
                // Criar rota para Salas_tipo e funções respectivas para frontend e backend
                // ########################################################################

                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar sala";
                btnCadastrarUnidade.style.display = "none";
                btnCadastrarUnidade.disabled = true;
                btnAtualizarUnidade.style.display = "inline-block";
                btnAtualizarUnidade.disabled = false;

                carregarSubunidades().then((subunidades) => {
                    selectSubunidades.innerHTML = "<option value=''>Selecione o departamento responsável pela sala...</option>";
                    subunidades.forEach((subunidade) => {
                        selectSubunidades.innerHTML += `
                            <option value="${subunidade.subunidade_id}">${subunidade.subunidade_nome}</option>
                        `;
                    });
                    // Mantém a subunidade que foi selecionada na atualização
                    selectSubunidades.value = event.target.getAttribute("data-subunidade_id");
                });

                carregarPredios().then((predios) => {
                    selectPredios.innerHTML = "<option value=''>Selecione o prédio onde se encontra a sala...</option>";
                    predios.forEach((predio) => {
                        selectPredios.innerHTML += `
                            <option value="${predio.predio_id}">${predio.predio}</option>
                        `;
                    });
                    // Manter o prédio que foi selecionado na atualização
                    selectPredios.value = event.target.getAttribute("data-predio_id");
                });

                carregarSalasTipo().then((salas_tipo) => {
                    selectSalasTipo.innerHTML = "<option value=''>Selecione o tipo de sala...</option>";
                    salas_tipo.forEach((sala_tipo) => {
                        selectSalasTipo.innerHTML += `
                            <option value="${sala_tipo.sala_tipo_id}">${sala_tipo.sala_tipo_nome}</option>
                        `;
                    });
                    selectSalasTipo.value = event.target.getAttribute("data-sala_tipo_id");
                });

                document.querySelector("#sala_id").value = dadosEl.sala_id;
                document.querySelector("#sala_nome").value = dadosEl.sala_nome;
                document.querySelector("#predio_id").value = dadosEl.predio_id;
                document.querySelector("#subunidade_id").value = dadosEl.subunidade_id;
                document.querySelector("#sala_descricao").value = dadosEl.sala_descricao;
                
                const radioAgendavel = document.querySelectorAll("input[name='is_agendavel']");

                // Verifica o valor atual do radio button e mantém
                radioAgendavel.forEach((radio) => {
                    if (radio.value === dadosEl.is_agendavel) {
                        radio.checked = true;
                    }
                });

                dialogPainel.showModal();
            }
        });

        


    } // Fim /adm/salas

    if (urlParam === "/adm/salas-tipo") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnAtualizarUnidade = document.querySelector(".atualizarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");

        function renderizarSalasTipo() {
            carregarSalasTipo().then((salas_tipo) => {
                listaUnidades.innerHTML = "";
                salas_tipo.forEach((sala_tipo) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    divElement.innerHTML += `
                        <div class="dado flex flex--2">${sala_tipo.sala_tipo_id}</div>
                        <div class="dado flex flex--10">${sala_tipo.sala_tipo_nome.toUpperCase()}</div>
                        
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar" data-sala_tipo_id="${sala_tipo.sala_tipo_id}" data-sala_tipo_nome="${sala_tipo.sala_tipo_nome}"></i>
                            <i class="bi bi-info-circle info" title="Ver mais informações" data-tipo="info"></i>
                        </div>
                    `;
    
                    listaUnidades.appendChild(divElement);
                });
            });
        }

        async function cadastrarTipoSala(dados) {
            try {
                await fetch(`${apiUrl}/salas-tipo`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar cadastrar novo tipo de sala: ${response.error}`);
                    }
    
                    return response.json();
                }).then((data) => {
                    renderizarSalasTipo();
                    console.log(data);
                    frmUnidade.reset();
                    dialogPainel.close();
                });
            } catch (error) {
                console.error(`Erro ao tentar cadastrar novo tipo de sala (catch): ${error}`);
            }
        }

        async function atualizarSalaTipo(dados) {
            try {
                await fetch(`${apiUrl}/salas-tipo/${dados.sala_tipo_id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }).then((response) => {
                    if (!response.ok) {
                        console.error(`Erro ao tentar atualizar o tipo de sala: ${response.error}`);
                    }
    
                    return response.json();
                }).then((data) => {
                    renderizarSalasTipo();
                    console.log(data);
                    frmUnidade.reset();
                    dialogPainel.close();
                })
            } catch (error) {
                console.error(`Erro ao tentar atualizar o tipo de sala (catch): ${error}`);
            }
        }

        renderizarSalasTipo();
        
        btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastro de tipo de sala";
            btnAtualizarUnidade.disabled = true;
            btnAtualizarUnidade.style.display = "none";
            btnCadastrarUnidade.disabled = false;
            btnCadastrarUnidade.style.display = "inline-block";
            dialogPainel.showModal();
        });

        btnCancelarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            frmUnidade.reset();
            dialogPainel.close();
        });

        btnCadastrarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objData = Object.fromEntries(formData.entries());

            console.log(objData);
            cadastrarTipoSala(objData);
        });

        btnAtualizarUnidade.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(frmUnidade);
            const objData = Object.fromEntries(formData.entries());

            atualizarSalaTipo(objData);

        });

        listaUnidades.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                document.querySelector(".dialogPainel fieldset legend").textContent = "Atualizar tipo de sala";
                btnCadastrarUnidade.disabled = true;
                btnCadastrarUnidade.style.display = "none";
                btnAtualizarUnidade.disabled = false;
                btnAtualizarUnidade.style.display = "inline-block";

                document.querySelector("#sala_tipo_id").value = event.target.getAttribute("data-sala_tipo_id");
                document.querySelector("#sala_tipo_nome").value = event.target.getAttribute("data-sala_tipo_nome");
    
                dialogPainel.showModal();
            }
        })

    } // Fim /adm/salas-tipo


});