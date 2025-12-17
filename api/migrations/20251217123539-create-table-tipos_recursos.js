'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("tipos_recursos", {
      id_tipo_recurso: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      tipo_recurso: {
        type: Sequelize.STRING(100),
      },

      descricao_recurso: {
        type: Sequelize.STRING
      }
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("tipos_recursos");
  }
};
