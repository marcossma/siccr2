# SICCR2 — Guia para o Claude Code

Sistema Integrado do Centro de Ciências Rurais (CCR) da UFSM.
Plataforma web para gestão interna: estrutura física, usuários, módulo financeiro, agendamento de salas, notícias e eventos.

---

## Como rodar

```bash
cd api
npm install
# configurar api/.env (ou .env na raiz)
npx sequelize-cli db:migrate
node server.js          # porta padrão 15000
```

### Variáveis de ambiente (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=senha
DB_NAME=siccr2
JWT_SECRET=segredo
PORT=15000
CORS_ORIGIN=http://localhost:15000
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express |
| Banco | PostgreSQL (`pg` pool) |
| Auth | JWT (Bearer) + bcrypt |
| Migrations | Sequelize CLI |
| Frontend | HTML + CSS + JS vanilla |
| WebSocket | `ws` library |

---

## Estrutura de pastas

```
siccr2/
├── api/
│   ├── server.js                 ← ponto de entrada (porta 15000)
│   ├── config/database.js        ← pool pg
│   ├── middlewares/
│   │   ├── auth.js               ← verifica JWT → seta req.usuario
│   │   └── autorizar.js          ← RBAC: autorizar(), getNivelAcesso(), getEscopoFiltro()
│   ├── routes/                   ← todas as rotas REST
│   ├── migrations/               ← Sequelize migrations
│   └── public/                   ← frontend estático servido pelo Express
│       ├── js/scripts.js         ← lógica SPA de todas as páginas públicas/financeiras
│       ├── js/components/        ← Web Components (Light DOM, sem Shadow DOM)
│       │   ├── responsive-menu.js
│       │   ├── menu-navegacao-adm.js
│       │   └── index.js
│       ├── css/style.css         ← estilos globais + variáveis CSS
│       ├── adm/                  ← painel admin (HTML + css/style.css + js/script.js)
│       └── *.html                ← páginas financeiras públicas
├── docker-compose.yml
└── CLAUDE.md                     ← este arquivo
```

---

## RBAC — Níveis de acesso

```
super_admin  (4) → acesso total
diretor      (3) → diretor | vice_diretor | is_direcao_centro=true
chefe        (2) → chefe | subchefe
servidor     (1) → + funcionalidades específicas concedidas pelo chefe
```

### Middleware de autorização

```js
// middlewares/autorizar.js
autorizar("chefe")            // nível mínimo: chefe ou superior
autorizar("diretor")          // nível mínimo: diretor ou superior
autorizar("servidor", "criar_despesa")  // servidor com permissão específica OU superior

getNivelAcesso(req.usuario)   // retorna "super_admin" | "diretor" | "chefe" | "servidor"
getEscopoFiltro(req.usuario, req.nivelAcesso, baseParams)
// → { whereClause, params }
// chefe/servidor: "AND subunidade_id = $N"
// diretor/super_admin: sem filtro
```

### JWT payload (req.usuario)

```js
{ id, nome, siape, email, whatsapp, data_nascimento,
  permissao, subunidade, unidade, is_direcao_centro }
```

---

## Banco de dados — tabelas principais

### Estrutura física
- **unidades** — `unidade_id`, `unidade_nome`
- **predios** — `predio_id`, `predio_nome`, `unidade_id`
- **subunidades** — `subunidade_id`, `subunidade_nome`, `is_direcao_centro`
- **salas** — `sala_id`, `sala_nome`, `is_agendavel`, `predio_id`, `salas_tipo_id`
- **salas_tipo** — `salas_tipo_id`, `salas_tipo_nome`

### Usuários
- **users** — `user_id`, `nome`, `siape`, `email`, `senha`(bcrypt), `whatsapp`, `data_nascimento`, `permissao`, `subunidade_id`, `unidade_id`
- **funcionalidades** — `id`, `nome` (ex: `"criar_despesa"`)
- **permissoes_usuario** — `id`, `user_id`, `funcionalidade_id`

### Financeiro
- **tipos_recursos** — `id_tipo_recurso`, `tipo_recurso`, `descricao_recurso`
- **recursos_recebidos** — `id_recurso_recebido`, `tipo_recurso_recebido`(FK), `valor_recurso_recebido`, `descricao_recurso_recebido`, `data_recebimento`
  - **Nível centro** — sem `subunidade_id`, visível apenas para diretor/super_admin
