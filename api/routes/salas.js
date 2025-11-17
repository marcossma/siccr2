const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova SALa
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

// Rota para listar os SALAS
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

// Rota para listar os SALAS E DADOS DAS SUBUNIDADES E PRÉDIOS
router.get("/total-info", async(req, res) => {
    try {
        const result = await pool.query("select * from salas inner join subunidades on salas.subunidade_id = subunidades.subunidade_id inner join predios on salas.predio_id = predios.predio_id order by salas.sala_nome");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        })
    } catch(error) {
        console.log(`Erro ao tentar listar todas as informações da sala: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar todas as informações da sala.",
            data: ""
        });
    }
});

router.put("/:sala_id", async (req, res) => {
    // Fazer a regra de negócio para atualização do PRÉDIO
    const sala_id = req.params.sala_id;
    const { sala_nome, predio_id, subunidade_id, is_agendavel, sala_descricao } = req.body;

    const result = await pool.query("update salas set sala_nome = $1, sala_descricao = $2, subunidade_id = $3, predio_id = $4, is_agendavel = $5 where sala_id = $6 returning *", [sala_nome, sala_descricao, subunidade_id, predio_id, is_agendavel, sala_id]);
    
    res.status(200).json({
        status: "success",
        message: "Informações da sala atualizadas",
        data: result.rows
    });
});

// Exportar o roteador
module.exports = router;