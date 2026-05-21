"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("salas", "sala_capacidade", {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("salas", "sala_capacidade");
    },
};
