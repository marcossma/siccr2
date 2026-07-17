# SICCR2 — Guia para o Claude Code

Sistema Integrado do Centro de Ciências Rurais (CCR) da UFSM.
Plataforma web para gestão interna: estrutura física, usuários, módulo financeiro, agendamento de salas (com recorrência, aprovação e notificação WhatsApp), almoxarifado (com RPA), notícias e eventos.

---

## Como rodar

### Via Docker (recomendado em dev)

```bash
# .env na raiz do projeto
docker compose up -d --build
# docker-compose.override.yml é carregado automaticamente em dev:
#   - bind mount de api/ → mudanças refletem sem rebuild
#   - node --watch → backend reinicia ao salvar
#   - entrypoint roda migrations automaticamente no boot
docker compose logs -f app
```

Para subir em modo "produção" (sem override/bind mount):
```bash
docker compose -f docker-compose.yml up -d --build
```

### Local (sem Docker)

```bash
cd api
npm install
npx sequelize-cli db:migrate
npm run dev             # node --watch server.js (porta 15000)
```

### Scripts npm úteis (em api/)

```bash
npm run lint            # eslint .  (roda também no pre-commit via husky)
npm run lint:fix        # eslint . --fix
npm run db:migrate      # sequelize-cli db:migrate
npm run db:dump         # regenera api/db/schema.sql do banco em Docker
```

### Variáveis de ambiente (.env na raiz)

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=senha       # ATENÇÃO: DB_PASSWORD, não DB_PASS
DB_NAME=siccr
JWT_SECRET=segredo
PORT=15000
CORS_ORIGIN=http://localhost:15000
LOG_LEVEL=info          # pino (debug em dev, info em prod)
WHATSAPP_API_KEY=...     # PoolZap; se vazio, notificação WhatsApp fica desabilitada
# WHATSAPP_API_URL tem default https://poolzap-api.infai.com.br
# E-mail (Gmail OAuth2) — se vazio, envio de e-mail fica desabilitado
GMAIL_USER=siccr@ufsm.br
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
GMAIL_OAUTH_REFRESH_TOKEN=...   # gerar com: npm run email:token -- <client_id> <client_secret>
# EMAIL_FROM tem default = GMAIL_USER (ex.: "SICCR <siccr@ufsm.br>")
# EMAIL_OAUTH_REDIRECT=...      # só p/ o fluxo por domínio (ex.: https://siccrt.infai.com.br/oauth2callback)
```

### E-mail (`lib/email.js`, Gmail OAuth2 via nodemailer)
- Fire-and-forget como o WhatsApp: nunca derruba a request; desabilitado sem credenciais.
- Setup no Google Cloud Console: ativar a **Gmail API**, criar credencial **OAuth client ID** (tipo *Web application*), registrar o redirect URI e gerar o refresh token. Dois modos:
  - **Local:** redirect `http://localhost:5555/oauth2callback`; `npm run email:token -- <id> <secret>` (na sua máquina) captura e imprime o token.
  - **Domínio (VPS):** redirect `https://SEU_DOMINIO/oauth2callback` (registre e ponha em `EMAIL_OAUTH_REDIRECT`); `npm run email:token -- <id> <secret> https://SEU_DOMINIO/oauth2callback` imprime o link, e a rota pública `GET /oauth2callback` (routes/email-oauth.js) troca o code e mostra o `GMAIL_OAUTH_REFRESH_TOKEN`.
- Testar: `npm run email:test -- destino@email`. O refresh token é portátil entre os dois modos.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express |
| Banco | PostgreSQL (`pg` pool) |
| Auth | JWT (Bearer) + bcrypt |
| Migrations | Sequelize CLI |
| Frontend | HTML + CSS + JS vanilla (Chart.js e FullCalendar via CDN/vendor) |
| WebSocket | `ws` library — notificações em tempo real |
| Logs | `pino` + `pino-http` (JSON em prod, pretty em dev; redação de campos sensíveis) |
| WhatsApp | PoolZap (`lib/whatsapp.js`) — fire-and-forget |
| Infra | Docker + docker-compose (db postgres:16 + app) |
| Qualidade | ESLint 9 + Prettier + husky (pre-commit) |

