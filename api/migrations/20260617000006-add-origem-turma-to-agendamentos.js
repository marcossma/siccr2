"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Distingue agendamentos de solicitação (workflow de aprovação) de aulas
        // (alocações materializadas a partir de turmas_horarios).
        await queryInterface.addColumn("agendamentos", "origem", {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "solicitacao",
        });
        // Rastreia de volta qual horário de turma gerou este agendamento (aula).
        // CASCADE: apagar o horário remove o agendamento gerado (e suas ocorrências, via FK existente).
        await queryInterface.addColumn("agendamentos", "turma_horario_id", {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "turmas_horarios", key: "id_horario" },
            onDelete: "CASCADE",
        });
        await queryInterface.addIndex("agendamentos", ["origem"]);
        await queryInterface.addIndex("agendamentos", ["turma_horario_id"]);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("agendamentos", "turma_horario_id");
        await queryInterface.removeColumn("agendamentos", "origem");
    },
};
