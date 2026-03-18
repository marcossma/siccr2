/**
 * Utilitário para resetar a senha de um usuário.
 * Uso: node reset-senha.js <siape> <nova_senha>
 * Exemplo: node reset-senha.js 1234567 minhaNovaSenh@123
 */
const path = require("path");
// Tenta carregar o .env local (api/.env), depois o da raiz do projeto
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}
const bcrypt = require("bcrypt");
const pool = require("./config/database.js");

async function resetarSenha(siape, novaSenha) {
    try {
        const userResult = await pool.query("SELECT user_id, nome, siape FROM users WHERE siape = $1", [siape]);

        if (userResult.rowCount === 0) {
            console.error(`Usuário com SIAPE "${siape}" não encontrado.`);
            process.exit(1);
        }

        const user = userResult.rows[0];
        const hash = await bcrypt.hash(novaSenha, 10);

        await pool.query("UPDATE users SET senha = $1 WHERE siape = $2", [hash, siape]);

        console.log(`Senha do usuário "${user.nome}" (SIAPE: ${user.siape}) resetada com sucesso.`);
    } catch (error) {
        console.error("Erro ao resetar senha:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const [,, siape, novaSenha] = process.argv;

if (!siape || !novaSenha) {
    console.error("Uso: node reset-senha.js <siape> <nova_senha>");
    process.exit(1);
}

resetarSenha(siape, novaSenha);
