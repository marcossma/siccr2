const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /resumo — totais consolidados, filtrados pelo nível do usuário
// Query param: ?ano=2026 (opcional)
router.get("/resumo", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        const isRestrito = nivel === "chefe" || nivel === "servidor";
        const subunidadeId = req.usuario.subunidade;
        const ano = req.query.ano ? parseInt(req.query.ano) : null;

        if (isRestrito) {
            const params = [subunidadeId];
            const anoClause = ano ? `AND EXTRACT(YEAR FROM d.data_despesa) = $${params.push(ano)}` : "";
            const anoClauseSimple = ano ? `AND EXTRACT(YEAR FROM data_despesa) = $2` : "";

            const [despesas, porSubunidade, porTipoDespesa] = await Promise.all([
                pool.query(
                    `SELECT COALESCE(SUM(valor_despesa), 0) AS total_despesas
                     FROM despesas WHERE id_subunidade = $1 ${anoClauseSimple}`,
                    ano ? [subunidadeId, ano] : [subunidadeId]
                ),
                pool.query(
                    `SELECT s.subunidade_nome, COALESCE(SUM(d.valor_despesa), 0) AS total
                     FROM subunidades s
                     LEFT JOIN despesas d ON d.id_subunidade = s.subunidade_id ${anoClause}
                     WHERE s.subunidade_id = $1
                     GROUP BY s.subunidade_id, s.subunidade_nome`,
                    params
                ),
                pool.query(
                    `SELECT td.tipo_despesa, COALESCE(SUM(d.valor_despesa), 0) AS total
                     FROM tipos_despesas td
                     LEFT JOIN despesas d ON d.id_tipo_despesa = td.id_tipo_despesa
                                         AND d.id_subunidade = $1 ${anoClause}
                     GROUP BY td.id_tipo_despesa, td.tipo_despesa
                     ORDER BY total DESC`,
                    params
                )
            ]);

            return res.status(200).json({
                status: "success", message: "",
                data: {
                    escopo:           "subunidade",
                    ano:              ano,
                    total_recursos:   null,
                    total_despesas:   parseFloat(despesas.rows[0].total_despesas),
                    saldo:            null,
                    por_subunidade:   porSubunidade.rows,
                    por_tipo_despesa: porTipoDespesa.rows
                }
            });
        }

        // Diretor / super_admin: visão geral
        const params = ano ? [ano] : [];
        const anoWhereD  = ano ? `WHERE EXTRACT(YEAR FROM data_despesa) = $1`  : "";
        const anoWhereR  = ano ? `WHERE EXTRACT(YEAR FROM data_recebimento) = $1` : "";
        const anoJoinD   = ano ? `AND EXTRACT(YEAR FROM d.data_despesa) = $1`  : "";

        const [recursos, despesas, porSubunidade, porTipoDespesa] = await Promise.all([
            pool.query(
                `SELECT COALESCE(SUM(valor_recurso_recebido), 0) AS total_recursos
                 FROM recursos_recebidos ${anoWhereR}`, params),
            pool.query(
                `SELECT COALESCE(SUM(valor_despesa), 0) AS total_despesas
                 FROM despesas ${anoWhereD}`, params),
            pool.query(
                `SELECT s.subunidade_nome, COALESCE(SUM(d.valor_despesa), 0) AS total
                 FROM subunidades s
                 LEFT JOIN despesas d ON d.id_subunidade = s.subunidade_id ${anoJoinD}
                 GROUP BY s.subunidade_id, s.subunidade_nome
                 ORDER BY total DESC`, params),
            pool.query(
                `SELECT td.tipo_despesa, COALESCE(SUM(d.valor_despesa), 0) AS total
                 FROM tipos_despesas td
                 LEFT JOIN despesas d ON d.id_tipo_despesa = td.id_tipo_despesa ${anoJoinD}
                 GROUP BY td.id_tipo_despesa, td.tipo_despesa
                 ORDER BY total DESC`, params)
        ]);

        const totalRecursos = parseFloat(recursos.rows[0].total_recursos);
        const totalDespesas = parseFloat(despesas.rows[0].total_despesas);

        return res.status(200).json({
            status: "success", message: "",
            data: {
                escopo:           "geral",
                ano:              ano,
                total_recursos:   totalRecursos,
                total_despesas:   totalDespesas,
                saldo:            totalRecursos - totalDespesas,
                por_subunidade:   porSubunidade.rows,
                por_tipo_despesa: porTipoDespesa.rows
            }
        });
    } catch (error) {
        console.error("Erro ao gerar relatório resumo:", error);
        return res.status(500).json({ status: "error", message: "Erro ao gerar relatório.", data: null });
    }
});

// GET /despesas — lista de despesas filtrada pelo nível do usuário
router.get("/despesas", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        const isRestrito = nivel === "chefe" || nivel === "servidor";
        const params = [];
        const conditions = [];

        const { ano } = req.query;
        if (ano) {
            params.push(ano);
            conditions.push(`EXTRACT(YEAR FROM d.data_despesa) = $${params.length}`);
        }

        if (isRestrito) {
            params.push(req.usuario.subunidade);
            conditions.push(`d.id_subunidade = $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

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

// GET /recursos — apenas para diretor e super_admin (recursos são do centro)
router.get("/recursos", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        if (nivel === "chefe" || nivel === "servidor") {
            return res.status(403).json({
                status: "error",
                message: "Acesso restrito à diretoria.",
                data: null
            });
        }

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
