class ResponsiveMenu extends HTMLElement {
    connectedCallback() {
        const token  = localStorage.getItem("siccr_token");
        const siccr  = JSON.parse(localStorage.getItem("siccr") || "null");
        const perm   = siccr?.permissao || "";
        const isDC   = siccr?.is_direcao_centro === true;

        // Nível efetivo de acesso (espelha getNivelAcesso do backend)
        const nivel = (() => {
            if (perm === "super_admin")                              return 4;
            if (perm === "diretor" || perm === "vice_diretor" || isDC) return 3;
            if (perm === "chefe"   || perm === "subchefe")           return 2;
            if (perm)                                                return 1; // servidor
            return 0;
        })();

        // Monta os itens de menu por nível — só mostra para usuários logados
        const admDropdown = nivel >= 1 ? `
            <li class="nav-dropdown">
                <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                    Administrativo <span aria-hidden="true">⤵</span>
                </button>
                <ul class="nav-dropdown-menu">
                    <li><a href="/solicitar-agendamento">Solicitar agendamento</a></li>
                    ${nivel >= 2 ? `<li><a href="/solicitacoes-de-agendamento">Solicitações de agendamento</a></li>` : ""}
                    ${nivel >= 2 ? `<li><a href="/gerenciamento-de-usuarios">Gerenciamento de usuários</a></li>` : ""}
                    ${nivel >= 4 ? `<hr><li><a href="/adm/painel">Painel Admin</a></li>` : ""}
                </ul>
            </li>` : "";

        const finDropdown = nivel >= 2 ? `
            <li class="nav-dropdown">
                <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                    Financeiro <span aria-hidden="true">⤵</span>
                </button>
                <ul class="nav-dropdown-menu">
                    ${nivel >= 3 ? `
                    <li><a href="/tipos-recursos">Tipos de recursos</a></li>
                    <li><a href="/adicionar-recurso">Adicionar recurso</a></li>
                    <li><a href="/tipos-despesas">Tipos de despesas</a></li>
                    <li><a href="/registrar-despesa">Registrar despesa</a></li>
                    <hr>` : ""}
                    <li><a href="/pedido-almoxarifado">Pedido de almoxarifado</a></li>
                    <li><a href="/previsao-despesas">Previsão de despesas</a></li>
                    <li><a href="/relatorios">Relatórios</a></li>
                </ul>
            </li>` : "";

        this.innerHTML = `
            <nav class="nav-principal" ${!token ? 'hidden' : ''} aria-label="Menu principal">
                <button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu-lista" aria-label="Abrir/fechar menu">
                    &#9776;
                </button>
                <ul class="nav-menu" id="nav-menu-lista" role="list">
                    <li><a href="/">Início</a></li>
                    ${admDropdown}
                    ${finDropdown}
                    <li class="nav-dropdown">
                        <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                            Patrimônio <span aria-hidden="true">⤵</span>
                        </button>
                        <ul class="nav-dropdown-menu">
                            <li><a href="#">Equipe</a></li>
                            <li><a href="#">História</a></li>
                        </ul>
                    </li>
                    <li class="nav-dropdown">
                        <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                            Infraestrutura <span aria-hidden="true">⤵</span>
                        </button>
                        <ul class="nav-dropdown-menu">
                            <li><a href="#">Equipe</a></li>
                            <li><a href="#">História</a></li>
                        </ul>
                    </li>
                    <li class="nav-dropdown">
                        <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                            Transporte <span aria-hidden="true">⤵</span>
                        </button>
                        <ul class="nav-dropdown-menu">
                            <li><a href="#">Equipe</a></li>
                            <li><a href="#">História</a></li>
                        </ul>
                    </li>
                    <li><a href="/contato">Contato</a></li>
                    ${token ? `<li><button class="nav-btn-sair" id="nav-logout">Sair</button></li>` : ""}
                </ul>
            </nav>
        `;

        // ── Hamburger ──────────────────────────────────────────────────────────
        const toggle = this.querySelector(".nav-toggle");
        const menu   = this.querySelector(".nav-menu");

        toggle?.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            menu.classList.toggle("nav-menu--aberto");
        });

        // ── Dropdowns ──────────────────────────────────────────────────────────
        this.querySelectorAll(".nav-dropdown-toggle").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const item   = btn.closest(".nav-dropdown");
                const aberto = item.classList.contains("nav-dropdown--aberto");

                // Fecha todos os outros
                this.querySelectorAll(".nav-dropdown--aberto").forEach(d => {
                    d.classList.remove("nav-dropdown--aberto");
                    d.querySelector(".nav-dropdown-toggle")
                     .setAttribute("aria-expanded", "false");
                });

                if (!aberto) {
                    item.classList.add("nav-dropdown--aberto");
                    btn.setAttribute("aria-expanded", "true");
                }
            });
        });

        // Fecha dropdowns ao clicar fora
        document.addEventListener("click", (e) => {
            if (!this.contains(e.target)) {
                this.querySelectorAll(".nav-dropdown--aberto").forEach(d => {
                    d.classList.remove("nav-dropdown--aberto");
                    d.querySelector(".nav-dropdown-toggle")
                     .setAttribute("aria-expanded", "false");
                });
            }
        });

        // ── Logout ─────────────────────────────────────────────────────────────
        this.querySelector("#nav-logout")?.addEventListener("click", () => {
            localStorage.removeItem("siccr");
            localStorage.removeItem("siccr_token");
            localStorage.removeItem("permissao");
            window.location.href = "/";
        });
    }
}

customElements.define("responsive-menu", ResponsiveMenu);
