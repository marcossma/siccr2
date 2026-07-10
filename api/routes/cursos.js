const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

// GET /api/cursos — lista cursos (com contagem de turmas), para filtros.
//   ?incluir_pos=1 traz também os de pós-graduação (por padrão só graduação).
router.get("/", async (req, res) => {
    const incluirPos = req.query.incluir_pos === "1" || req.query.incluir_pos === "true";
    const where = incluirPos ? "" : "WHERE c.nivel <> 'pos_graduacao'";
    try {
        const { rows } = await pool.query(`
            SELECT c.id_curso, c.cod_curso, c.nome, c.nivel,
                   COUNT(t.id_turma)::int AS total_turmas
            FROM cursos c
            LEFT JOIN turmas t ON t.curso_id = c.id_curso
            ${where}
            GROUP BY c.id_curso
            ORDER BY c.nome
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar cursos:");
        return res.status(500).json({ status: "error", message: "Erro ao listar cursos.", data: null });
    }
});

// PATCH /api/cursos/:id — ajuste manual do nível (graduacao | pos_graduacao)
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { nivel } = req.body;
    if (nivel !== "graduacao" && nivel !== "pos_graduacao") {
        return res.status(400).json({ status: "error", message: "Nível inválido (use graduacao ou pos_graduacao).", data: null });
    }
    try {
        const { rows, rowCount } = await pool.query(
            "UPDATE cursos SET nivel = $1 WHERE id_curso = $2 RETURNING id_curso, cod_curso, nome, nivel",
            [nivel, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Curso não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Nível atualizado.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao atualizar nível do curso:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar nível do curso.", data: null });
    }
});

module.exports = router;
