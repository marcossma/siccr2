const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

// GET /api/periodos-letivos — lista todos (ativo primeiro, depois por nome desc)
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM periodos_letivos ORDER BY ativo DESC, nome DESC"
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar períodos letivos:");
        return res.status(500).json({ status: "error", message: "Erro ao listar períodos letivos.", data: null });
    }
});

function validar(body) {
    const erros = [];
    if (!body.nome || String(body.nome).trim() === "") erros.push("O nome do período é obrigatório.");
    if (!body.data_inicio) erros.push("A data de início é obrigatória.");
    if (!body.data_fim) erros.push("A data de fim é obrigatória.");
    if (body.data_inicio && body.data_fim && body.data_inicio > body.data_fim) {
        erros.push("A data de início deve ser anterior à data de fim.");
    }
    return erros;
}

// POST /api/periodos-letivos
router.post("/", async (req, res) => {
    const erros = validar(req.body);
    if (erros.length > 0) {
        return res.status(400).json({ status: "error", message: erros.join(" "), data: null });
    }
    const { nome, data_inicio, data_fim, ativo } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Garante no máximo um período ativo
        if (ativo) {
            await client.query("UPDATE periodos_letivos SET ativo = FALSE WHERE ativo = TRUE");
        }
        const { rows } = await client.query(
            `INSERT INTO periodos_letivos (nome, data_inicio, data_fim, ativo)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [String(nome).trim(), data_inicio, data_fim, !!ativo]
        );
        await client.query("COMMIT");
        return res.status(201).json({ status: "success", message: "Período letivo cadastrado.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(400).json({ status: "error", message: "Já existe um período com esse nome.", data: null });
        }
        logger.error({ err: error }, "Erro ao cadastrar período letivo:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar período letivo.", data: null });
    } finally {
        client.release();
    }
});

// PUT /api/periodos-letivos/:id
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const erros = validar(req.body);
    if (erros.length > 0) {
        return res.status(400).json({ status: "error", message: erros.join(" "), data: null });
    }
    const { nome, data_inicio, data_fim, ativo } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        if (ativo) {
            await client.query("UPDATE periodos_letivos SET ativo = FALSE WHERE ativo = TRUE AND id_periodo <> $1", [id]);
        }
        const { rows, rowCount } = await client.query(
            `UPDATE periodos_letivos SET nome = $1, data_inicio = $2, data_fim = $3, ativo = $4
             WHERE id_periodo = $5 RETURNING *`,
            [String(nome).trim(), data_inicio, data_fim, !!ativo, id]
        );
        await client.query("COMMIT");
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Período não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Período letivo atualizado.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(400).json({ status: "error", message: "Já existe um período com esse nome.", data: null });
        }
        logger.error({ err: error }, "Erro ao atualizar período letivo:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar período letivo.", data: null });
    } finally {
        client.release();
    }
});

// DELETE /api/periodos-letivos/:id
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM periodos_letivos WHERE id_periodo = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Período não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Período letivo excluído.", data: null });
    } catch (error) {
        // FK violation (período em uso por turmas) → 23503
        if (error.code === "23503") {
            return res.status(400).json({ status: "error", message: "Não é possível excluir: há turmas neste período.", data: null });
        }
        logger.error({ err: error }, "Erro ao excluir período letivo:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir período letivo.", data: null });
    }
});

module.exports = router;
