const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const realtime = require("../lib/realtime.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");
const { expandirRecorrencia, detectarConflitos } = require("../lib/recorrencia.js");

const router = express.Router();

const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Ensalamento é uma atribuição da direção (super_admin/diretor/vice/is_direcao_centro)
function ehDirecao(u) {
    return ["super_admin", "diretor"].includes(getNivelAcesso(u));
}

// Sala fora do ensalamento: auditório (por tipo) OU marcada como "somente
// agendamento manual" (flag) — agendadas pela direção sob solicitação prévia.
async function salaForaDoEnsalamento(client, salaId) {
    const r = await client.query(
        `SELECT 1 FROM salas s
         LEFT JOIN salas_tipo st ON st.sala_tipo_id = s.sala_tipo_id
         WHERE s.sala_id = $1
           AND (COALESCE(s.agendamento_manual, 0) = 1 OR st.sala_tipo_nome ILIKE 'auditório')
         LIMIT 1`,
        [salaId]
    );
    return r.rows.length > 0;
}

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
    const { periodo_letivo_id, disciplina_id, curso_id, incluir_pos } = req.query;
    const incluirPos = incluir_pos === "1" || incluir_pos === "true";
    const params = [];
    const where = [];
    if (periodo_letivo_id) { params.push(periodo_letivo_id); where.push(`t.periodo_letivo_id = $${params.length}`); }
    if (disciplina_id) { params.push(disciplina_id); where.push(`t.disciplina_id = $${params.length}`); }
    if (curso_id) { params.push(curso_id); where.push(`t.curso_id = $${params.length}`); }
    // Por padrão, pós-graduação fica fora da listagem de ensalamento.
    // Turma sem curso (curso_id NULL) é tratada como graduação → sempre aparece.
    if (!incluirPos) { where.push(`(c.nivel IS DISTINCT FROM 'pos_graduacao')`); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    try {
        const { rows } = await pool.query(`
            SELECT t.id_turma, t.disciplina_id, t.periodo_letivo_id, t.nome_turma,
                   t.professor_user_id, t.vagas, t.curso_id,
                   d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
                   pl.nome AS periodo_nome, c.nome AS curso_nome,
                   u.nome AS professor_nome,
                   COUNT(DISTINCT h.id_horario)::int AS total_horarios,
                   COUNT(DISTINCT h.id_horario) FILTER (WHERE h.sala_id IS NOT NULL)::int AS horarios_com_sala,
                   GREATEST(COUNT(DISTINCT tp.user_id), CASE WHEN t.professor_user_id IS NOT NULL THEN 1 ELSE 0 END)::int AS total_professores
            FROM turmas t
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN cursos c ON c.id_curso = t.curso_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            LEFT JOIN turmas_horarios h ON h.turma_id = t.id_turma
            LEFT JOIN turmas_professores tp ON tp.turma_id = t.id_turma
            ${whereSql}
            GROUP BY t.id_turma, d.nome, d.codigo, pl.nome, c.nome, u.nome
            ORDER BY c.nome NULLS LAST, d.nome, t.nome_turma
        `, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar turmas:");
        return res.status(500).json({ status: "error", message: "Erro ao listar turmas.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /ensalamento — horários SEM sala (fila de ensalamento)
//   Filtros: periodo_letivo_id, curso_id, disciplina_id, dia_semana, incluir_pos
// ───────────────────────────────────────────────────────────────
router.get("/ensalamento", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    }
    const { periodo_letivo_id, curso_id, disciplina_id, dia_semana, incluir_pos } = req.query;
    const incluirPos = incluir_pos === "1" || incluir_pos === "true";
    const params = [];
    const where = ["h.sala_id IS NULL"];
    if (periodo_letivo_id) { params.push(periodo_letivo_id); where.push(`t.periodo_letivo_id = $${params.length}`); }
    if (curso_id) { params.push(curso_id); where.push(`t.curso_id = $${params.length}`); }
    if (disciplina_id) { params.push(disciplina_id); where.push(`t.disciplina_id = $${params.length}`); }
    if (dia_semana !== undefined && dia_semana !== "") { params.push(parseInt(dia_semana, 10)); where.push(`h.dia_semana = $${params.length}`); }
    if (!incluirPos) { where.push(`(c.nivel IS DISTINCT FROM 'pos_graduacao')`); }

    try {
        const { rows } = await pool.query(`
            SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fim, h.tipo_aula,
                   h.data_inicio AS bloco_inicio, h.data_fim AS bloco_fim,
                   t.id_turma, t.nome_turma, t.vagas, t.periodo_letivo_id,
                   d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
                   c.nome AS curso_nome, u.nome AS professor_nome,
                   pl.nome AS periodo_nome, pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim
            FROM turmas_horarios h
            JOIN turmas t ON t.id_turma = h.turma_id
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN cursos c ON c.id_curso = t.curso_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            WHERE ${where.join(" AND ")}
            ORDER BY c.nome NULLS LAST, d.nome, t.nome_turma, h.dia_semana, h.hora_inicio
        `, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar fila de ensalamento:");
        return res.status(500).json({ status: "error", message: "Erro ao listar fila de ensalamento.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /quadro/salas — salas que têm aulas no período (seletor do quadro)
// ───────────────────────────────────────────────────────────────
router.get("/quadro/salas", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    }
    const { periodo_letivo_id } = req.query;
    const params = [];
    const where = ["h.sala_id IS NOT NULL"];
    if (periodo_letivo_id) { params.push(periodo_letivo_id); where.push(`t.periodo_letivo_id = $${params.length}`); }
    try {
        const { rows } = await pool.query(`
            SELECT s.sala_id, s.sala_nome, s.sala_capacidade, p.predio AS predio_nome,
                   COUNT(h.id_horario)::int AS total_aulas
            FROM turmas_horarios h
            JOIN turmas t ON t.id_turma = h.turma_id
            JOIN salas s ON s.sala_id = h.sala_id
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            WHERE ${where.join(" AND ")}
            GROUP BY s.sala_id, p.predio
            ORDER BY s.sala_nome
        `, params);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar salas do quadro:");
        return res.status(500).json({ status: "error", message: "Erro ao listar salas do quadro.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /quadro — grade semanal de aulas (quadro impresso)
//   Query: periodo_letivo_id (obrigatório) + sala_id OU curso_id.
//   Por sala: header = sala; células têm disciplina/turma/professor.
//   Por curso: header = curso; células têm também a sala.
// ───────────────────────────────────────────────────────────────
router.get("/quadro", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    }
    const { periodo_letivo_id, sala_id, curso_id, incluir_pos } = req.query;
    if (!periodo_letivo_id || (!sala_id && !curso_id)) {
        return res.status(400).json({ status: "error", message: "Informe periodo_letivo_id e sala_id ou curso_id.", data: null });
    }
    const incluirPos = incluir_pos === "1" || incluir_pos === "true";

    // Professor(es): co-docência agregada; se não houver, o professor titular
    const profExpr = `COALESCE(
        (SELECT string_agg(u2.nome, ', ' ORDER BY u2.nome)
         FROM turmas_professores tp JOIN users u2 ON u2.user_id = tp.user_id
         WHERE tp.turma_id = t.id_turma),
        u.nome) AS professor_nome`;

    const params = [periodo_letivo_id];
    const where = ["t.periodo_letivo_id = $1"];
    // Por sala: só horários daquela sala. Por curso: todos (com/sem sala) do curso.
    if (sala_id) { params.push(sala_id); where.push(`h.sala_id = $${params.length}`); }
    if (curso_id) { params.push(curso_id); where.push(`t.curso_id = $${params.length}`); }
    if (curso_id && !incluirPos) { where.push(`(c.nivel IS DISTINCT FROM 'pos_graduacao')`); }

    try {
        const horarios = await pool.query(`
            SELECT h.dia_semana, h.hora_inicio, h.hora_fim, h.tipo_aula,
                   d.codigo AS disciplina_codigo, d.nome AS disciplina_nome,
                   t.nome_turma, t.vagas,
                   s.sala_nome, p.predio AS predio_nome,
                   ${profExpr}
            FROM turmas_horarios h
            JOIN turmas t ON t.id_turma = h.turma_id
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            LEFT JOIN cursos c ON c.id_curso = t.curso_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            LEFT JOIN salas s ON s.sala_id = h.sala_id
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            WHERE ${where.join(" AND ")}
            ORDER BY h.dia_semana, h.hora_inicio
        `, params);

        // Cabeçalho conforme o eixo
        let header = null;
        const periodo = (await pool.query("SELECT id_periodo, nome FROM periodos_letivos WHERE id_periodo = $1", [periodo_letivo_id])).rows[0] || null;
        if (sala_id) {
            const s = (await pool.query(`
                SELECT s.sala_id, s.sala_nome, s.sala_capacidade, p.predio AS predio_nome
                FROM salas s LEFT JOIN predios p ON p.predio_id = s.predio_id
                WHERE s.sala_id = $1`, [sala_id])).rows[0];
            if (!s) return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
            header = { tipo: "sala", titulo: s.sala_nome, sala_capacidade: s.sala_capacidade, predio_nome: s.predio_nome };
        } else {
            const c = (await pool.query("SELECT id_curso, nome FROM cursos WHERE id_curso = $1", [curso_id])).rows[0];
            if (!c) return res.status(404).json({ status: "error", message: "Curso não encontrado.", data: null });
            header = { tipo: "curso", titulo: c.nome };
        }

        return res.status(200).json({ status: "success", message: "", data: { header, periodo, horarios: horarios.rows } });
    } catch (error) {
        logger.error({ err: error }, "Erro ao montar quadro de horários:");
        return res.status(500).json({ status: "error", message: "Erro ao montar o quadro.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /:id — detalhe da turma + horários (com sala/prédio)
// ───────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const turma = await pool.query(`
            SELECT t.*, d.nome AS disciplina_nome, d.codigo AS disciplina_codigo,
                   pl.nome AS periodo_nome,
                   pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim,
                   c.nome AS curso_nome, u.nome AS professor_nome
            FROM turmas t
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN cursos c ON c.id_curso = t.curso_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            WHERE t.id_turma = $1`, [id]);
        if (turma.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Turma não encontrada.", data: null });
        }
        // LEFT JOIN nas salas: horários importados entram SEM sala (aguardando ensalamento)
        const horarios = await pool.query(`
            SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fim, h.sala_id,
                   h.tipo_aula, h.data_inicio, h.data_fim,
                   s.sala_nome, p.predio AS predio_nome
            FROM turmas_horarios h
            LEFT JOIN salas s ON s.sala_id = h.sala_id
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            WHERE h.turma_id = $1
            ORDER BY h.dia_semana, h.hora_inicio`, [id]);
        // Co-docência (professores vinculados à turma) + encargo
        const professores = await pool.query(`
            SELECT u.user_id, u.nome, tp.encargo
            FROM turmas_professores tp
            JOIN users u ON u.user_id = tp.user_id
            WHERE tp.turma_id = $1
            ORDER BY u.nome`, [id]);
        return res.status(200).json({
            status: "success", message: "",
            data: { ...turma.rows[0], horarios: horarios.rows, professores: professores.rows },
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
        realtime.broadcast("agenda_atualizada", { motivo: "turma_excluida" });
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
// materializarAula — núcleo compartilhado da alocação
//   Expande a recorrência semanal no intervalo [inicioBound, fimBound],
//   checa conflito com a ocupação da sala e (se livre) cria o agendamento
//   origem='aula' + ocorrências. NÃO gerencia transação (o caller faz
//   BEGIN/COMMIT), NÃO mexe em turmas_horarios e NÃO remove aula antiga —
//   isso fica a cargo de quem chama (POST cria o horário, PUT apaga a aula
//   antiga antes, o lote apenas atualiza o sala_id do horário órfão).
//   Retorna { ok:true, total } ou { ok:false, motivo:'sem_datas' } ou
//   { ok:false, conflitos:[...], total_conflitos }.
// ───────────────────────────────────────────────────────────────
async function materializarAula(client, {
    horarioId, sala_id, dia, hora_inicio, hora_fim,
    inicioBound, fimBound, motivo, professorId, criadorId,
}) {
    const datas = expandirRecorrencia({
        tipo: "semanal",
        data_inicio: inicioBound,
        data_fim_recorrencia: fimBound,
        dias_semana: String(dia),
        intervalo_semanas: 1,
    });
    if (datas.length === 0) return { ok: false, motivo: "sem_datas" };

    const existentes = await ocorrenciasDaSala(client, sala_id, datas);
    const novas = datas.map((d) => ({ data: d, dia_inteiro: false, hora_inicio, hora_fim }));
    const conflitos = detectarConflitos(novas, existentes);
    if (conflitos.length > 0) {
        return {
            ok: false,
            conflitos: conflitos.slice(0, 10).map((c) => ({ data: c.data, ocupada_por: c.comExistente.motivo })),
            total_conflitos: conflitos.length,
        };
    }

    const ag = await client.query(
        `INSERT INTO agendamentos
            (sala_id, solicitante_user_id, motivo, dia_inteiro, hora_inicio, hora_fim,
             data_inicio, data_fim_recorrencia, tipo_recorrencia, dias_semana, intervalo_semanas,
             status, aprovado_por_user_id, data_decisao, origem, turma_horario_id)
         VALUES ($1, $2, $3, FALSE, $4, $5, $6, $7, 'semanal', $8, 1,
                 'aprovada', $9, NOW(), 'aula', $10)
         RETURNING id_agendamento`,
        [sala_id, professorId || criadorId, motivo, hora_inicio, hora_fim,
         inicioBound, fimBound, String(dia), criadorId, horarioId]
    );
    const agendamentoId = ag.rows[0].id_agendamento;
    for (const d of datas) {
        await client.query(
            `INSERT INTO agendamentos_ocorrencias (agendamento_id, data_ocorrencia, status_individual)
             VALUES ($1, $2, 'ativa')`,
            [agendamentoId, d]
        );
    }
    return { ok: true, total: datas.length };
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

        await client.query("BEGIN");

        const h = await client.query(
            `INSERT INTO turmas_horarios (turma_id, dia_semana, hora_inicio, hora_fim, sala_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, dia, hora_inicio, hora_fim, sala_id]
        );
        const horario = h.rows[0];

        const resultado = await materializarAula(client, {
            horarioId: horario.id_horario,
            sala_id,
            dia,
            hora_inicio,
            hora_fim,
            inicioBound: toDateStr(turma.data_inicio),
            fimBound: toDateStr(turma.data_fim),
            motivo: `${turma.disciplina_nome} — ${turma.nome_turma}`,
            professorId: turma.professor_user_id,
            criadorId: req.usuario.id,
        });

        if (!resultado.ok) {
            await client.query("ROLLBACK");
            if (resultado.motivo === "sem_datas") {
                return res.status(400).json({ status: "error", message: "Nenhuma data gerada — verifique as datas do período letivo.", data: null });
            }
            return res.status(409).json({
                status: "error",
                message: `Conflito: a sala já está ocupada em ${resultado.total_conflitos} data(s) neste horário.`,
                data: { conflitos: resultado.conflitos, total_conflitos: resultado.total_conflitos },
            });
        }

        await client.query("COMMIT");
        realtime.broadcast("agenda_atualizada", { motivo: "aula_alocada", sala_id });
        return res.status(201).json({
            status: "success",
            message: `Horário alocado (${resultado.total} aulas em ${NOMES_DIAS[dia]}).`,
            data: { ...horario, total_ocorrencias: resultado.total },
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
// PUT /:id/horarios/:horarioId — edita horário e re-materializa a aula
//   body: { dia_semana, hora_inicio, hora_fim, sala_id }
//   Preserva tipo_aula e o bloco modular (data_inicio/fim) do horário.
//   Se houver sala, regenera o agendamento (origem=aula) + ocorrências,
//   checando conflito (a própria aula é removida antes da checagem, então
//   não conflita consigo mesma). Sem sala, apenas desaloca.
// ───────────────────────────────────────────────────────────────
router.put("/:id/horarios/:horarioId", async (req, res) => {
    const { id, horarioId } = req.params;
    const { dia_semana, hora_inicio, hora_fim, sala_id } = req.body;

    const dia = parseInt(dia_semana, 10);
    if (Number.isNaN(dia) || dia < 0 || dia > 6) {
        return res.status(400).json({ status: "error", message: "Dia da semana inválido.", data: null });
    }
    if (!hora_inicio || !hora_fim || hora_inicio >= hora_fim) {
        return res.status(400).json({ status: "error", message: "Horário inválido (início deve ser antes do fim).", data: null });
    }

    const client = await pool.connect();
    try {
        // Horário existente (bloco modular preservado) + turma + período
        const h0 = await client.query(`
            SELECT h.id_horario, h.data_inicio, h.data_fim,
                   t.id_turma, t.nome_turma, t.professor_user_id,
                   d.nome AS disciplina_nome,
                   pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim
            FROM turmas_horarios h
            JOIN turmas t ON t.id_turma = h.turma_id
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            WHERE h.id_horario = $1 AND h.turma_id = $2`, [horarioId, id]);
        if (h0.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Horário não encontrado.", data: null });
        }
        const info = h0.rows[0];

        // Bounds da recorrência: bloco modular do horário, se houver; senão o período
        const inicioBound = info.data_inicio ? toDateStr(info.data_inicio) : toDateStr(info.periodo_inicio);
        const fimBound = info.data_fim ? toDateStr(info.data_fim) : toDateStr(info.periodo_fim);

        await client.query("BEGIN");

        // Remove a aula antiga (se existir) antes de checar conflito → não conflita consigo mesma
        await client.query(
            "DELETE FROM agendamentos WHERE turma_horario_id = $1 AND origem = 'aula'", [horarioId]
        );

        // Atualiza o horário (tipo_aula e bloco modular ficam intactos)
        await client.query(
            `UPDATE turmas_horarios SET dia_semana=$1, hora_inicio=$2, hora_fim=$3, sala_id=$4
             WHERE id_horario=$5`,
            [dia, hora_inicio, hora_fim, sala_id || null, horarioId]
        );

        // Sem sala: só desaloca (horário permanece na grade, aguardando ensalamento)
        if (!sala_id) {
            await client.query("COMMIT");
            realtime.broadcast("agenda_atualizada", { motivo: "aula_desalocada" });
            return res.status(200).json({ status: "success", message: "Horário atualizado (sem sala).", data: null });
        }

        // Expande datas no bloco e checa conflito com a ocupação restante da sala
        const resultado = await materializarAula(client, {
            horarioId,
            sala_id,
            dia,
            hora_inicio,
            hora_fim,
            inicioBound,
            fimBound,
            motivo: `${info.disciplina_nome} — ${info.nome_turma}`,
            professorId: info.professor_user_id,
            criadorId: req.usuario.id,
        });

        if (!resultado.ok) {
            await client.query("ROLLBACK");
            if (resultado.motivo === "sem_datas") {
                return res.status(400).json({ status: "error", message: "Nenhuma data gerada — verifique as datas do período/bloco.", data: null });
            }
            return res.status(409).json({
                status: "error",
                message: `Conflito: a sala já está ocupada em ${resultado.total_conflitos} data(s) neste horário.`,
                data: { conflitos: resultado.conflitos, total_conflitos: resultado.total_conflitos },
            });
        }

        await client.query("COMMIT");
        realtime.broadcast("agenda_atualizada", { motivo: "aula_realocada", sala_id });
        return res.status(200).json({
            status: "success",
            message: `Horário atualizado (${resultado.total} aulas em ${NOMES_DIAS[dia]}).`,
            data: { total_ocorrencias: resultado.total },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao editar horário:");
        return res.status(500).json({ status: "error", message: "Erro ao editar horário.", data: null });
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
        realtime.broadcast("agenda_atualizada", { motivo: "horario_removido" });
        return res.status(200).json({ status: "success", message: "Horário removido.", data: null });
    } catch (error) {
        logger.error({ err: error }, "Erro ao remover horário:");
        return res.status(500).json({ status: "error", message: "Erro ao remover horário.", data: null });
    }
});

// Carrega dados de um horário (turma + disciplina + período + bloco modular)
async function carregarHorarioInfo(client, horarioId) {
    const r = await client.query(`
        SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fim,
               h.data_inicio AS bloco_inicio, h.data_fim AS bloco_fim,
               t.id_turma, t.nome_turma, t.professor_user_id, t.vagas,
               d.nome AS disciplina_nome,
               pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim
        FROM turmas_horarios h
        JOIN turmas t ON t.id_turma = h.turma_id
        JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
        JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
        WHERE h.id_horario = $1`, [horarioId]);
    return r.rows[0] || null;
}

// ───────────────────────────────────────────────────────────────
// POST /ensalamento/lote — aplica ensalamento em lote
//   body: { itens: [{ horario_id, sala_id }, ...] }
//   Materializa cada item na SUA transação (sucesso parcial ok; cada item
//   já enxerga os anteriores → não dá pra dois caírem na mesma sala/slot).
//   Devolve resultado por item.
// ───────────────────────────────────────────────────────────────
router.post("/ensalamento/lote", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    }
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    if (itens.length === 0) {
        return res.status(400).json({ status: "error", message: "Nenhum item para ensalar.", data: null });
    }

    const resultados = [];
    let alocados = 0;
    const client = await pool.connect();
    try {
        for (const item of itens) {
            const horarioId = parseInt(item.horario_id, 10);
            const salaId = item.sala_id ? parseInt(item.sala_id, 10) : null;
            if (Number.isNaN(horarioId) || !salaId) {
                resultados.push({ horario_id: item.horario_id, ok: false, message: "Item inválido (horário/sala)." });
                continue;
            }
            try {
                await client.query("BEGIN");
                const info = await carregarHorarioInfo(client, horarioId);
                if (!info) {
                    await client.query("ROLLBACK");
                    resultados.push({ horario_id: horarioId, ok: false, message: "Horário não encontrado." });
                    continue;
                }
                if (await salaForaDoEnsalamento(client, salaId)) {
                    await client.query("ROLLBACK");
                    resultados.push({ horario_id: horarioId, ok: false, message: "Sala reservada a agendamento manual (auditório/uso sob solicitação) — fora do ensalamento." });
                    continue;
                }
                // Re-ensalamento: remove aula antiga (se houver) e aponta a nova sala
                await client.query("DELETE FROM agendamentos WHERE turma_horario_id = $1 AND origem = 'aula'", [horarioId]);
                await client.query("UPDATE turmas_horarios SET sala_id = $1 WHERE id_horario = $2", [salaId, horarioId]);

                const inicioBound = info.bloco_inicio ? toDateStr(info.bloco_inicio) : toDateStr(info.periodo_inicio);
                const fimBound = info.bloco_fim ? toDateStr(info.bloco_fim) : toDateStr(info.periodo_fim);
                const r = await materializarAula(client, {
                    horarioId, sala_id: salaId, dia: info.dia_semana,
                    hora_inicio: hhmm(info.hora_inicio), hora_fim: hhmm(info.hora_fim),
                    inicioBound, fimBound,
                    motivo: `${info.disciplina_nome} — ${info.nome_turma}`,
                    professorId: info.professor_user_id, criadorId: req.usuario.id,
                });
                if (!r.ok) {
                    await client.query("ROLLBACK");
                    resultados.push({
                        horario_id: horarioId, ok: false,
                        message: r.motivo === "sem_datas" ? "Nenhuma data gerada (verifique o período)." : `Conflito em ${r.total_conflitos} data(s).`,
                        conflitos: r.conflitos || [],
                    });
                    continue;
                }
                await client.query("COMMIT");
                alocados++;
                resultados.push({ horario_id: horarioId, ok: true, sala_id: salaId, total: r.total });
            } catch (e) {
                await client.query("ROLLBACK");
                logger.error({ err: e }, "Erro no item do lote de ensalamento:");
                resultados.push({ horario_id: horarioId, ok: false, message: "Erro interno ao alocar." });
            }
        }
        if (alocados > 0) realtime.broadcast("agenda_atualizada", { motivo: "ensalamento_lote", alocados });
        return res.status(200).json({
            status: "success",
            message: `${alocados} de ${itens.length} horário(s) alocado(s).`,
            data: { alocados, total: itens.length, resultados },
        });
    } finally {
        client.release();
    }
});

// ───────────────────────────────────────────────────────────────
// POST /ensalamento/auto — proposta automática por capacidade (DRY-RUN)
//   body: { periodo_letivo_id, curso_id?, disciplina_id?, dia_semana?,
//           incluir_pos?, respeitar_capacidade? (default true) }
//   Guloso: horários por vagas desc; escolhe a MENOR sala que comporta e
//   está livre (respeitando escolhas já feitas na mesma rodada). NÃO grava —
//   devolve a proposta p/ revisão; aplicar via POST /ensalamento/lote.
// ───────────────────────────────────────────────────────────────
router.post("/ensalamento/auto", async (req, res) => {
    if (!ehDirecao(req.usuario)) {
        return res.status(403).json({ status: "error", message: "Acesso restrito à direção.", data: null });
    }
    const { periodo_letivo_id, curso_id, disciplina_id, dia_semana, incluir_pos } = req.body || {};
    const respeitarCap = req.body?.respeitar_capacidade !== false;
    const incluirPos = incluir_pos === true || incluir_pos === "1";

    const params = [];
    const where = ["h.sala_id IS NULL"];
    if (periodo_letivo_id) { params.push(periodo_letivo_id); where.push(`t.periodo_letivo_id = $${params.length}`); }
    if (curso_id) { params.push(curso_id); where.push(`t.curso_id = $${params.length}`); }
    if (disciplina_id) { params.push(disciplina_id); where.push(`t.disciplina_id = $${params.length}`); }
    if (dia_semana !== undefined && dia_semana !== "" && dia_semana !== null) { params.push(parseInt(dia_semana, 10)); where.push(`h.dia_semana = $${params.length}`); }
    if (!incluirPos) { where.push(`(c.nivel IS DISTINCT FROM 'pos_graduacao')`); }

    try {
        const orphans = (await pool.query(`
            SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fim,
                   h.data_inicio AS bloco_inicio, h.data_fim AS bloco_fim,
                   t.nome_turma, t.vagas,
                   d.nome AS disciplina_nome, c.nome AS curso_nome, u.nome AS professor_nome,
                   pl.data_inicio AS periodo_inicio, pl.data_fim AS periodo_fim
            FROM turmas_horarios h
            JOIN turmas t ON t.id_turma = h.turma_id
            JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            JOIN periodos_letivos pl ON pl.id_periodo = t.periodo_letivo_id
            LEFT JOIN cursos c ON c.id_curso = t.curso_id
            LEFT JOIN users u ON u.user_id = t.professor_user_id
            WHERE ${where.join(" AND ")}
            ORDER BY t.vagas DESC NULLS LAST, d.nome, t.nome_turma, h.dia_semana, h.hora_inicio
        `, params)).rows;

        const salas = (await pool.query(`
            SELECT s.sala_id, s.sala_nome, s.sala_capacidade, s.predio_id, p.predio AS predio_nome
            FROM salas s
            LEFT JOIN predios p ON p.predio_id = s.predio_id
            LEFT JOIN salas_tipo st ON st.sala_tipo_id = s.sala_tipo_id
            WHERE s.is_agendavel = 1
              AND COALESCE(s.agendamento_manual, 0) = 0
              AND COALESCE(st.sala_tipo_nome, '') NOT ILIKE 'auditório'`)).rows;

        const tentativas = []; // { sala_id, dia, hi, hf, ini, fim }
        const proposta = [];

        for (const h of orphans) {
            const dia = h.dia_semana;
            const hi = hhmm(h.hora_inicio);
            const hf = hhmm(h.hora_fim);
            const ini = h.bloco_inicio ? toDateStr(h.bloco_inicio) : toDateStr(h.periodo_inicio);
            const fim = h.bloco_fim ? toDateStr(h.bloco_fim) : toDateStr(h.periodo_fim);
            const vagas = h.vagas;

            const datas = expandirRecorrencia({
                tipo: "semanal", data_inicio: ini, data_fim_recorrencia: fim,
                dias_semana: String(dia), intervalo_semanas: 1,
            });

            const busy = new Set();
            if (datas.length) {
                const occ = await pool.query(
                    `SELECT DISTINCT a.sala_id
                     FROM agendamentos_ocorrencias ao
                     JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
                     WHERE ao.status_individual = 'ativa'
                       AND a.status IN ('pendente', 'aprovada')
                       AND a.sala_id IS NOT NULL
                       AND ao.data_ocorrencia = ANY($1::date[])
                       AND (a.dia_inteiro OR (a.hora_inicio < $3 AND a.hora_fim > $2))`,
                    [datas, hi, hf]
                );
                occ.rows.forEach((r) => busy.add(r.sala_id));
            }
            // Conflito com escolhas já feitas nesta rodada (mesmo dia, horário e bloco sobrepostos)
            const conflitaTent = (salaId) =>
                tentativas.some((t) => t.sala_id === salaId && t.dia === dia && hi < t.hf && hf > t.hi && ini <= t.fim && fim >= t.ini);

            const candidatos = salas.filter((s) => !busy.has(s.sala_id) && !conflitaTent(s.sala_id));

            let escolha = null;
            const comCap = candidatos
                .filter((s) => s.sala_capacidade !== null && vagas !== null && s.sala_capacidade >= vagas)
                .sort((a, b) => (a.sala_capacidade - vagas) - (b.sala_capacidade - vagas)
                    || String(a.sala_nome).localeCompare(String(b.sala_nome), "pt-BR"));
            if (comCap.length) {
                escolha = comCap[0];
            } else if (!respeitarCap || vagas === null) {
                escolha = candidatos.slice().sort((a, b) => {
                    const ca = a.sala_capacidade ?? Infinity, cb = b.sala_capacidade ?? Infinity;
                    return ca - cb || String(a.sala_nome).localeCompare(String(b.sala_nome), "pt-BR");
                })[0] || null;
            }

            const base = {
                horario_id: h.id_horario, dia_semana: dia, hora_inicio: hi, hora_fim: hf,
                disciplina_nome: h.disciplina_nome, nome_turma: h.nome_turma, vagas,
                curso_nome: h.curso_nome, professor_nome: h.professor_nome,
            };
            if (escolha) {
                tentativas.push({ sala_id: escolha.sala_id, dia, hi, hf, ini, fim });
                proposta.push({
                    ...base, sala_id: escolha.sala_id, sala_nome: escolha.sala_nome,
                    sala_capacidade: escolha.sala_capacidade, predio_nome: escolha.predio_nome,
                    cabe: vagas !== null && escolha.sala_capacidade !== null ? escolha.sala_capacidade >= vagas : null,
                });
            } else {
                proposta.push({
                    ...base, sala_id: null, sala_nome: null, sala_capacidade: null, predio_nome: null, cabe: null,
                    motivo: candidatos.length ? "Sem sala com capacidade suficiente." : "Sem sala livre neste horário.",
                });
            }
        }

        const alocados = proposta.filter((p) => p.sala_id).length;
        return res.status(200).json({
            status: "success",
            message: `Proposta: ${alocados} de ${orphans.length} horário(s) com sala sugerida.`,
            data: { proposta, total: orphans.length, alocados },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro no ensalamento automático:");
        return res.status(500).json({ status: "error", message: "Erro ao gerar proposta de ensalamento.", data: null });
    }
});

module.exports = router;
