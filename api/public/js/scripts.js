// Injeta o token Bearer em todos os fetch desta área
(function () {
    const _fetch = window.fetch.bind(window);
    window.fetch = function (url, options = {}) {
        const token = localStorage.getItem("siccr_token");
        return _fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
        });
    };
})();

document.addEventListener("DOMContentLoaded", function() {
    const apiUrl = "http://localhost:15000/api";
    const urlParam = window.location.pathname;

    function verificaLogin() {
        const acesso = document.querySelector(".acesso");
        if (!localStorage.getItem("siccr_token")) return;

        const siccr = JSON.parse(localStorage.getItem("siccr") || "null");
        if (!siccr) { acesso.style.display = "none"; return; }

        const primeiroNome = siccr.nome.trim().split(" ")[0];
        const inicial = primeiroNome[0].toUpperCase();
        const labels = {
            super_admin:  "Super Admin",
            diretor:      "Diretor",
            vice_diretor: "Vice-Diretor",
            chefe:        "Chefe",
            subchefe:     "Subchefe"
        };
        const cargo = labels[siccr.permissao] || "Servidor";

        acesso.classList.add("acesso--logado");
        acesso.innerHTML = `
            <div class="usuario-avatar">${inicial}</div>
            <div class="usuario-info">
                <span class="usuario-nome">${primeiroNome}</span>
                <span class="usuario-cargo">${cargo}</span>
            </div>
        `;
    }

    verificaLogin();

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
            fieldsetLegend : document.querySelector(".dialogPainel fieldset legend"),
            btnCadastrar : document.querySelector(".cadastrarUnidade"),
            btnCancelar : document.querySelector(".cancelarUnidade"),
            btnAtualizar : document.querySelector(".atualizarUnidade"),
            frmUnidade : document.querySelector(".frmUnidade"),
            listaSelect : document.querySelectorAll(".listaSelect") || null,
        };

        return elements;
    }

    /**
     * Função para carregar dados de um endpoint da API
     * @param {string} endpoint - Nome do endpoint (ex: "usuarios", "posts", "produtos")
     * @returns {Promise<Array|Object|null>} Dados ou null em caso de erro
     * @throws {Error} Loga o erro no console se a requisição falhar
     * 
     * @example
     * const usuarios = carregarDados("users");
     * if (usuarios) {
     *  console.log("Dados carregados: ", usuarios);
     * } else {
     *  console.log("Falha a carregar dados.");
     * }
     */
    
    async function carregarDados(endpoint) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}`);
            const dados = await response.json();
            return dados.data;
        } catch(error) {
            console.error("Erro ao listar dados de " + endpoint + ":", error);
        }
    }

    // Função para excluir dados
    // -------------------------
    async function excluirDado(id_dado, endpoint) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}/${id_dado}`, {
                method: "DELETE"
            });
            return await response.json();
        } catch (error) {
            console.error("Erro ao tentar excluir o dado: ", error);
        }
    }
    
    // ----------------------
    // Rotinas do FINANCEIRO
    // ----------------------

    // Formata "yyyy-mm-dd" ou ISO timestamp para "dd/mm/yyyy"
    function formatarData(valor) {
        if (!valor) return "—";
        const partes = String(valor).substring(0, 10).split("-");
        if (partes.length !== 3) return valor;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

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
    if (btnEntrar) {
        btnEntrar.addEventListener("click", function(event) {
            event.preventDefault();
            dialogLogin.showModal();
        });
    }

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

    // Rotinas para a página inicial (/)
    // ====================================
    if (urlParam === "/") {
        const grid = document.querySelector("#noticiasGrid");

        function formatarData(dataIso) {
            return new Date(dataIso).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", year: "numeric"
            });
        }

        function decodificarHtml(html) {
            const txt = document.createElement("textarea");
            txt.innerHTML = html;
            return txt.value;
        }

        function renderizarNoticias(noticias) {
            grid.innerHTML = "";

            if (!noticias.length) {
                grid.innerHTML = '<p class="noticias-erro">Nenhuma notícia encontrada.</p>';
                return;
            }

            noticias.forEach(noticia => {
                const card = document.createElement("div");
                card.classList.add("noticia-card");

                card.innerHTML = `
                    <div class="noticia-card-corpo">
                        <p class="noticia-card-data">${formatarData(noticia.data)}</p>
                        <h3 class="noticia-card-titulo">${decodificarHtml(noticia.titulo)}</h3>
                        <p class="noticia-card-resumo">${noticia.resumo}</p>
                        <a class="noticia-card-link" href="${noticia.link}" target="_blank" rel="noopener">
                            Leia mais <i class="bi bi-arrow-up-right"></i>
                        </a>
                    </div>
                `;

                grid.appendChild(card);
            });
        }

        fetch(`${apiUrl}/noticias?limit=4`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    renderizarNoticias(data.data);
                } else {
                    grid.innerHTML = '<p class="noticias-erro">Não foi possível carregar as notícias.</p>';
                }
            })
            .catch(() => {
                grid.innerHTML = '<p class="noticias-erro">Erro ao conectar ao servidor.</p>';
            });

        // Seção de Eventos
        const eventosLista = document.querySelector("#eventosLista");

        function formatarDataEvento(dataIso) {
            if (!dataIso) return "Data não informada";
            const d = new Date(dataIso);
            if (isNaN(d.getTime())) return dataIso;
            return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
        }

        function renderizarEventos(eventos) {
            eventosLista.innerHTML = "";

            if (!eventos.length) {
                eventosLista.innerHTML = '<p class="noticias-erro">Nenhum evento encontrado.</p>';
                return;
            }

            eventos.forEach(evento => {
                const card = document.createElement("div");
                card.classList.add("evento-card");

                const periodo = evento.fim && evento.fim !== evento.inicio
                    ? `${formatarDataEvento(evento.inicio)} – ${formatarDataEvento(evento.fim)}`
                    : formatarDataEvento(evento.inicio);

                const localHtml = evento.local
                    ? `<p class="evento-local"><i class="bi bi-geo-alt"></i> ${evento.local}</p>`
                    : "";

                const linkHtml = evento.link
                    ? `<a class="noticia-card-link" href="${evento.link}" target="_blank" rel="noopener">Saiba mais <i class="bi bi-arrow-up-right"></i></a>`
                    : "";

                card.innerHTML = `
                    <div class="evento-data"><i class="bi bi-calendar3"></i> ${periodo}</div>
                    <div class="evento-info">
                        <h3 class="evento-nome">${evento.nome}</h3>
                        ${localHtml}
                        ${linkHtml}
                    </div>
                `;

                eventosLista.appendChild(card);
            });
        }

        fetch(`${apiUrl}/eventos`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    renderizarEventos(data.data);
                } else {
                    eventosLista.innerHTML = '<p class="noticias-erro">Não foi possível carregar os eventos.</p>';
                }
            })
            .catch(() => {
                eventosLista.innerHTML = '<p class="noticias-erro">Erro ao conectar ao servidor.</p>';
            });
    }

    // Rotinas para a página noticias.html (todas as notícias)
    // ========================================================
    if (urlParam === "/noticias") {
        const grid = document.querySelector("#noticiasGrid");

        function formatarDataNoticias(dataIso) {
            return new Date(dataIso).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", year: "numeric"
            });
        }

        function decodificarHtmlNoticias(html) {
            const txt = document.createElement("textarea");
            txt.innerHTML = html;
            return txt.value;
        }

        function renderizarTodasNoticias(noticias) {
            grid.innerHTML = "";
            if (!noticias.length) {
                grid.innerHTML = '<p class="noticias-erro">Nenhuma notícia encontrada.</p>';
                return;
            }
            noticias.forEach(noticia => {
                const card = document.createElement("div");
                card.classList.add("noticia-card");
                card.innerHTML = `
                    <div class="noticia-card-corpo">
                        <p class="noticia-card-data">${formatarDataNoticias(noticia.data)}</p>
                        <h3 class="noticia-card-titulo">${decodificarHtmlNoticias(noticia.titulo)}</h3>
                        <p class="noticia-card-resumo">${noticia.resumo}</p>
                        <a class="noticia-card-link" href="${noticia.link}" target="_blank" rel="noopener">
                            Leia mais <i class="bi bi-arrow-up-right"></i>
                        </a>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        fetch(`${apiUrl}/noticias?limit=12`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    renderizarTodasNoticias(data.data);
                } else {
                    grid.innerHTML = '<p class="noticias-erro">Não foi possível carregar as notícias.</p>';
                }
            })
            .catch(() => {
                grid.innerHTML = '<p class="noticias-erro">Erro ao conectar ao servidor.</p>';
            });
    }

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
                }).then(() => {
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
                }).then(() => {
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

                await response.json();
                renderizarTiposDespesas();
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

        // Botão para editar/excluir tipo de despesa
        elements.listaTiposRecursos.addEventListener("click", async function(event) {
            if (event.target.classList.contains("editar")) {
                const dadosEl = event.target.dataset;

                elements.fieldsetLegend.textContent = "Editar tipo de despesa";
                elements.btnCadastrar.disabled = true;
                elements.btnCadastrar.style.display = "none";
                elements.btnAtualizar.disabled = false;
                elements.btnAtualizar.style.display = "inline-block";

                document.querySelector("#id_tipo_despesa").value = dadosEl.id_tipo_despesa;
                document.querySelector("#tipo_despesa").value = dadosEl.tipo_despesa;

                elements.dialogPainel.showModal();
            }

            if (event.target.classList.contains("excluir")) {
                const dadosEl = event.target.dataset;

                const confirmacao = confirm("Essa ação não poderá ser desfeita, tem certeza de que deseja excluir esse tipo de despesa?");

                if (confirmacao) {
                    await excluirDado(dadosEl.id_tipo_despesa, "tipos-despesas");
                    renderizarTiposDespesas();
                }
            }
        });

        // dialogPainel - Botão Atualizar
        elements.btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            fetch(`${apiUrl}/tipos-despesas/${objData.id_tipo_despesa}`, {
                method: "PUT",
                body: JSON.stringify(objData)
            }).then(() => {
                renderizarTiposDespesas();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        renderizarTiposDespesas();
    }

    // Rotinas para a página adicionar-recurso.html
    // --------------------------------------------
    if (urlParam === "/adicionar-recurso") {
        const elements = getDomElements();

        // Preencher select de tipos de recursos
        carregarDados("tipos-recursos").then((recursos) => {
            elements.listaSelect[0].innerHTML = "<option value=\"\">Selecione o tipo de recurso...</option>";
            recursos.forEach((recurso) => {
                elements.listaSelect[0].innerHTML += `<option value="${recurso.id_tipo_recurso}">${recurso.tipo_recurso.toUpperCase()}</option>`;
            });
        });

        // Renderizar lista de recursos recebidos
        function renderizarRecursosRecebidos() {
            elements.listaTiposRecursos.innerHTML = "";
            carregarDados("recursos-recebidos").then((recursos) => {
                recursos.forEach((r) => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${r.id_recurso_recebido}</div>
                        <div class="dado flex flex--3">${r.tipo_recurso || "—"}</div>
                        <div class="dado flex flex--3">${parseFloat(r.valor_recurso_recebido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        <div class="dado flex flex--7">${r.descricao_recurso_recebido || "—"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar"
                                data-id_recurso_recebido="${r.id_recurso_recebido}"
                                data-tipo_recurso_recebido="${r.tipo_recurso_recebido}"
                                data-valor_recurso_recebido="${r.valor_recurso_recebido}"
                                data-descricao_recurso_recebido="${r.descricao_recurso_recebido || ""}"></i>
                            <i class="bi bi-x-square excluir" title="Excluir"
                                data-id_recurso_recebido="${r.id_recurso_recebido}"></i>
                        </div>
                    `;
                    elements.listaTiposRecursos.appendChild(div);
                });
            });
        }

        elements.btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.fieldsetLegend.textContent = "Adicionar Recurso";
            elements.btnAtualizar.style.display = "none";
            elements.btnAtualizar.disabled = true;
            elements.btnCadastrar.style.display = "inline-block";
            elements.btnCadastrar.disabled = false;
            elements.frmUnidade.reset();
            elements.dialogPainel.showModal();
        });

        elements.btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            fetch(`${apiUrl}/recursos-recebidos`, {
                method: "POST",
                body: JSON.stringify({
                    tipo_recurso_recebido: objData.id_recurso_recebido,
                    valor_recurso_recebido: objData.valor_recurso_recebido,
                    descricao_recurso_recebido: objData.descricao_recurso_recebido || null
                })
            }).then(() => {
                renderizarRecursosRecebidos();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            fetch(`${apiUrl}/recursos-recebidos/${objData.id_recurso_recebido_hidden}`, {
                method: "PUT",
                body: JSON.stringify({
                    tipo_recurso_recebido: objData.id_recurso_recebido,
                    valor_recurso_recebido: objData.valor_recurso_recebido,
                    descricao_recurso_recebido: objData.descricao_recurso_recebido || null
                })
            }).then(() => {
                renderizarRecursosRecebidos();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.listaTiposRecursos.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const d = event.target.dataset;
                elements.fieldsetLegend.textContent = "Editar Recurso";
                elements.btnCadastrar.style.display = "none";
                elements.btnCadastrar.disabled = true;
                elements.btnAtualizar.style.display = "inline-block";
                elements.btnAtualizar.disabled = false;

                document.querySelector("#id_recurso_recebido").value = d.tipo_recurso_recebido;
                document.querySelector("#valor_recurso_recebido").value = d.valor_recurso_recebido;
                document.querySelector("#descricao_recurso_recebido").value = d.descricao_recurso_recebido;

                // Armazena o id para o PUT
                const hiddenId = elements.frmUnidade.querySelector("[name='id_recurso_recebido_hidden']")
                    || Object.assign(document.createElement("input"), { type: "hidden", name: "id_recurso_recebido_hidden" });
                hiddenId.value = d.id_recurso_recebido;
                elements.frmUnidade.appendChild(hiddenId);

                elements.dialogPainel.showModal();
            }

            if (event.target.classList.contains("excluir")) {
                const d = event.target.dataset;
                if (confirm("Deseja excluir este recurso? Essa ação não pode ser desfeita.")) {
                    excluirDado(d.id_recurso_recebido, "recursos-recebidos").then(() => {
                        renderizarRecursosRecebidos();
                    });
                }
            }
        });

        renderizarRecursosRecebidos();
    }

    // Rotinar para a página registrar-despesa.html
    // --------------------------------------------
    if (urlParam === "/registrar-despesa") {
        const elements = getDomElements();

        // Preencher o Select de subunidades
        carregarDados("subunidades").then((subunidades) => {
            elements.listaSelect[0].innerHTML = "<option>Selecione a subunidade...</option>";
            subunidades.forEach((subunidade) => {
                elements.listaSelect[0].innerHTML += `
                    <option value="${subunidade.subunidade_id}">${subunidade.subunidade_nome}</option>
                `;
            });
        });

        // Preencher o Select de tipos de despesas
        carregarDados("tipos-despesas").then((despesas) => {
            elements.listaSelect[1].innerHTML = "<option>Selecione o tipo de despesa...</option>";
            despesas.forEach((despesa) => {
                elements.listaSelect[1].innerHTML += `
                    <option value="${despesa.id_tipo_despesa}">${despesa.tipo_despesa}</option>
                `;
            });
        });

        // Botão Adicionar topo - direita
        // ------------------------------
        elements.btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();

            elements.fieldsetLegend.textContent = "Registrar nova despesa";
            elements.btnAtualizar.disabled = true;
            elements.btnAtualizar.style.display = "none";
            elements.btnCadastrar.disabled = false;
            elements.btnCadastrar.style.display = "inline-block";
            elements.dialogPainel.showModal();
        });

        // Botão Cancelar
        elements.btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        // Botão Cadastrar (POST)
        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            fetch(`${apiUrl}/despesas`, {
                method: "POST",
                body: JSON.stringify({
                    id_tipo_despesa: objData.id_tipo_despesa,
                    id_subunidade: objData.id_subunidade,
                    valor_despesa: objData.valor_despesa,
                    data_despesa: objData.data_despesa || null,
                    numero_documento_despesa: objData.numero_documento_despesa || null,
                    observacao_despesa: objData.observacao_despesa || null
                })
            }).then(() => {
                renderizarDespesas();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        // Botão Atualizar (PUT)
        elements.btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            fetch(`${apiUrl}/despesas/${objData.id_despesa}`, {
                method: "PUT",
                body: JSON.stringify({
                    id_tipo_despesa: objData.id_tipo_despesa,
                    id_subunidade: objData.id_subunidade,
                    valor_despesa: objData.valor_despesa,
                    data_despesa: objData.data_despesa || null,
                    numero_documento_despesa: objData.numero_documento_despesa || null,
                    observacao_despesa: objData.observacao_despesa || null
                })
            }).then(() => {
                renderizarDespesas();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        // Botão editar / excluir
        elements.listaTiposRecursos.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const dadosEl = event.target.dataset;

                document.querySelector("#id_despesa").value = dadosEl.id_despesa;
                elements.listaSelect[0].value = dadosEl.id_subunidade;
                elements.listaSelect[1].value = dadosEl.id_tipo_despesa;
                document.querySelector("#valor_despesa").value = dadosEl.valor_despesa;
                document.querySelector("#data_despesa").value = dadosEl.data_despesa;
                document.querySelector("#numero_documento_despesa").value = dadosEl.numero_documento_despesa || "";
                document.querySelector("#observacao_despesa").value = dadosEl.observacao_despesa || "";

                elements.fieldsetLegend.textContent = "Atualizar despesa";
                elements.btnCadastrar.disabled = true;
                elements.btnCadastrar.style.display = "none";
                elements.btnAtualizar.disabled = false;
                elements.btnAtualizar.style.display = "inline-block";

                elements.dialogPainel.showModal();
            }

            if (event.target.classList.contains("excluir")) {
                const dadosEl = event.target.dataset;
                if (confirm("Deseja excluir esta despesa? Essa ação não pode ser desfeita.")) {
                    excluirDado(dadosEl.id_despesa, "despesas").then(() => {
                        renderizarDespesas();
                    });
                }
            }
        });

        // Renderizar a lista de despesas
        function renderizarDespesas() {
            elements.listaTiposRecursos.innerHTML = "";
            carregarDados("despesas/total-info").then((despesas) => {
                despesas.forEach((despesa) => {
                    const divElement = document.createElement("div");
                    divElement.classList.add("dados", "flex", "align--items--center", "cursor--pointer");

                    divElement.innerHTML = `
                        <div class="dado flex flex--6">${despesa.subunidade_nome}</div>
                        <div class="dado flex flex--3">${despesa.tipo_despesa}</div>
                        <div class="dado flex flex--3">${despesa.valor_despesa}</div>
                        <div class="dado flex flex--3">${formatarData(despesa.data_despesa)}</div>
                        <div class="dado flex flex--3">${despesa.numero_documento_despesa || "Não informado"}</div>
                        <div class="dado flex flex--8">${despesa.observacao_despesa || "Não informado"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar"
                                data-id_despesa="${despesa.id_despesa}"
                                data-id_subunidade="${despesa.id_subunidade}"
                                data-id_tipo_despesa="${despesa.id_tipo_despesa}"
                                data-valor_despesa="${despesa.valor_despesa}"
                                data-data_despesa="${despesa.data_despesa}"
                                data-numero_documento_despesa="${despesa.numero_documento_despesa || ""}"
                                data-observacao_despesa="${despesa.observacao_despesa || ""}">
                            </i>
                            <i class="bi bi-x-square excluir" title="Excluir" data-id_despesa="${despesa.id_despesa}"></i>
                        </div>
                    `;

                    elements.listaTiposRecursos.appendChild(divElement);
                });
            });
        }

        renderizarDespesas();
    }

    // Rotinas para a página pedido-almoxarifado.html
    // -----------------------------------------------
    if (urlParam === "/pedido-almoxarifado") {
        const elements = getDomElements();

        carregarDados("subunidades").then((subunidades) => {
            elements.listaSelect[0].innerHTML = "<option value=\"\">Selecione a subunidade...</option>";
            subunidades.forEach((s) => {
                elements.listaSelect[0].innerHTML += `<option value="${s.subunidade_id}">${s.subunidade_nome}</option>`;
            });
        });

        function renderizarPedidos() {
            elements.listaTiposRecursos.innerHTML = "";
            carregarDados("pedidos-almoxarifado").then((pedidos) => {
                pedidos.forEach((p) => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${p.id_pedido}</div>
                        <div class="dado flex flex--4">${p.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--7">${p.descricao_itens}</div>
                        <div class="dado flex flex--2">${p.quantidade || "—"}</div>
                        <div class="dado flex flex--3">${formatarData(p.data_pedido)}</div>
                        <div class="dado flex flex--3">${p.status}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar"
                                data-id_pedido="${p.id_pedido}"
                                data-subunidade_id="${p.subunidade_id}"
                                data-descricao_itens="${p.descricao_itens}"
                                data-quantidade="${p.quantidade || ""}"
                                data-data_pedido="${p.data_pedido || ""}"
                                data-status="${p.status}"
                                data-observacao="${p.observacao || ""}"></i>
                            <i class="bi bi-x-square excluir" title="Excluir"
                                data-id_pedido="${p.id_pedido}"></i>
                        </div>
                    `;
                    elements.listaTiposRecursos.appendChild(div);
                });
            });
        }

        elements.btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.fieldsetLegend.textContent = "Registrar Pedido";
            elements.btnAtualizar.style.display = "none";
            elements.btnAtualizar.disabled = true;
            elements.btnCadastrar.style.display = "inline-block";
            elements.btnCadastrar.disabled = false;
            elements.frmUnidade.reset();
            elements.dialogPainel.showModal();
        });

        elements.btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const objData = Object.fromEntries(new FormData(elements.frmUnidade).entries());
            fetch(`${apiUrl}/pedidos-almoxarifado`, {
                method: "POST",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    descricao_itens: objData.descricao_itens,
                    quantidade: objData.quantidade || null,
                    data_pedido: objData.data_pedido || null,
                    status: objData.status || "pendente",
                    observacao: objData.observacao || null
                })
            }).then(() => {
                renderizarPedidos();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const objData = Object.fromEntries(new FormData(elements.frmUnidade).entries());
            fetch(`${apiUrl}/pedidos-almoxarifado/${objData.id_pedido}`, {
                method: "PUT",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    descricao_itens: objData.descricao_itens,
                    quantidade: objData.quantidade || null,
                    data_pedido: objData.data_pedido || null,
                    status: objData.status || "pendente",
                    observacao: objData.observacao || null
                })
            }).then(() => {
                renderizarPedidos();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.listaTiposRecursos.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const d = event.target.dataset;
                elements.fieldsetLegend.textContent = "Editar Pedido";
                elements.btnCadastrar.style.display = "none";
                elements.btnCadastrar.disabled = true;
                elements.btnAtualizar.style.display = "inline-block";
                elements.btnAtualizar.disabled = false;

                document.querySelector("#id_pedido").value = d.id_pedido;
                elements.listaSelect[0].value = d.subunidade_id;
                document.querySelector("#descricao_itens").value = d.descricao_itens;
                document.querySelector("#quantidade").value = d.quantidade;
                document.querySelector("#data_pedido").value = d.data_pedido;
                document.querySelector("#status").value = d.status;
                document.querySelector("#observacao").value = d.observacao;

                elements.dialogPainel.showModal();
            }

            if (event.target.classList.contains("excluir")) {
                const d = event.target.dataset;
                if (confirm("Deseja excluir este pedido? Essa ação não pode ser desfeita.")) {
                    excluirDado(d.id_pedido, "pedidos-almoxarifado").then(() => {
                        renderizarPedidos();
                    });
                }
            }
        });

        renderizarPedidos();
    }

    // Rotinas para a página previsao-despesas.html
    // --------------------------------------------
    if (urlParam === "/previsao-despesas") {
        const elements = getDomElements();

        carregarDados("subunidades").then((subunidades) => {
            elements.listaSelect[0].innerHTML = "<option value=\"\">Selecione a subunidade...</option>";
            subunidades.forEach((s) => {
                elements.listaSelect[0].innerHTML += `<option value="${s.subunidade_id}">${s.subunidade_nome}</option>`;
            });
        });

        carregarDados("tipos-despesas").then((tipos) => {
            elements.listaSelect[1].innerHTML = "<option value=\"\">Selecione o tipo de despesa...</option>";
            tipos.forEach((t) => {
                elements.listaSelect[1].innerHTML += `<option value="${t.id_tipo_despesa}">${t.tipo_despesa}</option>`;
            });
        });

        function renderizarPrevisoes() {
            elements.listaTiposRecursos.innerHTML = "";
            carregarDados("previsoes-despesas").then((previsoes) => {
                previsoes.forEach((p) => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center", "cursor--pointer");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${p.id_previsao}</div>
                        <div class="dado flex flex--5">${p.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--4">${p.tipo_despesa || "—"}</div>
                        <div class="dado flex flex--3">${parseFloat(p.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        <div class="dado flex flex--2">${p.ano_referencia}</div>
                        <div class="dado flex flex--6">${p.observacao || "—"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar"
                                data-id_previsao="${p.id_previsao}"
                                data-subunidade_id="${p.subunidade_id}"
                                data-id_tipo_despesa="${p.id_tipo_despesa}"
                                data-valor_previsto="${p.valor_previsto}"
                                data-ano_referencia="${p.ano_referencia}"
                                data-observacao="${p.observacao || ""}"></i>
                            <i class="bi bi-x-square excluir" title="Excluir"
                                data-id_previsao="${p.id_previsao}"></i>
                        </div>
                    `;
                    elements.listaTiposRecursos.appendChild(div);
                });
            });
        }

        elements.btnAdicionar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.fieldsetLegend.textContent = "Nova Previsão de Despesa";
            elements.btnAtualizar.style.display = "none";
            elements.btnAtualizar.disabled = true;
            elements.btnCadastrar.style.display = "inline-block";
            elements.btnCadastrar.disabled = false;
            elements.frmUnidade.reset();
            elements.dialogPainel.showModal();
        });

        elements.btnCancelar.addEventListener("click", function(event) {
            event.preventDefault();
            elements.frmUnidade.reset();
            elements.dialogPainel.close();
        });

        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const objData = Object.fromEntries(new FormData(elements.frmUnidade).entries());
            fetch(`${apiUrl}/previsoes-despesas`, {
                method: "POST",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    id_tipo_despesa: objData.id_tipo_despesa,
                    valor_previsto: objData.valor_previsto,
                    ano_referencia: objData.ano_referencia,
                    observacao: objData.observacao || null
                })
            }).then(() => {
                renderizarPrevisoes();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.btnAtualizar.addEventListener("click", function(event) {
            event.preventDefault();
            const objData = Object.fromEntries(new FormData(elements.frmUnidade).entries());
            fetch(`${apiUrl}/previsoes-despesas/${objData.id_previsao}`, {
                method: "PUT",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    id_tipo_despesa: objData.id_tipo_despesa,
                    valor_previsto: objData.valor_previsto,
                    ano_referencia: objData.ano_referencia,
                    observacao: objData.observacao || null
                })
            }).then(() => {
                renderizarPrevisoes();
                elements.frmUnidade.reset();
                elements.dialogPainel.close();
            });
        });

        elements.listaTiposRecursos.addEventListener("click", function(event) {
            if (event.target.classList.contains("editar")) {
                const d = event.target.dataset;
                elements.fieldsetLegend.textContent = "Editar Previsão";
                elements.btnCadastrar.style.display = "none";
                elements.btnCadastrar.disabled = true;
                elements.btnAtualizar.style.display = "inline-block";
                elements.btnAtualizar.disabled = false;

                document.querySelector("#id_previsao").value = d.id_previsao;
                elements.listaSelect[0].value = d.subunidade_id;
                elements.listaSelect[1].value = d.id_tipo_despesa;
                document.querySelector("#valor_previsto").value = d.valor_previsto;
                document.querySelector("#ano_referencia").value = d.ano_referencia;
                document.querySelector("#observacao").value = d.observacao;

                elements.dialogPainel.showModal();
            }

            if (event.target.classList.contains("excluir")) {
                const d = event.target.dataset;
                if (confirm("Deseja excluir esta previsão? Essa ação não pode ser desfeita.")) {
                    excluirDado(d.id_previsao, "previsoes-despesas").then(() => {
                        renderizarPrevisoes();
                    });
                }
            }
        });

        renderizarPrevisoes();
    }

    // Rotinas para a página relatorios.html
    // -------------------------------------
    if (urlParam === "/relatorios") {
        function formatarMoeda(valor) {
            return parseFloat(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        }

        carregarDados("relatorios/resumo").then((dados) => {
            const escopoGeral = dados.escopo === "geral";

            // Badge de escopo
            const badgeEl = document.querySelector("#escopoRelatorio");
            if (badgeEl) {
                badgeEl.textContent = escopoGeral ? "Visão geral" : "Visão da sua subunidade";
            }

            // Cards de recursos e saldo só aparecem na visão geral
            const cardRecursos = document.querySelector("#cardRecursos");
            const cardSaldo    = document.querySelector("#cardSaldo");
            if (!escopoGeral) {
                cardRecursos.style.display = "none";
                cardSaldo.style.display    = "none";
            } else {
                document.querySelector("#totalRecursos").textContent = formatarMoeda(dados.total_recursos);
                const saldoEl = document.querySelector("#totalSaldo");
                saldoEl.textContent = formatarMoeda(dados.saldo);
                saldoEl.style.color = dados.saldo >= 0 ? "#007a2e" : "#c0392b";
            }

            document.querySelector("#totalDespesas").textContent = formatarMoeda(dados.total_despesas);

            const listaSub = document.querySelector("#listaPorSubunidade");
            listaSub.innerHTML = "";
            dados.por_subunidade.forEach((item) => {
                const div = document.createElement("div");
                div.classList.add("dados", "flex", "align--items--center");
                div.innerHTML = `
                    <div class="dado flex flex--8">${item.subunidade_nome}</div>
                    <div class="dado flex flex--4">${formatarMoeda(item.total)}</div>
                `;
                listaSub.appendChild(div);
            });

            const listaTipo = document.querySelector("#listaPorTipo");
            listaTipo.innerHTML = "";
            dados.por_tipo_despesa.forEach((item) => {
                const div = document.createElement("div");
                div.classList.add("dados", "flex", "align--items--center");
                div.innerHTML = `
                    <div class="dado flex flex--8">${item.tipo_despesa}</div>
                    <div class="dado flex flex--4">${formatarMoeda(item.total)}</div>
                `;
                listaTipo.appendChild(div);
            });
        });
    }


});