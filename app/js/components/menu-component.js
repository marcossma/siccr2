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
                * {
                    margin: 0px;
                    padding: 0px;
                    box-sizing: border-box;
                    font-family: verdana, sans serif;
                }

                nav {
                    background: none;
                    // padding: 10px;
                }

                nav ul {
                    list-style: none;
                    margin: 0px;
                    padding: 0px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                nav ul li {
                    border-radius: 5px;
                    // background: #009536;
                    border: 1px solid #009536;
                    color: #009536;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 12px;
                    padding: 5px;
                    cursor: pointer;
                    transition: 0.2s ease-in-out;
                }

                nav ul li:hover {
                    background: #009536;
                    color: white;
                }

                nav ul li p {
                    padding: 5px;
                    font-size: 10px;
                }

                nav ul li p:hover {
                    text-decoration: underline;
                }

                .submenu {
                    max-height: 0px;
                    overflow: hidden;
                    position: relative;
                    transition: 0.3s ease;
                }

                .submenu.open {
                    max-height: 200px;
                }
            </style>
            
            <nav>
                <ul>
                    <li>Home</li>
                    <li>Sobre
                        <div class="submenu">
                            <p>Este é o submenu</p>
                            <p>Este é o submenu</p>
                            <p>Este é o submenu</p>
                        </div>
                    </li>
                    <li>Serviços
                        <div class="submenu">
                            <p>Este é o submenu</p>
                            <p>Este é o submenu</p>
                            <p>Este é o submenu</p>
                        </div>
                    </li>
                    <li>Contato</li>
                </ul>
            </nav>
        `;

        const menuItems = this.shadowRoot.querySelectorAll("nav ul li");

        menuItems.forEach(menu => {
            menu.addEventListener("click", () => {
                // Esconcer os todos os submenus antes de abrir o menu atual
                this.shadowRoot.querySelectorAll(".submenu").forEach(submenu => {
                    submenu.classList.remove("open");
                });

                // // Alternar o submenu do item atual
                const submenu = menu.querySelector(".submenu");
                if (submenu) {
                    submenu.classList.toggle("open");
                }
            });
        });

    } // Fim connectedCallback()
}

// Registrar o componente
customElements.define("menu-component", MenuComponent);