---

## Estrutura de pastas

```
siccr2/
├── api/
│   ├── server.js                 ← ponto de entrada (porta 15000) + WebSocket + error handler global
│   ├── config/database.js        ← pool pg
│   ├── middlewares/
│   │   ├── auth.js               ← verifica JWT → seta req.usuario
│   │   ├── autorizar.js          ← RBAC: autorizar(), getNivelAcesso(), getEscopoFiltro()
│   │   └── authApiKey.js         ← valida X-Api-Key (rotas RPA)
│   ├── lib/
│   │   ├── logger.js             ← pino configurado (redação de senha/token)
│   │   ├── recorrencia.js        ← expandirRecorrencia() + detectarConflitos() p/ agendamentos
│   │   └── whatsapp.js           ← PoolZap: enviarMensagem() + templates
│   ├── scripts/
│   │   ├── dump-schema.js        ← npm run db:dump → api/db/schema.sql
│   │   └── install-husky.js      ← setup hooks (no-op em prod/sem .git)
│   ├── db/schema.sql             ← dump versionado do schema (FONTE DE VERDADE p/ nomes de coluna)
│   ├── routes/                   ← todas as rotas REST
│   ├── migrations/               ← Sequelize migrations
│   └── public/                   ← frontend estático servido pelo Express
│       ├── js/scripts.js         ← lógica SPA de todas as páginas públicas/financeiras (~3100 linhas)
│       ├── js/components/        ← Web Components (Light DOM, sem Shadow DOM)
│       ├── js/vendor/            ← chart.min.js (Chart.js local)
│       ├── css/style.css         ← estilos globais + responsividade (@media)
│       ├── adm/                  ← painel admin (HTML + css/style.css + js/script.js)
│       └── *.html                ← páginas públicas/financeiras/agendamento
├── docker-compose.yml            ← db + app
├── docker-compose.override.yml   ← DEV: bind mount + node --watch (carregado automaticamente)
└── CLAUDE.md                     ← este arquivo
```

> **Importante:** ao escrever queries, confira nomes de coluna em `api/db/schema.sql`
> (dump real do banco), **não** neste arquivo. Já houve divergências históricas
> (ex: `sala_tipo_id` e `predios.predio` — sem sufixo `_nome`).

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
autorizar("chefe", "fazer_levantamento") // chefe+ OU servidor com a funcionalidade concedida
// (o fallback por funcionalidade só vale p/ "servidor"; use mínimo "chefe", não "servidor")

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
- **predios** — `predio_id`, `predio` (nome, sem sufixo), `descricao`, `unidade_id`
- **subunidades** — `subunidade_id`, `subunidade_nome`, `subunidade_sigla`, `is_direcao_centro`
- **salas** — `sala_id`, `sala_nome`(identificação — **única** case/espaço-insensível, índice `salas_nome_unico`), `created_by_user_id`(FK users SET NULL — quem cadastrou), `predio_id`, `subunidade_id`, `sala_tipo_id`(FK), `sala_descricao`, `is_agendavel`(int 0/1), `sala_capacidade`(int, nullable — lugares; insumo do ensalamento), `presta_servicos_externos`(int, nullable — só p/ laboratórios), `sala_largura`/`sala_comprimento`/`sala_altura`(DECIMAL, metros, nullable)
- **salas_tipo** — `sala_tipo_id`, `sala_tipo_nome`
- **salas_historico** — `id_historico`, `sala_id`(FK SET NULL), `sala_nome`(snapshot), `acao`(`cadastro`/`edicao`/`exclusao`), `user_id`(FK users SET NULL), `detalhe`(o que mudou), `createdat`. Auditoria das salas: POST/PUT/DELETE gravam evento **na mesma transação**. Consultável em `GET /salas/:id/historico` (ícone de histórico nas telas `/salas` e `/adm/salas`).

