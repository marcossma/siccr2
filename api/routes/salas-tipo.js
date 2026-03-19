const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET /api/salas-tipo — lista todos os tipos de sala
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM salas_tipo ORDER BY sala_tipo_nome"
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar tipos de sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar tipos de sala.", data: null });
    }
});

// POST /api/salas-tipo — cadastra novo tipo de sala
router.post("/", async (req, res) => {
    const { sala_tipo_nome } = req.body;

    if (!sala_tipo_nome) {
        return res.status(400).json({
            status: "error",
            message: "O campo Tipo de Sala é obrigatório.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            "INSERT INTO salas_tipo (sala_tipo_nome) VALUES ($1) RETURNING *",
            [sala_tipo_nome.trim()]
        );
        return res.status(201).json({ status: "success", message: "Tipo de sala cadastrado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar tipo de sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar tipo de sala.", data: null });
    }
});

// PUT /api/salas-tipo/:id — atualiza tipo de sala
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { sala_tipo_nome } = req.body;

    if (!sala_tipo_nome) {
        return res.status(400).json({
            status: "error",
            message: "O campo Tipo de Sala é obrigatório.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            "UPDATE salas_tipo SET sala_tipo_nome = $1 WHERE sala_tipo_id = $2 RETURNING *",
            [sala_tipo_nome.trim(), id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Tipo de sala não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Tipo de sala atualizado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar tipo de sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar tipo de sala.", data: null });
    }
});

// DELETE /api/salas-tipo/:id — remove tipo de sala
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query(
            "DELETE FROM salas_tipo WHERE sala_tipo_id = $1", [id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Tipo de sala não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Tipo de sala excluído com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir tipo de sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir tipo de sala.", data: null });
    }
});

module.exports = router;
