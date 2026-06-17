"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("periodos_letivos", {
            id_periodo: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            nome: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
            },
            data_inicio: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            data_fim: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            ativo: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("periodos_letivos");
    },
};
