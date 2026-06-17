"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("disciplinas", {
            id_disciplina: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            codigo: {
                type: Sequelize.STRING(30),
                allowNull: true,
            },
            nome: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            carga_horaria: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            subunidade_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "subunidades", key: "subunidade_id" },
                onDelete: "SET NULL",
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });

        await queryInterface.addIndex("disciplinas", ["subunidade_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("disciplinas");
    },
};
