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

// ─────────────────────────────────────────────────────────────────────────
// RELATÓRIO DE AGENDAMENTO DE SALAS
// ─────────────────────────────────────────────────────────────────────────
// Disponível apenas para direção do centro. Retorna num único payload:
//   - resumo: contagem por status
//   - por_sala: ocupação (ocorrências + horas) por sala agendável
//   - timeline: ocorrências aprovadas por semana
//   - top_solicitantes: ranking de quem mais solicitou no período
//   - detalhe: lista cronológica de ocorrências aprovadas (usada na tabela / PDF)
// ─────────────────────────────────────────────────────────────────────────
function ehDirecao(usuario) {
    if (!usuario) return false;
    if (["super_admin", "diretor", "vice_diretor"].includes(usuario.permissao)) return true;
    if (usuario.is_direcao_centro) return true;
    return (
        Array.isArray(usuario.funcionalidades) &&
        (usuario.funcionalidades.includes("aprovar_agendamento") ||
            usuario.funcionalidades.includes("ver_todos_agendamentos"))
    );
}

router.get("/salas", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({
            status: "error",
            message: "Apenas a direção pode acessar este relatório.",
            data: null,
        });
    }

    const { inicio, fim, sala_id } = req.query;
    if (!inicio || !fim) {
        return res.status(400).json({
            status: "error",
            message: "Parâmetros 'inicio' e 'fim' são obrigatórios (formato YYYY-MM-DD).",
            data: null,
        });
    }

    const params = [inicio, fim];
    let salaClause = "";
    if (sala_id) {
        params.push(sala_id);
        salaClause = ` AND a.sala_id = $${params.length}`;
    }

    try {
        const [resumo, porSala, timeline, topSolicitantes, detalhe, rejeicoes] = await Promise.all([
            // Resumo por status — agendamentos criados no período
            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE status = 'aprovada')::int  AS aprovados,
                    COUNT(*) FILTER (WHERE status = 'pendente')::int  AS pendentes,
                    COUNT(*) FILTER (WHERE status = 'rejeitada')::int AS rejeitados,
                    COUNT(*) FILTER (WHERE status = 'cancelada')::int AS cancelados,
                    COUNT(*)::int                                     AS total
                 FROM agendamentos a
                 WHERE a.createdat::date BETWEEN $1 AND $2 ${salaClause}`,
                params
            ),

            // Ocupação por sala (apenas salas agendáveis)
            pool.query(
                `SELECT s.sala_id, s.sala_nome, s.sala_capacidade, p.predio AS predio_nome,
                        COUNT(ao.id_ocorrencia)::int AS total_ocorrencias,
                        COALESCE(
                            SUM(CASE
                                WHEN a.dia_inteiro THEN 8
                                ELSE EXTRACT(EPOCH FROM (a.hora_fim - a.hora_inicio)) / 3600
                            END)::numeric(10,1), 0
                        ) AS horas_total
                 FROM salas s
                 LEFT JOIN predios p ON p.predio_id = s.predio_id
                 LEFT JOIN agendamentos a ON a.sala_id = s.sala_id AND a.status = 'aprovada'
                 LEFT JOIN agendamentos_ocorrencias ao ON ao.agendamento_id = a.id_agendamento
                    AND ao.status_individual = 'ativa'
                    AND ao.data_ocorrencia BETWEEN $1 AND $2
                 WHERE s.is_agendavel = 1
                 ${sala_id ? `AND s.sala_id = $${params.length}` : ""}
                 GROUP BY s.sala_id, s.sala_nome, s.sala_capacidade, p.predio
                 ORDER BY total_ocorrencias DESC, s.sala_nome`,
                params
            ),

            // Timeline: ocorrências aprovadas por semana (ISO week starting Monday)
            pool.query(
                `SELECT TO_CHAR(date_trunc('week', ao.data_ocorrencia), 'YYYY-MM-DD') AS semana,
                        COUNT(*)::int AS total_ocorrencias
                 FROM agendamentos_ocorrencias ao
                 JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
                 WHERE a.status = 'aprovada'
                   AND ao.status_individual = 'ativa'
                   AND ao.data_ocorrencia BETWEEN $1 AND $2 ${salaClause}
                 GROUP BY semana
                 ORDER BY semana`,
                params
            ),

            // Top 10 solicitantes no período
            pool.query(
                `SELECT u.nome, u.siape, COUNT(*)::int AS total
                 FROM agendamentos a
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 WHERE a.createdat::date BETWEEN $1 AND $2 ${salaClause}
                 GROUP BY u.user_id, u.nome, u.siape
                 ORDER BY total DESC, u.nome
                 LIMIT 10`,
                params
            ),

            // Detalhe de cada ocorrência aprovada (cronológico) — usado na tabela e no PDF
            pool.query(
                `SELECT ao.data_ocorrencia, a.dia_inteiro, a.hora_inicio, a.hora_fim,
                        s.sala_nome, p.predio AS predio_nome,
                        a.motivo, u.nome AS solicitante_nome, u.siape AS solicitante_siape
                 FROM agendamentos_ocorrencias ao
                 JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
                 JOIN salas s ON s.sala_id = a.sala_id
                 LEFT JOIN predios p ON p.predio_id = s.predio_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 WHERE a.status = 'aprovada'
                   AND ao.status_individual = 'ativa'
                   AND ao.data_ocorrencia BETWEEN $1 AND $2 ${salaClause}
                 ORDER BY ao.data_ocorrencia, a.hora_inicio NULLS FIRST, s.sala_nome`,
                params
            ),

            // Solicitações rejeitadas no período (com motivo)
            pool.query(
                `SELECT a.id_agendamento, a.motivo, a.motivo_rejeicao,
                        a.data_decisao, a.data_inicio,
                        s.sala_nome, u.nome AS solicitante_nome, u.siape AS solicitante_siape,
                        ap.nome AS aprovado_por_nome
                 FROM agendamentos a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN users ap ON ap.user_id = a.aprovado_por_user_id
                 WHERE a.status = 'rejeitada'
                   AND a.data_decisao::date BETWEEN $1 AND $2 ${salaClause}
                 ORDER BY a.data_decisao DESC`,
                params
            ),
        ]);

        return res.status(200).json({
            status: "success",
            message: "",
            data: {
                periodo: { inicio, fim, sala_id: sala_id || null },
                resumo: resumo.rows[0],
                por_sala: porSala.rows,
                timeline: timeline.rows,
                top_solicitantes: topSolicitantes.rows,
                detalhe: detalhe.rows,
                rejeicoes: rejeicoes.rows,
            },
        });
    } catch (error) {
        console.error("Erro ao gerar relatório de salas:", error);
        return res.status(500).json({
            status: "error",
            message: "Erro ao gerar relatório de salas.",
            data: null,
        });
    }
});

module.exports = router;
