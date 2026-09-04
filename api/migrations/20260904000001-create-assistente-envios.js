"use strict";

/**
 * Registro dos e-mails enviados pelo assistente.
 *
 * É a primeira coisa que o assistente faz que SAI da instituição, e não tem
 * desfazer. Num órgão público precisa ficar registrado quem mandou o quê, para
 * quem e quando — o log do pino é volátil demais para isso.
 *
 * Mesma lógica da tabela `comunicados`, que já registra os envios em massa.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("assistente_envios", {
            id_envio: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            destinatario: { type: Sequelize.STRING(255), allowNull: false },
            assunto: { type: Sequelize.STRING(255), allowNull: false },
            // O que foi enviado, em resumo: origem dos dados e quantas linhas
            origem: { type: Sequelize.STRING(80), allowNull: true },
            linhas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            com_anexo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            sucesso: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            erro: { type: Sequelize.TEXT, allowNull: true },
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.addIndex("assistente_envios", ["user_id"]);
        await queryInterface.addIndex("assistente_envios", ["createdat"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("assistente_envios");
    },
};
