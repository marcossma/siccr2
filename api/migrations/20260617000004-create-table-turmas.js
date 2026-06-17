"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("turmas", {
            id_turma: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            disciplina_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "disciplinas", key: "id_disciplina" },
                onDelete: "RESTRICT",
            },
            periodo_letivo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "periodos_letivos", key: "id_periodo" },
                onDelete: "RESTRICT",
            },
            nome_turma: {
                type: Sequelize.STRING(30),
                allowNull: false,
            },
            professor_user_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: "users", key: "user_id" },
                onDelete: "SET NULL",
            },
            vagas: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });

        await queryInterface.addIndex("turmas", ["disciplina_id"]);
        await queryInterface.addIndex("turmas", ["periodo_letivo_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("turmas");
    },
};
