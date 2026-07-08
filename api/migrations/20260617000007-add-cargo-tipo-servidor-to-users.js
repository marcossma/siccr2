"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("users", "cargo", {
            type: Sequelize.STRING(120),
            allowNull: true,
        });
        // 'D' = docente (professor), 'T' = técnico-administrativo
        await queryInterface.addColumn("users", "tipo_servidor", {
            type: Sequelize.STRING(1),
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("users", "tipo_servidor");
        await queryInterface.removeColumn("users", "cargo");
    },
};
