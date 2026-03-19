const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /api/subunidades — lista subunidades (com filtro de escopo)
router.get("/", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let query, params = [];

        if (nivel === "super_admin" || nivel === "diretor") {
            query = "SELECT * FROM subunidades ORDER BY subunidade_nome";
        } else {
            query = "SELECT * FROM subunidades WHERE subunidade_id = $1 ORDER BY subunidade_nome";
            params = [req.usuario.subunidade];
        }

        const { rows } = await pool.query(query, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar subunidades:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar subunidades.", data: null });
    }
});

// GET /api/subunidades/total-info — lista subunidades com dados relacionados
router.get("/total-info", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let whereClause = "";
        let params = [];

        if (nivel === "chefe") {
            whereClause = "WHERE s.subunidade_id = $1";
            params = [req.usuario.subunidade];
        } else if (nivel === "diretor") {
            whereClause = "WHERE s.unidade_id = $1";
            params = [req.usuario.unidade];
        }
        // super_admin: sem filtro

        const { rows } = await pool.query(`
            SELECT
                s.subunidade_id,
                s.subunidade_nome,
                s.subunidade_codigo,
                s.subunidade_sigla,
                s.subunidade_email,
                s.unidade_id,
                s.predio_id,
                s.chefe,
                s.is_direcao_centro,
                u.unidade_codigo,
                u.unidade,
                u.unidade_sigla,
                p.predio,
                p.descricao AS predio_descricao,
                us.nome AS chefe_nome,
                us.siape AS chefe_siape,
                us.email AS chefe_email,
                COUNT(*) OVER() AS total_subunidades
            FROM subunidades s
            LEFT JOIN unidades u ON u.unidade_id = s.unidade_id
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            LEFT JOIN users us ON us.user_id = s.chefe
            ${whereClause}
            ORDER BY s.subunidade_nome
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar subunidades (total-info):", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar informações das subunidades.", data: null });
    }
});

// POST /api/subunidades — cadastra nova subunidade
router.post("/", async (req, res) => {
    let { subunidade_codigo, subunidade_nome, subunidade_sigla, unidade_id,
          predio_id, subunidade_email, chefe, is_direcao_centro } = req.body;

    if (!subunidade_codigo || !subunidade_nome || !unidade_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Código, Nome e Unidade são obrigatórios.",
            data: null
        });
    }

    // Normaliza separador decimal do código
    subunidade_codigo = subunidade_codigo.replace(",", ".");

    try {
        const { rows } = await pool.query(
            `INSERT INTO subunidades
                (subunidade_codigo, subunidade_nome, subunidade_sigla, unidade_id,
                 predio_id, subunidade_email, chefe, is_direcao_centro)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [subunidade_codigo, subunidade_nome.trim(),
             subunidade_sigla?.trim().toUpperCase() || null,
             unidade_id, predio_id || null, subunidade_email || null,
             chefe || null, is_direcao_centro === true || is_direcao_centro === "true"]
        );
        return res.status(201).json({ status: "success", message: "Subunidade cadastrada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar subunidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar subunidade.", data: null });
    }
});

// PUT /api/subunidades/:id — atualiza subunidade
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    let { subunidade_codigo, subunidade_nome, subunidade_sigla, unidade_id,
          predio_id, subunidade_email, chefe, is_direcao_centro } = req.body;

    if (!subunidade_codigo || !subunidade_nome || !unidade_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Código, Nome e Unidade são obrigatórios.",
            data: null
        });
    }

    subunidade_codigo = subunidade_codigo.replace(",", ".");

    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE subunidades SET
                subunidade_codigo = $1, subunidade_nome = $2, subunidade_sigla = $3,
                unidade_id = $4, predio_id = $5, subunidade_email = $6,
                chefe = $7, is_direcao_centro = $8
             WHERE subunidade_id = $9 RETURNING *`,
            [subunidade_codigo, subunidade_nome.trim(),
             subunidade_sigla?.trim().toUpperCase() || null,
             unidade_id, predio_id || null, subunidade_email || null,
             chefe || null, is_direcao_centro === true || is_direcao_centro === "true", id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Subunidade não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Subunidade atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar subunidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar subunidade.", data: null });
    }
});

// DELETE /api/subunidades/:id — remove subunidade
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query(
            "DELETE FROM subunidades WHERE subunidade_id = $1", [id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Subunidade não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Subunidade excluída com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir subunidade:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir subunidade.", data: null });
    }
});

module.exports = router;
