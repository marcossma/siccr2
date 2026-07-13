// server.js - arquivo principal do servidor
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}
const express = require("express");
const http = require("http");
const crypto = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger.js");

// Importar rotas dos usuários
const usuariosRoutes = require("./routes/usuarios.js");
// Importar rotas de autenticação
const usuariosAuth = require("./routes/usuariosAuth.js");
// Importar rotas para unidades
const unidadesRoutes = require("./routes/unidades.js");
// Importar rotas para prédios
const prediosRoutes = require("./routes/predios.js");
// Importar rotas para subunidades
const subunidadesRoutes = require("./routes/subunidades.js");
// Importar rotas para salas
const salasRoutes = require("./routes/salas.js");
// Importar rotas para tipos de salas
const salasTipoRoutes = require("./routes/salas-tipo.js");
// Importar rotas para tipos de recursos
const tiposRecursos = require("./routes/tipos-recursos.js");
// Importar rotas para tipos de despesas
const tiposDespesas = require("./routes/tipos-despesas.js");
// Importar rotas para despesas
const despesas = require("./routes/despesas.js");
// Importar rotas para recursos recebidos
const recursosRecebidos = require("./routes/recursos-recebidos.js");
// Importar rotas para previsões de despesas
const previsoesDespesas = require("./routes/previsoes-despesas.js");
// Importar rotas para relatórios
const relatorios = require("./routes/relatorios.js");
// Importar rotas para funcionalidades e permissões
const funcionalidades = require("./routes/funcionalidades.js");
const permissoesUsuario = require("./routes/permissoes-usuario.js");
// Importar rotas do módulo acadêmico
const periodosLetivos = require("./routes/periodos-letivos.js");
const disciplinas = require("./routes/disciplinas.js");
const turmas = require("./routes/turmas.js");
const cursos = require("./routes/cursos.js");
const patrimonio = require("./routes/patrimonio.js");
const aniversariantes = require("./routes/aniversariantes.js");
// Importar rota de importação de dados (super_admin)
const importacao = require("./routes/importacao.js");
// Importar rota pública do painel de TV (hall dos prédios)
const painelTv = require("./routes/painel-tv.js");
// Importar rotas para notícias (proxy WordPress)
const noticias = require("./routes/noticias.js");
// Importar rotas para eventos (scraping WordPress)
const eventos = require("./routes/eventos.js");
// Importar middleware de autenticação
const autenticar = require("./middlewares/auth.js");
// Importar middleware de autorização RBAC
const { autorizar } = require("./middlewares/autorizar.js");

// Porta do servidor
const PORT = process.env.PORT || 15000;

const app = express();
// Limite ampliado (padrão do Express é 100kb) para acomodar importação de
// planilhas grandes enviadas como JSON pelo painel admin.
app.use(express.json({ limit: "25mb" }));

// Request logger: adiciona req.log com contexto (request_id, método, rota, status, latência)
app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:15000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key"]
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "https://www.ufsm.br", "data:"],
            "script-src": ["'self'", "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            // WebSocket de notificações em tempo real (mesmo host: ws:// em HTTP, wss:// em HTTPS).
            // 'self' cobre a mesma origem; ws:/wss: garantem o WebSocket em ambos os esquemas.
            "connect-src": ["'self'", "ws:", "wss:"],
            // Desabilita upgrade automático para HTTPS — o sistema é servido em HTTP na rede interna
            "upgrade-insecure-requests": null,
        },
    },
    // Strict-Transport-Security só faz sentido em sites HTTPS; desabilitado pra evitar problemas em LAN
    strictTransportSecurity: false,
}));

// ────────────────────────────────────────────────────────────
//  Criar servidor HTTP e WebSocket antes de registrar rotas
//  (necessário para passar wss ao factory de pedidos)
// ────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Autenticação WebSocket via token enviado na primeira mensagem
wss.on("connection", (ws) => {
    ws.autenticado = false;

    // Timeout: se não autenticar em 10s, encerra
    const authTimeout = setTimeout(() => {
        if (!ws.autenticado) ws.terminate();
    }, 10000);

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.tipo === "auth" && msg.token) {
                const usuario = jwt.verify(msg.token, process.env.JWT_SECRET);
                ws.usuario = usuario;
                ws.autenticado = true;
                clearTimeout(authTimeout);
                ws.send(JSON.stringify({ tipo: "auth_ok" }));
            }
        } catch {
            // Ignora mensagens inválidas
        }
    });

    ws.on("close", () => {
        clearTimeout(authTimeout);
    });
});

// ──────────────────────────────────────────────────────
//  Rotas de pedidos de almoxarifado (recebe wss)
// ──────────────────────────────────────────────────────
const pedidosAlmoxarifadoFactory = require("./routes/pedidos-almoxarifado.js");
const pedidosAlmoxarifado = pedidosAlmoxarifadoFactory(wss);

// ──────────────────────────────────────────────────────
//  Rotas de agendamentos de salas (recebe wss)
// ──────────────────────────────────────────────────────
const agendamentosFactory = require("./routes/agendamentos.js");
const agendamentos = agendamentosFactory(wss);

// ##############
//  Rotas de API
// ##############
app.get("/api/test", (_req, res) => {
    res.status(200).json({
        status: "success",
        message: "Api funcionando!",
        data: ""
    });
});

