"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("turmas_horarios", {
            id_horario: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            turma_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "turmas", key: "id_turma" },
                onDelete: "CASCADE",
            },
            dia_semana: {
                // 0=domingo ... 6=sábado (mesma convenção de lib/recorrencia.js e scripts.js)
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            hora_inicio: {
                type: Sequelize.TIME,
                allowNull: false,
            },
            hora_fim: {
                type: Sequelize.TIME,
                allowNull: false,
            },
            sala_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "salas", key: "sala_id" },
                onDelete: "RESTRICT",
            },
        });

        await queryInterface.addIndex("turmas_horarios", ["turma_id"]);
        await queryInterface.addIndex("turmas_horarios", ["sala_id"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("turmas_horarios");
    },
};
