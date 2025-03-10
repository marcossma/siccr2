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
                data: null
            });
        }

        const user = await pool.query("select * from users where siape = $1", [siape]);
        console.log(user.rows);

        if (!await bcrypt.compare(senha, user.senha)) {
            console.error("Erro: ", error);
            return res.status(401).json({
                status: "error",
                message: "Credenciais inválidas",
                data: null
            });
        }

        const token = jwt.sign({
            id: user.id, nome: user.nome, siape: user.siape, email: user.email, whatsapp: user.whatsapp, permissao: user.permissao, subunidade: user.subunidade_id
        }, "jwt-chave-super-secreta-full", {expiresIn: "1h"});

        console.log("Usuário autenticado");
            return res.status(200).json({
                status: "success",
                message: "Usuário autenticado com sucesso.",
                data: user.rows,
                token: token
            });

    } catch (error) {
        console.log("Erro ao tentar executar o login: ", error);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar efetuar o login",
            data: null
        });
    }
});

module.exports = router;