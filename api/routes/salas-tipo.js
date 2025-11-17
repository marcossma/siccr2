const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova SALa
router.post("/", async (req, res) => {
    const { sala_tipo_nome } = req.body;

    try {
        // Verifica se não estão faltando campos obrigatórios
        if (!sala_tipo_nome) {
            return res.status(400).json({
                status: "error",
                message: "Os campos de IDENTIFICAÇÃO DO TIPO DE SALA deve ser preenchido.",
                data: ""
            });
        }

        // Prepara a query para cadastrar o PRÉDIO
        const query = "insert into salas_tipo (sala_tipo_nome) values ($1) returning *";
        const values = [sala_tipo_nome];

        // Cadastra a unidade
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Tipo de Sala cadastrada com sucesso.",
            data: result.rows
        });
    } catch(error) {
        console.log(`Ocorreu um erro: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar tipo de sala.",
            data: ""
        });
    }

});

// Rota para listar os SALAS
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("select * from salas_tipo order by sala_tipo_nome");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch (error) {
        console.log(`Erro ao tentar listar os tipos de salas: ${error}`);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar os tipos de salas.",
            data: ""
        });
    }
});

// Rota para listar os SALAS E DADOS DAS SUBUNIDADES E PRÉDIOS
// INATIVO POR ENQUANTO ATÉ HAVER NECESSIDADE E ADAPTAR AOS TIPOS DE SALAS
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

router.put("/:sala_tipo_id", async (req, res) => {
    // Fazer a regra de negócio para atualização do PRÉDIO
    const sala_tipo_id = req.params.sala_tipo_id;
    const { sala_tipo_nome } = req.body;

    const result = await pool.query("update salas_tipo set sala_tipo_nome = $1 where sala_tipo_id = $2 returning *", [sala_tipo_nome, sala_tipo_id]);
    
    res.status(200).json({
        status: "success",
        message: "Informações do tipo de sala atualizadas",
        data: result.rows
    });
});

// Exportar o roteador
module.exports = router;