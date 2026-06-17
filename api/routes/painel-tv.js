const express = require("express");
const pool = require("../config/database.js");

const router = express.Router();

// "Hoje" no fuso de Brasília (o banco roda em UTC; sem isso a virada do dia
// às 21h local mostraria a agenda do dia seguinte).
const HOJE_SQL = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";

function hhmm(v) {
    return v === null || v === undefined ? null : String(v).slice(0, 5);
}

// ───────────────────────────────────────────────────────────────
// GET /api/painel-tv/predios — prédios com salas agendáveis (para o seletor)
// PÚBLICO (sem token). Expõe apenas id e nome do prédio.
// ───────────────────────────────────────────────────────────────
router.get("/predios", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT DISTINCT p.predio_id, p.predio AS predio_nome
            FROM predios p
            JOIN salas s ON s.predio_id = p.predio_id AND s.is_agendavel = 1
            ORDER BY p.predio
        `);
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        console.error("Erro ao listar prédios (painel-tv):", error);
        return res.status(500).json({ status: "error", message: "Erro ao listar prédios.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /api/painel-tv/:predio_id — agenda de HOJE do prédio
// PÚBLICO (sem token). Aulas exibem disciplina + professor;
// reservas pontuais exibem apenas "Reservado" (sem motivo/solicitante).
// ───────────────────────────────────────────────────────────────
router.get("/:predio_id", async (req, res) => {
    const { predio_id } = req.params;
    if (!/^\d+$/.test(predio_id)) {
        return res.status(400).json({ status: "error", message: "Prédio inválido.", data: null });
    }
    try {
        const predio = await pool.query("SELECT predio_id, predio AS predio_nome FROM predios WHERE predio_id = $1", [predio_id]);
        if (predio.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Prédio não encontrado.", data: null });
        }

        const { rows } = await pool.query(`
            SELECT a.origem, a.dia_inteiro, a.hora_inicio, a.hora_fim,
                   s.sala_id, s.sala_nome,
                   d.nome AS disciplina_nome, t.nome_turma, prof.nome AS professor_nome
            FROM agendamentos_ocorrencias ao
            JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
            JOIN salas s ON s.sala_id = a.sala_id
            LEFT JOIN turmas_horarios th ON th.id_horario = a.turma_horario_id
            LEFT JOIN turmas t ON t.id_turma = th.turma_id
            LEFT JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
            LEFT JOIN users prof ON prof.user_id = t.professor_user_id
            WHERE s.predio_id = $1
              AND a.status = 'aprovada'
              AND ao.status_individual = 'ativa'
              AND ao.data_ocorrencia = ${HOJE_SQL}
            ORDER BY s.sala_nome, a.hora_inicio NULLS FIRST
        `, [predio_id]);

        // Monta itens sem vazar dados internos de reservas pontuais
        const itens = rows.map((r) => {
            const ehAula = r.origem === "aula";
            return {
                sala_id: r.sala_id,
                sala_nome: r.sala_nome,
                dia_inteiro: r.dia_inteiro,
                hora_inicio: hhmm(r.hora_inicio),
                hora_fim: hhmm(r.hora_fim),
                titulo: ehAula ? r.disciplina_nome : "Reservado",
                subtitulo: ehAula
                    ? [r.professor_nome, r.nome_turma].filter(Boolean).join(" · ")
                    : "",
                tipo: ehAula ? "aula" : "reserva",
            };
        });

        return res.status(200).json({
            status: "success",
            message: "",
            data: {
                predio: predio.rows[0],
                gerado_em: new Date().toISOString(),
                itens,
            },
        });
    } catch (error) {
        console.error("Erro ao montar painel-tv:", error);
        return res.status(500).json({ status: "error", message: "Erro ao montar painel.", data: null });
    }
});

module.exports = router;
