/**
 * Execução orçamentária — leitura dos dados importados da planilha do
 * financeiro (ver routes/importacao-financeiro.js).
 *
 * Esta rota RECALCULA o que na planilha eram abas de resumo/saldo. Duas
 * decisões de contagem, ambas herdadas de como o financeiro fecha os números:
 *
 *  1) Empenhos com tipo "Estimativo - X" (Almoxarifado, Bolsas, Diárias,
 *     Passagens, Transporte) são PROVISIONAMENTO: reservam recurso que depois
 *     é consumido e aparece de novo como requisição de almoxarifado ou viagem
 *     do SCDP. Somá-los junto duplicaria o gasto, então ficam de fora por
 *     padrão (?incluir_estimativos=1 traz de volta, para conferência).
 *
 *  2) O "aplicado" de uma subunidade é atribuído pela unidade de ENTREGA
 *     (quem recebe o material/serviço), com a pagadora como reserva — é assim
 *     que as abas Resumo distribuem o gasto.
 *
 * A fórmula foi validada contra a aba "Resumo 2026": Material de Consumo,
 * Equipamentos, Outros Serviços PJ/PF, Obras, Auxílio a Estudantes e Software
 * batem ao centavo; Diárias e Passagens vêm do SCDP e também conferem.
 *
 * RBAC: direção vê tudo; chefe/servidor vê apenas a própria subunidade
 * (mesma regra dos relatórios financeiros já existentes).
 *
 * Cada registro carrega `origem` ('importado' | 'manual'): o resumo soma os
 * dois, e as listagens devolvem o campo para a tela marcar o que foi lançado
 * na plataforma. Ver a migration 20260826000002.
 */
const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const { getNivelAcesso } = require("../middlewares/autorizar.js");

const router = express.Router();

// Capital = natureza 4.x (equipamentos, obras); o resto é custeio.
const SQL_CATEGORIA = `
    CASE WHEN cod_natureza LIKE '4%'
           OR tipo_despesa ~* '(equipamento|permanente|obras?\\M)'
         THEN 'capital' ELSE 'custeio' END`;

/**
 * Escopo por subunidade. Diferente do getEscopoFiltro genérico porque cada
 * tabela usa um nome de coluna diferente (empenhos → subunidade_entrega_id).
 * Devolve { clausula, params, restrito, subunidadeId }.
 */
function escopo(req, coluna, baseParams = []) {
    const nivel = getNivelAcesso(req.usuario);
    if (nivel === "super_admin" || nivel === "diretor") {
        return { clausula: "", params: baseParams, restrito: false, subunidadeId: null };
    }
    return {
        clausula: ` AND ${coluna} = $${baseParams.length + 1}`,
        params: [...baseParams, req.usuario.subunidade],
        restrito: true,
        subunidadeId: req.usuario.subunidade,
    };
}

/**
 * Sigla para exibir. O cadastro de subunidades quase não tem sigla preenchida,
 * mas a importação aprendeu a oficial de cada uma na aba "Subunidades CCR"
 * (subunidades_apelidos). Usamos o apelido mais curto como rótulo — sem mexer
 * no cadastro, que continua sendo responsabilidade do painel admin.
 */
const SQL_SUBUNIDADES = `
    SELECT s.subunidade_id, s.subunidade_nome,
           COALESCE(NULLIF(s.subunidade_sigla, ''), a.apelido) AS subunidade_sigla
      FROM subunidades s
      LEFT JOIN LATERAL (
          SELECT x.apelido FROM subunidades_apelidos x
           WHERE x.subunidade_id = s.subunidade_id
           ORDER BY length(x.apelido) ASC, x.apelido ASC LIMIT 1
      ) a ON TRUE`;

// Mesma ideia, para as listagens detalhadas
const JOIN_SIGLA = (coluna) => `
    LEFT JOIN (${SQL_SUBUNIDADES}) s ON s.subunidade_id = ${coluna}`;

function anoValido(v, padrao) {
    const n = parseInt(v, 10);
    return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : padrao;
}

