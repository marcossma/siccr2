"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("comunicados", {
            id_comunicado: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            assunto: { type: Sequelize.STRING(255), allowNull: false },
            corpo: { type: Sequelize.TEXT, allowNull: false },
            criterio: { type: Sequelize.STRING(500), allowNull: true }, // resumo legível dos destinatários
            total_destinatarios: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            enviados: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            falhas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            enviado_por_user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("comunicados");
    },
};
