const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

const PRIORIDADES = ["baixa", "media", "alta"];
const STATUSES = ["aberta", "em_andamento", "concluida", "cancelada"];

function ehDirecao(usuario) {
    return ["super_admin", "diretor"].includes(getNivelAcesso(usuario));
}
function limpar(v, max) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s.slice(0, max);
}

// ─────────────────────────── Tipos (categorias) ───────────────────────────
// GET /api/manutencao/tipos — lista (ativos; ?todos=1 inclui inativos p/ gestão)
router.get("/tipos", async (req, res) => {
    const todos = req.query.todos === "1" || req.query.todos === "true";
    try {
        const { rows } = await pool.query(
            `SELECT id_tipo, nome, ativo FROM manutencao_tipos ${todos ? "" : "WHERE ativo = true"} ORDER BY nome`
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar tipos de manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao listar tipos.", data: null });
    }
});

// POST /api/manutencao/tipos — cria categoria (direção)
router.post("/tipos", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    const nome = limpar(req.body.nome, 120);
    if (!nome) return res.status(400).json({ status: "error", message: "Nome é obrigatório.", data: null });
    try {
        const { rows } = await pool.query("INSERT INTO manutencao_tipos (nome) VALUES ($1) RETURNING id_tipo, nome, ativo", [nome]);
        return res.status(201).json({ status: "success", message: "Categoria criada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao criar tipo de manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao criar categoria.", data: null });
    }
});

// PATCH /api/manutencao/tipos/:id — edita nome/ativo (direção)
router.patch("/tipos/:id", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    const { id } = req.params;
    const nome = req.body.nome !== undefined ? limpar(req.body.nome, 120) : undefined;
    const ativo = req.body.ativo !== undefined ? (req.body.ativo === true || req.body.ativo === "true") : undefined;
    if (nome === undefined && ativo === undefined) return res.status(400).json({ status: "error", message: "Nada para atualizar.", data: null });
    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE manutencao_tipos SET nome = COALESCE($1, nome), ativo = COALESCE($2, ativo) WHERE id_tipo = $3
             RETURNING id_tipo, nome, ativo`,
            [nome ?? null, ativo ?? null, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Categoria não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Categoria atualizada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao atualizar tipo de manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar categoria.", data: null });
    }
});

// ─────────────────────────── Ocorrências ───────────────────────────
// GET /api/manutencao — lista (qualquer logado). Filtros: ?status=&sala_id=&tipo_id=&prioridade=
router.get("/", async (req, res) => {
    const { status, sala_id, tipo_id, prioridade } = req.query;
    const params = [];
    const where = [];
    if (status) { params.push(status); where.push(`m.status = $${params.length}`); }
    if (sala_id) { params.push(sala_id); where.push(`m.sala_id = $${params.length}`); }
    if (tipo_id) { params.push(tipo_id); where.push(`m.tipo_id = $${params.length}`); }
    if (prioridade) { params.push(prioridade); where.push(`m.prioridade = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    try {
        const { rows } = await pool.query(`
            SELECT m.id_manutencao, m.sala_id, m.tipo_id, m.descricao, m.prioridade, m.status,
                   m.resolucao, m.data_conclusao, m.createdat, m.created_by_user_id,
                   s.sala_nome, t.nome AS tipo_nome,
                   cu.nome AS created_by_nome, co.nome AS concluido_por_nome
            FROM manutencoes m
            LEFT JOIN salas s ON s.sala_id = m.sala_id
            LEFT JOIN manutencao_tipos t ON t.id_tipo = m.tipo_id
            LEFT JOIN users cu ON cu.user_id = m.created_by_user_id
            LEFT JOIN users co ON co.user_id = m.concluido_por_user_id
            ${whereSql}
            ORDER BY CASE m.status WHEN 'aberta' THEN 0 WHEN 'em_andamento' THEN 1 ELSE 2 END,
                     CASE m.prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
                     m.createdat DESC
        `, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar manutenções:");
        return res.status(500).json({ status: "error", message: "Erro ao listar ocorrências.", data: null });
    }
});

