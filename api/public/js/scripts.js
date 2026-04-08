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
        const sigla = siccr.subunidade_sigla || "";

        acesso.classList.add("acesso--logado");
        acesso.innerHTML = `
            <div class="usuario-avatar">${inicial}</div>
            <div class="usuario-info">
                <span class="usuario-nome">${primeiroNome}</span>
                <span class="usuario-cargo">${cargo}${sigla ? ` · ${sigla}` : ""}</span>
            </div>
        `;
    }

    verificaLogin();

    // ── WebSocket: notificações em tempo real ──────────────────────────────────
    (function iniciarWS() {
        const wsToken = localStorage.getItem("siccr_token");
        const wsSiccr = JSON.parse(localStorage.getItem("siccr") || "null");
        if (!wsToken || !wsSiccr) return;

        const ws = new WebSocket(`ws://${window.location.host}`);
        ws.onopen = () => ws.send(JSON.stringify({ tipo: "auth", token: wsToken }));
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.tipo === "pedido_pendente") {
                    const p = wsSiccr.permissao;
                    const ehSecretaria = p === "super_admin" || p === "diretor" ||
                                        p === "vice_diretor" || wsSiccr.is_direcao_centro;
                    if (ehSecretaria) {
                        const info = msg.pedido;
                        const qtd = info.total_itens;
                        mostrarToastWS(
                            `Novo pedido de almoxarifado — ${info.subunidade_sigla || info.subunidade_nome} ` +
                            `(${qtd} item${qtd !== 1 ? "s" : ""})`
                        );
                    }
                }
            } catch {}
        };
    })();

    function mostrarToastWS(mensagem) {
        let toast = document.getElementById("wsToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "wsToast";
            toast.className = "ws-toast";
            toast.innerHTML = '<i class="bi bi-bell-fill"></i> <span id="wsToastMsg"></span>';
            document.body.appendChild(toast);
        }
        document.getElementById("wsToastMsg").textContent = mensagem;
        toast.classList.add("ws-toast--visible");
        setTimeout(() => toast.classList.remove("ws-toast--visible"), 8000);
    }
    // ──────────────────────────────────────────────────────────────────────────

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
            if (!response.ok) {
                console.error(`Erro ${response.status} em /${endpoint}:`, dados?.message || dados);
                return null;
            }
            return dados.data;
        } catch(error) {
            console.error("Erro ao listar dados de " + endpoint + ":", error);
            return null;
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
    btnLogin.addEventListener("click", async function(event) {
        event.preventDefault();
        const txtLogin = document.querySelector("#txtLogin").value.trim();
        const txtSenha = document.querySelector("#txtSenha").value;
        const loginErro = document.querySelector("#loginErro");

        loginErro.hidden = true;

        if (!txtLogin || !txtSenha) {
            loginErro.textContent = "Preencha o login e a senha.";
            loginErro.hidden = false;
            return;
        }

        try {
            const response = await fetch("http://localhost:15000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ siape: txtLogin, senha: txtSenha })
            });
            const data = await response.json();

            if (data.status === "success") {
                const u = data.data[0];
                localStorage.setItem("siccr", JSON.stringify({
                    user_id:          u.user_id,
                    nome:             u.nome,
                    data_nascimento:  u.data_nascimento,
                    whatsapp:         u.whatsapp,
                    subunidade_id:    u.subunidade_id,
                    funcionalidades:  u.funcionalidades || [],
                    subunidade_sigla: u.subunidade_sigla,
                    unidade_id:       u.unidade_id,
                    permissao:        u.permissao,
                    is_direcao_centro: u.is_direcao_centro,
                    token: data.token
                }));
                localStorage.setItem("siccr_token", data.token);
                localStorage.setItem("permissao", u.permissao);

                document.querySelector("#frmLogin").reset();
                dialogLogin.close();
                window.location.href = "/";
                return;
            }

            loginErro.textContent = data.message || "Usuário ou senha inválidos.";
            loginErro.hidden = false;

        } catch (error) {
            loginErro.textContent = "Erro de conexão. Tente novamente.";
            loginErro.hidden = false;
        }
    });

    // Botão para fechar o formulário de login
    // =======================================
    btnCancelarLogin.addEventListener("click", function(event) {
        event.preventDefault();
        document.querySelector("#frmLogin").reset();
        const loginErro = document.querySelector("#loginErro");
        if (loginErro) loginErro.hidden = true;
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
                        <div class="dado flex flex--3">${formatarData(r.data_recebimento)}</div>
                        <div class="dado flex flex--5">${r.descricao_recurso_recebido || "—"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-pencil-square editar" title="Editar"
                                data-id_recurso_recebido="${r.id_recurso_recebido}"
                                data-tipo_recurso_recebido="${r.tipo_recurso_recebido}"
                                data-valor_recurso_recebido="${r.valor_recurso_recebido}"
                                data-data_recebimento="${r.data_recebimento ? r.data_recebimento.substring(0, 10) : ""}"
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
                    data_recebimento: objData.data_recebimento || null,
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
                    data_recebimento: objData.data_recebimento || null,
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
                document.querySelector("#data_recebimento").value = d.data_recebimento || "";
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

        function parsearValorMonetario(valor) {
            // Aceita "1.234,56" ou "1234.56" ou "1234,56"
            const normalizado = String(valor).trim().replace(/\./g, "").replace(",", ".");
            const num = parseFloat(normalizado);
            return isNaN(num) || num < 0 ? null : num;
        }

        // Botão Cadastrar (POST)
        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const formData = new FormData(elements.frmUnidade);
            const objData = Object.fromEntries(formData.entries());
            const valorParsed = parsearValorMonetario(objData.valor_despesa);
            if (valorParsed === null) {
                alert("Valor da despesa inválido. Use o formato: 1234,56");
                return;
            }
            fetch(`${apiUrl}/despesas`, {
                method: "POST",
                body: JSON.stringify({
                    id_tipo_despesa: objData.id_tipo_despesa,
                    id_subunidade: objData.id_subunidade,
                    valor_despesa: valorParsed,
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
            const valorParsed = parsearValorMonetario(objData.valor_despesa);
            if (valorParsed === null) {
                alert("Valor da despesa inválido. Use o formato: 1234,56");
                return;
            }
            fetch(`${apiUrl}/despesas/${objData.id_despesa}`, {
                method: "PUT",
                body: JSON.stringify({
                    id_tipo_despesa: objData.id_tipo_despesa,
                    id_subunidade: objData.id_subunidade,
                    valor_despesa: valorParsed,
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
        const siccr                 = JSON.parse(localStorage.getItem("siccr") || "null");
        const listaPedidos          = document.getElementById("listaPedidos");
        const filtroPedidoStatus    = document.getElementById("filtroPedidoStatus");
        const btnNovoPedido         = document.getElementById("btnNovoPedido");
        const dialogNovoPedido      = document.getElementById("dialogNovoPedido");
        const btnCancelarNovoPedido = document.getElementById("btnCancelarNovoPedido");
        const btnAdicionarItem      = document.getElementById("btnAdicionarItem");
        const btnEnviarPedido       = document.getElementById("btnEnviarPedido");
        const listaItensEl          = document.getElementById("listaItensNovoPedido");
        const dialogVerItens        = document.getElementById("dialogVerItens");
        const dialogVerItensLegend  = document.getElementById("dialogVerItensLegend");
        const dialogVerItensConteudo= document.getElementById("dialogVerItensConteudo");
        const btnAtenderPedido      = document.getElementById("btnAtenderPedido");
        const btnFecharVerItens     = document.getElementById("btnFecharVerItens");
        const pedidoErro            = document.getElementById("pedidoErro");
        const wsToast               = document.getElementById("wsToast");
        const wsToastMsg            = document.getElementById("wsToastMsg");

        // Verifica se o usuário atual pode atender pedidos (é SID / diretor / super_admin)
        const ehSID = siccr && (
            ["super_admin", "diretor", "vice_diretor"].includes(siccr.permissao) ||
            siccr.is_direcao_centro === true ||
            (Array.isArray(siccr.funcionalidades) && siccr.funcionalidades.includes("atender_pedido_almoxarifado"))
        );

        const badgeStatus = {
            pendente:  '<span class="badge badge--pendente">Pendente</span>',
            atendido:  '<span class="badge badge--atendido">Atendido</span>',
            cancelado: '<span class="badge badge--cancelado">Cancelado</span>'
        };

        let itensNovoPedido = [];
        let toastTimer = null;

        function mostrarToast(msg) {
            wsToastMsg.textContent = msg;
            wsToast.hidden = false;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { wsToast.hidden = true; }, 6000);
        }

        function renderizarListaItensDialog() {
            if (itensNovoPedido.length === 0) {
                listaItensEl.innerHTML = '<p class="pedido-lista-vazia">Nenhum item adicionado ainda.</p>';
                return;
            }
            listaItensEl.innerHTML = itensNovoPedido.map((item, idx) => `
                <div class="pedido-item flex align--items--center gap--10">
                    <span class="pedido-item-codigo">${item.codigo_produto || "—"}</span>
                    <span class="pedido-item-descricao flex--1">${item.descricao_produto}</span>
                    <span class="pedido-item-qtd">Qtd: ${item.quantidade}</span>
                    <button type="button" class="pedido-item-remover" data-idx="${idx}" title="Remover">✕</button>
                </div>
            `).join("");
        }

        function renderizarPedidos() {
            carregarDados("pedidos-almoxarifado").then((pedidos) => {
                const filtro = filtroPedidoStatus ? filtroPedidoStatus.value : "todos";
                const filtrados = filtro === "todos" ? (pedidos || []) : (pedidos || []).filter(p => p.status === filtro);
                listaPedidos.innerHTML = "";
                if (!filtrados || filtrados.length === 0) {
                    listaPedidos.innerHTML = '<p class="pedido-lista-vazia" style="padding:15px">Nenhum pedido encontrado.</p>';
                    return;
                }
                filtrados.forEach((p) => {
                    // SID não vê botão excluir de outros setores; usuário comum não pode excluir atendidos
                    const podeExcluir = !ehSID && p.status !== "atendido";
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--1">${p.id_pedido}</div>
                        <div class="dado flex flex--3">${p.subunidade_sigla || p.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--1">${p.total_itens}</div>
                        <div class="dado flex flex--3">${formatarData(p.data_pedido)}</div>
                        <div class="dado flex flex--3">${p.data_conclusao ? formatarData(p.data_conclusao) : "—"}</div>
                        <div class="dado flex flex--2">${badgeStatus[p.status] || p.status}</div>
                        <div class="dado flex flex--2 gap--10 font--size--20">
                            <i class="bi bi-eye ver-itens cursor--pointer" title="Ver itens"
                                data-id="${p.id_pedido}"
                                data-status="${p.status}"
                                data-setor="${p.subunidade_sigla || p.subunidade_nome || ""}"></i>
                            ${podeExcluir
                                ? `<i class="bi bi-x-square excluir cursor--pointer" title="Excluir"
                                    data-id="${p.id_pedido}"></i>`
                                : ""}
                        </div>
                    `;
                    listaPedidos.appendChild(div);
                });
            });
        }

        if (filtroPedidoStatus) {
            filtroPedidoStatus.addEventListener("change", renderizarPedidos);
        }

        // Abrir dialog de novo pedido
        btnNovoPedido.addEventListener("click", () => {
            itensNovoPedido = [];
            renderizarListaItensDialog();
            document.getElementById("pedidoObservacao").value = "";
            pedidoErro.hidden = true;
            dialogNovoPedido.showModal();
        });

        btnCancelarNovoPedido.addEventListener("click", () => dialogNovoPedido.close());

        // Adicionar item à lista temporária
        btnAdicionarItem.addEventListener("click", () => {
            const codigo   = document.getElementById("itemCodigo").value.trim();
            const descricao= document.getElementById("itemDescricao").value.trim();
            const qtd      = parseInt(document.getElementById("itemQtd").value) || 1;
            if (!descricao) {
                document.getElementById("itemDescricao").focus();
                return;
            }
            itensNovoPedido.push({ codigo_produto: codigo || null, descricao_produto: descricao, quantidade: qtd });
            document.getElementById("itemCodigo").value = "";
            document.getElementById("itemDescricao").value = "";
            document.getElementById("itemQtd").value = "1";
            document.getElementById("itemDescricao").focus();
            renderizarListaItensDialog();
        });

        // Remover item da lista temporária
        listaItensEl.addEventListener("click", (e) => {
            if (e.target.classList.contains("pedido-item-remover")) {
                itensNovoPedido.splice(parseInt(e.target.dataset.idx), 1);
                renderizarListaItensDialog();
            }
        });

        // Enviar pedido para a secretaria
        btnEnviarPedido.addEventListener("click", async () => {
            pedidoErro.hidden = true;
            if (itensNovoPedido.length === 0) {
                pedidoErro.textContent = "Adicione pelo menos um item antes de enviar.";
                pedidoErro.hidden = false;
                return;
            }
            const observacao = document.getElementById("pedidoObservacao").value.trim();
            try {
                const response = await fetch(`${apiUrl}/pedidos-almoxarifado`, {
                    method: "POST",
                    body: JSON.stringify({ observacao: observacao || null, itens: itensNovoPedido })
                });
                const data = await response.json();
                if (data.status === "success") {
                    dialogNovoPedido.close();
                    renderizarPedidos();
                } else {
                    pedidoErro.textContent = data.message || "Erro ao enviar pedido.";
                    pedidoErro.hidden = false;
                }
            } catch {
                pedidoErro.textContent = "Erro de conexão. Tente novamente.";
                pedidoErro.hidden = false;
            }
        });

        // Ações na lista (ver itens / excluir)
        listaPedidos.addEventListener("click", async (e) => {
            if (e.target.classList.contains("ver-itens")) {
                const id     = e.target.dataset.id;
                const status = e.target.dataset.status;
                const setor  = e.target.dataset.setor;

                dialogVerItens.dataset.pedidoId     = id;
                dialogVerItens.dataset.pedidoStatus = status;
                dialogVerItensLegend.textContent = setor
                    ? `Pedido #${id} — ${setor}`
                    : `Itens do Pedido #${id}`;
                dialogVerItensConteudo.innerHTML = "Carregando...";

                // Botão "Marcar como Atendido" visível apenas para SID em pedidos pendentes
                btnAtenderPedido.hidden = !(ehSID && status === "pendente");

                dialogVerItens.showModal();

                const response = await fetch(`${apiUrl}/pedidos-almoxarifado/${id}/itens`);
                const data = await response.json();
                if (data.status === "success" && data.data.length > 0) {
                    dialogVerItensConteudo.innerHTML = data.data.map(item => `
                        <div class="pedido-item flex gap--10">
                            <span class="pedido-item-codigo">${item.codigo_produto || "—"}</span>
                            <span class="pedido-item-descricao flex--1">${item.descricao_produto}</span>
                            <span class="pedido-item-qtd">Qtd: ${item.quantidade}</span>
                        </div>
                    `).join("");
                } else {
                    dialogVerItensConteudo.innerHTML = '<p class="pedido-lista-vazia">Nenhum item encontrado.</p>';
                }
            }

            if (e.target.classList.contains("excluir")) {
                const id = e.target.dataset.id;
                if (!confirm("Deseja excluir este pedido? Essa ação não pode ser desfeita.")) return;
                try {
                    const response = await fetch(`${apiUrl}/pedidos-almoxarifado/${id}`, { method: "DELETE" });
                    const data = await response.json();
                    if (data.status === "success") {
                        renderizarPedidos();
                    } else {
                        alert(data.message);
                    }
                } catch {
                    alert("Erro de conexão.");
                }
            }
        });

        // SID: marcar pedido como atendido
        btnAtenderPedido.addEventListener("click", async () => {
            const id = dialogVerItens.dataset.pedidoId;
            if (!id) return;
            if (!confirm("Confirmar que o pedido foi efetuado no SIE?")) return;
            try {
                const response = await fetch(`${apiUrl}/pedidos-almoxarifado/${id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "atendido" })
                });
                const data = await response.json();
                if (data.status === "success") {
                    dialogVerItens.close();
                    renderizarPedidos();
                } else {
                    alert(data.message || "Erro ao atualizar status.");
                }
            } catch {
                alert("Erro de conexão.");
            }
        });

        btnFecharVerItens.addEventListener("click", () => dialogVerItens.close());

        // WebSocket — notificações em tempo real
        {
            const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
            const ws = new WebSocket(`${wsProto}//${location.host}`);
            ws.addEventListener("open", () => {
                const token = localStorage.getItem("siccr_token");
                if (token) ws.send(JSON.stringify({ token }));
            });
            ws.addEventListener("message", (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.tipo === "pedido_pendente" && ehSID) {
                        const setor = msg.pedido?.subunidade_sigla || msg.pedido?.subunidade_nome || "setor";
                        mostrarToast(`Novo pedido de almoxarifado de: ${setor}`);
                        renderizarPedidos();
                    }
                    if (msg.tipo === "pedido_atendido" && !ehSID) {
                        mostrarToast(`Seu pedido #${msg.pedido?.id_pedido || ""} foi atendido pela secretaria!`);
                        renderizarPedidos();
                    }
                } catch { /* ignora mensagens malformadas */ }
            });
        }

        renderizarPedidos();
    }

    // Rotinas para a página verificar-pedidos.html (painel SID)
    // ----------------------------------------------------------
    if (urlParam === "/verificar-pedidos") {
        const siccr                  = JSON.parse(localStorage.getItem("siccr") || "null");
        const listaPedidosSID        = document.getElementById("listaPedidosSID");
        const filtroStatus           = document.getElementById("filtroStatus");
        const dialogVerItensSID      = document.getElementById("dialogVerItensSID");
        const dialogVerItensSIDLegend= document.getElementById("dialogVerItensSIDLegend");
        const dialogVerItensSIDInfo  = document.getElementById("dialogVerItensSIDInfo");
        const dialogVerItensSIDConteudo = document.getElementById("dialogVerItensSIDConteudo");
        const btnAtenderPedidoSID    = document.getElementById("btnAtenderPedidoSID");
        const btnFecharVerItensSID   = document.getElementById("btnFecharVerItensSID");
        const wsToast                = document.getElementById("wsToast");
        const wsToastMsg             = document.getElementById("wsToastMsg");

        const funcs = Array.isArray(siccr?.funcionalidades) ? siccr.funcionalidades : [];
        const perm  = siccr?.permissao || "";
        const isDC  = siccr?.is_direcao_centro === true;
        const ehSID = ["super_admin","diretor","vice_diretor"].includes(perm) || isDC
                   || funcs.includes("atender_pedido_almoxarifado");

        // Redireciona se não tiver permissão
        if (!ehSID) { window.location.href = "/"; }

        const badgeStatus = {
            pendente:  '<span class="badge badge--pendente">Pendente</span>',
            atendido:  '<span class="badge badge--atendido">Atendido</span>',
            cancelado: '<span class="badge badge--cancelado">Cancelado</span>'
        };

        let toastTimer = null;
        function mostrarToast(msg) {
            wsToastMsg.textContent = msg;
            wsToast.hidden = false;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { wsToast.hidden = true; }, 6000);
        }

        function renderizarPedidosSID() {
            carregarDados("pedidos-almoxarifado").then((pedidos) => {
                const filtro = filtroStatus.value;
                const filtrados = filtro === "todos" ? pedidos
                    : (pedidos || []).filter(p => p.status === filtro);

                listaPedidosSID.innerHTML = "";
                if (!filtrados || filtrados.length === 0) {
                    listaPedidosSID.innerHTML = `<p class="pedido-lista-vazia" style="padding:15px">Nenhum pedido ${filtro === "todos" ? "" : filtro} encontrado.</p>`;
                    return;
                }
                filtrados.forEach((p) => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--1">${p.id_pedido}</div>
                        <div class="dado flex flex--3">${p.subunidade_sigla || p.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--1">${p.total_itens}</div>
                        <div class="dado flex flex--3">${formatarData(p.data_pedido)}</div>
                        <div class="dado flex flex--3">${p.data_conclusao ? formatarData(p.data_conclusao) : "—"}</div>
                        <div class="dado flex flex--2">${badgeStatus[p.status] || p.status}</div>
                        <div class="dado flex flex--2 font--size--20">
                            <i class="bi bi-eye ver-itens-sid cursor--pointer" title="Ver itens e atender"
                                data-id="${p.id_pedido}"
                                data-status="${p.status}"
                                data-setor="${p.subunidade_sigla || p.subunidade_nome || ""}"
                                data-data="${formatarData(p.data_pedido)}"
                                data-conclusao="${p.data_conclusao ? formatarData(p.data_conclusao) : ""}"
                                data-obs="${p.observacao || ""}"></i>
                        </div>
                    `;
                    listaPedidosSID.appendChild(div);
                });
            });
        }

        filtroStatus.addEventListener("change", renderizarPedidosSID);

        listaPedidosSID.addEventListener("click", async (e) => {
            const icon = e.target.closest(".ver-itens-sid");
            if (!icon) return;

            const id        = icon.dataset.id;
            const status    = icon.dataset.status;
            const setor     = icon.dataset.setor;
            const data      = icon.dataset.data;
            const conclusao = icon.dataset.conclusao;
            const obs       = icon.dataset.obs;

            dialogVerItensSID.dataset.pedidoId     = id;
            dialogVerItensSID.dataset.pedidoStatus = status;
            dialogVerItensSIDLegend.textContent = `Pedido #${id} — ${setor}`;
            const infoParts = [`Solicitado: ${data}`];
            if (conclusao) infoParts.push(`Concluído: ${conclusao}`);
            if (obs) infoParts.push(obs);
            dialogVerItensSIDInfo.textContent = infoParts.join(" · ");
            dialogVerItensSIDConteudo.innerHTML = "Carregando...";
            btnAtenderPedidoSID.hidden = status !== "pendente";
            dialogVerItensSID.showModal();

            const resp = await fetch(`${apiUrl}/pedidos-almoxarifado/${id}/itens`);
            const dat  = await resp.json();
            if (dat.status === "success" && dat.data.length > 0) {
                dialogVerItensSIDConteudo.innerHTML = dat.data.map(item => `
                    <div class="pedido-item flex gap--10">
                        <span class="pedido-item-codigo">${item.codigo_produto || "—"}</span>
                        <span class="pedido-item-descricao flex--1">${item.descricao_produto}</span>
                        <span class="pedido-item-qtd">Qtd: ${item.quantidade}</span>
                    </div>
                `).join("");
            } else {
                dialogVerItensSIDConteudo.innerHTML = '<p class="pedido-lista-vazia">Nenhum item encontrado.</p>';
            }
        });

        btnAtenderPedidoSID.addEventListener("click", async () => {
            const id = dialogVerItensSID.dataset.pedidoId;
            if (!id || !confirm("Confirmar que o pedido foi efetuado no SIE?")) return;
            const resp = await fetch(`${apiUrl}/pedidos-almoxarifado/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "atendido" })
            });
            const dat = await resp.json();
            if (dat.status === "success") {
                dialogVerItensSID.close();
                renderizarPedidosSID();
            } else {
                alert(dat.message || "Erro ao atualizar status.");
            }
        });

        btnFecharVerItensSID.addEventListener("click", () => dialogVerItensSID.close());

        // WebSocket — atualiza lista em tempo real ao chegar novo pedido
        const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${wsProto}//${location.host}`);
        ws.addEventListener("open", () => {
            const token = localStorage.getItem("siccr_token");
            if (token) ws.send(JSON.stringify({ token }));
        });
        ws.addEventListener("message", (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.tipo === "pedido_pendente") {
                    const setor = msg.pedido?.subunidade_sigla || msg.pedido?.subunidade_nome || "setor";
                    mostrarToast(`Novo pedido de: ${setor}`);
                    if (filtroStatus.value === "pendente" || filtroStatus.value === "todos") {
                        renderizarPedidosSID();
                    }
                }
            } catch { /* ignora */ }
        });

        renderizarPedidosSID();
    }

    // Rotinas para a página gerenciamento-de-usuarios.html
    // -----------------------------------------------------
    if (urlParam === "/gerenciamento-de-usuarios") {
        const siccr              = JSON.parse(localStorage.getItem("siccr") || "null");
        const listaUsuarios      = document.getElementById("listaUsuarios");
        const btnNovoUsuario     = document.getElementById("btnNovoUsuario");

        // Dialog cadastro/edição
        const dialogUsuario      = document.getElementById("dialogUsuario");
        const dialogUsuarioLegend= document.getElementById("dialogUsuarioLegend");
        const frmUsuario         = document.getElementById("frmUsuario");
        const usuNome            = document.getElementById("usuNome");
        const usuSiape           = document.getElementById("usuSiape");
        const usuEmail           = document.getElementById("usuEmail");
        const usuWhatsapp        = document.getElementById("usuWhatsapp");
        const usuDataNasc        = document.getElementById("usuDataNasc");
        const usuPermissao       = document.getElementById("usuPermissao");
        const usuSubunidade      = document.getElementById("usuSubunidade");
        const rowSubunidade      = document.getElementById("rowSubunidade");
        const usuSenha           = document.getElementById("usuSenha");
        const labelSenha         = document.getElementById("labelSenha");
        const usuarioErro        = document.getElementById("usuarioErro");
        const btnCadastrarUsuario= document.getElementById("btnCadastrarUsuario");
        const btnAtualizarUsuario= document.getElementById("btnAtualizarUsuario");
        const btnCancelarUsuario = document.getElementById("btnCancelarUsuario");

        // Dialog permissões
        const dialogPermissoes       = document.getElementById("dialogPermissoes");
        const dialogPermissoesLegend = document.getElementById("dialogPermissoesLegend");
        const dialogPermissoesInfo   = document.getElementById("dialogPermissoesInfo");
        const listaPermissoes        = document.getElementById("listaPermissoes");
        const permissoesErro         = document.getElementById("permissoesErro");
        const btnFecharPermissoes    = document.getElementById("btnFecharPermissoes");

        const labelPermissao = {
            super_admin: "Super Admin", diretor: "Diretor",
            vice_diretor: "Vice-Diretor", chefe: "Chefe",
            subchefe: "Subchefe", servidor: "Servidor"
        };

        // Nível do usuário logado (espelha getNivelAcesso do backend)
        const perm  = siccr?.permissao || "";
        const isDC  = siccr?.is_direcao_centro === true;
        const nivel = perm === "super_admin" ? 4
                    : (perm === "diretor" || perm === "vice_diretor" || isDC) ? 3
                    : (perm === "chefe"   || perm === "subchefe") ? 2 : 1;

        let todasFuncionalidades = [];
        let usuarioAtual = null;    // usuário sendo editado/com permissões abertas
        let editandoId   = null;    // ID do usuário em edição

        // ── Configura opções de permissão conforme nível ────────────────
        function preencherOpcoesPermissao() {
            const opcoes = nivel >= 4
                ? ["servidor","subchefe","chefe","vice_diretor","diretor","super_admin"]
                : nivel >= 3
                    ? ["servidor","subchefe","chefe","vice_diretor","diretor"]
                    : ["servidor","subchefe"]; // chefe só pode criar servidor/subchefe

            usuPermissao.innerHTML = opcoes.map(o =>
                `<option value="${o}">${labelPermissao[o]}</option>`
            ).join("");
        }

        // ── Configura visibilidade do campo subunidade ───────────────────
        function configurarFormulario() {
            preencherOpcoesPermissao();
            if (nivel <= 2) {
                // Chefe: subunidade fixa — não exibe o seletor
                rowSubunidade.hidden = true;
            } else {
                // Diretor/super_admin: mostra seletor e carrega opções
                rowSubunidade.hidden = false;
                carregarDados("subunidades").then((subs) => {
                    usuSubunidade.innerHTML = '<option value="">Selecione a subunidade...</option>'
                        + (subs || []).map(s =>
                            `<option value="${s.subunidade_id}">${s.subunidade_nome}</option>`
                        ).join("");
                });
            }
        }

        // ── Abre dialog para NOVO usuário ────────────────────────────────
        btnNovoUsuario.addEventListener("click", () => {
            editandoId = null;
            frmUsuario.reset();
            dialogUsuarioLegend.textContent = "Novo Usuário";
            labelSenha.textContent = "Senha *";
            usuSenha.placeholder = "Mínimo 8 caracteres";
            usuSenha.required = true;
            usuarioErro.hidden = true;
            btnCadastrarUsuario.hidden = false;
            btnAtualizarUsuario.hidden = true;
            configurarFormulario();
            dialogUsuario.showModal();
        });

        // ── Abre dialog para EDITAR usuário ─────────────────────────────
        function abrirEdicao(u) {
            editandoId = u.user_id;
            dialogUsuarioLegend.textContent = "Editar Usuário";
            usuNome.value      = u.nome || "";
            usuSiape.value     = u.siape || "";
            usuEmail.value     = u.email || "";
            usuWhatsapp.value  = u.whatsapp || "";
            usuDataNasc.value  = u.data_nascimento ? u.data_nascimento.slice(0, 10) : "";
            usuSenha.value     = "";
            labelSenha.textContent = "Senha (deixe em branco para não alterar)";
            usuSenha.placeholder   = "Deixe em branco para manter a senha atual";
            usuSenha.required = false;
            usuarioErro.hidden = true;
            btnCadastrarUsuario.hidden = true;
            btnAtualizarUsuario.hidden = false;
            configurarFormulario();
            // Seta permissão e subunidade após configurar o form
            usuPermissao.value  = u.permissao || "servidor";
            if (nivel >= 3) usuSubunidade.value = u.subunidade_id || "";
            dialogUsuario.showModal();
        }

        btnCancelarUsuario.addEventListener("click", () => dialogUsuario.close());

        // ── CADASTRAR ────────────────────────────────────────────────────
        btnCadastrarUsuario.addEventListener("click", async () => {
            usuarioErro.hidden = true;
            const body = {
                nome:           usuNome.value.trim(),
                siape:          usuSiape.value.trim(),
                email:          usuEmail.value.trim() || null,
                whatsapp:       usuWhatsapp.value.trim() || null,
                data_nascimento:usuDataNasc.value || null,
                permissao:      usuPermissao.value,
                senha:          usuSenha.value,
                subunidade_id:  nivel <= 2 ? siccr.subunidade_id : (usuSubunidade.value || null)
            };
            if (!body.nome || !body.siape || !body.senha) {
                usuarioErro.textContent = "Nome, SIAPE e Senha são obrigatórios.";
                usuarioErro.hidden = false;
                return;
            }
            const resp = await fetch(`${apiUrl}/usuarios`, { method: "POST", body: JSON.stringify(body) });
            const data = await resp.json();
            if (data.status === "success") {
                dialogUsuario.close();
                renderizarUsuarios();
            } else {
                usuarioErro.textContent = data.message || "Erro ao cadastrar.";
                usuarioErro.hidden = false;
            }
        });

        // ── ATUALIZAR ────────────────────────────────────────────────────
        btnAtualizarUsuario.addEventListener("click", async () => {
            usuarioErro.hidden = true;
            const body = {
                nome:           usuNome.value.trim(),
                siape:          usuSiape.value.trim(),
                email:          usuEmail.value.trim() || null,
                whatsapp:       usuWhatsapp.value.trim() || null,
                data_nascimento:usuDataNasc.value || null,
                permissao:      usuPermissao.value,
                subunidade_id:  nivel <= 2 ? siccr.subunidade_id : (usuSubunidade.value || null)
            };
            if (usuSenha.value) body.senha = usuSenha.value;
            if (!body.nome || !body.siape) {
                usuarioErro.textContent = "Nome e SIAPE são obrigatórios.";
                usuarioErro.hidden = false;
                return;
            }
            const resp = await fetch(`${apiUrl}/usuarios/${editandoId}`, { method: "PUT", body: JSON.stringify(body) });
            const data = await resp.json();
            if (data.status === "success") {
                dialogUsuario.close();
                renderizarUsuarios();
            } else {
                usuarioErro.textContent = data.message || "Erro ao atualizar.";
                usuarioErro.hidden = false;
            }
        });

        // ── Carrega funcionalidades (uma vez) ────────────────────────────
        carregarDados("funcionalidades").then(f => { todasFuncionalidades = f || []; });

        // ── Renderiza lista de usuários ──────────────────────────────────
        function renderizarUsuarios() {
            carregarDados("usuarios").then((usuarios) => {
                listaUsuarios.innerHTML = "";
                if (!usuarios || usuarios.length === 0) {
                    listaUsuarios.innerHTML = '<p style="padding:15px">Nenhum usuário encontrado.</p>';
                    return;
                }
                usuarios.forEach((u) => {
                    const ehProprioUsuario = u.user_id === siccr?.user_id;
                    // Chefe só edita/gerencia servidores e subchefes; diretor/super_admin gerenciam qualquer um
                    const podeGerenciar = nivel >= 3 || ["servidor","subchefe"].includes(u.permissao);
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--5">${u.nome}</div>
                        <div class="dado flex flex--2">${u.siape}</div>
                        <div class="dado flex flex--3">${labelPermissao[u.permissao] || u.permissao}</div>
                        <div class="dado flex flex--3">${u.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--3 font--size--20 gap--10">
                            ${podeGerenciar ? `
                                <i class="bi bi-pencil editar-usuario cursor--pointer" title="Editar usuário"
                                    data-json='${JSON.stringify(u)}'></i>
                                <i class="bi bi-key btn-permissoes cursor--pointer" title="Permissões"
                                    data-id="${u.user_id}"
                                    data-nome="${u.nome}"
                                    data-permissao="${u.permissao}"
                                    data-subunidade="${u.subunidade_nome || ""}"></i>
                                ${!ehProprioUsuario ? `<i class="bi bi-trash excluir-usuario cursor--pointer" title="Excluir usuário"
                                    data-id="${u.user_id}" data-nome="${u.nome}"></i>` : ""}
                            ` : "—"}
                        </div>
                    `;
                    listaUsuarios.appendChild(div);
                });
            });
        }

        // ── Delegação de eventos na lista ────────────────────────────────
        listaUsuarios.addEventListener("click", async (e) => {
            // Editar
            const iconEditar = e.target.closest(".editar-usuario");
            if (iconEditar) {
                const u = JSON.parse(iconEditar.dataset.json);
                abrirEdicao(u);
                return;
            }
            // Permissões
            const iconPerm = e.target.closest(".btn-permissoes");
            if (iconPerm) {
                abrirDialogPermissoes(
                    iconPerm.dataset.id,
                    iconPerm.dataset.nome,
                    iconPerm.dataset.permissao,
                    iconPerm.dataset.subunidade
                );
                return;
            }
            // Excluir
            const iconExcluir = e.target.closest(".excluir-usuario");
            if (iconExcluir) {
                const { id, nome } = iconExcluir.dataset;
                if (!confirm(`Deseja excluir o usuário "${nome}"?`)) return;
                const resp = await fetch(`${apiUrl}/usuarios/${id}`, { method: "DELETE" });
                const data = await resp.json();
                if (data.status === "success") {
                    renderizarUsuarios();
                } else {
                    alert(data.message || "Erro ao excluir usuário.");
                }
            }
        });

        // ── Dialog de permissões ─────────────────────────────────────────
        async function abrirDialogPermissoes(userId, nomeUsuario, permissaoUsuario, subunidade) {
            usuarioAtual = { id: userId, nome: nomeUsuario };
            dialogPermissoesLegend.textContent = `Permissões — ${nomeUsuario}`;
            dialogPermissoesInfo.textContent = `${labelPermissao[permissaoUsuario] || permissaoUsuario}${subunidade ? " · " + subunidade : ""}`;
            permissoesErro.hidden = true;
            listaPermissoes.innerHTML = "Carregando...";
            dialogPermissoes.showModal();

            let permissoesAtuais = [];
            try {
                const resp = await fetch(`${apiUrl}/permissoes-usuario/${userId}`);
                const data = await resp.json();
                permissoesAtuais = data.status === "success" ? data.data : [];
            } catch { /* mantém vazio */ }

            renderizarPermissoesDialog(permissoesAtuais);
        }

        function renderizarPermissoesDialog(permissoesAtuais) {
            if (todasFuncionalidades.length === 0) {
                listaPermissoes.innerHTML = '<p>Nenhuma funcionalidade cadastrada.</p>';
                return;
            }
            const porModulo = {};
            todasFuncionalidades.forEach(f => {
                if (!porModulo[f.modulo]) porModulo[f.modulo] = [];
                porModulo[f.modulo].push(f);
            });
            let html = "";
            for (const modulo of Object.keys(porModulo).sort()) {
                html += `<div class="gerenciar-permissoes-modulo">${modulo}</div>`;
                porModulo[modulo].forEach(f => {
                    const concedida = permissoesAtuais.find(p => p.funcionalidade_id === f.id);
                    html += `
                        <div class="gerenciar-permissoes-item flex align--items--center gap--10">
                            <span class="flex--1">
                                <strong>${f.descricao || f.nome}</strong>
                                <span class="gerenciar-permissoes-nome">${f.nome}</span>
                            </span>
                            ${concedida
                                ? `<button type="button" class="btn-revogar-perm btnPainelFormulario cancelarUnidade"
                                    style="font-size:12px;padding:4px 12px"
                                    data-perm-id="${concedida.id}">Revogar</button>`
                                : `<button type="button" class="btn-conceder-perm btnPainelFormulario cadastrarUnidade"
                                    style="font-size:12px;padding:4px 12px"
                                    data-func-id="${f.id}">Conceder</button>`
                            }
                        </div>
                    `;
                });
            }
            listaPermissoes.innerHTML = html;
        }

        listaPermissoes.addEventListener("click", async (e) => {
            permissoesErro.hidden = true;

            if (e.target.classList.contains("btn-conceder-perm")) {
                const resp = await fetch(`${apiUrl}/permissoes-usuario`, {
                    method: "POST",
                    body: JSON.stringify({ user_id: usuarioAtual.id, funcionalidade_id: parseInt(e.target.dataset.funcId) })
                });
                const data = await resp.json();
                if (data.status === "success") {
                    const r2 = await fetch(`${apiUrl}/permissoes-usuario/${usuarioAtual.id}`);
                    const d2 = await r2.json();
                    renderizarPermissoesDialog(d2.status === "success" ? d2.data : []);
                } else {
                    permissoesErro.textContent = data.message || "Erro ao conceder permissão.";
                    permissoesErro.hidden = false;
                }
            }

            if (e.target.classList.contains("btn-revogar-perm")) {
                const resp = await fetch(`${apiUrl}/permissoes-usuario/${e.target.dataset.permId}`, { method: "DELETE" });
                const data = await resp.json();
                if (data.status === "success") {
                    const r2 = await fetch(`${apiUrl}/permissoes-usuario/${usuarioAtual.id}`);
                    const d2 = await r2.json();
                    renderizarPermissoesDialog(d2.status === "success" ? d2.data : []);
                } else {
                    permissoesErro.textContent = data.message || "Erro ao revogar permissão.";
                    permissoesErro.hidden = false;
                }
            }
        });

        btnFecharPermissoes.addEventListener("click", () => dialogPermissoes.close());

        renderizarUsuarios();
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

        function parsearValorMonetario(valor) {
            const normalizado = String(valor).trim().replace(/\./g, "").replace(",", ".");
            const num = parseFloat(normalizado);
            return isNaN(num) || num < 0 ? null : num;
        }

        elements.btnCadastrar.addEventListener("click", function(event) {
            event.preventDefault();
            const objData = Object.fromEntries(new FormData(elements.frmUnidade).entries());
            const valorParsed = parsearValorMonetario(objData.valor_previsto);
            if (valorParsed === null) {
                alert("Valor previsto inválido. Use o formato: 5000,00");
                return;
            }
            fetch(`${apiUrl}/previsoes-despesas`, {
                method: "POST",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    id_tipo_despesa: objData.id_tipo_despesa,
                    valor_previsto: valorParsed,
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
            const valorParsed = parsearValorMonetario(objData.valor_previsto);
            if (valorParsed === null) {
                alert("Valor previsto inválido. Use o formato: 5000,00");
                return;
            }
            fetch(`${apiUrl}/previsoes-despesas/${objData.id_previsao}`, {
                method: "PUT",
                body: JSON.stringify({
                    subunidade_id: objData.subunidade_id,
                    id_tipo_despesa: objData.id_tipo_despesa,
                    valor_previsto: valorParsed,
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
        const CORES_GRAFICOS = [
            "#009536","#007a2e","#4caf7d","#81c995","#2196F3",
            "#FF9800","#E91E63","#9C27B0","#00BCD4","#FF5722",
            "#607D8B","#795548","#FFEB3B","#3F51B5","#8BC34A"
        ];

        let chartSub  = null;
        let chartTipo = null;
        let dadosAtual = null;

        function formatarMoeda(valor) {
            return parseFloat(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        }

        // Popula select de anos (ano atual até 5 anos atrás + opção "Todos")
        const filtroAno = document.querySelector("#filtroAno");
        const anoAtual  = new Date().getFullYear();
        filtroAno.innerHTML = `<option value="">Todos os anos</option>` +
            Array.from({ length: 6 }, (_, i) => anoAtual - i)
                 .map(a => `<option value="${a}"${a === anoAtual ? " selected" : ""}>${a}</option>`)
                 .join("");

        function renderizarGraficoBarras(dados) {
            const ctx = document.querySelector("#graficoSubunidades");
            if (!ctx) return;
            if (chartSub) chartSub.destroy();
            const labels = dados.map(d => d.subunidade_nome || "—");
            const values = dados.map(d => parseFloat(d.total));
            chartSub = new Chart(ctx, {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        label: "Despesas (R$)",
                        data: values,
                        backgroundColor: "#009536cc",
                        borderColor: "#007a2e",
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: "y",
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { callback: v => `R$ ${v.toLocaleString("pt-BR")}` } }
                    }
                }
            });
        }

        function renderizarGraficoDoughnut(dados) {
            const ctx = document.querySelector("#graficoTipos");
            if (!ctx) return;
            if (chartTipo) chartTipo.destroy();
            const comValor = dados.filter(d => parseFloat(d.total) > 0);
            if (!comValor.length) return;
            chartTipo = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: comValor.map(d => d.tipo_despesa),
                    datasets: [{
                        data: comValor.map(d => parseFloat(d.total)),
                        backgroundColor: CORES_GRAFICOS.slice(0, comValor.length),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom", labels: { font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${formatarMoeda(ctx.parsed)}`
                            }
                        }
                    }
                }
            });
        }

        function renderizarRelatorio(dados) {
            if (!dados) {
                document.querySelectorAll(".card-valor").forEach(el => el.textContent = "—");
                return;
            }
            dadosAtual = dados;
            const escopoGeral = dados.escopo === "geral";

            const badgeEl = document.querySelector("#escopoRelatorio");
            if (badgeEl) badgeEl.textContent = escopoGeral ? "Visão geral" : "Visão da sua subunidade";

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

            // Tabela por subunidade
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

            // Tabela por tipo
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

            renderizarGraficoBarras(dados.por_subunidade);
            renderizarGraficoDoughnut(dados.por_tipo_despesa);
        }

        function carregarRelatorio() {
            const ano = filtroAno.value;
            const endpoint = ano ? `relatorios/resumo?ano=${ano}` : "relatorios/resumo";
            document.querySelectorAll(".card-valor").forEach(el => el.textContent = "Carregando...");
            carregarDados(endpoint).then(renderizarRelatorio);
        }

        // Exportação CSV
        document.querySelector("#btnExportarCSV")?.addEventListener("click", () => {
            if (!dadosAtual) return;
            const linhas = [];
            const ano = filtroAno.value || "todos";

            linhas.push(`"SICCR2 — Relatório Financeiro — Ano: ${ano}"`);
            linhas.push("");

            if (dadosAtual.escopo === "geral") {
                linhas.push('"RESUMO"');
                linhas.push(`"Total de Recursos Recebidos";"${formatarMoeda(dadosAtual.total_recursos)}"`);
                linhas.push(`"Total de Despesas";"${formatarMoeda(dadosAtual.total_despesas)}"`);
                linhas.push(`"Saldo";"${formatarMoeda(dadosAtual.saldo)}"`);
                linhas.push("");
            }

            linhas.push('"DESPESAS POR SUBUNIDADE"');
            linhas.push('"Subunidade";"Total (R$)"');
            dadosAtual.por_subunidade.forEach(d =>
                linhas.push(`"${d.subunidade_nome}";"${formatarMoeda(d.total)}"`)
            );
            linhas.push("");

            linhas.push('"DESPESAS POR TIPO"');
            linhas.push('"Tipo de Despesa";"Total (R$)"');
            dadosAtual.por_tipo_despesa.forEach(d =>
                linhas.push(`"${d.tipo_despesa}";"${formatarMoeda(d.total)}"`)
            );

            const bom = "\uFEFF"; // BOM para UTF-8 no Excel
            const blob = new Blob([bom + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `relatorio-financeiro-${ano}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.querySelector("#btnImprimir")?.addEventListener("click", () => {
            window.print();
        });

        filtroAno.addEventListener("change", carregarRelatorio);
        carregarRelatorio();
    }


});