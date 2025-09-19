class MenuNavegacaoAdm extends HTMLElement {
    constructor() {
      super();
  
      // Anexa o Shadow DOM
      const shadow = this.attachShadow({ mode: 'open' });
  
      // Template HTML + CSS do componente
      shadow.innerHTML = `
        <style>
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        * {
          margin: 0px;
          padding: 0px;
          box-sizing: border-box;
          font-family: system-ui;
          font-size: 14px;
        }

        ul {
          width: 100%;
          display: flex;
          justify-content: space-around;
          align-items: center;
          list-style: none;
        }

        i {
          font-size: 30px;
          transition: .5s;
        }

        .btn-menu-nav-adm {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          cursor: pointer;
        }

        .btn-menu-nav-adm p {
          color: white;
          transition: .5s;
        }

        .btn-menu-nav-adm:hover p {
          color: green;
        }

        a {
          text-decoration: none;
          color: black;
        }

        a:hover {
          color: green;
        }
          
        </style>
  
        <nav class="navbar">
          <ul>
            <li>
              <a href="/adm/unidades">
                <div class="btn-menu-nav-adm">
                  <i class="bi bi-globe"></i>
                  <p>Unidades</p>
                </div>
              </a>
            </li>
            <li>
              <a href="/adm/subunidades">
                <div class="btn-menu-nav-adm">
                  <i class="bi bi-globe-americas"></i>
                  <p>Subunidades</p>
                </div>
              </a>
            </li>
            <li>
              <a href="/adm/usuarios">
                <div class="btn-menu-nav-adm">
                  <i class="bi bi-people"></i>
                  <p>Usuários</p>
                </div>
              </a>
            </li>
            <li>
              <a href="/adm/predios">
                <div class="btn-menu-nav-adm">
                  <i class="bi bi-buildings"></i>
                  <p>Prédios</p>
                </div>
              </a>
            </li>
            <li>
              <a href="/adm/salas">
                <div class="btn-menu-nav-adm">
                  <i class="bi bi-door-closed"></i>
                  <p>Salas</p>
                </div>
              </a>
            </li>
          </ul>
        </nav>
      `;
  
      // A partir daqui códigos javascript

    }

    

  }
  
  // Define o Web Component
  customElements.define('menu-navegacao-adm', MenuNavegacaoAdm);
  