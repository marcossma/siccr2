const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// Rota para adicionar nova despesa
router.post("/", async (req, res) => {
    const { id_tipo_despesa, id_subunidade, valor_despesa, data_despesa, numero_documento_despesa = null, observacao_despesa = null } = req.body;
    console.log(req.body);

    try {
        // Verifica se todos os campos estão preenchidos
        if (!id_tipo_despesa || !id_subunidade || !valor_despesa) {
            return res.status(400).json({
                status: "error",
                message: "O tipo de despesa, a subunidade e o valor da despesa devem ser preenchidos!",
                data: ""
            });
        }

        // Prepara a query para cadastrar a nova despes
        const query = "insert into despesas (id_tipo_despesa, id_subunidade, valor_despesa, data_despesa, numero_documento_despesa, observacao_despesa) values ($1, $2, $3, $4, $5, $6) returning *";
        const values = [id_tipo_despesa, id_subunidade, valor_despesa, data_despesa, numero_documento_despesa, observacao_despesa];

        // Cadastra a despesa
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
        const result = await pool.query("select * from despesas");
        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch(error) {
        console.error("Erro ao tentar listar as despesas.");
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar as despesas.",
            data: ""
        });
    }
});

router.get("/total-info", async (req, res) => {
    try {
        const result = await pool.query(`
            select
            d.id_despesa,
            d.id_subunidade,
            d.id_tipo_despesa,
            d.valor_despesa,
            d.data_despesa,
            d.numero_documento_despesa,
            d.observacao_despesa,

            s.subunidade_id,
            s.subunidade_nome,

            td.id_tipo_despesa,
            td.tipo_despesa

            from despesas as d
            left join subunidades as s on d.id_subunidade = s.subunidade_id
            left join tipos_despesas as td on d.id_tipo_despesa = td.id_tipo_despesa
            order by d.data_despesa;

        `);

        res.status(200).json({
            status: "success",
            message: "",
            data: result.rows
        });
    } catch(error) {
        console.error("Erro ao tentar listar informações completas (total-info).");
        res.status(500).json({
            status: "error",
            message: "Erro ao tentar listar as informações completas (total-info).",
            data: ""
        });
    }
});

router.put("/:iddespesa", async (req, res) => {
    const id_despesa = req.params.iddespesa;
    const { id_tipo_despesa, id_subunidade, valor_despesa, data_despesa, numero_documento_despesa, observacao_despesa } = req.body;

    const result = await pool.query("update despesas set id_tipo_despesa = $1, id_subunidade = $2, valor_despesa = $3, data_despesa = $4, numero_documento_despesa = $5, observacao_despesa = $6 where id_despesa = $7 returning *", [id_tipo_despesa, id_subunidade, valor_despesa, data_despesa, numero_documento_despesa, observacao_despesa, id_despesa]);

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