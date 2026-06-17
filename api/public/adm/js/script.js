// Patch global: injeta o token Bearer em todos os fetch da área admin
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
                                 data-permissao="${u.permissao || "servidor"}"`,
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

        const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

        let disciplinasCache = [];
        let periodosCache = [];
        let salasCache = [];

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
            const periodoId = filtroPeriodo.value;
            const q = periodoId ? `?periodo_letivo_id=${periodoId}` : "";
            try {
                const turmas = (await (await fetch(`${apiUrl}/turmas${q}`)).json()).data || [];
                listaUnidades.innerHTML = "";
                if (turmas.length === 0) {
                    listaUnidades.innerHTML = '<p class="pedido-lista-vazia" style="padding:15px">Nenhuma turma neste período.</p>';
                    return;
                }
                turmas.forEach(t => {
                    const div = document.createElement("div");
                    div.classList.add("dados", "flex", "align--items--center");
                    div.innerHTML = `
                        <div class="dado flex flex--4">${t.disciplina_codigo ? t.disciplina_codigo + " - " : ""}${t.disciplina_nome}</div>
                        <div class="dado flex flex--2">${t.nome_turma}</div>
                        <div class="dado flex flex--3">${t.professor_nome ? t.professor_nome.split(" ").slice(0,2).join(" ") : "—"}</div>
                        <div class="dado flex flex--2">${t.periodo_nome}</div>
                        <div class="dado flex flex--2">
                            <span class="badge ${t.total_horarios > 0 ? "badge--atendido" : "badge--pendente"}">${t.total_horarios}</span>
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
            horarioFeedback.innerHTML = "";
            await renderizarHorarios(turmaId);
            dialogHorarios.showModal();
        }

        async function renderizarHorarios(turmaId) {
            try {
                const turma = (await (await fetch(`${apiUrl}/turmas/${turmaId}`)).json()).data;
                const horarios = turma.horarios || [];
                if (horarios.length === 0) {
                    listaHorarios.innerHTML = '<p class="pedido-lista-vazia" style="padding:10px">Nenhum horário alocado ainda.</p>';
                    return;
                }
                listaHorarios.innerHTML = horarios.map(h => `
                    <div class="horario-item">
                        <span class="dia">${NOMES_DIAS[h.dia_semana]}</span>
                        <span>${(h.hora_inicio || "").slice(0,5)}–${(h.hora_fim || "").slice(0,5)}</span>
                        <span class="flex--1">${h.sala_nome}${h.predio_nome ? " (" + h.predio_nome + ")" : ""}</span>
                        <i class="bi bi-trash cursor--pointer remover-horario" title="Remover" data-id="${h.id_horario}" style="color:#c92a2a"></i>
                    </div>
                `).join("");
            } catch (e) { console.error("Erro ao listar horários:", e); }
        }

        btnAddHorario.addEventListener("click", async () => {
            const turmaId = dialogHorarios.dataset.turmaId;
            horarioFeedback.innerHTML = "";
            const body = {
                dia_semana: document.querySelector("#h_dia").value,
                hora_inicio: document.querySelector("#h_inicio").value,
                hora_fim: document.querySelector("#h_fim").value,
                sala_id: selSala.value || null,
            };
            if (!body.sala_id) { horarioFeedback.innerHTML = '<div class="horario-conflito">Selecione uma sala.</div>'; return; }

            const r = await fetch(`${apiUrl}/turmas/${turmaId}/horarios`, { method: "POST", body: JSON.stringify(body) });
            const resp = await r.json();
            if (r.status === 409 && resp.data) {
                const datas = (resp.data.conflitos || []).map(c => `${c.data} (${c.ocupada_por})`).join("<br>");
                horarioFeedback.innerHTML = `<div class="horario-conflito"><strong>${resp.message}</strong><br>${datas}${resp.data.total_conflitos > 10 ? "<br>..." : ""}</div>`;
                return;
            }
            if (!r.ok) { horarioFeedback.innerHTML = `<div class="horario-conflito">${resp.message}</div>`; return; }
            await renderizarHorarios(turmaId);
            renderizar(); // atualiza contagem de horários na lista
        });

        listaHorarios.addEventListener("click", async (e) => {
            const rem = e.target.closest(".remover-horario");
            if (!rem) return;
            if (!confirm("Remover este horário? As aulas geradas serão desalocadas.")) return;
            const turmaId = dialogHorarios.dataset.turmaId;
            const r = await fetch(`${apiUrl}/turmas/${turmaId}/horarios/${rem.dataset.id}`, { method: "DELETE" });
            const resp = await r.json();
            if (!r.ok) { alert(resp.message); return; }
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

}); // fim DOMContentLoaded
