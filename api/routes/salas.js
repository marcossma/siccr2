const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar novo PRÉDIO
router.post("/", async (req, res) => {
    const { sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel } = req.body;

    try {
        // Verifica se não estão faltando campos obrigatórios
        if (!sala_nome || !predio_id) {
            return res.status(400).json({
                status: "error",
                message: "Os campos de IDENTIFICAÇÃO DA SALA e PRÉDIO devem ser preenchidos.",
                data: ""
            });
        }

        // Prepara a query para cadastrar o PRÉDIO
        const query = "insert into salas (sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel) values ($1, $2, $3, $4, $5) returning *";
        const values = [sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel];

        // Cadastra a unidade
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Sala Cadastrada com sucesso.",
            data: result.rows
        });
    } catch(error) {
        console.log(`Ocorreu um erro: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar sala.",
            data: ""
        });
    }

});

// Rota para listar os PRÉDIOS
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from salas order by sala_nome");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch (error) {
        console.log(`Erro ao tentar listar as salas: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar as salas.",
            data: ""
        });
    }
});

// Rota para listar os PRÉDIOS E DADOS DAS UNIDADES
router.get("/total-info", async(req, res) => {
    try {
        const result = await pool.query("select * from predios inner join unidades on predios.unidade_id = unidades.unidade_id order by predios.predio");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        })
    } catch(error) {
        console.log(`Erro ao tentar listar todas as informações do prédio: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar todas as informações do prédio.",
            data: ""
        });
    }
});

router.put("/:predio_id", async (req, res) => {
    // Fazer a regra de negócio para atualização do PRÉDIO
    const predio_id = req.params.predio_id;
    const { predio, descricao, unidade_id } = req.body;
    console.log(predio_id);

    const result = await pool.query("update predios set predio = $1, descricao = $2, unidade_id = $3 where predio_id = $4 returning *", [predio, descricao, unidade_id, predio_id]);
    
    res.status(200).json({
        status: "success",
        message: "Informações do predio atualizadas",
        data: result.rows
    });
});

// Exportar o roteador
module.exports = router;