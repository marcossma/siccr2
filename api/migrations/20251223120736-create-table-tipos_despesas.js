'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("tipos_despesas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
      },
      tipo_despesa: {
        type: Sequelize.STRING(100),
      },
      descricao_despesa: {
        type: Sequelize.STRING(255)
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("tipos_despesas");
  }
};
