const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");

// Criar um roteador para o express
const router = express.Router();

// Rota para autenticação
router.get("/", async (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Rota Auth funcionando."
    });
});

module.exports = router;