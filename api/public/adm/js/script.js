// Patch global: injeta o token Bearer em todos os fetch da área admin e
// intercepta 401 (sessão expirada) para deslogar e voltar ao login.
(function() {
    const _fetch = window.fetch.bind(window);
    window.fetch = function(url, options = {}) {
        const token = localStorage.getItem("siccr_token");
        return _fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
        }).then((res) => {
            const ehLogin = String(url).includes("/api/auth/login") ||
                            location.pathname === "/adm/login";
            if (res.status === 401 && !ehLogin) {
                localStorage.removeItem("siccr");
                localStorage.removeItem("siccr_token");
                alert("Sua sessão expirou. Faça login novamente.");
                location.replace("/adm/login");
            }
            return res;
        });
    };
})();

document.addEventListener("DOMContentLoaded", function() {
    const apiUrl = `${window.location.origin}/api`;
    const urlParam = window.location.pathname;

    // Exibir usuário logado no cabeçalho
    const siccr = JSON.parse(localStorage.getItem("siccr") || "null");
    const acesso = document.querySelector(".acesso");

    if (siccr && acesso) {
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

    // ─── Funções de carregamento de dados ───────────────────────────────────

    async function carregarUnidades() {
        try {
            const r = await fetch(`${apiUrl}/unidades`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar unidades:", e); }
    }

    async function carregarSubunidades() {
        try {
            const r = await fetch(`${apiUrl}/subunidades`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar subunidades:", e); }
    }

    async function carregarSubunidadesTotalInfo() {
        try {
            const r = await fetch(`${apiUrl}/subunidades/total-info`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar subunidades (total-info):", e); }
    }

    async function carregarUsuarios() {
        try {
            const r = await fetch(`${apiUrl}/usuarios`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar usuários:", e); }
    }

    async function carregarUsuariosTotalInfo() {
        try {
            const r = await fetch(`${apiUrl}/usuarios/total-info`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar usuários (total-info):", e); }
    }

    async function carregarPredios() {
        try {
            const r = await fetch(`${apiUrl}/predios`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar prédios:", e); }
    }

    async function carregarPrediosTotalInfo() {
        try {
            const r = await fetch(`${apiUrl}/predios/total-info`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar prédios (total-info):", e); }
    }

    async function carregarSalas() {
        try {
            const r = await fetch(`${apiUrl}/salas`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar salas:", e); }
    }

    async function carregarSalasTotalInfo() {
        try {
            const r = await fetch(`${apiUrl}/salas/total-info`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar salas (total-info):", e); }
    }

    async function carregarSalasTipo() {
        try {
            const r = await fetch(`${apiUrl}/salas-tipo`);
            return (await r.json()).data;
        } catch (e) { console.error("Erro ao carregar tipos de sala:", e); }
    }

    // ─── Helper: ícones de ação padrão ──────────────────────────────────────
    function iconeAcoes(editarAttrs, excluirId, entidade) {
        return `
            <i class="bi bi-pencil-square editar" title="Editar" ${editarAttrs}></i>
            <i class="bi bi-trash excluir" title="Excluir" data-id="${excluirId}" data-entidade="${entidade}"></i>
        `;
    }

    // ─── Helper: popular select ──────────────────────────────────────────────
    function popularSelect(select, items, valueFn, textFn, placeholder = "Selecione...") {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        (items || []).forEach(item => {
            select.innerHTML += `<option value="${valueFn(item)}">${textFn(item)}</option>`;
        });
    }

    // =========================================================================
    // GESTÃO DE UNIDADES — /adm/unidades
    // =========================================================================
    if (urlParam === "/adm/unidades") {
        const btnAdicionar    = document.querySelector(".btn_adicionar");
        const frmUnidade      = document.querySelector(".frmUnidade");
        const btnCadastrar    = document.querySelector(".cadastrarUnidade");
        const btnAtualizar    = document.querySelector(".atualizarUnidade");
        const btnCancelar     = document.querySelector(".cancelarUnidade");
        const dialogPainel    = document.querySelector(".dialogPainel");
        const listaUnidades   = document.querySelector(".listaUnidades");

        async function renderizarUnidades() {
            try {
                const r = await fetch(`${apiUrl}/unidades`);
                const { data } = await r.json();
                listaUnidades.innerHTML = "";
                data.forEach(u => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${u.unidade_codigo}</div>
                        <div class="dado flex flex--10">${u.unidade}</div>
                        <div class="dado flex flex--2">${u.unidade_sigla}</div>
                        <div class="dado flex flex--1 font--size--20">
                            ${iconeAcoes(
                                `data-id="${u.unidade_id}" data-codigo="${u.unidade_codigo}" data-unidade="${u.unidade}" data-sigla="${u.unidade_sigla}"`,
                                u.unidade_id, "unidade"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar unidades:", e); }
        }

        async function excluirUnidade(id) {
            if (!confirm("Excluir esta unidade?")) return;
            try {
                const r = await fetch(`${apiUrl}/unidades/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarUnidades();
            } catch (e) { console.error("Erro ao excluir unidade:", e); }
        }

        renderizarUnidades();

        btnAdicionar.addEventListener("click", function(e) {
            e.preventDefault();
            if (!e.target.classList.contains("unidade")) return;
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar unidade";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            let codigo = document.querySelector("#unidade_codigo").value.trim();
            const unidade = document.querySelector("#unidade").value.trim();
            const sigla   = document.querySelector("#unidade_sigla").value.trim();
            if (!codigo || !unidade || !sigla) { alert("Todos os campos são obrigatórios."); return; }
            if (codigo.includes(",")) codigo = codigo.replace(",", ".");
            try {
                const r = await fetch(`${apiUrl}/unidades`, {
                    method: "POST",
                    body: JSON.stringify({ unidade_codigo: codigo, unidade, unidade_sigla: sigla })
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarUnidades();
            } catch (e) { console.error("Erro ao cadastrar unidade:", e); }
        });

        btnAtualizar.addEventListener("click", async function(e) {
            e.preventDefault();
            const id     = document.querySelector("#unidade_id").value;
            let codigo   = document.querySelector("#unidade_codigo").value.trim();
            const unidade = document.querySelector("#unidade").value.trim();
            const sigla   = document.querySelector("#unidade_sigla").value.trim();
            if (codigo.includes(",")) codigo = codigo.replace(",", ".");
            try {
                await fetch(`${apiUrl}/unidades/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ unidade_codigo: codigo, unidade, unidade_sigla: sigla })
                });
                frmUnidade.reset(); dialogPainel.close();
                renderizarUnidades();
            } catch (e) { console.error("Erro ao atualizar unidade:", e); }
        });

        listaUnidades.addEventListener("click", function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) {
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar unidade";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                document.querySelector("#unidade_id").value     = el.dataset.id;
                document.querySelector("#unidade_codigo").value = el.dataset.codigo;
                document.querySelector("#unidade").value        = el.dataset.unidade;
                document.querySelector("#unidade_sigla").value  = el.dataset.sigla;
                dialogPainel.showModal();
            }
            if (el.classList.contains("excluir")) excluirUnidade(el.dataset.id);
        });
    } // fim /adm/unidades

    // =========================================================================
    // GESTÃO DE SUBUNIDADES — /adm/subunidades
    // =========================================================================
    if (urlParam === "/adm/subunidades") {
        const titulo       = document.querySelector(".titulo_painel h1");
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade   = document.querySelector(".frmUnidade");
        const btnCadastrar = document.querySelector(".cadastrarUnidade");
        const btnAtualizar = document.querySelector(".atualizarUnidade");
        const btnCancelar  = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");

        async function renderizarSubunidades() {
            try {
                const subs = await carregarSubunidadesTotalInfo();
                listaUnidades.innerHTML = "";
                if (!subs || !subs.length) {
                    listaUnidades.innerHTML = "<p style='padding:10px;'>Nenhuma subunidade cadastrada.</p>";
                    return;
                }
                titulo.textContent = `Painel Administrativo - Subunidades (${subs[0].total_subunidades})`;
                subs.forEach(s => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--1">${s.subunidade_codigo || ""}</div>
                        <div class="dado flex flex--6">${s.subunidade_nome || ""}${s.is_direcao_centro ? ' <span title="Setor da Direção" style="color:#009536">★</span>' : ""}</div>
                        <div class="dado flex flex--6">${s.subunidade_email || ""}</div>
                        <div class="dado flex flex--3">${(s.subunidade_sigla || "").toUpperCase()}</div>
                        <div class="dado flex flex--2">${s.unidade_sigla || ""}</div>
                        <div class="dado flex flex--3">${s.chefe_nome || "—"}</div>
                        <div class="dado flex flex--2">${s.predio || "—"}</div>
                        <div class="dado flex flex--1 font--size--20">
                            ${iconeAcoes(
                                `data-subunidade_id="${s.subunidade_id}"
                                 data-codigo="${s.subunidade_codigo || ""}"
                                 data-nome="${s.subunidade_nome || ""}"
                                 data-email="${s.subunidade_email || ""}"
                                 data-sigla="${s.subunidade_sigla || ""}"
                                 data-chefe="${s.chefe || ""}"
                                 data-unidade_id="${s.unidade_id || ""}"
                                 data-predio_id="${s.predio_id || ""}"
                                 data-is_direcao_centro="${s.is_direcao_centro || false}"`,
                                s.subunidade_id, "subunidade"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar subunidades:", e); }
        }

        async function excluirSubunidade(id) {
            if (!confirm("Excluir esta subunidade?")) return;
            try {
                const r = await fetch(`${apiUrl}/subunidades/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarSubunidades();
            } catch (e) { console.error("Erro ao excluir subunidade:", e); }
        }

        function getDadosSubunidadeForm() {
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            // Checkbox não incluso no FormData quando desmarcado — normaliza explicitamente
            dados.is_direcao_centro = document.querySelector("#is_direcao_centro").checked;
            if (isNaN(Number(dados.chefe)) || !dados.chefe) dados.chefe = null;
            return dados;
        }

        async function cadastrarSubunidade() {
            const dados = getDadosSubunidadeForm();
            if (!dados.subunidade_codigo || !dados.subunidade_nome || !dados.unidade_id) {
                alert("Código, nome e unidade são obrigatórios."); return;
            }
            try {
                const r = await fetch(`${apiUrl}/subunidades`, {
                    method: "POST", body: JSON.stringify(dados)
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSubunidades();
            } catch (e) { console.error("Erro ao cadastrar subunidade:", e); }
        }

        async function atualizarSubunidade() {
            const dados = getDadosSubunidadeForm();
            try {
                const r = await fetch(`${apiUrl}/subunidades/${dados.subunidade_id}`, {
                    method: "PUT", body: JSON.stringify(dados)
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSubunidades();
            } catch (e) { console.error("Erro ao atualizar subunidade:", e); }
        }

        async function abrirFormSubunidade(dados = null) {
            const modoEdicao = dados !== null;
            document.querySelector(".dialogPainel fieldset legend").textContent = modoEdicao ? "Editar subunidade" : "Cadastrar subunidade";
            btnCadastrar.style.display = modoEdicao ? "none" : "inline-block";
            btnCadastrar.disabled = modoEdicao;
            btnAtualizar.style.display = modoEdicao ? "inline-block" : "none";
            btnAtualizar.disabled = !modoEdicao;

            const selectChefe   = document.querySelector("#chefe");
            const selectUnidade = document.querySelector("#unidade_id");
            const selectPredio  = document.querySelector("#predio_id");

            frmUnidade.reset();

            const [usuarios, unidades, predios] = await Promise.all([
                carregarUsuarios(), carregarUnidades(), carregarPredios()
            ]);

            popularSelect(selectChefe,   usuarios,  u => u.user_id,   u => u.nome,   "Selecione o chefe...");
            popularSelect(selectUnidade, unidades,  u => u.unidade_id, u => u.unidade, "Selecione a unidade...");
            popularSelect(selectPredio,  predios,   p => p.predio_id,  p => p.predio,  "Selecione o prédio...");

            if (modoEdicao) {
                document.querySelector("#subunidade_id").value    = dados.subunidade_id;
                document.querySelector("#subunidade_codigo").value = dados.codigo;
                document.querySelector("#subunidade_nome").value   = dados.nome;
                document.querySelector("#subunidade_email").value  = dados.email;
                document.querySelector("#subunidade_sigla").value  = dados.sigla;
                document.querySelector("#is_direcao_centro").checked = dados.is_direcao_centro === "true" || dados.is_direcao_centro === true;
                selectChefe.value   = dados.chefe;
                selectUnidade.value = dados.unidade_id;
                selectPredio.value  = dados.predio_id;
            }

            dialogPainel.showModal();
        }

        renderizarSubunidades();

        btnAdicionar.addEventListener("click", function(e) {
            e.preventDefault();
            if (e.target.classList.contains("subunidade")) abrirFormSubunidade();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        btnCadastrar.addEventListener("click", function(e) { e.preventDefault(); cadastrarSubunidade(); });
        btnAtualizar.addEventListener("click", function(e) { e.preventDefault(); atualizarSubunidade(); });

        listaUnidades.addEventListener("click", function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) abrirFormSubunidade(el.dataset);
            if (el.classList.contains("excluir")) excluirSubunidade(el.dataset.id);
        });
    } // fim /adm/subunidades

    // =========================================================================
    // GESTÃO DE PRÉDIOS — /adm/predios
    // =========================================================================
    if (urlParam === "/adm/predios") {
        const btnAdicionar  = document.querySelector(".btn_adicionar");
        const frmUnidade    = document.querySelector(".frmUnidade");
        const btnCadastrar  = document.querySelector(".cadastrarUnidade");
        const btnAtualizar  = document.querySelector(".atualizarUnidade");
        const btnCancelar   = document.querySelector(".cancelarUnidade");
        const dialogPainel  = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectUnidades = document.querySelector("#unidade_id");

        async function renderizarPredios() {
            try {
                const predios = await carregarPrediosTotalInfo();
                listaUnidades.innerHTML = "";
                (predios || []).forEach(p => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${p.predio}</div>
                        <div class="dado flex flex--10">${p.descricao || ""}</div>
                        <div class="dado flex flex--2">${p.unidade_sigla}</div>
                        <div class="dado flex flex--1 font--size--20">
                            ${iconeAcoes(
                                `data-id="${p.predio_id}" data-predio="${p.predio}" data-descricao="${p.descricao || ""}" data-unidade_id="${p.unidade_id}"`,
                                p.predio_id, "predio"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar prédios:", e); }
        }

        async function excluirPredio(id) {
            if (!confirm("Excluir este prédio?")) return;
            try {
                const r = await fetch(`${apiUrl}/predios/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarPredios();
            } catch (e) { console.error("Erro ao excluir prédio:", e); }
        }

        renderizarPredios();

        btnAdicionar.addEventListener("click", async function(e) {
            e.preventDefault();
            if (!e.target.classList.contains("predio")) return;
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar prédio";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            const unidades = await carregarUnidades();
            popularSelect(selectUnidades, unidades, u => u.unidade_id, u => u.unidade, "Selecione a unidade...");
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            if (!dados.predio || !dados.unidade_id) {
                alert("Identificação do prédio e unidade são obrigatórios."); return;
            }
            try {
                const r = await fetch(`${apiUrl}/predios`, { method: "POST", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarPredios();
            } catch (e) { console.error("Erro ao cadastrar prédio:", e); }
        });

        btnAtualizar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            try {
                const r = await fetch(`${apiUrl}/predios/${dados.predio_id}`, { method: "PUT", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarPredios();
            } catch (e) { console.error("Erro ao atualizar prédio:", e); }
        });

        listaUnidades.addEventListener("click", async function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) {
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar prédio";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                frmUnidade.reset();
                const unidades = await carregarUnidades();
                popularSelect(selectUnidades, unidades, u => u.unidade_id, u => u.unidade, "Selecione a unidade...");
                document.querySelector("#predio_id").value = el.dataset.id;
                document.querySelector("#predio").value    = el.dataset.predio;
                document.querySelector("#descricao").value = el.dataset.descricao;
                selectUnidades.value = el.dataset.unidade_id;
                dialogPainel.showModal();
            }
            if (el.classList.contains("excluir")) excluirPredio(el.dataset.id);
        });
    } // fim /adm/predios

    // =========================================================================
    // GESTÃO DE USUÁRIOS — /adm/usuarios
    // =========================================================================
    if (urlParam === "/adm/usuarios") {
        const btnAdicionar   = document.querySelector(".btn_adicionar");
        const frmUnidade     = document.querySelector(".frmUnidade");
        const btnCadastrar   = document.querySelector(".cadastrarUnidade");
        const btnAtualizar   = document.querySelector(".atualizarUnidade");
        const btnCancelar    = document.querySelector(".cancelarUnidade");
        const dialogPainel   = document.querySelector(".dialogPainel");
        const listaUnidades  = document.querySelector(".listaUnidades");
        const selectPermissao = document.querySelector("#permissao");
        const rowSubunidade  = document.querySelector("#rowSubunidade");
        const rowUnidade     = document.querySelector("#rowUnidade");
        const selectSubunidade = document.querySelector("#subunidade_id");
        const selectUnidade  = document.querySelector("#unidade_id");

        // Roles que usam unidade (não subunidade)
        const ROLES_UNIDADE = ["diretor", "vice_diretor"];

        function toggleCamposRole(permissao) {
            const usaUnidade = ROLES_UNIDADE.includes(permissao);
            rowSubunidade.style.display = usaUnidade ? "none" : "";
            rowUnidade.style.display    = usaUnidade ? "" : "none";
        }

        // Atualiza visibilidade ao mudar permissão no select
        selectPermissao.addEventListener("change", function() {
            toggleCamposRole(this.value);
        });

        // Pré-carrega subunidades e unidades nos selects
        async function preCarregarSelects() {
            const [subs, unis] = await Promise.all([carregarSubunidades(), carregarUnidades()]);
            popularSelect(selectSubunidade, subs, s => s.subunidade_id, s => s.subunidade_nome, "Selecione a subunidade de lotação...");
            popularSelect(selectUnidade,    unis, u => u.unidade_id,    u => u.unidade,         "Selecione a unidade...");
        }

        preCarregarSelects();

        function renderizarUsuarios() {
            carregarUsuariosTotalInfo().then(usuarios => {
                listaUnidades.innerHTML = "";
                if (!usuarios) return;
                usuarios.forEach(u => {
                    const vinculo = u.subunidade_nome
                        ? `${u.subunidade_nome} (${u.subunidade_sigla || ""})`
                        : (u.unidade || "—");

                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--5">${u.nome}</div>
                        <div class="dado flex flex--4">${u.email || ""}</div>
                        <div class="dado flex flex--2">${u.siape}</div>
                        <div class="dado flex flex--3">${vinculo}</div>
                        <div class="dado flex flex--3">${(u.permissao || "").toUpperCase()}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-user_id="${u.user_id}"
                                 data-nome="${u.nome}"
                                 data-email="${u.email || ""}"
                                 data-siape="${u.siape}"
                                 data-data_nascimento="${u.data_nascimento || ""}"
                                 data-subunidade_id="${u.subunidade_id || ""}"
                                 data-unidade_id="${u.unidade_id || ""}"
                                 data-whatsapp="${u.whatsapp || ""}"
                                 data-permissao="${u.permissao || "servidor"}"
                                 data-tipo_servidor="${u.tipo_servidor || ""}"`,
                                u.user_id, "usuario"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            });
        }

        async function excluirUsuario(id) {
            if (!confirm("Excluir este usuário?")) return;
            try {
                const r = await fetch(`${apiUrl}/usuarios/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarUsuarios();
            } catch (e) { console.error("Erro ao excluir usuário:", e); }
        }

        renderizarUsuarios();

        btnAdicionar.addEventListener("click", function(e) {
            e.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar usuário";
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            frmUnidade.reset();
            document.querySelector(".senha").style.display = "block";
            toggleCamposRole(selectPermissao.value);
            preCarregarSelects();
            dialogPainel.showModal();
        });

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());

            // Limpar campo não usado conforme permissão
            if (ROLES_UNIDADE.includes(dados.permissao)) {
                delete dados.subunidade_id;
            } else {
                delete dados.unidade_id;
            }

            if (!dados.nome || !dados.siape || !dados.senha) {
                alert("Nome, SIAPE e senha são obrigatórios."); return;
            }

            try {
                const r = await fetch(`${apiUrl}/usuarios`, { method: "POST", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarUsuarios();
            } catch (e) { console.error("Erro ao cadastrar usuário:", e); }
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        listaUnidades.addEventListener("click", async function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) {
                const d = el.dataset;
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar usuário";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;

                frmUnidade.reset();
                await preCarregarSelects();

                document.querySelector("#user_id").value = d.user_id;
                document.querySelector("#nome").value    = d.nome;
                document.querySelector("#email").value   = d.email;
                document.querySelector("#siape").value   = d.siape;
                document.querySelector("#whatsapp").value = d.whatsapp;
                if (d.data_nascimento) {
                    document.querySelector("#data_nascimento").value = d.data_nascimento.split("T")[0];
                }
                document.querySelector("#tipo_servidor").value = d.tipo_servidor || "";

                // Permissão (select)
                document.querySelector("#permissao").value = d.permissao;
                toggleCamposRole(d.permissao);

                // Vinculo (subunidade ou unidade)
                selectSubunidade.value = d.subunidade_id || "";
                selectUnidade.value    = d.unidade_id    || "";

                // Senha opcional na edição
                document.querySelector(".senha").style.display = "block";

                dialogPainel.showModal();
            }
            if (el.classList.contains("excluir")) excluirUsuario(el.dataset.id);
        });

        btnAtualizar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());

            // Não enviar senha vazia
            if (!dados.senha) delete dados.senha;

            // Limpar campo não usado
            if (ROLES_UNIDADE.includes(dados.permissao)) {
                delete dados.subunidade_id;
            } else {
                delete dados.unidade_id;
            }

            try {
                const r = await fetch(`${apiUrl}/usuarios/${dados.user_id}`, { method: "PUT", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarUsuarios();
            } catch (e) { console.error("Erro ao atualizar usuário:", e); }
        });
    } // fim /adm/usuarios

    // =========================================================================
    // GESTÃO DE SALAS — /adm/salas
    // =========================================================================
    if (urlParam === "/adm/salas") {
        const btnAdicionar   = document.querySelector(".btn_adicionar");
        const frmUnidade     = document.querySelector(".frmUnidade");
        const btnCadastrar   = document.querySelector(".cadastrarUnidade");
        const btnAtualizar   = document.querySelector(".atualizarUnidade");
        const btnCancelar    = document.querySelector(".cancelarUnidade");
        const dialogPainel   = document.querySelector(".dialogPainel");
        const listaUnidades  = document.querySelector(".listaUnidades");
        const selectSubunidades = document.querySelector("#subunidade_id");
        const selectPredios     = document.querySelector("#predio_id");
        const selectSalasTipo   = document.querySelector("#sala_tipo_id");

        async function renderizarSalas() {
            try {
                const salas = await carregarSalasTotalInfo();
                listaUnidades.innerHTML = "";
                (salas || []).forEach(s => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${s.sala_nome}</div>
                        <div class="dado flex flex--2">${s.predio || "—"}</div>
                        <div class="dado flex flex--3">${s.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--2">${(s.sala_tipo_nome || "—").toUpperCase()}</div>
                        <div class="dado flex flex--1">${s.sala_capacidade ?? "—"}</div>
                        <div class="dado flex flex--4">${s.sala_descricao || ""}</div>
                        <div class="dado flex flex--2">${s.is_agendavel ? "Sim" : "Não"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-sala_id="${s.sala_id}"
                                 data-sala_nome="${s.sala_nome}"
                                 data-predio_id="${s.predio_id || ""}"
                                 data-subunidade_id="${s.subunidade_id || ""}"
                                 data-sala_descricao="${s.sala_descricao || ""}"
                                 data-sala_capacidade="${s.sala_capacidade ?? ""}"
                                 data-is_agendavel="${s.is_agendavel ? 1 : 0}"
                                 data-sala_tipo_id="${s.sala_tipo_id || ""}"
                                 data-presta_servicos_externos="${s.presta_servicos_externos ?? ""}"`,
                                s.sala_id, "sala"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar salas:", e); }
        }

        async function excluirSala(id) {
            if (!confirm("Excluir esta sala?")) return;
            try {
                const r = await fetch(`${apiUrl}/salas/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarSalas();
            } catch (e) { console.error("Erro ao excluir sala:", e); }
        }

        let tiposCache = [];

        async function preencherSelects(predioSel = "", subSel = "", tipoSel = "") {
            const [predios, subs, tipos] = await Promise.all([
                carregarPrediosTotalInfo(), carregarSubunidadesTotalInfo(), carregarSalasTipo()
            ]);
            tiposCache = tipos || [];
            popularSelect(selectPredios,    predios, p => p.predio_id,    p => p.predio,         "Selecione o prédio...");
            popularSelect(selectSubunidades, subs,   s => s.subunidade_id, s => s.subunidade_nome, "Selecione a subunidade...");
            popularSelect(selectSalasTipo,  tipos,   t => t.sala_tipo_id,  t => t.sala_tipo_nome.toUpperCase(), "Selecione o tipo...");
            if (predioSel) selectPredios.value    = predioSel;
            if (subSel)    selectSubunidades.value = subSel;
            if (tipoSel)   selectSalasTipo.value   = tipoSel;
        }

        // Tipo é laboratório? Detecta por substring no nome (ex: "Laboratório", "Lab. de Solos").
        // Se no futuro a tabela salas_tipo ganhar uma flag is_laboratorio, basta trocar aqui.
        function ehLaboratorio(salaTipoId) {
            if (!salaTipoId) return false;
            const tipo = tiposCache.find(t => String(t.sala_tipo_id) === String(salaTipoId));
            return !!(tipo && /lab/i.test(tipo.sala_tipo_nome || ""));
        }

        function atualizarRowServicosExternos(valorSelecionado) {
            const rowEl = document.getElementById("rowServicosExternos");
            if (!rowEl) return;
            const ehLab = ehLaboratorio(selectSalasTipo.value);
            // Não usa `hidden` porque a classe .flex sobrescreve com display:flex
            rowEl.style.display = ehLab ? "" : "none";
            if (ehLab) {
                // Marca o radio conforme o valor (default 0 = Não)
                const valor = valorSelecionado === "1" ? "1" : "0";
                document.querySelectorAll("input[name='presta_servicos_externos']").forEach(r => {
                    r.checked = r.value === valor;
                });
            }
        }

        selectSalasTipo.addEventListener("change", () => atualizarRowServicosExternos());

        renderizarSalas();

        btnAdicionar.addEventListener("click", async function(e) {
            e.preventDefault();
            if (!e.target.classList.contains("sala")) return;
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar sala";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            await preencherSelects();
            atualizarRowServicosExternos(); // garante row oculto até escolher tipo
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        // Garante que presta_servicos_externos só vai no payload quando o tipo for laboratório.
        // Para outros tipos, força string vazia → backend grava NULL.
        function normalizarDadosSala(dados) {
            const rowEl = document.getElementById("rowServicosExternos");
            if (rowEl && rowEl.style.display === "none") {
                dados.presta_servicos_externos = "";
            }
            return dados;
        }

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = normalizarDadosSala(Object.fromEntries(formData.entries()));
            if (!dados.sala_nome || !dados.predio_id) {
                alert("Identificação da sala e prédio são obrigatórios."); return;
            }
            try {
                const r = await fetch(`${apiUrl}/salas`, { method: "POST", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSalas();
            } catch (e) { console.error("Erro ao cadastrar sala:", e); }
        });

        btnAtualizar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = normalizarDadosSala(Object.fromEntries(formData.entries()));
            try {
                const r = await fetch(`${apiUrl}/salas/${dados.sala_id}`, { method: "PUT", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSalas();
            } catch (e) { console.error("Erro ao atualizar sala:", e); }
        });

        listaUnidades.addEventListener("click", async function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) {
                const d = el.dataset;
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar sala";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                frmUnidade.reset();
                await preencherSelects(d.predio_id, d.subunidade_id, d.sala_tipo_id);
                document.querySelector("#sala_id").value          = d.sala_id;
                document.querySelector("#sala_nome").value        = d.sala_nome;
                document.querySelector("#sala_descricao").value   = d.sala_descricao;
                document.querySelector("#sala_capacidade").value  = d.sala_capacidade || "";
                // Marcar radio is_agendavel
                document.querySelectorAll("input[name='is_agendavel']").forEach(radio => {
                    radio.checked = radio.value === d.is_agendavel;
                });
                // Mostra/esconde row de serviços externos e marca o valor armazenado
                atualizarRowServicosExternos(d.presta_servicos_externos);
                dialogPainel.showModal();
            }
            if (el.classList.contains("excluir")) excluirSala(el.dataset.id);
        });
    } // fim /adm/salas

    // =========================================================================
    // GESTÃO DE TIPOS DE SALA — /adm/salas-tipo
    // =========================================================================
    if (urlParam === "/adm/salas-tipo") {
        const btnAdicionar  = document.querySelector(".btn_adicionar");
        const frmUnidade    = document.querySelector(".frmUnidade");
        const btnCadastrar  = document.querySelector(".cadastrarUnidade");
        const btnAtualizar  = document.querySelector(".atualizarUnidade");
        const btnCancelar   = document.querySelector(".cancelarUnidade");
        const dialogPainel  = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");

        function renderizarSalasTipo() {
            carregarSalasTipo().then(tipos => {
                listaUnidades.innerHTML = "";
                (tipos || []).forEach(t => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${t.sala_tipo_id}</div>
                        <div class="dado flex flex--10">${t.sala_tipo_nome.toUpperCase()}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-sala_tipo_id="${t.sala_tipo_id}" data-sala_tipo_nome="${t.sala_tipo_nome}"`,
                                t.sala_tipo_id, "sala_tipo"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            });
        }

        async function excluirSalaTipo(id) {
            if (!confirm("Excluir este tipo de sala?")) return;
            try {
                const r = await fetch(`${apiUrl}/salas-tipo/${id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizarSalasTipo();
            } catch (e) { console.error("Erro ao excluir tipo de sala:", e); }
        }

        renderizarSalasTipo();

        btnAdicionar.addEventListener("click", function(e) {
            e.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar tipo de sala";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            try {
                const r = await fetch(`${apiUrl}/salas-tipo`, { method: "POST", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSalasTipo();
            } catch (e) { console.error("Erro ao cadastrar tipo de sala:", e); }
        });

        btnAtualizar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
            try {
                const r = await fetch(`${apiUrl}/salas-tipo/${dados.sala_tipo_id}`, { method: "PUT", body: JSON.stringify(dados) });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                frmUnidade.reset(); dialogPainel.close();
                renderizarSalasTipo();
            } catch (e) { console.error("Erro ao atualizar tipo de sala:", e); }
        });

        listaUnidades.addEventListener("click", function(e) {
            const el = e.target;
            if (el.classList.contains("editar")) {
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar tipo de sala";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                document.querySelector("#sala_tipo_id").value   = el.dataset.sala_tipo_id;
                document.querySelector("#sala_tipo_nome").value = el.dataset.sala_tipo_nome;
                dialogPainel.showModal();
            }
            if (el.classList.contains("excluir")) excluirSalaTipo(el.dataset.id);
        });
    } // fim /adm/salas-tipo

    // ── /adm/api-keys ──────────────────────────────────────────────────────
    if (urlParam === "/adm/api-keys") {
        const listaApiKeys      = document.querySelector(".listaApiKeys");
        const dialogGerar       = document.querySelector(".dialogPainel.apiKeys");
        const dialogKeyGerada   = document.querySelector(".dialogPainel.apiKeyGerada");
        const legendApiKeyGerada= document.getElementById("legendApiKeyGerada");
        const apiKeyValor       = document.getElementById("apiKeyValor");
        const apiKeySubunidade  = document.getElementById("apiKeySubunidade");
        const apiKeyDescricao   = document.getElementById("apiKeyDescricao");

        async function carregarSubunidades() {
            const r = await fetch(`${apiUrl}/subunidades`);
            const d = await r.json();
            if (d.status === "success") {
                apiKeySubunidade.innerHTML = '<option value="">Selecione a subunidade...</option>'
                    + d.data.map(s =>
                        `<option value="${s.subunidade_id}">${s.subunidade_nome}${s.subunidade_sigla ? " (" + s.subunidade_sigla + ")" : ""}</option>`
                    ).join("");
            }
        }

        function badgeAtivo(ativo) {
            return ativo
                ? '<span style="color:#009536;font-weight:bold">Ativa</span>'
                : '<span style="color:red;font-weight:bold">Inativa</span>';
        }

        async function renderizarApiKeys() {
            const r = await fetch(`${apiUrl}/api-keys`);
            const d = await r.json();
            listaApiKeys.innerHTML = "";
            if (!d.data || d.data.length === 0) {
                listaApiKeys.innerHTML = '<p style="padding:15px">Nenhuma API Key cadastrada.</p>';
                return;
            }
            d.data.forEach(k => {
                const div = document.createElement("div");
                div.classList.add("dados", "flex", "align--items--center");
                div.innerHTML = `
                    <div class="dado flex flex--4">${k.subunidade_nome}</div>
                    <div class="dado flex flex--2">${k.subunidade_sigla || "—"}</div>
                    <div class="dado flex flex--5">${k.descricao || "—"}</div>
                    <div class="dado flex flex--4" style="font-family:monospace;font-size:11px">${k.api_key_preview}</div>
                    <div class="dado flex flex--2">${badgeAtivo(k.is_active)}</div>
                    <div class="dado flex flex--2" style="font-size:11px">${k.created_at ? new Date(k.created_at).toLocaleDateString("pt-BR") : "—"}</div>
                    <div class="dado flex flex--2 gap--10 font--size--20">
                        <i class="bi bi-arrow-repeat cursor--pointer regenerar-key" title="Regenerar chave"
                           data-id="${k.id}" data-sub="${k.subunidade_nome}"></i>
                        <i class="bi ${k.is_active ? "bi-toggle-on" : "bi-toggle-off"} cursor--pointer toggle-key"
                           title="${k.is_active ? "Desativar" : "Ativar"}"
                           data-id="${k.id}" data-ativo="${k.is_active}"></i>
                        <i class="bi bi-trash excluir cursor--pointer excluir-key" title="Excluir chave"
                           data-id="${k.id}" data-sub="${k.subunidade_nome}"></i>
                    </div>
                `;
                listaApiKeys.appendChild(div);
            });
        }

        function exibirKeyGerada(chaveCompleta, titulo) {
            legendApiKeyGerada.textContent = titulo || "Chave gerada";
            apiKeyValor.textContent = chaveCompleta;
            dialogKeyGerada.showModal();
        }

        document.querySelector(".btnNovaApiKey").addEventListener("click", () => {
            carregarSubunidades();
            apiKeyDescricao.value = "";
            dialogGerar.showModal();
        });

        document.querySelector(".cadastrarApiKey").addEventListener("click", async () => {
            const subId = apiKeySubunidade.value;
            if (!subId) { alert("Selecione uma subunidade."); return; }
            const r = await fetch(`${apiUrl}/api-keys`, {
                method: "POST",
                body: JSON.stringify({
                    subunidade_id: parseInt(subId),
                    descricao: apiKeyDescricao.value.trim() || null
                })
            });
            const d = await r.json();
            if (d.status === "success") {
                dialogGerar.close();
                exibirKeyGerada(d.data.api_key_full, "Chave gerada — copie agora!");
                renderizarApiKeys();
            } else {
                alert(d.message || "Erro ao gerar chave.");
            }
        });

        document.querySelectorAll(".cancelarApiKey").forEach(btn => {
            btn.addEventListener("click", () => { dialogGerar.close(); dialogKeyGerada.close(); });
        });

        document.querySelector(".btnCopiarKey").addEventListener("click", () => {
            navigator.clipboard.writeText(apiKeyValor.textContent)
                .then(() => alert("Chave copiada para a área de transferência."));
        });

        document.querySelector(".btnFecharKeyGerada").addEventListener("click", () => {
            dialogKeyGerada.close();
        });

        listaApiKeys.addEventListener("click", async (e) => {
            const iconRegen = e.target.closest(".regenerar-key");
            if (iconRegen) {
                const { id, sub } = iconRegen.dataset;
                if (!confirm(`Regenerar a chave de "${sub}"?\nA chave anterior será invalidada imediatamente.`)) return;
                const r = await fetch(`${apiUrl}/api-keys/${id}/regenerar`, { method: "PATCH" });
                const d = await r.json();
                if (d.status === "success") { exibirKeyGerada(d.data.api_key_full, "Nova chave — copie agora!"); renderizarApiKeys(); }
                else { alert(d.message || "Erro ao regenerar."); }
                return;
            }
            const iconToggle = e.target.closest(".toggle-key");
            if (iconToggle) {
                const novoEstado = iconToggle.dataset.ativo === "true" ? false : true;
                const r = await fetch(`${apiUrl}/api-keys/${iconToggle.dataset.id}/ativar`, {
                    method: "PATCH",
                    body: JSON.stringify({ is_active: novoEstado })
                });
                const d = await r.json();
                if (d.status === "success") { renderizarApiKeys(); }
                else { alert(d.message || "Erro ao alterar status."); }
                return;
            }
            const iconExcluir = e.target.closest(".excluir-key");
            if (iconExcluir) {
                if (!confirm(`Excluir permanentemente a chave de "${iconExcluir.dataset.sub}"?`)) return;
                const r = await fetch(`${apiUrl}/api-keys/${iconExcluir.dataset.id}`, { method: "DELETE" });
                const d = await r.json();
                if (d.status === "success") { renderizarApiKeys(); }
                else { alert(d.message || "Erro ao excluir."); }
            }
        });

        renderizarApiKeys();
    } // fim /adm/api-keys

    // =========================================================================
    // PERÍODOS LETIVOS — /adm/periodos-letivos
    // =========================================================================
    if (urlParam === "/adm/periodos-letivos") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade   = document.querySelector(".frmUnidade");
        const btnCadastrar = document.querySelector(".cadastrarUnidade");
        const btnAtualizar = document.querySelector(".atualizarUnidade");
        const btnCancelar  = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");

        function formatarData(valor) {
            if (!valor) return "—";
            const partes = String(valor).substring(0, 10).split("-");
            return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
        }

        async function renderizar() {
            try {
                const r = await fetch(`${apiUrl}/periodos-letivos`);
                const periodos = (await r.json()).data || [];
                listaUnidades.innerHTML = "";
                periodos.forEach(p => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--3">${p.nome}</div>
                        <div class="dado flex flex--3">${formatarData(p.data_inicio)}</div>
                        <div class="dado flex flex--3">${formatarData(p.data_fim)}</div>
                        <div class="dado flex flex--2">${p.ativo ? '<span class="badge badge--atendido">Ativo</span>' : "—"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-id_periodo="${p.id_periodo}"
                                 data-nome="${p.nome}"
                                 data-data_inicio="${(p.data_inicio || "").substring(0,10)}"
                                 data-data_fim="${(p.data_fim || "").substring(0,10)}"
                                 data-ativo="${p.ativo ? 1 : 0}"`,
                                p.id_periodo, "periodo"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar períodos:", e); }
        }

        function coletarDados() {
            return {
                nome: document.querySelector("#nome").value.trim(),
                data_inicio: document.querySelector("#data_inicio").value,
                data_fim: document.querySelector("#data_fim").value,
                ativo: document.querySelector("#ativo").checked,
            };
        }

        renderizar();

        btnAdicionar.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar período letivo";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", (e) => { e.preventDefault(); frmUnidade.reset(); dialogPainel.close(); });

        btnCadastrar.addEventListener("click", async (e) => {
            e.preventDefault();
            const r = await fetch(`${apiUrl}/periodos-letivos`, { method: "POST", body: JSON.stringify(coletarDados()) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmUnidade.reset(); dialogPainel.close(); renderizar();
        });

        btnAtualizar.addEventListener("click", async (e) => {
            e.preventDefault();
            const id = document.querySelector("#id_periodo").value;
            const r = await fetch(`${apiUrl}/periodos-letivos/${id}`, { method: "PUT", body: JSON.stringify(coletarDados()) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmUnidade.reset(); dialogPainel.close(); renderizar();
        });

        listaUnidades.addEventListener("click", async (e) => {
            const editar = e.target.closest(".editar");
            if (editar) {
                const d = editar.dataset;
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar período letivo";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                frmUnidade.reset();
                document.querySelector("#id_periodo").value = d.id_periodo;
                document.querySelector("#nome").value = d.nome;
                document.querySelector("#data_inicio").value = d.data_inicio;
                document.querySelector("#data_fim").value = d.data_fim;
                document.querySelector("#ativo").checked = d.ativo === "1";
                dialogPainel.showModal();
                return;
            }
            const excluir = e.target.closest(".excluir");
            if (excluir) {
                if (!confirm("Excluir este período letivo?")) return;
                const r = await fetch(`${apiUrl}/periodos-letivos/${excluir.dataset.id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizar();
            }
        });
    } // fim /adm/periodos-letivos

    // =========================================================================
    // DISCIPLINAS — /adm/disciplinas
    // =========================================================================
    if (urlParam === "/adm/disciplinas") {
        const btnAdicionar = document.querySelector(".btn_adicionar");
        const frmUnidade   = document.querySelector(".frmUnidade");
        const btnCadastrar = document.querySelector(".cadastrarUnidade");
        const btnAtualizar = document.querySelector(".atualizarUnidade");
        const btnCancelar  = document.querySelector(".cancelarUnidade");
        const dialogPainel = document.querySelector(".dialogPainel");
        const listaUnidades = document.querySelector(".listaUnidades");
        const selectSub      = document.querySelector("#subunidade_id");
        const selectProf     = document.querySelector("#professores");

        async function carregarProfessoresDisponiveis() {
            try {
                const r = await fetch(`${apiUrl}/disciplinas/professores-disponiveis`);
                return (await r.json()).data || [];
            } catch (e) { console.error("Erro ao carregar professores:", e); return []; }
        }

        async function preencherSelects(subSel = "", profsSel = []) {
            const [subs, profs] = await Promise.all([
                carregarSubunidadesTotalInfo(), carregarProfessoresDisponiveis()
            ]);
            popularSelect(selectSub, subs, s => s.subunidade_id, s => s.subunidade_nome, "Selecione o departamento...");
            selectProf.innerHTML = "";
            profs.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.user_id;
                opt.textContent = p.siape ? `${p.nome} (${p.siape})` : p.nome;
                if (profsSel.map(String).includes(String(p.user_id))) opt.selected = true;
                selectProf.appendChild(opt);
            });
            if (subSel) selectSub.value = subSel;
        }

        function coletarProfessores() {
            return Array.from(selectProf.selectedOptions).map(o => parseInt(o.value, 10));
        }

        function coletarDados() {
            return {
                codigo: document.querySelector("#codigo").value.trim(),
                nome: document.querySelector("#nome").value.trim(),
                carga_horaria: document.querySelector("#carga_horaria").value,
                subunidade_id: selectSub.value || null,
                professores: coletarProfessores(),
            };
        }

        async function renderizar() {
            try {
                const r = await fetch(`${apiUrl}/disciplinas`);
                const disciplinas = (await r.json()).data || [];
                listaUnidades.innerHTML = "";
                disciplinas.forEach(d => {
                    const profsNomes = (d.professores || []).map(p => p.nome.split(" ")[0]).join(", ") || "—";
                    const profsIds = (d.professores || []).map(p => p.user_id).join(",");
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--2">${d.codigo || "—"}</div>
                        <div class="dado flex flex--4">${d.nome}</div>
                        <div class="dado flex flex--2">${d.carga_horaria ?? "—"}</div>
                        <div class="dado flex flex--3">${d.subunidade_sigla || d.subunidade_nome || "—"}</div>
                        <div class="dado flex flex--4" title="${(d.professores||[]).map(p=>p.nome).join(', ')}">${profsNomes}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-id_disciplina="${d.id_disciplina}"
                                 data-codigo="${d.codigo || ""}"
                                 data-nome="${d.nome}"
                                 data-carga_horaria="${d.carga_horaria ?? ""}"
                                 data-subunidade_id="${d.subunidade_id || ""}"
                                 data-professores="${profsIds}"`,
                                d.id_disciplina, "disciplina"
                            )}
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar disciplinas:", e); }
        }

        renderizar();

        btnAdicionar.addEventListener("click", async (e) => {
            e.preventDefault();
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar disciplina";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            await preencherSelects();
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", (e) => { e.preventDefault(); frmUnidade.reset(); dialogPainel.close(); });

        btnCadastrar.addEventListener("click", async (e) => {
            e.preventDefault();
            const dados = coletarDados();
            if (!dados.nome) { alert("O nome da disciplina é obrigatório."); return; }
            const r = await fetch(`${apiUrl}/disciplinas`, { method: "POST", body: JSON.stringify(dados) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmUnidade.reset(); dialogPainel.close(); renderizar();
        });

        btnAtualizar.addEventListener("click", async (e) => {
            e.preventDefault();
            const id = document.querySelector("#id_disciplina").value;
            const dados = coletarDados();
            if (!dados.nome) { alert("O nome da disciplina é obrigatório."); return; }
            const r = await fetch(`${apiUrl}/disciplinas/${id}`, { method: "PUT", body: JSON.stringify(dados) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmUnidade.reset(); dialogPainel.close(); renderizar();
        });

        listaUnidades.addEventListener("click", async (e) => {
            const editar = e.target.closest(".editar");
            if (editar) {
                const d = editar.dataset;
                document.querySelector(".dialogPainel fieldset legend").textContent = "Editar disciplina";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                frmUnidade.reset();
                const profsSel = d.professores ? d.professores.split(",").filter(Boolean) : [];
                await preencherSelects(d.subunidade_id, profsSel);
                document.querySelector("#id_disciplina").value = d.id_disciplina;
                document.querySelector("#codigo").value = d.codigo;
                document.querySelector("#nome").value = d.nome;
                document.querySelector("#carga_horaria").value = d.carga_horaria;
                dialogPainel.showModal();
                return;
            }
            const excluir = e.target.closest(".excluir");
            if (excluir) {
                if (!confirm("Excluir esta disciplina?")) return;
                const r = await fetch(`${apiUrl}/disciplinas/${excluir.dataset.id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizar();
            }
        });
    } // fim /adm/disciplinas

    // =========================================================================
    // TURMAS E ALOCAÇÃO — /adm/turmas
    // =========================================================================
    if (urlParam === "/adm/turmas") {
        const filtroPeriodo = document.querySelector("#filtroPeriodo");
        const filtroCurso   = document.querySelector("#filtroCurso");
        const incluirPos    = document.querySelector("#incluirPos");
        const cursoNivelBox = document.querySelector("#cursoNivelBox");
        const btnAdicionar  = document.querySelector(".btn_adicionar");
        const listaUnidades = document.querySelector(".listaUnidades");

        const dialogTurma   = document.querySelector("#dialogTurma");
        const frmTurma      = dialogTurma.querySelector(".frmUnidade");
        const btnCadastrar  = dialogTurma.querySelector(".cadastrarUnidade");
        const btnAtualizar  = dialogTurma.querySelector(".atualizarUnidade");
        const btnCancelar   = dialogTurma.querySelector(".cancelarUnidade");
        const selDisciplina = document.querySelector("#disciplina_id");
        const selPeriodo    = document.querySelector("#periodo_letivo_id");
        const selProfessor  = document.querySelector("#professor_user_id");

        const dialogHorarios = document.querySelector("#dialogHorarios");
        const listaHorarios  = document.querySelector("#listaHorarios");
        const selSala        = document.querySelector("#h_sala");
        const btnAddHorario  = document.querySelector("#btnAddHorario");
        const btnFecharHorarios = document.querySelector("#btnFecharHorarios");
        const horarioFeedback   = document.querySelector("#horarioFeedback");
        const tituloAddHorario  = document.querySelector("#tituloAddHorario");
        const btnCancelarEdicaoHorario = document.querySelector("#btnCancelarEdicaoHorario");

        let editandoHorarioId = null; // null = modo adicionar; id = editando aquele horário

        const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

        let disciplinasCache = [];
        let periodosCache = [];
        let salasCache = [];
        let cursosCache = [];

        // Recarrega o dropdown de cursos conforme o checkbox de pós, preservando a seleção
        async function carregarCursos() {
            const q = incluirPos.checked ? "?incluir_pos=1" : "";
            const anterior = filtroCurso.value;
            cursosCache = ((await (await fetch(`${apiUrl}/cursos${q}`)).json()).data) || [];
            filtroCurso.innerHTML = '<option value="">Todos os cursos</option>' +
                cursosCache.map(c => `<option value="${c.id_curso}">${c.nome}${c.nivel === "pos_graduacao" ? " (pós)" : ""} (${c.total_turmas})</option>`).join("");
            // Se o curso selecionado sumiu (ex.: pós desmarcado), volta a "todos"
            filtroCurso.value = cursosCache.some(c => String(c.id_curso) === anterior) ? anterior : "";
            atualizarNivelBox();
        }

        // Mostra o nível do curso selecionado + botão de ajuste manual (PATCH)
        function atualizarNivelBox() {
            const c = cursosCache.find(x => String(x.id_curso) === filtroCurso.value);
            if (!c) { cursoNivelBox.innerHTML = ""; return; }
            const ehPos = c.nivel === "pos_graduacao";
            cursoNivelBox.innerHTML = `
                <span class="badge ${ehPos ? "badge--info" : "badge--atendido"}">${ehPos ? "Pós-graduação" : "Graduação"}</span>
                <button type="button" id="btnToggleNivel" class="btnPainelFormulario" style="height:30px;padding:2px 10px;font-size:12px"
                        data-id="${c.id_curso}" data-novo="${ehPos ? "graduacao" : "pos_graduacao"}">
                    ${ehPos ? "Marcar como graduação" : "Marcar como pós"}
                </button>`;
        }

        async function carregarBases() {
            const [rd, rp, rs] = await Promise.all([
                fetch(`${apiUrl}/disciplinas`).then(r => r.json()),
                fetch(`${apiUrl}/periodos-letivos`).then(r => r.json()),
                fetch(`${apiUrl}/agendamentos/salas/agendaveis`).then(r => r.json()),
            ]);
            disciplinasCache = rd.data || [];
            periodosCache = rp.data || [];
            salasCache = rs.data || [];

            // Filtro de período no topo (+ opção "todos")
            filtroPeriodo.innerHTML = '<option value="">Todos os períodos</option>' +
                periodosCache.map(p => `<option value="${p.id_periodo}" ${p.ativo ? "selected" : ""}>${p.nome}${p.ativo ? " (ativo)" : ""}</option>`).join("");

            await carregarCursos();

            // Selects do dialog de turma
            selDisciplina.innerHTML = '<option value="">Selecione a disciplina...</option>' +
                disciplinasCache.map(d => `<option value="${d.id_disciplina}">${d.codigo ? d.codigo + " - " : ""}${d.nome}</option>`).join("");
            selPeriodo.innerHTML = '<option value="">Selecione o período...</option>' +
                periodosCache.map(p => `<option value="${p.id_periodo}">${p.nome}</option>`).join("");

            // Select de sala no dialog de horários
            selSala.innerHTML = '<option value="">Selecione a sala...</option>' +
                salasCache.map(s => `<option value="${s.sala_id}">${s.sala_nome}${s.predio_nome ? " — " + s.predio_nome : ""}</option>`).join("");
        }

        // Popula professores conforme a disciplina escolhida (apenas os vinculados)
        function atualizarProfessores(disciplinaId, professorSel = "") {
            const disc = disciplinasCache.find(d => String(d.id_disciplina) === String(disciplinaId));
            const profs = (disc && disc.professores) || [];
            selProfessor.innerHTML = '<option value="">— Sem professor definido —</option>' +
                profs.map(p => `<option value="${p.user_id}">${p.nome}</option>`).join("");
            if (professorSel) selProfessor.value = professorSel;
        }

        selDisciplina.addEventListener("change", () => atualizarProfessores(selDisciplina.value));

        async function renderizar() {
            const params = new URLSearchParams();
            if (filtroPeriodo.value) params.set("periodo_letivo_id", filtroPeriodo.value);
            if (filtroCurso.value)   params.set("curso_id", filtroCurso.value);
            if (incluirPos.checked)  params.set("incluir_pos", "1");
            const q = params.toString() ? `?${params.toString()}` : "";
            try {
                const turmas = (await (await fetch(`${apiUrl}/turmas${q}`)).json()).data || [];
                listaUnidades.innerHTML = "";
                if (turmas.length === 0) {
                    listaUnidades.innerHTML = '<p class="pedido-lista-vazia" style="padding:15px">Nenhuma turma para este filtro.</p>';
                    return;
                }
                turmas.forEach(t => {
                    // total_horarios = horários da grade; horarios_com_sala = já ensalados
                    const comSala = t.horarios_com_sala ?? 0;
                    const total   = t.total_horarios ?? 0;
                    let badgeClasse, badgeTexto;
                    if (total === 0)            { badgeClasse = "badge--pendente"; badgeTexto = "0"; }
                    else if (comSala === 0)     { badgeClasse = "badge--pendente"; badgeTexto = `0/${total}`; }
                    else if (comSala < total)   { badgeClasse = "badge--parcial";  badgeTexto = `${comSala}/${total}`; }
                    else                        { badgeClasse = "badge--atendido"; badgeTexto = `${comSala}/${total}`; }
                    const nProfs = t.total_professores ?? (t.professor_nome ? 1 : 0);
                    const profLabel = t.professor_nome
                        ? t.professor_nome.split(" ").slice(0,2).join(" ") + (nProfs > 1 ? ` +${nProfs - 1}` : "")
                        : (nProfs > 0 ? `${nProfs} professor(es)` : "—");
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--4">${t.disciplina_codigo ? t.disciplina_codigo + " - " : ""}${t.disciplina_nome}</div>
                        <div class="dado flex flex--2">${t.nome_turma}</div>
                        <div class="dado flex flex--3">${t.curso_nome || "—"}</div>
                        <div class="dado flex flex--3">${profLabel}</div>
                        <div class="dado flex flex--2">${t.periodo_nome}</div>
                        <div class="dado flex flex--2">
                            <span class="badge ${badgeClasse}" title="Ensalados / total de horários">${badgeTexto}</span>
                        </div>
                        <div class="dado flex flex--2 gap--10 font--size--20">
                            <i class="bi bi-calendar-week gerenciar-horarios cursor--pointer" title="Horários e salas" data-id="${t.id_turma}" data-nome="${t.disciplina_nome} — ${t.nome_turma}"></i>
                            <i class="bi bi-pencil-square editar-turma cursor--pointer" title="Editar"
                               data-id_turma="${t.id_turma}" data-disciplina_id="${t.disciplina_id}"
                               data-periodo_letivo_id="${t.periodo_letivo_id}" data-nome_turma="${t.nome_turma}"
                               data-professor_user_id="${t.professor_user_id || ""}" data-vagas="${t.vagas ?? ""}"></i>
                            <i class="bi bi-trash excluir-turma cursor--pointer" title="Excluir" data-id="${t.id_turma}"></i>
                        </div>`;
                    listaUnidades.appendChild(div);
                });
            } catch (e) { console.error("Erro ao renderizar turmas:", e); }
        }

        filtroPeriodo.addEventListener("change", renderizar);
        filtroCurso.addEventListener("change", () => { atualizarNivelBox(); renderizar(); });
        incluirPos.addEventListener("change", async () => { await carregarCursos(); renderizar(); });

        // Ajuste manual do nível do curso (delegação: o botão é recriado a cada seleção)
        cursoNivelBox.addEventListener("click", async (e) => {
            const btn = e.target.closest("#btnToggleNivel");
            if (!btn) return;
            const r = await fetch(`${apiUrl}/cursos/${btn.dataset.id}`, {
                method: "PATCH", body: JSON.stringify({ nivel: btn.dataset.novo }),
            });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            await carregarCursos();
            renderizar();
        });

        // ── Criar/editar turma ──────────────────────────────────────────
        btnAdicionar.addEventListener("click", (e) => {
            e.preventDefault();
            dialogTurma.querySelector("legend").textContent = "Cadastrar turma";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmTurma.reset();
            atualizarProfessores("");
            if (filtroPeriodo.value) selPeriodo.value = filtroPeriodo.value;
            dialogTurma.showModal();
        });

        btnCancelar.addEventListener("click", (e) => { e.preventDefault(); frmTurma.reset(); dialogTurma.close(); });

        function coletarTurma() {
            return {
                disciplina_id: selDisciplina.value || null,
                periodo_letivo_id: selPeriodo.value || null,
                nome_turma: document.querySelector("#nome_turma").value.trim(),
                professor_user_id: selProfessor.value || null,
                vagas: document.querySelector("#vagas").value || null,
            };
        }

        btnCadastrar.addEventListener("click", async (e) => {
            e.preventDefault();
            const r = await fetch(`${apiUrl}/turmas`, { method: "POST", body: JSON.stringify(coletarTurma()) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmTurma.reset(); dialogTurma.close(); renderizar();
        });

        btnAtualizar.addEventListener("click", async (e) => {
            e.preventDefault();
            const id = document.querySelector("#id_turma").value;
            const r = await fetch(`${apiUrl}/turmas/${id}`, { method: "PUT", body: JSON.stringify(coletarTurma()) });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            frmTurma.reset(); dialogTurma.close(); renderizar();
        });

        // ── Gerenciar horários ──────────────────────────────────────────
        async function abrirHorarios(turmaId, titulo) {
            dialogHorarios.dataset.turmaId = turmaId;
            document.querySelector("#dialogHorariosLegend").textContent = `Horários — ${titulo}`;
            sairModoEdicao();
            await renderizarHorarios(turmaId);
            dialogHorarios.showModal();
        }

        const ROTULO_TIPO = {
            teorica: "Teórica", pratica: "Prática",
            teorica_ext: "Teórica (ext.)", pratica_ext: "Prática (ext.)",
        };
        // formatarData vive noutro escopo; helper local para as datas dos blocos modulares
        const fmtData = (v) => {
            if (!v) return "";
            const p = String(v).substring(0, 10).split("-");
            return p.length === 3 ? `${p[2]}/${p[1]}` : v;
        };

        async function renderizarHorarios(turmaId) {
            try {
                const turma = (await (await fetch(`${apiUrl}/turmas/${turmaId}`)).json()).data;
                const horarios = turma.horarios || [];
                const professores = turma.professores || [];

                // Bloco de co-docência (professores vinculados à turma + encargo)
                let profHtml = "";
                if (professores.length > 0) {
                    profHtml = `
                        <div class="pedido-secao-titulo" style="font-weight:600;margin:4px 0 6px">Professores (${professores.length})</div>
                        <div class="flex flex--column gap--5" style="margin-bottom:12px">
                            ${professores.map(p => `
                                <div class="flex justify--space--between" style="font-size:13px">
                                    <span>${p.nome}</span>
                                    <span style="color:#666">${(p.encargo !== null && p.encargo !== undefined) ? "encargo " + p.encargo : ""}</span>
                                </div>`).join("")}
                        </div>`;
                }

                let horHtml;
                if (horarios.length === 0) {
                    horHtml = '<p class="pedido-lista-vazia" style="padding:10px">Nenhum horário na grade.</p>';
                } else {
                    horHtml = horarios.map(h => {
                        const temSala = h.sala_id !== null && h.sala_id !== undefined;
                        const salaTxt = temSala
                            ? `${h.sala_nome}${h.predio_nome ? " (" + h.predio_nome + ")" : ""}`
                            : '<span style="color:#c76a00">— sem sala —</span>';
                        const tipo = h.tipo_aula ? `<span class="badge badge--info" title="Tipo de aula">${ROTULO_TIPO[h.tipo_aula] || h.tipo_aula}</span>` : "";
                        const modular = (h.data_inicio || h.data_fim)
                            ? `<span style="font-size:11px;color:#888" title="Bloco modular">${fmtData(h.data_inicio) || "?"}→${fmtData(h.data_fim) || "?"}</span>`
                            : "";
                        return `
                        <div class="horario-item">
                            <span class="dia">${NOMES_DIAS[h.dia_semana]}</span>
                            <span>${(h.hora_inicio || "").slice(0,5)}–${(h.hora_fim || "").slice(0,5)}</span>
                            ${tipo}
                            ${modular}
                            <span class="flex--1">${salaTxt}</span>
                            <i class="bi bi-pencil-square cursor--pointer editar-horario font--size--18" title="Editar"
                               data-id="${h.id_horario}" data-dia="${h.dia_semana}"
                               data-inicio="${(h.hora_inicio || '').slice(0,5)}" data-fim="${(h.hora_fim || '').slice(0,5)}"
                               data-sala="${temSala ? h.sala_id : ''}"></i>
                            <i class="bi bi-trash cursor--pointer remover-horario font--size--18" title="Remover" data-id="${h.id_horario}" style="color:#c92a2a"></i>
                        </div>`;
                    }).join("");
                }
                listaHorarios.innerHTML = profHtml + horHtml;
            } catch (e) { console.error("Erro ao listar horários:", e); }
        }

        function entrarModoEdicao(d) {
            editandoHorarioId = d.id;
            document.querySelector("#h_dia").value = d.dia;
            document.querySelector("#h_inicio").value = d.inicio;
            document.querySelector("#h_fim").value = d.fim;
            selSala.value = d.sala || "";
            tituloAddHorario.textContent = "Editar horário";
            btnAddHorario.textContent = "Salvar";
            btnCancelarEdicaoHorario.style.display = "inline-block";
            horarioFeedback.innerHTML = "";
        }

        function sairModoEdicao() {
            editandoHorarioId = null;
            tituloAddHorario.textContent = "Adicionar horário";
            btnAddHorario.textContent = "+ Alocar";
            btnCancelarEdicaoHorario.style.display = "none";
            horarioFeedback.innerHTML = "";
        }

        btnCancelarEdicaoHorario.addEventListener("click", sairModoEdicao);

        btnAddHorario.addEventListener("click", async () => {
            const turmaId = dialogHorarios.dataset.turmaId;
            horarioFeedback.innerHTML = "";
            const body = {
                dia_semana: document.querySelector("#h_dia").value,
                hora_inicio: document.querySelector("#h_inicio").value,
                hora_fim: document.querySelector("#h_fim").value,
                sala_id: selSala.value || null,
            };
            // Ao adicionar, sala é obrigatória; ao editar, sala vazia = desalocar
            if (!editandoHorarioId && !body.sala_id) {
                horarioFeedback.innerHTML = '<div class="horario-conflito">Selecione uma sala.</div>'; return;
            }

            const url = editandoHorarioId
                ? `${apiUrl}/turmas/${turmaId}/horarios/${editandoHorarioId}`
                : `${apiUrl}/turmas/${turmaId}/horarios`;
            const metodo = editandoHorarioId ? "PUT" : "POST";
            const r = await fetch(url, { method: metodo, body: JSON.stringify(body) });
            const resp = await r.json();
            if (r.status === 409 && resp.data) {
                const datas = (resp.data.conflitos || []).map(c => `${c.data} (${c.ocupada_por})`).join("<br>");
                horarioFeedback.innerHTML = `<div class="horario-conflito"><strong>${resp.message}</strong><br>${datas}${resp.data.total_conflitos > 10 ? "<br>..." : ""}</div>`;
                return;
            }
            if (!r.ok) { horarioFeedback.innerHTML = `<div class="horario-conflito">${resp.message}</div>`; return; }
            sairModoEdicao();
            await renderizarHorarios(turmaId);
            renderizar(); // atualiza contagem de horários na lista
        });

        listaHorarios.addEventListener("click", async (e) => {
            const edit = e.target.closest(".editar-horario");
            if (edit) { entrarModoEdicao(edit.dataset); return; }

            const rem = e.target.closest(".remover-horario");
            if (!rem) return;
            if (!confirm("Remover este horário? As aulas geradas serão desalocadas.")) return;
            const turmaId = dialogHorarios.dataset.turmaId;
            const r = await fetch(`${apiUrl}/turmas/${turmaId}/horarios/${rem.dataset.id}`, { method: "DELETE" });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
            if (editandoHorarioId === rem.dataset.id) sairModoEdicao();
            await renderizarHorarios(turmaId);
            renderizar();
        });

        btnFecharHorarios.addEventListener("click", () => dialogHorarios.close());

        // ── Delegação na lista de turmas ────────────────────────────────
        listaUnidades.addEventListener("click", async (e) => {
            const ger = e.target.closest(".gerenciar-horarios");
            if (ger) { abrirHorarios(ger.dataset.id, ger.dataset.nome); return; }

            const edit = e.target.closest(".editar-turma");
            if (edit) {
                const d = edit.dataset;
                dialogTurma.querySelector("legend").textContent = "Editar turma";
                btnCadastrar.style.display = "none"; btnCadastrar.disabled = true;
                btnAtualizar.style.display = "inline-block"; btnAtualizar.disabled = false;
                frmTurma.reset();
                document.querySelector("#id_turma").value = d.id_turma;
                selDisciplina.value = d.disciplina_id;
                selPeriodo.value = d.periodo_letivo_id;
                document.querySelector("#nome_turma").value = d.nome_turma;
                atualizarProfessores(d.disciplina_id, d.professor_user_id);
                document.querySelector("#vagas").value = d.vagas;
                dialogTurma.showModal();
                return;
            }

            const exc = e.target.closest(".excluir-turma");
            if (exc) {
                if (!confirm("Excluir esta turma? Todos os horários e aulas alocadas serão removidos.")) return;
                const r = await fetch(`${apiUrl}/turmas/${exc.dataset.id}`, { method: "DELETE" });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message); return; }
                renderizar();
            }
        });

        carregarBases().then(renderizar);
    } // fim /adm/turmas

    // =========================================================================
    // IMPORTAR SERVIDORES — /adm/importar-servidores
    // =========================================================================
    if (urlParam === "/adm/importar-servidores") {
        const inputArquivo = document.querySelector("#impArquivo");
        const dropTexto    = document.querySelector("#impDropTexto");
        const resultado    = document.querySelector("#impResultado");
        const corpo        = document.querySelector("#impCorpo");
        const alertaDeptos = document.querySelector("#impAlertaDeptos");
        const btnConfirmar = document.querySelector("#impConfirmar");
        const btnCancelar  = document.querySelector("#impCancelar");

        let linhasArquivo = [];

        function formatarValor(v) {
            if (v instanceof Date && !isNaN(v)) {
                const dd = String(v.getDate()).padStart(2, "0");
                const mm = String(v.getMonth() + 1).padStart(2, "0");
                return `${dd}/${mm}/${v.getFullYear()}`;
            }
            return v === null || v === undefined ? "" : String(v).trim();
        }

        function lerPlanilha(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const bruto = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
                    // Normaliza valores (datas → dd/mm/yyyy, resto → string)
                    linhasArquivo = bruto.map((linha) => {
                        const nova = {};
                        Object.keys(linha).forEach((k) => { nova[k.trim()] = formatarValor(linha[k]); });
                        return nova;
                    });
                    if (linhasArquivo.length === 0) { alert("A planilha está vazia."); return; }
                    enviarPreview();
                } catch (err) {
                    console.error("Erro ao ler planilha:", err);
                    alert("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.");
                }
            };
            reader.readAsArrayBuffer(file);
        }

        async function enviarPreview() {
            try {
                const r = await fetch(`${apiUrl}/importacao/servidores/preview`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro no preview."); return; }
                renderizarPreview(resp.data);
            } catch (err) {
                console.error("Erro no preview:", err);
                alert("Erro de comunicação ao processar o arquivo.");
            }
        }

        function renderizarPreview(data) {
            const { linhas, resumo } = data;
            document.querySelector("#impTotal").textContent = resumo.total;
            document.querySelector("#impNovos").textContent = resumo.novos;
            document.querySelector("#impAtualizar").textContent = resumo.atualizar;
            document.querySelector("#impErros").textContent = resumo.erros;

            if (resumo.departamentos_nao_encontrados.length > 0) {
                alertaDeptos.hidden = false;
                alertaDeptos.innerHTML =
                    `<strong>${resumo.departamentos_nao_encontrados.length} departamento(s) não encontrado(s)</strong> ` +
                    `nas subunidades cadastradas (serão importados sem departamento):<br>` +
                    resumo.departamentos_nao_encontrados.map(d => `• ${d}`).join("<br>");
            } else {
                alertaDeptos.hidden = true;
            }

            corpo.innerHTML = linhas.map((l) => `
                <tr class="imp-linha--${l.status}">
                    <td class="imp-status imp-status--${l.status}">${
                        l.status === "novo" ? "Novo" : l.status === "atualizar" ? "Atualizar" : "Erro"}</td>
                    <td>${l.siape || "—"}</td>
                    <td>${l.nome || "—"}</td>
                    <td>${l.nascimento || "—"}</td>
                    <td>${l.departamento || "—"}</td>
                    <td>${l.subunidade_nome || (l.departamento ? "<em style='color:#c92a2a'>não mapeado</em>" : "—")}</td>
                    <td>${l.cargo || "—"}</td>
                    <td>${l.tipo_servidor || "—"}</td>
                    <td>${l.erro || ""}</td>
                </tr>
            `).join("");

            resultado.hidden = false;
            btnConfirmar.disabled = (resumo.novos + resumo.atualizar) === 0;
        }

        inputArquivo.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            dropTexto.textContent = file.name;
            lerPlanilha(file);
        });

        btnConfirmar.addEventListener("click", async () => {
            if (linhasArquivo.length === 0) return;
            if (!confirm("Confirmar a importação dos servidores?")) return;
            btnConfirmar.disabled = true;
            try {
                const r = await fetch(`${apiUrl}/importacao/servidores`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro ao importar."); btnConfirmar.disabled = false; return; }
                alert(resp.message);
                // Reset
                resultado.hidden = true;
                linhasArquivo = [];
                inputArquivo.value = "";
                dropTexto.textContent = "Clique para escolher o arquivo (.xlsx ou .csv)";
            } catch (err) {
                console.error("Erro ao importar:", err);
                alert("Erro de comunicação ao gravar a importação.");
                btnConfirmar.disabled = false;
            }
        });

        btnCancelar.addEventListener("click", () => {
            resultado.hidden = true;
            linhasArquivo = [];
            inputArquivo.value = "";
            dropTexto.textContent = "Clique para escolher o arquivo (.xlsx ou .csv)";
        });
    } // fim /adm/importar-servidores

    // =========================================================================
    // IMPORTAR SUBUNIDADES — /adm/importar-subunidades
    // =========================================================================
    if (urlParam === "/adm/importar-subunidades") {
        const inputArquivo = document.querySelector("#impArquivo");
        const dropTexto    = document.querySelector("#impDropTexto");
        const resultado    = document.querySelector("#impResultado");
        const corpo        = document.querySelector("#impCorpo");
        const btnConfirmar = document.querySelector("#impConfirmar");
        const btnCancelar  = document.querySelector("#impCancelar");

        let linhasArquivo = [];

        function formatarValor(v) {
            if (v instanceof Date && !isNaN(v)) {
                const dd = String(v.getDate()).padStart(2, "0");
                const mm = String(v.getMonth() + 1).padStart(2, "0");
                return `${dd}/${mm}/${v.getFullYear()}`;
            }
            return v === null || v === undefined ? "" : String(v).trim();
        }

        function resetar(texto) {
            resultado.hidden = true;
            linhasArquivo = [];
            inputArquivo.value = "";
            dropTexto.textContent = texto || "Clique para escolher o arquivo (.xlsx ou .csv)";
        }

        inputArquivo.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            dropTexto.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array", cellDates: true });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const bruto = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
                    linhasArquivo = bruto.map((linha) => {
                        const nova = {};
                        Object.keys(linha).forEach((k) => { nova[k.trim()] = formatarValor(linha[k]); });
                        return nova;
                    });
                    if (linhasArquivo.length === 0) { alert("A planilha está vazia."); return; }
                    enviarPreview();
                } catch (err) {
                    console.error("Erro ao ler planilha:", err);
                    alert("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.");
                }
            };
            reader.readAsArrayBuffer(file);
        });

        async function enviarPreview() {
            try {
                const r = await fetch(`${apiUrl}/importacao/subunidades/preview`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro no preview."); return; }
                const { linhas, resumo } = resp.data;
                document.querySelector("#impTotal").textContent = resumo.total;
                document.querySelector("#impNovos").textContent = resumo.novos;
                document.querySelector("#impAtualizar").textContent = resumo.atualizar;
                document.querySelector("#impIgnoradas").textContent = resumo.ignoradas || 0;
                corpo.innerHTML = linhas.map((l) => `
                    <tr class="imp-linha--${l.status}">
                        <td class="imp-status imp-status--${l.status}">${l.status === "novo" ? "Novo" : "Já existe"}</td>
                        <td>${l.codigo || "—"}</td>
                        <td>${l.nome}</td>
                    </tr>`).join("");
                resultado.hidden = false;
                btnConfirmar.disabled = resumo.novos === 0 && resumo.atualizar === 0;
            } catch (err) {
                console.error("Erro no preview:", err);
                alert("Erro de comunicação ao processar o arquivo.");
            }
        }

        btnConfirmar.addEventListener("click", async () => {
            if (linhasArquivo.length === 0) return;
            if (!confirm("Confirmar a importação das subunidades?")) return;
            btnConfirmar.disabled = true;
            try {
                const r = await fetch(`${apiUrl}/importacao/subunidades`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro ao importar."); btnConfirmar.disabled = false; return; }
                alert(resp.message);
                resetar();
            } catch (err) {
                console.error("Erro ao importar:", err);
                alert("Erro de comunicação ao gravar a importação.");
                btnConfirmar.disabled = false;
            }
        });

        btnCancelar.addEventListener("click", () => resetar());
    } // fim /adm/importar-subunidades

    // =========================================================================
    // IMPORTAR DISCIPLINAS (grade) — /adm/importar-disciplinas
    // =========================================================================
    if (urlParam === "/adm/importar-disciplinas") {
        const inputArquivo = document.querySelector("#impArquivo");
        const dropTexto    = document.querySelector("#impDropTexto");
        const resultado    = document.querySelector("#impResultado");
        const corpo        = document.querySelector("#impCorpo");
        const alertaProf   = document.querySelector("#impAlertaProf");
        const btnConfirmar = document.querySelector("#impConfirmar");
        const btnCancelar  = document.querySelector("#impCancelar");

        let linhasArquivo = [];

        function formatarValor(v) {
            if (v instanceof Date && !isNaN(v)) {
                // Excel guarda hora pura como serial de tempo → SheetJS gera Date
                // no "ano zero" (< 1901). Nesse caso é HORA, não data.
                if (v.getFullYear() < 1901) {
                    const hh = String(v.getHours()).padStart(2, "0");
                    const mi = String(v.getMinutes()).padStart(2, "0");
                    const ss = String(v.getSeconds()).padStart(2, "0");
                    return `${hh}:${mi}:${ss}`;
                }
                const dd = String(v.getDate()).padStart(2, "0");
                const mm = String(v.getMonth() + 1).padStart(2, "0");
                return `${dd}/${mm}/${v.getFullYear()}`;
            }
            return v === null || v === undefined ? "" : String(v).trim();
        }

        function resetar(texto) {
            resultado.hidden = true;
            linhasArquivo = [];
            inputArquivo.value = "";
            dropTexto.textContent = texto || "Clique para escolher o arquivo (.xlsx ou .csv)";
        }

        inputArquivo.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            dropTexto.textContent = `${file.name} — processando…`;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array", cellDates: true });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    // Lê posicionalmente (array de arrays) para poder corrigir colunas
                    // deslocadas por vírgulas no nome da disciplina.
                    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true, blankrows: false });
                    if (aoa.length < 2) { alert("A planilha está vazia."); resetar(); return; }
                    const header = aoa[0].map((h) => String(h).trim());
                    const anoIdx = header.indexOf("ANO");
                    const periodoIdx = header.indexOf("PERIODO");
                    const nomeIdx = header.indexOf("NOME_DISCIPLINA");
                    // "1. Semestre" / "2. Semestre" — âncora inequívoca de posição
                    const ehPeriodo = (s) => /^\s*\d+\s*\.\s*semestre/i.test(String(s || ""));

                    linhasArquivo = [];
                    let reparadas = 0;
                    for (let i = 1; i < aoa.length; i++) {
                        let row = aoa[i].map(formatarValor);
                        // Reparo: nome com vírgula empurra as colunas. Usa PERIODO
                        // ("N. Semestre") como âncora: acha-o e reagrupa o nome.
                        if (periodoIdx >= 0 && nomeIdx >= 0 && !ehPeriodo(row[periodoIdx])) {
                            let j = -1;
                            for (let k = periodoIdx; k <= periodoIdx + 8 && k < row.length; k++) {
                                if (ehPeriodo(row[k])) { j = k; break; }
                            }
                            if (j > periodoIdx) {
                                const shift = j - periodoIdx;
                                const nome = row.slice(nomeIdx, nomeIdx + shift + 1).join(", ");
                                row = [...row.slice(0, nomeIdx), nome, ...row.slice(nomeIdx + shift + 1)];
                                reparadas++;
                            }
                        }
                        const obj = {};
                        header.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ""; });
                        // Se ainda ficou sem ano válido, guarda a linha crua p/ diagnóstico
                        if (anoIdx >= 0 && !/^\d{4}$/.test(String(obj.ANO || "").trim())) {
                            obj.__raw = row.map((c) => String(c === null || c === undefined ? "" : c)).join(" | ").slice(0, 320);
                        }
                        linhasArquivo.push(obj);
                    }
                    dropTexto.textContent = `${file.name} (${linhasArquivo.length} linhas${reparadas ? `, ${reparadas} realinhadas` : ""})`;
                    enviarPreview();
                } catch (err) {
                    console.error("Erro ao ler planilha:", err);
                    alert("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.");
                    resetar();
                }
            };
            reader.readAsArrayBuffer(file);
        });

        async function enviarPreview() {
            try {
                const r = await fetch(`${apiUrl}/importacao/disciplinas/preview`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro no preview."); return; }
                const { resumo, professores_a_criar, amostra, descartadas } = resp.data;
                document.querySelector("#impTurmas").textContent = resumo.turmas;
                document.querySelector("#impHorarios").textContent = resumo.horarios;
                document.querySelector("#impDisc").textContent = resumo.disciplinas;
                document.querySelector("#impCursos").textContent = resumo.cursos;
                document.querySelector("#impProfCriar").textContent = resumo.professores_a_criar;
                document.querySelector("#impIgnoradas").textContent = resumo.linhas_ignoradas;

                let alertaHtml = "";
                // "sem horário" é esperado (orientação/TCC/estágio/dissertação/EAD)
                if (resumo.linhas_ignoradas > 0) {
                    alertaHtml += `<div style="color:#555"><strong>${resumo.linhas_ignoradas} linha(s) sem horário</strong> ` +
                        `(orientação, TCC, estágio, dissertação, EAD) — não vão a sala, é esperado ignorá-las.</div>`;
                }
                if (resumo.desalinhadas > 0) {
                    alertaHtml += `<div style="color:#c92a2a;margin-top:6px"><strong>⚠ ${resumo.desalinhadas} linha(s) desalinhada(s)</strong> ` +
                        `(colunas fora de posição). Se estiver usando CSV, salve como <strong>.xlsx</strong> e reenvie.</div>`;
                }
                if (resumo.incompletas > 0) {
                    alertaHtml += `<div style="color:#e8590c;margin-top:6px"><strong>ℹ ${resumo.incompletas} linha(s) incompleta(s)</strong> ` +
                        `no arquivo de origem (preenchidas só até o nome da disciplina, sem turma/horário). ` +
                        `Não há o que importar delas — pode confirmar; se precisar, cadastre essas disciplinas manualmente.</div>`;
                }
                // Amostra do que foi descartado (p/ conferência)
                if (descartadas && descartadas.length > 0) {
                    alertaHtml += `<details style="margin-top:6px"><summary style="cursor:pointer">Ver exemplos de linhas descartadas (${descartadas.length})</summary>` +
                        descartadas.map(d => `<div style="font-size:11px;color:${d.motivo === 'sem_horario' ? '#999' : '#c92a2a'}">[${d.motivo}] ${d.cod_disciplina} ${d.nome_disciplina} — dia:"${d.dia}" hora:"${d.hora}" ano:"${d.ano}" curso:"${d.curso || ''}"${d.raw ? `<br><span style="color:#1971c2">RAW: ${d.raw}</span>` : ''}</div>`).join("") +
                        `</details>`;
                }
                if (professores_a_criar.length > 0) {
                    alertaHtml += `<div style="margin-top:6px"><strong>${resumo.professores_a_criar} professor(es) serão criados</strong> ` +
                        `(SIAPE não cadastrado; senha inicial = SIAPE):<br>` +
                        professores_a_criar.map(p => `• ${p.siape} — ${p.nome}`).join("<br>") +
                        (resumo.professores_a_criar > professores_a_criar.length ? "<br>…" : "") + `</div>`;
                }
                alertaProf.innerHTML = alertaHtml;
                alertaProf.hidden = alertaHtml === "";

                corpo.innerHTML = amostra.map((x) => `
                    <tr>
                        <td>${x.id_turma_externo}</td>
                        <td>${x.curso || "—"}</td>
                        <td>${x.disciplina || "—"}</td>
                        <td>${x.turma || "—"}</td>
                        <td>${x.horarios}</td>
                        <td>${x.professores}</td>
                    </tr>`).join("");

                resultado.hidden = false;
                btnConfirmar.disabled = resumo.turmas === 0;
            } catch (err) {
                console.error("Erro no preview:", err);
                alert("Erro de comunicação ao processar o arquivo.");
            }
        }

        btnConfirmar.addEventListener("click", async () => {
            if (linhasArquivo.length === 0) return;
            if (!confirm("Confirmar a importação da grade? Isso cria/atualiza cursos, disciplinas, turmas, horários e professores.")) return;
            btnConfirmar.disabled = true;
            const textoOrig = btnConfirmar.textContent;
            btnConfirmar.textContent = "Importando…";
            try {
                const r = await fetch(`${apiUrl}/importacao/disciplinas`, {
                    method: "POST", body: JSON.stringify({ linhas: linhasArquivo }),
                });
                const resp = await r.json();
                if (!r.ok) { alert(resp.message || "Erro ao importar."); btnConfirmar.disabled = false; btnConfirmar.textContent = textoOrig; return; }
                alert(resp.message);
                resetar();
                btnConfirmar.textContent = textoOrig;
            } catch (err) {
                console.error("Erro ao importar:", err);
                alert("Erro de comunicação ao gravar a grade.");
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = textoOrig;
            }
        });

        btnCancelar.addEventListener("click", () => resetar());
    } // fim /adm/importar-disciplinas

}); // fim DOMContentLoaded
