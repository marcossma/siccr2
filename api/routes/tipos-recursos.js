const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicioanr novo recurso
router.post("/", async (req, res) => {
    const {tipo_recurso, descricao_recurso} = req.body;

    try {
        // Verifica se todos os campos estão preenchidos
        if (!tipo_recurso || !descricao_recurso) {
            return res.status(400).json({
                status: "error",
                message: "Todos os campos devem ser preenchidos!",
                data: ""
            });
        }

        // Prepara a query para cadastrar o recurso
        const query = "insert into tipos_recursos (tipo_recurso, descricao_recurso) values ($1, $2) returning *";
        const values = [tipo_recurso, descricao_recurso];

        // Cadastra o recurso
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Tipo de recurso cadastrado com sucesso!",
            data: result.rows
        });

    } catch(error) {
        console.error("Erro ao tentar cadastrar novo recurso: ", error);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar unidade.",
            data: ""
        });
    }
});

router.get ("/", async (req, res) => {
    try {
        const result = await pool.query("select * from tipos_recursos order by tipo_recurso");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch(error) {
        console.error("Erro ao tentar listar os tipos de recursos.");
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar os tipos de recursos.",
            data: ""
        });
    }
});

router.put("/:idrecurso", async (req, res) => {
    const id_tipo_recurso = req.params.idrecurso;
    const { tipo_recurso, descricao_recurso } = req.body;

    const result = await pool.query("update tipos_recursos set tipo_recurso = $1, descricao_recurso = $2 where id_tipo_recurso = $3 returning *", [tipo_recurso, descricao_recurso, id_tipo_recurso]);

    res.status(200).json({
        status: "success",
        message: "Informações atualizadas com sucesso.",
        data: result.rows
    });
});

router.delete("/:idrecurso", async (req, res) => {
    const id_tipo_recurso = req.params.idrecurso;

    const result = await pool.query("delete from tipos_recursos where id_tipo_recurso = $1 returning *", [id_tipo_recurso]);

    res.status(200).json({
        status: "success",
        message: "Tipo de recurso excluído com sucesso.",
        data: ""
    });
});

// Exportar o roteador
module.exports = router;