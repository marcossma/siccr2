'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("recursos_recebidos", {
      id_recurso_recebido : {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      tipo_recurso_recebido: {
        type: Sequelize.INTEGER
      },
      valor_recurso_recebido: {
        type: Sequelize.DECIMAL(10,2)
      },
      descricao_recurso_recebido : {
        type: Sequelize.STRING(255)
      }
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("recursos_recebidos");
  }
};
