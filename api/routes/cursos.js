const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

// GET /api/cursos — lista cursos (com contagem de turmas), para filtros
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.id_curso, c.cod_curso, c.nome,
                   COUNT(t.id_turma)::int AS total_turmas
            FROM cursos c
            LEFT JOIN turmas t ON t.curso_id = c.id_curso
            GROUP BY c.id_curso
            ORDER BY c.nome
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar cursos:");
        return res.status(500).json({ status: "error", message: "Erro ao listar cursos.", data: null });
    }
});

module.exports = router;
