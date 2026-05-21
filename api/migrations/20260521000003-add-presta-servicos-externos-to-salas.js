"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("salas", "presta_servicos_externos", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("salas", "presta_servicos_externos");
    },
};
