const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");

const router = express.Router();

const ESTADOS = ["novo", "bom", "regular", "ruim", "inservivel"];

function limpar(v, max) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s.slice(0, max);
}

// subunidade_id do bem é derivada da sala onde ele está (para RBAC/relatórios)
async function subunidadeDaSala(salaId) {
    if (!salaId) return null;
    const { rows } = await pool.query("SELECT subunidade_id FROM salas WHERE sala_id = $1", [salaId]);
    return rows.length ? rows[0].subunidade_id : null;
}

// Busca o bem existente por número (com a sala atual) — usado ao tratar duplicidade
async function bemPorNumero(numero) {
    const { rows } = await pool.query(
        `SELECT b.id_bem, b.numero_registro, b.descricao, b.sala_id, s.sala_nome
         FROM bens_permanentes b
         LEFT JOIN salas s ON s.sala_id = b.sala_id
         WHERE b.numero_registro = $1`,
        [numero]
    );
    return rows[0] || null;
}

// Monta a resposta 409 de duplicidade informando ONDE o bem já está (para oferecer "mover")
async function conflito409(res, numero) {
    const existente = await bemPorNumero(numero);
    const onde = existente && existente.sala_nome ? ` na sala ${existente.sala_nome}` : "";
    return res.status(409).json({
        status: "error",
        message: `Tombo "${numero}" já cadastrado${onde}.`,
        data: { bem_existente: existente },
    });
}

// Grava um evento no log de auditoria (dentro da mesma transação da mudança)
async function registrarHistorico(client, ev) {
    await client.query(
        `INSERT INTO patrimonio_historico
            (bem_id, numero_registro, acao, user_id, sala_id, sala_anterior_id, detalhe)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ev.bem_id ?? null, ev.numero_registro ?? null, ev.acao, ev.user_id ?? null,
         ev.sala_id ?? null, ev.sala_anterior_id ?? null, ev.detalhe ? String(ev.detalhe).slice(0, 500) : null]
    );
}

// GET /api/patrimonio?sala_id= — lista bens de uma sala (com quem cadastrou)
router.get("/", async (req, res) => {
    const { sala_id } = req.query;
    if (!sala_id) {
        return res.status(400).json({ status: "error", message: "sala_id é obrigatório.", data: null });
    }
    try {
        const { rows } = await pool.query(
            `SELECT b.id_bem, b.numero_registro, b.descricao, b.sala_id, b.subunidade_id,
                    b.estado_conservacao, b.observacao, b.data_levantamento, b.createdat,
                    b.created_by_user_id, u.nome AS created_by_nome
             FROM bens_permanentes b
             LEFT JOIN users u ON u.user_id = b.created_by_user_id
             WHERE b.sala_id = $1
             ORDER BY b.descricao, b.numero_registro`,
            [sala_id]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar bens:");
        return res.status(500).json({ status: "error", message: "Erro ao listar bens.", data: null });
    }
});

// GET /api/patrimonio/:id/historico — linha do tempo de eventos do bem (auditoria)
router.get("/:id/historico", async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT h.id_historico, h.acao, h.detalhe, h.createdat, h.numero_registro,
                    u.nome AS usuario_nome,
                    s.sala_nome AS sala_nome, sa.sala_nome AS sala_anterior_nome
             FROM patrimonio_historico h
             LEFT JOIN users u ON u.user_id = h.user_id
             LEFT JOIN salas s ON s.sala_id = h.sala_id
             LEFT JOIN salas sa ON sa.sala_id = h.sala_anterior_id
             WHERE h.bem_id = $1
             ORDER BY h.createdat DESC, h.id_historico DESC`,
            [id]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao buscar histórico do bem:");
        return res.status(500).json({ status: "error", message: "Erro ao buscar histórico.", data: null });
    }
});

// POST /api/patrimonio — cadastra bem (associado a uma sala)
router.post("/", async (req, res) => {
    const numero = limpar(req.body.numero_registro, 60);
    const descricao = limpar(req.body.descricao, 255);
    const salaId = req.body.sala_id || null;
    const estado = limpar(req.body.estado_conservacao, 20);
    const observacao = limpar(req.body.observacao, 255);
    const dataLev = limpar(req.body.data_levantamento, 10);

    if (!numero || !descricao) {
        return res.status(400).json({ status: "error", message: "Número de registro e descrição são obrigatórios.", data: null });
    }
    if (estado && !ESTADOS.includes(estado)) {
        return res.status(400).json({ status: "error", message: "Estado de conservação inválido.", data: null });
    }
    const client = await pool.connect();
    try {
        const subId = await subunidadeDaSala(salaId);
        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO bens_permanentes
                (numero_registro, descricao, sala_id, subunidade_id, estado_conservacao, observacao, data_levantamento, created_by_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [numero, descricao, salaId, subId, estado, observacao, dataLev, req.usuario.id]
        );
        const bem = rows[0];
        await registrarHistorico(client, {
            bem_id: bem.id_bem, numero_registro: numero, acao: "cadastro",
            user_id: req.usuario.id, sala_id: salaId, detalhe: `Cadastrado: "${descricao}"`,
        });
        await client.query("COMMIT");
        return res.status(201).json({ status: "success", message: "Bem cadastrado.", data: bem });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") return conflito409(res, numero);
        logger.error({ err: error }, "Erro ao cadastrar bem:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar bem.", data: null });
    } finally {
        client.release();
    }
});

