"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("agendamentos_ocorrencias", {
            id_ocorrencia: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            agendamento_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "agendamentos", key: "id_agendamento" },
                onDelete: "CASCADE",
            },
            data_ocorrencia: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            status_individual: {
                type: Sequelize.STRING(30),
                allowNull: false,
                defaultValue: "ativa",
            },
            motivo_individual: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
        });

        // Índice composto para conflict-check rápido por sala + data
        await queryInterface.addIndex("agendamentos_ocorrencias", ["agendamento_id"]);
        await queryInterface.addIndex("agendamentos_ocorrencias", ["data_ocorrencia"]);
        await queryInterface.addIndex("agendamentos_ocorrencias", ["status_individual"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("agendamentos_ocorrencias");
    },
};
