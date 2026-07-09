const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { expandirRecorrencia, detectarConflitos } = require("../lib/recorrencia.js");

const router = express.Router();

const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function toDateStr(v) {
    return typeof v === "string" ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);
}
function hhmm(v) {
    return v === null || v === undefined ? null : String(v).slice(0, 5);
}

// ───────────────────────────────────────────────────────────────
// GET / — lista turmas (filtros: periodo_letivo_id, disciplina_id)
// ───────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    const { periodo_letivo_id, disciplina_id } = req.query;
    const params = [];
    const where = [];
    if (periodo_letivo_id) { params.push(periodo_letivo_id); where.push(`t.periodo_letivo_id = $${params.length}`); }
    if (disciplina_id) { params.push(disciplina_id); where.push(`t.disciplina_id = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    try {
        const { rows } = await pool.query(`
            SELECT t.id_turma, t.disciplina_id, t.periodo_letivo_id, t.nome_turma,
                   t.professor_user_id, t.vagas,
                   d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
                   pl.nome AS periodo_nome,
                   u.nome AS professor_nome,
                   COUNT(h.id_horario)::int AS total_horarios
            FROM turmas t
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            LEFT JOIN turmas_horarios h ON h.turma_id = t.id_turma
            ${whereSql}
            GROUP BY t.id_turma, d.nome, d.codigo, pl.nome, u.nome
            ORDER BY pl.nome DESC, d.nome, t.nome_turma
        `, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar turmas:");
        return res.status(500).json({ status: "error", message: "Erro ao listar turmas.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /:id — detalhe da turma + horários (com sala/prédio)
// ───────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const turma = await pool.query(`
            SELECT t.*, d.nome AS disciplina_nome, pl.nome AS periodo_nome,
                   pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim,
                   u.nome AS professor_nome
            FROM turmas t
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            WHERE t.id_turma = $1`, [id]);
        if (turma.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Turma não encontrada.", data: null });
        }
        const horarios = await pool.query(`
            SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fim, h.sala_id,
                   s.sala_nome, p.predio AS predio_nome
            FROM turmas_horarios h
            JOIN salas s ON s.sala_id = h.sala_id
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            WHERE h.turma_id = $1
            ORDER BY h.dia_semana, h.hora_inicio`, [id]);
        return res.status(200).json({
            status: "success", message: "",
            data: { ...turma.rows[0], horarios: horarios.rows },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao buscar turma:");
        return res.status(500).json({ status: "error", message: "Erro ao buscar turma.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// POST / — cria turma
// ───────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const { disciplina_id, periodo_letivo_id, nome_turma, professor_user_id, vagas } = req.body;
    if (!disciplina_id || !periodo_letivo_id || !nome_turma || String(nome_turma).trim() === "") {
        return res.status(400).json({ status: "error", message: "Disciplina, período e nome da turma são obrigatórios.", data: null });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO turmas (disciplina_id, periodo_letivo_id, nome_turma, professor_user_id, vagas)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [disciplina_id, periodo_letivo_id, String(nome_turma).trim(),
             professor_user_id || null, vagas ? parseInt(vagas, 10) : null]
        );
        return res.status(201).json({ status: "success", message: "Turma cadastrada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao cadastrar turma:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar turma.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// PUT /:id — atualiza dados da turma (não mexe nos horários)
// ───────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { disciplina_id, periodo_letivo_id, nome_turma, professor_user_id, vagas } = req.body;
    if (!disciplina_id || !periodo_letivo_id || !nome_turma || String(nome_turma).trim() === "") {
        return res.status(400).json({ status: "error", message: "Disciplina, período e nome da turma são obrigatórios.", data: null });
    }
    try {
        const { rows, rowCount } = await pool.query(
            `UPDATE turmas SET disciplina_id=$1, periodo_letivo_id=$2, nome_turma=$3, professor_user_id=$4, vagas=$5
             WHERE id_turma=$6 RETURNING *`,
            [disciplina_id, periodo_letivo_id, String(nome_turma).trim(),
             professor_user_id || null, vagas ? parseInt(vagas, 10) : null, id]
        );
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Turma não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Turma atualizada.", data: rows[0] });
    } catch (error) {
        logger.error({ err: error }, "Erro ao atualizar turma:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar turma.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// DELETE /:id — remove turma (cascateia horários → aulas → ocorrências)
// ───────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM turmas WHERE id_turma = $1", [id]);
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Turma não encontrada.", data: null });
        return res.status(200).json({ status: "success", message: "Turma excluída.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao excluir turma:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir turma.", data: null });
    }
});

// Busca ocorrências ativas de uma sala em certas datas (para conflito)
async function ocorrenciasDaSala(client, salaId, datas) {
    if (!datas.length) return [];
    const { rows } = await client.query(
        `SELECT ao.data_ocorrencia, a.dia_inteiro, a.hora_inicio, a.hora_fim, a.motivo, a.origem
         FROM agendamentos_ocorrencias ao
         JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
         WHERE a.sala_id = $1
           AND ao.status_individual = 'ativa'
           AND a.status IN ('pendente', 'aprovada')
           AND ao.data_ocorrencia = ANY($2::date[])`,
        [salaId, datas]
    );
    return rows.map((r) => ({
        data: toDateStr(r.data_ocorrencia),
        dia_inteiro: r.dia_inteiro,
        hora_inicio: hhmm(r.hora_inicio),
        hora_fim: hhmm(r.hora_fim),
        motivo: r.motivo,
        origem: r.origem,
    }));
}

// ───────────────────────────────────────────────────────────────
// POST /:id/horarios — adiciona horário e materializa a aula
//   body: { dia_semana, hora_inicio, hora_fim, sala_id }
//   Em conflito, devolve 409 com as datas conflitantes (não grava).
// ───────────────────────────────────────────────────────────────
router.post("/:id/horarios", async (req, res) => {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fim, sala_id } = req.body;

    const dia = parseInt(dia_semana, 10);
    if (Number.isNaN(dia) || dia < 0 || dia > 6) {
        return res.status(400).json({ status: "error", message: "Dia da semana inválido.", data: null });
    }
    if (!hora_inicio || !hora_fim || hora_inicio >= hora_fim) {
        return res.status(400).json({ status: "error", message: "Horário inválido (início deve ser antes do fim).", data: null });
    }
    if (!sala_id) {
        return res.status(400).json({ status: "error", message: "Sala é obrigatória.", data: null });
    }

    const client = await pool.connect();
    try {
        // Carrega turma + disciplina + período (datas para expandir a recorrência)
        const t = await client.query(`
            SELECT t.id_turma, t.nome_turma, t.professor_user_id,
                   d.nome AS disciplina_nome,
                   pl.data_inicio, pl.data_fim
            FROM turmas t
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            WHERE t.id_turma = $1`, [id]);
        if (t.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Turma não encontrada.", data: null });
        }
        const turma = t.rows[0];

        // Expande as datas semanais ao longo do período letivo
        const datas = expandirRecorrencia({
            tipo: "semanal",
            data_inicio: toDateStr(turma.data_inicio),
            data_fim_recorrencia: toDateStr(turma.data_fim),
            dias_semana: String(dia),
            intervalo_semanas: 1,
        });
        if (datas.length === 0) {
            return res.status(400).json({ status: "error", message: "Nenhuma data gerada — verifique as datas do período letivo.", data: null });
        }

        // Detecta conflito com ocupações existentes da sala
        const existentes = await ocorrenciasDaSala(client, sala_id, datas);
        const novas = datas.map((d) => ({ data: d, dia_inteiro: false, hora_inicio, hora_fim }));
        const conflitos = detectarConflitos(novas, existentes);
        if (conflitos.length > 0) {
            return res.status(409).json({
                status: "error",
                message: `Conflito: a sala já está ocupada em ${conflitos.length} data(s) neste horário.`,
                data: {
                    conflitos: conflitos.slice(0, 10).map((c) => ({
                        data: c.data,
                        ocupada_por: c.comExistente.motivo,
                    })),
                    total_conflitos: conflitos.length,
                },
            });
        }

        await client.query("BEGIN");

        const h = await client.query(
            `INSERT INTO turmas_horarios (turma_id, dia_semana, hora_inicio, hora_fim, sala_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, dia, hora_inicio, hora_fim, sala_id]
        );
        const horario = h.rows[0];

        const motivo = `${turma.disciplina_nome} — ${turma.nome_turma}`;
        const ag = await client.query(
            `INSERT INTO agendamentos
                (sala_id, solicitante_user_id, motivo, dia_inteiro, hora_inicio, hora_fim,
                 data_inicio, data_fim_recorrencia, tipo_recorrencia, dias_semana, intervalo_semanas,
                 status, aprovado_por_user_id, data_decisao, origem, turma_horario_id)
             VALUES ($1, $2, $3, FALSE, $4, $5, $6, $7, 'semanal', $8, 1,
                     'aprovada', $9, NOW(), 'aula', $10)
             RETURNING id_agendamento`,
            [
                sala_id,
                turma.professor_user_id || req.usuario.id,
                motivo,
                hora_inicio,
                hora_fim,
                toDateStr(turma.data_inicio),
                toDateStr(turma.data_fim),
                String(dia),
                req.usuario.id,
                horario.id_horario,
            ]
        );
        const agendamentoId = ag.rows[0].id_agendamento;

        for (const d of datas) {
            await client.query(
                `INSERT INTO agendamentos_ocorrencias (agendamento_id, data_ocorrencia, status_individual)
                 VALUES ($1, $2, 'ativa')`,
                [agendamentoId, d]
            );
        }

        await client.query("COMMIT");
        return res.status(201).json({
            status: "success",
            message: `Horário alocado (${datas.length} aulas em ${NOMES_DIAS[dia]}).`,
            data: { ...horario, total_ocorrencias: datas.length },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao alocar horário:");
        return res.status(500).json({ status: "error", message: "Erro ao alocar horário.", data: null });
    } finally {
        client.release();
    }
});

// ───────────────────────────────────────────────────────────────
// DELETE /:id/horarios/:horarioId — remove horário
//   CASCADE remove o agendamento (origem=aula) e suas ocorrências.
// ───────────────────────────────────────────────────────────────
router.delete("/:id/horarios/:horarioId", async (req, res) => {
    const { horarioId } = req.params;
    try {
        const { rowCount } = await pool.query("DELETE FROM turmas_horarios WHERE id_horario = $1", [horarioId]);
        if (rowCount === 0) return res.status(404).json({ status: "error", message: "Horário não encontrado.", data: null });
        return res.status(200).json({ status: "success", message: "Horário removido.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao remover horário:");
        return res.status(500).json({ status: "error", message: "Erro ao remover horário.", data: null });
    }
});

module.exports = router;
