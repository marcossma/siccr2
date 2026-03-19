const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// Campos seguros para retornar (nunca expõe senha)
const CAMPOS_USUARIO = `
    u.user_id, u.nome, u.email, u.siape, u.data_nascimento,
    u.subunidade_id, u.unidade_id, u.whatsapp, u.permissao,
    u.createdat, u.updatedat
`;

// Validação básica de e-mail
function emailValido(email) {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /api/usuarios — lista usuários (com filtro de escopo)
router.get("/", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let query, params = [];

        if (nivel === "super_admin") {
            query = `SELECT ${CAMPOS_USUARIO}, s.subunidade_nome
                     FROM users u
                     LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
                     ORDER BY u.nome`;
        } else if (nivel === "diretor") {
            query = `SELECT ${CAMPOS_USUARIO}, s.subunidade_nome
                     FROM users u
                     LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
                     WHERE s.unidade_id = $1 OR u.unidade_id = $1
                     ORDER BY u.nome`;
            params = [req.usuario.unidade];
        } else {
            // chefe vê apenas usuários da sua subunidade
            query = `SELECT ${CAMPOS_USUARIO}, s.subunidade_nome
                     FROM users u
                     LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
                     WHERE u.subunidade_id = $1
                     ORDER BY u.nome`;
            params = [req.usuario.subunidade];
        }

        const { rows } = await pool.query(query, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar usuários.", data: null });
    }
});