// Rota para autenticação (pública - sem middleware)
// ##################################################
app.use("/api/auth", usuariosAuth);

// Rota para notícias do CCR (pública - sem middleware)
// #####################################################
app.use("/api/noticias", noticias);

// Rota para eventos do CCR (pública - sem middleware)
// ####################################################
app.use("/api/eventos", eventos);

// Painel de TV nos halls (pública - read-only, sem dados internos sensíveis)
// ##########################################################################
app.use("/api/painel-tv", painelTv);

// Rotas protegidas com autenticação + autorização RBAC
// ######################################################

// Usuários: chefe gerencia seu setor, diretor gerencia centro, super_admin tudo
app.use("/api/usuarios",          autenticar, autorizar("chefe"),       usuariosRoutes);

// Estrutura (unidades, subunidades, prédios)
app.use("/api/unidades",          autenticar, autorizar("diretor"),      unidadesRoutes);
app.use("/api/predios",           autenticar, autorizar("chefe"),        prediosRoutes);
app.use("/api/subunidades",       autenticar, autorizar("chefe"),        subunidadesRoutes);
app.use("/api/salas",             autenticar, autorizar("chefe"),        salasRoutes);
app.use("/api/salas-tipo",        autenticar, autorizar("chefe"),        salasTipoRoutes);

// Financeiro
app.use("/api/tipos-recursos",       autenticar, autorizar("chefe"),        tiposRecursos);
app.use("/api/tipos-despesas",       autenticar, autorizar("chefe"),        tiposDespesas);
app.use("/api/despesas",             autenticar, autorizar("chefe"),        despesas);
app.use("/api/recursos-recebidos",   autenticar, autorizar("chefe"),        recursosRecebidos);
app.use("/api/pedidos-almoxarifado", autenticar, autorizar("chefe"),        pedidosAlmoxarifado);
app.use("/api/previsoes-despesas",   autenticar, autorizar("chefe"),        previsoesDespesas);
app.use("/api/relatorios",           autenticar, autorizar("chefe"),        relatorios);

// Agendamentos de salas: qualquer usuário logado pode solicitar; aprovação restrita por RBAC nas rotas
app.use("/api/agendamentos",         autenticar, autorizar("servidor"),     agendamentos);

// Módulo acadêmico: gestão restrita a chefe+ (coordenação/direção)
app.use("/api/periodos-letivos",     autenticar, autorizar("chefe"),        periodosLetivos);
app.use("/api/disciplinas",          autenticar, autorizar("chefe"),        disciplinas);
app.use("/api/turmas",               autenticar, autorizar("chefe"),        turmas);
app.use("/api/cursos",               autenticar, autorizar("chefe"),        cursos);

// Patrimônio: levantamento de bens por sala — chefe+ sempre; servidor só com a
// funcionalidade 'fazer_levantamento' concedida (nível mínimo chefe + fallback por funcionalidade)
app.use("/api/patrimonio",           autenticar, autorizar("chefe", "fazer_levantamento"), patrimonio);

// Aniversariantes do mês: qualquer usuário logado
app.use("/api/aniversariantes",      autenticar, autorizar("servidor"),     aniversariantes);

// Importação de dados em massa (planilhas) — restrito ao super_admin
app.use("/api/importacao",           autenticar, autorizar("super_admin"),  importacao);

// Funcionalidades: leitura para chefe+, gestão do catálogo apenas via painel super_admin
app.use("/api/funcionalidades",   autenticar, autorizar("chefe"),        funcionalidades);

// Permissões de usuário: chefe concede/revoga permissões aos seus servidores
app.use("/api/permissoes-usuario",autenticar, autorizar("chefe"),        permissoesUsuario);

// API Keys: geração e gerenciamento (super_admin via painel, validação via middleware)
const apiKeysRoutes = require("./routes/api-keys.js");
app.use("/api/api-keys", autenticar, apiKeysRoutes);

// Rotas RPA: autenticação via X-Api-Key (agente Python de almoxarifado)
const autenticarApiKey = require("./middlewares/authApiKey.js");
const rpaFactory = require("./routes/rpa.js");
app.use("/api/rpa", autenticarApiKey, rpaFactory(wss));

// Configurar o uso de arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Configurar rotas amigáveis para o servidor HTTP - Páginas estáticas
app.get("/*", (req, res) => {
    const pagina = req.params[0];
    const filePath = path.join(__dirname, "public", `${pagina}.html`);

    res.sendFile(filePath, (error) => {
        if (error) {
            res.status(404).json({
                status: "error",
                message: "Página não encontrada!"
            });
        }
    });
});

// ────────────────────────────────────────────────────────────
// Handler global de erro (precisa vir DEPOIS das rotas).
// Captura qualquer erro não tratado, loga com contexto e
// devolve resposta consistente.
// ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    (req.log || logger).error(
        { err, route: req.originalUrl, method: req.method, userId: req.usuario?.id },
        "Erro não tratado"
    );
    if (res.headersSent) return;
    res.status(err.status || 500).json({
        status: "error",
        message: "Erro interno do servidor.",
        data: null,
        requestId: req.id || null,
    });
});

// Capturar exceções/rejeições não tratadas no processo (pra evitar morte silenciosa)
process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — encerrando processo");
    process.exit(1);
});

server.listen(PORT, () => {
    logger.info({ port: PORT }, `Servidor rodando na porta http://localhost:${PORT}`);
});
