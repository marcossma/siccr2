class MenuComponent extends HTMLElement {
    constructor() {
        super();

        //Criar o Shadow DOM
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        // Código do HTML e CSS no shadow DOM
        this.shadowRoot.innerHTML = `
            <style>
                nav {
                    background: #007bff;
                    padding: 10px;
                }

                nav ul {
                    list-style: none;
                    margin: 0px;
                    padding: 0px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                nav ul li {
                    color: white;
                    text-decoration: none;
                    font-weight: bold;
                    padding: 10px;
                    cursor: pointer;
                    transition: 0.3s;
                }

                nav ul li:hover {
                    background: silver;
                }

                nav ul li:hover .submenu {
                    // height: auto;
                    transiton: 0.3s;
                }

                .submenu {
                    height: 0px;
                }
            </style>
            
            <nav>
                <ul>
                    <li>Home</li>
                    <li>Sobre
                        <div class="submenu">
                            <p>Este é o submenu</p>
                        </div>
                    </li>
                    <li>Serviços</li>
                    <li>Contato</li>
                </ul>
            </nav>
        `;
    }
}

// Registrar o componente
customElements.define("menu-component", MenuComponent);