### Patrimônio
- **bens_permanentes** — `id_bem`, `numero_registro`(unique — código da etiqueta patrimonial), `descricao`, `sala_id`(FK SET NULL), `subunidade_id`(FK SET NULL — derivada da sala no cadastro), `estado_conservacao`(`novo`/`bom`/`regular`/`ruim`/`inservivel`), `observacao`, `data_levantamento`, `created_by_user_id`(FK users SET NULL — quem cadastrou), `createdat`
  - Levantamento por sala: dialog na tela `/adm/salas` (super_admin) **e** página servidor-facing `/levantamento-patrimonial` (menu **Patrimônio**, visível p/ chefe+ ou `fazer_levantamento`) — seletor de sala + lista/cadastro de bens, scan, mover e histórico. `numero_registro` preenchível manualmente **ou** por leitura de código de barras (`BarcodeDetector` nativo — só em contexto seguro/HTTPS; degrada para manual).
  - **RBAC:** aberto a **qualquer servidor logado** (`autorizar("servidor")`) — criar/editar/mover/excluir; toda ação é auditada em `patrimonio_historico`.
- **patrimonio_historico** — `id_historico`, `bem_id`(FK SET NULL — vira NULL ao excluir o bem), `numero_registro`(snapshot, sobrevive à exclusão), `acao`(`cadastro`/`edicao`/`movimentacao`/`exclusao`), `user_id`(FK users SET NULL — quem fez), `sala_id`(destino/atual), `sala_anterior_id`(origem, em movimentação), `detalhe`(o que mudou), `createdat`
  - Log de auditoria: cada POST/PUT/PATCH-mover/DELETE grava um evento **na mesma transação** da mudança. Consultável em `GET /patrimonio/:id/historico`.

### Usuários
- **users** — `user_id`, `nome`, `siape`, `email`, `senha`(bcrypt), `whatsapp`, `data_nascimento`, `permissao`, `subunidade_id`, `unidade_id`
- **funcionalidades** — `id`, `nome`, `descricao`, `modulo` (ex: `"criar_despesa"`, `"aprovar_agendamento"`, `"ver_agenda_portaria"`, `"atender_pedido_almoxarifado"`, `"fazer_levantamento"`, `"cadastrar_salas"`)
- **permissoes_usuario** — `id`, `user_id`, `funcionalidade_id`
- **api_keys** — chaves p/ rotas RPA (validadas via `X-Api-Key`)

### Agendamento de salas
- **agendamentos** — `id_agendamento`, `sala_id`(FK), `solicitante_user_id`(FK), `motivo`, `observacao`, `dia_inteiro`(bool), `hora_inicio`, `hora_fim`, `data_inicio`, `data_fim_recorrencia`, `tipo_recorrencia`(`pontual`/`semanal`/`mensal`), `dias_semana`, `intervalo_semanas`, `status`(`pendente`/`aprovada`/`rejeitada`/`cancelada`), `aprovado_por_user_id`, `data_decisao`, `motivo_rejeicao`, `createdat`
- **agendamentos_ocorrencias** — `id_ocorrencia`, `agendamento_id`(FK), `data_ocorrencia`, `status_individual`(`ativa`/`cancelada`/...), `motivo_individual`
  - A série (regra de recorrência) vive em `agendamentos`; cada data concreta vira uma linha em `agendamentos_ocorrencias`. Conflito é checado por `(sala_id, data_ocorrencia)`.
  - `agendamentos.origem` — `'solicitacao'` (reserva avulsa, workflow de aprovação) ou `'aula'` (gerada pelo módulo acadêmico). `agendamentos.turma_horario_id` (FK) rastreia a aula de volta ao horário da turma.

