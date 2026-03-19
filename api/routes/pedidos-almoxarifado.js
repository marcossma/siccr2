const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// GET / — lista pedidos com nome da subunidade
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT pa.id_pedido, pa.subunidade_id, pa.descricao_itens,
                   pa.quantidade, pa.data_pedido, pa.status, pa.observacao,
                   s.subunidade_nome
            FROM pedidos_almoxarifado pa
            LEFT JOIN subunidades s ON s.subunidade_id = pa.subunidade_id
            ORDER BY pa.data_pedido DESC, pa.id_pedido DESC
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar pedidos de almoxarifado:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar pedidos.", data: null });
    }
});

// POST / — registra novo pedido
router.post("/", async (req, res) => {
    const { subunidade_id, descricao_itens, quantidade, data_pedido, status, observacao } = req.body;

    if (!subunidade_id || !descricao_itens) {
        return res.status(400).json({
            status: "error",
            message: "Subunidade e descrição dos itens são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO pedidos_almoxarifado
                (subunidade_id, descricao_itens, quantidade, data_pedido, status, observacao)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                subunidade_id,
                descricao_itens,
                quantidade || null,
                data_pedido || null,
                status || "pendente",
                observacao || null
            ]
        );
        return res.status(201).json({ status: "success", message: "Pedido registrado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao registrar pedido de almoxarifado:", error);
        return res.status(500).json({ status: "error", message: "Erro ao registrar pedido.", data: null });
    }
});

// PUT /:id — atualiza pedido
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { subunidade_id, descricao_itens, quantidade, data_pedido, status, observacao } = req.body;

    if (!subunidade_id || !descricao_itens) {
        return res.status(400).json({
            status: "error",
            message: "Subunidade e descrição dos itens são obrigatórios.",
            data: null
        });
    }

    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE pedidos_almoxarifado
             SET subunidade_id=$1, descricao_itens=$2, quantidade=$3,
                 data_pedido=$4, status=$5, observacao=$6
             WHERE id_pedido=$7 RETURNING *`,
            [subunidade_id, descricao_itens, quantidade || null, data_pedido || null, status || "pendente", observacao || null, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Pedido não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Pedido atualizado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar pedido de almoxarifado:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar pedido.", data: null });
    }
});

// DELETE /:id — remove pedido
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM pedidos_almoxarifado WHERE id_pedido = $1", [id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Pedido não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Pedido excluído com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir pedido de almoxarifado:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir pedido.", data: null });
    }
});

module.exports = router;