- **tipos_despesas** — `id_tipo_despesa`, `tipo_despesa`, `descricao_despesa`
- **despesas** — `id_despesa`, `id_tipo_despesa`(FK), `id_subunidade`(FK), `valor_despesa`, `data_despesa`, `numero_documento_despesa`, `observacao_despesa`
- **pedidos_almoxarifado** — `id_pedido`, `subunidade_id`(FK), `descricao_itens`, `quantidade`, `data_pedido`, `status`(pendente/atendido/cancelado), `observacao`, `createdat`
- **previsoes_despesas** — `id_previsao`, `subunidade_id`(FK), `id_tipo_despesa`(FK), `valor_previsto`, `ano_referencia`, `observacao`, `createdat`

---

## Rotas da API

### Públicas (sem token)
| Rota | Descrição |
|------|-----------|
| `POST /api/auth/login` | Login → retorna JWT |
| `GET /api/noticias` | Proxy WordPress |
| `GET /api/eventos` | Scraping eventos WordPress |

### Protegidas (Bearer token obrigatório)
| Rota | Nível mínimo | Arquivo |
|------|-------------|---------|
| `/api/usuarios` | chefe | routes/usuarios.js |
| `/api/unidades` | diretor | routes/unidades.js |
| `/api/predios` | chefe | routes/predios.js |
| `/api/subunidades` | chefe | routes/subunidades.js |
| `/api/salas` | chefe | routes/salas.js |
| `/api/salas-tipo` | chefe | routes/salas-tipo.js |
| `/api/tipos-recursos` | chefe | routes/tipos-recursos.js |
| `/api/tipos-despesas` | chefe | routes/tipos-despesas.js |
| `/api/despesas` | chefe | routes/despesas.js |
| `/api/recursos-recebidos` | chefe | routes/recursos-recebidos.js |
| `/api/pedidos-almoxarifado` | chefe | routes/pedidos-almoxarifado.js |
| `/api/previsoes-despesas` | chefe | routes/previsoes-despesas.js |
| `/api/relatorios` | chefe | routes/relatorios.js |
| `/api/funcionalidades` | super_admin | routes/funcionalidades.js |
| `/api/permissoes-usuario` | chefe | routes/permissoes-usuario.js |

---

## Frontend — convenções

### Autenticação client-side
- **localStorage:**
  - `siccr` — objeto JSON completo do usuário (`nome`, `permissao`, `subunidade_id`, `is_direcao_centro`, ...)
  - `siccr_token` — JWT string
- `scripts.js` tem IIFE no topo que intercepta todo `fetch()` e injeta `Authorization: Bearer` automaticamente

### Web Components (Light DOM)
- `<responsive-menu>` — menu do header com hamburger e dropdowns
- `<menu-navegacao-adm>` — menu lateral do painel admin
- **NUNCA usar Shadow DOM** — quebra SEO e herança de CSS

### scripts.js — padrão de página
Cada página tem um bloco `if (urlParam === "/nome-da-pagina") { ... }` dentro do `DOMContentLoaded`.

Funções utilitárias:
- `carregarDados(endpoint)` — GET, retorna `dados.data`
- `excluirDado(id, endpoint)` — DELETE
- `formatarData(valor)` — converte ISO/DATEONLY → "dd/mm/yyyy"

### CSS — variáveis globais (style.css)
```css
:root {
  --nav-bg: #007a2e;    --nav-hover: #009536;
  --nav-text: #ffffff;  --nav-font: verdana, sans-serif;
}
```
Cor primária: `#009536` (verde CCR). Fonte padrão: `verdana, sans-serif`.

### Formulários (dialog)
- Sempre `type="button"` nos botões dentro de `<form>` para evitar submit acidental
- Modo cadastro: mostra `btnCadastrar`, esconde `btnAtualizar`
- Modo edição: dados preenchidos via `dataset` do ícone `.editar`

### Datas
- **Banco:** armazena formato completo (`DATEONLY` ou `TIMESTAMP`)
- **Exibição:** sempre `dd/mm/yyyy` via `formatarData()`

### Header — usuário logado
`verificaLogin()` em `scripts.js`:
- Injeta no `.acesso`: avatar (inicial), primeiro nome e cargo (Diretor, Chefe, Servidor, etc.)
- Mapeamento: `super_admin`→"Super Admin", `diretor`→"Diretor", `vice_diretor`→"Vice-Diretor", `chefe`→"Chefe", `subchefe`→"Subchefe", default→"Servidor"

---

## Relatórios — regra RBAC

- **chefe/servidor:** vê apenas despesas/pedidos/previsões da própria `subunidade_id`; NÃO vê `recursos_recebidos` (nível centro)
- **diretor/super_admin:** visão completa — todas subunidades + recursos recebidos + saldo

---

## Pendências

- Rodar migrations em produção: `npx sequelize-cli db:migrate`
- Página de agendamento de salas não implementada
- Relatórios não têm filtro por ano no frontend (endpoint `?ano=` existe no backend)
