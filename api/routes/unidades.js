const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova unidade
router.post("/", async (req, res) => {
    const {codigo, unidade, sigla} = req.body;

    try {
        // Verifica se não está faltando nenhum campo
        if (!codigo || !unidade || !sigla) {
            return res.status(400).json({
                status: "error",
                message: "Todos os campos devem ser preenchidos.",
                data: ""
            });
        }

        // Prepara a query para cadastrar a unidade
        const query = "insert into unidades (codigo, unidade, sigla) values ($1, $2, $3) returning *";
        const values = [codigo, unidade, sigla];

        // Cadastra a unidade
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Unidade Cadastrada com sucesso.",
            data: result
        });
    } catch(error) {
        console.log(`Ocorreu um erro: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar unidade.",
            data: ""
        });
    }

});

// Rota para listar as unidades
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from unidades order by unidade");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch (error) {
        console.log(`Erro ao tentar listar os usuários: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar as unidades.",
            data: ""
        });
    }
});

router.put("/:idunidade", async (req, res) => {
    // Fazer a regra de negócio para atualização da unidade
    const unidade_id = req.params.idunidade;
    const { codigoUnidade, unidade, sigla } = req.body;

    console.log(`
        Id unidade: ${unidade_id}
        Código unidade: ${codigoUnidade}
        Unidade: ${unidade}
        Sigla: ${sigla}
    `);
    
    res.status(200).json({
        status: "success",
        message: "Informações da unidade atualizada",
        data: ""
    });
});

// Exportar o roteador
module.exports = router;