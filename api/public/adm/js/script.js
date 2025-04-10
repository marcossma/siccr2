document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Módulo Administrativo carregado.");
    const apiUrl = "http://localhost:15000/api";

    console.log(apiUrl); // <--- Apagar depois
    const urlParam = window.location.pathname;
    // Função para carregar as Unidades cadastradas

    const unidadesCarregadas = carregarUnidades();
    console.log(unidadesCarregadas.then((unidade) => {
        console.log(unidade);
    }));

    async function carregarUnidades() {
        try {
            const response = await fetch(`${apiUrl}/unidades`);
            const unidades = await response.json();

            return unidades.data;
        } catch (error) {
            console.error("Erro ao tentar carregar as unidades: ", error);
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
                    carregarUnidades();
                }).catch((error) => {
                    console.error(`Ocorreu um erro no fetch: ${error}`);
                });
            } catch (error) {
                console.error(`Ocorreu um erro ao tentar atualizar a unidade: ${error}`);
            }
        }

        // Função para carregar as Unidades cadastradas
        async function carregarUnidades() {
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

        carregarUnidades();

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
                carregarUnidades();
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
                btnAtualizarUnidade.style.display = "none";
                btnCadastrarUnidade.style.display = "inline-block";
                dialogPainel.showModal();
            }
        });
    }
    
});