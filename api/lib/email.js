"use strict";

/**
 * Envio de e-mail via Gmail API (OAuth2), escopo mínimo `gmail.send`.
 *
 * Usa a Gmail API (users.messages.send) em vez de SMTP — o SMTP do Gmail
 * exigiria o escopo amplo `https://mail.google.com/`; a API envia com o
 * escopo restrito `gmail.send`, mais seguro (só envio, sem ler a caixa).
 *
 * Fire-and-forget como o lib/whatsapp.js: erros são logados, nunca propagados.
 *
 * Configuração por ambiente (.env):
 *   GMAIL_USER                  conta que envia (a MESMA que autorizou o token)
 *   GMAIL_OAUTH_CLIENT_ID       Client ID do OAuth (Google Cloud Console)
 *   GMAIL_OAUTH_CLIENT_SECRET   Client Secret
 *   GMAIL_OAUTH_REFRESH_TOKEN   refresh token (escopo gmail.send)
 *   EMAIL_FROM                  (opcional) remetente exibido; default = GMAIL_USER
 *
 * Sem essas variáveis, o envio fica desabilitado silenciosamente.
 */

const MailComposer = require("nodemailer/lib/mail-composer");
const logger = require("./logger.js");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

let tokenCache = null; // { accessToken, exp (ms epoch) }

function credenciais() {
    return {
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    };
}

/** true se as credenciais estão presentes (para o painel/health-check). */
function estaConfigurado() {
    const c = credenciais();
    return !!(c.user && c.clientId && c.clientSecret && c.refreshToken);
}

/** Redige o e-mail no log (ex.: "ma***@gmail.com"). */
function mascararEmail(to) {
    const e = Array.isArray(to) ? to[0] : String(to || "");
    const [nome, dom] = e.split("@");
    if (!dom) return "—";
    return `${nome.slice(0, 2)}***@${dom}`;
}

/** Obtém (e cacheia) um access token a partir do refresh token. Lança em falha. */
async function getAccessToken() {
    if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.accessToken;
    const c = credenciais();
    const resp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: c.clientId,
            client_secret: c.clientSecret,
            refresh_token: c.refreshToken,
            grant_type: "refresh_token",
        }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || `http_${resp.status}`);
    }
    tokenCache = { accessToken: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
    return tokenCache.accessToken;
}

/**
 * Envia um e-mail. Nunca lança — falhas viram { ok: false, motivo }.
 * @param {{to:string|string[], subject:string, html?:string, text?:string, from?:string, replyTo?:string}} msg
 */
async function enviarEmail({ to, subject, html, text, from, replyTo } = {}) {
    if (!estaConfigurado()) {
        logger.debug("E-mail desabilitado (credenciais OAuth ausentes)");
        return { ok: false, motivo: "sem_credenciais" };
    }
    if (!to || !subject) {
        logger.warn("E-mail sem destinatário ou assunto — envio ignorado");
        return { ok: false, motivo: "invalido" };
    }
    try {
        const accessToken = await getAccessToken();
        const mail = new MailComposer({
            from: from || process.env.EMAIL_FROM || process.env.GMAIL_USER,
            to,
            subject,
            text: text || undefined,
            html: html || undefined,
            replyTo: replyTo || undefined,
        });
        const raw = await mail.compile().build();
        const encoded = raw.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const resp = await fetch(SEND_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: encoded }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const motivo = (data.error && data.error.message) || `http_${resp.status}`;
            logger.error({ err: motivo, to: mascararEmail(to) }, "Falha ao enviar e-mail (Gmail API)");
            return { ok: false, motivo };
        }
        logger.info({ messageId: data.id, to: mascararEmail(to) }, "E-mail enviado");
        return { ok: true, messageId: data.id };
    } catch (err) {
        logger.error({ err: err.message, to: mascararEmail(to) }, "Falha ao enviar e-mail");
        return { ok: false, motivo: err.message };
    }
}

/** Testa as credenciais (consegue um access token). Nunca lança. */
async function verificar() {
    if (!estaConfigurado()) return { ok: false, motivo: "sem_credenciais" };
    try {
        await getAccessToken();
        return { ok: true };
    } catch (err) {
        return { ok: false, motivo: err.message };
    }
}

module.exports = { enviarEmail, estaConfigurado, verificar };
