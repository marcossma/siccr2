// Cria (ou promove) um usuário super_admin. Idempotente por SIAPE.
//
// Uso:
//   node scripts/seed-superadmin.js <siape> <senha> ["Nome Completo"] [email]
// ou por variáveis de ambiente:
//   SEED_SIAPE=... SEED_SENHA=... SEED_NOME=... SEED_EMAIL=... node scripts/seed-superadmin.js
//
// Em Docker (produção):
//   docker compose exec -e SEED_SIAPE=123 -e SEED_SENHA=troque123 app node scripts/seed-superadmin.js
//
// Se o SIAPE já existir, o script apenas atualiza a senha e garante permissao=super_admin
// (não duplica). Nunca imprime a senha.

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
}

const bcrypt = require("bcrypt");
const pool = require("../config/database.js");

async function main() {
    const siape = (process.argv[2] || process.env.SEED_SIAPE || "").trim();
    const senha = process.argv[3] || process.env.SEED_SENHA || "";
    const nome = (process.argv[4] || process.env.SEED_NOME || "Super Admin").trim();
    const email = (process.argv[5] || process.env.SEED_EMAIL || null);

    if (!siape || !senha) {
        console.error("ERRO: informe SIAPE e SENHA.");
        console.error('  node scripts/seed-superadmin.js <siape> <senha> ["Nome"] [email]');
        console.error("  ou defina SEED_SIAPE e SEED_SENHA no ambiente.");
        process.exit(1);
    }
    if (String(senha).length < 6) {
        console.error("ERRO: a senha deve ter ao menos 6 caracteres.");
        process.exit(1);
    }

    const hash = await bcrypt.hash(String(senha), 10);

    const existente = await pool.query("SELECT user_id, permissao FROM users WHERE siape = $1", [siape]);

    if (existente.rowCount > 0) {
        const id = existente.rows[0].user_id;
        await pool.query(
            `UPDATE users
             SET senha = $1, permissao = 'super_admin', nome = COALESCE(NULLIF($2, ''), nome),
                 email = COALESCE($3, email), updatedat = NOW()
             WHERE user_id = $4`,
            [hash, nome, email, id]
        );
        console.log(`✔ Usuário SIAPE ${siape} atualizado: senha redefinida e promovido a super_admin (user_id=${id}).`);
    } else {
        const inserido = await pool.query(
            `INSERT INTO users (nome, email, siape, senha, permissao, createdat)
             VALUES ($1, $2, $3, $4, 'super_admin', NOW())
             RETURNING user_id`,
            [nome, email, siape, hash]
        );
        console.log(`✔ Super_admin criado: ${nome} (SIAPE ${siape}, user_id=${inserido.rows[0].user_id}).`);
    }

    console.log("Agora é possível logar em /adm/login com esse SIAPE e senha.");
    await pool.end();
    process.exit(0);
}

main().catch(async (err) => {
    console.error("Falha ao semear super_admin:", err.message);
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(1);
});
