/**
 * Middleware de autenticação via API Key (para RPA / integrações externas).
 *
 * Uso nas rotas:
 *   const autenticarApiKey = require("../middlewares/authApiKey.js");
 *   router.get("/rpa/pedidos", autenticarApiKey, handler);
 *
 * O cliente deve enviar o header:
 *   X-Api-Key: siccr_<64 hex chars>
 *
 * Se a chave for válida e ativa, popula req.apiKey com os dados da subunidade:
 *   { id, subunidade_id, subunidade_nome, subunidade_sigla }
 */

const pool = require("../config/database.js");

async function autenticarApiKey(req, res, next) {
    const key = req.headers["x-api-key"];

    if (!key) {
        return res.status(401).json({
            status: "error",
            message: "API Key não fornecida. Use o header X-Api-Key.",
            data: null
        });
    }

    try {
        const { rows } = await pool.query(
            `SELECT ak.id, ak.subunidade_id, ak.is_active,
                    s.subunidade_nome, s.subunidade_sigla
             FROM api_keys ak
             JOIN subunidades s ON s.subunidade_id = ak.subunidade_id
             WHERE ak.api_key = $1`,
            [key]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "API Key inválida.",
                data: null
            });
        }

        if (!rows[0].is_active) {
            return res.status(403).json({
                status: "error",
                message: "API Key desativada.",
                data: null
            });
        }

        req.apiKey = rows[0];   // disponibiliza dados da subunidade para a rota
        next();
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Erro ao validar API Key.",
            data: null
        });
    }
}

module.exports = autenticarApiKey;
