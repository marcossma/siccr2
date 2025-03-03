const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");

// Criar um roteador para o express
const router = express.Router();

// Rota de teste
router.get("/", async (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Rota Auth funcionando.",
        data: []
    });
});

// Rota para realização do login/autenticação
router.post("/login", async (req, res) => {
    const { siape, senha } = req.body;

    try {
        if (!siape || !senha) {
            return res.status(400).json({
                status: "error",
                message: "Os campos SIAPE e SENHA são obrigatórios.",
                data: []
            });
        }

        const user = await pool.query("select * from users where siape = $1", [siape]);
        console.log(user.rows);

        if (bcrypt.compare(senha, user.senha)) {
            console.log("Usuário autenticado");
            return res.status(200).json({
                status: "success",
                message: "Usuário autenticado com sucesso.",
                data: []
            });
        }

        console.log("Erro ao autenticar");


    } catch (error) {
        console.log("Erro ao tentar executar o login: ", error);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar efetuar o login",
            data: []
        });
    }
});

module.exports = router;