const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { getNivelAcesso, autorizar } = require("../middlewares/autorizar.js");

const router = express.Router();

// RBAC das salas (montado com autorizar("servidor") — qualquer logado LÊ):
//   criar  → chefe+ ou servidor com a funcionalidade 'cadastrar_salas'
//   editar/excluir → somente super_admin
const podeCriar = autorizar("chefe", "cadastrar_salas");
const soSuperAdmin = autorizar("super_admin");

// GET /api/salas — lista salas (com filtro de escopo)
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM salas ORDER BY sala_nome");
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar salas:");
        return res.status(500).json({ status: "error", message: "Erro ao listar salas.", data: null });
    }
});

// GET /api/salas/total-info — lista salas com dados relacionados
router.get("/total-info", async (req, res) => {
    try {
        const nivel = getNivelAcesso(req.usuario);
        let whereClause = "";
        let params = [];

        if (nivel === "chefe") {
            whereClause = "WHERE sa.subunidade_id = $1";
            params = [req.usuario.subunidade];
        } else if (nivel === "diretor") {
            whereClause = "WHERE p.unidade_id = $1";
            params = [req.usuario.unidade];
        }
        // super_admin vê tudo

        const { rows } = await pool.query(`
            SELECT
                sa.sala_id, sa.sala_nome, sa.sala_descricao, sa.sala_capacidade,
                sa.sala_largura, sa.sala_comprimento, sa.sala_altura,
                sa.predio_id, sa.subunidade_id, sa.is_agendavel, sa.sala_tipo_id,
                sa.presta_servicos_externos,
                p.predio, p.descricao AS predio_descricao, p.unidade_id,
                s.subunidade_nome, s.subunidade_sigla,
                st.sala_tipo_nome
            FROM salas sa
            LEFT JOIN predios p ON p.predio_id = sa.predio_id
            LEFT JOIN subunidades s ON s.subunidade_id = sa.subunidade_id
            LEFT JOIN salas_tipo st ON st.sala_tipo_id = sa.sala_tipo_id
            ${whereClause}
            ORDER BY sa.sala_nome
        `, params);

        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar salas (total-info):");
        return res.status(500).json({ status: "error", message: "Erro ao listar informações das salas.", data: null });
    }
});

function parseCapacidade(valor) {
    if (valor === undefined || valor === null || valor === "") return null;
    const n = parseInt(valor, 10);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
}

// Dimensão em metros: aceita vírgula ou ponto; negativo/ inválido → null
function parseDimensao(valor) {
    if (valor === undefined || valor === null || valor === "") return null;
    const n = parseFloat(String(valor).replace(",", "."));
    if (Number.isNaN(n) || n < 0) return null;
    return n;
}

// Aceita 0/1, "0"/"1", true/false. Para qualquer outro valor (ou string vazia) → null.
function parseFlag(valor) {
    if (valor === undefined || valor === null || valor === "") return null;
    if (valor === true || valor === 1 || valor === "1") return 1;
    if (valor === false || valor === 0 || valor === "0") return 0;
    return null;
}

// GET /api/salas/form-opcoes — prédios/subunidades/tipos p/ o form de cadastro
router.get("/form-opcoes", podeCriar, async (_req, res) => {
    try {
        const [predios, subs, tipos] = await Promise.all([
            pool.query("SELECT predio_id, predio FROM predios ORDER BY predio"),
            pool.query("SELECT subunidade_id, subunidade_nome FROM subunidades ORDER BY subunidade_nome"),
            pool.query("SELECT sala_tipo_id, sala_tipo_nome FROM salas_tipo ORDER BY sala_tipo_nome"),
        ]);
        return res.status(200).json({ status: "success", message: "", data: { predios: predios.rows, subunidades: subs.rows, tipos: tipos.rows } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao carregar opções do form de salas:");
        return res.status(500).json({ status: "error", message: "Erro ao carregar opções.", data: null });
    }
});

// Identificação (sala_nome) é única (case/espaço-insensível). Em edição, ignora a própria sala.
async function nomeDuplicado(nome, exceptId = null) {
    const sql = `SELECT 1 FROM salas WHERE LOWER(TRIM(sala_nome)) = LOWER(TRIM($1))${exceptId ? " AND sala_id <> $2" : ""} LIMIT 1`;
    const { rows } = await pool.query(sql, exceptId ? [nome, exceptId] : [nome]);
    return rows.length > 0;
}

// POST /api/salas — cadastra nova sala (chefe+ ou 'cadastrar_salas')
router.post("/", podeCriar, async (req, res) => {
    const { sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    try {
        if (await nomeDuplicado(sala_nome)) {
            return res.status(409).json({ status: "error", message: `Já existe uma sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        const { rows } = await pool.query(
            `INSERT INTO salas (sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, parseCapacidade(sala_capacidade), predio_id,
             subunidade_id || null, is_agendavel ?? 0, sala_tipo_id || null, parseFlag(presta_servicos_externos),
             parseDimensao(sala_largura), parseDimensao(sala_comprimento), parseDimensao(sala_altura)]
        );
        return res.status(201).json({ status: "success", message: "Sala cadastrada com sucesso.", data: rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ status: "error", message: `Já existe uma sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        logger.error({ err: error }, "Erro ao cadastrar sala:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar sala.", data: null });
    }
});

// PUT /api/salas/:id — atualiza sala (somente super_admin)
router.put("/:id", soSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    try {
        if (await nomeDuplicado(sala_nome, id)) {
            return res.status(409).json({ status: "error", message: `Já existe outra sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        const { rows, rowCount } = await pool.query(
            `UPDATE salas SET sala_nome=$1, sala_descricao=$2, sala_capacidade=$3, subunidade_id=$4,
                 predio_id=$5, is_agendavel=$6, sala_tipo_id=$7, presta_servicos_externos=$8,
                 sala_largura=$9, sala_comprimento=$10, sala_altura=$11
             WHERE sala_id=$12 RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, parseCapacidade(sala_capacidade), subunidade_id || null,
             predio_id, is_agendavel ?? 0, sala_tipo_id || null, parseFlag(presta_servicos_externos),
             parseDimensao(sala_largura), parseDimensao(sala_comprimento), parseDimensao(sala_altura), id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Sala atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ status: "error", message: `Já existe outra sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        logger.error({ err: error }, "Erro ao atualizar sala:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar sala.", data: null });
    }
});

// DELETE /api/salas/:id — remove sala (somente super_admin)
router.delete("/:id", soSuperAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query("DELETE FROM salas WHERE sala_id = $1", [id]);
        if (rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        return res.status(200).json({ status: "success", message: "Sala excluída com sucesso.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao excluir sala:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir sala.", data: null });
    }
});

module.exports = router;
