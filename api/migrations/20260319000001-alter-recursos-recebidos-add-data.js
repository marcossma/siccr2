"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("recursos_recebidos", "data_recebimento", {
            type: Sequelize.DATEONLY,
            allowNull: true,
            defaultValue: Sequelize.literal("CURRENT_DATE")
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn("recursos_recebidos", "data_recebimento");
    }
};
