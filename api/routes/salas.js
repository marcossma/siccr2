const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /api/salas — lista salas (com filtro de escopo)
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM salas ORDER BY sala_nome");
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar salas:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar salas.", data: null });
    }
});

// GET /api/salas/total-info — lista salas com dados relacionados
router.get("/total-info", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let whereClause = "";
        let params = [];

        if (nivel === "chefe") {
            whereClause = "WHERE sa.subunidade_id = $1";
            params = [req.usuario.subunidade];
        } else if (nivel === "diretor") {
            whereClause = "WHERE p.unidade_id = $1";
            params = [req.usuario.unidade];
        }
        // super_admin vê tudo

        const { rows } = await pool.query(`
            SELECT
                sa.sala_id, sa.sala_nome, sa.sala_descricao,
                sa.predio_id, sa.subunidade_id, sa.is_agendavel, sa.sala_tipo_id,
                p.predio, p.descricao AS predio_descricao, p.unidade_id,
                s.subunidade_nome, s.subunidade_sigla,
                st.sala_tipo_nome
            FROM salas sa
            LEFT JOIN predios p ON p.predio_id = sa.predio_id
            LEFT JOIN subunidades s ON s.subunidade_id = sa.subunidade_id
            LEFT JOIN salas_tipo st ON st.sala_tipo_id = sa.sala_tipo_id
            ${whereClause}
            ORDER BY sa.sala_nome
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar salas (total-info):", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar informações das salas.", data: null });
    }
});

// POST /api/salas — cadastra nova sala
router.post("/", async (req, res) => {
    const { sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel, sala_tipo_id } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO salas (sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel, sala_tipo_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, predio_id,
             subunidade_id || null, is_agendavel ?? 0, sala_tipo_id || null]
        );
        return res.status(201).json({ status: "success", message: "Sala cadastrada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar sala.", data: null });
    }
});

// PUT /api/salas/:id — atualiza sala
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { sala_nome, sala_descricao, predio_id, subunidade_id, is_agendavel, sala_tipo_id } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE salas SET sala_nome=$1, sala_descricao=$2, subunidade_id=$3,
                 predio_id=$4, is_agendavel=$5, sala_tipo_id=$6
             WHERE sala_id=$7 RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, subunidade_id || null,
             predio_id, is_agendavel ?? 0, sala_tipo_id || null, id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Sala atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar sala.", data: null });
    }
});

// DELETE /api/salas/:id — remove sala
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query("DELETE FROM salas WHERE sala_id = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Sala excluída com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir sala:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir sala.", data: null });
    }
});

module.exports = router;
