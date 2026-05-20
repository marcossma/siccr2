"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("funcionalidades", [
            {
                nome: "aprovar_agendamento",
                descricao: "Aprovar/rejeitar solicitações de agendamento de sala",
                modulo: "agendamentos",
            },
            {
                nome: "ver_todos_agendamentos",
                descricao: "Visualizar todas as solicitações de agendamento (não apenas as próprias)",
                modulo: "agendamentos",
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("funcionalidades", {
            nome: { [Sequelize.Op.in]: ["aprovar_agendamento", "ver_todos_agendamentos"] },
        });
    },
};
