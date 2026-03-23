const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /api/funcionalidades — lista funcionalidades filtradas por escopo
// - super_admin/diretor: vê todas
// - chefe: vê apenas funcionalidades com subunidade_responsavel_id = sua subunidade
//          OU com subunidade_responsavel_id = NULL (permissões gerais)
router.get("/", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let query, params = [];

        if (nivel === "chefe" || nivel === "servidor") {
            query = `
                SELECT f.id, f.nome, f.descricao, f.modulo, f.subunidade_responsavel_id,
                       s.subunidade_nome AS setor_responsavel
                FROM funcionalidades f
                LEFT JOIN subunidades s ON s.subunidade_id = f.subunidade_responsavel_id
                WHERE f.subunidade_responsavel_id IS NULL
                   OR f.subunidade_responsavel_id = $1
                ORDER BY f.modulo, f.nome
            `;
            params = [req.usuario.subunidade];
        } else {
            query = `
                SELECT f.id, f.nome, f.descricao, f.modulo, f.subunidade_responsavel_id,
                       s.subunidade_nome AS setor_responsavel
                FROM funcionalidades f
                LEFT JOIN subunidades s ON s.subunidade_id = f.subunidade_responsavel_id
                ORDER BY f.modulo, f.nome
            `;
        }

        const { rows } = await pool.query(query, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// GET /api/funcionalidades/modulos — lista módulos distintos
router.get("/modulos", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT modulo FROM funcionalidades ORDER BY modulo`
        );
        return res.status(200).json({ status: "success", message: "", data: rows.map(r => r.modulo) });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// PUT /api/funcionalidades/:id/setor — super_admin define qual setor é responsável
// Body: { subunidade_responsavel_id: number | null }
router.put("/:id/setor", async (req, res) => {
    const nivel = getNivelAcesso(req.usuario);
    if (nivel !== "super_admin") {
        return res.status(403).json({
            status: "error",
            message: "Apenas super_admin pode configurar o setor responsável por uma funcionalidade.",
            data: null
        });
    }

    const { id } = req.params;
    const { subunidade_responsavel_id } = req.body;

    try {
        const { rowCount } = await pool.query(
            `UPDATE funcionalidades SET subunidade_responsavel_id = $1 WHERE id = $2`,
            [subunidade_responsavel_id || null, id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Funcionalidade não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Setor responsável atualizado.", data: null });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

module.exports = router;
