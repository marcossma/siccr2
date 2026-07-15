"use strict";

/**
 * Obtém o GMAIL_OAUTH_REFRESH_TOKEN via OAuth2 (fluxo loopback — sem OOB).
 *
 * Rode NA SUA MÁQUINA (precisa de um navegador). Uso:
 *   node scripts/get-gmail-token.js <client_id> <client_secret> [porta]
 * ou com variáveis de ambiente:
 *   GMAIL_OAUTH_CLIENT_ID=... GMAIL_OAUTH_CLIENT_SECRET=... node scripts/get-gmail-token.js
 *
 * Pré-requisito no Google Cloud Console (credencial "OAuth client ID", tipo
 * "Web application"): registrar o Authorized redirect URI:
 *   http://localhost:5555/oauth2callback   (ou a porta que você passar)
 *
 * O script imprime a linha GMAIL_OAUTH_REFRESH_TOKEN=... para colar no .env.
 */

const http = require("http");
const { URL } = require("url");

const clientId = process.argv[2] || process.env.GMAIL_OAUTH_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.GMAIL_OAUTH_CLIENT_SECRET;
const port = parseInt(process.argv[4] || process.env.OAUTH_PORT || "5555", 10);
const redirectUri = `http://localhost:${port}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

if (!clientId || !clientSecret) {
    console.error("ERRO: informe o Client ID e o Client Secret.");
    console.error("  node scripts/get-gmail-token.js <client_id> <client_secret> [porta]");
    process.exit(1);
}

const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
}).toString();

const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${port}`);
    if (u.pathname !== "/oauth2callback") { res.writeHead(404); res.end(); return; }

    const code = u.searchParams.get("code");
    const erro = u.searchParams.get("error");
    if (erro) { res.writeHead(400); res.end("Erro na autorização: " + erro); console.error("Erro:", erro); fechar(); return; }
    if (!code) { res.writeHead(400); res.end("Sem 'code' na resposta."); return; }

    try {
        const resp = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        const data = await resp.json();
        if (data.refresh_token) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h2>Pronto! ✅ Pode fechar esta aba e voltar ao terminal.</h2>");
            console.log("\n──────────────────────────────────────────────────────");
            console.log("✔ Refresh token obtido. Adicione ao seu .env:\n");
            console.log("GMAIL_OAUTH_REFRESH_TOKEN=" + data.refresh_token);
            console.log("──────────────────────────────────────────────────────\n");
        } else {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h2>Não veio refresh_token.</h2><pre>" + JSON.stringify(data, null, 2) + "</pre>");
            console.error("Resposta sem refresh_token (garanta prompt=consent e access_type=offline):", data);
        }
    } catch (err) {
        res.writeHead(500); res.end("Erro ao trocar o code por token.");
        console.error(err);
    }
    fechar();
});

function fechar() {
    setTimeout(() => { server.close(); process.exit(0); }, 800);
}

server.listen(port, () => {
    console.log("\n1) Abra este link no navegador (logado na conta que vai ENVIAR os e-mails):\n");
    console.log(authUrl + "\n");
    console.log(`2) Autorize. Aguardando o retorno em ${redirectUri} ...`);
});
