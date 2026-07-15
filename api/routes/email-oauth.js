"use strict";

/**
 * Rota de setup (uma vez) para obter o refresh token do Gmail usando o DOMÍNIO
 * como redirect (fluxo do domínio no scripts/get-gmail-token.js).
 *
 * Pública por natureza — o retorno do Google é uma navegação do navegador, sem
 * JWT. É segura o suficiente para bootstrap: só troca um `code` de uso único,
 * emitido pelo Google para o nosso client, por um refresh token, e mostra o
 * resultado (via HTTPS) a quem acabou de autorizar a conta.
 *
 * Requer no .env: GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET e
 * EMAIL_OAUTH_REDIRECT (a mesma URL registrada no OAuth client).
 */

const express = require("express");
const logger = require("../lib/logger.js");

const router = express.Router();

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

router.get("/oauth2callback", async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.status(400).send("Erro na autorização: " + escapeHtml(error));
    if (!code) return res.status(400).send("Sem 'code' na resposta.");

    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.EMAIL_OAUTH_REDIRECT;
    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).send("Defina GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET e EMAIL_OAUTH_REDIRECT no .env e reinicie o app.");
    }

    try {
        const resp = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        const data = await resp.json();
        if (data.refresh_token) {
            logger.info("Refresh token do Gmail obtido via /oauth2callback");
            return res.send(
                `<!doctype html><meta charset="utf-8"><body style="font-family:Verdana,sans-serif;padding:24px;max-width:680px;margin:auto">
                 <h2 style="color:#009536">✅ Autorizado</h2>
                 <p>Copie a linha abaixo para o <code>.env</code> do app e reinicie:</p>
                 <pre style="background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all">GMAIL_OAUTH_REFRESH_TOKEN=${escapeHtml(data.refresh_token)}</pre>
                 <p style="color:#777;font-size:13px">Depois teste com <code>docker compose exec app npm run email:test -- voce@email.com</code>.</p>
                 </body>`
            );
        }
        logger.warn({ data }, "Troca de code não retornou refresh_token");
        return res.status(400).send(
            "<pre>" + escapeHtml(JSON.stringify(data, null, 2)) + "</pre><p>Garanta access_type=offline e prompt=consent (e reautorize).</p>"
        );
    } catch (err) {
        logger.error({ err: err.message }, "Falha ao trocar code por token (oauth2callback)");
        return res.status(500).send("Erro ao trocar o code por token.");
    }
});

module.exports = router;
