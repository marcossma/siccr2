#!/bin/bash
set -e

echo "Aguardando o banco de dados ficar disponível..."

until node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
pool.query('SELECT 1')
  .then(() => { pool.end(); process.exit(0); })
  .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  echo "Banco de dados ainda não disponível. Aguardando 2 segundos..."
  sleep 2
done

echo "Banco de dados disponível!"

echo "Executando migrations..."
npx sequelize-cli db:migrate

echo "Iniciando o servidor..."
exec node server.js
