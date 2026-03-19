const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /api/predios — lista prédios
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM predios ORDER BY predio");
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar prédios:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar prédios.", data: null });
    }
});

// GET /api/predios/total-info — lista prédios com dados da unidade
router.get("/total-info", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let whereClause = "";
        let params = [];

        if (nivel === "diretor") {
            whereClause = "WHERE p.unidade_id = $1";
            params = [req.usuario.unidade];
        }
        // super_admin vê tudo; chefe vê tudo (precisa de todos os prédios para cadastrar salas)

        const { rows } = await pool.query(`
            SELECT
                p.predio_id, p.predio, p.descricao, p.unidade_id,
                u.unidade_codigo, u.unidade, u.unidade_sigla
            FROM predios p
            INNER JOIN unidades u ON u.unidade_id = p.unidade_id
            ${whereClause}
            ORDER BY p.predio
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar prédios (total-info):", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar informações dos prédios.", data: null });
    }
});

// POST /api/predios — cadastra novo prédio
router.post("/", async (req, res) => {
    const { predio, descricao, unidade_id } = req.body;

    if (!predio || !unidade_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação do Prédio e Unidade são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            "INSERT INTO predios (predio, descricao, unidade_id) VALUES ($1, $2, $3) RETURNING *",
            [predio.trim(), descricao || null, unidade_id]
        );
        return res.status(201).json({ status: "success", message: "Prédio cadastrado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar prédio:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar prédio.", data: null });
    }
});

// PUT /api/predios/:id — atualiza prédio
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { predio, descricao, unidade_id } = req.body;

    if (!predio || !unidade_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação do Prédio e Unidade são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            "UPDATE predios SET predio = $1, descricao = $2, unidade_id = $3 WHERE predio_id = $4 RETURNING *",
            [predio.trim(), descricao || null, unidade_id, id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Prédio não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Prédio atualizado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar prédio:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar prédio.", data: null });
    }
});

// DELETE /api/predios/:id — remove prédio
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query("DELETE FROM predios WHERE predio_id = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Prédio não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Prédio excluído com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir prédio:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir prédio.", data: null });
    }
});

module.exports = router;