### Acadêmico
- **periodos_letivos** — `id_periodo`, `nome` (ex: `'2026.1'`), `data_inicio`, `data_fim`, `ativo` (só um ativo por vez)
- **cursos** — `id_curso`, `cod_curso`(unique), `nome`, `nivel`(`graduacao`|`pos_graduacao`, default graduação)
  - Pós-graduação fica **fora da listagem de ensalamento por padrão** (`?incluir_pos=1` inclui). Nível semeado por heurística no nome (MESTRADO/DOUTORADO/PÓS-GRAD/ESPECIALIZAÇÃO/PPG/PG); ajustável manualmente (`PATCH /cursos/:id`). Re-import **não** sobrescreve o nível.
- **disciplinas** — `id_disciplina`, `codigo`, `nome`, `carga_horaria`, `subunidade_id`(FK, depto que oferece)
- **professores_disciplinas** — `id`, `user_id`(FK), `disciplina_id`(FK) — N:N. "Professor" = qualquer `user` vinculado; sem tipo de permissão novo.
- **turmas** — `id_turma`, `disciplina_id`(FK), `periodo_letivo_id`(FK), `nome_turma`, `professor_user_id`(FK), `vagas`, `curso_id`(FK cursos, SET NULL), `id_turma_externo`(unique — chave do import idempotente)
- **turmas_professores** — `id`, `turma_id`(FK CASCADE), `user_id`(FK CASCADE), `encargo`(DECIMAL) — N:N de co-docência; unique `(turma_id, user_id)`
- **turmas_horarios** — `id_horario`, `turma_id`(FK), `dia_semana`(0=dom..6=sáb), `hora_inicio`, `hora_fim`, `sala_id`(FK, **nullable** — importado entra sem sala), `tipo_aula`(`teorica`/`pratica`/`teorica_ext`/`pratica_ext`), `data_inicio`/`data_fim`(DATEONLY, nullable — bloco modular; NULL = período inteiro)
  - **Alocação:** ao adicionar/editar um `turma_horario` **com sala**, o backend materializa a aula — cria um `agendamento` (`origem='aula'`, `status='aprovada'`) expandido em ocorrências semanais (reusa `lib/recorrencia.js`), respeitando o bloco modular quando presente (senão o período inteiro) e checando conflito de sala. Horário sem sala fica na grade aguardando ensalamento. Apagar o horário/turma cascateia para a aula e ocorrências (FK CASCADE).

### Financeiro
- **tipos_recursos** — `id_tipo_recurso`, `tipo_recurso`, `descricao_recurso`
- **recursos_recebidos** — `id_recurso_recebido`, `tipo_recurso_recebido`(FK), `valor_recurso_recebido`, `descricao_recurso_recebido`, `data_recebimento`
  - **Nível centro** — sem `subunidade_id`, visível apenas para diretor/super_admin
- **tipos_despesas** — `id_tipo_despesa`, `tipo_despesa`, `descricao_despesa`
- **despesas** — `id_despesa`, `id_tipo_despesa`(FK), `id_subunidade`(FK), `valor_despesa`, `data_despesa`, `numero_documento_despesa`, `observacao_despesa`
- **pedidos_almoxarifado** — `id_pedido`, `subunidade_id`(FK), `status`(pendente/atendido/cancelado), `observacao`, `data_pedido`, `data_conclusao`, `createdat`
- **itens_pedido_almoxarifado** — `id_item`, `pedido_id`(FK), `produto`, `quantidade`, ... (itens normalizados; substituiu colunas legadas em pedidos_almoxarifado)
- **previsoes_despesas** — `id_previsao`, `subunidade_id`(FK), `id_tipo_despesa`(FK), `valor_previsto`, `ano_referencia`, `observacao`, `createdat`

---

## Rotas da API

### Públicas (sem token)
| Rota | Descrição |
|------|-----------|
| `POST /api/auth/login` | Login → retorna JWT |
| `GET /api/noticias` | Proxy WordPress |
| `GET /api/eventos` | Scraping eventos WordPress |
| `GET /api/painel-tv/predios` | Prédios com salas agendáveis (kiosk TV) |
| `GET /api/painel-tv/:predio_id` | Agenda de hoje do prédio (TV no hall; sem dados internos de reservas) |