// GET /api/usuarios/total-info — lista com dados relacionados
router.get("/total-info", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let whereClause = "";
        let params = [];

        if (nivel === "chefe") {
            whereClause = "WHERE u.subunidade_id = $1";
            params = [req.usuario.subunidade];
        } else if (nivel === "diretor") {
            whereClause = "WHERE s.unidade_id = $1 OR u.unidade_id = $1";
            params = [req.usuario.unidade];
        }

        const { rows } = await pool.query(`
            SELECT
                u.user_id, u.nome, u.email, u.siape, u.data_nascimento,
                u.subunidade_id, u.unidade_id, u.whatsapp, u.permissao,
                s.subunidade_nome, s.subunidade_sigla, s.is_direcao_centro,
                un.unidade, un.unidade_sigla
            FROM users u
            LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
            LEFT JOIN unidades un ON un.unidade_id = COALESCE(s.unidade_id, u.unidade_id)
            ${whereClause}
            ORDER BY u.nome
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar usuários (total-info):", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar informações dos usuários.", data: null });
    }
});

// GET /api/usuarios/:id — busca usuário por ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rows, rowCount } = await pool.query(
            `SELECT ${CAMPOS_USUARIO}, s.subunidade_nome
             FROM users u
             LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
             WHERE u.user_id = $1`,
            [id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Usuário não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "", data: rows[0] });
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return res.status(500).json({ status: "error", message: "Erro ao buscar usuário.", data: null });
    }
});

// POST /api/usuarios — cadastra novo usuário
router.post("/", async (req, res) => {
    const { nome, email, siape, senha, data_nascimento,
            subunidade_id, unidade_id, whatsapp, permissao } = req.body;

    if (!nome || !siape || !senha) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Nome, SIAPE e Senha são obrigatórios.",
            data: null
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({ status: "error", message: "E-mail inválido.", data: null });
    }

    if (senha.length < 8) {
        return res.status(400).json({
            status: "error",
            message: "A senha deve ter pelo menos 8 caracteres.",
            data: null
        });
    }

    // Valida roles permitidos
    const rolesPermitidos = ["super_admin", "diretor", "vice_diretor", "chefe", "subchefe", "servidor"];
    if (permissao && !rolesPermitidos.includes(permissao)) {
        return res.status(400).json({ status: "error", message: "Permissão inválida.", data: null });
    }

    // Chefe só pode cadastrar servidores da sua própria subunidade
    const nivel = getNivelAcesso(req.usuario);
    if (nivel === "chefe") {
        const subId = subunidade_id ? parseInt(subunidade_id) : null;
        if (subId !== req.usuario.subunidade) {
            return res.status(403).json({
                status: "error",
                message: "Você só pode cadastrar usuários na sua própria subunidade.",
                data: null
            });
        }
        if (permissao && !["servidor", "subchefe"].includes(permissao)) {
            return res.status(403).json({
                status: "error",
                message: "Você só pode cadastrar servidores ou subchefes.",
                data: null
            });
        }
    }

    try {
        const existe = await pool.query("SELECT user_id FROM users WHERE siape = $1", [siape]);
        if (existe.rowCount > 0) {
            return res.status(409).json({
                status: "error",
                message: `O SIAPE ${siape} já está cadastrado.`,
                data: null
            });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const { rows } = await pool.query(
            `INSERT INTO users
                (nome, email, siape, senha, data_nascimento, subunidade_id,
                 unidade_id, whatsapp, permissao, createdat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING user_id, nome, siape, permissao`,
            [nome.trim(), email || null, siape.trim(), hashedPassword,
             data_nascimento || null, subunidade_id || null,
             unidade_id || null, whatsapp || null, permissao || "servidor"]
        );

        return res.status(201).json({ status: "success", message: "Usuário cadastrado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar usuário.", data: null });
    }
});

// PUT /api/usuarios/:id — atualiza usuário
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, email, siape, senha, data_nascimento,
            subunidade_id, unidade_id, whatsapp, permissao } = req.body;

    if (!nome || !siape) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Nome e SIAPE são obrigatórios.",
            data: null
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({ status: "error", message: "E-mail inválido.", data: null });
    }

    if (senha && senha.length < 8) {
        return res.status(400).json({
            status: "error",
            message: "A senha deve ter pelo menos 8 caracteres.",
            data: null
        });
    }

    try {
        const { rows: userExist } = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [id]);
        if (!userExist.length) {
            return res.status(404).json({ status: "error", message: "Usuário não encontrado.", data: null });
        }

        // Monta query dinamicamente conforme senha foi ou não informada
        let query, values;
        if (senha) {
            const hashedPassword = await bcrypt.hash(senha, 10);
            query = `UPDATE users SET nome=$1, email=$2, siape=$3, senha=$4, data_nascimento=$5,
                         subunidade_id=$6, unidade_id=$7, whatsapp=$8, permissao=$9, updatedat=NOW()
                     WHERE user_id=$10 RETURNING user_id, nome, siape, permissao`;
            values = [nome.trim(), email || null, siape.trim(), hashedPassword,
                      data_nascimento || null, subunidade_id || null,
                      unidade_id || null, whatsapp || null, permissao || "servidor", id];
        } else {
            query = `UPDATE users SET nome=$1, email=$2, siape=$3, data_nascimento=$4,
                         subunidade_id=$5, unidade_id=$6, whatsapp=$7, permissao=$8, updatedat=NOW()
                     WHERE user_id=$9 RETURNING user_id, nome, siape, permissao`;
            values = [nome.trim(), email || null, siape.trim(),
                      data_nascimento || null, subunidade_id || null,
                      unidade_id || null, whatsapp || null, permissao || "servidor", id];
        }

        const { rows } = await pool.query(query, values);
        return res.status(200).json({ status: "success", message: "Usuário atualizado com sucesso.", data: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return res.status(500).json({ status: "error", message: "Erro ao atualizar usuário.", data: null });
    }
});

// DELETE /api/usuarios/:id — remove usuário
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    // Impede auto-exclusão
    if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({
            status: "error",
            message: "Você não pode excluir sua própria conta.",
            data: null
        });
    }

    try {
        const { rowCount } = await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Usuário não encontrado.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Usuário excluído com sucesso.", data: null });
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        return res.status(500).json({ status: "error", message: "Erro ao excluir usuário.", data: null });
    }
});

module.exports = router;
