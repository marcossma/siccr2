"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("pedidos_almoxarifado", {
            id_pedido: {
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
            descricao_itens: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            quantidade: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            data_pedido: {
                type: Sequelize.DATEONLY,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_DATE")
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: "pendente"
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
        await queryInterface.dropTable("pedidos_almoxarifado");
    }
};
