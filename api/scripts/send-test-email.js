"use strict";

/**
 * Envia um e-mail de teste para validar a configuração (Fase 1).
 * Uso: node scripts/send-test-email.js <destinatario@email>
 * (destinatário também pode vir de EMAIL_TESTE_TO no .env)
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
if (!process.env.GMAIL_USER) {
    require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
}

const { enviarEmail, verificar, estaConfigurado } = require("../lib/email.js");

async function main() {
    const to = process.argv[2] || process.env.EMAIL_TESTE_TO;
    if (!to) {
        console.error("Uso: node scripts/send-test-email.js <destinatario@email>");
        process.exit(1);
    }
    if (!estaConfigurado()) {
        console.error("E-mail NÃO configurado. Defina GMAIL_USER, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET e GMAIL_OAUTH_REFRESH_TOKEN no .env.");
        process.exit(1);
    }

    console.log("Verificando credenciais/conexão…");
    const v = await verificar();
    console.log("  verificação:", v);

    const r = await enviarEmail({
        to,
        subject: "SICCR — e-mail de teste ✅",
        text: "Se você recebeu este e-mail, a integração de envio do SICCR está funcionando.",
        html: '<div style="font-family:Verdana,sans-serif"><h2 style="color:#009536">SICCR</h2><p>Se você recebeu este e-mail, a integração de envio está <strong>funcionando</strong>. ✅</p></div>',
    });
    console.log("  envio:", r);
    process.exit(r.ok ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