### Protegidas (Bearer token obrigatório)
| Rota | Nível mínimo | Arquivo |
|------|-------------|---------|
| `/api/usuarios` | chefe | routes/usuarios.js |
| `/api/unidades` | diretor | routes/unidades.js |
| `/api/predios` | chefe | routes/predios.js |
| `/api/subunidades` | chefe | routes/subunidades.js |
| `/api/salas` | servidor (ler) / chefe+·`cadastrar_salas` (criar) / super_admin (editar·excluir) | routes/salas.js |
| `/api/salas-tipo` | chefe | routes/salas-tipo.js |
| `/api/patrimonio` | servidor (logado; toda ação auditada) | routes/patrimonio.js |
| `/api/aniversariantes` | servidor (logado) | routes/aniversariantes.js |
| `/api/aniversariantes/parabenizar` `/config` | diretor | routes/aniversariantes.js |
| `/api/comunicados` | diretor | routes/comunicados.js |
| `/api/tipos-recursos` | chefe | routes/tipos-recursos.js |
| `/api/tipos-despesas` | chefe | routes/tipos-despesas.js |
| `/api/despesas` | chefe | routes/despesas.js |
| `/api/recursos-recebidos` | chefe | routes/recursos-recebidos.js |
| `/api/pedidos-almoxarifado` | chefe | routes/pedidos-almoxarifado.js |
| `/api/previsoes-despesas` | chefe | routes/previsoes-despesas.js |
| `/api/relatorios` | chefe | routes/relatorios.js |
| `/api/agendamentos` | servidor* | routes/agendamentos.js |
| `/api/periodos-letivos` | chefe | routes/periodos-letivos.js |
| `/api/disciplinas` | chefe | routes/disciplinas.js |
| `/api/turmas` | chefe | routes/turmas.js |
| `/api/cursos` | chefe | routes/cursos.js |
| `/api/funcionalidades` | chefe | routes/funcionalidades.js |
| `/api/permissoes-usuario` | chefe | routes/permissoes-usuario.js |
| `/api/api-keys` | autenticado | routes/api-keys.js |
| `/api/rpa` | **X-Api-Key** (sem JWT) | routes/rpa.js (factory, recebe wss) |

\* `/api/agendamentos` exige apenas login (`autorizar("servidor")`); o controle fino é nas sub-rotas (ver abaixo).

### Sub-rotas de `/api/agendamentos`
| Rota | Quem | O que faz |
|------|------|-----------|
| `POST /preview` | logado | Expande recorrência e devolve ocorrências com flag de conflito (sem gravar) |
| `POST /` | logado | Cria solicitação (status `pendente`) + ocorrências; broadcast WS `agendamento_pendente` |
| `GET /` | logado | Lista (próprias; direção vê todas). Filtros `?status=&sala_id=` |
| `GET /:id` | dono/direção | Detalhe + ocorrências |
| `PATCH /:id/aprovar` | direção | Aprova; WhatsApp + broadcast `agendamento_decidido` |
| `PATCH /:id/rejeitar` | direção | Rejeita c/ `motivo_rejeicao`; WhatsApp + broadcast |
| `PATCH /:id/cancelar` | dono/direção | Cancela série |
| `PATCH /:id/ocorrencias/:occId/cancelar` | dono/direção | Cancela uma ocorrência |
| `GET /visao/calendario` | logado | Ocorrências p/ FullCalendar (`?sala_id=&inicio=&fim=&incluir_pendentes=`) |
| `GET /visao/portaria` | chefe+ ou `ver_agenda_portaria` | Agenda semanal p/ portaria |
| `GET /salas/agendaveis` | logado | Salas com `is_agendavel=1` |

`GET /api/relatorios/salas` (direção) — resumo, ocupação por sala (split aula/reserva), timeline, top solicitantes, rejeições e detalhe. Métricas de workflow filtram `origem='solicitacao'`; ocupação inclui aulas. Usado em `/relatorios-salas`.

