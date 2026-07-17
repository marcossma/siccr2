"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Quem cadastrou a sala (desnormalizado p/ exibição rápida)
        await queryInterface.addColumn("salas", "created_by_user_id", {
            type: Sequelize.INTEGER, allowNull: true,
            references: { model: "users", key: "user_id" },
            onUpdate: "CASCADE", onDelete: "SET NULL",
        });

        // Log de auditoria das salas (cadastro/edição/exclusão)
        await queryInterface.createTable("salas_historico", {
            id_historico: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            sala_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "salas", key: "sala_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            sala_nome: { type: Sequelize.STRING(255), allowNull: true }, // snapshot (sobrevive à exclusão)
            acao: { type: Sequelize.STRING(20), allowNull: false }, // cadastro | edicao | exclusao
            user_id: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: "users", key: "user_id" },
                onUpdate: "CASCADE", onDelete: "SET NULL",
            },
            detalhe: { type: Sequelize.STRING(500), allowNull: true },
            createdat: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        });
        await queryInterface.addIndex("salas_historico", ["sala_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("salas_historico");
        await queryInterface.removeColumn("salas", "created_by_user_id");
    },
};
