"use strict";

const express = require("express");
const WebSocket = require("ws");
const pool = require("../config/database.js");
const { expandirRecorrencia, detectarConflitos } = require("../lib/recorrencia.js");
const logger = require("../lib/logger.js");
const whatsapp = require("../lib/whatsapp.js");
const email = require("../lib/email.js");
const emailTpl = require("../lib/email-templates.js");

module.exports = function (wss) {
    const router = express.Router();

    function ehDirecao(usuario) {
        if (!usuario) return false;
        if (["super_admin", "diretor", "vice_diretor"].includes(usuario.permissao)) return true;
        if (usuario.is_direcao_centro) return true;
        return (
            Array.isArray(usuario.funcionalidades) &&
            (usuario.funcionalidades.includes("aprovar_agendamento") ||
                usuario.funcionalidades.includes("ver_todos_agendamentos"))
        );
    }

    function broadcast(tipo, payload, predicado) {
        if (!wss) return;
        const msg = JSON.stringify({ tipo, ...payload });
        wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN || !client.usuario) return;
            if (predicado(client.usuario)) client.send(msg);
        });
    }

    // Busca ocorrências existentes da sala para detectar conflito
    async function buscarOcorrenciasExistentes(sala_id, datas, ignorarAgendamentoId = null) {
        if (datas.length === 0) return [];
        const params = [sala_id, datas];
        let extra = "";
        if (ignorarAgendamentoId) {
            params.push(ignorarAgendamentoId);
            extra = ` AND a.id_agendamento <> $3`;
        }
        const { rows } = await pool.query(
            `SELECT ao.data_ocorrencia, a.dia_inteiro, a.hora_inicio, a.hora_fim,
                    a.id_agendamento, a.motivo, u.nome AS solicitante_nome
             FROM agendamentos_ocorrencias ao
             JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
             JOIN users u ON u.user_id = a.solicitante_user_id
             WHERE a.sala_id = $1
               AND ao.status_individual = 'ativa'
               AND a.status IN ('pendente', 'aprovada')
               AND ao.data_ocorrencia = ANY($2::date[])
               ${extra}`,
            params
        );
        return rows.map((r) => ({
            data: typeof r.data_ocorrencia === "string" ? r.data_ocorrencia : r.data_ocorrencia.toISOString().slice(0, 10),
            dia_inteiro: r.dia_inteiro,
            hora_inicio: r.hora_inicio,
            hora_fim: r.hora_fim,
            agendamento_id: r.id_agendamento,
            motivo: r.motivo,
            solicitante_nome: r.solicitante_nome,
        }));
    }

    function validarPayload(body) {
        const erros = [];
        if (!body.sala_id) erros.push("sala_id é obrigatório.");
        if (!body.motivo || String(body.motivo).trim() === "") erros.push("motivo é obrigatório.");
        if (!body.data_inicio) erros.push("data_inicio é obrigatória.");
        if (!body.dia_inteiro) {
            if (!body.hora_inicio || !body.hora_fim) {
                erros.push("hora_inicio e hora_fim são obrigatórios quando não é dia inteiro.");
            } else if (body.hora_inicio >= body.hora_fim) {
                erros.push("hora_inicio deve ser anterior a hora_fim.");
            }
        }
        const tipo = body.tipo_recorrencia || "pontual";
        if (!["pontual", "semanal", "mensal"].includes(tipo)) {
            erros.push("tipo_recorrencia inválido.");
        }
        if (tipo !== "pontual" && !body.data_fim_recorrencia) {
            erros.push("data_fim_recorrencia é obrigatória para recorrência.");
        }
        return erros;
    }

    // ───────────────────────────────────────────────────────────────
    // POST /preview — calcula as ocorrências e flagueia conflitos
    // ───────────────────────────────────────────────────────────────
    router.post("/preview", async (req, res) => {
        const body = req.body || {};
        const erros = validarPayload(body);
        if (erros.length > 0) {
            return res.status(400).json({ status: "error", message: erros.join(" "), data: null });
        }

        try {
            const datas = expandirRecorrencia({
                tipo: body.tipo_recorrencia || "pontual",
                data_inicio: body.data_inicio,
                data_fim_recorrencia: body.data_fim_recorrencia,
                dias_semana: body.dias_semana,
                intervalo_semanas: body.intervalo_semanas,
            });

            const existentes = await buscarOcorrenciasExistentes(body.sala_id, datas);

            const novas = datas.map((d) => ({
                data: d,
                dia_inteiro: !!body.dia_inteiro,
                hora_inicio: body.hora_inicio || null,
                hora_fim: body.hora_fim || null,
            }));

            const conflitos = detectarConflitos(novas, existentes);
            const datasConflitantes = new Set(conflitos.map((c) => c.data));

            const ocorrencias = datas.map((d) => {
                const conf = conflitos.find((c) => c.data === d);
                return {
                    data: d,
                    conflito: datasConflitantes.has(d),
                    detalhe_conflito: conf
                        ? {
                              solicitante: conf.comExistente.solicitante_nome,
                              motivo: conf.comExistente.motivo,
                              dia_inteiro: conf.comExistente.dia_inteiro,
                              hora_inicio: conf.comExistente.hora_inicio,
                              hora_fim: conf.comExistente.hora_fim,
                          }
                        : null,
                };
            });

            return res.status(200).json({
                status: "success",
                message: "",
                data: { total: ocorrencias.length, conflitos: conflitos.length, ocorrencias },
            });
        } catch (error) {
            return res.status(400).json({ status: "error", message: error.message, data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // POST / — cria solicitação com ocorrências selecionadas
    //   body.datas: array opcional de datas a manter (default: todas as
    //   expandidas que não tenham conflito). Se enviado, usa exatamente.
    // ───────────────────────────────────────────────────────────────
    router.post("/", async (req, res) => {
        const body = req.body || {};
        const erros = validarPayload(body);
        if (erros.length > 0) {
            return res.status(400).json({ status: "error", message: erros.join(" "), data: null });
        }

        let datasExpandidas;
        try {
            datasExpandidas = expandirRecorrencia({
                tipo: body.tipo_recorrencia || "pontual",
                data_inicio: body.data_inicio,
                data_fim_recorrencia: body.data_fim_recorrencia,
                dias_semana: body.dias_semana,
                intervalo_semanas: body.intervalo_semanas,
            });
        } catch (error) {
            return res.status(400).json({ status: "error", message: error.message, data: null });
        }

        let datasFinais = datasExpandidas;
        if (Array.isArray(body.datas) && body.datas.length > 0) {
            const valid = new Set(datasExpandidas);
            datasFinais = body.datas.filter((d) => valid.has(d));
        }

        if (datasFinais.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Nenhuma ocorrência válida selecionada.",
                data: null,
            });
        }

        // Verifica conflitos com as datas finais (segurança server-side)
        const existentes = await buscarOcorrenciasExistentes(body.sala_id, datasFinais);
        const novas = datasFinais.map((d) => ({
            data: d,
            dia_inteiro: !!body.dia_inteiro,
            hora_inicio: body.hora_inicio || null,
            hora_fim: body.hora_fim || null,
        }));
        const conflitos = detectarConflitos(novas, existentes);
        if (conflitos.length > 0) {
            return res.status(409).json({
                status: "error",
                message: `${conflitos.length} ocorrência(s) em conflito. Refaça o preview.`,
                data: { conflitos: conflitos.map((c) => c.data) },
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const { rows: agRows } = await client.query(
                `INSERT INTO agendamentos
                    (sala_id, solicitante_user_id, motivo, observacao,
                     dia_inteiro, hora_inicio, hora_fim,
                     data_inicio, data_fim_recorrencia,
                     tipo_recorrencia, dias_semana, intervalo_semanas, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pendente')
                 RETURNING *`,
                [
                    body.sala_id,
                    req.usuario.id,
                    String(body.motivo).trim(),
                    body.observacao ? String(body.observacao).trim() : null,
                    !!body.dia_inteiro,
                    body.dia_inteiro ? null : body.hora_inicio,
                    body.dia_inteiro ? null : body.hora_fim,
                    body.data_inicio,
                    body.data_fim_recorrencia || null,
                    body.tipo_recorrencia || "pontual",
                    body.dias_semana || null,
                    Math.max(1, parseInt(body.intervalo_semanas, 10) || 1),
                ]
            );
            const agendamento = agRows[0];

            for (const d of datasFinais) {
                await client.query(
                    `INSERT INTO agendamentos_ocorrencias
                        (agendamento_id, data_ocorrencia, status_individual)
                     VALUES ($1, $2, 'ativa')`,
                    [agendamento.id_agendamento, d]
                );
            }

            await client.query("COMMIT");

            const { rows: info } = await pool.query(
                `SELECT a.*, s.sala_nome, u.nome AS solicitante_nome
                 FROM agendamentos a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 WHERE a.id_agendamento = $1`,
                [agendamento.id_agendamento]
            );

            broadcast(
                "agendamento_pendente",
                { agendamento: { ...info[0], total_ocorrencias: datasFinais.length } },
                (u) => ehDirecao(u)
            );

            return res.status(201).json({
                status: "success",
                message: "Solicitação enviada para aprovação.",
                data: info[0],
            });
        } catch (error) {
            await client.query("ROLLBACK");
            logger.error({ err: error }, "Erro ao criar agendamento");
            return res.status(500).json({ status: "error", message: "Erro ao criar agendamento.", data: null });
        } finally {
            client.release();
        }
    });

    // ───────────────────────────────────────────────────────────────
    // GET / — lista (filtros: status, sala_id, periodo)
    //   Solicitante vê só os próprios; direção vê todos.
    // ───────────────────────────────────────────────────────────────
    router.get("/", async (req, res) => {
        const { status, sala_id } = req.query;
        const params = [];
        // Apenas solicitações entram nesta lista; aulas (origem='aula') são geridas no módulo acadêmico
        const where = ["a.origem = 'solicitacao'"];

        if (!ehDirecao(req.usuario)) {
            params.push(req.usuario.id);
            where.push(`a.solicitante_user_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            where.push(`a.status = $${params.length}`);
        }
        if (sala_id) {
            params.push(sala_id);
            where.push(`a.sala_id = $${params.length}`);
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

        try {
            const { rows } = await pool.query(
                `SELECT a.id_agendamento, a.sala_id, a.solicitante_user_id, a.motivo,
                        a.dia_inteiro, a.hora_inicio, a.hora_fim,
                        a.data_inicio, a.data_fim_recorrencia, a.tipo_recorrencia,
                        a.status, a.motivo_rejeicao,
                        a.aprovado_por_user_id, a.data_decisao, a.createdat,
                        s.sala_nome, u.nome AS solicitante_nome,
                        ap.nome AS aprovado_por_nome,
                        COUNT(ao.id_ocorrencia) FILTER (WHERE ao.status_individual = 'ativa')::int AS total_ocorrencias_ativas
                 FROM agendamentos a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN users ap ON ap.user_id = a.aprovado_por_user_id
                 LEFT JOIN agendamentos_ocorrencias ao ON ao.agendamento_id = a.id_agendamento
                 ${whereSql}
                 GROUP BY a.id_agendamento, s.sala_nome, u.nome, ap.nome
                 ORDER BY a.createdat DESC`,
                params
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            logger.error({ err: error }, "Erro ao listar agendamentos");
            return res.status(500).json({ status: "error", message: "Erro ao listar agendamentos.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // GET /:id — detalhe + ocorrências
    // ───────────────────────────────────────────────────────────────
    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        try {
            const { rows } = await pool.query(
                `SELECT a.*, s.sala_nome, u.nome AS solicitante_nome,
                        ap.nome AS aprovado_por_nome
                 FROM agendamentos a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN users ap ON ap.user_id = a.aprovado_por_user_id
                 WHERE a.id_agendamento = $1`,
                [id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ status: "error", message: "Agendamento não encontrado.", data: null });
            }
            const agendamento = rows[0];

            if (!ehDirecao(req.usuario) && agendamento.solicitante_user_id !== req.usuario.id) {
                return res.status(403).json({ status: "error", message: "Acesso negado.", data: null });
            }

            const { rows: ocorrencias } = await pool.query(
                `SELECT id_ocorrencia, data_ocorrencia, status_individual, motivo_individual
                 FROM agendamentos_ocorrencias
                 WHERE agendamento_id = $1
                 ORDER BY data_ocorrencia`,
                [id]
            );

            return res.status(200).json({
                status: "success",
                message: "",
                data: { ...agendamento, ocorrencias },
            });
        } catch (error) {
            logger.error({ err: error }, "Erro ao buscar agendamento");
            return res.status(500).json({ status: "error", message: "Erro ao buscar agendamento.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // PATCH /:id/aprovar — direção
    // ───────────────────────────────────────────────────────────────
    router.patch("/:id/aprovar", async (req, res) => {
        if (!ehDirecao(req.usuario)) {
            return res.status(403).json({ status: "error", message: "Apenas a direção pode aprovar.", data: null });
        }
        const { id } = req.params;
        try {
            const { rows, rowCount } = await pool.query(
                `WITH atualizado AS (
                    UPDATE agendamentos
                    SET status = 'aprovada',
                        aprovado_por_user_id = $1,
                        data_decisao = NOW(),
                        motivo_rejeicao = NULL
                    WHERE id_agendamento = $2 AND status = 'pendente'
                    RETURNING *
                 )
                 SELECT a.*, s.sala_nome,
                        u.nome AS solicitante_nome, u.whatsapp AS solicitante_whatsapp,
                        u.email AS solicitante_email,
                        ap.nome AS aprovador_nome
                 FROM atualizado a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN users ap ON ap.user_id = a.aprovado_por_user_id`,
                [req.usuario.id, id]
            );
            if (rowCount === 0) {
                return res.status(400).json({
                    status: "error",
                    message: "Agendamento não encontrado ou já decidido.",
                    data: null,
                });
            }
            const agendamento = rows[0];
            broadcast(
                "agendamento_decidido",
                { agendamento, decisao: "aprovada" },
                (u) => u.id === agendamento.solicitante_user_id
            );
            // Notificações fire-and-forget (não atrasam a resposta nem bloqueiam em caso de falha)
            whatsapp.enviarMensagem(agendamento.solicitante_whatsapp, whatsapp.mensagemAprovacao(agendamento));
            if (agendamento.solicitante_email) {
                const t = emailTpl.agendamentoAprovado(agendamento);
                email.enviarEmail({ to: agendamento.solicitante_email, subject: t.subject, html: t.html, text: t.text, attachments: emailTpl.logoInfo().attachments });
            }
            return res.status(200).json({ status: "success", message: "Agendamento aprovado.", data: agendamento });
        } catch (error) {
            logger.error({ err: error }, "Erro ao aprovar agendamento");
            return res.status(500).json({ status: "error", message: "Erro ao aprovar.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // PATCH /:id/rejeitar — direção (com motivo)
    // ───────────────────────────────────────────────────────────────
    router.patch("/:id/rejeitar", async (req, res) => {
        if (!ehDirecao(req.usuario)) {
            return res.status(403).json({ status: "error", message: "Apenas a direção pode rejeitar.", data: null });
        }
        const { id } = req.params;
        const motivo = req.body?.motivo_rejeicao ? String(req.body.motivo_rejeicao).trim() : null;
        if (!motivo) {
            return res.status(400).json({ status: "error", message: "Motivo da rejeição é obrigatório.", data: null });
        }
        try {
            const { rows, rowCount } = await pool.query(
                `WITH atualizado AS (
                    UPDATE agendamentos
                    SET status = 'rejeitada',
                        aprovado_por_user_id = $1,
                        data_decisao = NOW(),
                        motivo_rejeicao = $2
                    WHERE id_agendamento = $3 AND status = 'pendente'
                    RETURNING *
                 )
                 SELECT a.*, s.sala_nome,
                        u.nome AS solicitante_nome, u.whatsapp AS solicitante_whatsapp,
                        u.email AS solicitante_email,
                        ap.nome AS aprovador_nome
                 FROM atualizado a
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN users ap ON ap.user_id = a.aprovado_por_user_id`,
                [req.usuario.id, motivo, id]
            );
            if (rowCount === 0) {
                return res.status(400).json({
                    status: "error",
                    message: "Agendamento não encontrado ou já decidido.",
                    data: null,
                });
            }
            const agendamento = rows[0];
            broadcast(
                "agendamento_decidido",
                { agendamento, decisao: "rejeitada" },
                (u) => u.id === agendamento.solicitante_user_id
            );
            // Notificações fire-and-forget
            whatsapp.enviarMensagem(agendamento.solicitante_whatsapp, whatsapp.mensagemRejeicao(agendamento));
            if (agendamento.solicitante_email) {
                const t = emailTpl.agendamentoRejeitado(agendamento);
                email.enviarEmail({ to: agendamento.solicitante_email, subject: t.subject, html: t.html, text: t.text, attachments: emailTpl.logoInfo().attachments });
            }
            return res.status(200).json({ status: "success", message: "Agendamento rejeitado.", data: agendamento });
        } catch (error) {
            logger.error({ err: error }, "Erro ao rejeitar agendamento");
            return res.status(500).json({ status: "error", message: "Erro ao rejeitar.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // PATCH /:id/cancelar — solicitante cancela série inteira
    // ───────────────────────────────────────────────────────────────
    router.patch("/:id/cancelar", async (req, res) => {
        const { id } = req.params;
        try {
            const { rows } = await pool.query(
                `SELECT solicitante_user_id, status FROM agendamentos WHERE id_agendamento = $1`,
                [id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ status: "error", message: "Não encontrado.", data: null });
            }
            const ag = rows[0];
            if (ag.solicitante_user_id !== req.usuario.id && !ehDirecao(req.usuario)) {
                return res.status(403).json({ status: "error", message: "Acesso negado.", data: null });
            }
            if (["cancelada", "rejeitada"].includes(ag.status)) {
                return res.status(400).json({
                    status: "error",
                    message: "Esta solicitação já foi finalizada.",
                    data: null,
                });
            }
            const { rows: upd } = await pool.query(
                `UPDATE agendamentos SET status = 'cancelada' WHERE id_agendamento = $1 RETURNING *`,
                [id]
            );
            return res.status(200).json({ status: "success", message: "Solicitação cancelada.", data: upd[0] });
        } catch (error) {
            logger.error({ err: error }, "Erro ao cancelar agendamento");
            return res.status(500).json({ status: "error", message: "Erro ao cancelar.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // PATCH /:id/ocorrencias/:occId/cancelar — cancela uma ocorrência
    // ───────────────────────────────────────────────────────────────
    router.patch("/:id/ocorrencias/:occId/cancelar", async (req, res) => {
        const { id, occId } = req.params;
        try {
            const { rows } = await pool.query(
                `SELECT a.solicitante_user_id, ao.id_ocorrencia
                 FROM agendamentos a
                 JOIN agendamentos_ocorrencias ao ON ao.agendamento_id = a.id_agendamento
                 WHERE a.id_agendamento = $1 AND ao.id_ocorrencia = $2`,
                [id, occId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ status: "error", message: "Não encontrado.", data: null });
            }
            if (rows[0].solicitante_user_id !== req.usuario.id && !ehDirecao(req.usuario)) {
                return res.status(403).json({ status: "error", message: "Acesso negado.", data: null });
            }
            const { rows: upd } = await pool.query(
                `UPDATE agendamentos_ocorrencias
                 SET status_individual = 'cancelada', motivo_individual = $1
                 WHERE id_ocorrencia = $2 RETURNING *`,
                [req.body?.motivo || "Cancelada pelo solicitante", occId]
            );
            return res.status(200).json({ status: "success", message: "Ocorrência cancelada.", data: upd[0] });
        } catch (error) {
            logger.error({ err: error }, "Erro ao cancelar ocorrência");
            return res.status(500).json({ status: "error", message: "Erro ao cancelar ocorrência.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // GET /calendario — ocorrências ativas no período
    //   params: sala_id (opcional), inicio (YYYY-MM-DD), fim (YYYY-MM-DD)
    //   somente status aprovada (e pendentes se direção quiser ver tudo via ?incluir_pendentes=1)
    // ───────────────────────────────────────────────────────────────
    router.get("/visao/calendario", async (req, res) => {
        const { sala_id, inicio, fim } = req.query;
        const incluirPendentes = req.query.incluir_pendentes === "1" && ehDirecao(req.usuario);
        if (!inicio || !fim) {
            return res.status(400).json({ status: "error", message: "inicio e fim são obrigatórios.", data: null });
        }
        const params = [inicio, fim];
        const filtros = [`ao.data_ocorrencia BETWEEN $1 AND $2`, `ao.status_individual = 'ativa'`];
        const statusValidos = incluirPendentes ? `'aprovada','pendente'` : `'aprovada'`;
        filtros.push(`a.status IN (${statusValidos})`);

        if (sala_id) {
            params.push(sala_id);
            filtros.push(`a.sala_id = $${params.length}`);
        }

        try {
            const { rows } = await pool.query(
                `SELECT ao.id_ocorrencia, ao.data_ocorrencia,
                        a.id_agendamento, a.sala_id, a.motivo, a.origem,
                        a.dia_inteiro, a.hora_inicio, a.hora_fim, a.status,
                        s.sala_nome, u.nome AS solicitante_nome,
                        d.nome AS disciplina_nome, t.nome_turma, prof.nome AS professor_nome
                 FROM agendamentos_ocorrencias ao
                 JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
                 JOIN salas s ON s.sala_id = a.sala_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN turmas_horarios th ON th.id_horario = a.turma_horario_id
                 LEFT JOIN turmas t ON t.id_turma = th.turma_id
                 LEFT JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
                 LEFT JOIN users prof ON prof.user_id = t.professor_user_id
                 WHERE ${filtros.join(" AND ")}
                 ORDER BY ao.data_ocorrencia, a.hora_inicio NULLS FIRST`,
                params
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            logger.error({ err: error }, "Erro ao buscar calendário");
            return res.status(500).json({ status: "error", message: "Erro ao buscar calendário.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // GET /visao/portaria — agenda de salas agendadas para a portaria
    //   Acessível para: direção/chefe (por nível) e servidores com
    //   funcionalidade `ver_agenda_portaria` concedida.
    //   Params: predio_id (opcional), inicio (YYYY-MM-DD), fim (YYYY-MM-DD)
    // ───────────────────────────────────────────────────────────────
    router.get("/visao/portaria", async (req, res) => {
        const usuario = req.usuario;
        const ehAutorizado =
            ehDirecao(usuario) ||
            ["chefe", "subchefe"].includes(usuario.permissao) ||
            (Array.isArray(usuario.funcionalidades) &&
                usuario.funcionalidades.includes("ver_agenda_portaria"));

        if (!ehAutorizado) {
            return res.status(403).json({
                status: "error",
                message: "Acesso negado.",
                data: null,
            });
        }

        const { inicio, fim, predio_id } = req.query;
        if (!inicio || !fim) {
            return res.status(400).json({
                status: "error",
                message: "Parâmetros 'inicio' e 'fim' são obrigatórios.",
                data: null,
            });
        }

        const params = [inicio, fim];
        let predioClause = "";
        if (predio_id) {
            params.push(predio_id);
            predioClause = ` AND s.predio_id = $${params.length}`;
        }

        try {
            const { rows } = await pool.query(
                `SELECT ao.data_ocorrencia, ao.id_ocorrencia,
                        a.id_agendamento, a.dia_inteiro, a.hora_inicio, a.hora_fim,
                        a.motivo, a.observacao, a.origem,
                        s.sala_id, s.sala_nome, s.sala_capacidade,
                        p.predio_id, p.predio AS predio_nome,
                        u.nome AS solicitante_nome, u.siape AS solicitante_siape,
                        d.nome AS disciplina_nome, t.nome_turma, prof.nome AS professor_nome
                 FROM agendamentos_ocorrencias ao
                 JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
                 JOIN salas s ON s.sala_id = a.sala_id
                 LEFT JOIN predios p ON p.predio_id = s.predio_id
                 JOIN users u ON u.user_id = a.solicitante_user_id
                 LEFT JOIN turmas_horarios th ON th.id_horario = a.turma_horario_id
                 LEFT JOIN turmas t ON t.id_turma = th.turma_id
                 LEFT JOIN disciplinas d ON d.id_disciplina = t.disciplina_id
                 LEFT JOIN users prof ON prof.user_id = t.professor_user_id
                 WHERE a.status = 'aprovada'
                   AND ao.status_individual = 'ativa'
                   AND ao.data_ocorrencia BETWEEN $1 AND $2
                   ${predioClause}
                 ORDER BY ao.data_ocorrencia, a.hora_inicio NULLS FIRST, s.sala_nome`,
                params
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            logger.error({ err: error }, "Erro ao buscar agenda da portaria");
            return res.status(500).json({ status: "error", message: "Erro ao buscar agenda.", data: null });
        }
    });

    // ───────────────────────────────────────────────────────────────
    // GET /salas/agendaveis — lista salas com is_agendavel=true
    // ───────────────────────────────────────────────────────────────
    router.get("/salas/agendaveis", async (_req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT s.sala_id, s.sala_nome, s.sala_descricao, s.sala_capacidade,
                        p.predio AS predio_nome, st.sala_tipo_nome
                 FROM salas s
                 LEFT JOIN predios p ON p.predio_id = s.predio_id
                 LEFT JOIN salas_tipo st ON st.sala_tipo_id = s.sala_tipo_id
                 WHERE s.is_agendavel = 1
                 ORDER BY s.sala_nome`
            );
            return res.status(200).json({ status: "success", message: "", data: rows });
        } catch (error) {
            logger.error({ err: error }, "Erro ao listar salas agendáveis");
            return res.status(500).json({ status: "error", message: "Erro ao listar salas.", data: null });
        }
    });

    return router;
};
