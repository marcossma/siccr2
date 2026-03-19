"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("previsoes_despesas", {
            id_previsao: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            subunidade_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "subunidades", key: "subunidade_id" },
                onDelete: "RESTRICT"
            },
            id_tipo_despesa: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "tipos_despesas", key: "id_tipo_despesa" },
                onDelete: "RESTRICT"
            },
            valor_previsto: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false
            },
            ano_referencia: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            observacao: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            createdat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            }
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable("previsoes_despesas");
    }
};
