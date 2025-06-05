const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova Subunidade
router.post("/", async (req, res) => {
    const {codigo, nome, sigla, unidade_id, predio_id, email, chefe } = req.body;

    try {
        // Verifica se não está faltando nenhum campo
        if (!codigo || !nome || !unidade_id) {
            return res.status(400).json({
                status: "error",
                message: "Os campos CÓDIGO, SUBUNIDADE e UNIDADE devem ser preenchidos.",
                data: ""
            });
        }

        // Prepara a query para cadastrar a subunidade
        const query = "insert into subunidades (codigo, nome, sigla, unidade_id, predio_id, email, chefe) values ($1, $2, $3, $4, $5, $6, $7) returning *";
        const values = [codigo, nome, sigla, unidade_id, predio_id, email, chefe];

        // Cadastra a unidade
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Subunidade Cadastrada com sucesso.",
            data: result.rows
        });
    } catch(error) {
        console.log(`Ocorreu um erro: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar Subunidade.",
            data: ""
        });
    }

});

// Rota para listar as subunidades
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from subunidades order by nome");
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

// Rota para listar as subunidades com mais detalhes de outras tabelas
router.get("/total-info", async(req, res) => {
    const result = await pool.query("select * from subunidades inner join unidades on subunidades.unidade_id = unidades.unidade_id inner join predios on subunidades.predio_id = predios.predio_id order by subunidades.subunidade_nome");

    res.status(200).json({
        status: "success",
        message: "",
        data: result.rows
    });
});

// Rota para atualizar a subunidade pelo ID
router.put("/:idsubunidade", async (req, res) => {
    // Fazer a regra de negócio para atualização da unidade
    const subunidade_id = req.params.idsubunidade;
    const { codigo, nome, sigla, unidade_id, predio_id, email, chefe } = req.body;

    const result = await pool.query("update unidades set codigo = $1, nome = $2, sigla = $3, unidade_id = $4, predio_id = $5, email = $6, chefe = $7 where subunidade_id = $8 returning *", [codigo, nome, sigla, unidade_id, predio_id, email, chefe, subunidade_id]);
    
    res.status(200).json({
        status: "success",
        message: "Informações da subunidade atualizada.",
        data: result.rows
    });
});

// Exportar o roteador
module.exports = router;