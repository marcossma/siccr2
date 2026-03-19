const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET /resumo — totais consolidados para o painel de relatórios
router.get("/resumo", async (req, res) => {
    try {
        const [recursos, despesas, porSubunidade, porTipoDespesa] = await Promise.all([
            // Total de recursos recebidos
            pool.query(`
                SELECT COALESCE(SUM(valor_recurso_recebido), 0) AS total_recursos
                FROM recursos_recebidos
            `),
            // Total de despesas
            pool.query(`
                SELECT COALESCE(SUM(valor_despesa), 0) AS total_despesas
                FROM despesas
            `),
            // Despesas agrupadas por subunidade
            pool.query(`
                SELECT s.subunidade_nome,
                       COALESCE(SUM(d.valor_despesa), 0) AS total
                FROM subunidades s
                LEFT JOIN despesas d ON d.id_subunidade = s.subunidade_id
                GROUP BY s.subunidade_id, s.subunidade_nome
                ORDER BY total DESC
            `),
            // Despesas agrupadas por tipo
            pool.query(`
                SELECT td.tipo_despesa,
                       COALESCE(SUM(d.valor_despesa), 0) AS total
                FROM tipos_despesas td
                LEFT JOIN despesas d ON d.id_tipo_despesa = td.id_tipo_despesa
                GROUP BY td.id_tipo_despesa, td.tipo_despesa
                ORDER BY total DESC
            `)
        ]);

        const totalRecursos  = parseFloat(recursos.rows[0].total_recursos);
        const totalDespesas  = parseFloat(despesas.rows[0].total_despesas);

        return res.status(200).json({
            status: "success",
            message: "",
            data: {
                total_recursos:    totalRecursos,
                total_despesas:    totalDespesas,
                saldo:             totalRecursos - totalDespesas,
                por_subunidade:    porSubunidade.rows,
                por_tipo_despesa:  porTipoDespesa.rows
            }
        });
    } catch (error) {
        console.error("Erro ao gerar relatório resumo:", error);
        return res.status(500).json({ status: "error", message: "Erro ao gerar relatório.", data: null });
    }
});

// GET /despesas — lista completa de despesas com joins
router.get("/despesas", async (req, res) => {
    try {
        const { ano } = req.query;
        const params = [];
        let where = "";
        if (ano) {
            params.push(ano);
            where = `WHERE EXTRACT(YEAR FROM d.data_despesa) = $1`;
        }

        const { rows } = await pool.query(`
            SELECT d.id_despesa, d.valor_despesa, d.data_despesa,
                   d.numero_documento_despesa, d.observacao_despesa,
                   s.subunidade_nome, td.tipo_despesa
            FROM despesas d
            LEFT JOIN subunidades s ON s.subunidade_id = d.id_subunidade
            LEFT JOIN tipos_despesas td ON td.id_tipo_despesa = d.id_tipo_despesa
            ${where}
            ORDER BY d.data_despesa DESC
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar relatório de despesas:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar despesas.", data: null });
    }
});

// GET /recursos — lista de recursos recebidos com tipo
router.get("/recursos", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT rr.id_recurso_recebido, rr.valor_recurso_recebido,
                   rr.descricao_recurso_recebido, rr.data_recebimento,
                   tr.tipo_recurso
            FROM recursos_recebidos rr
            LEFT JOIN tipos_recursos tr ON tr.id_tipo_recurso = rr.tipo_recurso_recebido
            ORDER BY rr.data_recebimento DESC
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar relatório de recursos:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar recursos.", data: null });
    }
});

module.exports = router;
