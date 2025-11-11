const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");

// Criar um roteador para o Express
const router = express.Router();

// Rota para listar os usuários
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from users");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch(error) {
        console.error(`Erro ao tentar listar os usuários: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar os usuários.",
            data: ""
        });
    }
});

// Rota para listar os usuários com todas as informações
router.get("/usuariosTotalInfo", async (req, res) => {
    try {
        const result = await pool.query("select * from users inner join subunidades on subunidades.subunidade_id = users.subunidade_id");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch (error) {
        console.error(`Erro ao tentar listar todos as informações dos usuários: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar todas as informações dos usuários.",
            data: ""
        });
    }
});

// Rota para adicionar novo usuário
router.post("/", async (req, res) => {
    const { nome, email, siape, senha, data_nascimento, subunidade_id, whatsapp, permissao, createdat } = req.body;

    try {
        // Verificar se todos os campos necessários foram preenchidos
        if (!nome || !siape || !senha) {
            return res.status(400).json({
                status: "error",
                message: "Os campos nome, siape e senha, são obrigatórios.",
                data: ""
            });
        }

        // Verificar se o siape já foi cadastrado
        const userExists = await pool.query("select * from users where siape = $1", [siape]);
        if (userExists.rows.length > 0) {
            return res.status(500).json({
                status: "error",
                message: `O siape ${siape} já está cadastrado.`,
                data: ""
            });
        }

        // Caso passe pelas duas verificações, criptografamos a senha e preparamos a query para o cadastro
        // 1 - Criptografar a senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // 2 - Inserir o novo usuário no banco de dados
        const query = "insert into users (nome, email, siape, senha, data_nascimento, subunidade_id, whatsapp, permissao, createdat) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *";
        const values = [nome, email, siape, hashedPassword, data_nascimento, subunidade_id, whatsapp, permissao, createdat];
        const result = await pool.query(query, values);

        // Retorna o usuário cadastrado
        res.status(201).json({
            status: "success",
            message: "Usuário cadastrado com sucesso!",
            data: {
                user_id: result.rows[0].user_id,
                nome: result.rows[0].nome,
                siape: result.rows[0].siape
            }
        });
    } catch(error) {
        console.log(`Erro ao tentar cadastrar o usuário: ${error}`);
        console.log(error.messsage);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar novo usuário",
            data: ""
        });
    }
});

// Rota para Atualizar usuário
router.put("/:id", async (req, res) => {
    const user_id = req.params.id;
    const { nome, email, siape, data_nascimento, subunidade_id, whatsapp, permissao } = req.body;

    try {
        const userExist = await pool.query("select * from users where user_id = $1", [user_id]);
        if (userExist.rows.length < 1) {
            return res.status(500).json({
                status: "error",
                message: "Usuário não encontrado.",
                data: ""
            });
        }

        const query = "update users set nome = $1, email = $2, siape = $3, data_nascimento = $4, subunidade_id = $5, whatsapp = $6, permissao = $7 where user_id = $8 returning *";
        const values = [nome, email, siape, data_nascimento, subunidade_id, whatsapp, permissao, user_id];
        const result = await pool.query(query, values);

        return res.status(201).json({
            status: "success",
            message: "Usuário atualizado com sucesso.",
            data: {
                user_id: result.rows[0].user_id,
                nome: result.rows[0].nome,
                siape: result.rows[0].siape
            }
        });
    } catch(error) {
        console.log("Erro ao tentar atualizar usuário: ", error);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar atualizar usuário.",
            data: ""
        });
    }
});

// Exportar o roteador
module.exports = router;