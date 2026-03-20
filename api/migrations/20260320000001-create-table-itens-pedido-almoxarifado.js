"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("itens_pedido_almoxarifado", {
            id_item: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            pedido_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: "pedidos_almoxarifado", key: "id_pedido" },
                onDelete: "CASCADE"
            },
            codigo_produto: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            descricao_produto: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            quantidade: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1
            }
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable("itens_pedido_almoxarifado");
    }
};
