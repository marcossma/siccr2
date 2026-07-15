const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { enviarEmail, estaConfigurado } = require("../lib/email.js");

const router = express.Router();

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOTE_BCC = 45; // destinatários por mensagem (BCC), pra não expor endereços nem estourar limites

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Envolve o corpo (texto simples) num template com a identidade do SICCR
function montarHtml(corpo) {
    const corpoHtml = escapeHtml(corpo).replace(/\r?\n/g, "<br>");
    return `<div style="font-family:Verdana,Arial,sans-serif;max-width:640px;margin:auto;color:#222">
        <div style="background:#009536;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0"><strong>SICCR</strong> — Centro de Ciências Rurais</div>
        <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;line-height:1.5">${corpoHtml}</div>
        <p style="color:#999;font-size:11px;margin-top:12px">Mensagem enviada pelo SICCR. Por favor, não responda este e-mail.</p>
    </div>`;
}

// Resolve a especificação de destinatários numa lista única de e-mails (dedup)
async function resolverDestinatarios({ emails = [], userIds = [], subunidadeIds = [], grupos = [] } = {}) {
    const set = new Set();
    const partes = [];

    const avulsos = (emails || []).map((e) => String(e).trim().toLowerCase()).filter((e) => RE_EMAIL.test(e));
    avulsos.forEach((e) => set.add(e));
    if (avulsos.length) partes.push(`${avulsos.length} e-mail(s) avulso(s)`);

    const addRows = (rows) => rows.forEach((r) => r.email && set.add(String(r.email).trim().toLowerCase()));

    if ((grupos || []).includes("todos")) {
        const { rows } = await pool.query("SELECT email FROM users WHERE email IS NOT NULL AND email <> ''");
        addRows(rows);
        partes.push("Todos os servidores");
    } else {
        if ((grupos || []).includes("chefes")) {
            const { rows } = await pool.query("SELECT email FROM users WHERE permissao IN ('chefe','subchefe') AND email IS NOT NULL AND email <> ''");
            addRows(rows);
            partes.push("Chefes de setor");
        }
        if ((subunidadeIds || []).length) {
            const { rows } = await pool.query("SELECT email FROM users WHERE subunidade_id = ANY($1::int[]) AND email IS NOT NULL AND email <> ''", [subunidadeIds]);
            addRows(rows);
            partes.push(`${subunidadeIds.length} subunidade(s)`);
        }
        if ((userIds || []).length) {
            const { rows } = await pool.query("SELECT email FROM users WHERE user_id = ANY($1::int[]) AND email IS NOT NULL AND email <> ''", [userIds]);
            addRows(rows);
            partes.push(`${userIds.length} servidor(es) da lista`);
        }
    }
    return { emails: [...set], criterio: partes.join("; ") || "—" };
}

// GET /api/comunicados/destinatarios — opções para o painel
router.get("/destinatarios", async (_req, res) => {
    try {
        const servidores = await pool.query(
            `SELECT u.user_id, u.nome, u.email, u.permissao, u.subunidade_id, s.subunidade_sigla
             FROM users u LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
             WHERE u.email IS NOT NULL AND u.email <> ''
             ORDER BY u.nome`
        );
        const subunidades = await pool.query(
            `SELECT s.subunidade_id, s.subunidade_nome, s.subunidade_sigla,
                    COUNT(u.user_id) FILTER (WHERE u.email IS NOT NULL AND u.email <> '')::int AS total
             FROM subunidades s LEFT JOIN users u ON u.subunidade_id = s.subunidade_id
             GROUP BY s.subunidade_id ORDER BY s.subunidade_nome`
        );
        const totais = await pool.query(
            `SELECT COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS todos,
                    COUNT(*) FILTER (WHERE permissao IN ('chefe','subchefe') AND email IS NOT NULL AND email <> '')::int AS chefes
             FROM users`
        );
        return res.status(200).json({
            status: "success", message: "",
            data: {
                servidores: servidores.rows,
                subunidades: subunidades.rows,
                total_todos: totais.rows[0].todos,
                total_chefes: totais.rows[0].chefes,
                email_configurado: estaConfigurado(),
            },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar destinatários:");
        return res.status(500).json({ status: "error", message: "Erro ao listar destinatários.", data: null });
    }
});

// POST /api/comunicados/preview — resolve destinatários (conta) sem enviar
router.post("/preview", async (req, res) => {
    try {
        const { emails, criterio } = await resolverDestinatarios(req.body || {});
        return res.status(200).json({ status: "success", message: "", data: { total: emails.length, amostra: emails.slice(0, 10), criterio } });
    } catch (error) {
        logger.error({ err: error }, "Erro no preview de destinatários:");
        return res.status(500).json({ status: "error", message: "Erro ao calcular destinatários.", data: null });
    }
});

// POST /api/comunicados — envia o comunicado (BCC em lote) e registra
router.post("/", async (req, res) => {
    const assunto = String(req.body.assunto || "").trim();
    const corpo = String(req.body.corpo || "").trim();
    if (!assunto || !corpo) {
        return res.status(400).json({ status: "error", message: "Assunto e mensagem são obrigatórios.", data: null });
    }
    if (!estaConfigurado()) {
        return res.status(503).json({ status: "error", message: "Envio de e-mail não configurado no servidor.", data: null });
    }
    try {
        const { emails, criterio } = await resolverDestinatarios(req.body || {});
        if (emails.length === 0) {
            return res.status(400).json({ status: "error", message: "Nenhum destinatário válido selecionado.", data: null });
        }

        const html = montarHtml(corpo);
        let enviados = 0, falhas = 0;
        for (let i = 0; i < emails.length; i += LOTE_BCC) {
            const lote = emails.slice(i, i + LOTE_BCC);
            const r = await enviarEmail({ bcc: lote, subject: assunto, html, text: corpo });
            if (r.ok) enviados += lote.length; else falhas += lote.length;
        }

        await pool.query(
            `INSERT INTO comunicados (assunto, corpo, criterio, total_destinatarios, enviados, falhas, enviado_por_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [assunto, corpo, criterio, emails.length, enviados, falhas, req.usuario.id]
        );

        return res.status(200).json({
            status: "success",
            message: `Comunicado enviado: ${enviados} ok, ${falhas} falha(s).`,
            data: { total: emails.length, enviados, falhas },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao enviar comunicado:");
        return res.status(500).json({ status: "error", message: "Erro ao enviar comunicado.", data: null });
    }
});

// GET /api/comunicados — histórico de envios
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.id_comunicado, c.assunto, c.criterio, c.total_destinatarios, c.enviados, c.falhas, c.createdat,
                    u.nome AS enviado_por_nome
             FROM comunicados c LEFT JOIN users u ON u.user_id = c.enviado_por_user_id
             ORDER BY c.createdat DESC LIMIT 50`
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar comunicados:");
        return res.status(500).json({ status: "error", message: "Erro ao listar comunicados.", data: null });
    }
});

module.exports = router;
