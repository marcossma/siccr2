'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("despesas", {
      id_despesa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      id_subunidade: {
        type: Sequelize.INTEGER
      },
      id_tipo_despesa: {
        type: Sequelize.INTEGER
      },
      valor_despesa: {
        type: Sequelize.DECIMAL(10,2)
      },
      data_despesa: {
        type: Sequelize.DATE
      },
      numero_documento_despesa: {
        type: Sequelize.STRING(50)
      },
      observacao_despesa: {
        type: Sequelize.STRING
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("despesas");
  }
};
