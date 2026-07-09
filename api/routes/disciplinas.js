const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

// GET /api/disciplinas/professores-disponiveis — usuários que podem ser vinculados como professor
// (qualquer usuário; "ser professor" = ter vínculo com disciplina)
router.get("/professores-disponiveis", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT user_id, nome, siape FROM users ORDER BY nome"
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar professores disponíveis:");
        return res.status(500).json({ status: "error", message: "Erro ao listar usuários.", data: null });
    }
});

// GET /api/disciplinas — lista disciplinas com professores agregados
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT d.id_disciplina, d.codigo, d.nome, d.carga_horaria, d.subunidade_id,
                   s.subunidade_nome, s.subunidade_sigla,
                   COALESCE(
                       json_agg(
                           json_build_object('user_id', u.user_id, 'nome', u.nome)
                           ORDER BY u.nome
                       ) FILTER (WHERE u.user_id IS NOT NULL), '[]'
                   ) AS professores
            FROM disciplinas d
            LEFT JOIN subunidades s ON s.subunidade_id = d.subunidade_id
            LEFT JOIN professores_disciplinas pd ON pd.disciplina_id = d.id_disciplina
            LEFT JOIN users u ON u.user_id = pd.user_id
            GROUP BY d.id_disciplina, s.subunidade_nome, s.subunidade_sigla
            ORDER BY d.nome
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar disciplinas:");
        return res.status(500).json({ status: "error", message: "Erro ao listar disciplinas.", data: null });
    }
});

function parseCargaHoraria(valor) {
    if (valor === undefined || valor === null || valor === "") return null;
    const n = parseInt(valor, 10);
    return Number.isNaN(n) || n < 0 ? null : n;
}

// Sincroniza o vínculo professores_disciplinas para uma disciplina (dentro de uma transação)
async function sincronizarProfessores(client, disciplinaId, professores) {
    await client.query("DELETE FROM professores_disciplinas WHERE disciplina_id = $1", [disciplinaId]);
    if (Array.isArray(professores) && professores.length > 0) {
        // Remove duplicados e valores inválidos
        const ids = [...new Set(professores.map((p) => parseInt(p, 10)).filter((n) => !Number.isNaN(n)))];
        for (const userId of ids) {
            await client.query(
                "INSERT INTO professores_disciplinas (user_id, disciplina_id) VALUES ($1, $2)",
                [userId, disciplinaId]
            );
        }
    }
}

// POST /api/disciplinas
router.post("/", async (req, res) => {
    const { codigo, nome, carga_horaria, subunidade_id, professores } = req.body;
    if (!nome || String(nome).trim() === "") {
        return res.status(400).json({ status: "error", message: "O nome da disciplina é obrigatório.", data: null });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO disciplinas (codigo, nome, carga_horaria, subunidade_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [codigo ? String(codigo).trim() : null, String(nome).trim(),
             parseCargaHoraria(carga_horaria), subunidade_id || null]
        );
        await sincronizarProfessores(client, rows[0].id_disciplina, professores);
        await client.query("COMMIT");
        return res.status(201).json({ status: "success", message: "Disciplina cadastrada.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao cadastrar disciplina:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar disciplina.", data: null });
    } finally {
        client.release();
    }
});

// PUT /api/disciplinas/:id
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { codigo, nome, carga_horaria, subunidade_id, professores } = req.body;
    if (!nome || String(nome).trim() === "") {
        return res.status(400).json({ status: "error", message: "O nome da disciplina é obrigatório.", data: null });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows, rowCount } = await client.query(
            `UPDATE disciplinas SET codigo = $1, nome = $2, carga_horaria = $3, subunidade_id = $4
             WHERE id_disciplina = $5 RETURNING *`,
            [codigo ? String(codigo).trim() : null, String(nome).trim(),
             parseCargaHoraria(carga_horaria), subunidade_id || null, id]
        );
        if (rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ status: "error", message: "Disciplina não encontrada.", data: null });
        }
        await sincronizarProfessores(client, id, professores);
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Disciplina atualizada.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao atualizar disciplina:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar disciplina.", data: null });
    } finally {
        client.release();
    }
});

// DELETE /api/disciplinas/:id
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM disciplinas WHERE id_disciplina = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Disciplina não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Disciplina excluída.", data: null });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ status: "error", message: "Não é possível excluir: há turmas usando esta disciplina.", data: null });
        }
        logger.error({ err: error }, "Erro ao excluir disciplina:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir disciplina.", data: null });
    }
});

module.exports = router;
