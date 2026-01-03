const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicioanr novo tipo de despesa
router.post("/", async (req, res) => {
    const { tipo_despesa, descricao_despesa = null } = req.body;
    console.log(req.body);

    try {
        // Verifica se todos os campos estão preenchidos
        if (!tipo_despesa) {
            return res.status(400).json({
                status: "error",
                message: "O tipo de despesa deve ser preenchido!",
                data: ""
            });
        }

        // Prepara a query para cadastrar o novo tipo de despesa
        const query = "insert into tipos_despesas (tipo_despesa, descricao_despesa) values ($1, $2) returning *";
        const values = [tipo_despesa, descricao_despesa];

        // Cadastra o tipo de despesa
        const result = await pool.query(query, values);

        // Retorna os dados da operação
        res.status(201).json({
            status: "success",
            message: "Tipo de despesa cadastrada com sucesso!",
            data: result.rows
        });

    } catch(error) {
        console.error("Erro ao tentar cadastrar nova despesa: ", error);
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar cadastrar despesa.",
            data: ""
        });
    }
});

router.get ("/", async (req, res) => {
    try {
        const result = await pool.query("select * from tipos_despesas order by tipo_despesa");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch(error) {
        console.error("Erro ao tentar listar os tipos de despesas.");
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar os tipos de despesas.",
            data: ""
        });
    }
});

router.put("/:iddespesa", async (req, res) => {
    const id_tipo_despesa = req.params.iddespesa;
    const { tipo_despesa, descricao_despesa } = req.body;

    const result = await pool.query("update tipos_despesas set tipo_despesa = $1, descricao_despesa = $2 where id_tipo_despesa = $3 returning *", [tipo_despesa, descricao_despesa, id_tipo_despesa]);

    res.status(200).json({
        status: "success",
        message: "Informações atualizadas com sucesso.",
        data: result.rows
    });
});

router.delete("/:iddespesa", async (req, res) => {
    const id_tipo_despesa = req.params.iddespesa;

    const result = await pool.query("delete from tipos_despesas where id_tipo_despesa = $1 returning *", [id_tipo_despesa]);

    res.status(200).json({
        status: "success",
        message: "Tipo de despesa excluída com sucesso.",
        data: ""
    });
});

// Exportar o roteador
module.exports = router;