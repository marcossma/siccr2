const express = require("express");
const crypto  = require("crypto");
const pool    = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// Apenas super_admin em todas as rotas
function soSuperAdmin(req, res, next) {
    if (getNivelAcesso(req.usuario) !== "super_admin") {
        return res.status(403).json({
            status: "error",
            message: "Apenas super_admin pode gerenciar API Keys.",
            data: null
        });
    }
    next();
}
router.use(soSuperAdmin);

// Gera string no formato: siccr_<64 hex chars>
function gerarKey() {
    return "siccr_" + crypto.randomBytes(32).toString("hex");
}

// GET /api/api-keys — lista todas as chaves (sem expor o valor completo)
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ak.id, ak.subunidade_id, ak.descricao, ak.is_active, ak.created_at,
                   s.subunidade_nome, s.subunidade_sigla,
                   u.nome AS criado_por_nome,
                   -- Exibe apenas os primeiros 12 chars + '...' para não expor a chave
                   LEFT(ak.api_key, 14) || '...' AS api_key_preview
            FROM api_keys ak
            JOIN subunidades s ON s.subunidade_id = ak.subunidade_id
            LEFT JOIN users u ON u.user_id = ak.created_by
            ORDER BY s.subunidade_nome, ak.created_at DESC
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// POST /api/api-keys — gera nova chave para uma subunidade
// Body: { subunidade_id, descricao? }
router.post("/", async (req, res) => {
    const { subunidade_id, descricao } = req.body;
    if (!subunidade_id) {
        return res.status(400).json({
            status: "error",
            message: "subunidade_id é obrigatório.",
            data: null
        });
    }
    try {
        const novaKey = gerarKey();
        const { rows } = await pool.query(`
            INSERT INTO api_keys (subunidade_id, api_key, descricao, is_active, created_by, created_at)
            VALUES ($1, $2, $3, true, $4, NOW())
            RETURNING id, subunidade_id, descricao, is_active, created_at,
                      api_key AS api_key_full
        `, [subunidade_id, novaKey, descricao || null, req.usuario.id]);

        return res.status(201).json({
            status: "success",
            message: "API Key gerada. Copie agora — ela não será exibida novamente.",
            data: rows[0]  // api_key_full exposta apenas neste momento
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// PATCH /api/api-keys/:id/regenerar — invalida a chave atual e gera uma nova
router.patch("/:id/regenerar", async (req, res) => {
    const { id } = req.params;
    try {
        const novaKey = gerarKey();
        const { rows, rowCount } = await pool.query(`
            UPDATE api_keys
            SET api_key = $1, is_active = true, created_by = $2, created_at = NOW()
            WHERE id = $3
            RETURNING id, subunidade_id, descricao, is_active, created_at,
                      api_key AS api_key_full
        `, [novaKey, req.usuario.id, id]);

        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "API Key não encontrada.", data: null });
        }
        return res.status(200).json({
            status: "success",
            message: "API Key regenerada. Copie agora — ela não será exibida novamente.",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// PATCH /api/api-keys/:id/ativar — ativa ou desativa uma chave
// Body: { is_active: boolean }
router.patch("/:id/ativar", async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
        return res.status(400).json({ status: "error", message: "is_active deve ser boolean.", data: null });
    }
    try {
        const { rowCount } = await pool.query(
            "UPDATE api_keys SET is_active = $1 WHERE id = $2",
            [is_active, id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "API Key não encontrada.", data: null });
        }
        return res.status(200).json({
            status: "success",
            message: `API Key ${is_active ? "ativada" : "desativada"}.`,
            data: null
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// DELETE /api/api-keys/:id — remove a chave permanentemente
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM api_keys WHERE id = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "API Key não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "API Key removida.", data: null });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

module.exports = router;
