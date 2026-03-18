/**
 * Define um usuário como admin pelo SIAPE.
 * Uso: node set-admin.js <siape>
 * Exemplo: node set-admin.js 2152076
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}

const pool = require("./config/database.js");

async function setAdmin(siape) {
    try {
        const result = await pool.query(
            "UPDATE users SET permissao = 'admin' WHERE siape = $1 RETURNING user_id, nome, siape, permissao",
            [siape]
        );

        if (result.rowCount === 0) {
            console.error(`Usuário com SIAPE "${siape}" não encontrado.`);
            process.exit(1);
        }

        const user = result.rows[0];
        console.log(`Usuário "${user.nome}" (SIAPE: ${user.siape}) agora é admin.`);
    } catch (error) {
        console.error("Erro:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const [,, siape] = process.argv;

if (!siape) {
    console.error("Uso: node set-admin.js <siape>");
    process.exit(1);
}

setAdmin(siape);
