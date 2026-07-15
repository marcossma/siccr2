"use strict";

/**
 * Envio de e-mail via Gmail (OAuth2), usando nodemailer.
 *
 * Fire-and-forget no mesmo espírito do lib/whatsapp.js: erros são logados,
 * nunca propagados — um e-mail que falha não pode derrubar a request.
 *
 * Configuração por ambiente (.env):
 *   GMAIL_USER                  conta que envia (ex.: siccr@ufsm.br)
 *   GMAIL_OAUTH_CLIENT_ID       Client ID do OAuth (Google Cloud Console)
 *   GMAIL_OAUTH_CLIENT_SECRET   Client Secret
 *   GMAIL_OAUTH_REFRESH_TOKEN   refresh token (use scripts/get-gmail-token.js)
 *   EMAIL_FROM                  (opcional) remetente exibido, ex.: "SICCR <siccr@ufsm.br>"
 *
 * Sem essas variáveis, o envio fica desabilitado silenciosamente.
 */

const nodemailer = require("nodemailer");
const logger = require("./logger.js");

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const user = process.env.GMAIL_USER;
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;
    if (!user || !clientId || !clientSecret || !refreshToken) return null;

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { type: "OAuth2", user, clientId, clientSecret, refreshToken },
    });
    return transporter;
}

/** Redige o e-mail no log (ex.: "ma***@ufsm.br"). */
function mascararEmail(to) {
    const e = Array.isArray(to) ? to[0] : String(to || "");
    const [nome, dom] = e.split("@");
    if (!dom) return "—";
    return `${nome.slice(0, 2)}***@${dom}`;
}

/** true se as credenciais estão presentes (para o painel/health-check). */
function estaConfigurado() {
    return getTransporter() !== null;
}

/**
 * Envia um e-mail. Nunca lança — falhas viram { ok: false, motivo }.
 * @param {{to:string|string[], subject:string, html?:string, text?:string, from?:string, replyTo?:string}} msg
 */
async function enviarEmail({ to, subject, html, text, from, replyTo } = {}) {
    const t = getTransporter();
    if (!t) {
        logger.debug("E-mail desabilitado (credenciais OAuth ausentes)");
        return { ok: false, motivo: "sem_credenciais" };
    }
    if (!to || !subject) {
        logger.warn("E-mail sem destinatário ou assunto — envio ignorado");
        return { ok: false, motivo: "invalido" };
    }
    try {
        const info = await t.sendMail({
            from: from || process.env.EMAIL_FROM || process.env.GMAIL_USER,
            to,
            subject,
            text: text || undefined,
            html: html || undefined,
            replyTo: replyTo || undefined,
        });
        logger.info({ messageId: info.messageId, to: mascararEmail(to) }, "E-mail enviado");
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        logger.error({ err: err.message, to: mascararEmail(to) }, "Falha ao enviar e-mail");
        return { ok: false, motivo: err.message };
    }
}

/** Testa as credenciais/conexão SMTP (para o painel). Nunca lança. */
async function verificar() {
    const t = getTransporter();
    if (!t) return { ok: false, motivo: "sem_credenciais" };
    try {
        await t.verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, motivo: err.message };
    }
}

module.exports = { enviarEmail, estaConfigurado, verificar };
