"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Configurações simples chave→valor do sistema (ex.: aniversário automático)
        await queryInterface.createTable("configuracoes", {
            chave: { type: Sequelize.STRING(80), primaryKey: true, allowNull: false },
            valor: { type: Sequelize.TEXT, allowNull: true },
            updatedat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.bulkInsert("configuracoes", [
            { chave: "aniversario_automatico", valor: "false" },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("configuracoes");
    },
};
