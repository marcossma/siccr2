const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");
const aniversarios = require("../lib/aniversarios.js");

const router = express.Router();

function ehDirecao(usuario) {
    return ["super_admin", "diretor"].includes(getNivelAcesso(usuario));
}

// GET /api/aniversariantes?mes=  — servidores que fazem aniversário no mês (dia/mês, sem ano)
//   ?mes=1..12 (default: mês atual). Acessível a qualquer usuário logado.
router.get("/", async (req, res) => {
    let mes = parseInt(req.query.mes, 10);
    if (Number.isNaN(mes) || mes < 1 || mes > 12) {
        mes = new Date().getMonth() + 1; // mês atual (1-based)
    }
    try {
        const { rows } = await pool.query(
            `SELECT u.nome,
                    EXTRACT(DAY FROM u.data_nascimento AT TIME ZONE 'UTC')::int AS dia,
                    to_char(u.data_nascimento AT TIME ZONE 'UTC', 'DD/MM') AS dia_mes,
                    s.subunidade_sigla, s.subunidade_nome
             FROM users u
             LEFT JOIN subunidades s ON s.subunidade_id = u.subunidade_id
             WHERE u.data_nascimento IS NOT NULL
               AND EXTRACT(MONTH FROM u.data_nascimento AT TIME ZONE 'UTC') = $1
             ORDER BY dia, u.nome`,
            [mes]
        );
        return res.status(200).json({ status: "success", message: "", data: { mes, aniversariantes: rows } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar aniversariantes:");
        return res.status(500).json({ status: "error", message: "Erro ao listar aniversariantes.", data: null });
    }
});

// GET /api/aniversariantes/hoje — aniversariantes de hoje (nome + total), p/ o painel
router.get("/hoje", async (_req, res) => {
    try {
        const lista = await aniversarios.aniversariantesDeHoje();
        return res.status(200).json({
            status: "success", message: "",
            data: { total: lista.length, aniversariantes: lista.map((a) => ({ nome: a.nome })) },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao buscar aniversariantes de hoje:");
        return res.status(500).json({ status: "error", message: "Erro ao buscar aniversariantes de hoje.", data: null });
    }
});

// GET /api/aniversariantes/config — estado do envio automático (direção)
router.get("/config", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    try {
        return res.status(200).json({ status: "success", message: "", data: { automatico: await aniversarios.getAuto() } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao ler config de aniversários:");
        return res.status(500).json({ status: "error", message: "Erro ao ler configuração.", data: null });
    }
});

// PATCH /api/aniversariantes/config — liga/desliga o envio automático (direção)
router.patch("/config", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    try {
        await aniversarios.setAuto(req.body?.automatico === true || req.body?.automatico === "true");
        return res.status(200).json({ status: "success", message: "Configuração atualizada.", data: { automatico: await aniversarios.getAuto() } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao salvar config de aniversários:");
        return res.status(500).json({ status: "error", message: "Erro ao salvar configuração.", data: null });
    }
});

// POST /api/aniversariantes/parabenizar — envia parabéns aos de hoje agora (direção)
router.post("/parabenizar", async (req, res) => {
    if (!ehDirecao(req.usuario)) return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    try {
        const r = await aniversarios.enviarParabensDoDia();
        return res.status(200).json({ status: "success", message: `Parabéns enviados: ${r.enviados} ok, ${r.falhas} falha(s).`, data: r });
    } catch (error) {
        logger.error({ err: error }, "Erro ao enviar parabéns:");
        return res.status(500).json({ status: "error", message: "Erro ao enviar parabéns.", data: null });
    }
});

module.exports = router;
