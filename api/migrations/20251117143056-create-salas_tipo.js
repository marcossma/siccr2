'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("salas_tipo", {
      sala_tipo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      sala_tipo_nome: {
        type: Sequelize.STRING
      }
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("salas_tipo");
  }
};
