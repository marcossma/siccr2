/**
 * Cria um usuário administrador inicial.
 * Uso: node criar-admin.js <nome> <siape> <senha>
 * Exemplo: node criar-admin.js "João Silva" 2152076 "MinhaSenh@123"
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DB_HOST) {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}

const bcrypt = require("bcrypt");
const pool = require("./config/database.js");

async function criarAdmin(nome, siape, senha) {
    try {
        const existe = await pool.query("SELECT siape FROM users WHERE siape = $1", [siape]);
        if (existe.rowCount > 0) {
            console.error(`Já existe um usuário com o SIAPE "${siape}". Use o set-admin.js para promovê-lo.`);
            process.exit(1);
        }

        const hash = await bcrypt.hash(senha, 10);

        const result = await pool.query(
            `INSERT INTO users (nome, siape, senha, permissao, createdat)
             VALUES ($1, $2, $3, 'admin', NOW())
             RETURNING user_id, nome, siape, permissao`,
            [nome, siape, hash]
        );

        const user = result.rows[0];
        console.log(`Usuário admin criado com sucesso!`);
        console.log(`  Nome:    ${user.nome}`);
        console.log(`  SIAPE:   ${user.siape}`);
        console.log(`  Permissão: ${user.permissao}`);
    } catch (error) {
        console.error("Erro ao criar usuário:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const [,, nome, siape, senha] = process.argv;

if (!nome || !siape || !senha) {
    console.error('Uso: node criar-admin.js "<nome>" <siape> <senha>');
    process.exit(1);
}

criarAdmin(nome, siape, senha);
