class MenuNavegacaoAdm extends HTMLElement {
    connectedCallback() {
        const pagina = window.location.pathname;

        const itens = [
            { href: "/adm/unidades",    icone: "bi-globe",         label: "Unidades" },
            { href: "/adm/subunidades", icone: "bi-globe-americas", label: "Subunidades" },
            { href: "/adm/usuarios",    icone: "bi-people",         label: "Usuários" },
            { href: "/adm/predios",     icone: "bi-buildings",      label: "Prédios" },
            { href: "/adm/salas",       icone: "bi-door-closed",    label: "Salas" },
            { href: "/adm/salas-tipo",  icone: "bi-bookmarks",      label: "Tipos de sala" },
            { href: "/adm/periodos-letivos", icone: "bi-calendar-range", label: "Períodos letivos" },
            { href: "/adm/disciplinas", icone: "bi-journal-bookmark", label: "Disciplinas" },
            { href: "/adm/turmas",      icone: "bi-people-fill",    label: "Turmas" },
            { href: "/adm/importar-servidores", icone: "bi-file-earmark-arrow-up", label: "Importar servidores" },
            { href: "/adm/importar-subunidades", icone: "bi-diagram-3", label: "Importar subunidades" },
            { href: "/adm/api-keys",    icone: "bi-key",            label: "API Keys" },
        ];

        this.innerHTML = `
            <nav class="nav-adm" aria-label="Navegação do painel administrativo">
                <ul role="list">
                    ${itens.map(item => {
                        const ativo = pagina === item.href;
                        return `
                        <li>
                            <a href="${item.href}"
                               class="${ativo ? "nav-adm--ativo" : ""}"
                               ${ativo ? 'aria-current="page"' : ""}>
                                <i class="bi ${item.icone}" aria-hidden="true"></i>
                                <span>${item.label}</span>
                            </a>
                        </li>`;
                    }).join("")}
                </ul>
            </nav>
        `;
    }
}

customElements.define("menu-navegacao-adm", MenuNavegacaoAdm);
