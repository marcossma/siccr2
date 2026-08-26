/**
 * Importação da planilha do setor financeiro ("Transparência NOr_CCR.xlsx").
 *
 * O front lê o arquivo inteiro com SheetJS e manda TODAS as abas cruas (AoA).
 * Aqui classificamos cada aba, extraímos os fatos (lib/planilha-financeiro.js),
 * resolvemos as subunidades e gravamos.
 *
 * Gravação por BLOCO: cada aba é um bloco identificado por `origem_aba` e a
 * importação SUBSTITUI o bloco inteiro (DELETE + INSERT), cada um na sua
 * própria transação — sucesso parcial, resultado por bloco. Ver o comentário
 * de idempotência na migration 20260826000001.
 */
const express = require("express");
const pool = require("../config/database.js");
const logger = require("../lib/logger.js");
const P = require("../lib/planilha-financeiro.js");

const router = express.Router();

const MAX_LINHAS_TOTAL = 60000; // a planilha inteira tem ~14 mil linhas úteis

// Tabela de destino e colunas por tipo de aba
const DESTINO = {
    empenhos: {
        tabela: "empenhos",
        colunas: [
            "ano", "data_cadastro", "num_sie", "num_siafi", "especie", "cod_natureza",
            "tipo_despesa", "estimativo", "fornecedor", "subunidade_pagadora_id",
            "subunidade_pagadora_texto", "subunidade_entrega_id", "subunidade_entrega_texto",
            "resumo", "valor_empenhado", "valor_liquidado", "processo", "observacao", "origem_aba",
        ],
    },
    almoxarifado: {
        tabela: "almoxarifado_requisicoes",
        colunas: [
            "ano", "data_lancamento", "num_requisicao", "tipo_movimento", "subunidade_id",
            "subunidade_texto", "solicitante", "usuario_sie", "valor_total", "local_entrega",
            "situacao", "observacao", "tramitacao", "origem_aba",
        ],
    },
    scdp: {
        tabela: "scdp_viagens",
        colunas: [
            "ano", "data_cadastro", "pcdp", "solicitante", "grupo_tipo", "cpf", "proposto",
            "subunidade_id", "subunidade_texto", "fonte_recurso", "num_diarias", "valor_diarias",
            "valor_passagens_aereas", "valor_passagens_rodoviarias", "periodo_viagem", "origem_aba",
        ],
    },
    licitacoes: {
        tabela: "licitacoes_itens",
        colunas: [
            "ano", "data", "tipo", "subunidade_id", "subunidade_texto", "interessado",
            "elaborador_etp", "usuario_sie", "cod_reduzido", "descricao", "unidades",
            "valor_unitario", "valor_total", "dfd", "etp", "solicitacao_sie", "origem_aba",
        ],
    },
    transferencias: {
        tabela: "transferencias_recurso",
        colunas: [
            "ano", "data", "num_transferencia", "subunidade_id", "subunidade_texto", "solicitante",
            "usuario_sie", "gestora_destino", "cod_natureza", "tipo_despesa", "valor",
            "contado_em_outra_guia", "observacao", "origem_aba",
        ],
    },
    orcamento: {
        tabela: "orcamento_dotacoes",
        colunas: ["ano", "categoria", "grupo", "programa", "percentual", "valor", "subunidade_id", "subunidade_texto", "origem_aba"],
    },
    naturezas: {
        tabela: "naturezas_despesa",
        colunas: ["codigo", "nome"],
    },
    // Tratada à parte no POST: vira linha em subunidades_apelidos, não um fato.
    apelidos: { tabela: "subunidades_apelidos", colunas: ["apelido", "subunidade_id"] },
};

// ───────────────────────────────────────────────────────────────
// Resolução de subunidade
// A planilha referencia a subunidade de 4 jeitos (código estruturado, sigla,
// nome por extenso, "UFSM - XXX"), e as siglas divergem entre abas
// (Licitações usa DZ, Resumo usa DZOT). Tentamos nesta ordem:
// apelido cadastrado → código → sigla → nome.
// ───────────────────────────────────────────────────────────────

// "UFSM - DCGA" → "DCGA"; mantém o resto intacto
function chaveTexto(t) {
    const n = P.norm(t);
    if (!n) return null;
    return n.replace(/^UFSM\s+/, "").trim() || null;
}

