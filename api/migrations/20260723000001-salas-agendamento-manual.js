"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Sala "somente agendamento manual": fica FORA do ensalamento (aulas),
        // mas continua agendável via solicitação avulsa (workflow de aprovação).
        // Ex.: NUSI e salas equivalentes que a direção agenda sob solicitação prévia.
        await queryInterface.addColumn("salas", "agendamento_manual", {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
        });

        // Semeia o estado inicial: NUSI entra na regra dos auditórios.
        await queryInterface.sequelize.query(
            "UPDATE salas SET agendamento_manual = 1 WHERE sala_nome ILIKE '%nusi%'"
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("salas", "agendamento_manual");
    },
};