// POST /api/manutencao — abre ocorrência (qualquer servidor logado)
router.post("/", async (req, res) => {
    const sala_id = req.body.sala_id || null;
    const tipo_id = req.body.tipo_id || null;
    const descricao = limpar(req.body.descricao, 2000);
    let prioridade = limpar(req.body.prioridade, 10) || "media";
    if (!PRIORIDADES.includes(prioridade)) prioridade = "media";
    if (!sala_id || !descricao) {
        return res.status(400).json({ status: "error", message: "Sala e descrição do problema são obrigatórias.", data: null });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO manutencoes (sala_id, tipo_id, descricao, prioridade, status, created_by_user_id, createdat)
             VALUES ($1, $2, $3, $4, 'aberta', $5, NOW()) RETURNING *`,
            [sala_id, tipo_id, descricao, prioridade, req.usuario.id]
        );
        return res.status(201).json({ status: "success", message: "Ocorrência registrada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao registrar manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao registrar ocorrência.", data: null });
    }
});

// PATCH /api/manutencao/:id — gestão (direção): status/prioridade/tipo/descrição/resolução/sala
router.patch("/:id", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Apenas a direção pode gerenciar ocorrências.", data: null });
    const { id } = req.params;
    try {
        const atualQ = await pool.query("SELECT * FROM manutencoes WHERE id_manutencao = $1", [id]);
        if (atualQ.rowCount === 0) return res.status(404).json({ status: "error", message: "Ocorrência não encontrada.", data: null });
        const a = atualQ.rows[0];

        const status = req.body.status !== undefined ? limpar(req.body.status, 15) : a.status;
        if (!STATUSES.includes(status)) return res.status(400).json({ status: "error", message: "Status inválido.", data: null });
        let prioridade = req.body.prioridade !== undefined ? limpar(req.body.prioridade, 10) : a.prioridade;
        if (!PRIORIDADES.includes(prioridade)) prioridade = a.prioridade;
        const tipo_id = req.body.tipo_id !== undefined ? (req.body.tipo_id || null) : a.tipo_id;
        const sala_id = req.body.sala_id !== undefined ? (req.body.sala_id || null) : a.sala_id;
        const descricao = req.body.descricao !== undefined ? limpar(req.body.descricao, 2000) : a.descricao;
        const resolucao = req.body.resolucao !== undefined ? limpar(req.body.resolucao, 2000) : a.resolucao;

        // Conclusão: registra quem/quando ao virar 'concluida'; limpa se sair de concluída
        let dataConclusao = a.data_conclusao;
        let concluidoPor = a.concluido_por_user_id;
        if (status === "concluida" && a.status !== "concluida") {
            dataConclusao = new Date();
            concluidoPor = req.usuario.id;
        } else if (status !== "concluida" && a.status === "concluida") {
            dataConclusao = null;
            concluidoPor = null;
        }

        const { rows } = await pool.query(
            `UPDATE manutencoes SET status=$1, prioridade=$2, tipo_id=$3, sala_id=$4, descricao=$5,
                 resolucao=$6, data_conclusao=$7, concluido_por_user_id=$8, updatedat=NOW()
             WHERE id_manutencao=$9 RETURNING *`,
            [status, prioridade, tipo_id, sala_id, descricao, resolucao, dataConclusao, concluidoPor, id]
        );
        return res.status(200).json({ status: "success", message: "Ocorrência atualizada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao atualizar manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar ocorrência.", data: null });
    }
});

// DELETE /api/manutencao/:id — remove (direção)
router.delete("/:id", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Apenas a direção pode excluir ocorrências.", data: null });
    try {
        const { rowCount } = await pool.query("DELETE FROM manutencoes WHERE id_manutencao = $1", [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Ocorrência não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Ocorrência excluída.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao excluir manutenção:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir ocorrência.", data: null });
    }
});

module.exports = router;
