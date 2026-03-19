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
    const apiUrl = "http://localhost:15000/api";
    const urlParam = window.location.pathname;

    // Exibir nome do admin no cabeçalho e configurar logout
    const siccr = JSON.parse(localStorage.getItem("siccr") || "null");
    const adminNomeEl = document.querySelector("#adminNome");
    const btnSair = document.querySelector("#btnSair");

    if (siccr && adminNomeEl) adminNomeEl.textContent = siccr.nome;

    if (btnSair) {
        btnSair.addEventListener("click", function(e) {
            e.preventDefault();
            localStorage.removeItem("siccr");
            localStorage.removeItem("siccr_token");
            localStorage.removeItem("permissao");
            window.location.replace("/adm/login");
        });
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
                        <div class="dado flex flex--4">${s.sala_descricao || ""}</div>
                        <div class="dado flex flex--2">${s.is_agendavel ? "Sim" : "Não"}</div>
                        <div class="dado flex flex--2 font--size--20">
                            ${iconeAcoes(
                                `data-sala_id="${s.sala_id}"
                                 data-sala_nome="${s.sala_nome}"
                                 data-predio_id="${s.predio_id || ""}"
                                 data-subunidade_id="${s.subunidade_id || ""}"
                                 data-sala_descricao="${s.sala_descricao || ""}"
                                 data-is_agendavel="${s.is_agendavel ? 1 : 0}"
                                 data-sala_tipo_id="${s.sala_tipo_id || ""}"`,
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

        async function preencherSelects(predioSel = "", subSel = "", tipoSel = "") {
            const [predios, subs, tipos] = await Promise.all([
                carregarPrediosTotalInfo(), carregarSubunidadesTotalInfo(), carregarSalasTipo()
            ]);
            popularSelect(selectPredios,    predios, p => p.predio_id,    p => p.predio,         "Selecione o prédio...");
            popularSelect(selectSubunidades, subs,   s => s.subunidade_id, s => s.subunidade_nome, "Selecione a subunidade...");
            popularSelect(selectSalasTipo,  tipos,   t => t.sala_tipo_id,  t => t.sala_tipo_nome.toUpperCase(), "Selecione o tipo...");
            if (predioSel) selectPredios.value    = predioSel;
            if (subSel)    selectSubunidades.value = subSel;
            if (tipoSel)   selectSalasTipo.value   = tipoSel;
        }

        renderizarSalas();

        btnAdicionar.addEventListener("click", async function(e) {
            e.preventDefault();
            if (!e.target.classList.contains("sala")) return;
            document.querySelector(".dialogPainel fieldset legend").textContent = "Cadastrar sala";
            btnAtualizar.style.display = "none"; btnAtualizar.disabled = true;
            btnCadastrar.style.display = "inline-block"; btnCadastrar.disabled = false;
            frmUnidade.reset();
            await preencherSelects();
            dialogPainel.showModal();
        });

        btnCancelar.addEventListener("click", function(e) {
            e.preventDefault(); frmUnidade.reset(); dialogPainel.close();
        });

        btnCadastrar.addEventListener("click", async function(e) {
            e.preventDefault();
            const formData = new FormData(frmUnidade);
            const dados = Object.fromEntries(formData.entries());
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
            const dados = Object.fromEntries(formData.entries());
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
                document.querySelector("#sala_id").value         = d.sala_id;
                document.querySelector("#sala_nome").value       = d.sala_nome;
                document.querySelector("#sala_descricao").value  = d.sala_descricao;
                // Marcar radio is_agendavel
                document.querySelectorAll("input[name='is_agendavel']").forEach(radio => {
                    radio.checked = radio.value === d.is_agendavel;
                });
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

}); // fim DOMContentLoaded