// ───────────────────────────────────────────────────────────────
// GET /anos — anos que têm dado importado (alimenta o seletor)
// ───────────────────────────────────────────────────────────────
router.get("/anos", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ano, SUM(n) AS registros FROM (
                SELECT ano, COUNT(*) AS n FROM empenhos GROUP BY ano
                UNION ALL SELECT ano, COUNT(*) FROM almoxarifado_requisicoes GROUP BY ano
                UNION ALL SELECT ano, COUNT(*) FROM scdp_viagens GROUP BY ano
                UNION ALL SELECT ano, COUNT(*) FROM licitacoes_itens GROUP BY ano
                UNION ALL SELECT ano, COUNT(*) FROM transferencias_recurso GROUP BY ano
                UNION ALL SELECT ano, COUNT(*) FROM orcamento_dotacoes GROUP BY ano
            ) t GROUP BY ano ORDER BY ano DESC`);
        return res.status(200).json({
            status: "success", message: "",
            data: rows.map((r) => ({ ano: r.ano, registros: Number(r.registros) })),
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar anos da execução orçamentária");
        return res.status(500).json({ status: "error", message: "Erro ao listar anos.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /resumo?ano=&incluir_estimativos=
// Reconstrói as abas "Resumo YYYY" e "Saldos unidades" a partir dos fatos.
// ───────────────────────────────────────────────────────────────
router.get("/resumo", async (req, res) => {
    const ano = anoValido(req.query.ano, new Date().getFullYear());
    const incluirEstimativos = req.query.incluir_estimativos === "1";
    const e = escopo(req, "subunidade_id");

    // $1 = ano, $2 = incluir estimativos, [$3 = subunidade quando restrito]
    const base = [ano, incluirEstimativos];
    const filtroSub = e.restrito ? ` AND subunidade_id = $3` : "";
    const params = e.restrito ? [...base, e.subunidadeId] : base;

    // Composição do "aplicado" — conferida coluna a coluna contra a aba
    // "Resumo 2026" da planilha (as seis colunas de empenho batem ao centavo):
    //   · empenhos não estimativos      → uma coluna por tipo de despesa
    //   · requisições de almoxarifado   → coluna "Almoxarifado"
    //   · diárias/passagens do SCDP     → SÓ quando os empenhos do ano não
    //     registram essa natureza de verdade
    //
    // Essa última condição existe porque a origem muda de ano para ano: em 2026
    // as diárias só aparecem no empenho como "Estimativo - Diárias" (reserva), e
    // o gasto real está no SCDP; já em 2025 o empenho traz "Diárias - Civil" e
    // "Passagens" como natureza efetiva, e aí somar o SCDP contaria duas vezes.
    // O NOT EXISTS resolve isso pelo dado, sem depender do ano.
    // `liquidado` só existe para empenho (conceito de execução orçamentária);
    // requisição e viagem entram com zero.
    const CTE_FATOS = `
        WITH fatos AS (
            SELECT COALESCE(subunidade_entrega_id, subunidade_pagadora_id) AS subunidade_id,
                   COALESCE(NULLIF(tipo_despesa, ''), '(sem tipo)')        AS tipo,
                   ${SQL_CATEGORIA}                                         AS categoria,
                   COALESCE(valor_empenhado, 0)                             AS valor,
                   COALESCE(valor_liquidado, 0)                             AS liquidado,
                   data_cadastro                                            AS data
              FROM empenhos
             WHERE ano = $1 AND ($2::boolean OR estimativo = FALSE)
            UNION ALL
            -- Estorno é devolução ao estoque e requisição cancelada/recusada
            -- nunca virou gasto: ficam de fora do aplicado (continuam na
            -- listagem detalhada, para conferência).
            SELECT subunidade_id, 'Almoxarifado', 'custeio',
                   COALESCE(valor_total, 0), 0, data_lancamento
              FROM almoxarifado_requisicoes
             WHERE ano = $1
               AND COALESCE(tipo_movimento, '') NOT ILIKE 'Estorno%'
               AND COALESCE(situacao, '') NOT ILIKE 'Cancela%'
               AND COALESCE(situacao, '') NOT ILIKE 'Recusada%' 
            UNION ALL
            SELECT subunidade_id, 'Diárias - Civil', 'custeio',
                   COALESCE(valor_diarias, 0), 0, data_cadastro
              FROM scdp_viagens
             WHERE ano = $1 AND COALESCE(valor_diarias, 0) <> 0
               AND NOT EXISTS (SELECT 1 FROM empenhos x
                                WHERE x.ano = $1 AND x.estimativo = FALSE
                                  AND x.tipo_despesa = 'Diárias - Civil')
            UNION ALL
            SELECT subunidade_id, 'Passagens e Despesas com Locomoção', 'custeio',
                   COALESCE(valor_passagens_aereas, 0) + COALESCE(valor_passagens_rodoviarias, 0),
                   0, data_cadastro
              FROM scdp_viagens
             WHERE ano = $1
               AND COALESCE(valor_passagens_aereas, 0) + COALESCE(valor_passagens_rodoviarias, 0) <> 0
               AND NOT EXISTS (SELECT 1 FROM empenhos x
                                WHERE x.ano = $1 AND x.estimativo = FALSE
                                  AND x.tipo_despesa = 'Passagens e Despesas com Locomoção')
        ), fatos_escopo AS (SELECT * FROM fatos WHERE TRUE${filtroSub})`;

    try {
        const [porSubTipo, dotacoes, porTipo, serie, fornecedores, scdp, licit, subs] = await Promise.all([
            // Aplicado por subunidade × tipo de despesa
            pool.query(
                `${CTE_FATOS}
                 SELECT subunidade_id, tipo, categoria,
                        SUM(valor) AS total, SUM(liquidado) AS liquidado, COUNT(*) AS itens
                   FROM fatos_escopo GROUP BY subunidade_id, tipo, categoria`,
                params
            ),
            // Dotação por subunidade × categoria
            pool.query(
                `SELECT subunidade_id, categoria, SUM(valor) AS total
                   FROM orcamento_dotacoes
                  WHERE ano = $1${e.restrito ? " AND subunidade_id = $2" : ""}
                  GROUP BY subunidade_id, categoria`,
                e.restrito ? [ano, e.subunidadeId] : [ano]
            ),
            // Total por tipo de despesa. Agrupa só por tipo: a origem às vezes
            // marca a mesma natureza ora como custeio ora como capital (código
            // 4.x num "Material de Consumo"), e isso não pode virar duas colunas.
            // A categoria mostrada é a predominante em valor.
            pool.query(
                `${CTE_FATOS}
                 SELECT tipo,
                        (ARRAY_AGG(categoria ORDER BY t DESC))[1] AS categoria,
                        SUM(t) AS total, SUM(n) AS itens
                   FROM (SELECT tipo, categoria, SUM(valor) AS t, COUNT(*) AS n
                           FROM fatos_escopo GROUP BY tipo, categoria) g
                  GROUP BY tipo ORDER BY SUM(t) DESC`,
                params
            ),
            // Série mensal empenhado × liquidado
            pool.query(
                `${CTE_FATOS}
                 SELECT to_char(m.mes, 'YYYY-MM') AS mes,
                        COALESCE(SUM(f.valor), 0)     AS empenhado,
                        COALESCE(SUM(f.liquidado), 0) AS liquidado
                   FROM generate_series(make_date($1, 1, 1), make_date($1, 12, 1), INTERVAL '1 month') AS m(mes)
                   LEFT JOIN fatos_escopo f ON date_trunc('month', f.data) = m.mes
                  GROUP BY m.mes ORDER BY m.mes`,
                params
            ),
            // Maiores fornecedores (só empenhos — almoxarifado não tem fornecedor)
            pool.query(
                `SELECT fornecedor, SUM(COALESCE(valor_empenhado, 0)) AS total, COUNT(*) AS itens
                   FROM empenhos
                  WHERE ano = $1 AND ($2::boolean OR estimativo = FALSE) AND fornecedor IS NOT NULL
                    ${e.restrito ? "AND COALESCE(subunidade_entrega_id, subunidade_pagadora_id) = $3" : ""}
                  GROUP BY fornecedor ORDER BY total DESC LIMIT 12`,
                params
            ),
            // Diárias e passagens (SCDP)
            pool.query(
                `SELECT COUNT(*) AS viagens,
                        COALESCE(SUM(valor_diarias), 0) AS diarias,
                        COALESCE(SUM(COALESCE(valor_passagens_aereas, 0) + COALESCE(valor_passagens_rodoviarias, 0)), 0) AS passagens
                   FROM scdp_viagens WHERE ano = $1${e.restrito ? " AND subunidade_id = $2" : ""}`,
                e.restrito ? [ano, e.subunidadeId] : [ano]
            ),
            // Itens de licitação
            pool.query(
                `SELECT COUNT(*) AS itens, COALESCE(SUM(valor_total), 0) AS total
                   FROM licitacoes_itens WHERE ano = $1${e.restrito ? " AND subunidade_id = $2" : ""}`,
                e.restrito ? [ano, e.subunidadeId] : [ano]
            ),
            pool.query(SQL_SUBUNIDADES),
        ]);

        const nomeSub = new Map(
            subs.rows.map((s) => [s.subunidade_id, { nome: s.subunidade_nome, sigla: s.subunidade_sigla }])
        );

        // Monta a tabela por subunidade (pivô de tipo é feito no front)
        const linhas = new Map();
        const pegar = (id) => {
            const chave = id === null ? 0 : id;
            if (!linhas.has(chave)) {
                const s = id === null ? null : nomeSub.get(id);
                linhas.set(chave, {
                    subunidade_id: id,
                    sigla: s?.sigla || (id === null ? "—" : null),
                    nome: s?.nome || (id === null ? "Não atribuído" : `Subunidade ${id}`),
                    valores: {},
                    aplicado_custeio: 0, aplicado_capital: 0, total_aplicado: 0, liquidado: 0,
                    dotacao_custeio: 0, dotacao_capital: 0,
                });
            }
            return linhas.get(chave);
        };

        for (const r of porSubTipo.rows) {
            const l = pegar(r.subunidade_id);
            const total = Number(r.total) || 0;
            l.valores[r.tipo] = (l.valores[r.tipo] || 0) + total;
            l.total_aplicado += total;
            l.liquidado += Number(r.liquidado) || 0;
            if (r.categoria === "capital") l.aplicado_capital += total;
            else l.aplicado_custeio += total;
        }
        for (const d of dotacoes.rows) {
            const l = pegar(d.subunidade_id);
            const total = Number(d.total) || 0;
            if (d.categoria === "capital") l.dotacao_capital += total;
            else l.dotacao_custeio += total;
        }

        const porSubunidade = [...linhas.values()]
            .map((l) => ({
                ...l,
                saldo_custeio: l.dotacao_custeio - l.aplicado_custeio,
                saldo_capital: l.dotacao_capital - l.aplicado_capital,
                saldo_total: l.dotacao_custeio + l.dotacao_capital - l.total_aplicado,
            }))
            .sort((a, b) => b.total_aplicado - a.total_aplicado);

        const tipos = porTipo.rows.map((t) => ({
            tipo: t.tipo,
            categoria: t.categoria,
            total: Number(t.total) || 0,
            itens: Number(t.itens) || 0,
        }));

        const somar = (campo) => porSubunidade.reduce((s, l) => s + l[campo], 0);

        return res.status(200).json({
            status: "success",
            message: "",
            data: {
                ano,
                incluir_estimativos: incluirEstimativos,
                escopo_restrito: e.restrito,
                tipos,
                por_subunidade: porSubunidade,
                serie_mensal: serie.rows.map((s) => ({
                    mes: s.mes,
                    empenhado: Number(s.empenhado) || 0,
                    liquidado: Number(s.liquidado) || 0,
                })),
                top_fornecedores: fornecedores.rows.map((f) => ({
                    fornecedor: f.fornecedor,
                    total: Number(f.total) || 0,
                    itens: Number(f.itens) || 0,
                })),
                scdp: {
                    viagens: Number(scdp.rows[0]?.viagens) || 0,
                    diarias: Number(scdp.rows[0]?.diarias) || 0,
                    passagens: Number(scdp.rows[0]?.passagens) || 0,
                },
                licitacoes: {
                    itens: Number(licit.rows[0]?.itens) || 0,
                    total: Number(licit.rows[0]?.total) || 0,
                },
                totais: {
                    aplicado: somar("total_aplicado"),
                    aplicado_custeio: somar("aplicado_custeio"),
                    aplicado_capital: somar("aplicado_capital"),
                    liquidado: somar("liquidado"),
                    dotacao_custeio: somar("dotacao_custeio"),
                    dotacao_capital: somar("dotacao_capital"),
                    saldo_custeio: somar("saldo_custeio"),
                    saldo_capital: somar("saldo_capital"),
                    saldo_total: somar("saldo_total"),
                },
            },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro no resumo da execução orçamentária");
        return res.status(500).json({ status: "error", message: "Erro ao montar o resumo.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// Listagens detalhadas (uma por aba de origem), com filtros e busca
// ───────────────────────────────────────────────────────────────

const LISTAGENS = {
    empenhos: {
        tabela: "empenhos e",
        colunaSub: "COALESCE(e.subunidade_entrega_id, e.subunidade_pagadora_id)",
        ordem: "e.data_cadastro DESC NULLS LAST, e.id_empenho DESC",
        busca: ["e.resumo", "e.fornecedor", "e.num_sie", "e.num_siafi", "e.processo"],
        select: `e.id_empenho AS id, e.ano, e.data_cadastro AS data, e.num_sie, e.num_siafi,
                 e.especie, e.cod_natureza, e.tipo_despesa, e.estimativo, e.fornecedor,
                 e.resumo, e.valor_empenhado, e.valor_liquidado, e.processo,
                 e.subunidade_entrega_texto AS subunidade_texto, s.subunidade_sigla, e.origem`,
        join: JOIN_SIGLA("COALESCE(e.subunidade_entrega_id, e.subunidade_pagadora_id)"),
        filtros: { tipo: "e.tipo_despesa", especie: "e.especie" },
        valor: "e.valor_empenhado",
    },
    almoxarifado: {
        tabela: "almoxarifado_requisicoes e",
        colunaSub: "e.subunidade_id",
        ordem: "e.data_lancamento DESC NULLS LAST, e.id_requisicao DESC",
        busca: ["e.num_requisicao", "e.solicitante", "e.local_entrega", "e.observacao"],
        select: `e.id_requisicao AS id, e.ano, e.data_lancamento AS data, e.num_requisicao,
                 e.tipo_movimento, e.solicitante, e.usuario_sie, e.valor_total, e.local_entrega,
                 e.situacao, e.observacao, e.subunidade_texto, s.subunidade_sigla, e.origem`,
        join: JOIN_SIGLA("e.subunidade_id"),
        filtros: { tipo: "e.tipo_movimento" },
        valor: "e.valor_total",
    },
    scdp: {
        tabela: "scdp_viagens e",
        colunaSub: "e.subunidade_id",
        ordem: "e.data_cadastro DESC NULLS LAST, e.id_viagem DESC",
        busca: ["e.proposto", "e.pcdp", "e.solicitante", "e.fonte_recurso"],
        select: `e.id_viagem AS id, e.ano, e.data_cadastro AS data, e.pcdp, e.proposto,
                 e.solicitante, e.grupo_tipo, e.fonte_recurso, e.num_diarias, e.valor_diarias,
                 e.valor_passagens_aereas, e.valor_passagens_rodoviarias, e.periodo_viagem,
                 e.subunidade_texto, s.subunidade_sigla, e.origem`,
        join: JOIN_SIGLA("e.subunidade_id"),
        filtros: {},
        valor: "e.valor_diarias",
    },
    licitacoes: {
        tabela: "licitacoes_itens e",
        colunaSub: "e.subunidade_id",
        ordem: "e.data DESC NULLS LAST, e.id_item DESC",
        busca: ["e.descricao", "e.interessado", "e.cod_reduzido", "e.solicitacao_sie"],
        select: `e.id_item AS id, e.ano, e.data, e.tipo, e.interessado, e.elaborador_etp,
                 e.cod_reduzido, e.descricao, e.unidades, e.valor_unitario, e.valor_total,
                 e.dfd, e.etp, e.solicitacao_sie, e.subunidade_texto, s.subunidade_sigla, e.origem`,
        join: JOIN_SIGLA("e.subunidade_id"),
        filtros: { tipo: "e.tipo" },
        valor: "e.valor_total",
    },
    transferencias: {
        tabela: "transferencias_recurso e",
        colunaSub: "e.subunidade_id",
        ordem: "e.data DESC NULLS LAST, e.id_transferencia DESC",
        busca: ["e.observacao", "e.gestora_destino", "e.num_transferencia", "e.solicitante"],
        select: `e.id_transferencia AS id, e.ano, e.data, e.num_transferencia, e.solicitante,
                 e.gestora_destino, e.cod_natureza, e.tipo_despesa, e.valor,
                 e.contado_em_outra_guia, e.observacao, e.subunidade_texto, s.subunidade_sigla, e.origem`,
        join: JOIN_SIGLA("e.subunidade_id"),
        filtros: { tipo: "e.tipo_despesa" },
        valor: "e.valor",
    },
};

/**
 * Monta o WHERE de uma listagem: ano + escopo RBAC + filtros + busca.
 * Extraído para que a listagem e a agregação apliquem exatamente as mesmas
 * regras — sobretudo o recorte por subunidade, que é o que garante que um
 * chefe não veja o centro inteiro num agrupamento.
 */
function montarFiltro(req, nome, cfg) {
    const ano = anoValido(req.query.ano, new Date().getFullYear());
    const condicoes = ["e.ano = $1"];
    const params = [ano];
    const add = (sql, valor) => { params.push(valor); condicoes.push(sql.replace("$?", `$${params.length}`)); };

    // Escopo RBAC + filtro explícito de subunidade
    const nivel = getNivelAcesso(req.usuario);
    if (nivel !== "super_admin" && nivel !== "diretor") {
        add(`${cfg.colunaSub} = $?`, req.usuario.subunidade);
    } else if (req.query.subunidade_id) {
        const id = parseInt(req.query.subunidade_id, 10);
        if (Number.isInteger(id)) add(`${cfg.colunaSub} = $?`, id);
    }

    for (const [chave, coluna] of Object.entries(cfg.filtros)) {
        if (req.query[chave]) add(`${coluna} = $?`, String(req.query[chave]));
    }
    if (nome === "empenhos" && req.query.incluir_estimativos !== "1") {
        condicoes.push("e.estimativo = FALSE");
    }
    const busca = String(req.query.q || "").trim();
    if (busca) {
        params.push(`%${busca}%`);
        const i = params.length;
        condicoes.push(`(${cfg.busca.map((c) => `${c} ILIKE $${i}`).join(" OR ")})`);
    }

    return { where: `WHERE ${condicoes.join(" AND ")}`, params, ano };
}

for (const [nome, cfg] of Object.entries(LISTAGENS)) {
    router.get(`/${nome}`, async (req, res) => {
        const limite = Math.min(Math.max(parseInt(req.query.limit, 10) || 300, 1), 2000);
        const { where, params } = montarFiltro(req, nome, cfg);
        // "as maiores compras" precisa de ordenação por valor, não por data.
        // Sem isto o consumidor (inclusive o assistente de IA) apresenta as
        // mais recentes como se fossem as maiores.
        const ordem = req.query.ordenar === "valor"
            ? `${cfg.valor} DESC NULLS LAST`
            : cfg.ordem;
        try {
            const [lista, agregado] = await Promise.all([
                pool.query(
                    `SELECT ${cfg.select} FROM ${cfg.tabela} ${cfg.join} ${where}
                      ORDER BY ${ordem} LIMIT ${limite}`,
                    params
                ),
                pool.query(
                    `SELECT COUNT(*) AS total, COALESCE(SUM(${cfg.valor}), 0) AS soma
                       FROM ${cfg.tabela} ${where}`,
                    params
                ),
            ]);
            return res.status(200).json({
                status: "success",
                message: "",
                data: {
                    itens: lista.rows,
                    total: Number(agregado.rows[0]?.total) || 0,
                    soma: Number(agregado.rows[0]?.soma) || 0,
                    truncado: lista.rows.length >= limite,
                },
            });
        } catch (error) {
            logger.error({ err: error, listagem: nome }, "Erro ao listar execução orçamentária");
            return res.status(500).json({ status: "error", message: "Erro ao listar registros.", data: null });
        }
    });
}

// ───────────────────────────────────────────────────────────────
// GET /:fonte/agrupado?por=&ano=&...  — soma por pessoa, fornecedor, setor…
//
// "Quem mais recebeu diárias" e "qual fornecedor vendeu mais" NÃO se respondem
// ordenando a listagem: aquilo dá o maior registro isolado, e quem apareceu
// várias vezes some do topo. Aqui o banco agrupa e soma de verdade.
//
// `por` é resolvido por WHITELIST (AGRUPAMENTOS), nunca interpolado a partir da
// query — é a única defesa possível quando um trecho de SQL precisa ser dinâmico,
// ainda mais com um modelo de IA escolhendo o valor do outro lado.
// ───────────────────────────────────────────────────────────────

// Coluna a agrupar → { sql, rotulo }. O que não estiver aqui é recusado.
const AGRUPAMENTOS = {
    empenhos: {
        fornecedor: { sql: "e.fornecedor", rotulo: "Fornecedor" },
        tipo_despesa: { sql: "e.tipo_despesa", rotulo: "Tipo de despesa" },
        especie: { sql: "e.especie", rotulo: "Espécie" },
        natureza: { sql: "e.cod_natureza", rotulo: "Natureza" },
        subunidade: { sql: "COALESCE(s.subunidade_sigla, e.subunidade_entrega_texto)", rotulo: "Subunidade" },
    },
    almoxarifado: {
        solicitante: { sql: "e.solicitante", rotulo: "Solicitante" },
        tipo_movimento: { sql: "e.tipo_movimento", rotulo: "Movimento" },
        local_entrega: { sql: "e.local_entrega", rotulo: "Local de entrega" },
        subunidade: { sql: "COALESCE(s.subunidade_sigla, e.subunidade_texto)", rotulo: "Subunidade" },
    },
    scdp: {
        proposto: { sql: "e.proposto", rotulo: "Proposto" },
        solicitante: { sql: "e.solicitante", rotulo: "Solicitante" },
        fonte_recurso: { sql: "e.fonte_recurso", rotulo: "Fonte do recurso" },
        subunidade: { sql: "COALESCE(s.subunidade_sigla, e.subunidade_texto)", rotulo: "Subunidade" },
    },
    licitacoes: {
        tipo: { sql: "e.tipo", rotulo: "Tipo" },
        interessado: { sql: "e.interessado", rotulo: "Interessado" },
        elaborador_etp: { sql: "e.elaborador_etp", rotulo: "Elaborador ETP" },
        subunidade: { sql: "COALESCE(s.subunidade_sigla, e.subunidade_texto)", rotulo: "Subunidade" },
    },
    transferencias: {
        gestora_destino: { sql: "e.gestora_destino", rotulo: "Gestora destino" },
        tipo_despesa: { sql: "e.tipo_despesa", rotulo: "Natureza" },
        subunidade: { sql: "COALESCE(s.subunidade_sigla, e.subunidade_texto)", rotulo: "Subunidade" },
    },
};

// Métricas somadas em cada grupo. O SCDP tem duas que interessam separadas.
const METRICAS = {
    scdp: [
        { nome: "diarias", sql: "COALESCE(SUM(e.valor_diarias), 0)" },
        { nome: "passagens", sql: "COALESCE(SUM(COALESCE(e.valor_passagens_aereas,0) + COALESCE(e.valor_passagens_rodoviarias,0)), 0)" },
        { nome: "num_diarias", sql: "COALESCE(SUM(e.num_diarias), 0)" },
    ],
};

for (const [nome, cfg] of Object.entries(LISTAGENS)) {
    router.get(`/${nome}/agrupado`, async (req, res) => {
        const opcoes = AGRUPAMENTOS[nome] || {};
        const por = String(req.query.por || "");
        const grupo = Object.prototype.hasOwnProperty.call(opcoes, por) ? opcoes[por] : null;

        if (!grupo) {
            return res.status(400).json({
                status: "error",
                message: `Agrupamento inválido para ${nome}. Use um destes: ${Object.keys(opcoes).join(", ")}.`,
                data: { agrupamentos_validos: Object.keys(opcoes) },
            });
        }

        const limite = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
        const { where, params } = montarFiltro(req, nome, cfg);

        // Métrica principal: sempre presente, é por ela que se ordena
        const extras = (METRICAS[nome] || [])
            .map((m) => `${m.sql} AS ${m.nome}`)
            .join(", ");

        try {
            const { rows } = await pool.query(
                `SELECT ${grupo.sql} AS chave,
                        COUNT(*) AS quantidade,
                        COALESCE(SUM(${cfg.valor}), 0) AS total
                        ${extras ? `, ${extras}` : ""},
                        -- janelas após o GROUP BY: valem para TODOS os grupos,
                        -- não só os que o LIMIT devolve. Sem isto a "soma"
                        -- seria a dos exibidos e induziria a erro.
                        SUM(COALESCE(SUM(${cfg.valor}), 0)) OVER () AS soma_geral,
                        COUNT(*) OVER () AS grupos_no_total
                   FROM ${cfg.tabela} ${cfg.join} ${where}
                    AND ${grupo.sql} IS NOT NULL AND ${grupo.sql} <> ''
                  GROUP BY ${grupo.sql}
                  ORDER BY total DESC
                  LIMIT ${limite}`,
                params
            );

            const itens = rows.map((r) => {
                const item = {
                    [por]: r.chave,
                    quantidade: Number(r.quantidade) || 0,
                    total: Number(r.total) || 0,
                };
                for (const m of METRICAS[nome] || []) item[m.nome] = Number(r[m.nome]) || 0;
                return item;
            });

            return res.status(200).json({
                status: "success",
                message: "",
                data: {
                    fonte: nome,
                    por,
                    rotulo: grupo.rotulo,
                    itens,
                    // quantos grupos existem no total × quantos vieram
                    total: Number(rows[0]?.grupos_no_total) || 0,
                    exibidos: itens.length,
                    soma: Number(rows[0]?.soma_geral) || 0,
                    truncado: itens.length < (Number(rows[0]?.grupos_no_total) || 0),
                },
            });
        } catch (error) {
            logger.error({ err: error, listagem: nome, por }, "Erro ao agrupar execução orçamentária");
            return res.status(500).json({ status: "error", message: "Erro ao agrupar registros.", data: null });
        }
    });
}

// ───────────────────────────────────────────────────────────────
// GET /dotacoes?ano= — distribuição do orçamento por programa/ação
// ───────────────────────────────────────────────────────────────
router.get("/dotacoes", async (req, res) => {
    const ano = anoValido(req.query.ano, new Date().getFullYear());
    try {
        const { rows } = await pool.query(
            `SELECT d.id_dotacao, d.categoria, d.grupo, d.programa, d.percentual, d.valor,
                    d.subunidade_texto, s.subunidade_sigla, d.origem
               FROM orcamento_dotacoes d
               LEFT JOIN (${SQL_SUBUNIDADES}) s ON s.subunidade_id = d.subunidade_id
              WHERE d.ano = $1
              ORDER BY d.categoria, d.grupo NULLS LAST, d.valor DESC`,
            [ano]
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar dotações");
        return res.status(500).json({ status: "error", message: "Erro ao listar dotações.", data: null });
    }
});

module.exports = router;
