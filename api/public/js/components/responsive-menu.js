class ResponsiveMenu extends HTMLElement {
    constructor() {
      super();
  
      // Anexa o Shadow DOM
      const shadow = this.attachShadow({ mode: 'open' });
  
      // Template HTML + CSS do componente
      shadow.innerHTML = `
        <style>
          /* Estilo da navbar */
          .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #333;
            color: white;
            padding: 10px 20px;
            position: relative;
          }
  
          /* .logo {
            font-size: 1.5rem;
            font-weight: bold;
          } */
  
          /* Estilo do menu principal */
          .menu {
            display: flex;
            gap: 20px;
            margin: 0;
            padding: 0;
          }
          .menu li {
            list-style: none;
            position: relative; /* Necessário para posicionar o dropdown */
          }
          .menu a {
            text-decoration: none;
            color: white;
            padding: 8px 12px;
          }
  
          /* Estilo do menu-toggle */
          .menu-toggle {
            font-size: 24px;
            color: white;
            cursor: pointer;
            display: none;
          }
  
          /* Estilo do dropdown */
          .dropdown-menu {
            display: none; /* Esconde por padrão */
            position: absolute;
            top: 100%;
            left: 0;
            background-color: #444;
            padding: 10px 0;
            border-radius: 4px;
            min-width: 150px;
            z-index: 1000;
          }
          .dropdown-menu li {
            list-style: none;
          }
          .dropdown-menu a {
            display: block;
            padding: 8px 12px;
            color: white;
          }
          .dropdown-menu a:hover {
            background-color: #555;
          }
  
          /* Exibe o dropdown quando o elemento pai tem a classe "open" */
          .dropdown.open .dropdown-menu {
            display: block;
          }
  
          /* Responsividade */
          @media (max-width: 768px) {
            .menu {
              display: none;
              flex-direction: column;
              background-color: #333;
              position: absolute;
              top: 60px;
              left: 0;
              width: 100%;
              padding: 10px 0;
            }
            .menu.active {
              display: flex;
            }
            .menu-toggle {
              display: block;
            }
          }
        </style>
  
        <nav class="navbar">
          <!--div class="logo">MinhaLogo</div-->
          <ul class="menu">
            <li><a href="#">Início</a></li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle">Serviços</a>
              <ul class="dropdown-menu">
                <li><a href="#">Web Design</a></li>
                <li><a href="#">Desenvolvimento</a></li>
                <li><a href="#">SEO</a></li>
              </ul>
            </li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle">Sobre</a>
              <ul class="dropdown-menu">
                <li><a href="#">Equipe</a></li>
                <li><a href="#">História</a></li>
              </ul>
            </li>
            <li><a href="#">Contato</a></li>
          </ul>
          <div class="menu-toggle">☰</div>
        </nav>
      `;
  
      // Referências aos elementos
      const menuToggle = shadow.querySelector('.menu-toggle');
      const menu = shadow.querySelector('.menu');
  
      // Alterna o menu responsivo ao clicar no botão ☰
      menuToggle.addEventListener('click', () => {
        menu.classList.toggle('active');
      });
  
      // Para cada botão de dropdown, alterna a classe "open"
      const dropdownToggles = shadow.querySelectorAll('.dropdown-toggle');
      dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
  
          const currentDropdown = toggle.parentElement;
          const isOpen = currentDropdown.classList.contains('open');
  
          // Fecha todos os dropdowns abertos, exceto o atual
          shadow.querySelectorAll('.dropdown').forEach(drop => {
            if (drop !== currentDropdown) {
              drop.classList.remove('open');
            }
          });
  
          // Se o dropdown atual estiver aberto, fecha; caso contrário, abre
          if (!isOpen) {
            currentDropdown.classList.add('open');
          } else {
            currentDropdown.classList.remove('open');
          }
        });
      });
    }
  }
  
  // Define o Web Component
  customElements.define('responsive-menu', ResponsiveMenu);
  