"use strict";

/**
 * Prepara a execução orçamentária para conviver com lançamento manual.
 *
 * O problema: a importação SUBSTITUI o bloco inteiro de uma aba
 * (DELETE por `origem_aba` + INSERT). Enquanto tudo vinha da planilha isso era
 * correto, mas no momento em que alguém lançar um empenho pela plataforma esse
 * registro seria apagado na próxima reimportação.
 *
 * A solução é marcar a procedência de cada linha:
 *   'importado' → veio da planilha; a importação é dona dele e pode substituir
 *   'manual'    → lançado na plataforma; a importação NÃO encosta
 *
 * O DELETE da importação passa a filtrar `origem = 'importado'`, então os dois
 * mundos coexistem. `created_by_user_id` responde "quem lançou" — sem valor
 * para o importado (é a planilha), essencial para o manual.
 *
 * Também cria a funcionalidade `importar_financeiro`, que permite ao chefe
 * conceder a importação a quem trabalha no NOr sem precisar de super_admin.
 */
const TABELAS = [
    "empenhos",
    "almoxarifado_requisicoes",
    "scdp_viagens",
    "licitacoes_itens",
    "transferencias_recurso",
    "orcamento_dotacoes",
];

module.exports = {
    async up(queryInterface, Sequelize) {
        for (const tabela of TABELAS) {
            await queryInterface.addColumn(tabela, "origem", {
                type: Sequelize.STRING(10),
                allowNull: false,
                defaultValue: "importado", // importado | manual
            });
            await queryInterface.addColumn(tabela, "created_by_user_id", {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });
            // A importação apaga por (origem_aba, origem) a cada reimportação
            await queryInterface.addIndex(tabela, ["origem_aba", "origem"], {
                name: `${tabela}_origem_aba_origem`,
            });
        }

        // Permite conceder a importação a quem não é direção (pessoal do NOr)
        await queryInterface.bulkInsert("funcionalidades", [{
            nome: "importar_financeiro",
            descricao: "Importar a planilha de execução orçamentária do setor financeiro",
            modulo: "financeiro",
        }]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("funcionalidades", { nome: "importar_financeiro" });
        for (const tabela of TABELAS) {
            await queryInterface.removeIndex(tabela, `${tabela}_origem_aba_origem`);
            await queryInterface.removeColumn(tabela, "created_by_user_id");
            await queryInterface.removeColumn(tabela, "origem");
        }
    },
};
