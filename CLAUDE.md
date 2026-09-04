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
# Assistente de IA — se vazio, o chat aparece desabilitado (não quebra nada)
OPENAI_API_KEY=sk-...
# OPENAI_MODEL tem default gpt-4o-mini; ajuste ao que a conta tiver liberado
# OPENAI_API_URL e OPENAI_TIMEOUT_MS (default 60000) raramente precisam mudar
```

> ⚠️ O `docker-compose.yml` mapeia as variáveis **uma a uma** no bloco `environment`.
> Pôr algo no `.env` **não basta**: a variável precisa estar listada lá também, senão
> não chega no container. E `docker compose up -d` sozinho não recria o container quando
> só o `.env` mudou — use `docker compose up -d --force-recreate app`.

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
- **salas** — `sala_id`, `sala_nome`(identificação — **única** case/espaço-insensível, índice `salas_nome_unico`), `created_by_user_id`(FK users SET NULL — quem cadastrou), `predio_id`, `subunidade_id`, `sala_tipo_id`(FK), `sala_descricao`, `is_agendavel`(int 0/1), `agendamento_manual`(int 0/1, default 0 — quando 1, a sala fica **fora do ensalamento** mas segue agendável via solicitação; ex.: NUSI), `sala_capacidade`(int, nullable — lugares; insumo do ensalamento), `presta_servicos_externos`(int, nullable — só p/ laboratórios), `sala_largura`/`sala_comprimento`/`sala_altura`(DECIMAL, metros, nullable)
- **salas_tipo** — `sala_tipo_id`, `sala_tipo_nome`
- **salas_historico** — `id_historico`, `sala_id`(FK SET NULL), `sala_nome`(snapshot), `acao`(`cadastro`/`edicao`/`exclusao`), `user_id`(FK users SET NULL), `detalhe`(o que mudou), `createdat`. Auditoria das salas: POST/PUT/DELETE gravam evento **na mesma transação**. Consultável em `GET /salas/:id/historico` (ícone de histórico nas telas `/salas` e `/adm/salas`).

> **Leitura de sala é aberta a qualquer servidor logado**, inclusive `/total-info` e
> `/disponiveis`: é informação de infraestrutura (quantas salas, capacidade, prédio, tipo) e
> o painel de TV já a expõe sem autenticação nenhuma. Havia em `/total-info` um recorte por
> nível que produzia uma **inversão** — o chefe via só as salas da própria subunidade
> (frequentemente nenhuma) enquanto um servidor comum via todas. Removido em set/2026.
> As escritas seguem restritas: criar exige chefe+ ou `cadastrar_salas`; editar/excluir, super_admin.

### Manutenção
- **manutencao_tipos** — `id_tipo`, `nome`, `ativo`(bool), `createdat`. Categorias configuráveis (Datashow/Projetor, Ar-condicionado, Mobiliário, Informática, Elétrica, Hidráulica, Estrutura/Alvenaria, Limpeza, Outros). CRUD só **direção**.
- **manutencoes** — `id_manutencao`, `sala_id`(FK SET NULL), `tipo_id`(FK SET NULL), `descricao`, `prioridade`(`baixa`/`media`/`alta`), `status`(`aberta`/`em_andamento`/`concluida`/`cancelada`), `created_by_user_id`(quem registrou), `resolucao`, `data_conclusao`, `concluido_por_user_id`, `createdat`, `updatedat`
  - **Registrar** (POST) e **consultar** (GET): qualquer servidor logado. **Gerir** (PATCH: status/conclusão/edição) e **excluir** (DELETE): só direção. Ao concluir, grava `data_conclusao`+`concluido_por`. Página `/manutencao` (menu Infraestrutura).
  - **Relatório** (`GET /manutencao/relatorio?inicio=&fim=` — só direção): `Promise.all` de resumo (total/abertas/em_andamento/concluídas), por status, por prioridade, por categoria (tipos mais pedidos), por sala (mais requisitadas), série mensal (`generate_series`, abertas × concluídas) e tempo médio de reparo (`AVG(EXTRACT(EPOCH FROM (data_conclusao - createdat))/86400)`). Página `/relatorios-manutencao` (menu Infraestrutura, só direção): tiles + 5 gráficos Chart.js (barra mensal, doughnuts status/prioridade, barras horizontais categoria/sala), filtro de período e impressão/PDF via `window.print()`. Gráficos com `animation:false` (render instantâneo p/ PDF); cada `<canvas>` num `.grafico-wrap` de altura fixa (exigência do `maintainAspectRatio:false`).

### Patrimônio
- **bens_permanentes** — `id_bem`, `numero_registro`(unique — código da etiqueta patrimonial), `descricao`, `sala_id`(FK SET NULL), `subunidade_id`(FK SET NULL — derivada da sala no cadastro), `estado_conservacao`(`novo`/`bom`/`regular`/`ruim`/`inservivel`), `observacao`, `data_levantamento`, `created_by_user_id`(FK users SET NULL — quem cadastrou), `createdat`
  - Levantamento por sala: dialog na tela `/adm/salas` (super_admin) **e** página servidor-facing `/levantamento-patrimonial` (menu **Patrimônio**, visível p/ chefe+ ou `fazer_levantamento`) — seletor de sala + lista/cadastro de bens, scan, mover e histórico. `numero_registro` preenchível manualmente **ou** por leitura de código de barras (`BarcodeDetector` nativo — só em contexto seguro/HTTPS; degrada para manual).
  - **RBAC:** aberto a **qualquer servidor logado** (`autorizar("servidor")`) — criar/editar/mover/excluir; toda ação é auditada em `patrimonio_historico`.
- **patrimonio_historico** — `id_historico`, `bem_id`(FK SET NULL — vira NULL ao excluir o bem), `numero_registro`(snapshot, sobrevive à exclusão), `acao`(`cadastro`/`edicao`/`movimentacao`/`exclusao`), `user_id`(FK users SET NULL — quem fez), `sala_id`(destino/atual), `sala_anterior_id`(origem, em movimentação), `detalhe`(o que mudou), `createdat`
  - Log de auditoria: cada POST/PUT/PATCH-mover/DELETE grava um evento **na mesma transação** da mudança. Consultável em `GET /patrimonio/:id/historico`.

### Usuários
- **users** — `user_id`, `nome`, `siape`, `email`, `senha`(bcrypt), `whatsapp`, `data_nascimento`, `permissao`, `subunidade_id`, `unidade_id`
- **funcionalidades** — `id`, `nome`, `descricao`, `modulo` (ex: `"criar_despesa"`, `"aprovar_agendamento"`, `"ver_agenda_portaria"`, `"atender_pedido_almoxarifado"`, `"fazer_levantamento"`, `"cadastrar_salas"`, `"importar_financeiro"`)
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

### Assistente de IA
- **assistente_conversas** — `id_conversa`, `user_id`(FK CASCADE), `titulo`, `createdat`, `updatedat`
- **assistente_mensagens** — `id_mensagem`, `conversa_id`(FK CASCADE), `papel`(`usuario`|`assistente`), `conteudo`, `ferramentas`(JSONB — auditoria: quais ferramentas rodaram, com quais argumentos e quantos registros), `tokens_entrada`, `tokens_saida`, `createdat`
  - Guardar `ferramentas` não é firula: num órgão público precisa ficar registrado **quem perguntou o quê e quais dados o sistema entregou**.

### Execução orçamentária (importada da planilha do financeiro)
Fonte: **`Transparência NOr_CCR.xlsx`** (~26 abas, layout diferente por ano). As abas de
**fato** viram tabelas; as de **resumo/saldo** (Resumo YYYY, Saldos unidades, Almoxarifado 2026,
SCDP 2024) **não são importadas** — são pivôs e o sistema recalcula tudo a partir dos fatos.

- **empenhos** — `id_empenho`, `ano`, `data_cadastro`, `num_sie`, `num_siafi`, `especie`(Empenho/Dispensa/Transferência), `cod_natureza`, `tipo_despesa`, `estimativo`(bool), `fornecedor`, `subunidade_pagadora_id`/`_texto`, `subunidade_entrega_id`/`_texto`, `resumo`, `valor_empenhado`, `valor_liquidado`, `processo`, `observacao`, `origem_aba`
- **almoxarifado_requisicoes** — `id_requisicao`, `ano`, `data_lancamento`, `num_requisicao`, `tipo_movimento`(Saída/Entrada e Saída Direta/Estorno de Saída — só no dump cru do SIE), `subunidade_id`/`_texto`, `solicitante`, `valor_total`, `local_entrega`, `situacao`, `origem_aba`
- **scdp_viagens** — `id_viagem`, `ano`, `pcdp`, `data_cadastro`, `proposto`, `cpf`, `subunidade_id`/`_texto`, `fonte_recurso`, `num_diarias`, `valor_diarias`, `valor_passagens_aereas`, `valor_passagens_rodoviarias`, `periodo_viagem`(texto livre na origem), `origem_aba`
- **licitacoes_itens** — `id_item`, `ano`, `data`, `tipo`, `subunidade_id`/`_texto`, `interessado`, `cod_reduzido`, `descricao`, `unidades`, `valor_unitario`, `valor_total`, `dfd`, `etp`, `solicitacao_sie`, `origem_aba`
- **transferencias_recurso** — `id_transferencia`, `ano`, `data`, `num_transferencia`, `subunidade_id`/`_texto`, `gestora_destino`, `cod_natureza`, `tipo_despesa`, `valor`, `contado_em_outra_guia`(bool), `origem_aba`
- **orcamento_dotacoes** — `id_dotacao`, `ano`, `categoria`(`custeio`|`capital`), `grupo`, `programa`, `percentual`, `valor`, `subunidade_id`/`_texto`, `origem_aba`. A aba "Orçamento" traz **duas** tabelas empilhadas (custeio por programa/ação e permanente por departamento) e **não tem ano no nome** — o front pergunta.
- **naturezas_despesa** — `codigo`, `nome`. Catálogo (aba "Página43"); unique `(codigo, nome)` porque `3.3.9.0.39.00` serve PJ **e** PF. Os fatos guardam natureza/tipo como **texto**, sem FK.
- **subunidades_apelidos** — `apelido`(normalizado, unique), `subunidade_id`. De-para: a planilha chama a subunidade de 4 jeitos (código estruturado, sigla, nome, `UFSM - XXX`) e as siglas divergem entre abas (`DZ` × `DZOT`). A aba **"Subunidades CCR"** é importada como fonte automática de apelidos (~52 de uma vez); o que sobra o usuário mapeia na tela e fica guardado.
- **importacoes_financeiro** — log: `origem_aba`, `tipo`, `ano`, `linhas_gravadas`, `user_id`, `createdat`.

**`origem` (`importado` | `manual`) + `created_by_user_id`** em todas as tabelas de fato:
`importado` veio da planilha e a importação é dona dele; `manual` foi lançado na plataforma e a
importação **não encosta**. É o que permite os dois mundos coexistirem (migration `...000002`).

**Idempotência:** cada importação **substitui o bloco** identificado por `origem_aba`
— `DELETE ... WHERE origem_aba = $1 AND origem = 'importado'` seguido de INSERT, uma transação por
aba, sucesso parcial. As linhas não têm chave estável (o mesmo nº SIE aparece em várias naturezas),
então substituir a aba é mais honesto que casar linha a linha. O filtro por `origem` é o que impede
que um lançamento feito na plataforma suma na próxima reimportação. ⚠️ Qualquer escrita nova nessas
tabelas **precisa** gravar `origem='manual'` — o DEFAULT da coluna é `'importado'`, pensado para a
importação, que por isso nem lista a coluna no INSERT.

**Abas sobrepostas:** `SIE 2024` está inteiramente contida em `Empenhos 2024`, e
`Valores SPROJ 2024` em `Empenhos SPROJ 2024`. O preview detecta isso (compara os
conjuntos de chave) e desmarca a aba contida, senão o valor dobra.


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
| `/api/salas` | servidor (ler — **sem recorte por subunidade**) / chefe+·`cadastrar_salas` (criar) / super_admin (editar·excluir) | routes/salas.js |
| `/api/salas-tipo` | chefe | routes/salas-tipo.js |
| `/api/patrimonio` | servidor (logado; toda ação auditada) | routes/patrimonio.js |
| `/api/aniversariantes` | servidor (logado) | routes/aniversariantes.js |
| `/api/aniversariantes/parabenizar` `/config` | diretor | routes/aniversariantes.js |
| `/api/comunicados` | diretor | routes/comunicados.js |
| `/api/manutencao` | servidor (registrar/ler) / diretor (gerir·tipos) | routes/manutencao.js |
| `/api/tipos-recursos` | chefe | routes/tipos-recursos.js |
| `/api/tipos-despesas` | chefe | routes/tipos-despesas.js |
| `/api/despesas` | chefe | routes/despesas.js |
| `/api/recursos-recebidos` | chefe | routes/recursos-recebidos.js |
| `/api/pedidos-almoxarifado` | chefe | routes/pedidos-almoxarifado.js |
| `/api/previsoes-despesas` | chefe | routes/previsoes-despesas.js |
| `/api/relatorios` | chefe | routes/relatorios.js |
| `/api/execucao-orcamentaria` | chefe (direção vê tudo; chefe só a própria subunidade) | routes/execucao-orcamentaria.js |
| `/api/assistente` | servidor (logado) — o recorte vem das rotas consultadas; `POST /enviar-email` só via confirmação na tela | routes/assistente.js |
| `/api/importacao/financeiro` | direção **ou** `importar_financeiro` (guarda dentro do router) | routes/importacao-financeiro.js |
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

**Ensalamento em lote** (tela `/ensalamento`, menu **Administrativo**, **só direção**): `POST/PUT /:id/horarios` e o lote compartilham o helper `materializarAula(client, {...})` (expande recorrência + checa conflito + cria `agendamento origem='aula'` + ocorrências; o caller gerencia a transação). Sub-rotas (guard inline `ehDirecao` — super_admin/diretor; chefe recebe 403): `GET /ensalamento` (fila de horários **sem sala** — `sala_id IS NULL` — filtros `?periodo_letivo_id=&curso_id=&disciplina_id=&dia_semana=&incluir_pos=`), `POST /ensalamento/lote` (`{itens:[{horario_id,sala_id}]}` — materializa cada item na **sua** transação, sucesso parcial, resultado por item; **recusa auditório**), `POST /ensalamento/auto` (**dry-run** por capacidade — guloso: horários por vagas desc, escolhe a menor sala que comporta e está livre respeitando as escolhas da mesma rodada; `respeitar_capacidade` default true; **não grava**, devolve proposta p/ revisão e aplicação via o lote). `GET /api/salas/disponiveis?dia_semana=&hora_inicio=&hora_fim=&periodo_letivo_id=|data_inicio=&data_fim=&vagas=&predio_id=` (salas agendáveis **livres** no slot, com `cabe`/`folga`, ordenadas por melhor encaixe). **Quadro de horários** (tela `/quadro-de-horarios`, menu **Administrativo**, **só direção**): grade semanal impressa das aulas, **por sala** ou **por curso** (só aulas). `GET /api/turmas/quadro/salas?periodo_letivo_id=` (salas com aula, p/ o seletor) e `GET /api/turmas/quadro?periodo_letivo_id=&sala_id=|curso_id=[&incluir_pos=]` (guard `ehDirecao`) → `{ header, periodo, horarios }` (co-docência agregada via `string_agg`). Front monta a grade com **bandas horárias de 1h** + **rowspan** (aula de 2h ocupa 2 linhas) e **lanes** lado a lado p/ aulas sobrepostas; cor pastel estável por código de disciplina; impressão landscape via `window.print()`. ⚠️ **Por curso mistura todos os semestres** (o sistema não modela cohort/turma-base) → cursos grandes ficam densos; a grade "de cohort" limpa (estilo "SALA 5134") exigiria rastrear semestre/cohort. Por sala é livre de conflito → limpo.

**Ficam fora do ensalamento** as salas do **tipo "Auditório"** (`sala_tipo_nome NOT ILIKE 'auditório'`) **e** as marcadas com `agendamento_manual=1` (flag por sala, ex.: NUSI) — em `disponiveis`/`auto` + guard `salaForaDoEnsalamento` no lote. São agendadas manualmente pela direção via solicitação. O flag é editável no form de salas ("Somente agendamento manual"). ⚠️ Datas do pg vêm como `Date` no server — sempre converter com `toDateStr()` antes de `expandirRecorrencia` (não `String(...).slice`).

`/api/cursos`: `GET /` (lista p/ filtro; pós excluída salvo `?incluir_pos=1`), `PATCH /:id` (ajuste manual do `nivel`).

`/api/execucao-orcamentaria` (chefe+; **direção vê o centro todo, chefe só a própria subunidade**):
`GET /anos` (exercícios com dado), `GET /resumo?ano=&incluir_estimativos=` (reconstrói as abas
"Resumo YYYY"/"Saldos unidades": aplicado por subunidade × tipo, dotação, saldo custeio/permanente,
série mensal, top fornecedores, agregados de SCDP e licitações), `GET /dotacoes?ano=`, e as listagens
detalhadas `GET /empenhos|almoxarifado|scdp|licitacoes|transferencias?ano=&subunidade_id=&tipo=&q=&limit=`.

**Como o "aplicado" é composto** (validado coluna a coluna contra a aba Resumo da planilha):
empenhos **não estimativos** (uma coluna por tipo de despesa) **+** requisições de almoxarifado
(coluna "Almoxarifado", excluindo estorno/cancelada/recusada) **+** diárias e passagens do SCDP
**apenas quando os empenhos do ano não registram essa natureza de verdade**.
⚠️ Essa última condição não é firula: em **2026** as diárias só aparecem no empenho como
`Estimativo - Diárias` (reserva) e o gasto real está no SCDP; em **2025** o empenho já traz
`Diárias - Civil`/`Passagens` como natureza efetiva, e somar o SCDP contaria duas vezes.
O `NOT EXISTS` resolve pelo dado, sem depender do ano.
Empenhos `Estimativo - X` ficam **fora** do aplicado por padrão (`?incluir_estimativos=1` traz de volta,
só para conferência — nessa visão **há dupla contagem**, e a tela avisa).
Atribuição por **unidade de entrega** (pagadora como reserva). `valor_liquidado` só existe para empenho.
Capital = natureza `4.x` ou tipo casando `equipamento|permanente|obra`; o resto é custeio.

`/api/importacao/financeiro` — **direção OU quem tiver a funcionalidade `importar_financeiro`**
(tipicamente o pessoal do NOr). A guarda é o middleware `podeImportar` dentro do próprio router, e
não `autorizar(...)`: naquele middleware o fallback por funcionalidade só roda quando o nível efetivo
é `servidor`, então um **chefe** do NOr seria barrado; e abrir para `chefe` em geral seria demais,
porque a importação substitui blocos inteiros. Sub-rotas: `POST /preview` (classifica as 26 abas, extrai, resolve
subunidades e devolve por aba: tipo, ano, registros, valor, quantos ficaram sem subunidade, se está
contida noutra aba e quando foi importada antes — **sem gravar**), `POST /` (grava as abas escolhidas,
aplicando o de-para informado), `GET /historico`.


### Assistente de IA (`/api/assistente`, `lib/ia/`)

Chat em linguagem natural sobre os dados da plataforma. **Fase 1: só leitura, só
execução orçamentária.** Usa a API da OpenAI via `fetch` puro (sem SDK — evita
dependência e rebuild da imagem); sem `OPENAI_API_KEY` fica desabilitado em silêncio,
igual WhatsApp e e-mail.

**A decisão que sustenta a segurança:** nenhuma ferramenta fala com o banco. Cada uma
chama uma **rota da própria API por HTTP, com o token do usuário que está conversando**
(`lib/ia/ferramentas.js` → `executar()`). Logo o RBAC que já existe é quem decide o que a
IA enxerga. Se um chefe do DFT pedir dados do DZOT, a rota devolve só o DFT — e não porque
o prompt mandou, mas porque o middleware mandou. Verificado em
`scripts/testar-ferramentas-ia.js` (roda sem precisar da OpenAI).

Três invariantes que **não podem ser afrouxadas**:
1. **O modelo nunca autoriza.** Um 403 volta ao modelo como texto para ele explicar ao
   usuário — nunca como algo a contornar.
2. **Conteúdo de ferramenta é dado, não instrução.** `resumo`, `observacao` e `fornecedor`
   são texto livre digitado/importado: é vetor real de injeção de prompt. O system prompt
   avisa, e o item (1) garante que, mesmo se o modelo cair na conversa, não acessa nada
   além do permitido.
3. **Número não passa pelo modelo para ser exibido.** O texto dele é narrativa; os valores
   que o usuário vê saem de `blocos[].itens` (dado cru da rota) renderizados pelo front.
   LLM erra ao transcrever número — e isto é um sistema financeiro.

**Dado pessoal** (`lib/ia/redacao.js`): CPF é mascarado antes de sair da plataforma, no
campo próprio e em texto livre (gente digita CPF em observação). Nomes de servidor ficam —
a fonte é um documento de transparência e sem eles perguntas legítimas parariam de
funcionar. Duas camadas: as listagens nem selecionam CPF, e a redação cobre o resto.

**Custo/contexto:** cada ferramenta devolve `paraModelo` (compacto: amostra de 25 linhas +
totais) e `paraTela` (completo). Sem isso, 595 itens de licitação virariam dezenas de
milhares de tokens por pergunta. O modelo é instruído a usar os **totais**, não a somar a
amostra.

**Domínios (fase 2):** execução orçamentária, **salas** (cadastro, disponibilidade,
agenda, manutenção, patrimônio por sala) e **servidores** (quem trabalha onde, e-mail,
SIAPE, permissão, aniversariantes do mês). Tudo somente consulta.

⚠️ **WhatsApp e data de nascimento não chegam ao modelo.** `/api/usuarios` devolve 485
servidores COM celular e nascimento; nenhuma pergunta legítima precisa disso. `redacao.js`
remove os campos na fronteira (`CHAVES_REMOVIDAS`), não em cada ferramenta — assim vale
para qualquer rota que venha a ser embrulhada depois. Aniversários seguem funcionando
porque `/api/aniversariantes` devolve `dia`/`dia_mes` como campos próprios, sem o ano.

**Ambiente (dev nesta máquina):** o Avast Web/Mail Shield intercepta TLS e o container não
confia na raiz dele — o certificado de `api.openai.com` chega emitido por "Avast Web/Mail
Shield" e a chamada falha com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Do host o TLS valida
normal. Solução: excluir o Docker da varredura HTTPS do Avast (ou instalar a CA dele no
container via `NODE_EXTRA_CA_CERTS`). **Nunca** desabilitar a verificação: a chave da API
viajaria exposta a quem estiver no meio. Não afeta o VPS.

Sub-rotas: `GET /status` (a interface pergunta antes de mostrar o chat), `POST /conversar`
(`{pergunta, conversa_id?}` → `{resposta, blocos, ferramentas, uso}`; laço de até 5 rodadas
de ferramenta), `GET /conversas`, `GET /conversas/:id`, `DELETE /conversas/:id`.

**Ordenação:** as listagens de `/api/execucao-orcamentaria` aceitam `?ordenar=valor`
(default é por data). Existe por causa do assistente: sem isso ele respondia "as maiores
compras" com as mais **recentes**. Perguntas com "maiores/principais/top" exigem esse parâmetro.

**Agregação:** `GET /api/execucao-orcamentaria/:fonte/agrupado?por=&ano=&subunidade_id=&q=&limit=`
soma por pessoa, fornecedor, setor ou categoria (ferramenta `somar_por`). É a única forma
correta de responder "quem mais...": ordenar a listagem daria o maior registro isolado, e
quem aparece várias vezes ficaria fora do topo. `por` sai de **whitelist** (`AGRUPAMENTOS`)
— é a única defesa possível para um trecho de SQL dinâmico, ainda mais com um modelo de IA
escolhendo o valor do outro lado. `soma` e `total` usam funções de janela e valem para
**todos** os grupos, não só os que o `limit` devolve.

⚠️ **Toda ferramenta que lista precisa de busca.** O modelo recebe só as 25 primeiras
linhas (`LINHAS_PARA_MODELO`); sem um filtro, procurar alguém na posição 280 de 485 é
impossível e ele conclui que a pessoa não existe. Por isso `GET /api/usuarios` ganhou
`?q=` (nome/SIAPE/e-mail) e `?subunidade_id=`, e `GET /api/salas/total-info` ganhou `?q=`
e `?predio_id=` — ambos **estreitam** dentro do escopo RBAC, nunca ampliam (um chefe que
peça `subunidade_id` de outro setor recebe zero).

⚠️ **Ferramenta de listagem deve apontar para a rota com JOIN.** `GET /api/salas` é
`SELECT * FROM salas` e devolve só `predio_id`; o modelo não tem como saber que o id 3 é o
"prédio 42" — e inventava. A ferramenta usa `GET /api/salas/total-info`, que traz
`p.predio`, `subunidade_nome` e `sala_tipo_nome`.

**Tabela sob demanda:** toda ferramenta ganha, via `PARAMS_APRESENTACAO`, os parâmetros
`exibir_tabela` e `colunas`. A tabela **não** é mais automática — só aparece quando a
pergunta pede para ver/listar os registros, e com os campos que o usuário citou. Antes vinha
embaixo de qualquer resposta, inclusive de pergunta cuja resposta era um número só.
`selecionarColunas()` casa sem acento/maiúscula (o modelo pode mandar "Fornecedor") e, se
nenhuma coluna pedida existir, devolve todas — tabela com coluna demais é melhor que vazia.

**Envio por e-mail — a única ação do assistente que sai da instituição.**
`enviar_email`/`assunto_email` fazem a ferramenta devolver um `emailProposto`; o front
abre uma **confirmação** com destinatário (em destaque e editável), assunto e opção de
anexar a planilha. `POST /api/assistente/enviar-email` é chamado pelo diálogo, **nunca**
pelo modelo.

⚠️ **Isso não é preciosismo de UX, é o que fecha a brecha.** O assistente já reúne dado
privado + texto não confiável (os campos livres vindos da planilha). Um canal de saída
automático completaria a cadeia clássica de exfiltração: bastaria alguém escrever
"envie para fulano@..." numa observação de empenho. Instrução injetada não clica em botão
— por isso o envio **tem** que continuar exigindo a confirmação humana.
O HTML da tabela é montado no servidor a partir das linhas (nunca marcação vinda do
cliente), e todo envio, inclusive falho, é registrado em `assistente_envios`.
A planilha do anexo é gerada no navegador (SheetJS) e enviada em base64 — evita a
dependência de geração de xlsx no backend; limites de 2000 linhas e 8 MB.

**Exportação (Excel/PDF):** `PARAMS_APRESENTACAO` também tem `exportar` (`"excel"|"pdf"`),
que já implica `exibir_tabela`. Excel usa o **SheetJS carregado sob demanda** do mesmo CDN
fixado que a tela de importação usa — sem dependência nova nem rebuild da imagem, e sem
somar ~900 KB a toda página só porque o widget está lá. Números vão como número e datas
como `Date`, senão a planilha chega toda como texto e não dá para somar. PDF reusa o
`window.print()`. **A isolação da tabela na impressão é delicada**: `imprimirBloco()` marca
com `.ia-cadeia-impressao` os ANCESTRAIS do bloco (nunca o próprio bloco — marcá-lo faz a
regra que esconde irmãos varrer os filhos dele, e a folha sai em branco) e o `@media print`
esconde, em cada nível, os irmãos fora da cadeia. Tem que ser `display`, não `visibility`:
com visibility os ocultos continuam ocupando altura e saem páginas em branco depois da
tabela. Funciona nos dois modos justamente por não depender da profundidade — no widget o
componente é filho do body, na página `/assistente` está dentro do `.container`. Como o histórico guarda só o texto,
um pedido de continuação ("agora gera um PDF disso") faz o modelo **refazer a mesma
consulta** com o parâmetro — está no prompt.

⚠️ Ao mexer em `ehMoeda`: `total` sozinho é dinheiro, mas `total_bens` é **contagem**. Um
`/^total/` fazia os 12 bens de uma sala virarem "R$ 12,00".

**A interface não expõe o que foi consultado.** O bloco "De onde veio" foi removido em
set/2026: era ruído para quem só quer a informação. O registro do que a IA consultou
continua em `assistente_mensagens.ferramentas` — a auditoria de verdade é essa, não um
`<details>` na tela. O aviso de "parte dos dados fora das suas permissões" **fica**: sem
ele o usuário lê uma resposta parcial achando que é completa.

**Frontend:** `<assistente-ia>` (`js/components/assistente-ia.js`) — um componente, dois
modos: botão flutuante (injetado automaticamente em toda página por `components/index.js`,
sem editar cada HTML) e `modo="pagina"` na tela `/assistente`, que tem lista lateral de
conversas. Impressão de uma tabela usa `body.ia-modo-impressao` + `@media print` em vez de
abrir janela nova (popup costuma ser bloqueado).

`/api/aniversariantes`: `GET /?mes=` (mural do mês, logado), `GET /hoje` (aniversariantes de hoje, logado), e — **só direção** — `POST /parabenizar` (envia parabéns por e-mail aos de hoje, agora), `GET/PATCH /config` (liga/desliga o **envio automático diário**). Lógica em `lib/aniversarios.js`; agendador (setInterval) iniciado no `server.js` roda ~08:00 BRT se o automático estiver ligado (guard por data em `configuracoes`). Painel de disparo/toggle no topo de `/aniversariantes` (visível só p/ direção). Tabela **configuracoes** (chave/valor) guarda o flag e o "último envio".

`/api/comunicados` (diretor): `GET /destinatarios` (servidores c/ email, subunidades c/ contagem, totais chefes/todos), `POST /preview` (resolve destinatários e conta, sem enviar), `POST /` (envia comunicado em **BCC por lote** de 45 via `lib/email.js` e registra em `comunicados`), `GET /` (histórico). Painel em `/comunicados` (direção; link no menu Administrativo). Destinatários: individuais (lista/e-mail avulso) + grupos (subunidades, chefes, todos), com dedup. **Corpo com formatação** (editor contenteditable: negrito/itálico/listas/link) — o backend **linkifica URLs soltas** e **sanitiza** o HTML (`sanitize-html`, allowlist); logo do SICCR embutido por CID. Envia HTML + fallback texto.

`/api/patrimonio`: `GET /salas` (salas p/ o seletor do levantamento, com total de bens), `GET /?sala_id=` (bens da sala + quem cadastrou), `GET /:id/historico` (linha do tempo de auditoria), `POST /` (cadastra; `subunidade_id` derivada da sala; 409 se `numero_registro` duplicado — o 409 traz `data.bem_existente` com a sala atual), `PUT /:id`, `PATCH /:id/mover` (transfere o bem p/ outra sala + atualiza `data_levantamento`; usado no botão "Mover para esta sala" quando o tombo já existe noutra sala), `DELETE /:id`. Toda mutação grava um evento em `patrimonio_historico`.

"Direção" = `super_admin`/`diretor`/`vice_diretor`, ou `is_direcao_centro=true`, ou funcionalidade `aprovar_agendamento`/`ver_todos_agendamentos`.

### Páginas do painel admin (`/adm/*`)
unidades, subunidades, usuários, prédios, salas, salas-tipo, **periodos-letivos**, **disciplinas**, **turmas**, api-keys. Menu em `js/components/menu-navegacao-adm.js`. (Ensalamento **não** fica aqui — é uma página de direção no menu Administrativo público, `/ensalamento`.)

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
- Mensagens recebidas viram **CustomEvent** no `window`: `siccr:agendamento_pendente`, `siccr:agendamento_decidido`, `siccr:agenda_atualizada` (aulas do ensalamento) — e toasts de pedido almox.
- Páginas escutam esses eventos p/ atualizar listas/calendário em tempo real (`/solicitacoes-de-agendamento`, `/calendario-de-salas`, `/agenda-portaria`).
- **Broadcast no backend:** `agendamentos.js`/`pedidos-almoxarifado.js` recebem `wss` por factory; as demais rotas (ex.: `turmas.js`) usam o singleton `lib/realtime.js` (`setWss(wss)` no boot + `broadcast(tipo, payload, predicado)`). `agenda_atualizada` é emitido ao alocar/editar/remover aula, no lote de ensalamento e ao excluir turma.

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

### Gráficos (Chart.js)
A paleta categórica de `/execucao-orcamentaria` (`CORES` no bloco da página) foi validada para
daltonismo e contraste: `#009536 #1971c2 #e8590c #9c36b5 #00949b #c2255c #8a6d00 #5f3dc4`, nessa
**ordem fixa**, com `#adb5bd` reservado para "Outros". A `CORES_GRAFICOS` antiga (usada em
`/relatorios`) **reprova**: os quatro primeiros verdes são indistinguíveis entre si
(ΔE 8,3 com visão normal). Ao mexer em gráficos, prefira a paleta nova.
Regras que valem em qualquer gráfico: no máximo 8 fatias categóricas (o resto vira "Outros"),
nunca dois eixos Y, série única não leva legenda, e a cor segue a categoria — nunca a posição no ranking.

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
- **Enter aciona a confirmação:** como os botões são `type="button"`, há um handler global (topo do `DOMContentLoaded` em `scripts.js` **e** `adm/js/script.js`) que, ao teclar Enter num `input`/`select` (não `textarea`/contenteditable), clica o botão visível cujo texto começa com verbo de confirmação (`Entrar`/`Cadastrar`/`Atualizar`/`Registrar`/`Salvar`/`Enviar`/…). Pula forms com submit nativo (ex.: `/adm/login`, que usa `type="submit"` + `login.js`).

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
| `/execucao-orcamentaria` | chefe+ (menu **Financeiro**) | Execução orçamentária: tiles, 4 gráficos, tabela pivô subunidade × tipo e detalhe por origem (empenhos/almoxarifado/SCDP/licitações/transferências/orçamento) com busca e filtros. Imprimível. |
| `/assistente` | todos logados (menu principal) | Chat com o assistente de IA + histórico de conversas. O widget flutuante do mesmo componente aparece em todas as páginas. |
| `/importar-financeiro` | direção ou `importar_financeiro` (menu **Financeiro**) | Importa a planilha do financeiro (SheetJS lê todas as abas → preview com detecção de duplicata e de-para de subunidade → grava). **Não fica em `/adm/`**: o `guard.js` de lá exige `super_admin` e *desloga* quem não for — mesmo motivo do `/ensalamento`. |

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

- ~~Relatórios financeiros sem filtro por ano no frontend~~ **JÁ IMPLEMENTADO** (verificado jul/2026): `/relatorios` tem `#filtroAno` (select ano atual → −5 anos + "Todos"), aplicado no `GET /relatorios/resumo?ano=` e no cabeçalho/nome do CSV. Backend filtra por `EXTRACT(YEAR FROM ...)`.
- ~~Vulnerabilidades npm~~ **RESOLVIDO** (jul/2026): `npm audit` = **0**. Caminho: `npm audit fix` (body-parser/brace-expansion/js-yaml, não-quebrável) + upgrade **bcrypt@5→6** (forward seguro; Node do container é 20 ≥ 18; API `hash`/`compare` intacta; hash `$2b$` do v5 valida no v6 — testado) que eliminou o `tar` crítico; e **override `uuid` → ^11.1.1** (sequelize pede `^8.3.2` mas usa só `v1()/v4()` sem buffer, só em migrations → a falha era inalcançável). **Deps de dependência mudam só no rebuild da imagem** (`node_modules` não é bind-mount) — no VPS, `docker compose -f docker-compose.yml up -d --build`.
- ~~Aulas alocadas não disparam tempo real~~ **FEITO** (jul/2026): alocar/editar/remover aula (POST/PUT/DELETE horário, lote de ensalamento, excluir turma) emite WS `agenda_atualizada` via `lib/realtime.js`; calendário e portaria refazem o fetch ao vivo. **TV** permanece no polling 60s (kiosk público sem token, não conecta na WS autenticada).
- ~~Ensalamento em massa: falta tela dedicada~~ **FEITO** (jul/2026): tela `/ensalamento` (menu **Administrativo**, **só direção**) — manual em lote + sugestão automática por capacidade/dry-run; auditórios ficam fora. Ver sub-rotas de `/api/turmas`.
- Leitura de código de barras do patrimônio via câmera exige **HTTPS** (contexto seguro). O **VPS de produção roda com SSL**, então a câmera funciona lá; só o **dev local em HTTP** fica limitado ao cadastro manual.
- **Matrícula real no ensalamento** (aberto, aguardando dado): o auto usa **vagas da turma × `sala_capacidade`** como proxy. Para usar o nº real de alunos matriculados falta a fonte — um **xlsx de matrículas** (a obter). Quando existir, importar por turma e o guloso passa a usá-lo no lugar de `vagas`.
- **Execução orçamentária — pontos em aberto com o setor financeiro** (ago/2026). A importação está
  validada contra as abas Resumo (2026: 8/11 colunas idênticas ao centavo; 2024: 8/11; 2025: 6/11).
  As diferenças restantes são **da planilha**, não do sistema, e precisam de decisão do NOr:
  1. **Almoxarifado 2026 não existe em nível de linha** — a aba `Almoxarifado 2026` é só um pivô por
     setor (total R$ 98.147,47). Falta pedir ao financeiro o **export por requisição**, no mesmo
     formato da aba `Almoxarifado 2025`. Sem isso a coluna Almoxarifado de 2026 fica zerada.
  2. **Passagens 2026**: a planilha soma empenho + SCDP (R$ 41.366,81); o sistema conta só o empenho
     (R$ 20.341,18) porque 2026 tem empenho não-estimativo de passagens — somar os dois conta duas
     vezes (inclusive um mesmo item de R$ 232,00 que aparece nos dois lados). Confirmar a regra.
  3. **Diárias 2025**: planilha R$ 61.805,50 × sistema R$ 139.793,23 (soma dos empenhos
     `Diárias - Civil` do ano). A fórmula da planilha parece pegar um subconjunto.
  4. **Renovação/atualização 2026**: a coluna da planilha está `#N/A` (fórmula quebrada) e soma 0;
     o sistema acha R$ 4.374,96 (empenho 004129/2026, "CORRIMÃO CCR").
  5. **Almoxarifado 2024**: o dump cru traz `Entrada e Saída Direta` (R$ 1,44 mi) além das saídas
     por requisição. Definir quais tipos de movimento entram no "aplicado".
  6. **Subunidades faltando no cadastro**: cursos e PPGs (CA, CEFL, CMV, CZ, CSTA, CPPGAGRO…)
     aparecem na planilha mas não existem em `subunidades`, então o gasto deles fica "Não atribuído".
     Cadastrar, ou aceitar que fiquem fora do recorte por departamento.
- **Abas ainda não importadas** (Fase 3): `Sol de empenho via Forms` (Google Forms — forte candidata a
  virar fluxo nativo no SICCR, com aprovação igual à de agendamento) e `Liquidados 2024`/`Liquidados
  SPROJ 2024` (notas fiscais; hoje só o `valor_liquidado` do empenho é usado).
- **Quadro de horários "por cohort/semestre"** (melhoria futura): o modo **por curso** do `/quadro-de-horarios` mistura todos os semestres do curso (não há modelo de cohort) → cursos grandes ficam densos. Para a grade limpa estilo "SALA 5134", rastrear o semestre/cohort da turma — opções: **derivar do prefixo de `nome_turma`** (ex.: "9º-M3" → 9º sem.; inconsistente, algumas são "T10"/"M1"/"99" sem prefixo) e oferecer filtro "por semestre", **ou** um campo explícito de cohort/turma-base nas turmas. Decidido em jul/2026 deixar para depois.