`/api/turmas` sub-rotas: `GET /` (lista; filtros `?periodo_letivo_id=&curso_id=&disciplina_id=`, pós excluída salvo `?incluir_pos=1`; devolve `horarios_com_sala`/`total_horarios` e `total_professores`), `POST/PUT/DELETE /` (CRUD turma), `GET /:id` (detalhe + horários com tipo/bloco modular + professores de co-docência), `POST /:id/horarios` (aloca + materializa aula; 409 com datas em conflito), `PUT /:id/horarios/:horarioId` (edição in-place — re-materializa preservando tipo/bloco; sala vazia = desaloca), `DELETE /:id/horarios/:horarioId`.

`/api/cursos`: `GET /` (lista p/ filtro; pós excluída salvo `?incluir_pos=1`), `PATCH /:id` (ajuste manual do `nivel`).

`/api/aniversariantes`: `GET /?mes=` (mural do mês, logado), `GET /hoje` (aniversariantes de hoje, logado), e — **só direção** — `POST /parabenizar` (envia parabéns por e-mail aos de hoje, agora), `GET/PATCH /config` (liga/desliga o **envio automático diário**). Lógica em `lib/aniversarios.js`; agendador (setInterval) iniciado no `server.js` roda ~08:00 BRT se o automático estiver ligado (guard por data em `configuracoes`). Painel de disparo/toggle no topo de `/aniversariantes` (visível só p/ direção). Tabela **configuracoes** (chave/valor) guarda o flag e o "último envio".

`/api/comunicados` (diretor): `GET /destinatarios` (servidores c/ email, subunidades c/ contagem, totais chefes/todos), `POST /preview` (resolve destinatários e conta, sem enviar), `POST /` (envia comunicado em **BCC por lote** de 45 via `lib/email.js` e registra em `comunicados`), `GET /` (histórico). Painel em `/comunicados` (direção; link no menu Administrativo). Destinatários: individuais (lista/e-mail avulso) + grupos (subunidades, chefes, todos), com dedup. **Corpo com formatação** (editor contenteditable: negrito/itálico/listas/link) — o backend **linkifica URLs soltas** e **sanitiza** o HTML (`sanitize-html`, allowlist); logo do SICCR embutido por CID. Envia HTML + fallback texto.

`/api/patrimonio`: `GET /salas` (salas p/ o seletor do levantamento, com total de bens), `GET /?sala_id=` (bens da sala + quem cadastrou), `GET /:id/historico` (linha do tempo de auditoria), `POST /` (cadastra; `subunidade_id` derivada da sala; 409 se `numero_registro` duplicado — o 409 traz `data.bem_existente` com a sala atual), `PUT /:id`, `PATCH /:id/mover` (transfere o bem p/ outra sala + atualiza `data_levantamento`; usado no botão "Mover para esta sala" quando o tombo já existe noutra sala), `DELETE /:id`. Toda mutação grava um evento em `patrimonio_historico`.

"Direção" = `super_admin`/`diretor`/`vice_diretor`, ou `is_direcao_centro=true`, ou funcionalidade `aprovar_agendamento`/`ver_todos_agendamentos`.

### Páginas do painel admin (`/adm/*`)
unidades, subunidades, usuários, prédios, salas, salas-tipo, **periodos-letivos**, **disciplinas**, **turmas**, api-keys. Menu em `js/components/menu-navegacao-adm.js`.

---

## Frontend — convenções

### Autenticação client-side
- **localStorage:**
  - `siccr` — objeto JSON completo do usuário (`nome`, `permissao`, `subunidade_id`, `is_direcao_centro`, `funcionalidades`, ...)
  - `siccr_token` — JWT string
- `scripts.js` tem IIFE no topo que intercepta todo `fetch()` e injeta `Authorization: Bearer` automaticamente
- **`apiUrl` é relativo** (`${window.location.origin}/api`) — funciona em localhost e na LAN (ex: `http://192.168.x.x:15000`). Nunca hardcodar `localhost`.

