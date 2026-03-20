"use strict";

module.exports = {
    async up(queryInterface) {
        const tableDesc = await queryInterface.describeTable("pedidos_almoxarifado");
        if (tableDesc.descricao_itens) {
            await queryInterface.removeColumn("pedidos_almoxarifado", "descricao_itens");
        }
        if (tableDesc.quantidade) {
            await queryInterface.removeColumn("pedidos_almoxarifado", "quantidade");
        }
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn("pedidos_almoxarifado", "descricao_itens", {
            type: Sequelize.TEXT,
            allowNull: true
        });
        await queryInterface.addColumn("pedidos_almoxarifado", "quantidade", {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    }
};