async function carregarResolvedor(client) {
    const exec = (sql) => (client ? client.query(sql) : pool.query(sql));
    const { rows } = await exec(
        "SELECT subunidade_id, subunidade_nome, subunidade_sigla, subunidade_codigo FROM subunidades"
    );
    const { rows: apelidos } = await exec("SELECT apelido, subunidade_id FROM subunidades_apelidos");

    const porCodigo = new Map();
    const porSigla = new Map();
    const porNome = new Map();
    for (const s of rows) {
        const cod = P.codigoCurto(s.subunidade_codigo);
        if (cod && !porCodigo.has(cod)) porCodigo.set(cod, s.subunidade_id);
        const sigla = P.norm(s.subunidade_sigla);
        if (sigla && !porSigla.has(sigla)) porSigla.set(sigla, s.subunidade_id);
        const nome = P.norm(s.subunidade_nome);
        if (nome && !porNome.has(nome)) porNome.set(nome, s.subunidade_id);
    }
    const porApelido = new Map(apelidos.map((a) => [a.apelido, a.subunidade_id]));

    // Apelidos aprendidos durante ESTA importação (da aba "Subunidades CCR")
    // já valem para os blocos seguintes, antes mesmo de irem para o banco.
    const adicionarApelido = (chave, subunidadeId) => {
        if (chave && subunidadeId) porApelido.set(chave, subunidadeId);
    };

    function resolver(texto, codigo) {
        if (codigo) {
            const id = porCodigo.get(codigo);
            if (id) return id;
        }
        const bruto = P.norm(texto);
        const limpo = chaveTexto(texto);
        for (const chave of [bruto, limpo]) {
            if (!chave) continue;
            const id = porApelido.get(chave) || porSigla.get(chave) || porNome.get(chave) || porCodigo.get(chave);
            if (id) return id;
        }
        return null;
    }

    return { resolver, adicionarApelido, subunidades: rows };
}

// Campo de texto que o relatório usa para atribuir o gasto à subunidade
const CAMPO_ATRIBUICAO = {
    empenhos: "entrega_texto",
    almoxarifado: "subunidade_texto",
    scdp: "subunidade_texto",
    licitacoes: "subunidade_texto",
    transferencias: "subunidade_texto",
    orcamento: "subunidade_texto",
};

