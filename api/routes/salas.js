const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { getNivelAcesso, autorizar } = require("../middlewares/autorizar.js");
const { expandirRecorrencia } = require("../lib/recorrencia.js");

const router = express.Router();

// Converte DATEONLY/timestamp (pg devolve Date) ou string ISO → "YYYY-MM-DD"
function toDateStr(v) {
    return typeof v === "string" ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);
}

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
                sa.agendamento_manual, sa.presta_servicos_externos, sa.created_by_user_id,
                p.predio, p.descricao AS predio_descricao, p.unidade_id,
                s.subunidade_nome, s.subunidade_sigla,
                st.sala_tipo_nome, cu.nome AS created_by_nome
            FROM salas sa
            LEFT JOIN predios p ON p.predio_id = sa.predio_id
            LEFT JOIN subunidades s ON s.subunidade_id = sa.subunidade_id
            LEFT JOIN salas_tipo st ON st.sala_tipo_id = sa.sala_tipo_id
            LEFT JOIN users cu ON cu.user_id = sa.created_by_user_id
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

// ───────────────────────────────────────────────────────────────
// GET /api/salas/disponiveis — salas agendáveis livres em um slot semanal
//   Query: dia_semana, hora_inicio, hora_fim, periodo_letivo_id (bounds),
//          [data_inicio, data_fim] (bloco modular, sobrepõe o período),
//          [vagas] (para ordenar por melhor encaixe), [predio_id]
//   Devolve só salas LIVRES no slot, cada uma com sala_capacidade, prédio e
//   `cabe` (capacidade >= vagas). Ordena: cabe primeiro, menor folga, nome.
// ───────────────────────────────────────────────────────────────
router.get("/disponiveis", async (req, res) => {
    const { dia_semana, hora_inicio, hora_fim, periodo_letivo_id, predio_id } = req.query;
    const data_inicio = req.query.data_inicio || null;
    const data_fim = req.query.data_fim || null;
    const vagas = req.query.vagas ? parseInt(req.query.vagas, 10) : null;

    const dia = parseInt(dia_semana, 10);
    if (Number.isNaN(dia) || dia < 0 || dia > 6) {
        return res.status(400).json({ status: "error", message: "Dia da semana inválido.", data: null });
    }
    if (!hora_inicio || !hora_fim || hora_inicio >= hora_fim) {
        return res.status(400).json({ status: "error", message: "Horário inválido.", data: null });
    }

    try {
        // Bounds: bloco modular, se vier; senão o período letivo
        let inicioBound = data_inicio;
        let fimBound = data_fim;
        if (!inicioBound || !fimBound) {
            if (!periodo_letivo_id) {
                return res.status(400).json({ status: "error", message: "Informe periodo_letivo_id ou data_inicio/data_fim.", data: null });
            }
            const pl = await pool.query("SELECT data_inicio, data_fim FROM periodos_letivos WHERE id_periodo = $1", [periodo_letivo_id]);
            if (pl.rows.length === 0) {
                return res.status(404).json({ status: "error", message: "Período letivo não encontrado.", data: null });
            }
            inicioBound = inicioBound || toDateStr(pl.rows[0].data_inicio);
            fimBound = fimBound || toDateStr(pl.rows[0].data_fim);
        }

        const datas = expandirRecorrencia({
            tipo: "semanal", data_inicio: inicioBound, data_fim_recorrencia: fimBound,
            dias_semana: String(dia), intervalo_semanas: 1,
        });
        if (datas.length === 0) {
            return res.status(200).json({ status: "success", message: "", data: [] });
        }

        // Salas ocupadas nesse conjunto de datas com sobreposição de horário
        const ocupadas = await pool.query(
            `SELECT DISTINCT a.sala_id
             FROM agendamentos_ocorrencias ao
             JOIN agendamentos a ON a.id_agendamento = ao.agendamento_id
             WHERE ao.status_individual = 'ativa'
               AND a.status IN ('pendente', 'aprovada')
               AND a.sala_id IS NOT NULL
               AND ao.data_ocorrencia = ANY($1::date[])
               AND (a.dia_inteiro OR (a.hora_inicio < $3 AND a.hora_fim > $2))`,
            [datas, hora_inicio, hora_fim]
        );
        const idsOcupadas = new Set(ocupadas.rows.map((r) => r.sala_id));

        // Salas agendáveis candidatas (opcionalmente de um prédio)
        const params = [];
        let filtroPredio = "";
        if (predio_id) { params.push(predio_id); filtroPredio = ` AND s.predio_id = $${params.length}`; }
        // Fora do ensalamento: auditórios (por tipo) e salas marcadas como
        // "somente agendamento manual" (flag) — agendadas pela direção sob
        // solicitação prévia (workflow de agendamento avulso).
        const salas = await pool.query(
            `SELECT s.sala_id, s.sala_nome, s.sala_capacidade, s.predio_id, p.predio AS predio_nome
             FROM salas s
             LEFT JOIN predios p ON p.predio_id = s.predio_id
             LEFT JOIN salas_tipo st ON st.sala_tipo_id = s.sala_tipo_id
             WHERE s.is_agendavel = 1
               AND COALESCE(s.agendamento_manual, 0) = 0
               AND COALESCE(st.sala_tipo_nome, '') NOT ILIKE 'auditório'${filtroPredio}`,
            params
        );

        const livres = salas.rows
            .filter((s) => !idsOcupadas.has(s.sala_id))
            .map((s) => {
                const cap = s.sala_capacidade;
                const cabe = vagas !== null && cap !== null ? cap >= vagas : null;
                const folga = vagas !== null && cap !== null ? cap - vagas : null;
                return { ...s, cabe, folga };
            })
            .sort((a, b) => {
                // Cabe (true) antes; sem dado de capacidade no meio; não cabe (false) por último
                const rank = (x) => (x.cabe === true ? 0 : x.cabe === false ? 2 : 1);
                if (rank(a) !== rank(b)) return rank(a) - rank(b);
                if (a.folga !== null && b.folga !== null) {
                    // Cabe: menor folga (melhor encaixe). Não cabe: maior capacidade (menos negativa) primeiro.
                    return a.cabe === true ? a.folga - b.folga : b.folga - a.folga;
                }
                return String(a.sala_nome).localeCompare(String(b.sala_nome), "pt-BR");
            });

        return res.status(200).json({ status: "success", message: "", data: livres });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar salas disponíveis:");
        return res.status(500).json({ status: "error", message: "Erro ao listar salas disponíveis.", data: null });
    }
});

