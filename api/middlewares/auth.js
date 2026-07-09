const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Formato: Bearer <token>

    if (!token) {
        return res.status(401).json({
            status: "error",
            message: "Acesso negado. Token não fornecido.",
            data: null
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (error) {
        // 401 (não 403): sessão inválida/expirada. O frontend intercepta 401
        // para deslogar e redirecionar ao login (403 fica só para permissão).
        return res.status(401).json({
            status: "error",
            message: "Token inválido ou expirado.",
            data: null
        });
    }
}

module.exports = autenticar;
