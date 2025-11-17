'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn("salas", "sala_tipo", "sala_tipo_id");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn("salas", "sala_tipo_id", "sala_tipo");
  }
};
