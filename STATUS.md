# SICCR2 — Status de Desenvolvimento

> Última atualização: abril/2026

---

## ✅ Implementado

### Infraestrutura

- [x] Servidor Node.js + Express na porta 15000
- [x] Banco de dados PostgreSQL com pool de conexões (`pg`)
- [x] 45 migrations Sequelize rastreando toda a evolução do schema
- [x] Docker Compose com serviços `app` + `db` (PostgreSQL 16)
- [x] `entrypoint.sh` — aguarda DB, roda migrations e sobe servidor automaticamente
- [x] Variáveis de ambiente via `.env` (suporte a `api/.env` e `.env` na raiz)
- [x] WebSocket Server integrado ao Express (notificações em tempo real)

---

### Autenticação e Segurança

- [x] Login com JWT (Bearer token, expira em 8h)
- [x] Senhas com bcrypt (salt 10)
- [x] Middleware `auth.js` — valida JWT e popula `req.usuario`
- [x] Middleware `autorizar.js` — RBAC com 4 níveis de acesso
- [x] Middleware `authApiKey.js` — autenticação via `X-Api-Key` para o RPA
- [x] Helmet com CSP configurado
- [x] CORS configurável via variável de ambiente
- [x] Patch global de `fetch` no frontend injetando `Authorization: Bearer` automaticamente

---

### RBAC — Controle de Acesso por Nível

- [x] `super_admin` (4) — acesso total à plataforma
- [x] `diretor` (3) — diretor, vice_diretor, ou `is_direcao_centro = true`
- [x] `chefe` (2) — chefe ou subchefe de subunidade
- [x] `servidor` (1) — acesso básico + funcionalidades concedidas pelo chefe
- [x] `getEscopoFiltro()` — filtra dados por subunidade automaticamente para chefe/servidor
- [x] Funcionalidades granulares com `subunidade_responsavel_id` — cada funcionalidade pertence a um setor específico
- [x] Concessão/revogação de permissões individuais pelo chefe do setor responsável

---

### Estrutura Organizacional (Painel Admin)

- [x] CRUD de Unidades
- [x] CRUD de Subunidades (com sigla, código, e-mail, `is_direcao_centro`, chefe, prédio)
- [x] CRUD de Prédios (vinculados à unidade)
- [x] CRUD de Salas (vinculadas ao prédio e subunidade, flag `is_agendavel`)
- [x] CRUD de Tipos de Salas
- [x] CRUD de Usuários (admin vê todos, chefe vê apenas sua subunidade)
- [x] Escopo de cadastro: chefe só pode adicionar usuários na própria subunidade

---

### Módulo Financeiro

- [x] CRUD de Tipos de Recursos
- [x] CRUD de Recursos Recebidos (nível centro — visível apenas para diretor+)
- [x] CRUD de Tipos de Despesas
- [x] CRUD de Despesas (filtradas por subunidade para chefe/servidor)
- [x] CRUD de Previsões de Despesas (por ano de referência)
- [x] Relatório Resumo — totais consolidados com escopo por nível de acesso
- [x] Relatório de Despesas — lista detalhada com filtro `?ano=`
- [x] Relatório de Recursos — restrito a diretor/super_admin

---

### Pedidos de Almoxarifado

- [x] Criação de pedido com múltiplos itens (código, descrição, quantidade) em transação atômica
- [x] Listagem filtrada por escopo (chefe vê só da sua subunidade, diretor/SID veem todos)
- [x] Visualização dos itens de cada pedido
- [x] Fluxo de status: `pendente` → `atendido` / `cancelado`
- [x] Notificação em tempo real via WebSocket quando novo pedido é criado
- [x] Página "Verificar Pedidos" para a SID (secretaria) com botão "Finalizar Pedido"
- [x] Funcionalidade `atender_pedido_almoxarifado` controlando quem pode ser SID
- [x] Menu "Verificar pedidos" visível apenas para usuários SID e diretor+

---

### API Keys (para automação RPA)

- [x] Geração de API Key por subunidade (formato `siccr_<hex64>`)
- [x] Regeneração de chave (invalida a anterior)
- [x] Ativação/desativação de chave
- [x] Página de gerenciamento no painel admin (super_admin)
- [x] Middleware `authApiKey.js` validando `X-Api-Key` no header
- [x] Rotas `/api/rpa/*` exclusivas para o agente Python

---

### Gerenciamento de Usuários (área logada)

- [x] Listagem de usuários filtrada por escopo (chefe vê sua subunidade, diretor vê a unidade, super_admin vê todos)
- [x] Cadastro de novos usuários pelo chefe (fixado na própria subunidade)
- [x] Edição de usuários com senha opcional (deixar em branco mantém a atual)
- [x] Concessão e revogação de permissões individuais por funcionalidade
- [x] Modal de permissões com visual alinhado à identidade da plataforma

---

### Notícias e Eventos

- [x] Proxy para notícias do WordPress do CCR (`/api/noticias`)
- [x] Scraping de eventos do WordPress do CCR (`/api/eventos`)
- [x] Renderização na página inicial

---

### Frontend — Web Components e UX