// Identificação (sala_nome) é única (case/espaço-insensível). Em edição, ignora a própria sala.
async function nomeDuplicado(nome, exceptId = null) {
    const sql = `SELECT 1 FROM salas WHERE LOWER(TRIM(sala_nome)) = LOWER(TRIM($1))${exceptId ? " AND sala_id <> $2" : ""} LIMIT 1`;
    const { rows } = await pool.query(sql, exceptId ? [nome, exceptId] : [nome]);
    return rows.length > 0;
}

// Grava um evento no log de auditoria das salas (na mesma transação da mudança)
async function registrarHistorico(client, ev) {
    await client.query(
        `INSERT INTO salas_historico (sala_id, sala_nome, acao, user_id, detalhe) VALUES ($1, $2, $3, $4, $5)`,
        [ev.sala_id ?? null, ev.sala_nome ?? null, ev.acao, ev.user_id ?? null, ev.detalhe ? String(ev.detalhe).slice(0, 500) : null]
    );
}

// GET /api/salas/:id/historico — linha do tempo de auditoria da sala
router.get("/:id/historico", async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT h.id_historico, h.acao, h.detalhe, h.createdat, h.sala_nome, u.nome AS usuario_nome
             FROM salas_historico h LEFT JOIN users u ON u.user_id = h.user_id
             WHERE h.sala_id = $1 ORDER BY h.createdat DESC, h.id_historico DESC`,
            [req.params.id]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao buscar histórico da sala:");
        return res.status(500).json({ status: "error", message: "Erro ao buscar histórico.", data: null });
    }
});

// POST /api/salas — cadastra nova sala (chefe+ ou 'cadastrar_salas')
router.post("/", podeCriar, async (req, res) => {
    const { sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, agendamento_manual, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    const client = await pool.connect();
    try {
        if (await nomeDuplicado(sala_nome)) {
            return res.status(409).json({ status: "error", message: `Já existe uma sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO salas (sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, agendamento_manual, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura, created_by_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, parseCapacidade(sala_capacidade), predio_id,
             subunidade_id || null, is_agendavel ?? 0, sala_tipo_id || null, parseFlag(agendamento_manual) ?? 0, parseFlag(presta_servicos_externos),
             parseDimensao(sala_largura), parseDimensao(sala_comprimento), parseDimensao(sala_altura), req.usuario.id]
        );
        const sala = rows[0];
        await registrarHistorico(client, { sala_id: sala.sala_id, sala_nome: sala.sala_nome, acao: "cadastro", user_id: req.usuario.id, detalhe: `Cadastrada: "${sala.sala_nome}"` });
        await client.query("COMMIT");
        return res.status(201).json({ status: "success", message: "Sala cadastrada com sucesso.", data: sala });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).json({ status: "error", message: `Já existe uma sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        logger.error({ err: error }, "Erro ao cadastrar sala:");
        return res.status(500).json({ status: "error", message: "Erro ao cadastrar sala.", data: null });
    } finally {
        client.release();
    }
});

// PUT /api/salas/:id — atualiza sala (somente super_admin)
router.put("/:id", soSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { sala_nome, sala_descricao, sala_capacidade, predio_id, subunidade_id, is_agendavel, sala_tipo_id, agendamento_manual, presta_servicos_externos, sala_largura, sala_comprimento, sala_altura } = req.body;

    if (!sala_nome || !predio_id) {
        return res.status(400).json({
            status: "error",
            message: "Os campos Identificação da Sala e Prédio são obrigatórios.",
            data: null
        });
    }

    const client = await pool.connect();
    try {
        if (await nomeDuplicado(sala_nome, id)) {
            return res.status(409).json({ status: "error", message: `Já existe outra sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        const atual = await client.query("SELECT * FROM salas WHERE sala_id = $1", [id]);
        if (atual.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        const antes = atual.rows[0];

        await client.query("BEGIN");
        const { rows } = await client.query(
            `UPDATE salas SET sala_nome=$1, sala_descricao=$2, sala_capacidade=$3, subunidade_id=$4,
                 predio_id=$5, is_agendavel=$6, sala_tipo_id=$7, agendamento_manual=$8, presta_servicos_externos=$9,
                 sala_largura=$10, sala_comprimento=$11, sala_altura=$12
             WHERE sala_id=$13 RETURNING *`,
            [sala_nome.trim(), sala_descricao || null, parseCapacidade(sala_capacidade), subunidade_id || null,
             predio_id, is_agendavel ?? 0, sala_tipo_id || null, parseFlag(agendamento_manual) ?? 0, parseFlag(presta_servicos_externos),
             parseDimensao(sala_largura), parseDimensao(sala_comprimento), parseDimensao(sala_altura), id]
        );

        // Descreve as mudanças para a auditoria
        const mud = [];
        const cap = parseCapacidade(sala_capacidade);
        if ((antes.sala_nome || "") !== sala_nome.trim()) mud.push(`identificação: "${antes.sala_nome}" → "${sala_nome.trim()}"`);
        if ((antes.sala_descricao || "") !== (sala_descricao || "")) mud.push("descrição alterada");
        if (Number(antes.sala_capacidade ?? -1) !== Number(cap ?? -1)) mud.push(`capacidade: ${antes.sala_capacidade ?? "—"} → ${cap ?? "—"}`);
        if (String(antes.predio_id ?? "") !== String(predio_id ?? "")) mud.push("prédio alterado");
        if (String(antes.subunidade_id ?? "") !== String(subunidade_id ?? "")) mud.push("departamento alterado");
        if (String(antes.sala_tipo_id ?? "") !== String(sala_tipo_id ?? "")) mud.push("tipo alterado");
        const agNovo = Number(is_agendavel ?? 0) === 1 ? 1 : 0;
        if ((antes.is_agendavel ? 1 : 0) !== agNovo) mud.push(`agendável: ${antes.is_agendavel ? "sim" : "não"} → ${agNovo ? "sim" : "não"}`);
        const manNovo = (parseFlag(agendamento_manual) ?? 0) === 1 ? 1 : 0;
        if ((antes.agendamento_manual ? 1 : 0) !== manNovo) mud.push(`só agendamento manual: ${antes.agendamento_manual ? "sim" : "não"} → ${manNovo ? "sim" : "não"}`);
        const dimMudou = ["sala_largura", "sala_comprimento", "sala_altura"].some((k, i) => Number(antes[k] ?? -1) !== Number([parseDimensao(sala_largura), parseDimensao(sala_comprimento), parseDimensao(sala_altura)][i] ?? -1));
        if (dimMudou) mud.push("dimensões alteradas");

        await registrarHistorico(client, { sala_id: id, sala_nome: sala_nome.trim(), acao: "edicao", user_id: req.usuario.id, detalhe: mud.join("; ") || "sem alterações de campo" });
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Sala atualizada com sucesso.", data: rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).json({ status: "error", message: `Já existe outra sala com a identificação "${sala_nome.trim()}".`, data: null });
        }
        logger.error({ err: error }, "Erro ao atualizar sala:");
        return res.status(500).json({ status: "error", message: "Erro ao atualizar sala.", data: null });
    } finally {
        client.release();
    }
});

// DELETE /api/salas/:id — remove sala (somente super_admin)
router.delete("/:id", soSuperAdmin, async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        const atual = await client.query("SELECT sala_id, sala_nome FROM salas WHERE sala_id = $1", [id]);
        if (atual.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Sala não encontrada.", data: null });
        }
        const antes = atual.rows[0];
        await client.query("BEGIN");
        // Registra a exclusão ANTES do DELETE (o snapshot de sala_nome sobrevive)
        await registrarHistorico(client, { sala_id: id, sala_nome: antes.sala_nome, acao: "exclusao", user_id: req.usuario.id, detalhe: `Excluída: "${antes.sala_nome}"` });
        await client.query("DELETE FROM salas WHERE sala_id = $1", [id]);
        await client.query("COMMIT");
        return res.status(200).json({ status: "success", message: "Sala excluída com sucesso.", data: null });
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ err: error }, "Erro ao excluir sala:");
        return res.status(500).json({ status: "error", message: "Erro ao excluir sala.", data: null });
    } finally {
        client.release();
    }
});

module.exports = router;
