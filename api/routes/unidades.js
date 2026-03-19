const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET /api/unidades — lista todas as unidades
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM unidades ORDER BY unidade"
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar unidades:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar unidades.", data: null });
    }
});

// POST /api/unidades — cadastra nova unidade
router.post("/", async (req, res) => {
    const { unidade_codigo, unidade, unidade_sigla } = req.body;

    if (!unidade_codigo || !unidade || !unidade_sigla) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Código, Nome e Sigla são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            "INSERT INTO unidades (unidade_codigo, unidade, unidade_sigla) VALUES ($1, $2, $3) RETURNING *",
            [unidade_codigo.trim(), unidade.trim(), unidade_sigla.trim().toUpperCase()]
        );
        return res.status(201).json({ status: "success", message: "Unidade cadastrada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar unidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar unidade.", data: null });
    }
});

// PUT /api/unidades/:id — atualiza unidade
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { unidade_codigo, unidade, unidade_sigla } = req.body;

    if (!unidade_codigo || !unidade || !unidade_sigla) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Código, Nome e Sigla são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            "UPDATE unidades SET unidade_codigo = $1, unidade = $2, unidade_sigla = $3 WHERE unidade_id = $4 RETURNING *",
            [unidade_codigo.trim(), unidade.trim(), unidade_sigla.trim().toUpperCase(), id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Unidade não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Unidade atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar unidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar unidade.", data: null });
    }
});

// DELETE /api/unidades/:id — remove unidade
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query(
            "DELETE FROM unidades WHERE unidade_id = $1",
            [id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Unidade não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Unidade excluída com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir unidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir unidade.", data: null });
    }
});

module.exports = router;