/** Preenche os *_id de subunidade nos itens e devolve os textos não resolvidos. */
function resolverBloco(bloco, resolver) {
    const naoResolvidos = new Map(); // chave normalizada → { texto, ocorrencias }
    const anotar = (texto) => {
        const chave = chaveTexto(texto);
        if (!chave) return;
        const atual = naoResolvidos.get(chave) || { chave, texto: String(texto).trim(), ocorrencias: 0 };
        atual.ocorrencias++;
        naoResolvidos.set(chave, atual);
    };

    const campo = CAMPO_ATRIBUICAO[bloco.tipo];
    for (const item of bloco.itens) {
        if (bloco.tipo === "empenhos") {
            item.subunidade_entrega_id = resolver(item.entrega_texto, item.entrega_codigo);
            item.subunidade_pagadora_id = resolver(item.pagadora_texto, null);
            item.subunidade_entrega_texto = item.entrega_texto;
            item.subunidade_pagadora_texto = item.pagadora_texto;
            if (!item.subunidade_entrega_id && item.entrega_texto) anotar(item.entrega_texto);
        } else if (campo) {
            item.subunidade_id = resolver(item[campo], item.subunidade_codigo);
            if (!item.subunidade_id && item[campo]) anotar(item[campo]);
        }
    }

    return [...naoResolvidos.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/** Extrai + resolve todos os blocos enviados. */
async function processar(blocosBrutos, anoOrcamento, resolver, adicionarApelido) {
    const blocos = blocosBrutos.map((b) => P.extrairAba(b.aba, b.aoa, anoOrcamento));
    P.detectarSobreposicao(blocos);

    // A aba "Subunidades CCR" é processada ANTES das demais: ela ensina os
    // apelidos (sigla e nome oficial de cada código estruturado) que as outras
    // abas usam. Sem isso, "DTCA" e "SID/CCR" não casariam com nada, porque o
    // cadastro de subunidades quase não tem sigla preenchida.
    const apelidosDerivados = [];
    const blocoApelidos = blocos.find((b) => b.tipo === "apelidos");
    if (blocoApelidos) {
        let resolvidas = 0;
        for (const linha of blocoApelidos.itens) {
            const id = resolver(linha.nome, linha.codigo);
            if (!id) continue;
            resolvidas++;
            for (const bruto of [linha.sigla, linha.nome]) {
                const chave = chaveTexto(bruto);
                if (!chave) continue;
                adicionarApelido(chave, id);
                apelidosDerivados.push({ apelido: chave, subunidade_id: id, origem: bruto });
            }
        }
        blocoApelidos.resolvidas = resolvidas;
        blocoApelidos.apelidos = apelidosDerivados.length;
    }

    const naoResolvidosGlobal = new Map();
    for (const bloco of blocos) {
        if (!bloco.tipo || bloco.tipo === "apelidos" || bloco.itens.length === 0) continue;
        for (const nr of resolverBloco(bloco, resolver)) {
            const atual = naoResolvidosGlobal.get(nr.chave) || { ...nr, ocorrencias: 0, abas: new Set() };
            atual.ocorrencias += nr.ocorrencias;
            atual.abas.add(bloco.aba);
            naoResolvidosGlobal.set(nr.chave, atual);
        }
    }

    const naoResolvidos = [...naoResolvidosGlobal.values()]
        .map((n) => ({ chave: n.chave, texto: n.texto, ocorrencias: n.ocorrencias, abas: [...n.abas] }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);

    return { blocos, naoResolvidos, apelidosDerivados };
}

function validarEntrada(req, res) {
    const blocos = req.body?.blocos;
    if (!Array.isArray(blocos) || blocos.length === 0) {
        res.status(400).json({ status: "error", message: "Envie um array 'blocos' com ao menos uma aba.", data: null });
        return null;
    }
    const total = blocos.reduce((s, b) => s + (Array.isArray(b.aoa) ? b.aoa.length : 0), 0);
    if (total > MAX_LINHAS_TOTAL) {
        res.status(400).json({
            status: "error",
            message: `Máximo de ${MAX_LINHAS_TOTAL} linhas por importação (recebidas ${total}).`,
            data: null,
        });
        return null;
    }
    return blocos;
}

// ───────────────────────────────────────────────────────────────
// POST /preview — classifica, extrai e resolve, sem gravar
// ───────────────────────────────────────────────────────────────
router.post("/preview", async (req, res) => {
    const blocosBrutos = validarEntrada(req, res);
    if (!blocosBrutos) return;
    try {
        const { resolver, adicionarApelido, subunidades } = await carregarResolvedor(null);
        const { blocos, naoResolvidos } = await processar(
            blocosBrutos, req.body?.ano_orcamento, resolver, adicionarApelido
        );

        // Última importação de cada aba, p/ o usuário saber o que vai substituir
        const { rows: ultimas } = await pool.query(
            `SELECT DISTINCT ON (origem_aba) origem_aba, createdat, linhas_gravadas
               FROM importacoes_financeiro ORDER BY origem_aba, createdat DESC`
        );
        const ultimaPorAba = new Map(ultimas.map((u) => [u.origem_aba, u]));

        const somaValor = (itens, campo) => itens.reduce((s, i) => s + (Number(i[campo]) || 0), 0);
        const CAMPO_VALOR = {
            empenhos: "valor_empenhado", almoxarifado: "valor_total", scdp: "valor_diarias",
            licitacoes: "valor_total", transferencias: "valor", orcamento: "valor",
        };

        const resumo = blocos.map((b) => {
            const anterior = ultimaPorAba.get(b.aba);
            return {
                aba: b.aba,
                tipo: b.tipo,
                ano: b.ano,
                itens: b.itens.length,
                ignoradas: b.ignoradas || 0,
                motivo: b.motivo || null,
                recomendado: Boolean(b.recomendado),
                contido_em: b.contido_em || null,
                valor_total: b.tipo && CAMPO_VALOR[b.tipo] ? somaValor(b.itens, CAMPO_VALOR[b.tipo]) : null,
                // Na aba de apelidos, "sem subunidade" = linhas cujo código não
                // bate com nenhuma subunidade cadastrada (curso/PPG inexistente aqui)
                // "naturezas" é catálogo puro, não tem subunidade
                sem_subunidade: b.tipo === "naturezas"
                    ? 0
                    : b.tipo === "apelidos"
                        ? b.itens.length - (b.resolvidas || 0)
                        : b.itens.filter((i) =>
                            b.tipo === "empenhos" ? !i.subunidade_entrega_id : !i.subunidade_id
                        ).length,
                apelidos: b.tipo === "apelidos" ? (b.apelidos || 0) : null,
                ja_importada: anterior
                    ? { em: anterior.createdat, linhas: anterior.linhas_gravadas }
                    : null,
                totais: b.totais || null,
            };
        });

        const importaveis = resumo.filter((r) => r.tipo && r.itens > 0);
        return res.status(200).json({
            status: "success",
            message: "",
            data: {
                blocos: resumo,
                nao_resolvidos: naoResolvidos.slice(0, 60),
                subunidades: subunidades
                    .map((s) => ({
                        subunidade_id: s.subunidade_id,
                        nome: s.subunidade_nome,
                        sigla: s.subunidade_sigla,
                    }))
                    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR")),
                totais: {
                    abas: resumo.length,
                    importaveis: importaveis.length,
                    recomendadas: resumo.filter((r) => r.recomendado).length,
                    itens: importaveis.reduce((s, r) => s + r.itens, 0),
                },
            },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro no preview da importação financeira");
        return res.status(500).json({ status: "error", message: "Erro ao processar a planilha.", data: null });
    }
});

// Monta INSERT multi-linha em lotes (1200+ linhas numa aba só)
async function inserirEmLote(client, tabela, colunas, itens, tamanhoLote = 200) {
    let gravadas = 0;
    for (let ini = 0; ini < itens.length; ini += tamanhoLote) {
        const fatia = itens.slice(ini, ini + tamanhoLote);
        const params = [];
        const grupos = fatia.map((item, li) => {
            const placeholders = colunas.map((_, ci) => `$${li * colunas.length + ci + 1}`);
            for (const c of colunas) params.push(item[c] === undefined ? null : item[c]);
            return `(${placeholders.join(", ")})`;
        });
        const r = await client.query(
            `INSERT INTO ${tabela} (${colunas.join(", ")}) VALUES ${grupos.join(", ")}`,
            params
        );
        gravadas += r.rowCount;
    }
    return gravadas;
}

// ───────────────────────────────────────────────────────────────
// POST / — grava os blocos escolhidos (substitui cada aba por completo)
//   body: { blocos:[{aba,aoa}], abas_selecionadas:[...], ano_orcamento,
//           apelidos: { "<chave normalizada>": subunidade_id } }
// ───────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const blocosBrutos = validarEntrada(req, res);
    if (!blocosBrutos) return;

    const selecionadas = Array.isArray(req.body?.abas_selecionadas)
        ? new Set(req.body.abas_selecionadas)
        : null;
    const apelidos = req.body?.apelidos && typeof req.body.apelidos === "object" ? req.body.apelidos : {};

    try {
        // 1) Grava o de-para de subunidade informado pelo usuário, para que a
        //    resolução desta importação (e das próximas) já o use.
        const entradasApelido = Object.entries(apelidos).filter(([k, v]) => k && Number(v) > 0);
        if (entradasApelido.length > 0) {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                for (const [apelido, subunidadeId] of entradasApelido) {
                    await client.query(
                        `INSERT INTO subunidades_apelidos (apelido, subunidade_id) VALUES ($1, $2)
                         ON CONFLICT (apelido) DO UPDATE SET subunidade_id = EXCLUDED.subunidade_id`,
                        [String(apelido).slice(0, 255), Number(subunidadeId)]
                    );
                }
                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        }

        // 2) Extrai e resolve já com os apelidos novos aplicados
        const { resolver, adicionarApelido } = await carregarResolvedor(null);
        const { blocos, apelidosDerivados } = await processar(
            blocosBrutos, req.body?.ano_orcamento, resolver, adicionarApelido
        );

        // 3) Grava bloco a bloco, cada um na sua transação
        const resultados = [];
        for (const bloco of blocos) {
            if (!bloco.tipo || bloco.itens.length === 0) continue;
            if (selecionadas && !selecionadas.has(bloco.aba)) continue;

            const destino = DESTINO[bloco.tipo];
            if (!destino) continue;

            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                let gravadas;
                if (bloco.tipo === "apelidos") {
                    // Grava o de-para derivado da aba "Subunidades CCR".
                    // Não sobrescreve mapeamento feito à mão: o que o usuário
                    // ajustou no de-para da tela tem precedência (foi gravado
                    // no passo 1 e a planilha não deve desfazer).
                    gravadas = 0;
                    for (const a of apelidosDerivados) {
                        if (apelidos[a.apelido] !== undefined) continue;
                        const r = await client.query(
                            `INSERT INTO subunidades_apelidos (apelido, subunidade_id) VALUES ($1, $2)
                             ON CONFLICT (apelido) DO UPDATE SET subunidade_id = EXCLUDED.subunidade_id`,
                            [a.apelido.slice(0, 255), a.subunidade_id]
                        );
                        gravadas += r.rowCount;
                    }
                } else if (bloco.tipo === "naturezas") {
                    // Catálogo: aditivo, não substitui (a chave é (codigo, nome))
                    gravadas = 0;
                    for (const n of bloco.itens) {
                        const r = await client.query(
                            `INSERT INTO naturezas_despesa (codigo, nome) VALUES ($1, $2)
                             ON CONFLICT ON CONSTRAINT naturezas_despesa_codigo_nome_unico DO NOTHING`,
                            [n.codigo, n.nome]
                        );
                        gravadas += r.rowCount;
                    }
                } else {
                    // Fatos: substitui o bloco inteiro
                    await client.query(`DELETE FROM ${destino.tabela} WHERE origem_aba = $1`, [bloco.aba]);
                    gravadas = await inserirEmLote(client, destino.tabela, destino.colunas, bloco.itens);
                }

                await client.query(
                    `INSERT INTO importacoes_financeiro
                       (origem_aba, tipo, ano, linhas_gravadas, linhas_ignoradas, user_id)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [bloco.aba, bloco.tipo, bloco.ano, gravadas, bloco.ignoradas || 0, req.usuario?.id || null]
                );

                await client.query("COMMIT");
                resultados.push({ aba: bloco.aba, tipo: bloco.tipo, ano: bloco.ano, gravadas, ok: true });
            } catch (error) {
                await client.query("ROLLBACK");
                logger.error({ err: error, aba: bloco.aba }, "Falha ao gravar bloco financeiro");
                resultados.push({ aba: bloco.aba, tipo: bloco.tipo, ok: false, erro: error.message });
            } finally {
                client.release();
            }
        }

        const ok = resultados.filter((r) => r.ok);
        const falhas = resultados.filter((r) => !r.ok);
        const totalLinhas = ok.reduce((s, r) => s + r.gravadas, 0);

        return res.status(falhas.length && !ok.length ? 500 : 200).json({
            status: falhas.length && !ok.length ? "error" : "success",
            message:
                `Importação concluída: ${ok.length} aba(s), ${totalLinhas} linha(s).` +
                (falhas.length ? ` ${falhas.length} aba(s) falharam.` : ""),
            data: { resultados, total_linhas: totalLinhas },
        });
    } catch (error) {
        logger.error({ err: error }, "Erro ao importar planilha financeira");
        return res.status(500).json({ status: "error", message: "Erro ao gravar a importação.", data: null });
    }
});

// ───────────────────────────────────────────────────────────────
// GET /historico — o que já foi importado, por aba
// ───────────────────────────────────────────────────────────────
router.get("/historico", async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT i.origem_aba, i.tipo, i.ano, i.linhas_gravadas, i.linhas_ignoradas,
                    i.createdat, u.nome AS usuario
               FROM importacoes_financeiro i
               LEFT JOIN users u ON u.user_id = i.user_id
              ORDER BY i.createdat DESC
              LIMIT 100`
        );
        return res.status(200).json({ status: "success", message: "", data: rows });
    } catch (error) {
        logger.error({ err: error }, "Erro ao listar histórico de importações");
        return res.status(500).json({ status: "error", message: "Erro ao listar histórico.", data: null });
    }
});

module.exports = router;