// PUT /api/patrimonio/:id — atualiza bem (registra o que mudou)
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const numero = limpar(req.body.numero_registro, 60);
    const descricao = limpar(req.body.descricao, 255);
    const salaId = req.body.sala_id || null;
    const estado = limpar(req.body.estado_conservacao, 20);
    const observacao = limpar(req.body.observacao, 255);
    const dataLev = limpar(req.body.data_levantamento, 10);

    if (!numero || !descricao) {
        return res.status(400).json({ status: "error", message: "Número de registro e descrição são obrigatórios.", data: null });
    }
    if (estado && !ESTADOS.includes(estado)) {
        return res.status(400).json({ status: "error", message: "Estado de conservação inválido.", data: null });
    }
    const client = await pool.connect();
    try {
        const atual = await client.query("SELECT * FROM bens_permanentes WHERE id_bem = $1", [id]);
        if (atual.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        }
        const antes = atual.rows[0];
        const subId = await subunidadeDaSala(salaId);

        await client.query("BEGIN");
        const { rows } = await client.query(
            `UPDATE bens_permanentes
             SET numero_registro=$1, descricao=$2, sala_id=$3, subunidade_id=$4,
                 estado_conservacao=$5, observacao=$6, data_levantamento=$7
             WHERE id_bem=$8 RETURNING *`,
            [numero, descricao, salaId, subId, estado, observacao, dataLev, id]
        );

        // Descreve as mudanças de campo para a auditoria
        const mud = [];
        if ((antes.numero_registro || "") !== (numero || "")) mud.push(`nº registro: "${antes.numero_registro}" → "${numero}"`);
        if ((antes.descricao || "") !== (descricao || "")) mud.push(`descrição: "${antes.descricao}" → "${descricao}"`);
        if ((antes.estado_conservacao || "") !== (estado || "")) mud.push(`estado: ${antes.estado_conservacao || "—"} → ${estado || "—"}`);
        if ((antes.observacao || "") !== (observacao || "")) mud.push("observação alterada");
        const salaMudou = String(antes.sala_id || "") !== String(salaId || "");
        const acao = salaMudou ? "movimentacao" : "edicao";
        await registrarHistorico(client, {
            bem_id: id, numero_registro: numero, acao, user_id: req.usuario.id,
            sala_id: salaId, sala_anterior_id: salaMudou ? antes.sala_id : null,
            detalhe: mud.join("; ") || "sem alterações de campo",
        });
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Bem atualizado.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") return conflito409(res, numero);
        logger.error({ err: error }, "Erro ao atualizar bem:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar bem.", data: null });
    } finally {
        client.release();
    }
});

// PATCH /api/patrimonio/:id/mover — transfere um bem para outra sala (levantamento)
router.patch("/:id/mover", async (req, res) => {
    const { id } = req.params;
    const salaId = req.body.sala_id || null;
    if (!salaId) {
        return res.status(400).json({ status: "error", message: "sala_id é obrigatório.", data: null });
    }
    const client = await pool.connect();
    try {
        const atual = await client.query("SELECT id_bem, numero_registro, sala_id FROM bens_permanentes WHERE id_bem = $1", [id]);
        if (atual.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        }
        const antes = atual.rows[0];
        const subId = await subunidadeDaSala(salaId);

        await client.query("BEGIN");
        const { rows } = await client.query(
            `UPDATE bens_permanentes
             SET sala_id = $1, subunidade_id = $2, data_levantamento = CURRENT_DATE
             WHERE id_bem = $3 RETURNING *`,
            [salaId, subId, id]
        );
        await registrarHistorico(client, {
            bem_id: id, numero_registro: antes.numero_registro, acao: "movimentacao",
            user_id: req.usuario.id, sala_id: salaId, sala_anterior_id: antes.sala_id,
            detalhe: "Movido para esta sala no levantamento",
        });
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Bem movido para esta sala.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao mover bem:");
        return res.status(500).json({ status: "error", message: "Erro ao mover bem.", data: null });
    } finally {
        client.release();
    }
});

// DELETE /api/patrimonio/:id — remove bem (registra a exclusão antes)
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const atual = await client.query("SELECT id_bem, numero_registro, sala_id, descricao FROM bens_permanentes WHERE id_bem = $1", [id]);
        if (atual.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Bem não encontrado.", data: null });
        }
        const antes = atual.rows[0];
        await client.query("BEGIN");
        // Registra a exclusão ANTES do DELETE (o DELETE seta bem_id=NULL nos eventos, mas o
        // snapshot de numero_registro preserva a rastreabilidade para auditoria).
        await registrarHistorico(client, {
            bem_id: id, numero_registro: antes.numero_registro, acao: "exclusao",
            user_id: req.usuario.id, sala_id: antes.sala_id, detalhe: `Excluído: "${antes.descricao}"`,
        });
        await client.query("DELETE FROM bens_permanentes WHERE id_bem = $1", [id]);
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Bem excluído.", data: null });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao excluir bem:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir bem.", data: null });
    } finally {
        client.release();
    }
});

module.exports = router;
