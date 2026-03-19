const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET / — lista recursos recebidos com nome do tipo
router.get("/", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        // diretor+ vê todos; chefe vê apenas os da sua unidade (via prédio não se aplica aqui,
        // recursos recebidos são do centro — super_admin e diretor veem tudo)
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
        console.error("Erro ao listar recursos recebidos:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar recursos recebidos.", data: null });
    }
});

// POST / — registra novo recurso recebido
router.post("/", async (req, res) => {
    const { tipo_recurso_recebido, valor_recurso_recebido, descricao_recurso_recebido, data_recebimento } = req.body;

    if (!tipo_recurso_recebido || !valor_recurso_recebido) {
        return res.status(400).json({
            status: "error",
            message: "Tipo de recurso e valor são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO recursos_recebidos
                (tipo_recurso_recebido, valor_recurso_recebido, descricao_recurso_recebido, data_recebimento)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [
                tipo_recurso_recebido,
                valor_recurso_recebido,
                descricao_recurso_recebido || null,
                data_recebimento || new Date()
            ]
        );
        return res.status(201).json({ status: "success", message: "Recurso registrado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao registrar recurso recebido:", error);
        return res.status(500).json({ status: "error", message: "Erro ao registrar recurso recebido.", data: null });
    }
});

// PUT /:id — atualiza recurso recebido
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { tipo_recurso_recebido, valor_recurso_recebido, descricao_recurso_recebido, data_recebimento } = req.body;

    if (!tipo_recurso_recebido || !valor_recurso_recebido) {
        return res.status(400).json({
            status: "error",
            message: "Tipo de recurso e valor são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE recursos_recebidos
             SET tipo_recurso_recebido=$1, valor_recurso_recebido=$2,
                 descricao_recurso_recebido=$3, data_recebimento=$4
             WHERE id_recurso_recebido=$5 RETURNING *`,
            [tipo_recurso_recebido, valor_recurso_recebido, descricao_recurso_recebido || null, data_recebimento || null, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Recurso não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Recurso atualizado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar recurso recebido:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar recurso recebido.", data: null });
    }
});

// DELETE /:id — remove recurso recebido
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM recursos_recebidos WHERE id_recurso_recebido = $1", [id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Recurso não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Recurso excluído com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir recurso recebido:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir recurso recebido.", data: null });
    }
});

module.exports = router;
