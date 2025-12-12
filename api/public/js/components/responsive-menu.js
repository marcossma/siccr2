class ResponsiveMenu extends HTMLElement {
    constructor() {
      super();
  
      // Anexa o Shadow DOM
      const shadow = this.attachShadow({ mode: 'open' });
  
      // Template HTML + CSS do componente
      shadow.innerHTML = `
        <style>
        * {
          margin: 0px;
          padding: 0px;
          box-sizing: border-box;
          font-family: system-ui;
          font-size: 14px;
        }
          /* Estilo da navbar */
          .navbar {
            display: none;
            justify-content: space-between;
            align-items: center;
            background-color: #1f800b;
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
            width: 100%;
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
            top: 120%;
            left: 10px;
            background-color: #1f800b;
            /*background-color: #25a10d;*/
            padding: 10px 0;
            border-radius: 4px;
            min-width: 150px;
            width: 320px;
            z-index: 1000;
            box-shadow: 2px 2px 2px rgba(0, 0, 0, 1);
            border-top: 1px solid black;
            border-left: 1px solid black;
          }
          .dropdown-menu li {
            list-style: none;
            width: 100%;
          }
          .dropdown-menu a {
            display: block;
            padding: 8px 12px;
            color: white;
          }
          .dropdown-menu a:hover {
            background-color: #25a10d;
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
              background-color: #1f800b;
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
            <li><a href="/">Início</a></li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle"><span>Administrativo ⤵<span></a>
              <ul class="dropdown-menu">
                <li><a href="https://siccr.guiadigitalsm.com.br/salas" target="_blank">Abrir agendamento</a></li>
                <li><a href="/solicitar-agendamento">Solicitar agendamento</a></li>
                <li class="diretor"><a href="/solicitacoes-de-agendamento">Solicitações de agendamento</a></li>
                <hr>
                <li class="diretor-chefe"><a href="/gerenciamento-de-usuarios">Gerenciamento de usuários</a></li>
              </ul>
            </li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle"><span>Financeiro ⤵<span></a>
              <ul class="dropdown-menu">
                <li class="diretor"><a href="/tipos-recursos">Tipos de recursos</a></li>
                <li class="diretor"><a href="/adicionar-recurso">Adicionar recurso</a></li>
                <li class="diretor"><a href="/tipos-despesas">Tipos de despesas</a></li>
                <li class="diretor"><a href="/adicionar-despesas">Adicionar despesa</a></li>
                <li class="diretor-chefe"><a href="/previsao-despesas">Previsão de despesas</a></li>
                <li class="diretor-chefe"><a href="/relatorios">Relatórios</a></li>
              </ul>
            </li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle"><span>Patrimônio ⤵<span></a>
              <ul class="dropdown-menu">
                <li><a href="#">Equipe</a></li>
                <li><a href="#">História</a></li>
              </ul>
            </li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle"><span>Infraestrutura ⤵<span></a>
              <ul class="dropdown-menu">
                <li><a href="#">Equipe</a></li>
                <li><a href="#">História</a></li>
              </ul>
            </li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle"><span>Transporte ⤵<span></a>
              <ul class="dropdown-menu">
                <li><a href="#">Equipe</a></li>
                <li><a href="#">História</a></li>
              </ul>
            </li>
            <li><a href="/contato">Contato</a></li>
            <li><a href="#" id="logout">Sair</a></li>
          </ul>
          <div class="menu-toggle">☰</div>
        </nav>
      `;
  
      // Controle de exibição da navbar
      const navbar = shadow.querySelector(".navbar");

      // Obtém o token caso exista (usuário logado)
      const token = localStorage.getItem("siccr_token");
      const permissao = localStorage.getItem("permissao");

      // Referências aos elementos
      const menuToggle = shadow.querySelector('.menu-toggle');
      const menu = shadow.querySelector('.menu');
      const btnLogout = shadow.querySelector("#logout");
  
      // Exibir ou ocultar a barra de navegação
      if (token) {
        navbar.style.display = "flex";
      } else {
        navbar.style.display = "none";
      }

      const diretorEl = shadow.querySelectorAll(".diretor");
      const diretor_chefeEl = shadow.querySelectorAll(".diretor-chefe");
      
      diretorEl.forEach((elemento) => {
        if (permissao !== "diretor") elemento.style.display = "none";
      });

      diretor_chefeEl.forEach((elemento) => {
        if ((permissao !== "diretor") && (permissao !== "chefe")) elemento.style.display = "none";
      });

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

      btnLogout.addEventListener("click", function(event) {
        localStorage.removeItem("siccr");
        localStorage.removeItem("siccr_token");
        window.location.href = "/"; // Redireciona para a página principal para atualizar o menu
        console.log("Logout OK!");
      });

    }

    

  }
  
  // Define o Web Component
  customElements.define('responsive-menu', ResponsiveMenu);
  