### Tempo real (WebSocket)
- `scripts.js` abre 1 WS no boot, autentica via `{tipo:"auth", token}`.
- Mensagens recebidas viram **CustomEvent** no `window`: `siccr:agendamento_pendente`, `siccr:agendamento_decidido` (e toasts de pedido almox).
- Páginas escutam esses eventos p/ atualizar listas/calendário em tempo real (`/solicitacoes-de-agendamento`, `/calendario-de-salas`, `/agenda-portaria`).

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

## Páginas de agendamento (frontend)

| Página | Quem vê (menu) | Função |
|--------|----------------|--------|
| `/solicitar-agendamento` | todos logados | Form de solicitação com preview de conflitos e recorrência |
| `/calendario-de-salas` | todos logados | FullCalendar (mês/semana/dia), locale pt-br |
| `/agenda-portaria` | chefe+ ou `ver_agenda_portaria` | Agenda semanal p/ portaria, navegável + imprimível |
| `/solicitacoes-de-agendamento` | direção | Aprovar/rejeitar; rejeição mostra motivo inline |
| `/relatorios-salas` | direção | Gráficos (Chart.js) + tabelas + PDF via `window.print()` |
| `/painel-tv` | link p/ portaria/direção | Kiosk público p/ TV no hall (`?predio=ID`); standalone (sem scripts.js), auto-refresh 60s. JS em `js/painel-tv.js` |

No calendário e na portaria, aulas (origem='aula') aparecem distintas de reservas: calendário pinta aula em azul e mostra disciplina/turma/professor; portaria idem.

Impressão/PDF: páginas usam `@media print` p/ esconder menu/toolbar.

## WhatsApp (PoolZap)

- `lib/whatsapp.js` — `enviarMensagem(numero, msg)` é **fire-and-forget**: nunca lança, só loga via pino. Falha de WhatsApp não bloqueia aprovação/rejeição.
- Normaliza número p/ formato DDI+DDD (ex: `5555999998888`), redige número no log.
- Disparado em `PATCH /aprovar` e `/rejeitar`. Sem `WHATSAPP_API_KEY` no `.env`, fica desabilitado silenciosamente.
- **E-mail transacional** também é disparado em `/aprovar` e `/rejeitar` (fire-and-forget, ao lado do WhatsApp): templates em `lib/email-templates.js` (`agendamentoAprovado`/`agendamentoRejeitado`), layout branded com logo por CID. Enviado só se o solicitante tiver e-mail.

## Observabilidade & qualidade

- **Logs:** `pino` via `lib/logger.js` + `pino-http` em `server.js` (cada request ganha `req.id`). Error handler global no fim do `server.js` captura erros não tratados.
- **ESLint 9** (`eslint.config.js`, flat config) + Prettier; **husky** roda lint no pre-commit.
- **Schema versionado:** após criar migration, rode `npm run db:dump` e commite `api/db/schema.sql`.

---

## Pendências

- Relatórios financeiros não têm filtro por ano no frontend (endpoint `?ano=` existe no backend)
- 5 vulnerabilidades npm restantes só corrigíveis com `--force` (breaking: bcrypt@6, downgrade sequelize@3) — tooling de build/migration, fora do request path; deixadas conscientemente
- Aulas alocadas não disparam tempo real (WS) no calendário/portaria/TV — refletem no próximo carregamento (TV faz polling 60s). Real-time só vale p/ solicitações.
- Ensalamento em massa: hoje atribui-se sala horário a horário (via editar horário na tela de turmas). Falta uma tela dedicada de ensalamento (atribuição em lote das salas aos horários importados).
- Leitura de código de barras do patrimônio via câmera exige **HTTPS** (contexto seguro); em HTTP na LAN o navegador bloqueia a câmera — hoje o sistema roda em HTTP, então a câmera só funciona quando servido por HTTPS (o cadastro manual funciona sempre).
- Ensalamento automático (matrícula × `sala_capacidade`) ainda não implementado.
