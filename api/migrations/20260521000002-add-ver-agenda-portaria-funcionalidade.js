"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("funcionalidades", [
            {
                nome: "ver_agenda_portaria",
                descricao: "Visualizar a agenda de salas agendadas (uso da portaria)",
                modulo: "agendamentos",
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("funcionalidades", {
            nome: { [Sequelize.Op.in]: ["ver_agenda_portaria"] },
        });
    },
};
