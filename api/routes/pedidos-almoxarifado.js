const express = require("express");
const WebSocket = require("ws");
const pool = require("../config/database.js");
const { getNivelAcesso, getEscopoFiltro } = require("../middlewares/autorizar.js");

module.exports = function (wss) {
    const router = express.Router();

    // Broadcast para diretor/super_admin (secretaria)
    function broadcastPedidoPendente(pedido) {
        if (!wss) return;
        const msg = JSON.stringify({ tipo: "pedido_pendente", pedido });
        wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN || !client.usuario) return;
            const u = client.usuario;
            const isSecretaria =
                u.permissao === "super_admin" ||
                u.permissao === "diretor" ||
                u.permissao === "vice_diretor" ||
                u.is_direcao_centro === true;
            if (isSecretaria) client.send(msg);
        });
    }

    // GET / — lista pedidos (com contagem de itens, filtrado por escopo)
    router.get("/", async (req, res) => {
        try {
            const nivel = req.nivelAcesso;
            const params = [];
            let whereClause = "";

            if (nivel === "chefe" || nivel === "servidor") {
                params.push(req.usuario.subunidade);
                whereClause = `AND pa.subunidade_id = $1`;
            }

            const { rows } = await pool.query(
                `SELECT pa.id_pedido, pa.subunidade_id, pa.observacao,
                        pa.status, pa.data_pedido, pa.createdat,
                        s.subunidade_nome, s.subunidade_sigla,
                        COUNT(i.id_item)::int AS total_itens
                 FROM pedidos_almoxarifado pa
                 LEFT JOIN subunidades s ON s.subunidade_id = pa.subunidade_id
                 LEFT JOIN itens_pedido_almoxarifado i ON i.pedido_id = pa.id_pedido
                 WHERE 1=1 ${whereClause}
                 GROUP BY pa.id_pedido, s.subunidade_nome, s.subunidade_sigla
                 ORDER BY pa.data_pedido DESC, pa.id_pedido DESC`,
                params
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            console.error("Erro ao listar pedidos:", error);
            return res.status(500).json({ status: "error", message: "Erro ao listar pedidos.", data: null });
        }
    });

    // GET /:id/itens — lista os itens de um pedido
    router.get("/:id/itens", async (req, res) => {
        const { id } = req.params;
        try {
            const { rows } = await pool.query(
                `SELECT id_item, pedido_id, codigo_produto, descricao_produto, quantidade
                 FROM itens_pedido_almoxarifado
                 WHERE pedido_id = $1
                 ORDER BY id_item`,
                [id]
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            console.error("Erro ao listar itens:", error);
            return res.status(500).json({ status: "error", message: "Erro ao listar itens.", data: null });
        }
    });

    // POST / — cria pedido + itens atomicamente; transmite via WS se status=pendente
    router.post("/", async (req, res) => {
        const { observacao, itens } = req.body;

        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "O pedido deve conter pelo menos um item.",
                data: null
            });
        }
        for (const item of itens) {
            if (!item.descricao_produto || String(item.descricao_produto).trim() === "") {
                return res.status(400).json({
                    status: "error",
                    message: "Todos os itens precisam de uma descrição.",
                    data: null
                });
            }
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const { rows: pedidoRows } = await client.query(
                `INSERT INTO pedidos_almoxarifado (subunidade_id, observacao, status)
                 VALUES ($1, $2, 'pendente') RETURNING *`,
                [req.usuario.subunidade, observacao || null]
            );
            const pedido = pedidoRows[0];

            for (const item of itens) {
                await client.query(
                    `INSERT INTO itens_pedido_almoxarifado
                        (pedido_id, codigo_produto, descricao_produto, quantidade)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        pedido.id_pedido,
                        item.codigo_produto?.trim() || null,
                        item.descricao_produto.trim(),
                        item.quantidade || 1
                    ]
                );
            }

            await client.query("COMMIT");

            // Busca info completa para o broadcast
            const { rows: info } = await pool.query(
                `SELECT pa.id_pedido, pa.data_pedido, pa.status,
                        s.subunidade_nome, s.subunidade_sigla,
                        COUNT(i.id_item)::int AS total_itens
                 FROM pedidos_almoxarifado pa
                 LEFT JOIN subunidades s ON s.subunidade_id = pa.subunidade_id
                 LEFT JOIN itens_pedido_almoxarifado i ON i.pedido_id = pa.id_pedido
                 WHERE pa.id_pedido = $1
                 GROUP BY pa.id_pedido, s.subunidade_nome, s.subunidade_sigla`,
                [pedido.id_pedido]
            );

            broadcastPedidoPendente(info[0]);

            return res.status(201).json({
                status: "success",
                message: "Pedido enviado com sucesso.",
                data: info[0]
            });
        } catch (error) {
            await client.query("ROLLBACK");
            console.error("Erro ao criar pedido:", error);
            return res.status(500).json({ status: "error", message: "Erro ao criar pedido.", data: null });
        } finally {
            client.release();
        }
    });

    // PATCH /:id/status — atualiza status (secretaria marca como atendido/cancelado)
    router.patch("/:id/status", async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const statusPermitidos = ["pendente", "atendido", "cancelado"];

        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                status: "error",
                message: "Status inválido. Use: pendente, atendido ou cancelado.",
                data: null
            });
        }

        // Apenas diretor/super_admin pode marcar atendido; chefe pode cancelar o próprio
        const nivel = getNivelAcesso(req.usuario);
        if (status === "atendido" && nivel !== "diretor" && nivel !== "super_admin") {
            return res.status(403).json({
                status: "error",
                message: "Apenas a secretaria pode marcar um pedido como atendido.",
                data: null
            });
        }

        try {
            const { rows, rowCount } = await pool.query(
                `UPDATE pedidos_almoxarifado SET status = $1
                 WHERE id_pedido = $2 RETURNING *`,
                [status, id]
            );
            if (rowCount === 0) return res.status(404).json({ status: "error", message: "Pedido não encontrado.", data: null });
            return res.status(200).json({ status: "success", message: "Status atualizado.", data: rows[0] });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            return res.status(500).json({ status: "error", message: "Erro ao atualizar status.", data: null });
        }
    });

    // DELETE /:id — remove pedido (apenas se pendente e do próprio setor, ou diretor+)
    router.delete("/:id", async (req, res) => {
        const { id } = req.params;
        const nivel = getNivelAcesso(req.usuario);

        try {
            // Verifica se pedido pertence ao setor do usuário (chefe)
            const { rows, rowCount } = await pool.query(
                "SELECT * FROM pedidos_almoxarifado WHERE id_pedido = $1", [id]
            );
            if (rowCount === 0) return res.status(404).json({ status: "error", message: "Pedido não encontrado.", data: null });

            const pedido = rows[0];
            if (nivel === "chefe" || nivel === "servidor") {
                if (pedido.subunidade_id !== req.usuario.subunidade) {
                    return res.status(403).json({ status: "error", message: "Acesso negado.", data: null });
                }
                if (pedido.status === "atendido") {
                    return res.status(400).json({ status: "error", message: "Não é possível excluir um pedido já atendido.", data: null });
                }
            }

            await pool.query("DELETE FROM pedidos_almoxarifado WHERE id_pedido = $1", [id]);
            return res.status(200).json({ status: "success", message: "Pedido excluído.", data: null });
        } catch (error) {
            console.error("Erro ao excluir pedido:", error);
            return res.status(500).json({ status: "error", message: "Erro ao excluir pedido.", data: null });
        }
    });

    return router;
};
