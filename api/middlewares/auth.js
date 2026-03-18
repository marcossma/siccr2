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
        return res.status(403).json({
            status: "error",
            message: "Token inválido ou expirado.",
            data: null
        });
    }
}

module.exports = autenticar;
