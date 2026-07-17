"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("funcionalidades", [{
            nome: "cadastrar_salas",
            descricao: "Cadastrar salas (sem ser super admin)",
            modulo: "infraestrutura",
        }]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("funcionalidades", { nome: { [Sequelize.Op.in]: ["cadastrar_salas"] } });
    },
};
