const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET /api/funcionalidades — lista todas (super_admin)
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, nome, descricao, modulo
             FROM funcionalidades
             ORDER BY modulo, nome`
        );
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

module.exports = router;
