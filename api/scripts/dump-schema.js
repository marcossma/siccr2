#!/usr/bin/env node
"use strict";

/**
 * Dumpa o schema do banco para api/db/schema.sql.
 *
 * Roda pg_dump dentro do container `db` via `docker compose exec` —
 * assim não precisa expor a porta do Postgres para o host nem ter o
 * pg_dump instalado na máquina (mas docker compose precisa estar
 * rodando: `docker compose up -d db`).
 *
 * Uso: npm run db:dump
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "../..");
const outputFile = path.resolve(__dirname, "../db/schema.sql");

// Carrega .env da raiz para pegar nome do banco e usuário
require("dotenv").config({ path: path.resolve(rootDir, ".env") });

const dbUser = process.env.DB_USER || "postgres";
const dbName = process.env.DB_NAME || "siccr";

fs.mkdirSync(path.dirname(outputFile), { recursive: true });

const cmd = `docker compose exec -T db pg_dump -U ${dbUser} --schema-only --no-owner --no-privileges ${dbName}`;

try {
    const output = execSync(cmd, { cwd: rootDir, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    const header =
        `-- Schema dump gerado automaticamente. NÃO editar manualmente.\n` +
        `-- Origem: docker compose db (${dbName}) — ${new Date().toISOString()}\n` +
        `-- Regenere com: npm run db:dump\n\n`;
    fs.writeFileSync(outputFile, header + output);
     
    console.log(`Schema escrito em ${path.relative(rootDir, outputFile)} (${output.length} bytes)`);
} catch (err) {
     
    console.error("Falha ao gerar schema dump:", err.message);
     
    console.error("Verifique se o container db está rodando: docker compose ps");
    process.exit(1);
}
