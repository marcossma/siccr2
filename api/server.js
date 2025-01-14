// server.js - arquivo principal do servidor
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
// const db = require("./config/database");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.SERVER_PORT || 15000;

const app = express();
app.use(cors());

// Configurar o uso de arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Configurar rotas amigáveis para o servidor HTTP - Páginas estáticas
app.get("/:pagina", (req, res) => {
    const pagina = req.params.pagina;
    const filePath = path.join(__dirname, "public", `${pagina}.html`);

    res.sendFile(filePath, (error) => {
        if (error) {
            // res.status(404).json({
            //     status: "error",
            //     message: "Página não encontrada!"}
            // );
            res.status(404).send("Página não encontrada!");
        }
    });
});


//##############
// Rotas de API
// #############
app.get("/api/test-db", async(req, res) => {
    try {
        const [rows] = await db.query("select 1 + 1 as solution");
        res.json({solution: rows[0].solution});
    } catch (error) {
        console.error("Erro ao conectar ao banco de dados: ", error);
        res.status(500).send("Erro ao conectar ao banco de dados.");
    }
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