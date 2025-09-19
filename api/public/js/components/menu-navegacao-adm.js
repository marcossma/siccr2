class MenuNavegacaoAdm extends HTMLElement {
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

        ul {
          width: 100%;
          display: flex;
          justify-content: space-around;
          align-items: center;
          list-style: none;
        }
          
        </style>
  
        <nav class="navbar">
          <ul>
            <li>Menu 1</li>
            <li>Menu 2</li>
            <li>Menu 3</li>
            <li>Menu 4</li>
            <li>Menu 5</li>
          </ul>
        </nav>
      `;
  
      // A partir daqui códigos javascript

    }

    

  }
  
  // Define o Web Component
  customElements.define('menu-navegacao-adm', MenuNavegacaoAdm);
  