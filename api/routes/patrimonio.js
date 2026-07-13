const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

const ESTADOS = ["novo", "bom", "regular", "ruim", "inservivel"];

function limpar(v, max) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s.slice(0, max);
}

// subunidade_id do bem é derivada da sala onde ele está (para RBAC/relatórios)
async function subunidadeDaSala(salaId) {
    if (!salaId) return null;
    const { rows } = await pool.query("SELECT subunidade_id FROM salas WHERE sala_id = $1", [salaId]);
    return rows.length ? rows[0].subunidade_id : null;
}

// Busca o bem existente por número (com a sala atual) — usado ao tratar duplicidade
async function bemPorNumero(numero) {
    const { rows } = await pool.query(
        `SELECT b.id_bem, b.numero_registro, b.descricao, b.sala_id, s.sala_nome
         FROM bens_permanentes b
         LEFT JOIN salas s ON s.sala_id = b.sala_id
         WHERE b.numero_registro = $1`,
        [numero]
    );
    return rows[0] || null;
}

// Monta a resposta 409 de duplicidade informando ONDE o bem já está (para oferecer "mover")
async function conflito409(res, numero) {
    const existente = await bemPorNumero(numero);
    const onde = existente && existente.sala_nome ? ` na sala ${existente.sala_nome}` : "";
    return res.status(409).json({
        status: "error",
        message: `Tombo "${numero}" já cadastrado${onde}.`,
        data: { bem_existente: existente },
    });
}

// GET /api/patrimonio?sala_id= — lista bens de uma sala
router.get("/", async (req, res) => {
    const { sala_id } = req.query;
    if (!sala_id) {
        return res.status(400).json({ status: "error", message: "sala_id é obrigatório.", data: null });
    }
    try {
        const { rows } = await pool.query(
            `SELECT id_bem, numero_registro, descricao, sala_id, subunidade_id,
                    estado_conservacao, observacao, data_levantamento, createdat
             FROM bens_permanentes
             WHERE sala_id = $1
             ORDER BY descricao, numero_registro`,
            [sala_id]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar bens:");
        return res.status(500).json({ status: "error", message: "Erro ao listar bens.", data: null });
    }
});

// POST /api/patrimonio — cadastra bem (associado a uma sala)
router.post("/", async (req, res) => {
    const numero = limpar(req.body.numero_registro, 60);
    const descricao = limpar(req.body.descricao, 255);
    const salaId = req.body.sala_id || null;
    const estado = limpar(req.body.estado_conservacao, 20);
    const observacao = limpar(req.body.observacao, 255);
    const dataLev = limpar(req.body.data_levantamento, 10);

    if (!numero || !descricao) {
        return res.status(400).json({ status: "error", message: "Número de registro e descrição são obrigatórios.", data: null });
    }
    if (estado && !ESTADOS.includes(estado)) {
        return res.status(400).json({ status: "error", message: "Estado de conservação inválido.", data: null });
    }
    try {
        const subId = await subunidadeDaSala(salaId);
        const { rows } = await pool.query(
            `INSERT INTO bens_permanentes
                (numero_registro, descricao, sala_id, subunidade_id, estado_conservacao, observacao, data_levantamento)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [numero, descricao, salaId, subId, estado, observacao, dataLev]
        );
        return res.status(201).json({ status: "success", message: "Bem cadastrado.", data: rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return conflito409(res, numero);
        }
        logger.error({ err: error }, "Erro ao cadastrar bem:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar bem.", data: null });
    }
});

// PUT /api/patrimonio/:id — atualiza bem
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const numero = limpar(req.body.numero_registro, 60);
    const descricao = limpar(req.body.descricao, 255);
    const salaId = req.body.sala_id || null;
    const estado = limpar(req.body.estado_conservacao, 20);
    const observacao = limpar(req.body.observacao, 255);
    const dataLev = limpar(req.body.data_levantamento, 10);

    if (!numero || !descricao) {
        return res.status(400).json({ status: "error", message: "Número de registro e descrição são obrigatórios.", data: null });
    }
    if (estado && !ESTADOS.includes(estado)) {
        return res.status(400).json({ status: "error", message: "Estado de conservação inválido.", data: null });
    }
    try {
        const subId = await subunidadeDaSala(salaId);
        const { rows, rowCount } = await pool.query(
            `UPDATE bens_permanentes
             SET numero_registro=$1, descricao=$2, sala_id=$3, subunidade_id=$4,
                 estado_conservacao=$5, observacao=$6, data_levantamento=$7
             WHERE id_bem=$8 RETURNING *`,
            [numero, descricao, salaId, subId, estado, observacao, dataLev, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Bem atualizado.", data: rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return conflito409(res, numero);
        }
        logger.error({ err: error }, "Erro ao atualizar bem:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar bem.", data: null });
    }
});

// PATCH /api/patrimonio/:id/mover — transfere um bem para outra sala (levantamento)
//   body: { sala_id }. Atualiza sala + subunidade derivada + data do levantamento (hoje).
router.patch("/:id/mover", async (req, res) => {
    const { id } = req.params;
    const salaId = req.body.sala_id || null;
    if (!salaId) {
        return res.status(400).json({ status: "error", message: "sala_id é obrigatório.", data: null });
    }
    try {
        const subId = await subunidadeDaSala(salaId);
        const { rows, rowCount } = await pool.query(
            `UPDATE bens_permanentes
             SET sala_id = $1, subunidade_id = $2, data_levantamento = CURRENT_DATE
             WHERE id_bem = $3 RETURNING *`,
            [salaId, subId, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Bem movido para esta sala.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao mover bem:");
        return res.status(500).json({ status: "error", message: "Erro ao mover bem.", data: null });
    }
});

// DELETE /api/patrimonio/:id — remove bem
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM bens_permanentes WHERE id_bem = $1", [id]);
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Bem excluído.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao excluir bem:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir bem.", data: null });
    }
});

module.exports = router;
