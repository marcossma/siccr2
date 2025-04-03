document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Módulo Administrativo carregado.");
    const apiUrl = "http://localhost:15000/api";

    console.log(apiUrl);

    if (window.location.href.includes("unidade")) {
        // Seleção de elementos
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade = document.querySelector(".frmUnidade");
        const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
        const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        
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
                            <i class="bi bi-pencil-square editar" title="Editar" data-tipo="editar"></i>
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
    }
    
});