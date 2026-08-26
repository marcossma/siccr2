"use strict";

/**
 * Execução orçamentária — dados importados da planilha do setor financeiro
 * ("Transparência NOr_CCR.xlsx").
 *
 * Modelagem: as abas de FATO (uma linha = um evento) viram tabelas; as abas de
 * RESUMO/SALDO da planilha são pivôs e NÃO são importadas — o sistema recalcula
 * a partir dos fatos (rota /api/execucao-orcamentaria/resumo).
 *
 * Idempotência: cada importação SUBSTITUI o bloco inteiro identificado por
 * origem_aba (ex.: "Empenhos 2026"). A planilha é reexportada por completo a
 * cada atualização e as linhas não têm chave estável (o mesmo nº SIE aparece em
 * várias naturezas), então substituir o bloco é mais honesto que tentar casar
 * linha a linha.
 *
 * Naturezas/tipos ficam como TEXTO nos fatos (sem FK): o código da natureza é
 * ambíguo na origem (3.3.9.0.39.00 = PJ e PF), e é o texto do "Tipo de Despesa"
 * que distingue. naturezas_despesa é só catálogo de apoio.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const S = Sequelize;
        const agora = { type: S.DATE, allowNull: false, defaultValue: S.literal("CURRENT_TIMESTAMP") };
        const pk = () => ({ type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false });
        const fkSub = () => ({
            type: S.INTEGER, allowNull: true,
            references: { model: "subunidades", key: "subunidade_id" },
            onUpdate: "CASCADE", onDelete: "SET NULL",
        });

        // ── Catálogo: código da natureza da despesa ↔ nome (aba "Página43") ──
        await queryInterface.createTable("naturezas_despesa", {
            id_natureza: pk(),
            codigo: { type: S.STRING(20), allowNull: false },
            nome: { type: S.STRING(120), allowNull: false },
            createdat: agora,
        });
        await queryInterface.addConstraint("naturezas_despesa", {
            fields: ["codigo", "nome"], type: "unique", name: "naturezas_despesa_codigo_nome_unico",
        });

        // ── De-para de apelidos de subunidade ────────────────────────────────
        // A planilha referencia subunidade de 4 jeitos (código estruturado,
        // sigla, nome por extenso, "UFSM - XXX") e as siglas divergem entre
        // abas (DZ × DZOT). Aqui guardamos o mapeamento resolvido pelo usuário.
        await queryInterface.createTable("subunidades_apelidos", {
            id_apelido: pk(),
            apelido: { type: S.STRING(255), allowNull: false, unique: true }, // já normalizado
            subunidade_id: {
                type: S.INTEGER, allowNull: false,
                references: { model: "subunidades", key: "subunidade_id" },
                onUpdate: "CASCADE", onDelete: "CASCADE",
            },
            createdat: agora,
        });

        // ── Dotação orçamentária por programa/ação (aba "Orçamento") ─────────
        await queryInterface.createTable("orcamento_dotacoes", {
            id_dotacao: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            // A aba "Orçamento" traz DUAS tabelas: distribuição do custeio por
            // programa/ação e a dos recursos permanentes por departamento.
            categoria: { type: S.STRING(10), allowNull: false, defaultValue: "custeio" }, // custeio|capital
            grupo: { type: S.STRING(255), allowNull: true },     // "1. DIREÇÃO & INVESTIMENTOS - CCR (26,54%)"
            programa: { type: S.STRING(255), allowNull: false }, // "Espaço Físico"
            percentual: { type: S.DECIMAL(8, 4), allowNull: true },
            valor: { type: S.DECIMAL(14, 2), allowNull: true },
            subunidade_id: fkSub(),
            subunidade_texto: { type: S.STRING(255), allowNull: true },
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        await queryInterface.addIndex("orcamento_dotacoes", ["ano"]);
        await queryInterface.addIndex("orcamento_dotacoes", ["origem_aba"]);

        // ── Empenhos / dispensas (abas "Empenhos YYYY", "SIE YYYY", …) ───────
        await queryInterface.createTable("empenhos", {
            id_empenho: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            data_cadastro: { type: S.DATEONLY, allowNull: true },
            num_sie: { type: S.STRING(30), allowNull: true },      // "000038/2026"
            num_siafi: { type: S.STRING(30), allowNull: true },    // "2025NE000005"
            especie: { type: S.STRING(30), allowNull: true },      // Empenho | Dispensa | Transferência
            cod_natureza: { type: S.STRING(20), allowNull: true }, // "3.3.9.0.30.00"
            tipo_despesa: { type: S.STRING(120), allowNull: true },// "Material de Consumo"
            estimativo: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
            fornecedor: { type: S.STRING(255), allowNull: true },
            subunidade_pagadora_id: fkSub(),
            subunidade_pagadora_texto: { type: S.STRING(255), allowNull: true },
            subunidade_entrega_id: fkSub(),
            subunidade_entrega_texto: { type: S.STRING(255), allowNull: true },
            resumo: { type: S.TEXT, allowNull: true },
            valor_empenhado: { type: S.DECIMAL(14, 2), allowNull: true },
            valor_liquidado: { type: S.DECIMAL(14, 2), allowNull: true },
            // Na prática vem texto livre: às vezes três processos na mesma célula
            processo: { type: S.STRING(255), allowNull: true },
            observacao: { type: S.TEXT, allowNull: true },
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        for (const c of ["ano", "origem_aba", "subunidade_entrega_id", "tipo_despesa", "num_sie"]) {
            await queryInterface.addIndex("empenhos", [c]);
        }

        // ── Requisições de almoxarifado (abas "Almoxarifado YYYY") ───────────
        await queryInterface.createTable("almoxarifado_requisicoes", {
            id_requisicao: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            data_lancamento: { type: S.DATEONLY, allowNull: true },
            num_requisicao: { type: S.STRING(30), allowNull: true },
            // Só o dump cru do SIE traz isto: Saída | Entrada e Saída Direta |
            // Estorno de Saída. Distingue consumo de estoque, compra direta e
            // devolução — e estorno não pode contar como gasto.
            tipo_movimento: { type: S.STRING(60), allowNull: true },
            subunidade_id: fkSub(),
            subunidade_texto: { type: S.STRING(255), allowNull: true },
            solicitante: { type: S.STRING(255), allowNull: true },
            usuario_sie: { type: S.STRING(255), allowNull: true },
            valor_total: { type: S.DECIMAL(14, 2), allowNull: true },
            local_entrega: { type: S.STRING(255), allowNull: true },
            situacao: { type: S.STRING(120), allowNull: true },
            observacao: { type: S.TEXT, allowNull: true },
            tramitacao: { type: S.STRING(120), allowNull: true },
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        for (const c of ["ano", "origem_aba", "subunidade_id"]) {
            await queryInterface.addIndex("almoxarifado_requisicoes", [c]);
        }

        // ── Viagens / diárias SCDP (abas "SCDP YYYY") ────────────────────────
        await queryInterface.createTable("scdp_viagens", {
            id_viagem: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            data_cadastro: { type: S.DATEONLY, allowNull: true },
            pcdp: { type: S.STRING(30), allowNull: true },        // "000030/26"
            solicitante: { type: S.STRING(255), allowNull: true },
            grupo_tipo: { type: S.STRING(120), allowNull: true },
            cpf: { type: S.STRING(20), allowNull: true },
            proposto: { type: S.STRING(255), allowNull: true },
            subunidade_id: fkSub(),
            subunidade_texto: { type: S.STRING(255), allowNull: true },
            fonte_recurso: { type: S.STRING(120), allowNull: true },
            num_diarias: { type: S.DECIMAL(8, 2), allowNull: true },
            valor_diarias: { type: S.DECIMAL(14, 2), allowNull: true },
            valor_passagens_aereas: { type: S.DECIMAL(14, 2), allowNull: true },
            valor_passagens_rodoviarias: { type: S.DECIMAL(14, 2), allowNull: true },
            periodo_viagem: { type: S.STRING(120), allowNull: true }, // texto livre na origem
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        for (const c of ["ano", "origem_aba", "subunidade_id"]) {
            await queryInterface.addIndex("scdp_viagens", [c]);
        }

        // ── Itens de licitação / compras (abas "Licitações YYYY") ────────────
        await queryInterface.createTable("licitacoes_itens", {
            id_item: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            data: { type: S.DATEONLY, allowNull: true },
            tipo: { type: S.STRING(120), allowNull: true },
            subunidade_id: fkSub(),
            subunidade_texto: { type: S.STRING(255), allowNull: true },
            interessado: { type: S.STRING(255), allowNull: true },
            elaborador_etp: { type: S.STRING(255), allowNull: true },
            usuario_sie: { type: S.STRING(255), allowNull: true },
            cod_reduzido: { type: S.STRING(40), allowNull: true },
            descricao: { type: S.TEXT, allowNull: true },
            unidades: { type: S.DECIMAL(12, 3), allowNull: true },
            valor_unitario: { type: S.DECIMAL(14, 2), allowNull: true },
            valor_total: { type: S.DECIMAL(14, 2), allowNull: true },
            dfd: { type: S.STRING(40), allowNull: true },
            etp: { type: S.STRING(40), allowNull: true },
            solicitacao_sie: { type: S.STRING(40), allowNull: true },
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        for (const c of ["ano", "origem_aba", "subunidade_id", "tipo"]) {
            await queryInterface.addIndex("licitacoes_itens", [c]);
        }

        // ── Transferências de recurso entre gestoras (abas "Transferências") ─
        await queryInterface.createTable("transferencias_recurso", {
            id_transferencia: pk(),
            ano: { type: S.INTEGER, allowNull: false },
            data: { type: S.DATEONLY, allowNull: true },
            num_transferencia: { type: S.STRING(30), allowNull: true },
            subunidade_id: fkSub(),
            subunidade_texto: { type: S.STRING(255), allowNull: true },
            solicitante: { type: S.STRING(255), allowNull: true },
            usuario_sie: { type: S.STRING(255), allowNull: true },
            gestora_destino: { type: S.STRING(255), allowNull: true },
            cod_natureza: { type: S.STRING(20), allowNull: true },
            tipo_despesa: { type: S.STRING(120), allowNull: true },
            valor: { type: S.DECIMAL(14, 2), allowNull: true },
            // "Contado em outra guia?" — quando true a transferência já aparece
            // noutra aba (almoxarifado) e não deve ser somada de novo.
            contado_em_outra_guia: { type: S.BOOLEAN, allowNull: true },
            observacao: { type: S.TEXT, allowNull: true },
            origem_aba: { type: S.STRING(80), allowNull: false },
            createdat: agora,
        });
        for (const c of ["ano", "origem_aba", "subunidade_id"]) {
            await queryInterface.addIndex("transferencias_recurso", [c]);
        }

        // ── Log das importações (o que veio, de qual aba, por quem) ──────────
        await queryInterface.createTable("importacoes_financeiro", {
            id_importacao: pk(),
            origem_aba: { type: S.STRING(80), allowNull: false },
            tipo: { type: S.STRING(30), allowNull: false },
            ano: { type: S.INTEGER, allowNull: true },
            linhas_gravadas: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
            linhas_ignoradas: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
            user_id: {
                type: S.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            createdat: agora,
        });
        await queryInterface.addIndex("importacoes_financeiro", ["origem_aba"]);

        // Catálogo inicial de naturezas (aba "Página43" da planilha)
        await queryInterface.bulkInsert("naturezas_despesa", [
            ["3.3.9.0.30.00", "Material de Consumo"],
            ["4.4.9.0.52.00", "Equipamentos e Material Permanente"],
            ["3.3.9.0.39.00", "Outros Serviços de Terceiros - Pessoa Jurídica"],
            ["3.3.9.0.39.00", "Outros Serviços de Terceiros - Pessoa Física"],
            ["3.3.9.0.18.00", "Auxílio Financeiro a Estudantes"],
            ["3.3.9.0.14.00", "Diárias - Civil"],
            ["3.3.9.0.33.00", "Passagens e Despesas com Locomoção"],
            ["3.3.9.0.40.00", "Renovação/atualização"],
            ["4.4.9.0.51.00", "Obras novas"],
            ["3.3.9.0.92.00", "Despesas de Exercícios Anteriores"],
            ["3.3.9.0.20.00", "Auxílio a Pesquisador"],
        ].map(([codigo, nome]) => ({ codigo, nome })));
    },

    async down(queryInterface) {
        for (const t of [
            "importacoes_financeiro", "transferencias_recurso", "licitacoes_itens",
            "scdp_viagens", "almoxarifado_requisicoes", "empenhos",
            "orcamento_dotacoes", "subunidades_apelidos", "naturezas_despesa",
        ]) {
            await queryInterface.dropTable(t);
        }
    },
};
