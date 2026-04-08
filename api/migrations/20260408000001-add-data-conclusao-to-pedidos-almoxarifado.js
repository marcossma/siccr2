'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('pedidos_almoxarifado', 'data_conclusao', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('pedidos_almoxarifado', 'data_conclusao');
    }
};
