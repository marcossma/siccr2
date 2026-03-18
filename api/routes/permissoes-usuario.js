const express = require("express");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// GET /api/permissoes-usuario/:userId — permissões de um usuário específico
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    const solicitante = req.usuario;

    try {
        // Chefe só pode ver permissões de usuários da sua subunidade
        const nivelSolicitante = getNivelAcesso(solicitante);
        if (nivelSolicitante === "chefe") {
            const { rows: target } = await pool.query(
                "SELECT subunidade_id FROM users WHERE user_id = $1", [userId]
            );
            if (!target.length || target[0].subunidade_id !== solicitante.subunidade) {
                return res.status(403).json({
                    status: "error",
                    message: "Acesso negado. Usuário não pertence à sua subunidade.",
                    data: null
                });
            }
        }

        const { rows } = await pool.query(
            `SELECT pu.id, pu.funcionalidade_id, f.nome, f.descricao, f.modulo,
                    pu.concedido_por, pu.created_at,
                    u.nome AS concedido_por_nome
             FROM permissoes_usuario pu
             JOIN funcionalidades f ON f.id = pu.funcionalidade_id
             LEFT JOIN users u ON u.user_id = pu.concedido_por
             WHERE pu.user_id = $1
             ORDER BY f.modulo, f.nome`,
            [userId]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// POST /api/permissoes-usuario — concede permissão a um servidor
// Body: { user_id, funcionalidade_id }
router.post("/", async (req, res) => {
    const { user_id, funcionalidade_id } = req.body;
    const solicitante = req.usuario;

    if (!user_id || !funcionalidade_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos user_id e funcionalidade_id são obrigatórios.",
            data: null
        });
    }

    try {
        // Verificar se o alvo é servidor da mesma subunidade (para chefe)
        const nivelSolicitante = getNivelAcesso(solicitante);
        if (nivelSolicitante === "chefe") {
            const { rows: target } = await pool.query(
                "SELECT subunidade_id, permissao FROM users WHERE user_id = $1", [user_id]
            );
            if (!target.length) {
                return res.status(404).json({ status: "error", message: "Usuário não encontrado.", data: null });
            }
            if (target[0].subunidade_id !== solicitante.subunidade) {
                return res.status(403).json({
                    status: "error",
                    message: "Acesso negado. Usuário não pertence à sua subunidade.",
                    data: null
                });
            }
            if (!["servidor"].includes(target[0].permissao)) {
                return res.status(400).json({
                    status: "error",
                    message: "Permissões individuais só podem ser concedidas a servidores.",
                    data: null
                });
            }
        }

        await pool.query(
            `INSERT INTO permissoes_usuario (user_id, funcionalidade_id, concedido_por, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id, funcionalidade_id) DO NOTHING`,
            [user_id, funcionalidade_id, solicitante.id]
        );

        return res.status(201).json({ status: "success", message: "Permissão concedida.", data: null });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

// DELETE /api/permissoes-usuario/:id — revoga permissão
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const solicitante = req.usuario;

    try {
        // Buscar a permissão para validar escopo
        const { rows } = await pool.query(
            `SELECT pu.*, u.subunidade_id
             FROM permissoes_usuario pu
             JOIN users u ON u.user_id = pu.user_id
             WHERE pu.id = $1`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ status: "error", message: "Permissão não encontrada.", data: null });
        }

        const nivelSolicitante = getNivelAcesso(solicitante);
        if (nivelSolicitante === "chefe" && rows[0].subunidade_id !== solicitante.subunidade) {
            return res.status(403).json({
                status: "error",
                message: "Acesso negado. Usuário não pertence à sua subunidade.",
                data: null
            });
        }

        await pool.query("DELETE FROM permissoes_usuario WHERE id = $1", [id]);
        return res.status(200).json({ status: "success", message: "Permissão revogada.", data: null });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message, data: null });
    }
});

module.exports = router;
