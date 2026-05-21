#!/usr/bin/env node
"use strict";

/**
 * Instala os git hooks via husky. Sai silenciosamente quando:
 *   - HUSKY=0 está definido (override explícito, ex: Docker build)
 *   - Não há `.git` no diretório pai (ex: container sem repositório)
 *   - O pacote husky não está disponível (npm ci --omit=dev em produção)
 *
 * Isso permite que o `prepare` rode em dev (instalando hooks) e seja
 * ignorado em produção sem erro.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

if (process.env.HUSKY === "0") process.exit(0);

const rootDir = path.resolve(__dirname, "../..");
if (!fs.existsSync(path.join(rootDir, ".git"))) process.exit(0);

try {
    execSync("husky api/.husky", { cwd: rootDir, stdio: "inherit" });
} catch {
    // husky não instalado (ambiente de produção) — silenciosamente ignora
}