- [x] `<responsive-menu>` — menu header responsivo com hamburguer mobile e dropdowns por nível RBAC (Light DOM, sem Shadow DOM)
- [x] `<menu-navegacao-adm>` — menu lateral do painel admin com destaque da página ativa (Light DOM)
- [x] Header exibe avatar (inicial), primeiro nome, cargo e sigla do setor do usuário logado
- [x] Feedback visual de erro no login (modal com mensagem de erro)
- [x] Redirecionamento automático para login quando token expirado
- [x] Formatação de datas em `dd/mm/yyyy` em todas as listagens
- [x] Identidade visual padronizada: cor `#009536`, fonte Verdana, variáveis CSS globais
- [x] Dialogs seguindo padrão `.dialogPainel` com legend verde, botões `btnPainelFormulario`
- [x] Toast de notificação WebSocket na página "Verificar Pedidos"

---

### Agente RPA (Python)

- [x] GUI desktop com `customtkinter` (tema verde CCR)
- [x] Listagem automática de pedidos pendentes via `/api/rpa/pedidos`
- [x] Seleção individual ou em massa de pedidos
- [x] Integração com SIE (`\\saccr3.ccr.ufsm.br\appufsm\Executaveis\GCANavegacao.exe`) via `pywinauto` (backend Win32)
- [x] Marcação automática como "atendido" após execução no SIE
- [x] Log de execução em tempo real na interface
- [x] Compilação para `.exe` via PyInstaller (sem necessidade de Python instalado)
- [x] Credenciais SIE e API Key em `config.json` externo ao executável
- [x] Utilitário `inspecionar_sie.py` para mapear controles do GCA

---

## 🔄 Em andamento

- [ ] Mapeamento dos controles do SIE (GCA) para completar `sie_automation.py`
  - Aguarda sessão de inspeção com o SIE aberto usando `inspecionar_sie.py`

---

## 📋 Planejado / Pendente

### Agendamento de Salas

- [ ] Backend: rotas `/api/agendamentos` (CRUD)
- [ ] Backend: regra de conflito de horário (mesma sala, mesmo período)
- [ ] Frontend: página `solicitar-agendamento.html` (formulário funcional)
- [ ] Frontend: página `solicitacoes-de-agendamento.html` (listagem e aprovação)
- [ ] Notificação ao responsável pela sala quando novo agendamento é solicitado

### Módulo Financeiro — Melhorias

- [ ] Filtro por ano no frontend da página de Relatórios (endpoint `?ano=` já existe no backend)
- [ ] Exportação de relatórios para PDF ou CSV
- [ ] Validação de valores monetários no frontend (atualmente aceita qualquer string)
- [ ] Gráficos visuais no relatório (barras por subunidade, pizza por tipo de despesa)

### Pedidos de Almoxarifado — Melhorias

- [ ] Notificação ao solicitante quando o pedido for marcado como atendido (WebSocket de retorno)
- [ ] Histórico de pedidos com filtro por período
- [ ] Impressão / exportação da lista de itens do pedido

### Agente RPA — Automação SIE

- [ ] Implementar `sie_automation.py` com o fluxo completo do GCA:
  - [ ] Login automático no SIE
  - [ ] Navegação até o módulo de almoxarifado
  - [ ] Preenchimento dos itens do pedido
  - [ ] Confirmação e finalização do pedido
- [ ] Tratamento de erros e diálogos inesperados do SIE (popups, timeouts)
- [ ] Log de execução exportável para arquivo

### Infraestrutura e Segurança

- [ ] Renovação automática de token JWT próximo ao vencimento (refresh token)
- [ ] Página de redefinição de senha
- [ ] Auditoria de ações (log de quem fez o quê e quando)
- [ ] Rate limiting nas rotas de autenticação

### Painel Admin

- [ ] Página de gerenciamento de Funcionalidades (cadastrar novas funcionalidades)
- [ ] Dashboard com métricas gerais (total de usuários, subunidades, pedidos pendentes)

### Outras Páginas

- [ ] Página de Contato funcional (envio de e-mail ou registro de mensagem)
- [ ] Páginas de Patrimônio e Infraestrutura (estrutura existe no menu, conteúdo não implementado)
- [ ] Página de Transporte (estrutura existe no menu, conteúdo não implementado)

---

## 🗂️ Estrutura de Arquivos Resumida

```
siccr2/
├── api/
│   ├── server.js                         ← entrada (porta 15000)
│   ├── entrypoint.sh                     ← startup do container
│   ├── middlewares/
│   │   ├── auth.js                       ← JWT
│   │   ├── autorizar.js                  ← RBAC
│   │   └── authApiKey.js                 ← API Key (RPA)
│   ├── routes/                           ← 20 arquivos de rotas
│   ├── migrations/                       ← 45 migrations
│   └── public/
│       ├── js/scripts.js                 ← lógica SPA (todas as páginas)
│       ├── js/components/               ← Web Components
│       ├── css/style.css                 ← estilos globais + variáveis
│       ├── adm/                          ← painel admin
│       └── *.html                        ← páginas financeiras/públicas
├── rpa/
│   ├── main.py                           ← GUI do agente
│   ├── api_client.py                     ← cliente SICCR2
│   ├── sie_automation.py                 ← automação GCA (stub)
│   ├── inspecionar_sie.py                ← utilitário de inspeção
│   ├── build.bat                         ← gera .exe
│   └── dist/SICCR2-Almoxarifado/        ← executável compilado
├── docker-compose.yml
├── CLAUDE.md                             ← guia para o Claude Code
└── STATUS.md                             ← este arquivo
```
