"use strict";

/**
 * Assistente de IA — histórico e auditoria.
 *
 * As mensagens não são guardadas só para o usuário reler: num órgão público
 * precisa ficar registrado **quem perguntou o quê e quais dados o sistema
 * entregou**. Por isso `ferramentas` (jsonb) grava as chamadas que a IA fez —
 * nome, argumentos, quantos registros voltaram — e não apenas o texto final.
 *
 * A autorização NÃO passa por aqui: cada ferramenta chama a própria API da
 * plataforma com o token do usuário, então o RBAC que já existe é quem decide
 * o que ele pode ver. Esta tabela é registro, não controle.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const S = Sequelize;

        await queryInterface.createTable("assistente_conversas", {
            id_conversa: { type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            user_id: {
                type: S.INTEGER, allowNull: false,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "CASCADE",
            },
            // Resumo curto da primeira pergunta, para a lista lateral
            titulo: { type: S.STRING(120), allowNull: true },
            createdat: { type: S.DATE, allowNull: false, defaultValue: S.literal("CURRENT_TIMESTAMP") },
            updatedat: { type: S.DATE, allowNull: false, defaultValue: S.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.addIndex("assistente_conversas", ["user_id"]);

        await queryInterface.createTable("assistente_mensagens", {
            id_mensagem: { type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            conversa_id: {
                type: S.INTEGER, allowNull: false,
                references: { model: "assistente_conversas", key: "id_conversa" },
                onUpdate: "CASCADE", onDelete: "CASCADE",
            },
            papel: { type: S.STRING(12), allowNull: false }, // usuario | assistente
            conteudo: { type: S.TEXT, allowNull: true },
            // Auditoria: [{ nome, argumentos, registros, erro }]
            ferramentas: { type: S.JSONB, allowNull: true },
            // Custo — permite acompanhar o gasto com a API sem sair do sistema
            tokens_entrada: { type: S.INTEGER, allowNull: true },
            tokens_saida: { type: S.INTEGER, allowNull: true },
            createdat: { type: S.DATE, allowNull: false, defaultValue: S.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.addIndex("assistente_mensagens", ["conversa_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("assistente_mensagens");
        await queryInterface.dropTable("assistente_conversas");
    },
};
