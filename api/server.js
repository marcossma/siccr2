// app.js
const express = require("express");
const cors = require("cors");
const db = require("./config/database");

const app = express();
const PORT = process.env.PORT || 15000;

app.use(cors());

app.get("/api/test-db", async(req, res) => {
    try {
        const [rows] = await db.query("select 1 + 1 as solution");
        res.json({solution: rows[0].solution});
    } catch (error) {
        console.error("Erro ao conectar ao banco de dados: ", error);
        res.status(500).send("Erro ao conectar ao banco de dados.");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});