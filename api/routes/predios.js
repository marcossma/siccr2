const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova unidade
router.post("/", async (req, res) => {
    const {predio, descricao, unidade_id} = req.body;

    try {
        // Verifica se não está faltando nenhum campo
        if (!predio) {
            return res.status(400).json({
                status: "error",
                message: "O campo IDENTIFICAÇÃO DO PRÉDIO deve ser preenchido.",
                data: ""
            });
        }

        // Prepara a query para cadastrar a unidade
        const query = "insert into predios (predio, descricao, unidade_id) values ($1, $2, $3) returning *";
        const values = [predio, descricao, unidade_id];

        // Cadastra a unidade
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Prédio Cadastrado com sucesso.",
            data: result.rows
        });
    } catch(error) {
        console.log(`Ocorreu um erro: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar prédio.",
            data: ""
        });
    }

});

// Rota para listar as unidades
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from predios order by predio");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch (error) {
        console.log(`Erro ao tentar listar os prédios: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar as prédios.",
            data: ""
        });
    }
});

router.put("/:idpredio", async (req, res) => {
    // Fazer a regra de negócio para atualização da unidade
    const predio_id = req.params.idpredio;
    const { predio, descricao, unidade_id } = req.body;

    const result = await pool.query("update predios set predio = $1, descricao = $2, unidade_id = $3 where predio_id = $4 returning *", [predio, descricao, unidade_id, predio_id]);
    
    res.status(200).json({
        status: "success",
        message: "Informações do predio atualizadas",
        data: result.rows
    });
});

// Exportar o roteador
module.exports = router;