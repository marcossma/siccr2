const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET / — lista previsões com nome da subunidade e tipo de despesa
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT pd.id_previsao, pd.subunidade_id, pd.id_tipo_despesa,
                   pd.valor_previsto, pd.ano_referencia, pd.observacao,
                   s.subunidade_nome, td.tipo_despesa
            FROM previsoes_despesas pd
            LEFT JOIN subunidades s ON s.subunidade_id = pd.subunidade_id
            LEFT JOIN tipos_despesas td ON td.id_tipo_despesa = pd.id_tipo_despesa
            ORDER BY pd.ano_referencia DESC, pd.id_previsao DESC
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar previsões de despesas:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar previsões.", data: null });
    }
});

// POST / — registra nova previsão
router.post("/", async (req, res) => {
    const { subunidade_id, id_tipo_despesa, valor_previsto, ano_referencia, observacao } = req.body;

    if (!subunidade_id || !id_tipo_despesa || !valor_previsto || !ano_referencia) {
        return res.status(400).json({
            status: "error",
            message: "Subunidade, tipo de despesa, valor previsto e ano de referência são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO previsoes_despesas
                (subunidade_id, id_tipo_despesa, valor_previsto, ano_referencia, observacao)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [subunidade_id, id_tipo_despesa, valor_previsto, ano_referencia, observacao || null]
        );
        return res.status(201).json({ status: "success", message: "Previsão registrada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao registrar previsão de despesa:", error);
        return res.status(500).json({ status: "error", message: "Erro ao registrar previsão.", data: null });
    }
});

// PUT /:id — atualiza previsão
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { subunidade_id, id_tipo_despesa, valor_previsto, ano_referencia, observacao } = req.body;

    if (!subunidade_id || !id_tipo_despesa || !valor_previsto || !ano_referencia) {
        return res.status(400).json({
            status: "error",
            message: "Subunidade, tipo de despesa, valor previsto e ano de referência são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE previsoes_despesas
             SET subunidade_id=$1, id_tipo_despesa=$2, valor_previsto=$3,
                 ano_referencia=$4, observacao=$5
             WHERE id_previsao=$6 RETURNING *`,
            [subunidade_id, id_tipo_despesa, valor_previsto, ano_referencia, observacao || null, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Previsão não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Previsão atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar previsão de despesa:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar previsão.", data: null });
    }
});

// DELETE /:id — remove previsão
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM previsoes_despesas WHERE id_previsao = $1", [id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Previsão não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Previsão excluída com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir previsão de despesa:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir previsão.", data: null });
    }
});

module.exports = router;
