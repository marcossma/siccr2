'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn("salas", "departamento_id", "subunidade_id");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn("salas", "subunidade_id", "departamento_id");
  }
};
