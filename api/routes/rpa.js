/**
 * Rotas exclusivas para o agente RPA.
 * Autenticação via X-Api-Key (não requer JWT).
 */
const express   = require("express");
const WebSocket = require("ws");
const pool      = require("../config/database.js");

module.exports = function (wss) {
    const router = express.Router();

    function broadcastPedidoAtendido(pedido) {
        if (!wss) return;
        const msg = JSON.stringify({ tipo: "pedido_atendido", pedido });
        wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN || !client.usuario) return;
            const podeAtender =
                ["super_admin", "diretor", "vice_diretor"].includes(client.usuario.permissao)
                || client.usuario.is_direcao_centro
                || (Array.isArray(client.usuario.funcionalidades)
                    && client.usuario.funcionalidades.includes("atender_pedido_almoxarifado"));
            if (!podeAtender && client.usuario.subunidade === pedido.subunidade_id) {
                client.send(msg);
            }
        });
    }

    // GET /api/rpa/pedidos — lista todos os pedidos pendentes
    router.get("/pedidos", async (_req, res) => {
        try {
            const { rows } = await pool.query(`
                SELECT pa.id_pedido, pa.subunidade_id, pa.observacao,
                       pa.status, pa.data_pedido, pa.createdat,
                       s.subunidade_nome, s.subunidade_sigla,
                       COUNT(i.id_item)::int AS total_itens
                FROM pedidos_almoxarifado pa
                LEFT JOIN subunidades s ON s.subunidade_id = pa.subunidade_id
                LEFT JOIN itens_pedido_almoxarifado i ON i.pedido_id = pa.id_pedido
                WHERE pa.status = 'pendente'
                GROUP BY pa.id_pedido, s.subunidade_nome, s.subunidade_sigla
                ORDER BY pa.data_pedido ASC, pa.id_pedido ASC
            `);
            return res.status(200).json({ status: "success", data: rows });
        } catch (error) {
            return res.status(500).json({ status: "error", message: error.message, data: null });
        }
    });

    // GET /api/rpa/pedidos/:id/itens — itens de um pedido específico
    router.get("/pedidos/:id/itens", async (req, res) => {
        const { id } = req.params;
        try {
            const { rows } = await pool.query(
                `SELECT id_item, pedido_id, codigo_produto, descricao_produto, quantidade
                 FROM itens_pedido_almoxarifado
                 WHERE pedido_id = $1
                 ORDER BY id_item`,
                [id]
            );
            return res.status(200).json({ status: "success", data: rows });
        } catch (error) {
            return res.status(500).json({ status: "error", message: error.message, data: null });
        }
    });

    // PATCH /api/rpa/pedidos/:id/atender — marca pedido como atendido e notifica via WS
    router.patch("/pedidos/:id/atender", async (req, res) => {
        const { id } = req.params;
        try {
            const { rows, rowCount } = await pool.query(
                `UPDATE pedidos_almoxarifado
                 SET status = 'atendido', data_conclusao = NOW()
                 WHERE id_pedido = $1 AND status = 'pendente'
                 RETURNING *`,
                [id]
            );
            if (rowCount === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "Pedido não encontrado ou já atendido.",
                    data: null
                });
            }
            broadcastPedidoAtendido(rows[0]);
            return res.status(200).json({ status: "success", message: "Pedido marcado como atendido.", data: rows[0] });
        } catch (error) {
            return res.status(500).json({ status: "error", message: error.message, data: null });
        }
    });

    return router;
};
