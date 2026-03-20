const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

        // JOIN com subunidades para obter is_direcao_centro e subunidade_sigla
        const user = await pool.query(
            `SELECT u.*, s.is_direcao_centro, s.subunidade_sigla
             FROM users u
             LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
             WHERE u.siape = $1`,
            [siape]
        );

        if (user.rowCount <= 0) {
            return res.status(401).json({
                status: "error",
                message: "Usuário ou senha inválidos!",
                data: null
            });
        }

        const senhaCompare = await bcrypt.compare(senha, user.rows[0].senha);

        if (!senhaCompare) {
            return res.status(401).json({
                status: "error",
                message: "Usuário ou senha inválidos!",
                data: null
            });
        }

        const userData = user.rows[0];

        // Busca funcionalidades do usuário
        const funcsResult = await pool.query(
            `SELECT f.nome FROM permissoes_usuario pu
             JOIN funcionalidades f ON f.id = pu.funcionalidade_id
             WHERE pu.user_id = $1`,
            [userData.user_id]
        );
        const funcionalidades = funcsResult.rows.map(r => r.nome);

        const token = jwt.sign({
            id: userData.user_id,
            nome: userData.nome,
            siape: userData.siape,
            email: userData.email,
            whatsapp: userData.whatsapp,
            permissao: userData.permissao,
            subunidade: userData.subunidade_id,
            subunidade_sigla: userData.subunidade_sigla ?? null,
            unidade: userData.unidade_id,
            is_direcao_centro: userData.is_direcao_centro ?? false,
            data_nascimento: userData.data_nascimento,
            funcionalidades
        }, process.env.JWT_SECRET, { expiresIn: "8h" });

        return res.status(200).json({
            status: "success",
            message: "Usuário autenticado com sucesso.",
            data: [{
                user_id: userData.user_id,
                nome: userData.nome,
                siape: userData.siape,
                email: userData.email,
                permissao: userData.permissao,
                subunidade_id: userData.subunidade_id,
                subunidade_sigla: userData.subunidade_sigla ?? null,
                unidade_id: userData.unidade_id,
                is_direcao_centro: userData.is_direcao_centro ?? false,
                funcionalidades
            }],
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