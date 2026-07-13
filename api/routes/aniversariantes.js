const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

// GET /api/aniversariantes?mes=  — servidores que fazem aniversário no mês (dia/mês, sem ano)
//   ?mes=1..12 (default: mês atual). Acessível a qualquer usuário logado.
router.get("/", async (req, res) => {
    let mes = parseInt(req.query.mes, 10);
    if (Number.isNaN(mes) || mes < 1 || mes > 12) {
        mes = new Date().getMonth() + 1; // mês atual (1-based)
    }
    try {
        const { rows } = await pool.query(
            `SELECT u.nome,
                    EXTRACT(DAY FROM u.data_nascimento AT TIME ZONE 'UTC')::int AS dia,
                    to_char(u.data_nascimento AT TIME ZONE 'UTC', 'DD/MM') AS dia_mes,
                    s.subunidade_sigla, s.subunidade_nome
             FROM users u
             LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
             WHERE u.data_nascimento IS NOT NULL
               AND EXTRACT(MONTH FROM u.data_nascimento AT TIME ZONE 'UTC') = $1
             ORDER BY dia, u.nome`,
            [mes]
        );
        return res.status(200).json({ status: "success", message: "", data: { mes, aniversariantes: rows } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar aniversariantes:");
        return res.status(500).json({ status: "error", message: "Erro ao listar aniversariantes.", data: null });
    }
});

module.exports = router;
