class MenuComponent extends HTMLElement {
    constructor() {
        super();

        //Criar o Shadow DOM
        this.attachShadow({ mode: "open" });

        // Código do HTML e CSS no shadow DOM
        this.shadowRoot.innerHTML = `
            <style>
                @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");
                
                * {
                    font-family: arial;
                    letter-spacing: 1px;
                    font-size: 14px;
                }
    
                nav {
                    text-align: center;
                }

                /* Estilo do menu nav */
                nav ul {
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                    background-color: #009536;
                }
    
                nav ul li {
                    display: inline-block;
                    position: relative;
                }

                i {
                    font-size: 16px;
                }
    
                nav ul li a {
                    color: white;
                    padding: 10px 20px;
                    display: block;
                    text-decoration: none;
                }
    
                /* Hover no menu principal */
                nav ul li a:hover {
                    background-color: #555;
                }
    
                /* Estilo do submenu (inicialmente oculto) */
                .dropdown-content {
                    display: none;
                    position: absolute;
                    background-color: #f9f9f9;
                    min-width: 160px;
                    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
                    z-index: 1;
                    top: 100%;
                    left: 0px;
                }
    
                /* Estilo dos links dentro do submenu */
                .dropdown-content li {
                    display: block;
                }
    
                .dropdown-content li a {
                    color: black;
                    padding: 12px 16px;
                    text-decoration: none;
                    display: block;
                }
    
                /* Hover nos links do submenu */
                .dropdown-content li a:hover {
                    background-color: #ddd;
                }
            </style>
            
            <nav>
                <ul>
                    <li><a href="/"><i class="bi bi-house"></i> Home</a></li>
    
                    <!-- Item de menu com submenu -->
                    <li class="dropdown">
                        <a href="#" class="dropdown-btn"><i class="bi bi-journals"></i> Administrativo <i class="bi bi-caret-down"></i></a>
                        <ul id="produtos-menu" class="dropdown-content">
                            <li><a href="https://siccr.guiadigitalsm.com.br/salas" target="_blank">Abrir Agendamento</a></li>
                            <li><a href="/solicitacoes-de-agendamento">Solicitações de agendamento</a></li>
                            <li><a href="/gerenciamento-de-usuarios">Gerenciamento de usuários</a></li>
                        </ul>
                    </li>
    
                    <!-- Menu Financeiro com submenu -->
                    <li class="dropdown">
                        <a href="#servicos" class="dropdown-btn"><i class="bi bi-cash-coin"></i> Financeiro <i class="bi bi-caret-down"></i></a>
                        <ul id="servicos-menu" class="dropdown-content">
                            <li><a href="#">Gerenciar Subunidades</a></li>
                            <li><a href="#">Tipos de Despesas</a></li>
                            <li><a href="#">Tipos de Recursos</a></li>
                            <li><a href="#">Previsão de Despesas</a></li>
                        </ul>
                    </li>
                    
                    <!-- Menu Patrimônio com submenu -->
                    <li class="dropdown">
                        <a href="#servicos" class="dropdown-btn"><i class="bi bi-ticket-detailed"></i> Patrimônio <i class="bi bi-caret-down"></i></a>
                        <ul id="servicos-menu" class="dropdown-content">
                            <li><a href="#">Listar patrimônios</a></li>
                        </ul>
                    </li>
                    
                    <!-- Menu Infraestutura com submenu -->
                    <li class="dropdown">
                        <a href="#servicos" class="dropdown-btn"><i class="bi bi-buildings"></i> Infraestrutura <i class="bi bi-caret-down"></i></a>
                        <ul id="servicos-menu" class="dropdown-content">
                            <li><a href="#">Listar Prédios</a></li>
                        </ul>
                    </li>
                    
                    <!-- Menu Transporte com submenu -->
                    <li class="dropdown">
                        <a href="#servicos" class="dropdown-btn"><i class="bi bi-truck-front"></i> Transporte <i class="bi bi-caret-down"></i></a>
                        <ul id="servicos-menu" class="dropdown-content">
                            <li><a href="#">Solicitações de viagens</a></li>
                            <li><a href="#">Agendar Viagem</a></li>
                        </ul>
                    </li>
    
                    <!-- Menu Contato com submenu -->
                    <li class="dropdown">
                        <a href="#" class="dropdown-btn"><i class="bi bi-telephone"></i> Contato</a>
                        <ul id="contato-menu" class="dropdown-content">
                            <li><a href="#">Secretaria do CCR</a></li>
                            <li><a href="#">SID</a></li>
                            <li><a href="#">SIG-AFA</a></li>
                            <li><a href="#">SIG-VAZ</a></li>
                            <li><a href="#">SIPG</a></li>
                            <li><a href="#">TI-CCR</a></li>
                        </ul>
                    </li>
                </ul>
            </nav>
        `;
    }

    connectedCallback() {

        // Seleciona os botões do menu
        const dropdownBtns = this.shadowRoot.querySelectorAll(".dropdown-btn");

        // Adiciona o evento de clique a cada botão de dropdown
        dropdownBtns.forEach(btn => {
            btn.addEventListener("click", (event) => this.toggleDropdown(event));
        });

        // Fecha o menu ao clicar fora
        // window.addEventListener("click", (event) => this.closeDropdowns(event));
        // this.shadowRoot.addEventListener("click", (event) => this.closeDropdowns(event));
        document.addEventListener("click", (event) => this.closeDropdowns(event));
    }

    toggleDropdown(event) {
        event.preventDefault();
        event.stopPropagation();

        // Alterna a visibilidade do submenu clicado
        const dropdownMenu = event.target.nextElementSibling;
        const isVisible = dropdownMenu.style.display === "block";
        
        // Fecha todos os submenus primeiro
        this.closeAllDropdowns();

        // Exibe o submenu clicado
        if (!isVisible) {
            dropdownMenu.style.display = "block";
        }
    }

    closeAllDropdowns() {
        // Fecha todos os submenus
        const dropdowns = this.shadowRoot.querySelectorAll(".dropdown-content");
        dropdowns.forEach(menu => {
            menu.style.display = "none";
        });
    }

    closeDropdowns(event) {
        if (!this.contains(event.target)) {
            this.closeAllDropdowns();
        }
    }
}

// Registrar o componente
customElements.define("menu-component", MenuComponent);