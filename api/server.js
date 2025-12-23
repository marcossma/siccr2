// server.js - arquivo principal do servidor
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
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

// Porta do servidor
const PORT = process.env.SERVER_PORT || 15000;

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// ##############
//  Rotas de API
// ##############
app.get("/api/test", async(req, res) => {
    res.status(201).json({
        status: "success",
        message: "Api funcionando!",
        data: ""
    });
});

// Rotas para os usuários
// ######################
app.use("/api/usuarios", usuariosRoutes);

// Rota para autenticação
// ######################
app.use("/api/auth", usuariosAuth);

// Rota para as unidades
// #####################
app.use("/api/unidades", unidadesRoutes);

// Rota para os prédios
// ####################
app.use("/api/predios", prediosRoutes);

// Rota para as subunidades
// ####################
app.use("/api/subunidades", subunidadesRoutes);

// Rota para as salas
// ####################
app.use("/api/salas", salasRoutes);

// Rota para os tipos de salas
// ###########################
app.use("/api/salas-tipo", salasTipoRoutes);

// Rota para os tipos de recursos
// ##############################
app.use("/api/tipos-recursos", tiposRecursos);

// Rota para os tipos de despesas
// ##############################
app.use("/api/tipos-despesas", tiposDespesas);

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