// config/database.js
require("dotenv").config();
const { Pool } = require("pg");

// Configurando o banco de dados
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// Exportar o pool para ser usando em outros arquivos
module.exports = pool;