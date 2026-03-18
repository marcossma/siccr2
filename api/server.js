// server.js - arquivo principal do servidor
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const WebSocket = require("ws");

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
// Importar rotas para notícias (proxy WordPress)
const noticias = require("./routes/noticias.js");
// Importar rotas para eventos (scraping WordPress)
const eventos = require("./routes/eventos.js");
// Importar middleware de autenticação
const autenticar = require("./middlewares/auth.js");

// Porta do servidor
const PORT = process.env.PORT || 15000;

const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:15000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "https://www.ufsm.br", "data:"],
        }
    }
}));

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

// Rotas protegidas (autenticar aplicado individualmente)
// ######################################################
app.use("/api/usuarios",      autenticar, usuariosRoutes);
app.use("/api/unidades",      autenticar, unidadesRoutes);
app.use("/api/predios",       autenticar, prediosRoutes);
app.use("/api/subunidades",   autenticar, subunidadesRoutes);
app.use("/api/salas",         autenticar, salasRoutes);
app.use("/api/salas-tipo",    autenticar, salasTipoRoutes);
app.use("/api/tipos-recursos",autenticar, tiposRecursos);
app.use("/api/tipos-despesas",autenticar, tiposDespesas);
app.use("/api/despesas",      autenticar, despesas);

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




// Criar o servidor HTTP
const server = http.createServer(app);

// Criar o servidor WebSocket
const wss = new WebSocket.Server({ server });

// Configurando os eventos WebSocket
wss.on("connection", (ws) => {
    console.log("Novo cliente conectado!");

    // Enviar mensagem ao cliente conectado
    ws.send("Bem vindo ao WebSocket Server!");

    // Evento: Quando o servidor recebe uma mensagem do cliente
    ws.on("message", (message) => {
        console.log(`Mensagem recebida do cliente: ${message}`);

        // Enviar uma resposta para todos os clientes conectados
        wss.clients.forEach((cliente) => {
            if (cliente.readyState === WebSocket.OPEN) {
                cliente.send(`Servidor recebeu: ${message}`);
            }
        });
    });

    // Evento: Quando o cliente se desconecta
    ws.on("close", () => {
        console.log("Cliente desconectado!");
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});